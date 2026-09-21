# 🎉 欢迎使用 cwa-stack

> [!IMPORTANT]
> 本包原名为 **create-wl-app**，自 1.0.0 起更名为 **cwa-stack**（CWA = Create Whole-stack App）。
> 使用方式不变：`npx cwa-stack create ...`；旧包 `create-wl-app` 已标记弃用，请迁移到新包名。

## 🚀 什么是 cwa-stack？

cwa-stack 是一款 **AI 时代的全栈工程引擎**，提供 React/Vue 的 SPA 与 SSR 企业级前端模板和 Spring Boot 企业级后端模板：

- **独立创建**：一条命令生成任一前端或后端工程
- **全栈组合**：四个预设（`react-spring` / `vue-spring` / `next-spring` / `nuxt-spring`）一次生成前后端真实联通、单一 Git 仓库的全栈工程，模板源码零复制
- **根级编排**：`setup / dev / verify / doctor / api:generate` 五个命令覆盖全栈生命周期
- **契约驱动**：以后端 OpenAPI 3.1 为唯一事实来源，前端类型与 Client 自动生成
- **AI 原生**：AGENTS.md + 机器可读 `cwa.config.json` + 随包 Agent 技能

### ✨ 核心优势

- ⚡ **极速构建**：SPA 模板基于 Rust 驱动的 Vite 8 + Rolldown，SSR 模板基于 Next.js / Nuxt Node SSR
- 📦 **开箱即用**：内置完整项目结构，无需复杂配置
- 🎨 **多框架支持**：支持 React、Vue 3、Next.js、Nuxt 四类前端模板与 Spring Boot 后端模板
- 🔧 **开发友好**：集成 ESLint、Git 钩子、开发工具等
- 📱 **完美适配**：自动适配各种屏幕尺寸

## 📋 环境准备

在开始之前，请确保你的设备已安装以下环境：

### ✅ 必备环境

1. **Git** - 版本控制系统
   - 下载地址：[https://git-scm.com/](https://git-scm.com/)
   - 验证方式：`git --version`

2. **Node.js** - JavaScript 运行时
   - 版本要求：**20.0.0 以上**
   - 直接下载node地址：[https://nodejs.org](https://nodejs.org)
   - 或使用 **nvm-desktop** 管理 Node.js 版本（推荐）
   - 下载地址: [nvm-desktop](https://github.com/1111mp/nvm-desktop)
   - 验证方式：`node --version`

### 🎯 推荐工具

- **Trae** - 智能 IDE (字节出品)
  - 下载地址：[国内版](https://www.trae.cn/)
  - 或 [国际版](https://trae.ai/)
  - 验证方式：`trae --version`

- **Visual Studio Code** - 现代化代码编辑器
  - 下载地址：[https://code.visualstudio.com/](https://code.visualstudio.com/)
  - 推荐插件：ESLint、Volar（Vue 开发）、Unocss

## 🎉 开始创建项目

### 🚀 步骤 1：初始化项目

打开终端，在你想要创建项目的目录中输入以下命令：

```bash
# 使用 npx 创建项目
npx cwa-stack create
```

### 🎯 步骤 2：选择技术栈、应用类型和模板

根据提示先选择创建方式（独立项目 / 全栈组合项目），独立项目再依次选择技术栈、单页面应用或 SSR、具体模板：

```
? 请选择创建方式：
❯ 独立项目
  全栈组合项目

? 请选择技术栈：
❯ React
  Vue

? 请选择应用类型：
❯ 单页面应用
  SSR 服务端渲染

? 请选择模板：
❯ Vite React 企业级模板（vite-react）
```

### ⚡ 非交互与全栈组合创建

```bash
# 独立创建（--template 与 --preset 互斥）
npx cwa-stack create my-web --template vite-react --description "My web application"
npx cwa-stack create my-api --template spring-boot --package com.example.myapi

# 全栈组合：一次生成前端 apps/web + Spring Boot apps/api 的单 Git 仓库工程
npx cwa-stack create my-app --preset react-spring --package com.example.myapp
```

四个全栈预设：`react-spring`、`vue-spring`、`next-spring`、`nuxt-spring`。生成后进入项目执行 `pnpm run setup` 完成环境初始化（setup、dev、verify、doctor、api:generate 五个根级命令）。

### 📝 步骤 3：填写项目信息

按照提示输入项目名称和项目描述：

```
? 请输入项目名称：my-awesome-app
? 请输入项目概述：一个使用 create-wl-app 创建的现代化前端应用
```

### ⏳ 步骤 4：等待模板下载

模板下载通常只需要**几秒钟**即可完成。

### 📦 步骤 5：进入项目目录

```bash
cd my-awesome-app
```

### 🎯 步骤 6：初始化 Git 仓库

```bash
# 初始化 Git 仓库
git init

# 添加所有文件
git add .

# 提交初始版本
git commit -m "feat: 初始化项目"
```

### 📦 步骤 7：安装依赖

```bash
# 使用 pnpm 安装依赖
pnpm install
```

### 🚀 步骤 8：启动开发服务器

```bash
# 启动开发服务器（毫秒级启动）
pnpm run dev
```

### 🏗️ 步骤 9：构建生产版本

```bash
# 构建生产版本（秒级构建）
pnpm run build
```

## 🎯 项目结构

创建的项目将包含以下核心结构：

### SPA 模板结构

```
my-awesome-app/
├── src/
│   ├── apis/          # 接口定义
│   ├── components/    # 通用组件
│   ├── common/        # 公共工具
│   ├── store/         # 状态管理（Zustand）
│   ├── App.jsx        # 根组件
│   └── main.jsx       # 入口文件
├── eslint.config.mjs  # ESLint 配置
├── vite.config.js     # Vite 配置
└── package.json       # 项目依赖
```

### SSR 模板结构

```
my-awesome-app/
├── src/
│   ├── app 或 pages/  # SSR 路由入口
│   ├── features/      # 业务功能模块
│   ├── shared/        # API、组件、工具与 UI 基础设施
│   ├── server/        # 服务端专属能力
│   └── test/          # 测试工具与 setup
├── tests/e2e/         # Playwright E2E
├── AGENTS.md          # AI Agent 开发约束
├── playwright.config.ts
├── vitest.config.ts
└── package.json       # 项目依赖
```

## 📚 常用命令

| 命令 | 描述 |
|------|------|
| `pnpm run dev` | 启动开发服务器 |
| `pnpm run build` | 构建生产版本 |
| `pnpm run preview` | 预览生产构建 |
| `pnpm run test` | 运行单元与组件测试 |
| `pnpm run test:coverage` | 运行覆盖率门禁 |
| `pnpm run test:component-coverage` | 检查每个组件是否有组件测试 |
| `pnpm run test:e2e` | 运行 Playwright E2E |
| `pnpm run typecheck` | 运行类型检查 |
| `pnpm run lint` | 运行代码规范检查 |

## 🚀 下一步

恭喜你！你已经成功创建了一个使用 create-wl-app 的现代化前端项目。

### 🌟 推荐阅读

- [🎨 脚手架核心](/core/脚手架核心.md) - 了解脚手架的核心功能和技术栈
- [⚛️ React 模板](/core/React模板.md) - 深入了解 React 模板的使用
- [🟢 Vue3 模板](/core/Vue3模板.md) - 深入了解 Vue3 模板的使用
- [📖 Vite 8.0 新特性](/log/2026-01-22.md) - 了解 Vite 8.0 + Rolldown 的强大功能

### 🤝 社区支持

- [GitHub 仓库](https://github.com/whyfail/create-wl-app) - 给我们一个 star 支持
- [Issues](https://github.com/whyfail/create-wl-app/issues) - 报告问题或提出建议

---

🎉 **现在，开始你的现代化前端开发之旅吧！**

🚀 快速开发 | 🎨 优雅设计 | ⚡ 极致性能 | 🔧 开发友好
