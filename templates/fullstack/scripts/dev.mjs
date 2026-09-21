// 一键启动完整系统：compose（MySQL/Redis）→ Spring Boot（local profile）→ 前端开发服务器。
// 捕获 SIGINT/SIGTERM 正确结束子进程；默认不删除数据库卷。
import fs from "node:fs";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { loadConfig, parseDotEnv, effectiveManagementPort } from "./lib/env-checks.mjs";
import { composeArgs, spawnBackend, killGroup, waitForComposeHealthy, waitForReadiness, assertPortsFree, allowedOrigins } from "./lib/backend-stack.mjs";

const rootDir = process.cwd();
const isWindows = process.platform === "win32";

function fail(message) {
  console.error(`dev 失败：${message}`);
  process.exit(1);
}

const config = loadConfig(rootDir);
const dotenv = parseDotEnv(rootDir);
const managementPort = effectiveManagementPort(config, dotenv);

if (!dotenv) {
  fail("缺少根级 .env，请先执行 pnpm run setup。");
}

if (!fs.existsSync(path.join(rootDir, "apps", "api", "compose.yml"))) {
  fail("缺少 apps/api/compose.yml，工程结构不完整。");
}

// 快速检查：Docker 可用 + 自身监听端口空闲（MySQL/Redis 端口由 compose 幂等接管，不在此拦截）
const docker = spawnSync("docker", ["version", "--format", "{{.Server.Version}}"], { encoding: "utf8" });

if (docker.status !== 0) {
  fail("Docker daemon 不可用，请先启动 Docker Desktop / Colima。");
}

await assertPortsFree([config.frontend.port, config.backend.applicationPort, managementPort]);

const children = [];
let shuttingDown = false;

function shutdown(signal, exitCode = 0) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  console.log(`\n收到 ${signal}，正在停止前后端进程...`);

  for (const child of children) {
    killGroup(child);
  }

  console.log("MySQL/Redis 容器保持运行（默认不删除数据卷）。如需停止：cd apps/api && docker compose down");
  process.exit(exitCode);
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

// 1. compose 启动 MySQL/Redis
console.log("启动 MySQL/Redis（docker compose up -d mysql redis）...\n");
const compose = spawnSync("docker", composeArgs(rootDir), {
  cwd: path.join(rootDir, "apps", "api"),
  stdio: "inherit",
});

if (compose.status !== 0) {
  fail("compose 启动失败，请检查 Docker 与 .env 配置。");
}

// 2. 等待数据库端口
if (!(await waitForComposeHealthy(rootDir, "mysql", 180_000))) {
  fail("等待 MySQL 就绪超时（compose 健康检查未通过）。");
}

if (!(await waitForComposeHealthy(rootDir, "redis", 120_000))) {
  fail("等待 Redis 就绪超时（compose 健康检查未通过）。");
}

// 3. 启动 Spring Boot（local profile）
console.log("\n启动 Spring Boot（local profile）...\n");
const backend = spawnBackend(rootDir, dotenv, { allowedOrigins: allowedOrigins(config) });

children.push(backend);
backend.once("exit", (code) => {
  if (!shuttingDown) {
    console.error(`\nSpring Boot 进程意外退出（code=${code}），停止前端并退出。`);
    shutdown("backend-exit", 1);
  }
});

// 4. 等待后端 readiness
if (!(await waitForReadiness(managementPort, 300_000))) {
  fail("等待 Spring Boot readiness 超时，请查看上方日志。");
}

// 5. 启动前端开发服务器
const webPkg = JSON.parse(fs.readFileSync(path.join(rootDir, "apps", "web", "package.json"), "utf8"));
const devScript = webPkg.scripts?.dev ? "dev" : "start";

console.log(`\n启动前端开发服务器（pnpm --dir apps/web run ${devScript}）...\n`);
const frontend = spawn("pnpm", ["--dir", "apps/web", "run", devScript], {
  stdio: "inherit",
  shell: isWindows,
  detached: !isWindows,
});

children.push(frontend);

// 6. 输出访问地址
console.log(`\n全栈系统已就绪：
- Web：       http://localhost:${config.frontend.port}
- API：       http://localhost:${config.backend.applicationPort}
- Swagger：   http://localhost:${config.backend.applicationPort}/swagger-ui/index.html
- Readiness： http://localhost:${managementPort}/actuator/health/readiness

按 Ctrl+C 停止前后端进程；MySQL/Redis 容器保持运行（默认不删除数据卷）。
`);
