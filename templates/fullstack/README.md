# {{{ name }}} 全栈项目

由 create-wl-app 组合创建（预设：`{{{ preset }}}`），前端位于 `apps/web`，Spring Boot 后端位于 `apps/api`。

## 常用命令

| 命令 | 说明 |
| --- | --- |
| `pnpm run setup` | 环境检查、安装前端依赖、生成根级 `.env`、生成 OpenAPI Client |
| `pnpm run dev` | 启动 MySQL/Redis（compose）、Spring Boot 与前端开发服务器 |
| `pnpm run verify` | 全栈验证：静态检查、双端测试与构建、真实登录 E2E |
| `pnpm run doctor` | 只读环境诊断（版本、端口、依赖服务、契约漂移） |
| `pnpm run api:generate` | 依据 `apps/api/openapi.yaml` 重新生成前端 API Client |

## 端口基线

| 服务 | 端口 |
| --- | ---: |
| Web（{{{ frontendTemplate }}}） | {{{ webPort }}} |
| API | 8080 |
| Management | 9090 |

## 结构

```
apps/web/                  # 前端模板（独立模板原样组合，未复制源码）
apps/api/                  # Spring Boot 后端（openapi.yaml 为契约唯一来源）
docs/architecture.md       # 全栈依赖关系、端口与认证流
docs/development.md        # 启动、验证与排错说明
cwa.config.json            # 机器可读工程清单（AI Agent 入口）
```

本仓库是单一 Git 仓库；`apps/` 下的子项目不携带各自的 `.git`。
