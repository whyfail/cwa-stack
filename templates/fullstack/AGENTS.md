# AGENTS.md

本文件约束 AI 助手与本全栈仓库的一切修改。

## 工程边界

- 前端业务代码在 `apps/web`（模板：{{{ frontendTemplate }}}），后端代码在 `apps/api`（Spring Boot 模板）。根级只存放编排脚本与文档，不写业务逻辑。
- `cwa.config.json` 是机器可读工程清单：目录、端口、契约路径与统一命令。修改目录或端口时必须同步该文件。
- 修改后端接口时，先改 `apps/api` 与 `openapi.yaml`，再执行 `pnpm run api:generate` 同步前端生成目录 `apps/web/src/shared/api/generated`；生成文件禁止手工编辑。

## 端口与契约

- Web 端口 {{{ webPort }}}、API 端口 8080、Management 端口 9090，由 `cwa.config.json` 声明；端口冲突必须排查占用者，禁止静默换端口。
- 登录契约：`POST /api/v1/login`（username/password/remember），响应顶层 `token/tokenType/expiresAt/user`；错误为 Problem Details 顶层 `code/msg/requestId`。SPA 走 Bearer，SSR 只经 BFF HttpOnly Cookie。

## 质量门禁

- 提交前执行 `pnpm run verify`（内部串联前后端全部门禁与真实登录 E2E）。
- 各子项目自身门禁以 `apps/web/AGENTS.md`、`apps/api/AGENTS.md` 为准；不得降低任一端的覆盖率阈值。
- 依赖升级后，前端运行 `pnpm --dir apps/web exec peers check`，后端重新执行 `./mvnw clean verify`。
