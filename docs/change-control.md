# 变更控制与回归门禁

本文件用于约束 AEPI03-Stardust Memory 的新需求、版本修正和高风险改动。目标是：新功能可以持续增加，但不能破坏已经可用的本地版本、局域网版本、API 代理、生图流程和 AI生成提示词流程。

## 变更原则

- 默认保护现有功能；任何新需求都必须可控、可回退、可验证。
- 高风险新功能必须默认可开关；未配置时不能导致本地版本打不开。
- 修改前先读相关文件和当前规则，遵循现有结构，不做无关重构。
- 不要回滚用户未要求回滚的改动。
- 不允许把真实密钥写进代码、文档、提交记录、前端文件或截图。
- 本地运行数据和私密配置属于用户环境，不应被删除或公开。

## 需求登记模板

每个新需求或版本修正开始前，先明确以下内容：

```text
需求名称：
目标版本：
变更类型：新功能 / 修复 / 文案 / 部署 / 安全 / API / 数据
影响范围：前端 / 本机代理 / 启动脚本 / 数据库 / NAS / GitHub / 部署
风险级别：低 / 中 / 高
是否涉及密钥：是 / 否
是否涉及平台 API：是 / 否
是否涉及数据库或 NAS：是 / 否
是否影响局域网访问：是 / 否
是否需要数据迁移：是 / 否
回退方式：
验收方式：
```

## 风险分级

低风险：

- 文案调整。
- 轻量样式调整。
- 不改变业务逻辑的小 UI 调整。

中风险：

- 提示词规则调整。
- 配置项调整。
- 前端数据结构调整。
- 历史记录、设置、任务展示相关改动。

高风险：

- 钉钉登录、权限、会话、用户态。
- 平台 API、API Key、额度、审计、限流。
- 本机 API 代理 `scripts/local-api-proxy.mjs`。
- 启动、停止、配置 BAT。
- 数据库、NAS、文件存储。
- 公开发布、GitHub Pages、备份、发版脚本。

## 高风险功能规则

- 必须提供开关或配置默认值。
- 未配置外部服务时，不能导致本地 `start-stardust-memory.bat` 无法启动。
- 未配置外部服务时，不能破坏现有生图、AI生成提示词、Listing/A+ 信息拆解的本地可用路径。
- 不能破坏以下基础地址：
  - `http://127.0.0.1:5173/`
  - `http://192.168.110.119:5173/`
  - `http://127.0.0.1:3100`
- 修改 `scripts/local-api-proxy.mjs` 后必须重启 `3100` 代理，否则新接口不会生效。
- 钉钉登录、平台 API 这类功能应先按“可关闭、可回退、可单独验证”的方式接入。
- 新增认证或 API 后端时，密钥只允许存在服务端私密环境变量或本地 `.env.local`，不允许进入开源仓库。
- 如果开启鉴权，不能只依赖前端页面拦截；关键后端接口也必须校验登录态或 API Key。

## 必跑回归清单

按变更风险选择执行；高风险改动必须覆盖全部相关项。

- `cmd.exe /c npm run build`
- 相关单测，例如：
  - `cmd.exe /c npm test -- src\store.test.ts`
  - `cmd.exe /c npm test -- src\lib\listingPlanner.test.ts`
  - `cmd.exe /c npm test -- src\lib\tokenUsage.test.ts`
- 本地前端：
  - `http://127.0.0.1:5173/`
- 局域网前端：
  - `http://192.168.110.119:5173/`
- 本机代理统计：
  - `http://127.0.0.1:3100/__duncan/generation-stats`
- 生图流程：
  - 粘贴提示词。
  - 上传参考图。
  - 调整尺寸、质量、格式。
  - 成功生成并写入历史。
- AI生成提示词流程：
  - Listing 信息拆解。
  - A+ 信息拆解。
  - 适用人群和使用场景缺失时自动推断。
- 设置与安全：
  - API Key 不出现在代码、日志、截图、README、CHANGELOG 或提交 diff 中。
  - `.env.local` 未被 Git 跟踪。

## 发布前检查

- `.env.local`、真实 API Key、钉钉 secret、数据库密码、NAS 密码未进入 Git。
- `package.json`、`package-lock.json`、`src/changelog.ts` 已按版本策略同步。
- 到版本节点时已执行：
  - `cmd.exe /c npm run backup:version`
- 备份不包含：
  - `.env.local`
  - 真实密钥
  - 日志
  - pid 文件
  - `node_modules`
  - 构建缓存
  - Git 内部文件
- GitHub 推送前执行 secret scan，至少覆盖常见模式：
  - OpenAI/DeepSeek/API Key。
  - GitHub token。
  - SSH/private key。
  - PostgreSQL/NAS 明文密码。

## 钉钉登录与平台 API 默认要求

- 钉钉登录、平台 API、数据库、NAS 都按高风险变更处理。
- 新功能必须先设计为可关闭；默认不得破坏本地启动和已有工作流。
- 推荐公开配置只包含非密钥项，例如：

```env
VITE_AUTH_REQUIRED=false
VITE_AUTH_BASE_URL=https://ai.artcloudwork.com
```

- 钉钉 appSecret、平台 API Key、JWT 私钥、session secret、数据库密码、NAS 密码必须只在服务端或本地私密环境中配置。
- 平台 API 对外能力必须有鉴权、权限范围、限流、额度和审计日志。

