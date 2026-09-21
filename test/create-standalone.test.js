const { test } = require("node:test")
const assert = require("node:assert/strict")
const path = require("node:path")
const { createStandalone } = require("../lib/services/create-standalone")

function makeSpinnerFactory() {
  const calls = []
  const factory = () => ({
    start: () => calls.push("start"),
    succeed: () => calls.push("succeed"),
    fail: () => calls.push("fail"),
  })
  factory.calls = calls
  return factory
}

function makeDeps(overrides = {}) {
  const downloads = []
  const renders = []
  const logs = []
  const deps = {
    downloadTemplate: async (url, target, options) => {
      downloads.push({ url, target, options })
    },
    renderTemplate: async (meta, src, dest) => {
      renders.push({ meta, src, dest })
    },
    getGitUser: () => ({ name: "wulei", email: " <wulei@example.com>" }),
    createSpinner: makeSpinnerFactory(),
    log: (message) => logs.push(message),
    ...overrides,
  }
  return { deps, downloads, renders, logs }
}

test("前端独立创建：下载 direct 地址并渲染基础元数据", async () => {
  const { deps, downloads, renders, logs } = makeDeps()
  await createStandalone(
    { templateName: "vite-react", projectName: "my-web", description: "Web 应用" },
    deps,
  )
  assert.deepEqual(downloads, [
    {
      url: "direct:https://gitee.com/whyfail/vite_react_init.git",
      target: "my-web",
      options: { clone: true },
    },
  ])
  const target = path.resolve(process.cwd(), "my-web")
  assert.equal(renders.length, 1)
  assert.equal(renders[0].src, target)
  assert.equal(renders[0].dest, target)
  assert.deepEqual(renders[0].meta, {
    name: "my-web",
    author: "wulei",
    description: "Web 应用",
  })
  assert.ok(logs.some((m) => m.includes("项目生成成功")))
  assert.ok(!logs.some((m) => m.includes("项目生成失败")))
})

test("Spring Boot 独立创建：元数据包含包名与包路径", async () => {
  const { deps, renders } = makeDeps()
  await createStandalone(
    {
      templateName: "spring-boot",
      projectName: "my-api",
      packageName: "com.example.myapi",
      description: "API 服务",
    },
    deps,
  )
  assert.deepEqual(renders[0].meta, {
    name: "my-api",
    author: "wulei",
    description: "API 服务",
    package: "com.example.myapi",
    packagePath: "com/example/myapi",
  })
})

test("下载失败：输出失败信息、不渲染、不向上抛错", async () => {
  const { deps, renders, logs } = makeDeps({
    downloadTemplate: async () => {
      throw new Error("network down")
    },
  })
  await assert.doesNotReject(() =>
    createStandalone({ templateName: "vite-react", projectName: "my-web", description: "" }, deps),
  )
  assert.equal(renders.length, 0)
  assert.ok(logs.some((m) => m.includes("项目生成失败") && m.includes("network down")))
})

test("渲染失败：输出失败信息且不向上抛错", async () => {
  const { deps, logs } = makeDeps({
    renderTemplate: async () => {
      throw new Error("render boom")
    },
  })
  await assert.doesNotReject(() =>
    createStandalone({ templateName: "vite-react", projectName: "my-web", description: "" }, deps),
  )
  assert.ok(logs.filter((m) => m.includes("项目生成失败")).length >= 1)
  assert.ok(logs.some((m) => m.includes("render boom")))
})
