const { test } = require("node:test")
const assert = require("node:assert/strict")
const catalog = require("../lib/catalog")

test("五个独立模板标识与下载地址保持不变", () => {
  assert.deepEqual([...catalog.listTemplateNames()].sort(), [
    "next-react-ssr",
    "nuxt-vue3-ssr",
    "spring-boot",
    "vite-react",
    "vite-vue3",
  ])
  assert.equal(catalog.getTemplateUrl("vite-react"), "https://gitee.com/whyfail/vite_react_init.git")
  assert.equal(catalog.getTemplateUrl("vite-vue3"), "https://gitee.com/whyfail/vite_vue3_init.git")
  assert.equal(catalog.getTemplateUrl("next-react-ssr"), "https://github.com/whyfail/vite_react_ssr_init.git")
  assert.equal(catalog.getTemplateUrl("nuxt-vue3-ssr"), "https://github.com/whyfail/vite_vue3_ssr_init.git")
  assert.equal(catalog.getTemplateUrl("spring-boot"), "https://github.com/whyfail/springboot-template.git")
  assert.equal(catalog.getTemplateUrl("unknown-template"), undefined)
})

test("四个全栈预设映射到正确的前后端模板与端口", () => {
  assert.deepEqual([...catalog.listPresetNames()].sort(), [
    "next-spring",
    "nuxt-spring",
    "react-spring",
    "vue-spring",
  ])
  assert.deepEqual(catalog.getPreset("react-spring"), { frontend: "vite-react", backend: "spring-boot", webPort: 5173 })
  assert.deepEqual(catalog.getPreset("vue-spring"), { frontend: "vite-vue3", backend: "spring-boot", webPort: 5173 })
  assert.deepEqual(catalog.getPreset("next-spring"), { frontend: "next-react-ssr", backend: "spring-boot", webPort: 3000 })
  assert.deepEqual(catalog.getPreset("nuxt-spring"), { frontend: "nuxt-vue3-ssr", backend: "spring-boot", webPort: 3000 })
  assert.equal(catalog.getPreset("nope"), undefined)
})

test("预设引用的前后端模板都存在于模板表", () => {
  for (const presetName of catalog.listPresetNames()) {
    const preset = catalog.getPreset(presetName)
    assert.ok(catalog.getTemplateUrl(preset.frontend), `${presetName}.frontend 必须有下载地址`)
    assert.ok(catalog.getTemplateUrl(preset.backend), `${presetName}.backend 必须有下载地址`)
  }
})

test("技术栈层级：每种交互路径都能落到存在的模板", () => {
  const expected = {
    "spring|monolith": ["spring-boot"],
    "react|spa": ["vite-react"],
    "react|ssr": ["next-react-ssr"],
    "vue|spa": ["vite-vue3"],
    "vue|ssr": ["nuxt-vue3-ssr"],
  }
  for (const [key, expectedTemplates] of Object.entries(expected)) {
    const [frameworkValue, modeValue] = key.split("|")
    const framework = catalog.getFrameworkByValue(frameworkValue)
    const mode = catalog.getModeByValue(framework, modeValue)
    assert.ok(mode, `${frameworkValue}/${modeValue} 应存在`)
    assert.deepEqual(
      mode.templates.map((item) => item.value),
      expectedTemplates,
    )
    for (const item of mode.templates) {
      assert.ok(catalog.getTemplateUrl(item.value), `${item.value} 必须有下载地址`)
    }
  }
})

test("前端技术栈 + 渲染模式唯一确定预设", () => {
  assert.equal(catalog.resolvePreset("react", "spa").name, "react-spring")
  assert.equal(catalog.resolvePreset("react", "ssr").name, "next-spring")
  assert.equal(catalog.resolvePreset("vue", "spa").name, "vue-spring")
  assert.equal(catalog.resolvePreset("vue", "ssr").name, "nuxt-spring")
  assert.equal(catalog.resolvePreset("spring", "monolith"), undefined)
})
