# 当前待办

> 更新时间：2026-07-25
> 这里只保留当前健康度、未完成任务和未解决 bug。已完成 Bug 与阶段过程使用 Git 历史追溯；详细目标、切片和验收标准在 `docs/work/backlog/`。

## 健康度

| 检查项 | 状态 | 备注 |
|---|---|---|
| GitHub CI | ⏳ push 后异步执行 | 执行 frozen install、`pnpm test`、共享 Shell 原型计算样式契约和 `pnpm typecheck`，并上传 Shell 截图；agent 不等待普通 push 的 CI |
| Release 门禁 | ⏳ 发版时执行 | `tools\git-auto-release.cmd` 必须等待本地门禁和 GitHub Release 全部成功 |
| Agent 自动验证 | ⛔ 默认禁用 | 普通开发不自动运行；用户主动本地测试或打包时照常运行现有测试和类型检查 |

构建提醒：Prototype / Web 生产构建的 chunk 大小提示和 Vite CJS Node API 弃用提示当前不阻断验证。

## 当前任务

| 编号 | 优先级 | 状态 | 任务 | Backlog | 下一步 |
|---|---|---|---|---|---|
| T1 | P1 | 🟠 进行中 | 配装方案与攻略导入 | [配装方案与攻略导入](work/backlog/T1-loadout-plans-and-guide-import.md) | 已完成原型和页面字段 / action 对照；正在重建配装页面结构，随后接入新本地方案模型、批量应用和 DIM 配装分享链接导入 |
| T2 | P1 | 🟡 待推进 | 仓库推荐与清理工作台 | [仓库推荐与清理工作台](work/backlog/T2-vault-recommendation-and-cleanup-workbench.md) | 统一 DIM wishlist、本地目标、同名对比和清理清单 |
| T3 | P1 | 🟡 待验收 | 商人结构、覆盖与官方获取来源 | [商人结构、覆盖与官方获取来源](work/backlog/T3-vendors-and-drop-sources.md) | 已接入 Vendor Group / 目的地两级目录、持久缓存、启动预热和周期刷新；仄已按周六到、周三走规则过滤离场缓存；下一步验收真实地点覆盖、跨重置边界、Offer 时效、去重和机灵模组 A/B |
| T4 | P3 | 🟡 待推进 | 活动复盘增强 | [活动复盘增强](work/backlog/T4-activity-review-enhancement.md) | 接 PGCR、完成时间推算和副本级趋势 |
| T7 | P1 | 🟡 待推进 | 社区推荐边界收口 | [社区推荐边界收口](work/backlog/T7-architecture-boundary-hardening.md) | Core、Services、App、UI 与平台壳的主边界已完成；下一步将本地社区表、个人知识及 AI/light.gg 缓存和外部调用迁入 Services，Core 只保留规则、DTO、解析和匹配。 |
| T8 | P1 | 🟠 静态原型重建中 | 全应用 UI 还原 | [全应用 UI 还原](work/backlog/T8-full-application-ui-functional-convergence.md) | 已完成全局边界、文字 `Tone + Priority`、对比度、图标、Control 状态、密度、层级和响应式合同；共享 Shell、首页与设置页已验收。账号页已收口为“账号数据 Tab + 角色上下文 + 装备位置对照”工作区：目录使用完整 Tab 语义和键盘模型，角色保持 `ContextSwitcher`，位置行使用直角数据结构，装备对象保留唯一 `ObjectCard` 边框和详情跳转。三原型已完成根节点、详情骨架、Overlay、控件/导航/响应式合同迁移，详情原型共用抽屉关闭模型，所有原型 CSS 的可见字体下限均为 `12px`。下一步逐菜单收敛配装、资料库、商人和仓库，再将已验收的静态原型迁入共享 UI。 |

设置页八个分区的结构收口：账号和资料库宽屏摘要的规则项跨整行；版本记录与操作日志使用连续行分隔；诊断顶部命令、成功/失败状态和失败诊断操作使用统一的右侧控制列；显示时间统一为中文本地格式。下一步是按八个分区逐页做视觉验收。

圆角合同已冻结：摘要矩阵、摘要框与状态框使用直角；独立对象卡为 6px；控件与缩略图为 4px；Chip 与进度为胶囊。首页已按该规则重新标注刷新、周常、周信号、商人摘要和模块状态，只有商人单件装备保留对象卡圆角；下一步进行视觉验收并按同一合同审计其余页面。

AI 辅助栏已重建为对话/任务双视图：宽屏作为停靠辅助栏，窄屏作为完整 Drawer；工具栏、可滚动会话区和固定输入区恢复为三行工作区，后台任务移入任务视图，避免覆盖输入区。下一步对深浅主题和 980px 临界宽度做视觉验收。

## 验证入口

- 普通 push：GitHub CI 异步执行，不在本地重复运行。
- Release：运行 `tools\git-auto-release.cmd` 并等待全部步骤成功。
- 专项排查：仅在用户明确指定时运行对应命令。
