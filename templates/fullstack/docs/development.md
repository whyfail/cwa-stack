# 开发指南

## 首次启动

1. 环境要求：Node.js 24 LTS、pnpm、Java 25、Docker 与 Docker Compose。
2. `pnpm run setup`：校验环境、安装前端依赖、生成根级 `.env`（本地随机密码）、生成 OpenAPI Client。
3. `pnpm run dev`：启动 MySQL/Redis（compose）、Spring Boot（local profile）与前端开发服务器；就绪后输出各服务地址。

## 日常验证

- `pnpm run verify`：按顺序执行 doctor 静态检查、契约漂移检查、前端 typecheck/lint/test/coverage/build、后端 `./mvnw clean verify`、真实登录 E2E。
- `pnpm run doctor`：只读诊断，输出每项 PASS/WARN/FAIL 与修复建议，不修改系统状态。

## 常见问题

- 端口被占用：用 `pnpm run doctor` 定位占用者；禁止静默换端口，避免前后端代理失配。
- Docker 不可用：先启动 Docker/Colima；MySQL 与 Redis 依赖 compose 栈。
- 契约漂移：后端接口变更后执行 `pnpm run api:generate` 并提交生成结果，CI 会用 `git diff --exit-code` 检查。
- 根级 `.env`：仅本地开发使用；生产环境必须显式提供密码，后端生产 profile 缺密钥时启动失败（fail closed）。
