// 配置命令
const mapActions = {
	create: {
		alias: "c",
		description: "create a project",
		examples: ["vuejsh-cli create <project-name>"]
	},
	config: {
		alias: "conf",
		description: "config project variable",
		examples: ["vuejsh-cli config set <k><v>", "vuejsh-cli config get <k>"]
	},
	"*": {
		alias: "",
		description: "command not found",
		examples: [""]
	},
}

module.exports = {
    mapActions
}