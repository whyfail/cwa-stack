#! /usr/bin/env node
const program = require("commander")
const config = require("../package.json")

program.version(config.version, "-v, --version")

// 定义使用方法
program
  .command("create [projectName]")
  .description("选择模板生成独立或全栈组合项目")
  .option("--template <name>", "独立模板标识（与 --preset 互斥）")
  .option("--preset <name>", "全栈预设标识（与 --template 互斥）")
  .option("--package <name>", "Java 包名（spring-boot 与全栈组合必填）")
  .option("--description <text>", "项目描述")
  .action((projectName, options) => {
    require("../lib/commands/create").runCreate(projectName, options)
  })

program
  .command("list")
  .description("查看当前可用模板")
  .action(() => {
    require("../lib/commands/list")
  })

program
  .command("add")
  .description("添加模板")
  .action(() => {
    require("../lib/add")
  })

program
  .command("delete")
  .description("删除模板")
  .action(() => {
    require("../lib/delete")
  })

// 解析参数
program.parse(process.argv)
if (!program.args.length) {
  program.help()
}
