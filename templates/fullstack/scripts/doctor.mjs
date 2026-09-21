// 全栈项目只读诊断：输出每项 PASS/WARN/FAIL 与可执行修复建议。
// 不安装依赖、不修改配置、不启动或停止任何服务。--static 仅输出静态检查部分。
import { checkRuntime, checkFiles, checkPorts, checkServices, checkDrift, loadConfig, parseDotEnv, printChecks, hasFailure } from "./lib/env-checks.mjs";

const rootDir = process.cwd();
const staticOnly = process.argv.includes("--static");
const config = loadConfig(rootDir);
const dotenv = parseDotEnv(rootDir);

const checks = [...(await checkRuntime(rootDir)), ...checkFiles(rootDir)];

if (!staticOnly) {
  checks.push(
    ...(await checkPorts(config, dotenv)),
    ...(await checkServices(config, dotenv)),
    ...checkDrift(rootDir),
  );
}

console.log(`全栈项目诊断（${staticOnly ? "静态检查" : "完整"}）：\n`);
printChecks(checks);

const failures = checks.filter((check) => check.status === "FAIL").length;
const warnings = checks.filter((check) => check.status === "WARN").length;

console.log(`\n结果：${checks.length - failures - warnings} PASS / ${warnings} WARN / ${failures} FAIL`);

if (hasFailure(checks)) {
  console.log("存在 FAIL 项，请先按建议修复。");
  process.exit(1);
}
