// 环境初始化：运行时门禁 → 冻结安装 → 生成本地 .env（随机密码）→ 生成 OpenAPI Client。
// 已存在的 .env 永不覆盖；生成值仅供本地开发，生产环境必须显式提供。
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { checkRuntime, checkFiles, printChecks, hasFailure } from "./lib/env-checks.mjs";

const rootDir = process.cwd();

function fail(message) {
  console.error(`setup 失败：${message}`);
  process.exit(1);
}

const runtimeChecks = await checkRuntime(rootDir);
const fileChecks = checkFiles(rootDir);

console.log("环境检查：\n");
printChecks([...runtimeChecks, ...fileChecks]);

if (hasFailure([...runtimeChecks, ...fileChecks])) {
  fail("存在 FAIL 项，请先按建议修复后重试。");
}

// 本地 .env：缺失时生成，随机密码只写入被 Git 忽略的本地文件
const envPath = path.join(rootDir, ".env");
const envExamplePath = path.join(rootDir, ".env.example");

if (fs.existsSync(envPath)) {
  console.log("\n.env 已存在，保留不动（本地密码永不覆盖）。");
} else if (!fs.existsSync(envExamplePath)) {
  fail("缺少 .env.example，无法生成 .env。");
} else {
  const randomSecret = () => crypto.randomBytes(18).toString("base64url");
  const generatedKeys = new Set(["MYSQL_ROOT_PASSWORD", "MYSQL_APP_PASSWORD", "BOOTSTRAP_ADMIN_PASSWORD"]);
  const lines = fs
    .readFileSync(envExamplePath, "utf8")
    .split("\n")
    .map((line) => {
      const key = line.split("=")[0]?.trim();

      return generatedKeys.has(key) ? `${key}=${randomSecret()}` : line;
    });

  fs.writeFileSync(envPath, lines.join("\n"), "utf-8");
  console.log("\n已生成 .env：本地密码由 crypto.randomBytes 随机生成（已被 Git 忽略，禁止用于生产）。");
}

// 前端冻结安装
console.log("\n安装前端依赖（pnpm --dir apps/web install --frozen-lockfile）...\n");
const install = spawnSync("pnpm", ["--dir", "apps/web", "install", "--frozen-lockfile"], {
  stdio: "inherit",
  shell: process.platform === "win32",
});

if (install.status !== 0) {
  fail("前端依赖安装失败。");
}

// OpenAPI Client 生成
console.log("\n生成 OpenAPI Client（pnpm run api:generate）...\n");
const generate = spawnSync(process.execPath, [path.join("scripts", "generate-api.mjs")], {
  stdio: "inherit",
});

if (generate.status !== 0) {
  fail("OpenAPI Client 生成失败。");
}

console.log("\nsetup 完成。下一步：pnpm run dev 启动完整系统，或 pnpm run doctor 做一次只读诊断。");
