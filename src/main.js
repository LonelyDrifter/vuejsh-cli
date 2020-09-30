const { version } = require("./constants");
const program = require('commander');
const path = require('path');

const { mapActions } = require('./config');
// 循环创建命令
Reflect.ownKeys(mapActions).forEach((action) => {
	program
		.command(action) // 配置命令的名称
		.alias(mapActions[action].alias) // 命令的别名
		.description(mapActions[action].description) // 命令的描述
		.action(() => {
			// 访问不到对应的命令
			if (action === '*') {
				console.log(mapActions[action].description);
			} else {
				// 截取命令
				require(path.resolve(__dirname, action))(...process.argv.slice(3));
			}
		})
});

// 监听用户的help事件
program.on("--help", () => {
	console.log("\nExamples:");
	Reflect.ownKeys(mapActions).forEach((action) => {
		mapActions[action].examples.forEach((examples) => {
			console.log(`${examples}`);
		})
	})
});


// process.argv 就是用户在命令行中传入的参数
program.version(version).parse(process.argv);