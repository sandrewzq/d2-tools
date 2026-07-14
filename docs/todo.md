# 当前待办

> 更新时间：2026-07-14
> 这里只保留当前健康度、未完成任务和未解决 bug。已完成 Bug 与阶段过程使用 Git 历史追溯；详细目标、切片和验收标准在 `docs/work/backlog/`。

## 健康度

| 检查项 | 状态 | 备注 |
|---|---|---|
| GitHub CI | ⏳ push 后异步执行 | 执行 frozen install、`pnpm test` 和 `pnpm typecheck`；agent 不等待普通 push 的 CI |
| Release 门禁 | ⏳ 发版时执行 | `tools\git-auto-release.cmd` 必须等待本地门禁和 GitHub Release 全部成功 |
| Agent 自动验证 | ⛔ 默认禁用 | 普通开发不自动运行；用户主动本地测试或打包时照常运行现有测试和类型检查 |

构建提醒：Prototype 生产构建仍可能提示 chunk 超过 500 kB；Electron mirror 与 Vite CJS Node API 的弃用提示不阻断当前验证。

开发验证策略：本地 vibecoding 到普通提交阶段，agent 默认不自动运行验证，也不新增普通功能测试；用户主动要求本地测试、类型检查或打包时照常执行。普通 push 交给 GitHub CI 异步验证；Release 使用 `tools\git-auto-release.cmd` 并等待全部门禁成功。

测试资产：当前共 130 个测试文件，其中行为层 116 个、架构层 14 个、遗留层 0 个。遗留源码字符串测试已全部删除，混合测试只保留真实行为部分。默认禁止新增测试，仅严重 Bug、OAuth、IPC、数据写入、发布流程和关键架构边界允许增加最小行为覆盖。

## 当前任务

| 编号 | 优先级 | 状态 | 任务 | Backlog | 下一步 |
|---|---|---|---|---|---|
| T1 | P1 | 🟡 待推进 | 小日向与 d2-skill 产品级能力 | [总纲](work/backlog/kohinata-d2-skill-product-architecture.md) / [攻略证据工作台](work/backlog/kohinata-guide-evidence-workbench.md) | 攻略解析、账号命中、perk 证据和配装草稿 |
| T2 | P1 | 🟡 待推进 | 仓库推荐与清理工作台 | [仓库推荐与清理工作台](work/backlog/vault-recommendation-and-cleanup-workbench.md) | 统一 DIM wishlist、本地目标、同名对比和清理清单 |
| T3 | P1 | 🟡 进行中 | 首页本周世界简报、商人与掉落查询 | [本周世界简报重设计](work/backlog/home-weekly-world-briefing-redesign.md) / [日报、商人与掉落查询](work/backlog/daily-report-and-drops-assistant.md) / [商人菜单仄纵向切片](work/backlog/vendors-menu-xur-vertical-slice.md) / [每周活动简报](work/backlog/home-weekly-activity-briefing-redesign.md) | 商人页已改为动态 `contentSections` 纵向结构；仄已接入 `TOWER_NINE_OFFERS`、`TOWER_NINE_GEAR`、39 个售卖条目、Bungie 分类栏位、真实声望进度和等级奖励，正式共享 UI 已统一为“商人一级标题、库存二级区块、分类三级栏位”的层级，刷新时间按运行设备当前时区本地化，子商人不进入左侧目录；商人物品详情已改为使用资料库规范化搜索结果和同一个 `LibraryDefinitionDialog`，售卖信息仅作为详情内上下文。下一步验收机灵模组 A/B，再逐个分析其他商人的子库存与声望结构，不复用仄的业务规则 |
| T4 | P1 | 🟡 进行中 | 跨端 UI 壳、可交互原型与桌面视觉收口 | [工作区骨架与样式收口](work/backlog/cross-platform-workspace-style-hardening.md) / [模块深度与跨端 seam 收口](work/backlog/module-depth-and-platform-seams.md) / [桌面视觉与详情打磨](work/backlog/desktop-ui-account-detail-polish.md) | 已移除主菜单标题下的全局横幅位，运行态统一收口到右下角任务中心，完成任务不再进入浮层；后续人工视觉复核，并分批推进模块深度 backlog |
| T5 | P3 | 🟡 待推进 | 活动复盘增强 | [活动复盘增强](work/backlog/activity-review-enhancement.md) | 接 PGCR、完成时间推算和副本级趋势 |
| T6 | P4 | 🟡 待推进 | 桌面发布、更新与迁移体验 | [桌面发布体验](work/backlog/desktop-release-experience.md) | 验证 GitHub Release、更新提示、备份迁移和诊断体验 |
| T7 | P1 | 🟡 待 CI | 资料库异域护甲定义详情修复 | [异域护甲定义详情](work/backlog/library-exotic-armor-definition-detail.md) / [实施计划](work/backlog/library-exotic-armor-definition-detail-implementation-plan.md) | 代码已实现：展示异域固有特性，护甲不再生成武器结构或重复模组池；不展示六维实例 Roll，等待普通 push 后由 CI 验证 |
| T8 | P1 | 🟡 待 CI | 资料库自动更新与重试机制收口 | - | 已统一更新/修复单任务编排并拆除双层重试，补齐请求超时、4 路有限并发、组件进度、磁盘预检、语言立即检查、跨天检查、损坏缓存降级、版本/语言/组件完整性、轻量状态侧车、staging/backup 恢复清理和失败状态反馈；后续仍需设计运行中取消、跨应用实例文件锁与更深记录级校验，等待普通 push 后由 CI 验证 |

## 暂不优先

| 项目 | 原因 |
|---|---|
| 配装模板使用引导 | 已有能力但引导不足，后续补使用说明 |

## 验证入口

- 普通 push：GitHub CI 异步执行，不在本地重复运行。
- Release：运行 `tools\git-auto-release.cmd` 并等待全部步骤成功。
- 专项排查：仅在用户明确指定时运行对应命令。
