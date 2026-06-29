# 当前待办

> 更新时间：2026-06-29
> 这是唯一当前待办目录。这里只保留状态、优先级和 backlog 入口；完整需求、切片、验收标准放在 `docs/work/backlog/`。

## 健康度

| 检查项 | 状态 | 备注 |
|---|---|---|
| `pnpm test` | ✅ 通过 | 139 文件 / 474 测试，本次全量验证通过 |
| `pnpm typecheck` | ✅ 通过 | 本次全量验证通过 |
| `pnpm docs:check` | ✅ 通过 | 本次文档检查通过 |

> 构建提醒：Vite 提示 `DiagnosticsPanel.tsx` 和 `VaultPanel.tsx` 同时被静态和动态导入，不阻塞构建。npm 提示 `.npmrc` 中 Electron mirror 配置未来可能不被支持，不阻塞构建。

## Bug

| 状态 | 标题 | 备注 |
|---|---|---|
| ✅ 已修复 | Bug #1 桌面框架：账号读取未进入后台任务 | 账号基础读取、最近活动和社区匹配已接入后台任务；账号首屏改为轻量 workspace，派生分析延后刷新 |
| ✅ 已修复 | Bug #2 桌面框架：开发环境应用版本显示 Electron 版本 | 更新状态的当前版本改为读取桌面包版本，开发环境不再显示 Electron 版本号 |
| ✅ 已修复 | Bug #3 桌面框架：外壳布局仍像网页侧栏 | 外壳改为桌面标题栏、紧凑导航 rail 和顶部状态条 |
| ✅ 已修复 | Bug #4 首页：账号状态只显示登录凭据，不显示账号读取失败 | 首页状态卡已合并账号读取错误、读取中和已读取状态，失败时显示重试读取 |
| ✅ 已修复 | Bug #5 首页：新外壳下工作台两列和状态卡样式混乱 | 首页工作台收窄右侧状态列，1180px 以下回落单列；状态卡按钮改为紧凑操作 |
| ✅ 已修复 | Bug #6 桌面框架：Bungie 登录端口占用时异常原样暴露并可重复触发 | 登录 IPC 已增加单飞保护；回调端口占用时显示中文处理建议；账号页会清洗 Electron IPC 包装错误 |
| ✅ 已修复 | Bug #7 桌面框架：资料库更新和账号读取并行时后台任务显示不足且账号页卡顿 | 最近活动任务已拆成独立后台类型；全局后台任务 banner 会提示多个运行中任务；账号页背包槽位改为首屏限量渲染并 lazy-load 图标 |
| ✅ 已修复 | Bug #8 桌面视觉：首页、AI 侧栏、账号目录和仓库标签细节不够成熟 | 已隐藏 Windows 原生标题栏；删除首页无效常用入口；数据源矩阵固定响应式列；状态卡操作收紧；AI 会话列表、账号目录和未标记标签完成低干扰打磨 |
| ✅ 已修复 | Bug #9 桌面外壳：页面全局滚动导致标题栏不固定且滚动条跑到最右侧 | 外壳改为固定视口；主工作区和 AI 侧栏各自内部滚动；滚动条改为暗色细条；select 下拉控件统一成桌面暗色样式 |

## 当前任务目录

| 编号 | 优先级 | 状态 | 任务 | Backlog | 下一步 |
|---|---|---|---|---|---|
| T1 | P1 | 🟡 待推进 | 小日向与 d2-skill 产品级能力 | [总纲](work/backlog/kohinata-d2-skill-product-architecture.md) / [攻略证据工作台](work/backlog/kohinata-guide-evidence-workbench.md) | 先做攻略解析、账号命中、perk 证据和配装草稿 |
| T2 | P1 | ✅ 已完成 | 产品级桌面外壳、更新与后台任务 | 已合并到 [开发说明](development.md) | 已完成后台任务中心、应用更新、资料库版本检查、自动更新、全局状态入口、设置页状态和资料库搜索阻断 |
| T3 | P1 | 🟡 待推进 | 仓库推荐与清理工作台 | [仓库推荐与清理工作台](work/backlog/vault-recommendation-and-cleanup-workbench.md) | 统一 DIM wishlist、本地目标、同名对比和清理清单；推荐数据只支持用户导入，不默认内置未授权社区数据 |
| T4 | P1 | 🟡 待推进 | 小日向日报、商人与掉落查询 | [日报、商人与掉落查询](work/backlog/daily-report-and-drops-assistant.md) | 只展示可确认数据，先补商人、活动和掉落来源状态 |
| T5 | P1 | 🟡 待推进 | 桌面视觉、账号、仓库、资料库与装备详情打磨 | [首页与全局外壳 v4](work/backlog/desktop-home-global-shell-v4.md) / [账号页 A2](work/backlog/desktop-account-page-a2-layout.md) / [仓库页 Tab v2](work/backlog/desktop-vault-tabs-v2-layout.md) / [资料库页 v1](work/backlog/desktop-library-reference-v1-layout.md) / [桌面视觉与详情打磨](work/backlog/desktop-ui-account-detail-polish.md) | 已确认首页与全局外壳 v4、账号页 A2、仓库页 Tab v2、资料库页 v1；配装页本轮先不动；护甲六维筛选和后续护甲属性优化器并入本任务 |
| T6 | P2 | ✅ 已完成 | 架构维护与边界防回退 | 已合并到 [开发说明](development.md) | 已完成 page metadata 共享、详情缓存上限、Manifest 状态共享 hook、services adapter 去重和边界测试 |
| T7 | P3 | 🟡 待推进 | 活动复盘增强 | [活动复盘增强](work/backlog/activity-review-enhancement.md) | 后续接 PGCR、完成时间推算和副本级趋势 |
| T8 | P4 | 🟡 待推进 | 桌面发布、更新与迁移体验 | [桌面发布体验](work/backlog/desktop-release-experience.md) | 发布、安装、迁移继续保留；应用更新状态迁入产品级外壳任务 |

## 暂不优先

| 项目 | 状态 | 原因 |
|---|---|---|
| 配装模板使用引导 | 暂缓 | 已有能力但引导不足，后续补使用说明 |

## 验证命令

```powershell
npx pnpm@9.15.0 docs:check
npx pnpm@9.15.0 test
npx pnpm@9.15.0 typecheck
```
