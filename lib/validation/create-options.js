const { isValidJavaPackageName } = require("./package-name")
const { isValidProjectName } = require("./project-name")
const { isValidTemplate } = require("../catalog")
const { getPreset } = require("../catalog")

const SPRING_TEMPLATE = "spring-boot"

// 非交互参数校验（纯函数）。返回 { ok: true, request } 或 { ok: false, messages }。
// request.kind: "standalone" | "fullstack"
function validateCreateOptions(options) {
  const { projectName, template, preset, package: javaPackage, description } = options

  if (template && preset) {
    return failure([
      "--template 与 --preset 互斥，只能选择其一",
      "独立创建示例：create my-web --template vite-react",
      "组合创建示例：create my-app --preset react-spring --package com.example.myapp",
    ])
  }

  if (!template && !preset) {
    return failure(["必须通过 --template 或 --preset 指定创建目标"])
  }

  if (!isValidProjectName(projectName)) {
    return failure(["缺少合法的项目名称，用法示例：create my-app --preset react-spring --package com.example.myapp"])
  }

  if (template) {
    return validateStandalone({ projectName, template, javaPackage, description })
  }

  return validateFullstack({ projectName, preset, javaPackage, description })
}

function validateStandalone({ projectName, template, javaPackage, description }) {
  if (!isValidTemplate(template)) {
    return failure([`未知模板：${template}`, "可用模板请通过 list 命令查看"])
  }

  if (template === SPRING_TEMPLATE && !isValidJavaPackageName(javaPackage)) {
    return failure([`${SPRING_TEMPLATE} 模板必须提供合法的 Java 包名，例如：--package com.example.myapp`])
  }

  return {
    ok: true,
    request: {
      kind: "standalone",
      answers: {
        templateName: template,
        projectName,
        packageName: template === SPRING_TEMPLATE ? javaPackage : "",
        description: description || "",
      },
    },
  }
}

function validateFullstack({ projectName, preset, javaPackage, description }) {
  const presetData = getPreset(preset)

  if (!presetData) {
    return failure([`未知全栈预设：${preset}`, "可用预设请通过 list 命令查看"])
  }

  if (!isValidJavaPackageName(javaPackage)) {
    return failure(["全栈组合必须提供合法的 Java 包名，例如：--package com.example.myapp"])
  }

  return {
    ok: true,
    request: {
      kind: "fullstack",
      preset,
      projectName,
      packageName: javaPackage,
      description: description || "",
    },
  }
}

function failure(messages) {
  return { ok: false, messages }
}

module.exports = { validateCreateOptions }
