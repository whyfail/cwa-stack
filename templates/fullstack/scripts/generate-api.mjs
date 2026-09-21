// 契约同步与前端 API Client 生成：
// 1. apps/api/openapi.yaml 是契约唯一来源；
// 2. 将其同步为 apps/web 内的契约快照；
// 3. 运行 orval 生成类型/Client 到 apps/web/src/shared/api/generated。
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const rootDir = process.cwd();
const contractSource = path.join(rootDir, "apps", "api", "openapi.yaml");
const snapshotDir = path.join(rootDir, "apps", "web", "openapi");
const snapshotPath = path.join(snapshotDir, "api-contract.yaml");

if (!fs.existsSync(contractSource)) {
  console.error(`api:generate 失败：缺少契约文件 ${path.relative(rootDir, contractSource)}`);
  process.exit(1);
}

fs.mkdirSync(snapshotDir, { recursive: true });
fs.copyFileSync(contractSource, snapshotPath);

// Nuxt 工程（fresh 项目没有 .nuxt 产物）需要先 prepare 生成类型配置，orval 才能加载
if (fs.existsSync(path.join(rootDir, "apps", "web", "nuxt.config.ts"))) {
  const prepare = spawnSync("pnpm", ["--dir", "apps/web", "exec", "nuxt", "prepare"], {
    stdio: "inherit",
    shell: process.platform === "win32",
  });

  if (prepare.status !== 0) {
    console.error("api:generate 失败：nuxt prepare 出错。");
    process.exit(prepare.status ?? 1);
  }
}

const generate = spawnSync("pnpm", ["--dir", "apps/web", "exec", "orval"], {
  stdio: "inherit",
  shell: process.platform === "win32",
});

if (generate.status !== 0) {
  console.error("api:generate 失败：orval 生成出错。");
  process.exit(generate.status ?? 1);
}

console.log("OpenAPI Client 生成完成：apps/web/src/shared/api/generated（禁止手工编辑）。");
