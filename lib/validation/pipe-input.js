const { isValidJavaPackageName } = require("./package-name")

const PRESET_PREFIX = "preset:"
const SPRING_TEMPLATE = "spring-boot"

// 纯函数：把管道输入文本解析为创建参数。
// 返回 { ok: true, request } 或 { ok: false, messages }，
// messages[0] 以警告色输出，其余以灰色输出，退出码由命令入口统一处理。
// request.kind: "standalone"（旧格式）| "fullstack"（preset: 前缀新格式）。
function parsePipeInput(rawText, templateNames, presetNames = []) {
  const lines = String(rawText)
    .trim()
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line)

  if (lines.length < 2) {
    return invalidFormat(templateNames, presetNames)
  }

  const target = lines[0]
  const projectName = lines[1]

  if (target.startsWith(PRESET_PREFIX)) {
    return parsePresetPipe({ lines, presetNames, templateNames, presetName: target.slice(PRESET_PREFIX.length), projectName })
  }

  if (presetNames.includes(target)) {
    return failure([
      `检测到全栈预设 ${target}，组合创建请在预设名前加 ${PRESET_PREFIX} 前缀`,
      `格式：${PRESET_PREFIX}${target}\\n项目名称\\nJava包名\\n项目描述（可选）`,
    ])
  }

  const isSpring = target === SPRING_TEMPLATE
  const packageName = isSpring ? lines[2] || "" : ""
  const description = isSpring ? lines[3] || "" : lines[2] || ""

  if (!templateNames.includes(target) || !projectName) {
    return invalidFormat(templateNames, presetNames)
  }

  if (isSpring && !isValidJavaPackageName(packageName)) {
    return {
      ok: false,
      messages: [
        "spring-boot 模板必须提供合法的 Java 包名，例如 com.mycompany.myapp",
        "格式：模板名称\\n项目名称\\nJava包名\\n项目描述（可选）",
      ],
    }
  }

  return {
    ok: true,
    request: {
      kind: "standalone",
      answers: {
        templateName: target,
        projectName,
        packageName,
        description,
      },
    },
  }
}

function parsePresetPipe({ presetName, presetNames, templateNames, projectName, lines }) {
  if (!presetNames.includes(presetName)) {
    return failure([
      `未知全栈预设：${presetName}`,
      `可用预设：${presetNames.join(", ")}`,
    ])
  }

  if (!projectName) {
    return invalidFormat(templateNames, presetNames)
  }

  const packageName = lines[2] || ""
  const description = lines[3] || ""

  if (!isValidJavaPackageName(packageName)) {
    return {
      ok: false,
      messages: [
        "全栈组合必须提供合法的 Java 包名，例如 com.mycompany.myapp",
        `格式：${PRESET_PREFIX}${presetName}\\n项目名称\\nJava包名\\n项目描述（可选）`,
      ],
    }
  }

  return {
    ok: true,
    request: {
      kind: "fullstack",
      preset: presetName,
      projectName,
      packageName,
      description,
    },
  }
}

function invalidFormat(templateNames, presetNames) {
  const messages = [
    "管道输入格式不正确，请检查参数",
    "格式：模板名称\\n项目名称\\n项目描述（可选）",
    "spring-boot 模板：模板名称\\n项目名称\\nJava包名\\n项目描述（可选）",
  ]

  if (presetNames.length) {
    messages.push(`全栈组合：preset:预设名\\n项目名称\\nJava包名\\n项目描述（可选），可用预设：${presetNames.join(", ")}`)
  }

  messages.push(`可用模板：${templateNames.join(", ")}`)

  return { ok: false, messages }
}

function failure(messages) {
  return { ok: false, messages }
}

module.exports = { parsePipeInput }
