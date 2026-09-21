// 后端栈管理：compose 启动 MySQL/Redis、等待端口就绪、启动 Spring Boot、等待 readiness。
// 只使用 Node.js 内置模块；被 dev.mjs 与 verify.mjs 共享。
import { spawn, execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import { isTcpReachable, isPortOccupied } from "./env-checks.mjs";

const run = promisify(execFile);
const isWindows = process.platform === "win32";

export function composeArgs(rootDir) {
  return ["compose", "--env-file", path.join(rootDir, ".env"), "up", "-d", "mysql", "redis"];
}

// 等待 compose 服务通过自身健康检查（端口连通 ≠ 服务就绪，MySQL 首次初始化较慢）。
export async function waitForComposeHealthy(rootDir, service, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  const composeDir = path.join(rootDir, "apps", "api");

  while (Date.now() < deadline) {
    try {
      const { stdout: containerId } = await run("docker", ["compose", "--env-file", path.join(rootDir, ".env"), "ps", "-q", service], { cwd: composeDir });

      if (containerId.trim()) {
        const { stdout: health } = await run("docker", ["inspect", "-f", "{{.State.Health.Status}}", containerId.trim()]);

        if (health.trim() === "healthy") {
          return true;
        }
      }
    } catch {
      // compose/inspect 暂时失败按未就绪处理，继续轮询直到超时
    }

    await sleep(2000);
  }

  return false;
}

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function waitForPort(port, timeoutMs, label) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (await isTcpReachable(port)) {
      return true;
    }

    await sleep(2000);
  }

  return false;
}

export async function waitForReadiness(managementPort, timeoutMs) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (await isReadinessUp(managementPort)) {
      return true;
    }

    await sleep(2000);
  }

  return false;
}

function isReadinessUp(managementPort) {
  return fetch(`http://127.0.0.1:${managementPort}/actuator/health/readiness`, {
    signal: AbortSignal.timeout(2000),
  })
    .then((response) => response.ok)
    .catch(() => false);
}

// 启动 Spring Boot（local profile）。返回 child 进程；调用方负责在退出时杀掉进程组。
// 根级编排层知道全部合法前端源（dev 端口 + e2e preview 端口），显式传给后端 CORS 白名单。
export function spawnBackend(rootDir, dotenv, overrides = {}) {
  const mvnw = isWindows ? "mvnw.cmd" : "./mvnw";

  return spawn(mvnw, ["spring-boot:run", ...(overrides.args ?? [])], {
    cwd: path.join(rootDir, "apps", "api"),
    env: {
      ...process.env,
      SPRING_PROFILES_ACTIVE: "local",
      APP_BOOTSTRAP_ENABLED: "true",
      APP_BOOTSTRAP_ADMIN_PASSWORD: dotenv.BOOTSTRAP_ADMIN_PASSWORD,
      DB_PASSWORD: dotenv.MYSQL_APP_PASSWORD,
      MANAGEMENT_PORT: dotenv.MANAGEMENT_PORT,
      ...(overrides.allowedOrigins ? { APP_ALLOWED_ORIGINS: overrides.allowedOrigins } : {}),
    },
    stdio: "inherit",
    detached: !isWindows,
  });
}

// 汇总本工程全部合法浏览器源：dev/preview 的 localhost 与 127.0.0.1 变体
export function allowedOrigins(config) {
  const webPort = config.frontend.port;

  return [`http://localhost:${webPort}`, `http://127.0.0.1:${webPort}`, "http://localhost:4173", "http://127.0.0.1:4173"].join(",");
}

export function killGroup(child) {
  if (!child.pid || child.exitCode !== null) {
    return;
  }

  if (!isWindows) {
    process.kill(-child.pid, "SIGTERM");
    return;
  }

  child.kill("SIGTERM");
}

// dev/verify 启动前对自身要监听的端口做硬失败检查；禁止静默换端口。
export async function assertPortsFree(ports) {
  const occupied = [];

  for (const port of ports) {
    if (await isPortOccupied(port)) {
      occupied.push(port);
    }
  }

  if (occupied.length) {
    console.error(
      `以下端口被占用：${occupied.join(", ")}。请先排查占用者（lsof -i :端口）；端口冲突禁止静默换端口。`,
    );
    process.exit(1);
  }
}
