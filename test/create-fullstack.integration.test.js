const { test } = require("node:test")
const assert = require("node:assert/strict")
const fs = require("node:fs")
const os = require("node:os")
const path = require("node:path")
const { createFullstack, FullstackCreateError } = require("../lib/services/create-fullstack")
const { createStandalone } = require("../lib/services/create-standalone")

// 物化一个"下载好的模板"fixture：包含嵌套 .git、Handlebars 占位符与 Java 包路径占位目录，
// 用于在不访问网络的情况下驱动真实渲染与装配逻辑。
function materializeTemplate(dir, kind) {
  fs.mkdirSync(path.join(dir, ".git"), { recursive: true })
  fs.writeFileSync(path.join(dir, ".git", "HEAD"), "ref: refs/heads/master\n")

  if (kind === "frontend") {
    fs.writeFileSync(
      path.join(dir, "package.json"),
      JSON.stringify({ name: "{{ name }}", description: "{{ description }}" }),
    )
    return
  }

  fs.writeFileSync(path.join(dir, "pom.xml"), "<groupId>{{ package }}</groupId>")
  const javaDir = path.join(dir, "src", "main", "java", "{{ packagePath }}")
  fs.mkdirSync(javaDir, { recursive: true })
  fs.writeFileSync(path.join(javaDir, "App.java"), "package {{ package }};\npublic class App {}\n")
  fs.writeFileSync(path.join(dir, "openapi.yaml"), "openapi: 3.1.0\n")
}

function fixtureDeps(cwd) {
  const downloads = []
  const deps = {
    cwd,
    downloadTemplate: async (url, target) => {
      downloads.push(url)
      materializeTemplate(target, url.includes("springboot-template") ? "backend" : "frontend")
    },
  }
  return { deps, downloads }
}

function listTmpDirs(parent) {
  return fs.readdirSync(parent).filter((name) => name.includes("-tmp-"))
}

test("react-spring 组合：真实渲染、装配、单根 Git 仓库与原子发布", async () => {
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), "cwa-fullstack-"))

  try {
    const { deps, downloads } = fixtureDeps(parent)
    await createFullstack(
      { kind: "fullstack", preset: "react-spring", projectName: "my-app", packageName: "com.example.myapp", description: "全栈应用" },
      deps,
    )

    const target = path.join(parent, "my-app")
    assert.ok(fs.existsSync(target))

    // 下载顺序：前端在前、后端在后
    assert.equal(downloads.length, 2)
    assert.match(downloads[0], /vite_react_init/)
    assert.match(downloads[1], /springboot-template/)

    // 前端渲染
    const webPkg = JSON.parse(fs.readFileSync(path.join(target, "apps", "web", "package.json"), "utf8"))
    assert.equal(webPkg.name, "my-app")
    assert.equal(webPkg.description, "全栈应用")

    // 后端渲染（含 Java 包路径目录重命名）
    const pom = fs.readFileSync(path.join(target, "apps", "api", "pom.xml"), "utf8")
    assert.ok(pom.includes("com.example.myapp"))
    const javaFile = path.join(target, "apps", "api", "src", "main", "java", "com", "example", "myapp", "App.java")
    assert.equal(fs.readFileSync(javaFile, "utf8"), "package com.example.myapp;\npublic class App {}\n")

    // 嵌套 .git 已移除
    assert.equal(fs.existsSync(path.join(target, "apps", "web", ".git")), false)
    assert.equal(fs.existsSync(path.join(target, "apps", "api", ".git")), false)

    // 单根 Git 仓库（默认 git init 为真实执行）
    assert.ok(fs.existsSync(path.join(target, ".git")))

    // 根级编排文件
    const config = JSON.parse(fs.readFileSync(path.join(target, "cwa.config.json"), "utf8"))
    assert.equal(config.preset, "react-spring")
    assert.equal(config.frontend.port, 5173)
    assert.equal(config.frontend.directory, "apps/web")
    assert.equal(config.contract.generatedClient, "apps/web/src/shared/api/generated")
    assert.ok(fs.existsSync(path.join(target, "apps", "api", "openapi.yaml")))

    // 无临时目录残留
    assert.deepEqual(listTmpDirs(parent), [])
  } finally {
    fs.rmSync(parent, { recursive: true, force: true })
  }
})

test("四个 preset 全部能在 fixture 下生成且配置正确", async () => {
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), "cwa-matrix-"))

  try {
    const expected = {
      "react-spring": { frontend: "vite-react", webPort: 5173 },
      "vue-spring": { frontend: "vite-vue3", webPort: 5173 },
      "next-spring": { frontend: "next-react-ssr", webPort: 3000 },
      "nuxt-spring": { frontend: "nuxt-vue3-ssr", webPort: 3000 },
    }

    for (const [preset, meta] of Object.entries(expected)) {
      const projectName = `app-${preset}`
      const { deps } = fixtureDeps(parent)
      await createFullstack(
        { kind: "fullstack", preset, projectName, packageName: "com.example.app", description: "" },
        deps,
      )

      const config = JSON.parse(fs.readFileSync(path.join(parent, projectName, "cwa.config.json"), "utf8"))
      assert.equal(config.preset, preset)
      assert.equal(config.frontend.template, meta.frontend)
      assert.equal(config.frontend.port, meta.webPort)
      assert.ok(fs.existsSync(path.join(parent, projectName, ".git")))
    }

    assert.deepEqual(listTmpDirs(parent), [])
  } finally {
    fs.rmSync(parent, { recursive: true, force: true })
  }
})

test("目标目录已存在：拒绝覆盖且目标保持原样", async () => {
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), "cwa-overwrite-"))

  try {
    fs.mkdirSync(path.join(parent, "my-app"))
    fs.writeFileSync(path.join(parent, "my-app", "keep.txt"), "original")

    const { deps } = fixtureDeps(parent)

    await assert.rejects(
      () =>
        createFullstack(
          { kind: "fullstack", preset: "react-spring", projectName: "my-app", packageName: "com.example.a", description: "" },
          deps,
        ),
      (err) => err instanceof FullstackCreateError && err.stage === "参数校验",
    )

    assert.equal(fs.readFileSync(path.join(parent, "my-app", "keep.txt"), "utf8"), "original")
    assert.equal(fs.existsSync(path.join(parent, "my-app", "apps")), false)
    assert.deepEqual(listTmpDirs(parent), [])
  } finally {
    fs.rmSync(parent, { recursive: true, force: true })
  }
})

test("后端下载失败：不留下目标半成品或临时目录", async () => {
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), "cwa-fail-"))

  try {
    const { deps } = fixtureDeps(parent)
    deps.downloadTemplate = async (url, target) => {
      if (url.includes("springboot-template")) {
        throw new Error("clone failed")
      }
      materializeTemplate(target, "frontend")
    }

    await assert.rejects(
      () =>
        createFullstack(
          { kind: "fullstack", preset: "react-spring", projectName: "my-app", packageName: "com.example.a", description: "" },
          deps,
        ),
      (err) => err instanceof FullstackCreateError && err.stage === "下载后端",
    )

    assert.equal(fs.existsSync(path.join(parent, "my-app")), false)
    assert.deepEqual(listTmpDirs(parent), [])
  } finally {
    fs.rmSync(parent, { recursive: true, force: true })
  }
})

test("独立创建：目标目录已存在时拒绝且不下载", async () => {
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), "cwa-standalone-"))

  try {
    fs.mkdirSync(path.join(parent, "my-web"))
    const logs = []
    const downloads = []
    let existsChecked = false

    await createStandalone(
      { templateName: "vite-react", projectName: "my-web", description: "" },
      {
        cwd: parent,
        targetExists: () => {
          existsChecked = true
          return true
        },
        downloadTemplate: async () => {
          downloads.push(true)
        },
        log: (message) => logs.push(message),
      },
    )

    assert.ok(existsChecked)
    assert.equal(downloads.length, 0)
    assert.ok(logs.some((message) => message.includes("目标目录已存在")))
  } finally {
    fs.rmSync(parent, { recursive: true, force: true })
  }
})
