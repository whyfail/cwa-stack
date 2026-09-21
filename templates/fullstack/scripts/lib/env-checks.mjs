// 全栈根级编排共享检查库。只使用 Node.js 内置模块，禁止引入第三方依赖。
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs";
import net from "node:net";
import http from "node:http";
import path from "node:path";

const run = promisify(execFile);

export const STATUS = { PASS: "PASS", WARN: "WARN", FAIL: "FAIL" };

const COLORS = { PASS: "\x1b[32m", WARN: "\x1b[33m", FAIL: "\x1b[31m" };
const RESET = "\x1b[0m";

export function loadConfig(rootDir) {
  return JSON.parse(fs.readFileSync(path.join(rootDir, "cwa.config.json"), "utf8"));
}

// 管理端口生效值：.env 显式配置优先（如本机 9090 被占用时配置 MANAGEMENT_PORT=9091），否则取 cwa.config.json 基线
export function effectiveManagementPort(config, dotenv) {
  const overridden = Number(dotenv?.MANAGEMENT_PORT);

  return Number.isInteger(overridden) && overridden > 0 ? overridden : config.backend.managementPort;
}

export function parseDotEnv(rootDir) {
  const envPath = path.join(rootDir, ".env");

  if (!fs.existsSync(envPath)) {
    return null;
  }

  const values = {};

  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separator = trimmed.indexOf("=");

    if (separator > 0) {
      values[trimmed.slice(0, separator).trim()] = trimmed.slice(separator + 1).trim();
    }
  }

  return values;
}

async function commandOutput(command, args) {
  try {
    const { stdout, stderr } = await run(command, args);
    return (stdout || stderr).trim();
  } catch (error) {
    return error.stdout || error.stderr ? String(error.stdout || error.stderr).trim() : null;
  }
}

function compareVersions(left, right) {
  const parts = left.split(".").map(Number);
  const other = right.split(".").map(Number);

  for (let index = 0; index < 3; index += 1) {
    if ((parts[index] || 0) !== (other[index] || 0)) {
      return (parts[index] || 0) - (other[index] || 0);
    }
  }

  return 0;
}

function satisfiesLowerBound(version, lowerBound) {
  return compareVersions(version, lowerBound) >= 0;
}

function satisfiesUpperBound(version, upperBound) {
  return compareVersions(version, upperBound) < 0;
}

// 解析 apps/web/package.json 的 engines.node（形如 ">=24.11.0 <25"）
export function readWebEngines(rootDir) {
  const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, "apps", "web", "package.json"), "utf8"));
  return pkg.engines || {};
}

async function javaVersion() {
  const java = process.env.JAVA_HOME
    ? path.join(process.env.JAVA_HOME, "bin", "java")
    : "java";
  const output = await commandOutput(java, ["-version"]);
  const match = /version "(\d+)/.exec(output || "");

  return match ? { major: Number(match[1]), raw: output.split("\n")[0] } : { major: null, raw: output };
}

// 运行时门禁：Node/pnpm/Java/Git/Docker/Compose。任何 FAIL 都会阻塞 setup 与 verify。
export async function checkRuntime(rootDir) {
  const checks = [];
  const engines = readWebEngines(rootDir);
  const nodeRange = engines.node || "";
  const lower = />=\s*([\d.]+)/.exec(nodeRange)?.[1];
  const upper = /<\s*([\d.]+)/.exec(nodeRange)?.[1];
  const nodeVersion = process.version.replace(/^v/, "");
  const nodeOk =
    (!lower || satisfiesLowerBound(nodeVersion, lower)) && (!upper || satisfiesUpperBound(nodeVersion, upper));

  checks.push({
    name: "Node.js",
    status: nodeOk ? STATUS.PASS : STATUS.FAIL,
    detail: nodeVersion + (nodeRange ? `（要求 ${nodeRange}）` : ""),
    fix: nodeOk ? null : "使用 nvm-desktop / nvm 安装模板要求的 Node.js LTS 版本",
  });

  const pnpmVersion = await commandOutput("pnpm", ["--version"]);
  const pnpmMajor = pnpmVersion ? Number(pnpmVersion.split(".")[0]) : null;

  checks.push({
    name: "pnpm",
    status: pnpmMajor >= 11 ? STATUS.PASS : STATUS.FAIL,
    detail: pnpmVersion || "未找到",
    fix: pnpmMajor >= 11 ? null : "npm install -g pnpm@11 安装 pnpm 11",
  });

  const java = await javaVersion();
  checks.push({
    name: "Java",
    status: java.major === 25 ? STATUS.PASS : STATUS.FAIL,
    detail: java.raw || "未找到",
    fix: java.major === 25 ? null : "安装 JDK 25（Temurin/Adoptium），并通过 JAVA_HOME 指向该 JDK",
  });

  const gitVersion = await commandOutput("git", ["--version"]);
  checks.push({
    name: "Git",
    status: gitVersion ? STATUS.PASS : STATUS.FAIL,
    detail: gitVersion || "未找到",
    fix: gitVersion ? null : "安装 Git：https://git-scm.com/",
  });

  const dockerVersion = await commandOutput("docker", ["version", "--format", "{{.Server.Version}}"]);
  checks.push({
    name: "Docker daemon",
    status: dockerVersion ? STATUS.PASS : STATUS.FAIL,
    detail: dockerVersion || "不可用",
    fix: dockerVersion ? null : "启动 Docker Desktop / Colima（colima start）",
  });

  const composeVersion = await commandOutput("docker", ["compose", "version"]);
  checks.push({
    name: "Docker Compose",
    status: composeVersion ? STATUS.PASS : STATUS.FAIL,
    detail: (composeVersion || "未找到").split("\n")[0],
    fix: composeVersion ? null : "安装 Docker Compose v2 插件",
  });

  return checks;
}

// 必需文件检查：组合工程结构 + 可选本地文件（缺失给 WARN）
export function checkFiles(rootDir) {
  const required = [
    path.join("apps", "web"),
    path.join("apps", "api"),
    path.join("apps", "api", "openapi.yaml"),
    path.join("apps", "api", "compose.yml"),
  ];
  const checks = [];

  for (const relative of required) {
    const exists = fs.existsSync(path.join(rootDir, relative));

    checks.push({
      name: `文件 ${relative}`,
      status: exists ? STATUS.PASS : STATUS.FAIL,
      detail: exists ? "存在" : "缺失",
      fix: exists ? null : "工程结构不完整，请用 create-wl-app 重新生成",
    });
  }

  checks.push({
    name: "文件 .env",
    status: fs.existsSync(path.join(rootDir, ".env")) ? STATUS.PASS : STATUS.WARN,
    detail: fs.existsSync(path.join(rootDir, ".env")) ? "存在" : "缺失",
    fix: fs.existsSync(path.join(rootDir, ".env")) ? null : "执行 pnpm run setup 生成本地 .env",
  });

  checks.push({
    name: "前端依赖 node_modules",
    status: fs.existsSync(path.join(rootDir, "apps", "web", "node_modules")) ? STATUS.PASS : STATUS.WARN,
    detail: fs.existsSync(path.join(rootDir, "apps", "web", "node_modules")) ? "已安装" : "未安装",
    fix: fs.existsSync(path.join(rootDir, "apps", "web", "node_modules")) ? null : "执行 pnpm run setup",
  });

  return checks;
}

export function isPortOccupied(port, host = "127.0.0.1") {
  return new Promise((resolve) => {
    const server = net.createServer();

    server.once("error", () => resolve(true));
    server.once("listening", () => {
      server.close(() => resolve(false));
    });
    server.listen(port, host);
  });
}

export async function checkPorts(config, dotenv) {
  const targets = [
    ["Web", config.frontend.port],
    ["API", config.backend.applicationPort],
    ["Management", effectiveManagementPort(config, dotenv)],
  ];
  const checks = [];

  for (const [name, port] of targets) {
    const occupied = await isPortOccupied(port);

    checks.push({
      name: `端口 ${name}:${port}`,
      status: occupied ? STATUS.WARN : STATUS.PASS,
      detail: occupied ? "被占用" : "空闲",
      fix: occupied ? `排查占用者：lsof -i :${port}；端口冲突禁止静默换端口` : null,
    });
  }

  return checks;
}

export async function isTcpReachable(port, host = "127.0.0.1", timeout = 1500) {
  return new Promise((resolve) => {
    const socket = net.connect({ port, host });

    socket.setTimeout(timeout);
    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.once("timeout", () => {
      socket.destroy();
      resolve(false);
    });
    socket.once("error", () => resolve(false));
  });
}

async function httpGetStatus(url, timeout = 3000) {
  return new Promise((resolve) => {
    const request = http.get(url, { timeout }, (response) => {
      response.resume();
      resolve(response.statusCode);
    });

    request.once("timeout", () => {
      request.destroy();
      resolve(null);
    });
    request.once("error", () => resolve(null));
  });
}

export async function checkServices(config, dotenv) {
  const mysqlPort = config?.services?.mysqlPort ?? 3306;
  const redisPort = config?.services?.redisPort ?? 6379;
  const managementPort = effectiveManagementPort(config, dotenv);
  const mysqlUp = await isTcpReachable(mysqlPort);
  const redisUp = await isTcpReachable(redisPort);
  const readinessStatus = await httpGetStatus(`http://127.0.0.1:${managementPort}/actuator/health/readiness`);

  return [
    {
      name: `MySQL :${mysqlPort}`,
      status: mysqlUp ? STATUS.PASS : STATUS.WARN,
      detail: mysqlUp ? "可连接" : "不可达",
      fix: mysqlUp ? null : "执行 pnpm run dev 启动 compose 中的 MySQL",
    },
    {
      name: `Redis :${redisPort}`,
      status: redisUp ? STATUS.PASS : STATUS.WARN,
      detail: redisUp ? "可连接" : "不可达",
      fix: redisUp ? null : "执行 pnpm run dev 启动 compose 中的 Redis",
    },
    {
      name: `API readiness :${managementPort}`,
      status: readinessStatus === 200 ? STATUS.PASS : STATUS.WARN,
      detail: readinessStatus ? `HTTP ${readinessStatus}` : "不可达",
      fix: readinessStatus === 200 ? null : "执行 pnpm run dev 启动 Spring Boot 后再检查",
    },
  ];
}

// 契约漂移只读检查：比较后端契约与前端侧快照；不一致说明生成结果可能过期
export function checkDrift(rootDir) {
  const source = path.join(rootDir, "apps", "api", "openapi.yaml");
  const snapshot = path.join(rootDir, "apps", "web", "openapi", "api-contract.yaml");
  const sourceContent = fs.existsSync(source) ? fs.readFileSync(source, "utf8") : "";
  const snapshotContent = fs.existsSync(snapshot) ? fs.readFileSync(snapshot, "utf8") : "";
  const drifted = sourceContent !== snapshotContent;

  return [
    {
      name: "OpenAPI Client",
      status: drifted ? STATUS.WARN : STATUS.PASS,
      detail: drifted ? "契约与前端快照不一致，生成结果可能过期" : "与后端契约一致",
      fix: drifted ? "执行 pnpm run api:generate 重新生成" : null,
    },
  ];
}

export function printChecks(checks) {
  for (const check of checks) {
    const color = COLORS[check.status];
    const fix = check.fix ? ` → ${check.fix}` : "";

    console.log(`${color}[${check.status}]${RESET} ${check.name}：${check.detail}${fix}`);
  }
}

export function hasFailure(checks) {
  return checks.some((check) => check.status === STATUS.FAIL);
}
