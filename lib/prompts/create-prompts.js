const inquirer = require("inquirer")
const chalk = require("chalk")
const fs = require("fs")
const path = require("path")
const catalog = require("../catalog")
const { isValidJavaPackageName } = require("../validation/package-name")

// 交互层只收集数据，不执行下载。

const creationModeQuestion = [
  {
    name: "creationMode",
    type: "list",
    message: "请选择创建方式",
    choices: [
      { name: "独立项目", value: "standalone" },
      { name: "全栈组合项目", value: "fullstack" },
    ],
  },
]

const standaloneQuestions = [
  {
    name: "framework",
    type: "list",
    message: "请选择技术栈",
    choices: catalog.templateOptions.map((item) => ({
      name: item.name,
      value: item.value,
    })),
  },
  {
    name: "mode",
    type: "list",
    message: "请选择应用类型",
    choices(answers) {
      const framework = catalog.getFrameworkByValue(answers.framework)
      return framework.modes.map((item) => ({
        name: item.name,
        value: item.value,
      }))
    },
  },
  {
    name: "templateName",
    type: "list",
    message: "请选择模板",
    choices(answers) {
      const framework = catalog.getFrameworkByValue(answers.framework)
      const mode = catalog.getModeByValue(framework, answers.mode)
      return mode.templates.map((item) => ({
        name: `${item.name}（${item.value}）`,
        value: item.value,
      }))
    },
  },
  projectNameQuestion(),
  {
    name: "packageName",
    type: "input",
    message: "请输入 Java 包名",
    when(answers) {
      return answers.templateName === "spring-boot"
    },
    default: "com.example.app",
    validate(val) {
      if (val === "") {
        console.log(chalk.yellow("Java 包名不能为空"))
        return
      }
      if (!isValidJavaPackageName(val)) {
        console.log(chalk.yellow("包名格式不正确，例如 com.mycompany.myapp"))
        return
      }
      return true
    },
  },
  {
    name: "description",
    type: "input",
    message: "请输入项目描述",
  },
]

const fullstackQuestions = [
  {
    name: "frontendFramework",
    type: "list",
    message: "请选择前端技术栈",
    choices: [
      { name: "React", value: "react" },
      { name: "Vue", value: "vue" },
    ],
  },
  {
    name: "renderMode",
    type: "list",
    message: "请选择渲染模式",
    choices: [
      { name: "SPA 单页面应用", value: "spa" },
      { name: "SSR 服务端渲染", value: "ssr" },
    ],
  },
  projectNameQuestion(),
  {
    name: "packageName",
    type: "input",
    message: "请输入 Java 包名",
    default: "com.example.app",
    validate(val) {
      if (val === "") {
        console.log(chalk.yellow("Java 包名不能为空"))
        return
      }
      if (!isValidJavaPackageName(val)) {
        console.log(chalk.yellow("包名格式不正确，例如 com.mycompany.myapp"))
        return
      }
      return true
    },
  },
  {
    name: "description",
    type: "input",
    message: "请输入项目描述",
  },
]

function projectNameQuestion() {
  return {
    name: "projectName",
    type: "input",
    message: "请输入项目名称",
    validate(val) {
      if (val === "") {
        console.log(chalk.yellow("项目名称不能为空"))
        return
      }
      if (fs.existsSync(path.resolve(process.cwd(), val))) {
        console.log(chalk.yellow("目标目录已存在，请更换项目名称"))
        return
      }
      return true
    },
  }
}

async function collectCreateAnswers(prompt = inquirer.prompt) {
  return prompt(standaloneQuestions)
}

async function collectFullstackAnswers(prompt = inquirer.prompt) {
  const answers = await prompt(fullstackQuestions)
  const preset = catalog.resolvePreset(answers.frontendFramework, answers.renderMode)

  return {
    preset: preset.name,
    projectName: answers.projectName,
    packageName: answers.packageName,
    description: answers.description,
  }
}

// 交互入口：先问创建方式，再进入对应问答链。
// 返回 { kind: "standalone", answers } 或 { kind: "fullstack", request }。
async function collectInteractiveAnswers(prompt = inquirer.prompt) {
  const { creationMode } = await prompt(creationModeQuestion)

  if (creationMode === "fullstack") {
    return { kind: "fullstack", request: await collectFullstackAnswers(prompt) }
  }

  return { kind: "standalone", answers: await collectCreateAnswers(prompt) }
}

module.exports = {
  standaloneQuestions,
  fullstackQuestions,
  creationModeQuestion,
  collectCreateAnswers,
  collectFullstackAnswers,
  collectInteractiveAnswers,
}
