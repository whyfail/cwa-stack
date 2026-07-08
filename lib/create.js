const download = require("download-git-repo")
const template = require("../template.json")
const ora = require("ora")
const chalk = require("chalk")
const inquirer = require("inquirer")
const getUser = require("./util/git-user")
const generator = require("./util/generator")

const templateOptions = [
  {
    name: "React",
    value: "react",
    modes: [
      {
        name: "单页面应用",
        value: "spa",
        templates: [{ name: "Vite React 企业级模板", value: "vite-react" }],
      },
      {
        name: "SSR 服务端渲染",
        value: "ssr",
        templates: [{ name: "Next.js React SSR 企业级模板", value: "next-react-ssr" }],
      },
    ],
  },
  {
    name: "Vue",
    value: "vue",
    modes: [
      {
        name: "单页面应用",
        value: "spa",
        templates: [{ name: "Vite Vue 3 企业级模板", value: "vite-vue3" }],
      },
      {
        name: "SSR 服务端渲染",
        value: "ssr",
        templates: [{ name: "Nuxt Vue 3 SSR 企业级模板", value: "nuxt-vue3-ssr" }],
      },
    ],
  },
]

function getFrameworkByValue(value) {
  return templateOptions.find((item) => item.value === value)
}

function getModeByValue(framework, value) {
  return framework.modes.find((item) => item.value === value)
}

function createProject(answers) {
  let { templateName, projectName, description } = answers
  const spinner = ora("项目生成中...")
  const tempUrl = template[templateName]
  spinner.start()
  download(`direct:${tempUrl}`, projectName, { clone: true }, (err) => {
    if (err) {
      spinner.fail()
      console.log(chalk.red(`项目生成失败：\n${err}`))
      return
    }
    spinner.succeed()
    console.log(chalk.green("项目生成成功"))
    let currentPath = process.cwd()
    let gitUser = getUser()
    let metaData = {
      name: projectName,
      author: gitUser.name,
      description: description,
    }
    generator(metaData, `${currentPath}/${projectName}`, `${currentPath}/${projectName}`)
  })
}

function getAnswersFromPipe() {
  return new Promise((resolve) => {
    let data = ""
    process.stdin.setEncoding("utf8")
    process.stdin.on("readable", () => {
      let chunk
      while ((chunk = process.stdin.read()) !== null) {
        data += chunk
      }
    })
    process.stdin.on("end", () => {
      if (data.trim()) {
        const lines = data.trim().split("\n").map((line) => line.trim()).filter((line) => line)
        const templateNames = Object.keys(template)
        if (lines.length >= 2) {
          const templateName = lines[0]
          const projectName = lines[1]
          const description = lines[2] || ""
          if (templateNames.includes(templateName) && projectName) {
            resolve({
              templateName,
              projectName,
              description,
            })
            return
          }
        }
        console.log(chalk.yellow("管道输入格式不正确，请检查参数"))
        console.log(chalk.gray("格式：模板名称\\n项目名称\\n项目描述（可选）"))
        console.log(chalk.gray(`可用模板：${templateNames.join(", ")}`))
        process.exit(1)
      } else {
        resolve(null)
      }
    })
  })
}

const question = [
  {
    name: "framework",
    type: "list",
    message: "请选择技术栈",
    choices: templateOptions.map((item) => ({
      name: item.name,
      value: item.value,
    })),
  },
  {
    name: "mode",
    type: "list",
    message: "请选择应用类型",
    choices(answers) {
      const framework = getFrameworkByValue(answers.framework)
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
      const framework = getFrameworkByValue(answers.framework)
      const mode = getModeByValue(framework, answers.mode)
      return mode.templates.map((item) => ({
        name: `${item.name}（${item.value}）`,
        value: item.value,
      }))
    },
  },
  {
    name: "projectName",
    type: "input",
    message: "请输入项目名称",
    validate(val) {
      if (val === "") {
        console.log(chalk.yellow("项目名称不能为空"))
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

async function main() {
  if (!process.stdin.isTTY) {
    const pipeAnswers = await getAnswersFromPipe()
    if (pipeAnswers) {
      createProject(pipeAnswers)
      return
    }
  }
  inquirer.prompt(question).then((answers) => {
    createProject(answers)
  })
}

main()
