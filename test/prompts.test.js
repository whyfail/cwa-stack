const { test } = require("node:test")
const assert = require("node:assert/strict")
const {
  standaloneQuestions,
  fullstackQuestions,
  creationModeQuestion,
  collectCreateAnswers,
  collectInteractiveAnswers,
  collectFullstackAnswers,
} = require("../lib/prompts/create-prompts")

const [frameworkQ, modeQ, templateQ, projectNameQ, packageNameQ, descriptionQ] = standaloneQuestions

test("交互问题：技术栈选项为 Spring/React/Vue", () => {
  assert.deepEqual(
    frameworkQ.choices.map((item) => item.value),
    ["spring", "react", "vue"],
  )
})

test("交互问题：应用类型随技术栈联动", () => {
  assert.deepEqual(
    modeQ.choices({ framework: "spring" }).map((item) => item.value),
    ["monolith"],
  )
  assert.deepEqual(
    modeQ.choices({ framework: "react" }).map((item) => item.value),
    ["spa", "ssr"],
  )
  assert.deepEqual(
    modeQ.choices({ framework: "vue" }).map((item) => item.value),
    ["spa", "ssr"],
  )
})

test("交互问题：模板随技术栈和应用类型联动", () => {
  assert.deepEqual(
    templateQ.choices({ framework: "react", mode: "spa" }).map((item) => item.value),
    ["vite-react"],
  )
  assert.deepEqual(
    templateQ.choices({ framework: "react", mode: "ssr" }).map((item) => item.value),
    ["next-react-ssr"],
  )
  assert.deepEqual(
    templateQ.choices({ framework: "vue", mode: "ssr" }).map((item) => item.value),
    ["nuxt-vue3-ssr"],
  )
  assert.deepEqual(
    templateQ.choices({ framework: "spring", mode: "monolith" }).map((item) => item.value),
    ["spring-boot"],
  )
  assert.equal(templateQ.choices({ framework: "react", mode: "spa" })[0].name, "Vite React 企业级模板（vite-react）")
})

test("交互问题：项目名称拒绝空值与已存在目录", () => {
  assert.equal(projectNameQ.validate(""), undefined)
  assert.equal(projectNameQ.validate("lib"), undefined) // 仓库根目录确实存在 lib
  assert.equal(projectNameQ.validate("definitely-not-exists-xyz"), true)
})

test("交互问题：仅 spring-boot 追问 Java 包名", () => {
  assert.equal(packageNameQ.when({ templateName: "spring-boot" }), true)
  assert.equal(packageNameQ.when({ templateName: "vite-react" }), false)
  assert.equal(packageNameQ.default, "com.example.app")
})

test("交互问题：项目名称与包名的校验提示", () => {
  assert.equal(packageNameQ.validate(""), undefined)
  assert.equal(packageNameQ.validate("com.Example"), undefined)
  assert.equal(packageNameQ.validate("com.example.app"), true)
})

test("collectCreateAnswers 把问题交给注入的 prompt 执行器", async () => {
  let received
  const fakePrompt = (qs) => {
    received = qs
    return Promise.resolve({ templateName: "vite-react", projectName: "my-app" })
  }
  const answers = await collectCreateAnswers(fakePrompt)
  assert.equal(received, standaloneQuestions)
  assert.equal(answers.projectName, "my-app")
})

test("独立问题共六项，最后一项为项目描述", () => {
  assert.equal(standaloneQuestions.length, 6)
  assert.equal(descriptionQ.name, "description")
})

test("全栈问答链：技术栈+渲染模式唯一确定预设", async () => {
  const fakePrompt = () =>
    Promise.resolve({
      frontendFramework: "vue",
      renderMode: "ssr",
      projectName: "my-app",
      packageName: "com.example.myapp",
      description: "全栈应用",
    })

  const request = await collectFullstackAnswers(fakePrompt)

  assert.deepEqual(request, {
    preset: "nuxt-spring",
    projectName: "my-app",
    packageName: "com.example.myapp",
    description: "全栈应用",
  })
})

test("全栈问题：Java 包名必答且带默认值", () => {
  assert.equal(fullstackQuestions.length, 5)
  const packageNameQ = fullstackQuestions[3]
  assert.equal(packageNameQ.name, "packageName")
  assert.equal(packageNameQ.default, "com.example.app")
})

test("交互入口：先问创建方式，再进入全栈问答", async () => {
  const seq = [
    { creationMode: "fullstack" },
    { frontendFramework: "react", renderMode: "spa" },
    { projectName: "my-app", packageName: "com.example.myapp", description: "" },
  ]
  const fakePrompt = () => Promise.resolve(seq.shift())

  const result = await collectInteractiveAnswers(fakePrompt)

  assert.equal(result.kind, "fullstack")
  assert.equal(result.request.preset, "react-spring")
})

test("交互入口：默认进入独立项目问答", async () => {
  const seq = [
    { creationMode: "standalone" },
    { templateName: "vite-react", projectName: "my-web", description: "" },
  ]
  const fakePrompt = () => Promise.resolve(seq.shift())

  const result = await collectInteractiveAnswers(fakePrompt)

  assert.equal(result.kind, "standalone")
  assert.equal(result.answers.templateName, "vite-react")
})

test("创建方式问题：两个选项", () => {
  assert.equal(creationModeQuestion[0].choices.length, 2)
  assert.deepEqual(
    creationModeQuestion[0].choices.map((item) => item.value),
    ["standalone", "fullstack"],
  )
})
