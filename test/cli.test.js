const { test } = require("node:test")
const assert = require("node:assert/strict")
const { spawnSync } = require("node:child_process")
const path = require("node:path")
const pkg = require("../package.json")

const bin = path.join(__dirname, "..", "bin", "create-wl-app.js")

test("--version 输出 package.json 中的版本号", () => {
  const result = spawnSync(process.execPath, [bin, "--version"], { encoding: "utf8" })
  assert.equal(result.status, 0)
  assert.equal(result.stdout.trim(), pkg.version)
})

test("--help 列出四个子命令", () => {
  const result = spawnSync(process.execPath, [bin, "--help"], { encoding: "utf8" })
  assert.equal(result.status, 0)
  for (const command of ["create", "list", "add", "delete"]) {
    assert.ok(result.stdout.includes(command), `帮助信息应包含 ${command}`)
  }
})

test("list 分组输出独立模板与全栈预设", () => {
  const result = spawnSync(process.execPath, [bin, "list"], { encoding: "utf8" })
  assert.equal(result.status, 0)
  assert.ok(result.stdout.includes("独立模板"))
  assert.ok(result.stdout.includes("全栈预设"))
  for (const templateName of [
    "vite-react",
    "vite-vue3",
    "next-react-ssr",
    "nuxt-vue3-ssr",
    "spring-boot",
  ]) {
    assert.ok(result.stdout.includes(templateName), `列表应包含 ${templateName}`)
  }
  for (const presetName of ["react-spring", "vue-spring", "next-spring", "nuxt-spring"]) {
    assert.ok(result.stdout.includes(presetName), `列表应包含 ${presetName}`)
  }
})

test("管道输入：单行输入返回退出码 1 并提示格式错误", () => {
  const result = spawnSync(process.execPath, [bin, "create"], {
    encoding: "utf8",
    input: "vite-react\n",
  })
  assert.equal(result.status, 1)
  assert.ok(`${result.stdout}${result.stderr}`.includes("管道输入格式不正确"))
})

test("管道输入：spring-boot 包名非法返回退出码 1", () => {
  const result = spawnSync(process.execPath, [bin, "create"], {
    encoding: "utf8",
    input: "spring-boot\nmy-api\ncom.Bad\n",
  })
  assert.equal(result.status, 1)
  assert.ok(`${result.stdout}${result.stderr}`.includes("Java 包名"))
})

test("非交互：--template 与 --preset 同时传入返回退出码 1", () => {
  const result = spawnSync(
    process.execPath,
    [bin, "create", "my-app", "--template", "vite-react", "--preset", "react-spring", "--package", "com.example.a"],
    { encoding: "utf8" },
  )
  assert.equal(result.status, 1)
  assert.ok(`${result.stdout}${result.stderr}`.includes("互斥"))
})

test("非交互：--preset 缺少 Java 包名返回退出码 1", () => {
  const result = spawnSync(process.execPath, [bin, "create", "my-app", "--preset", "react-spring"], {
    encoding: "utf8",
  })
  assert.equal(result.status, 1)
  assert.ok(`${result.stdout}${result.stderr}`.includes("Java 包名"))
})

test("非交互：未知 --template 返回退出码 1", () => {
  const result = spawnSync(process.execPath, [bin, "create", "my-web", "--template", "nope"], {
    encoding: "utf8",
  })
  assert.equal(result.status, 1)
  assert.ok(`${result.stdout}${result.stderr}`.includes("未知模板"))
})

test("非交互：缺少项目名称返回退出码 1", () => {
  const result = spawnSync(process.execPath, [bin, "create", "--preset", "react-spring", "--package", "com.example.a"], {
    encoding: "utf8",
  })
  assert.equal(result.status, 1)
  assert.ok(`${result.stdout}${result.stderr}`.includes("项目名称"))
})

test("管道输入：未知预设返回退出码 1", () => {
  const result = spawnSync(process.execPath, [bin, "create"], {
    encoding: "utf8",
    input: "preset:nope\nmy-app\ncom.example.a\n",
  })
  assert.equal(result.status, 1)
  assert.ok(`${result.stdout}${result.stderr}`.includes("未知全栈预设"))
})
