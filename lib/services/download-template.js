const downloadGitRepo = require("download-git-repo")

// 把 download-git-repo 的回调风格包装为 Promise。
// 通过 createDownloadTemplate 可注入替身下载器，便于测试。
function createDownloadTemplate(downloader = downloadGitRepo) {
  return function downloadTemplate(url, target, options = {}) {
    return new Promise((resolve, reject) => {
      downloader(url, target, options, (err) => {
        if (err) {
          reject(err)
          return
        }
        resolve()
      })
    })
  }
}

module.exports = { createDownloadTemplate, downloadTemplate: createDownloadTemplate() }
