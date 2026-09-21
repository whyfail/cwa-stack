# 全栈架构说明

## 组合来源

本项目由 cwa-stack 以预设 `{{{ preset }}}` 动态组合生成：前端模板 `{{{ frontendTemplate }}}` 装配在 `apps/web`，后端模板 `{{{ backendTemplate }}}` 装配在 `apps/api`。两套子项目均为独立模板原样生成，组合器未复制或派生新的模板仓库，因此升级需分别跟踪各模板上游。

## 运行拓扑

```
浏览器 ──HTTP──▶ Web 开发服务器（:{{{ webPort }}})
                    │  /api 代理（SPA 直通；SSR 经 BFF 会话 API）
                    ▼
              Spring Boot API（:8080）──▶ MySQL（:3306）
                    │                      Redis（:6379，会话存储）
                    ▼
              Management（:9090，readiness/指标）
```

- SPA：浏览器直接请求 `/api/v1/**`，开发代理与生产网关均按 `/api` 前缀直通转发，不改写路径。
- SSR：浏览器只访问 BFF 会话 API，token 仅存在于 HttpOnly Cookie 与服务端上下文。
- 契约唯一来源：`apps/api/openapi.yaml`；前端类型/Client 由该契约生成至 `apps/web/src/shared/api/generated`。

## 认证流

1. 登录：`POST /api/v1/login`（username/password/remember）→ 顶层 `token/tokenType/expiresAt/user`。
2. SPA：token 存于本地会话，后续请求带 `Authorization: Bearer`；401 清理会话并跳登录页。
3. SSR：BFF 登录后写 HttpOnly Cookie（`Max-Age ≤ expiresAt`），服务端从 Cookie 转 Bearer 调用后端，浏览器不可读取 token。
4. 错误：Problem Details 顶层 `code/msg/requestId`。
