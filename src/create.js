const axios = require("axios");
const ora = require("ora");
const Inquirer = require("inquirer");

const path = require('path');

const { promisify } = require('util');
let downLoadGitRepo = require('download-git-repo');
downLoadGitRepo = promisify(downLoadGitRepo);


let ncp = require('ncp');
ncp = promisify(ncp);

const fs = require('fs');
const MetalSmith = require('metalsmith');
let {
	render
} = require('consolidate').ejs;
render = promisify(render);

const {
	downloadDirectory
} = require('./constants')

// 获取仓库信息
const fetchRepoList = async () => {
	const { data } = await axios.get("https://api.github.com/orgs/vuejsh-cli/repos");
	return data;
}
// 封装loading
const waitFnloading = (fn, message) => async (...args) => {
	const spinner = ora(message);
	spinner.start(); // 开始加载loading
	let repos = await fn(...args);
	spinner.succeed(); // 结束加载loading
	return repos;
}
// 抓取tag列表
const fetchTagList = async (repo) => {
	const {
		data
	} = await axios.get(`https://api.github.com/repos/vuejsh-cli/${repo}/tags`);
	return data;
}
// 下载项目
const download = async (repo, tag) => {
	let api = `vuejsh-cli/${repo}`;
	if (tag) {
		api += `#/${tag}`;
	}
	const dest = `${downloadDirectory}/${repo}`;
	await downLoadGitRepo(api, dest);
	return dest
}


module.exports = async (projectName) => {
	// 1.获取模板
	let repos = await waitFnloading(fetchRepoList, 'fetching tempalte...')();
	repos = repos.map((item) => item.name);
	const { repo } = await Inquirer.prompt({
		name: "repo", // 选择后的结果
		type: "list", // 什么方式展示
		message: "please choise a template to create project", // 提示信息
		choices: repos, // 选择的数据
	});

	// 2.获取对应的版本号
	let tags = await waitFnloading(fetchTagList, 'fetching tags...')(repo);
	tags = tags.map((item) => item.name);
	// 选择版本号
	const { tag } = await Inquirer.prompt({
		name: "tag", // 选择后的结果
		type: "list", // 什么方式展示
		message: "please choise tags", // 提示信息
		choices: tags, // 选择的数据
	});

	// 3.下载项目 返回一个临时存放的目录
	const result = await waitFnloading(download, 'download template...')(repo, tag);

	// metalsmith 遍历所有文件目录配合json渲染 只要模板渲染都需要
	// consolidate 返回渲染函数 统一了所有模板引擎

	if (!fs.existsSync(path.join(result, 'ask.js'))) {
		await ncp(result, path.resolve(projectName));
	} else {
		// 复杂模板
		// 需要用户选择 选择后按照填写的编译模板
		await new Promise((resolve, reject) => {
			// 如果传入路径 它就会默认遍历当前目录下的src文件
			MetalSmith(__dirname)
				.source(result)
				.destination(path.resolve(projectName)) // 编译要去的地方
				.use(async (files, metal, done) => {
					// files 现在就是所有的文件
					// 拿到提前配置好的信息 传下去 渲染
					const args = require(path.join(result, 'ask.js'));
					// 拿到了让用户填写返会填写的信息
					const obj = await Inquirer.prompt(args);
					const meta = metal.metadata(); // 获取的信息合并传入一下use
					Object.assign(meta, obj);
					delete files["ask.js"]
					done();
				})
				.use((files, metal, done) => {
					// 用户信息渲染模板
					const obj = metal.metadata();
					Reflect.ownKeys(files).forEach(async (file) => {
						if (file.includes('js') || file.includes('json')) {
							// 文件内容
							let content = files[file].contents.toString();
							// 判断是不是模板
							if (content.includes('<%')) {
								content = await render(content, obj);
								files[file].contents = Buffer.from(content); // 渲染
							}
						}
					});
					done();
				})
				.build(err => {
					if (err) {
						reject()
					} else {
						resolve()
					}
				})
		})
	}
}