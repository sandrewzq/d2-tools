# 当前待办

> 更新时间：2026-07-31
> 本文件只保留当前任务、状态和下一步。详细范围与验收标准由对应 backlog 维护，阶段过程使用 Git 历史追溯。

## 健康度

| 检查项 | 状态 | 备注 |
|---|---|---|
| GitHub CI | ⏳ push 后异步执行 | 执行 frozen install、`pnpm test`、共享 Shell 视觉契约和 `pnpm typecheck`；普通 push 不等待结果 |
| Release 门禁 | ⏳ 发版时执行 | 必须通过 `tools\git-auto-release.cmd` 完成本地门禁、GitHub Actions、安装包和 GitHub Release |
| Agent 自动验证 | ⛔ 默认禁用 | 只有用户明确要求本地测试、构建或打包时才执行 |

## 当前任务

| 编号 | 优先级 | 状态 | 任务 | Backlog | 下一步 |
|---|---|---|---|---|---|
| T3 | P1 | 🟡 待验收 | 商人结构、覆盖与官方获取来源 | [任务说明](work/backlog/T3-vendors-and-drop-sources.md) | 验收真实地点覆盖、跨重置边界、Offer 时效、去重和机灵模组 A/B |

## Bug 列表

当前没有单独跟踪的未完成 Bug。

## 说明

- UI 只维护 `packages/ui` 的共享产品实现；Markdown 合同记录稳定约束，Web 用于快速预览，Desktop 用于真实功能验收。
- 新增 Bug 必须使用全局唯一编号并在本文件中登记。
