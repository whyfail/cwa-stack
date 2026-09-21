const { test } = require("node:test")
const assert = require("node:assert/strict")
const fs = require("node:fs")
const os = require("node:os")
const path = require("node:path")
const { writeFullstackShell } = require("../lib/services/write-fullstack-shell")

const context = {
  name: "my-app",
  description: "全栈应用",
  preset: "react-spring",
  frontendTemplate: "vite-react",
  backendTemplate: "spring-boot",
  webPort: 5173,
}

test("壳文件渲染：目录结构完整且 cwa.config.json 为合法 JSON", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cwa-shell-"))

  try {
    writeFullstackShell(dir, context)

    for (const file of [
      "package.json",
      "cwa.config.json",
      ".gitignore",
      ".env.example",
      "AGENTS.md",
      "README.md",
      path.join("docs", "architecture.md"),
      path.join("docs", "development.md"),
      path.join("scripts", "setup.mjs"),
      path.join("scripts", "dev.mjs"),
      path.join("scripts", "verify.mjs"),
      path.join("scripts", "doctor.mjs"),
      path.join("scripts", "generate-api.mjs"),
      path.join("scripts", "lib", "env-checks.mjs"),
      path.join("scripts", "lib", "backend-stack.mjs"),
    ]) {
      assert.ok(fs.existsSync(path.join(dir, file)), `缺少 ${file}`)
    }

    const config = JSON.parse(fs.readFileSync(path.join(dir, "cwa.config.json"), "utf8"))
    assert.equal(config.schemaVersion, 1)
    assert.equal(config.preset, "react-spring")
    assert.equal(config.frontend.template, "vite-react")
    assert.equal(config.frontend.port, 5173)
    assert.equal(config.backend.directory, "apps/api")
    assert.equal(config.contract.source, "apps/api/openapi.yaml")

    const pkg = JSON.parse(fs.readFileSync(path.join(dir, "package.json"), "utf8"))
    assert.equal(pkg.name, "my-app")
    assert.equal(pkg.scripts.setup, "node scripts/setup.mjs")

    const readme = fs.readFileSync(path.join(dir, "README.md"), "utf8")
    assert.ok(readme.includes("my-app"))
    assert.ok(readme.includes("react-spring"))
    assert.ok(readme.includes("5173"))

    const envExample = fs.readFileSync(path.join(dir, ".env.example"), "utf8")
    assert.ok(envExample.includes("MYSQL_APP_PASSWORD"))
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})
