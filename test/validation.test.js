const { test } = require("node:test")
const assert = require("node:assert/strict")
const { isValidJavaPackageName } = require("../lib/validation/package-name")
const { isValidProjectName } = require("../lib/validation/project-name")

test("Java 包名：合法格式通过", () => {
  for (const value of ["com.example.app", "com.a.b", "com.example.app_v2", "com.mycompany.myapp"]) {
    assert.equal(isValidJavaPackageName(value), true, value)
  }
})

test("Java 包名：非法格式拒绝", () => {
  for (const value of [
    "",
    "app",
    "App.example",
    "com.Example",
    "com.example.App",
    "com.1example",
    "1com.example",
    "com..example",
    "com.example.",
    ".com.example",
    "com example app",
    null,
    undefined,
  ]) {
    assert.equal(isValidJavaPackageName(value), false, String(value))
  }
})

test("项目名称：非空字符串通过，空值拒绝", () => {
  assert.equal(isValidProjectName("my-app"), true)
  assert.equal(isValidProjectName(" "), true) // 与历史行为一致：仅拒绝空串
  assert.equal(isValidProjectName(""), false)
  assert.equal(isValidProjectName(undefined), false)
  assert.equal(isValidProjectName(null), false)
})
