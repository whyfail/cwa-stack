const { test } = require("node:test")
const assert = require("node:assert/strict")
const { validateCreateOptions } = require("../lib/validation/create-options")

test("--template 与 --preset 互斥", () => {
  const result = validateCreateOptions({
    projectName: "my-app",
    template: "vite-react",
    preset: "react-spring",
  })
  assert.equal(result.ok, false)
  assert.match(result.messages[0], /互斥/)
})

test("缺少 --template 与 --preset 时报错", () => {
  const result = validateCreateOptions({ projectName: "my-app" })
  assert.equal(result.ok, false)
  assert.match(result.messages[0], /--template 或 --preset/)
})

test("缺少项目名称时报错", () => {
  const result = validateCreateOptions({ projectName: "", preset: "react-spring", package: "com.example.a" })
  assert.equal(result.ok, false)
  assert.match(result.messages[0], /项目名称/)
})

test("--template 独立前端：包名被忽略，描述透传", () => {
  const result = validateCreateOptions({
    projectName: "my-web",
    template: "vite-react",
    package: "com.example.ignored",
    description: "Web 应用",
  })
  assert.equal(result.ok, true)
  assert.deepEqual(result.request, {
    kind: "standalone",
    answers: {
      templateName: "vite-react",
      projectName: "my-web",
      packageName: "",
      description: "Web 应用",
    },
  })
})

test("--template spring-boot：必须提供合法 Java 包名", () => {
  const missing = validateCreateOptions({ projectName: "my-api", template: "spring-boot" })
  assert.equal(missing.ok, false)
  assert.match(missing.messages[0], /Java 包名/)

  const invalid = validateCreateOptions({ projectName: "my-api", template: "spring-boot", package: "Bad.Pkg" })
  assert.equal(invalid.ok, false)

  const valid = validateCreateOptions({ projectName: "my-api", template: "spring-boot", package: "com.example.myapi" })
  assert.equal(valid.ok, true)
  assert.equal(valid.request.answers.packageName, "com.example.myapi")
})

test("--template 未知模板报错", () => {
  const result = validateCreateOptions({ projectName: "my-web", template: "nope" })
  assert.equal(result.ok, false)
  assert.match(result.messages[0], /未知模板/)
})

test("--preset 全栈组合：必须提供合法 Java 包名", () => {
  const missing = validateCreateOptions({ projectName: "my-app", preset: "react-spring" })
  assert.equal(missing.ok, false)
  assert.match(missing.messages[0], /Java 包名/)

  const invalid = validateCreateOptions({ projectName: "my-app", preset: "react-spring", package: "com.A" })
  assert.equal(invalid.ok, false)

  const valid = validateCreateOptions({
    projectName: "my-app",
    preset: "react-spring",
    package: "com.example.myapp",
    description: "全栈应用",
  })
  assert.equal(valid.ok, true)
  assert.deepEqual(valid.request, {
    kind: "fullstack",
    preset: "react-spring",
    projectName: "my-app",
    packageName: "com.example.myapp",
    description: "全栈应用",
  })
})

test("--preset 未知预设报错", () => {
  const result = validateCreateOptions({ projectName: "my-app", preset: "nope", package: "com.example.a" })
  assert.equal(result.ok, false)
  assert.match(result.messages[0], /未知全栈预设/)
})
