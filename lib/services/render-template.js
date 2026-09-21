/* 渲染最终项目 render-template.js */

const Metalsmith = require("metalsmith")

const fs = require("fs")
const path = require("path")

// 已知占位符集合：只替换这些变量；其余 {{ }}（Vue 插值、JSX 对象字面量等业务代码）保持原样。
// 注意：替换为原始值（不做 HTML 转义），因为渲染目标多为 JSON/源码而非 HTML。
const PLACEHOLDER_KEYS = ["name", "author", "description", "package", "packagePath"]

function renderContents(contents, meta) {
  let output = contents

  for (const key of PLACEHOLDER_KEYS) {
    const value = meta[key]

    if (value === undefined || value === null) {
      continue
    }

    output = output.replace(new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, "g"), String(value))
  }

  return output
}

module.exports = function (metadata = {}, src, dest = ".") {
  if (!src) {
    return Promise.reject(new Error(`无效的source: ${src}`))
  }
  const inPlace = path.resolve(src) === path.resolve(dest)
  return new Promise((resolve, reject) => {
    Metalsmith(process.cwd()) // 在当前目录下执行
      .metadata(metadata) // 设置全局元信息-可被应用于所有文件
      .clean(false) // 设置是否在写入文件前移除目标路径
      .source(src) // 设置资源目录（相对路径）
      .destination(dest) // 目标路径
      .use((files, metalsmith, done) => {
        // 使用函数插件
        const meta = metalsmith.metadata()
        // 目录占位符重命名：{{ packagePath }} -> com/mycompany/myapp
        if (meta.packagePath) {
          const oldDirs = new Set()
          Object.keys(files)
            .filter((x) => x.includes("{{"))
            .forEach((fileName) => {
              const newKey = fileName.split("{{ packagePath }}").join(meta.packagePath)
              if (newKey !== fileName) {
                files[newKey] = files[fileName]
                delete files[fileName]
                // 原地生成（source === dest）时，Metalsmith 不会删除旧路径文件，手动清理
                if (inPlace) {
                  fs.rmSync(path.join(src, fileName), { recursive: true, force: true })
                  // 记录旧路径上的目录骨架，稍后删除空目录
                  let dir = path.dirname(fileName)
                  while (dir.includes("{{")) {
                    oldDirs.add(dir)
                    dir = path.dirname(dir)
                  }
                }
              }
            })
          // 从最深的目录开始删除空骨架
          const dirs = Array.from(oldDirs).sort((a, b) => b.length - a.length)
          dirs.forEach((dir) => {
            if (inPlace) {
              fs.rmdirSync(path.join(src, dir), { force: true })
            }
          })
        }
        // 对包含模板变量的文件做占位符替换（package.json/README/Java 源码等）
        Object.keys(files)
          .filter((x) => {
            if (x.includes(".git") || x.includes("node_modules")) return false
            try {
              return files[x].contents.toString("utf-8").includes("{{")
            } catch (e) {
              return false
            }
          })
          .forEach((fileName) => {
            files[fileName].contents = Buffer.from(renderContents(files[fileName].contents.toString("utf-8"), meta), "utf-8")
          })
        done()
      })
      .build((err) => {
        err ? reject(err) : resolve()
      })
  })
}
