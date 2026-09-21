const { test } = require("node:test")
const assert = require("node:assert/strict")
const { parsePipeInput } = require("../lib/validation/pipe-input")

const templateNames = [
  "vite-react",
  "vite-vue3",
  "next-react-ssr",
  "nuxt-vue3-ssr",
  "spring-boot",
]
const presetNames = ["react-spring", "vue-spring", "next-spring", "nuxt-spring"]

test("旧管道输入：前端模板 模板名/项目名/描述", () => {
  const result = parsePipeInput("vite-react\nmy-app\n我的项目\n", templateNames, presetNames)
  assert.equal(result.ok, true)
  assert.deepEqual(result.request, {
    kind: "standalone",
    answers: {
      templateName: "vite-react",
      projectName: "my-app",
      packageName: "",
      description: "我的项目",
    },
  })
})

test("旧管道输入：省略描述时为空字符串", () => {
  const result = parsePipeInput("vite-vue3\nmy-app", templateNames, presetNames)
  assert.equal(result.ok, true)
  assert.equal(result.request.answers.description, "")
  assert.equal(result.request.answers.packageName, "")
})

test("旧管道输入：spring-boot 第四行为描述，第三行为包名", () => {
  const result = parsePipeInput("spring-boot\nmy-api\ncom.example.myapi\nAPI 服务", templateNames, presetNames)
  assert.equal(result.ok, true)
  assert.deepEqual(result.request.answers, {
    templateName: "spring-boot",
    projectName: "my-api",
    packageName: "com.example.myapi",
    description: "API 服务",
  })
})

test("旧管道输入：spring-boot 省略描述时为空字符串", () => {
  const result = parsePipeInput("spring-boot\nmy-api\ncom.example.myapi\n", templateNames, presetNames)
  assert.equal(result.ok, true)
  assert.equal(result.request.answers.description, "")
})

test("旧管道输入：spring-boot 缺少包名时报包名错误", () => {
  const result = parsePipeInput("spring-boot\nmy-api\n", templateNames, presetNames)
  assert.equal(result.ok, false)
  assert.match(result.messages[0], /Java 包名/)
})

test("旧管道输入：spring-boot 包名非法时报包名错误", () => {
  const result = parsePipeInput("spring-boot\nmy-api\ncom.Example\n", templateNames, presetNames)
  assert.equal(result.ok, false)
  assert.match(result.messages[0], /Java 包名/)
})

test("旧管道输入：未知模板报格式错误并列出可用模板与预设格式", () => {
  const result = parsePipeInput("nope\nmy-app\n", templateNames, presetNames)
  assert.equal(result.ok, false)
  assert.equal(result.messages[0], "管道输入格式不正确，请检查参数")
  assert.deepEqual(result.messages.slice(1), [
    "格式：模板名称\\n项目名称\\n项目描述（可选）",
    "spring-boot 模板：模板名称\\n项目名称\\nJava包名\\n项目描述（可选）",
    `全栈组合：preset:预设名\\n项目名称\\nJava包名\\n项目描述（可选），可用预设：${presetNames.join(", ")}`,
    `可用模板：${templateNames.join(", ")}`,
  ])
})

test("旧管道输入：少于两行报格式错误", () => {
  const result = parsePipeInput("vite-react", templateNames, presetNames)
  assert.equal(result.ok, false)
  assert.equal(result.messages[0], "管道输入格式不正确，请检查参数")
})

test("旧管道输入：容忍 CRLF 与多余空白行", () => {
  const result = parsePipeInput("vite-react\r\n\r\nmy-app\r\n\r\n", templateNames, presetNames)
  assert.equal(result.ok, true)
  assert.equal(result.request.answers.projectName, "my-app")
})

test("旧管道输入：非 spring 模板不校验包名格式", () => {
  const result = parsePipeInput("vite-react\nmy-app\ncom.looks.like.package\n", templateNames, presetNames)
  assert.equal(result.ok, true)
  assert.equal(result.request.answers.description, "com.looks.like.package")
  assert.equal(result.request.answers.packageName, "")
})

test("新管道输入：preset: 前缀解析为 fullstack 请求", () => {
  const result = parsePipeInput("preset:react-spring\nmy-app\ncom.example.myapp\n全栈应用", templateNames, presetNames)
  assert.equal(result.ok, true)
  assert.deepEqual(result.request, {
    kind: "fullstack",
    preset: "react-spring",
    projectName: "my-app",
    packageName: "com.example.myapp",
    description: "全栈应用",
  })
})

test("新管道输入：省略描述时为空字符串", () => {
  const result = parsePipeInput("preset:nuxt-spring\nmy-app\ncom.example.myapp", templateNames, presetNames)
  assert.equal(result.ok, true)
  assert.equal(result.request.description, "")
})

test("新管道输入：缺少或非法 Java 包名时报包名错误", () => {
  const missing = parsePipeInput("preset:react-spring\nmy-app\n", templateNames, presetNames)
  assert.equal(missing.ok, false)
  assert.match(missing.messages[0], /Java 包名/)

  const invalid = parsePipeInput("preset:react-spring\nmy-app\nBadPkg\n", templateNames, presetNames)
  assert.equal(invalid.ok, false)
  assert.match(invalid.messages[0], /Java 包名/)
})

test("新管道输入：未知预设报错并列出可用预设", () => {
  const result = parsePipeInput("preset:nope\nmy-app\ncom.example.a\n", templateNames, presetNames)
  assert.equal(result.ok, false)
  assert.equal(result.messages[0], "未知全栈预设：nope")
  assert.equal(result.messages[1], `可用预设：${presetNames.join(", ")}`)
})

test("旧管道输入：预设名未加前缀时给出格式提示", () => {
  const result = parsePipeInput("react-spring\nmy-app\n", templateNames, presetNames)
  assert.equal(result.ok, false)
  assert.match(result.messages[0], /检测到全栈预设 react-spring/)
  assert.match(result.messages[1], /preset:react-spring/)
})
