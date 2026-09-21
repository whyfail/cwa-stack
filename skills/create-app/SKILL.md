---
name: create-app
description: 使用 npm 上发布的 create-wl-app 脚手架创建并初始化项目，覆盖 React、Vue 3、Next.js、Nuxt 四类前端模板和 Spring Boot 后端模板。用户说"新建一个项目""创建一个项目""初始化一个项目""创建前端/后端项目""新建 React/Vue/Next.js/Nuxt/Spring Boot 项目"，或表达要从零搭建新工程时使用。
---

# Create App

使用 npm 包 `create-wl-app` 创建项目，并按模板类型完成依赖安装与基础验证。

## 收集信息

从用户请求和当前上下文提取以下信息；只询问缺失且会影响结果的项目：

- 项目名称：必填，使用适合作为目录名和 npm 包名的小写名称。
- 项目类型：独立前端、独立后端（Spring Boot），或**全栈组合**（前端 + Spring Boot 一次生成）。
- 技术栈：前端 React / Vue，或后端 Spring Boot。
- 应用类型：默认 SPA；用户明确要求 SSR、Next.js 或 Nuxt 时选择 SSR（仅前端适用）。
- Java 包名：`spring-boot` 模板与全栈组合必填，格式 `com.mycompany.myapp`（全小写、点分段）。
- 创建位置：用户未指定时使用当前工作区；在执行前明确告知目标绝对路径。
- 项目描述：可选；未提供时使用简短描述，例如 `<项目名> 前端项目`。

按下表选择模板：

| 技术栈 | 应用类型 | 模板 / 预设 | 额外参数 |
| --- | --- | --- | --- |
| React | SPA | 模板 `vite-react` | - |
| Vue | SPA | 模板 `vite-vue3` | - |
| React / Next.js | SSR | 模板 `next-react-ssr` | - |
| Vue / Nuxt | SSR | 模板 `nuxt-vue3-ssr` | - |
| Java / Spring Boot | 后端单体 | 模板 `spring-boot` | `--package <Java包名>` |
| 前端 React + Spring Boot | 全栈组合 | 预设 `react-spring` | `--package <Java包名>` |
| 前端 Vue + Spring Boot | 全栈组合 | 预设 `vue-spring` | `--package <Java包名>` |
| 前端 Next.js + Spring Boot | 全栈组合 | 预设 `next-spring` | `--package <Java包名>` |
| 前端 Nuxt + Spring Boot | 全栈组合 | 预设 `nuxt-spring` | `--package <Java包名>` |

如果用户只说"新建一个项目"，至少确认项目名称和技术栈方向（前端 React/Vue、后端 Spring Boot，或全栈组合）；前端应用类型按 SPA 处理。

## 创建流程

1. 检查环境：`node`（≥20，前端模板基线为 24 LTS）、`git`、`pnpm`、`npm`、`npx` 可用；`spring-boot` 模板额外确认 `java`（25）与 `docker`。缺少工具时报告具体缺项，不要擅自全局安装。
2. 检查目标目录不存在。若已存在，停止并请用户更换名称或位置；绝不删除、清空或覆盖。
3. 从本技能目录执行包装脚本。脚本通过 npm 获取 `create-wl-app@latest`，不依赖本地源码或全局安装：

   ```bash
   # 前端模板
   bash scripts/create_project.sh \
     --template <模板> \
     --name <项目名> \
     --description '<项目描述>' \
     --parent '<父目录绝对路径>'
   ```

   ```bash
   # 后端模板（--package 必填）
   bash scripts/create_project.sh \
     --template spring-boot \
     --name <项目名> \
     --package <Java包名> \
     --description '<项目描述>' \
     --parent '<父目录绝对路径>'
   ```

   ```bash
   # 全栈组合（前端 apps/web + Spring Boot apps/api，--package 必填）
   bash scripts/create_project.sh \
     --preset react-spring \
     --name <项目名> \
     --package <Java包名> \
     --description '<项目描述>' \
     --parent '<父目录绝对路径>'
   ```

4. 进入新项目后的步骤按模板类型分支：

   **前端模板（vite-react / vite-vue3 / next-react-ssr / nuxt-vue3-ssr）**
   1. 先读取项目内的 `AGENTS.md`（如存在），再执行 `pnpm install`。
   2. 若项目尚不是 Git 仓库，执行 `git init`。除非用户明确要求，不自动创建提交。
   3. 运行项目提供的快速质量检查。优先读取 `package.json` 的 scripts；至少运行可用的 `typecheck`、`lint` 和 `build`。若耗时或环境限制导致无法运行，明确报告。
   4. 启动 `pnpm dev`，保持进程运行，并报告终端实际输出的本地访问地址。端口被占用时使用工具自动选择的其他端口，不猜测地址。

   **全栈组合工程（--preset 创建，需要 create-wl-app 1.2.0+）**
   1. 先读取根目录 `AGENTS.md` 与 `cwa.config.json`：后者是机器可读清单（前后端目录、端口、契约路径、命令）。
   2. 执行 `pnpm run setup`：环境门禁、前端冻结安装、生成随机密码 `.env`、依据 `apps/api/openapi.yaml` 生成前端 API Client（需要 Java 25 与 Docker）。
   3. 启动完整系统执行 `pnpm run dev`（compose 拉起 MySQL/Redis、Spring Boot、前端）；readiness 就绪后报告 Web/API/Swagger 地址。
   4. 全栈验证用 `pnpm run verify`（契约漂移 + 双端门禁 + 真实登录 E2E）；只读诊断用 `pnpm run doctor`。
   5. 修改后端接口时：先改 `apps/api` 与 `openapi.yaml`，再执行 `pnpm run api:generate` 同步 `apps/web/src/shared/api/generated`（禁止手工编辑）。

   **后端模板（spring-boot）**
   1. 先读取项目内的 `AGENTS.md` 与 `README.md`，了解业务域分层与必填环境变量。
   2. 若项目尚不是 Git 仓库，执行 `git init`。除非用户明确要求，不自动创建提交。
   3. 运行 `./mvnw clean verify` 验证全量质量门禁（需要 Docker 供 Testcontainers 使用）；报告测试与覆盖率结果。
   4. 不主动启动应用或 `docker compose`：启动需要 `.env` 中的数据库与管理员密码。向用户说明下一步：`cp .env.example .env` 填入密码后 `docker compose up -d --build`，readiness 探针在管理端口（容器内 9090）。

## 行为约束

- 始终使用 npm 包 `create-wl-app@latest`，不要依赖本地源码或全局安装。`spring-boot` 模板需要 1.1.0 及以上版本；全栈组合（`--preset`）需要 1.2.0 及以上版本。
- 需要联网访问 npm 注册表和模板仓库；网络失败时报告原始错误，不切换到本地副本。
- 不在已存在的目录上运行生成器。
- `spring-boot` 的 Java 包名必须匹配 `^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$`；不合法时向用户确认，不要擅自改写。
- 命令失败时保留错误输出，定位到下载、依赖安装或项目校验的具体阶段。
- 创建成功后报告项目绝对路径、所用模板、验证结果；前端额外报告开发服务器地址。
