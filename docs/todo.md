# 当前待办

> 更新时间：2026-07-10
> 这里只保留当前健康度、未完成任务和未解决 bug。已完成 Bug 与阶段过程使用 Git 历史追溯；详细目标、切片和验收标准在 `docs/work/backlog/`。

## 健康度

| 检查项 | 状态 | 备注 |
|---|---|---|
| `pnpm test` | ✅ 通过 | 行为、架构与测试质量门禁通过 |
| `pnpm test:legacy` | ✅ 报告通过 | 遗留源码护栏只报告，不阻断发布 |
| `pnpm typecheck` | ✅ 通过 | 全仓类型检查通过 |
| `pnpm docs:check` | ✅ 通过 | 文档结构与编码检查通过 |

构建提醒：Prototype 生产构建仍可能提示 chunk 超过 500 kB；Electron mirror 与 Vite CJS Node API 的弃用提示不阻断当前验证。

## 当前任务

| 编号 | 优先级 | 状态 | 任务 | Backlog | 下一步 |
|---|---|---|---|---|---|
| T1 | P1 | 🟡 待推进 | 小日向与 d2-skill 产品级能力 | [总纲](work/backlog/kohinata-d2-skill-product-architecture.md) / [攻略证据工作台](work/backlog/kohinata-guide-evidence-workbench.md) | 攻略解析、账号命中、perk 证据和配装草稿 |
| T2 | P1 | 🟡 待推进 | 仓库推荐与清理工作台 | [仓库推荐与清理工作台](work/backlog/vault-recommendation-and-cleanup-workbench.md) | 统一 DIM wishlist、本地目标、同名对比和清理清单 |
| T3 | P1 | 🟡 待推进 | 小日向日报、商人与掉落查询 | [日报、商人与掉落查询](work/backlog/daily-report-and-drops-assistant.md) / [遗失区域简报](work/backlog/home-lost-sector-briefing-redesign.md) / [每周活动简报](work/backlog/home-weekly-activity-briefing-redesign.md) | 补活动、掉落来源状态、购买判断和仄商人首页摘要 |
| T4 | P1 | 🟡 进行中 | 跨端 UI 壳、可交互原型与桌面视觉收口 | [工作区骨架与样式收口](work/backlog/cross-platform-workspace-style-hardening.md) / [模块深度与跨端 seam 收口](work/backlog/module-depth-and-platform-seams.md) / [桌面视觉与详情打磨](work/backlog/desktop-ui-account-detail-polish.md) | 已移除主菜单标题下的全局横幅位，运行态统一收口到右下角任务中心，完成任务不再进入浮层；后续人工视觉复核，并分批推进模块深度 backlog |
| T5 | P3 | 🟡 待推进 | 活动复盘增强 | [活动复盘增强](work/backlog/activity-review-enhancement.md) | 接 PGCR、完成时间推算和副本级趋势 |
| T6 | P4 | 🟡 待推进 | 桌面发布、更新与迁移体验 | [桌面发布体验](work/backlog/desktop-release-experience.md) | 验证 GitHub Release、更新提示、备份迁移和诊断体验 |

## 暂不优先

| 项目 | 原因 |
|---|---|
| 配装模板使用引导 | 已有能力但引导不足，后续补使用说明 |

## 常用验证

```powershell
npx pnpm@9.15.0 docs:check
npx pnpm@9.15.0 test
npx pnpm@9.15.0 typecheck
```
