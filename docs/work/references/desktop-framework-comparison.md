# 桌面框架选型调研

> 2026-06-24 · 分析对象：Codeg、DBX、Tabularis、GoNavi、WhoDB、Tabby、Chat2DB、DbGate

## 竞品技术栈总览

| 工具 | 桌面框架 | 后端 | 前端 | 体积 |
|---|---|---|---|---|
| Codeg | Tauri 2 | Rust | Next.js + React | 几十 MB |
| DBX | Tauri 2 | Rust | Vue 3 | **15 MB** |
| Tabularis | Tauri 2 | Rust + SQLx | React 19 + TypeScript + Tailwind | 几十 MB |
| GoNavi | Wails v2 | Go | React + Vite | **10 MB** |
| WhoDB | Wails v2 | Go | React + Vite | < 50 MB |
| Tabby | Electron | Node.js | Angular | 上百 MB |
| Chat2DB | Electron | Node.js | React | 上百 MB |
| DbGate | Electron | Node.js + Express | Svelte | 上百 MB |

结论：

- 8 个样本中，Tauri / Wails 方案共 5 个，Electron 方案 3 个。
- 新增样本后，Electron 并不是只存在于老牌工具里：DbGate 仍是 Electron，并且同时提供桌面、Web、Docker 和 NPM 使用形态。
- 新一代轻量桌面工具更偏向 Tauri / Wails。
- 对 d2-tools 来说，迁移收益主要来自包体、启动速度和内存；迁移成本主要来自 `packages/core` 的 TypeScript 业务逻辑是否要改写到 Go / Rust。

## Tauri 2 vs Wails v2 vs Electron

| 维度 | Tauri 2 | Wails v2 | Electron（d2-tools 当前） |
|---|---|---|---|
| 后端语言 | Rust | Go | Node.js |
| 典型体积 | 10-50 MB | 10-50 MB | 150+ MB |
| 启动速度 | 快 | 快 | 需等 Chromium |
| 内存占用 | 低（复用系统 WebView） | 低（复用系统 WebView） | 高（捆绑 Chromium） |
| 学习成本 | 高（Rust 所有权/生命周期） | 中（Go 语法简单） | 低（JS/TS 全栈） |
| 编译速度 | 慢（首次几分钟） | 快（秒级） | 快 |
| 生态 | 官方插件丰富（updater/dialog/fs） | 社区插件为主 | 成熟但重 |
| 前端 | 任意 Web 前端 | 任意 Web 前端 | 任意 Web 前端 |
| 适合场景 | 安全、轻量、跨平台、Rust 可接受 | 轻量、IO 密集、Go 团队友好 | 快速迭代、Web/Node 生态复用 |

## Tauri 2 vs Wails v2 核心区别

- **Tauri 2**：Rust 后端，适合 CPU 密集 / 极致性能 / 系统级安全场景
- **Wails v2**：Go 后端，适合 IO 密集型 / 快速开发 / 低学习成本场景

## 新增样本观察

### Tauri 2：Tabularis

Tabularis 是 Tauri v2 的新样本。它的技术栈写得很明确：

- Frontend：React 19、TypeScript、Tailwind CSS v4
- Backend：Rust、Tauri v2、SQLx

它还内置 AI 和 MCP Server，说明 Tauri 并不妨碍复杂桌面工具做 AI / agent 集成。但 Tabularis 的后端数据访问、查询执行和插件体系都已经在 Rust 侧，和 d2-tools 当前 TypeScript core 的情况不同。

### Wails v2：WhoDB

WhoDB 复核后仍归类为 Wails v2 + Go + React / Vite。仓库中 `desktop-ce/wails.json` 使用 Wails v2 schema，`core/go.mod` 是 Go 后端，`frontend/package.json` 使用 React、Vite 和 TypeScript。

它和 d2-tools 的相似点是：都偏本地工具、数据浏览、AI 辅助、连接外部数据源。区别是 WhoDB 的核心业务已经在 Go，迁移到 Wails 的成本天然低；d2-tools 的核心业务在 TypeScript。

### Electron：DbGate

DbGate 是继续使用 Electron 的强样本。它的定位不是单纯桌面壳，而是同时支持桌面应用、Web、Docker、NPM 包和插件生态。它的 README 明确列出：

- Frontend：Svelte
- Backend：Node.js、Express.js、数据库驱动
- App：Electron

这说明：如果产品需要最大化复用 Node / Web / Docker / 插件生态，Electron 的重量可以被生态收益抵消。d2-tools 当前也有类似倾向：`packages/core` 已经是 TypeScript，`packages/http` 已经是本地 HTTP / 工具接口层。

## d2-tools 迁移建议

短期：Electron 功能上够用，当前优先把产品做稳（Bug、UX、功能），不急于迁移。

长期如要追求更轻更快的体验：

- **优先考虑 Wails v2 + Go**：Go 处理 Bungie API JSON、文件 IO、Manifest 解析毫不费力；编译快、语法简单；核心业务逻辑（manifest、oauth、配置管理）改写成本低
- **次选 Tauri 2 + Rust**：生态更成熟、示例更多，但 Rust 门槛高，开发效率不如 Go

更新后的建议不变，但理由更清楚：

1. **现在继续 Electron**：当前最大风险是产品能力和 UX 还没闭环，不是包体大小。
2. **保持业务层可迁移**：继续把 Bungie、Manifest、AI、装备分析、配置和本地数据放在 `packages/core` / `packages/http`，Electron 只做壳、IPC、窗口、更新和系统集成。
3. **长期迁移优先 Wails**：如果未来必须显著降低包体和内存，Wails + Go 是比 Tauri + Rust 更现实的迁移目标。
4. **避免为了轻量而重写过早**：Tauri / Wails 的收益要等产品功能稳定后才值得兑现；现在重写会打断 AI 助手、仓库、账号页、愿望单、配装等核心功能推进。

## 参考来源

- DbGate：`https://github.com/dbgate/dbgate`
- WhoDB：`https://github.com/clidey/whodb`
- Tabularis：`https://github.com/TabularisDB/tabularis`
