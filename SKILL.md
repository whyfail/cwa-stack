---
name: create-project
description: 基于 create-wl-app 的前端项目快速创建工具，支持 React/Vue3，通过管道符实现一键创建。
---

## 触发条件

当用户说以下类似短语时触发：
- "创建一个项目"
- "新建一个项目"
- "初始化一个项目"
- "创建前端项目"
- "启动一个新项目"

## 执行步骤

### 步骤 1：询问项目信息
询问用户以下信息：
1. 项目类型：React 还是 Vue3？（模板名称：`vite-react` 或 `vite-vue3`）
2. 项目名称
3. 项目描述（可选）

### 步骤 2：使用管道符创建项目
根据用户输入的项目类型和名称，使用管道符一次性创建项目：
```bash
# 格式：模板名称\n项目名称\n项目描述（可选）
echo -e "vite-react\nmy-project\n项目描述" | npx create-wl-app create
```

支持的模板类型：
- `vite-react` - React 18 项目
- `vite-vue3` - Vue 3 项目

### 步骤 3：进入项目目录并初始化 Git
```bash
cd <项目名称>
git init
git add .
git commit -m "feat: 初始化项目"
```

### 步骤 4：安装依赖
使用 pnpm 安装依赖（更快更省空间）：
```bash
pnpm install
```

### 步骤 5：启动开发服务器
```bash
pnpm dev
```

### 步骤 6：报告结果
告诉用户：
1. 项目已成功创建
2. 项目路径
3. 开发服务器访问地址（通常是 http://localhost:5173）
4. 下一步可以做的操作

## 注意事项

- 确保已安装 Node.js 20.0.0 或更高版本
- 确保已安装 Git
- 确保已安装 pnpm（如未安装，运行：`npm install -g pnpm`）
- 创建项目前询问用户，避免覆盖现有项目
- 如项目已存在，提示用户是否覆盖
- 安装依赖时如遇到网络问题，可提示用户使用淘宝镜像：`pnpm install --registry=https://registry.npmmirror.com`

## 成功完成标志

- 项目目录已创建
- 依赖已安装完成
- 开发服务器成功启动
- 用户可以访问开发地址查看项目
