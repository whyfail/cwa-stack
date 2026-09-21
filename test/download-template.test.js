const { test } = require("node:test")
const assert = require("node:assert/strict")
const { createDownloadTemplate, downloadTemplate } = require("../lib/services/download-template")

test("下载成功时 Promise resolve 并透传参数", async () => {
  const calls = []
  const fake = (url, target, options, cb) => {
    calls.push({ url, target, options })
    cb(null)
  }
  const download = createDownloadTemplate(fake)
  await download("direct:https://example.com/a.git", "my-app", { clone: true })
  assert.deepEqual(calls, [
    { url: "direct:https://example.com/a.git", target: "my-app", options: { clone: true } },
  ])
})

test("下载失败时 Promise 携带原始错误 reject", async () => {
  const download = createDownloadTemplate((url, target, options, cb) => cb(new Error("clone failed")))
  await assert.rejects(() => download("url", "target", {}), /clone failed/)
})

test("默认导出是可调用的下载函数", () => {
  assert.equal(typeof downloadTemplate, "function")
  assert.equal(typeof createDownloadTemplate, "function")
})
