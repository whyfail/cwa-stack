const fs = require("fs")
const path = require("path")
const Handlebars = require("handlebars")

const SHELL_TEMPLATE_DIR = path.join(__dirname, "..", "..", "templates", "fullstack")

// 把 CLI 自带的全栈根级编排文件渲染后写入目标根目录。
// 仅渲染 .json/.md 文件（占位符所在），scripts/ 等其余文件原样拷贝，
// 避免脚本内容中的 {{ }}（如 docker --format 参数）被误当作模板语法。
function writeFullstackShell(targetDir, context, deps = {}) {
  const fsModule = deps.fsModule || fs
  copyDir(SHELL_TEMPLATE_DIR, targetDir, context, fsModule)
}

function copyDir(srcDir, destDir, context, fsModule) {
  fsModule.mkdirSync(destDir, { recursive: true })

  for (const entry of fsModule.readdirSync(srcDir, { withFileTypes: true })) {
    const src = path.join(srcDir, entry.name)
    const dest = path.join(destDir, entry.name)

    if (entry.isDirectory()) {
      copyDir(src, dest, context, fsModule)
    } else if (entry.name.endsWith(".json") || entry.name.endsWith(".md")) {
      const raw = fsModule.readFileSync(src, "utf-8")
      fsModule.writeFileSync(dest, Handlebars.compile(raw, { noEscape: true })(context), "utf-8")
    } else {
      fsModule.copyFileSync(src, dest)
    }
  }
}

module.exports = { writeFullstackShell }
