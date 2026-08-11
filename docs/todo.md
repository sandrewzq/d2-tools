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
| T7 | P1 | 🟡 待验收 | AI 工作台、原生能力与攻略配装工作流 | [任务说明](work/backlog/T7-guides-library-and-derived-targets.md) | 核心能力、攻略/目标/Armor/配装交接、派生关系、安全执行和验证链路已接入。产品层已补齐推荐来源职责：DIM Wishlist 与自定义推荐规则归设置页低频管理，仓库“目标与推荐”突出当前账号命中装备、组合、模式和实际来源，多本地来源统一聚合且不触发 AI 批量扫描。`pnpm test` 与 `pnpm typecheck` 已通过。下一步使用真实账号和 Desktop 实窗验收攻略确认、候选交接、目标追溯、Armor 重算提示、方案保存与删除关系清理、发布前槽位变化零写入、完整 trace ID、发布后槽位实例核对，以及推荐来源文件导入/替换/移除、仓库命中刷新和命中装备打开；`guide_extraction_patch` 继续作为可选增强搁置 |

## 说明

- UI 只维护 `packages/ui` 的共享产品实现；Markdown 合同记录稳定约束，Web 用于快速预览，Desktop 用于真实功能验收。
- UI 合同静态门禁覆盖稳定标记、表面枚举、排版、层级、菜单主题色和选中态方向线，避免菜单实现重新取得共享视觉职责。
- 新增 Bug 必须使用全局唯一编号并在本文件中登记。
