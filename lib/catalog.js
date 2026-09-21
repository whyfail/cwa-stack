const catalog = require("../catalog.json")

const templates = catalog.templates
const presets = catalog.presets

// 技术栈 → 应用类型 → 模板 的层级定义，模板 value 必须是 templates 中的键
const templateOptions = [
  {
    name: "Java Spring Boot",
    value: "spring",
    modes: [
      {
        name: "单体服务",
        value: "monolith",
        templates: [{ name: "Spring Boot 企业级模板", value: "spring-boot" }],
      },
    ],
  },
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

// 全栈组合交互路径：前端技术栈 + 渲染模式唯一确定一个预设
const presetByFrontendChoice = {
  "react|spa": "react-spring",
  "react|ssr": "next-spring",
  "vue|spa": "vue-spring",
  "vue|ssr": "nuxt-spring",
}

function getFrameworkByValue(value) {
  return templateOptions.find((item) => item.value === value)
}

function getModeByValue(framework, value) {
  return framework.modes.find((item) => item.value === value)
}

function getTemplateUrl(name) {
  return templates[name]
}

function isValidTemplate(name) {
  return Object.prototype.hasOwnProperty.call(templates, name)
}

function listTemplateNames() {
  return Object.keys(templates)
}

function getPreset(name) {
  return presets[name]
}

function listPresetNames() {
  return Object.keys(presets)
}

function resolvePreset(frameworkValue, modeValue) {
  const presetName = presetByFrontendChoice[`${frameworkValue}|${modeValue}`]

  return presetName ? { name: presetName, ...presets[presetName] } : undefined
}

module.exports = {
  templateOptions,
  getFrameworkByValue,
  getModeByValue,
  getTemplateUrl,
  isValidTemplate,
  listTemplateNames,
  getPreset,
  listPresetNames,
  resolvePreset,
}
