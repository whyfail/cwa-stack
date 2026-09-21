const { test } = require("node:test")
const assert = require("node:assert/strict")
const path = require("node:path")
const { createFullstack, FullstackCreateError } = require("../lib/services/create-fullstack")

const request = {
  kind: "fullstack",
  preset: "react-spring",
  projectName: "my-app",
  packageName: "com.example.myapp",
  description: "全栈应用",
}

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

// 可记录调用的依赖集合；fake 下载器会在目标目录落一个标记文件，模拟模板下载。
function makeDeps(overrides = {}) {
  const events = []
  const downloads = []
  const renders = []

  const deps = {
    cwd: "/parent",
    targetExists: () => false,
    makeTempDir: async () => {
      const dir = "/parent/.my-app-tmp-abc"
      events.push(`temp:${dir}`)
      return dir
    },
    removeTempDir: async (dir) => events.push(`cleanup:${dir}`),
    moveDir: (from, to) => events.push(`move:${from}->${to}`),
    gitInit: async (dir) => events.push(`git-init:${dir}`),
    downloadTemplate: async (url, target) => {
      downloads.push({ url, target })
    },
    renderTemplate: async (meta, src) => {
      renders.push({ meta, src })
    },
    writeShell: (dir, context) => events.push(`shell:${dir}:${context.preset}`),
    ensureDir: (dir) => events.push(`mkdir:${dir}`),
    getGitUser: () => ({ name: "wulei", email: "" }),
    createSpinner: makeSpinnerFactory(),
    log: () => {},
    ...overrides,
  }

  return { deps, events, downloads, renders }
}

test("组合编排：按阶段调用下载、渲染、装配、Git 与原子移动", async () => {
  const { deps, events, downloads, renders } = makeDeps()

  await createFullstack(request, deps)

  assert.deepEqual(downloads, [
    { url: "direct:https://gitee.com/whyfail/vite_react_init.git", target: path.join("/parent/.my-app-tmp-abc", "apps", "web") },
    { url: "direct:https://github.com/whyfail/springboot-template.git", target: path.join("/parent/.my-app-tmp-abc", "apps", "api") },
  ])
  assert.deepEqual(renders[0].meta, { name: "my-app", author: "wulei", description: "全栈应用" })
  assert.deepEqual(renders[1].meta, {
    name: "my-app",
    author: "wulei",
    description: "全栈应用",
    package: "com.example.myapp",
    packagePath: "com/example/myapp",
  })
  assert.equal(renders[1].src, path.join("/parent/.my-app-tmp-abc", "apps", "api"))
  assert.equal(events[events.indexOf("shell:/parent/.my-app-tmp-abc:react-spring") > -1 ? events.indexOf("shell:/parent/.my-app-tmp-abc:react-spring") : -1], "shell:/parent/.my-app-tmp-abc:react-spring")
  assert.ok(events.includes("git-init:/parent/.my-app-tmp-abc"))
  assert.ok(events.includes("move:/parent/.my-app-tmp-abc->/parent/my-app"))
  assert.ok(events.indexOf("git-init:/parent/.my-app-tmp-abc") < events.indexOf("move:/parent/.my-app-tmp-abc->/parent/my-app"))
  assert.equal(events.filter((event) => event.startsWith("cleanup:")).length, 0)
})

test("目标目录已存在：参数校验阶段失败，不创建临时目录", async () => {
  const { deps, events } = makeDeps({ targetExists: () => true })

  await assert.rejects(
    () => createFullstack(request, deps),
    (err) => err instanceof FullstackCreateError && err.stage === "参数校验" && /目标目录已存在/.test(err.cause.message),
  )
  assert.deepEqual(events, [])
})

test("未知预设：参数校验阶段失败", async () => {
  const { deps, events } = makeDeps()

  await assert.rejects(
    () => createFullstack({ ...request, preset: "nope" }, deps),
    (err) => err instanceof FullstackCreateError && err.stage === "参数校验",
  )
  assert.deepEqual(events, [])
})

test("后端下载失败：清理临时目录且不发生原子移动", async () => {
  const { deps, events } = makeDeps({
    downloadTemplate: async (url) => {
      if (url.includes("springboot-template")) {
        throw new Error("network down")
      }
    },
  })

  await assert.rejects(
    () => createFullstack(request, deps),
    (err) => err instanceof FullstackCreateError && err.stage === "下载后端" && /network down/.test(err.cause.message),
  )
  assert.ok(events.includes("cleanup:/parent/.my-app-tmp-abc"))
  assert.ok(!events.some((event) => event.startsWith("move:")))
  assert.ok(!events.some((event) => event.startsWith("git-init:")))
})

test("渲染失败：清理临时目录并标记渲染阶段", async () => {
  const { deps, events } = makeDeps({
    renderTemplate: async () => {
      throw new Error("render boom")
    },
  })

  await assert.rejects(
    () => createFullstack(request, deps),
    (err) => err instanceof FullstackCreateError && err.stage === "渲染",
  )
  assert.ok(events.includes("cleanup:/parent/.my-app-tmp-abc"))
})

test("git init 失败：清理临时目录并标记初始化阶段", async () => {
  const { deps, events } = makeDeps({
    gitInit: async () => {
      throw new Error("git missing")
    },
  })

  await assert.rejects(
    () => createFullstack(request, deps),
    (err) => err instanceof FullstackCreateError && err.stage === "初始化 Git",
  )
  assert.ok(events.includes("cleanup:/parent/.my-app-tmp-abc"))
  assert.ok(!events.some((event) => event.startsWith("move:")))
})

test("发布前发现目标目录出现：装配阶段失败并清理", async () => {
  let existsCalls = 0
  const { deps, events } = makeDeps({
    targetExists: () => {
      existsCalls += 1
      // 第一次校验不存在，发布前再次校验时已出现
      return existsCalls > 1
    },
  })

  await assert.rejects(
    () => createFullstack(request, deps),
    (err) => err instanceof FullstackCreateError && err.stage === "装配",
  )
  assert.ok(events.includes("cleanup:/parent/.my-app-tmp-abc"))
  assert.ok(!events.some((event) => event.startsWith("move:")))
})
