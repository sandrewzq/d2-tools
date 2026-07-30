# 当前待办

> 更新时间：2026-07-30
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
| T1 | P1 | 🟡 待验证 | 本地配装工作台、护甲优化与 DIM 导入 | [任务说明](work/backlog/T1-loadout-plans-and-guide-import.md) | 执行用户要求的本地验证或 CI 验证；通过前不得标记完成 |
| T3 | P1 | 🟡 待验收 | 商人结构、覆盖与官方获取来源 | [任务说明](work/backlog/T3-vendors-and-drop-sources.md) | 验收真实地点覆盖、跨重置边界、Offer 时效、去重和机灵模组 A/B |
| T8 | P1 | 🟠 进行中 | 全应用共享 UI 与视觉收口 | [任务说明](work/backlog/T8-full-application-ui-functional-convergence.md) | 将铁旗活动分类、奖励分组语义、角色挑战和 Vendor 同调/聚焦聚合接入应用并失效旧首页缓存；随后执行 Desktop `light / dark × 1280 / 980 / 760` 实窗验收 |

## Bug 列表

| 编号 | 状态 | 问题 | 范围与处理 | 验证 |
|---|---|---|---|---|
| Bug #1（配置） | 🟡 待验证 | 旧版 `config.json` 的 `ai.provider` 会导致 Desktop 启动失败 | 已在配置读取层兼容迁移到当前 `ai.protocol`，等待后续本地测试或 CI 验证 | 使用仅含旧 `ai.provider` 的本地配置启动 Desktop，确认能正常启动且 AI 状态正确映射 |
| Bug #6（T8 UI：规则冲突） | 🟡 修复待验证 | 武器详情、护甲详情存在非无障碍动画用途的 `!important`，导致视觉来源不唯一 | 已移除 12 处详情样式强制声明；账号区域没有残留。仅保留 `prefers-reduced-motion` 无障碍规则 | 按 [T8 手工验收](work/backlog/T8-full-application-ui-functional-convergence.md) 的 Bug #6 步骤验证 |
| Bug #7（T8 UI：横向溢出） | 🟡 修复待验证 | 主滚动区、装备详情和菜单侧栏以 `overflow-x: hidden` 掩盖超宽布局 | 已移除目标容器的掩盖规则，并为长 ID、URL 和英文名称补充换行 | 按 [T8 手工验收](work/backlog/T8-full-application-ui-functional-convergence.md) 的 Bug #7 步骤验证 |

## 说明

- T1 实现已接入，待验证：配装菜单通过同一本地方案工作台处理当前装备、DIM、攻略、护甲求解和安全应用；游戏内槽位保持 Bungie 官方对象与写操作边界。
- T8 负责已经迁入 `packages/ui` 的共享视觉系统和页面收口；冻结 HTML 已按真实 Bungie API 语义展示铁旗，应用端接线仍待完成。
- React Prototype 已退役；后续视觉链路统一为冻结 HTML 规格、Web 快速预览和 Desktop 真实功能验收。
- 新增 Bug 必须使用全局唯一编号并在本文件中登记。
