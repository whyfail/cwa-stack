# cwa-stack

> **CWA = Create Whole-stack App** —— AI 时代的全栈工程引擎。

[![npm version](https://img.shields.io/npm/v/cwa-stack.svg)](https://www.npmjs.com/package/cwa-stack)
[![license](https://img.shields.io/npm/l/cwa-stack.svg)](https://www.npmjs.com/package/cwa-stack)
[![GitHub repo](https://img.shields.io/badge/GitHub-whyfail%2Fcwa-stack-blue)](https://github.com/whyfail/cwa-stack)

> [!IMPORTANT]
> 本包原名为 **create-wl-app**，自 1.0.0 起更名为 **cwa-stack**。
> 使用方式不变：`npx cwa-stack create ...`；旧包 `create-wl-app` 已标记弃用，请迁移到新包名。

一条命令，生成前后端**真实联通、可登录、可验证**的企业级全栈工程：React / Vue 的 SPA 与 SSR × Spring Boot，OpenAPI 契约驱动，AI Agent 开箱即用。

## ✨ 它解决什么问题

- **全栈一键成型**：四个预设一次生成前端 `apps/web` + Spring Boot `apps/api` 的单一 Git 仓库工程；五套模板是唯一源码来源，组合器零复制、零漂移
- **真实联通，不是演示**：生成的登录走真实后端（SPA 走 Bearer，SSR 走 BFF HttpOnly Cookie），不存在需要手工替换的演示 token
- **契约驱动**：后端 OpenAPI 3.1 是唯一事实来源，前端类型与 Axios Client 自动生成，CI 检出漂移
- **开箱即验证**：`pnpm run verify` 串联契约漂移检查、双端全部门禁与真实登录 E2E——全绿才算完成
- **AI 原生**：AGENTS.md 约束 + 机器可读 `cwa.config.json`（目录/端口/契约/命令）+ 随包 Agent 技能，AI 接手不需要猜

## 🧰 模板与预设

| 独立模板 | 技术栈 | | 全栈预设 | 组合 |
| --- | --- | --- | --- | --- |
| `vite-react` | Vite 8 + React 19 SPA | | `react-spring` | vite-react × spring-boot |
| `vite-vue3` | Vite 8 + Vue 3 SPA | | `vue-spring` | vite-vue3 × spring-boot |
| `next-react-ssr` | Next.js 16 SSR | | `next-spring` | next-react-ssr × spring-boot |
| `nuxt-vue3-ssr` | Nuxt 4 SSR | | `nuxt-spring` | nuxt-vue3-ssr × spring-boot |
| `spring-boot` | Java 25 + Spring Boot 4 | | | |

## 🚀 快速开始

环境要求：Git、Node.js 24 LTS（`>=24.15.0 <25`）、pnpm 12.16.1（由前端模板的 `packageManager` 钉定）；全栈组合另需 Java 25 与 Docker。

```bash
# 交互式：选择独立项目或全栈组合
npx cwa-stack create

# 全栈组合（一次生成前端 + 后端，--package 必填）
npx cwa-stack create my-app --preset react-spring --package com.example.myapp

# 独立创建（--template 与 --preset 互斥）
npx cwa-stack create my-web --template vite-react --description "My web application"
npx cwa-stack create my-api --template spring-boot --package com.example.myapi

# 管道输入（CI / AI Agent 友好）
printf '%s\n' 'preset:react-spring' 'my-app' 'com.example.myapp' | npx cwa-stack create
```

## 🤖 AI Agent 技能

随包发布 `create-app` Agent 技能（Agent Skills 规范：`SKILL.md` + `scripts/`），支持技能的 Agent（Claude Code / Codex / ZCode 等）可以一句话完成项目创建与初始化。

**方式一：skills CLI 一键安装（推荐）**

```bash
npx skills add whyfail/cwa-stack -g
```

`-g` 表示安装为全局（用户级）技能；CLI 会自动发现 `create-app` 技能并识别本机已安装的 Agent（Codex / ZCode / Claude Code 等），加 `-y` 可跳过确认。

**方式二：手动安装（Codex / ZCode 等）**

```bash
git clone --depth 1 https://github.com/whyfail/cwa-stack.git /tmp/cwa-stack

# Codex：拷贝到 ~/.codex/skills/
mkdir -p ~/.codex/skills
cp -R /tmp/cwa-stack/skills/create-app ~/.codex/skills/

# ZCode：拷贝到 ~/.agents/skills/
mkdir -p ~/.agents/skills
cp -R /tmp/cwa-stack/skills/create-app ~/.agents/skills/
```

**方式三：Claude Code 插件市场**

```bash
/plugin marketplace add whyfail/cwa-stack
/plugin install create-app@cwa-stack
```

安装后对 Agent 说「用 cwa-stack 创建一个全栈项目」即可；npm 包 `cwa-stack` 内同样携带该技能（`skills/create-app/`）。

## 🗂️ 组合工程结构

```text
my-app/
├── apps/
│   ├── web/                  # 前端模板原样装配（独立模板零修改）
│   └── api/                  # Spring Boot 后端，openapi.yaml 为契约来源
├── docs/                     # 架构与开发说明
├── scripts/                  # 根级编排脚本（零第三方依赖）
├── cwa.config.json           # 机器可读工程清单（目录、端口、契约、命令）
├── AGENTS.md                 # AI 协作规则
└── package.json              # 根级命令入口
```

## 🎛️ 组合工程根级命令

| 命令 | 职责 |
| --- | --- |
| `pnpm run setup` | 运行时门禁（Node 24 / pnpm / Java 25 / Docker）、冻结安装、生成随机密码 `.env`、生成 API Client |
| `pnpm run dev` | compose 启动 MySQL/Redis → Spring Boot readiness → 前端开发服务器；SIGINT 优雅清理 |
| `pnpm run verify` | 契约漂移 + 前端六项门禁 + 后端 `mvnw clean verify` + 真实登录 E2E |
| `pnpm run doctor` | 只读诊断：版本、端口占用、依赖服务可达性、契约漂移，输出修复建议 |
| `pnpm run api:generate` | 以 `apps/api/openapi.yaml` 为唯一契约来源重新生成前端 Client |

端口基线：Web 5173（SPA）/ 3000（SSR）、API 8080、Management 9090。

## 🧪 独立模板质量门禁

每套模板自带同一条门禁链，覆盖率阈值与组件测试守卫不可绕过：

```bash
pnpm run test && pnpm run test:coverage && pnpm run test:component-coverage
pnpm run typecheck && pnpm run lint && pnpm run build && pnpm run test:e2e
```

## 📚 文档

完整文档与模板细节见 **[cwa-docs](https://whyfail.github.io/cwa-docs/)**：

- [脚手架核心](https://whyfail.github.io/cwa-docs/core/脚手架核心.html) — 全栈组合、根级编排与契约驱动
- [React 模板](https://whyfail.github.io/cwa-docs/core/React模板.html) / [Vue3 模板](https://whyfail.github.io/cwa-docs/core/Vue3模板.html) / [ReactSSR 模板](https://whyfail.github.io/cwa-docs/core/ReactSSR模板.html) / [Vue3SSR 模板](https://whyfail.github.io/cwa-docs/core/Vue3SSR模板.html) / [SpringBoot 模板](https://whyfail.github.io/cwa-docs/core/SpringBoot模板.html)
- [升级日志](https://whyfail.github.io/cwa-docs/log/2026-09-21.html)

## 🤝 社区支持

- [GitHub 仓库](https://github.com/whyfail/cwa-stack) - 给我们一个 star 支持
- [Issues](https://github.com/whyfail/cwa-stack/issues) - 报告问题或提出建议

---

🎉 **一条命令，全栈成型。** 契约驱动 | 开箱即验证 | AI 原生
