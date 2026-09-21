const fs = require("fs")
const path = require("path")
const { execFile } = require("child_process")
const chalk = require("chalk")
const ora = require("ora")
const catalog = require("../catalog")
const getUser = require("../util/git-user")
const { downloadTemplate } = require("./download-template")
const renderTemplate = require("./render-template")
const { writeFullstackShell } = require("./write-fullstack-shell")

const WEB_DIR = ["apps", "web"]
const API_DIR = ["apps", "api"]

// 组合创建失败的结构化错误：stage 标识失败阶段（参数校验/下载前端/下载后端/渲染/装配/初始化 Git），
// cause 保留原始错误。命令入口据此统一输出并设置退出码。
class FullstackCreateError extends Error {
  constructor(stage, cause) {
    super(`全栈项目生成失败（阶段：${stage}）`)
    this.name = "FullstackCreateError"
    this.stage = stage
    this.cause = cause
  }
}

// 全栈组合编排：临时目录下载 → 渲染 → 装配 → 原子移动 → 单根 Git 仓库。
// 任一步失败都清理临时目录，不留下半成品目标项目。
async function createFullstack(request, deps = {}) {
  const { projectName, preset, packageName, description } = request
  const presetData = catalog.getPreset(preset)

  if (!presetData) {
    throw new FullstackCreateError("参数校验", new Error(`未知全栈预设：${preset}`))
  }

  const cwd = deps.cwd || process.cwd()
  const targetDir = path.resolve(cwd, projectName)
  const parentDir = path.dirname(targetDir)
  const targetExists = deps.targetExists || ((dir) => fs.existsSync(dir))

  if (targetExists(targetDir)) {
    throw new FullstackCreateError("参数校验", new Error(`目标目录已存在：${targetDir}，拒绝覆盖`))
  }

  const {
    downloadTemplate: download = downloadTemplate,
    renderTemplate: render = renderTemplate,
    writeShell = writeFullstackShell,
    getGitUser = getUser,
    gitInit = (dir) => new Promise((resolve, reject) => {
      execFile("git", ["init"], { cwd: dir }, (err) => (err ? reject(err) : resolve()))
    }),
    createSpinner = (text) => ora(text),
    log = (message) => console.log(message),
    ensureDir = deps.ensureDir || ((dir) => fs.mkdirSync(dir, { recursive: true })),
    makeTempDir = deps.makeTempDir || ((parent) => fs.mkdtempSync(path.join(parent, `.${path.basename(targetDir)}-tmp-`))),
    removeTempDir = deps.removeTempDir || ((dir) => fs.rmSync(dir, { recursive: true, force: true })),
    moveDir = deps.moveDir || ((from, to) => fs.renameSync(from, to)),
  } = deps

  const spinner = createSpinner("全栈项目生成中...")
  spinner.start()

  let tempDir
  let stage = "下载前端"

  try {
    tempDir = await makeTempDir(parentDir)
    const webDir = path.join(tempDir, ...WEB_DIR)
    const apiDir = path.join(tempDir, ...API_DIR)
    ensureDir(webDir)
    ensureDir(apiDir)

    await download(`direct:${catalog.getTemplateUrl(presetData.frontend)}`, webDir, { clone: true })
    stage = "下载后端"
    await download(`direct:${catalog.getTemplateUrl(presetData.backend)}`, apiDir, { clone: true })

    stage = "渲染"
    const gitUser = getGitUser()
    const baseMeta = { name: projectName, author: gitUser.name, description }
    const apiMeta = {
      ...baseMeta,
      package: packageName,
      packagePath: packageName.split(".").join("/"),
    }
    await render(baseMeta, webDir, webDir)
    await render(apiMeta, apiDir, apiDir)

    stage = "装配"
    // 单根 Git 仓库：移除两个模板自带的嵌套 .git，写入根级编排文件
    fs.rmSync(path.join(webDir, ".git"), { recursive: true, force: true })
    fs.rmSync(path.join(apiDir, ".git"), { recursive: true, force: true })
    writeShell(tempDir, {
      name: projectName,
      description,
      preset,
      frontendTemplate: presetData.frontend,
      backendTemplate: presetData.backend,
      webPort: presetData.webPort,
    })

    stage = "初始化 Git"
    await gitInit(tempDir)

    if (targetExists(targetDir)) {
      throw new FullstackCreateError("装配", new Error(`目标目录在生成过程中已出现：${targetDir}，拒绝覆盖`))
    }
    moveDir(tempDir, targetDir)
  } catch (err) {
    spinner.fail()

    if (tempDir) {
      removeTempDir(tempDir)
    }

    throw err instanceof FullstackCreateError ? err : new FullstackCreateError(stage, err)
  }

  spinner.succeed()
  log(chalk.green("全栈项目生成成功"))
  log(chalk.gray(`下一步：cd ${projectName} && pnpm run setup`))
}

module.exports = { createFullstack, FullstackCreateError }
