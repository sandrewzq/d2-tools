# 当前待办

> 更新时间：2026-08-10
> 本文件只保留当前任务、状态和下一步。详细范围与验收标准由对应 backlog 维护，阶段过程使用 Git 历史追溯。

## 健康度

| 检查项 | 状态 | 备注 |
|---|---|---|
| GitHub CI | ⏳ push 后异步执行 | 执行 frozen install、`pnpm test`、共享 Shell 视觉契约、UI 合同静态门禁和 `pnpm typecheck`；普通 push 不等待结果 |
| Release 门禁 | ⏳ 发版时执行 | 必须通过 `tools\git-auto-release.cmd` 完成本地门禁、GitHub Actions、安装包和 GitHub Release |
| Agent 自动验证 | ⛔ 默认禁用 | 只有用户明确要求本地测试、构建或打包时才执行 |

## 当前任务

| 编号 | 优先级 | 状态 | 任务 | Backlog | 下一步 |
|---|---|---|---|---|---|
| T7 | P1 | 🟡 待验收 | AI 工作台、原生能力与攻略配装工作流 | [任务说明](work/backlog/T7-guides-library-and-derived-targets.md) | 攻略链接、正文和 AI 整理文本已收敛到攻略页唯一入口；确认后优先按当前账号生成方案，配装页只审阅类型化成果。DIM Wishlist 已迁入仓库“目标与匹配”的低频操作，设置不再承载业务导入，自定义 Hash / JSON / CSV 规则仅保留遗留兼容读取。下一步使用真实账号和 Desktop 实窗验收攻略导入、要求确认、账号适配、配装交接、Wishlist 导入/替换/移除、遗留规则提示、目标追溯、Armor 重算、方案保存及安全执行链路；本轮产品入口调整尚未运行本地自动化验证 |

## 说明

- UI 只维护 `packages/ui` 的共享产品实现；Markdown 合同记录稳定约束，Web 用于快速预览，Desktop 用于真实功能验收。
- UI 合同静态门禁覆盖稳定标记、表面枚举、排版、层级、菜单主题色和选中态方向线，避免菜单实现重新取得共享视觉职责。
- 新增 Bug 必须使用全局唯一编号并在本文件中登记。
