const chalk = require("chalk")
const catalog = require("../catalog")
const { parsePipeInput } = require("../validation/pipe-input")
const { validateCreateOptions } = require("../validation/create-options")
const {
  collectInteractiveAnswers,
} = require("../prompts/create-prompts")
const { createStandalone } = require("../services/create-standalone")
const { createFullstack, FullstackCreateError } = require("../services/create-fullstack")

// 读取管道输入；无内容时返回 null，由调用方回退到交互模式。
function readStdin() {
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
      resolve(data.trim() ? data : null)
    })
  })
}

function printValidationError(messages) {
  console.log(chalk.yellow(messages[0]))
  messages.slice(1).forEach((message) => console.log(chalk.gray(message)))
}

// 全栈组合失败在服务层已带阶段信息，这里统一输出并设置退出码。
function exitOnFullstackFailure(err) {
  if (err instanceof FullstackCreateError) {
    const causeMessage = err.cause instanceof Error ? err.cause.message : err.cause ? String(err.cause) : ""
    console.log(chalk.red(`全栈项目生成失败（阶段：${err.stage}）${causeMessage ? `：\n${causeMessage}` : ""}`))
  } else {
    console.log(chalk.red(`全栈项目生成失败：\n${err.message}`))
  }

  process.exit(1)
}

async function dispatch(request) {
  if (request.kind === "fullstack") {
    await createFullstack(request)
    return
  }

  await createStandalone(request.answers)
}

// create 命令入口：管道输入 → 非交互参数 → 交互问答，退出码在此统一处理。
async function runCreate(projectName, options = {}) {
  if (!process.stdin.isTTY) {
    const pipeData = await readStdin()

    if (pipeData) {
      const result = parsePipeInput(pipeData, catalog.listTemplateNames(), catalog.listPresetNames())

      if (!result.ok) {
        printValidationError(result.messages)
        process.exit(1)
      }

      try {
        await dispatch(result.request)
      } catch (err) {
        exitOnFullstackFailure(err)
      }

      return
    }
  }

  if (options.template || options.preset) {
    const result = validateCreateOptions({
      projectName,
      template: options.template,
      preset: options.preset,
      package: options.package,
      description: options.description,
    })

    if (!result.ok) {
      printValidationError(result.messages)
      process.exit(1)
    }

    try {
      await dispatch(result.request)
    } catch (err) {
      exitOnFullstackFailure(err)
    }

    return
  }

  const interactive = await collectInteractiveAnswers()

  try {
    if (interactive.kind === "fullstack") {
      await createFullstack(interactive.request)
    } else {
      await createStandalone(interactive.answers)
    }
  } catch (err) {
    if (interactive.kind === "fullstack") {
      exitOnFullstackFailure(err)
    }

    throw err
  }
}

module.exports = { runCreate }
