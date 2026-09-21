// 全栈验证：静态检查 → 契约漂移 → 前端全门禁 → 后端 mvnw clean verify → 真实登录 E2E。
// 任何一步失败立即以非零码退出，原始命令输出通过 stdio inherit 保留。
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { checkRuntime, checkFiles, printChecks, hasFailure, parseDotEnv, loadConfig, effectiveManagementPort } from "./lib/env-checks.mjs";
import { composeArgs, spawnBackend, killGroup, waitForComposeHealthy, waitForReadiness, allowedOrigins } from "./lib/backend-stack.mjs";

const rootDir = process.cwd();
const isWindows = process.platform === "win32";
const startedAt = Date.now();
const stages = [];

function fail(stage) {
  console.error(`\n✗ verify 在「${stage}」失败，已停止后续步骤。`);
  process.exit(1);
}

async function runStage(name, fn) {
  console.log(`\n━━━ ${name} ━━━`);
  const ok = await fn();

  if (!ok) {
    fail(name);
  }

  stages.push(name);
}

const frontendGateScripts = ["typecheck", "lint", "test", "test:coverage", "test:component-coverage", "build"];

await runStage("静态检查", async () => {
  const checks = [...(await checkRuntime(rootDir)), ...checkFiles(rootDir)];

  printChecks(checks);

  return !hasFailure(checks);
});

await runStage("OpenAPI 生成与漂移检查", async () => {
  const generate = spawnSync(process.execPath, [path.join("scripts", "generate-api.mjs")], { stdio: "inherit" });

  if (generate.status !== 0) {
    return false;
  }

  const diff = spawnSync("git", ["diff", "--exit-code", "--", "apps/web/openapi", "apps/web/src/shared/api/generated"], {
    encoding: "utf8",
  });

  if (diff.status !== 0) {
    console.log(diff.stdout || "");
    console.error("检测到契约漂移：请提交重新生成的契约快照与 Client。");
    return false;
  }

  return true;
});

for (const script of frontendGateScripts) {
  await runStage(`前端 ${script}`, async () => {
    const result = spawnSync("pnpm", ["--dir", "apps/web", "run", script], {
      stdio: "inherit",
      shell: isWindows,
    });

    return result.status === 0;
  });
}

await runStage("后端 mvnw clean verify", async () => {
  const mvnw = isWindows ? "mvnw.cmd" : "./mvnw";
  const result = spawnSync(mvnw, ["clean", "verify"], {
    cwd: path.join(rootDir, "apps", "api"),
    stdio: "inherit",
    shell: isWindows,
  });

  return result.status === 0;
});

await runStage("真实登录 E2E", async () => {
  const dotenv = parseDotEnv(rootDir);

  if (!dotenv) {
    console.error("缺少根级 .env，请先执行 pnpm run setup。");
    return false;
  }

  const compose = spawnSync("docker", composeArgs(rootDir), {
    cwd: path.join(rootDir, "apps", "api"),
    stdio: "inherit",
  });

  if (compose.status !== 0) {
    console.error("compose 启动失败。");
    return false;
  }

  if (!(await waitForComposeHealthy(rootDir, "mysql", 180_000))) {
    console.error("等待 MySQL 就绪超时（compose 健康检查未通过）。");
    return false;
  }

  if (!(await waitForComposeHealthy(rootDir, "redis", 120_000))) {
    console.error("等待 Redis 就绪超时（compose 健康检查未通过）。");
    return false;
  }

  const config = loadConfig(rootDir);
  const backend = spawnBackend(rootDir, dotenv, { allowedOrigins: allowedOrigins(config) });

  try {
    const ready = await waitForReadiness(effectiveManagementPort(config, dotenv), 300_000);

    if (!ready) {
      console.error("等待 Spring Boot readiness 超时，请查看上方日志。");
      return false;
    }

    const e2e = spawnSync("pnpm", ["--dir", "apps/web", "run", "test:e2e"], {
      stdio: "inherit",
      shell: isWindows,
      env: {
        ...process.env,
        E2E_AUTH_MOCK: "false",
        E2E_AUTH_USERNAME: "admin",
        E2E_AUTH_PASSWORD: dotenv.BOOTSTRAP_ADMIN_PASSWORD,
      },
    });

    return e2e.status === 0;
  } finally {
    killGroup(backend);
  }
});

const seconds = Math.round((Date.now() - startedAt) / 1000);
console.log(`\n✓ 全栈验证通过（${stages.length} 个阶段，用时 ${seconds}s）：`);
for (const stage of stages) {
  console.log(`  ✓ ${stage}`);
}
