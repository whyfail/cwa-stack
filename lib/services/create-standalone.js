const fs = require("fs")
const path = require("path")
const chalk = require("chalk")
const ora = require("ora")
const catalog = require("../catalog")
const getUser = require("../util/git-user")
const { downloadTemplate } = require("./download-template")
const renderTemplate = require("./render-template")

// 独立创建编排：下载模板 → 渲染变量。依赖均可注入替身以便测试。
// 下载或渲染失败时输出失败信息并正常返回，不向上抛出。
async function createStandalone(answers, deps = {}) {
  const {
    downloadTemplate: download = downloadTemplate,
    renderTemplate: render = renderTemplate,
    getGitUser = getUser,
    createSpinner = (text) => ora(text),
    log = (message) => console.log(message),
    targetExists = (dir) => fs.existsSync(dir),
  } = deps
  const { templateName, projectName, description } = answers
  const target = path.resolve(deps.cwd || process.cwd(), projectName)

  if (targetExists(target)) {
    log(chalk.red(`目标目录已存在：${target}，拒绝覆盖`))
    return
  }

  const spinner = createSpinner("项目生成中...")
  spinner.start()
  try {
    await download(`direct:${catalog.getTemplateUrl(templateName)}`, projectName, { clone: true })
  } catch (err) {
    spinner.fail()
    log(chalk.red(`项目生成失败：\n${err}`))
    return
  }
  spinner.succeed()
  log(chalk.green("项目生成成功"))
  const gitUser = getGitUser()
  const metaData = {
    name: projectName,
    author: gitUser.name,
    description: description,
  }
  if (answers.packageName) {
    metaData.package = answers.packageName
    metaData.packagePath = answers.packageName.split(".").join("/")
  }
  try {
    await render(metaData, target, target)
  } catch (err) {
    spinner.fail()
    log(chalk.red(`项目生成失败：\n${err}`))
  }
}

module.exports = { createStandalone }
