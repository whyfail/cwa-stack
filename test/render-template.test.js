const { test } = require("node:test")
const assert = require("node:assert/strict")
const fs = require("node:fs")
const os = require("node:os")
const path = require("node:path")
const renderTemplate = require("../lib/services/render-template")

test("原地渲染：Handlebars 变量替换并重命名包路径目录", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cwa-render-"))
  try {
    fs.mkdirSync(path.join(dir, "{{ packagePath }}"), { recursive: true })
    fs.writeFileSync(path.join(dir, "package.json"), '{"name":"{{ name }}"}')
    fs.writeFileSync(path.join(dir, "{{ packagePath }}", "App.java"), "package {{ package }};\npublic class App {}\n")

    await renderTemplate(
      { name: "my-app", package: "com.example.app", packagePath: "com/example/app" },
      dir,
      dir,
    )

    assert.equal(fs.readFileSync(path.join(dir, "package.json"), "utf8"), '{"name":"my-app"}')
    assert.equal(
      fs.readFileSync(path.join(dir, "com", "example", "app", "App.java"), "utf8"),
      "package com.example.app;\npublic class App {}\n",
    )
    assert.equal(fs.existsSync(path.join(dir, "{{ packagePath }}")), false)
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

test("非 Handlebars 模板内容的文件保持原样，其余文件正常渲染", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cwa-render-"))
  try {
    const jsxContent = "<RouteGuard meta={{ title: 'Docs', needLogin: true }} />\n"
    fs.writeFileSync(path.join(dir, "route.tsx"), jsxContent)
    fs.writeFileSync(path.join(dir, "package.json"), '{"name":"{{ name }}"}')

    await renderTemplate({ name: "my-app" }, dir, dir)

    assert.equal(fs.readFileSync(path.join(dir, "route.tsx"), "utf8"), jsxContent)
    assert.equal(fs.readFileSync(path.join(dir, "package.json"), "utf8"), '{"name":"my-app"}')
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

test("未知占位符（Vue 插值等业务代码）保持原样，已知变量正常替换", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cwa-render-"))
  try {
    const vueContent = "<CardTitle as=\"h2\">{{ item.name }}</CardTitle>\n<span>{{ name }}</span>\n"
    fs.writeFileSync(path.join(dir, "Card.vue"), vueContent)

    await renderTemplate({ name: "my-app" }, dir, dir)

    assert.equal(
      fs.readFileSync(path.join(dir, "Card.vue"), "utf8"),
      "<CardTitle as=\"h2\">{{ item.name }}</CardTitle>\n<span>my-app</span>\n",
    )
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

test("缺少 source 时 reject", async () => {
  await assert.rejects(() => renderTemplate({}, undefined, undefined), /无效的source/)
})
