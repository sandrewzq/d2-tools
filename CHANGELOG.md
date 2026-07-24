# 更新日志

这个项目使用面向玩家的更新日志。这里优先记录”玩家能感知到什么变化”，而不是逐条展开内部实现细节。

## Unreleased

### 中文

#### 新增

- 新增统一的武器与护甲详情工作区：可查看来源、Perk、属性、同名装备与可执行操作，并从仓库、资料库和商人入口直接打开。
- 首页仄商人模块支持展示完整八件异域轮换商品，并可直接打开对应装备详情。

#### 改进

- 首页、账号、仓库、配装、资料库、商人和设置页统一采用共享产品界面与响应式视觉规格，Prototype、Web 和 Desktop 保持同一页面结构。
- 商人页补齐地点、商品分类、时效和装备详情入口；仄按周六到访、周三离场的窗口过滤过期库存。
- 资料库运行时继续收口为 SQLite 查询与后台任务，减少大资料读取对桌面首屏和主进程的影响。

#### 修复

- 修复装备详情首次打开时的加载衔接、真实写入后的状态刷新，以及商人和首页之间的库存详情跳转。
- 修复跨角色库存、同名装备比较和轮换活动在共享页面中的信息缺失或重复展示。

#### 工程

- 清理未接入的旧 Desktop 页面、仓库桥接层和过期首页缓存，收口 Core 与 Services 的运行时边界。

### English

#### Added

- Added a unified weapon and armor detail workspace with sources, perks, stats, same-name items, and available actions, available directly from Vault, Library, and Vendors.
- Added the full eight-item Xur Exotic rotation to Home, with direct links to each item detail.

#### Improved

- Unified Home, Account, Vault, Loadouts, Library, Vendors, and Settings around the shared product UI and responsive visual specification across Prototype, Web, and Desktop.
- Expanded Vendors with location, offer grouping, availability windows, and item-detail entry points; Xur now filters expired inventory using the Saturday-arrival and Wednesday-departure window.
- Continued the Game Data runtime migration to SQLite queries and background tasks to reduce large data reads on the Desktop startup path and main process.

#### Fixed

- Fixed first-open detail loading, state refresh after real item writes, and inventory-detail navigation between Vendors and Home.
- Fixed missing or duplicated information for cross-character inventory, same-name comparison, and rotating activities in shared pages.

#### Engineering

- Removed unused legacy Desktop pages, Vault bridge layers, and the obsolete Home cache while tightening the Core and Services runtime boundary.

## 0.0.13 - 2026-07-10

### 中文

#### 新增

- 首页新增独立的每周活动简报，展示宗师先锋警戒、轮换突袭、轮换地牢和仄商人等重点信息，不再从每日摘要中猜测周常内容。
- 遗失区域简报补充目的地、勇士、护盾、威胁、专家单人奖励和大师单人奖励，并保留最多 9 个可读世界遗失区域。
- 资料库同名装备结果新增已核验版本、官方来源提示和当前公开渠道，帮助区分复刻、赛季及当前可获取状态。

#### 改进

- 桌面窗口默认尺寸调整为 1920×1080，首次打开即可获得更完整的工作区视野。
- 首页、账号、仓库、配装、资料库、商人和设置页统一通过共享 ViewModel 输出；Prototype 与 Web 的 mock 数据迁入 FixtureRuntime，减少多端页面分叉。
- 资料库装备定义详情重新整理信息密度，移除无法可靠帮助判断版本的重复提示、Perk 列数和实例级噪音。

#### 修复

- 修复 Prototype / Web 可能把 Node 本地模块打进浏览器包的问题，避免启动时报 `node:path`、`node:fs` externalized 相关错误。
- 修复 Bungie 公共里程碑只有一条遗失区域时覆盖完整世界遗失区域列表的问题。
- 修复需求变化后旧源码字符串断言误拦截 CI 和 Release 的问题；最高光等操作反馈改由真实共享 UI 渲染测试覆盖。
- 发布脚本现在会在 commit、push 和 tag 前运行与 GitHub 一致的本地门禁，失败时保留完整原因并等待确认，不再推送已知无法发布的代码。

#### 工程

- 测试拆分为行为、架构和遗留三层。行为与架构测试阻断发布，59 个旧源码字符串测试只报告；质量门禁禁止继续新增匹配变量名、class、HTML 或 CSS 的普通功能测试。
- `@d2-tools/services` 根入口恢复为浏览器安全入口；本地配置、OAuth callback、token store、Manifest cache 等 Node-only adapter 只能通过明确 subpath 在 Desktop 主进程或 worker 中使用。
- 新增跨端包边界、renderer 隔离、发布契约和测试质量护栏；本地发布脚本、GitHub CI 与 Release workflow 使用同一套测试和类型检查门禁。

### English

#### Added

- Added a dedicated weekly activity briefing for Grandmaster alerts, rotating raids, rotating dungeons, and Xur instead of inferring weekly data from the daily summary.
- Expanded Lost Sector briefings with destination, champions, shields, threat, solo Legend rewards, solo Master rewards, and up to nine readable world Lost Sectors.
- Added verified release information, official source hints, and current public availability to same-name Library results.

#### Improved

- Changed the default desktop window size to 1920×1080 for a fuller workspace on first launch.
- Routed Home, Account, Vault, Loadouts, Library, Vendors, and Settings through shared ViewModels, while moving Prototype and Web mock data into FixtureRuntime modules.
- Simplified Library definition details by removing duplicated version hints, unreliable perk-column metadata, and instance-only noise.

#### Fixed

- Fixed Prototype and Web builds accidentally pulling Node-only modules into browser bundles, preventing `node:path` and `node:fs` externalization errors at startup.
- Fixed a single Bungie milestone Lost Sector from replacing the complete world Lost Sector list.
- Fixed stale source-string assertions blocking CI and Release after requirements changed; highest-power action feedback is now covered by a real shared UI rendering test.
- Updated the release script to run the same local gate as GitHub before commit, push, or tag creation, preserving the full failure reason and waiting for confirmation when validation fails.

#### Engineering

- Split tests into behavior, architecture, and legacy layers. Behavior and architecture tests block releases, while 59 legacy source-string test files are reported separately; a quality gate prevents new tests from matching implementation names, classes, HTML, or CSS.
- Restored a browser-safe `@d2-tools/services` root entry and moved Node-only configuration, OAuth, token storage, and Manifest cache adapters behind explicit Desktop-only subpaths.
- Added cross-platform package, renderer isolation, release contract, and test-quality guards. Local release, GitHub CI, and the Release workflow now use the same test and typecheck gates.

## 0.0.12 - 2026-07-06

### 工程

- chore: sync local changes
- chore: sync local changes
- chore: sync local changes
- chore: sync local changes

## 0.0.11 - 2026-07-03

### 工程

- chore: sync local changes
- chore: sync local changes
- chore: sync local changes
- chore: sync local changes
- chore: sync local changes
- chore: sync local changes
- feat: localize prototype shell fallback views
- test: sync i18n wiring assertions
- chore: sync local changes
- feat: localize shared home fallback data
- feat: localize shared library and loadouts pages
- feat: localize shared account and settings pages

## 0.0.10 - 2026-07-01

### 改进

- 桌面首页和设置中心按新原型继续收口，状态、账号、资料库、更新、备份和诊断入口更集中。
- 新增可复用的首页视觉对比脚本，方便发布前检查亮色和暗色模式一致性。

### 修复

- 修复桌面端每次打开停留在“正在启动 d2-tools...”数秒的问题：启动状态不再解析大型 Manifest 定义文件，也不再在启动阶段刷新 Bungie token。
- 启动状态读取失败时会显示可重试错误，不再一直停留在启动页。

### 工程

- 补充启动状态轻量检查和 OAuth 启动状态测试，防止后续把大型资料库解析重新放回启动路径。

## 0.0.9 - 2026-06-30

### 新增

- 小日向与 d2-skill 产品级能力第一阶段：攻略解析、账号命中、perk 证据和配装草稿
- 桌面 UI 设计系统 v2：语义 token 统一、亮暗色收口、AI 抽屉滚动隔离
- 新增后台任务中心：资料库更新和账号读取迁到 worker，避免阻塞 Electron 主线程
- 新增窗口 IPC 和主题同步：亮暗色模式切换通过窗口 IPC 同步到标题栏和滚动条

### 改进

- 首页、账号页、仓库页、设置页完成 HTML 原型级一致性迁移
- 账号页背包槽位改为首屏限量渲染并 lazy-load 图标
- 仓库搜索结果不截断，默认渲染 200 件
- 亮色模式全局补齐：覆盖首页、账号装备、仓库筛选与卡片、配装比较、资料库等区域
- 按钮/Tab/选中态颜色语义统一：新增 action/selected token

### 修复

- Bungie 登录端口占用时增加中文处理建议
- 亮色模式标题栏控制区和滚动条同步
- 仓库选中态改为深色高对比

### 工程

- 新增桌面端产品级视觉回归测试
- 架构维护：page metadata 共享、详情缓存上限、Manifest 状态共享、services adapter 去重

## 0.0.8 - 2026-06-25

### 修复

- 修复桌面端开发环境黑屏问题：账号 workspace hook 恢复正确的 React 状态导入，窗口启动后可正常渲染页面
- 补齐 app/services 桌面桥接实现，恢复活动摘要与社区命中能力在新分层下的类型对齐
- 修复仓库页本地导入草稿状态与 loadout lookup 类型接线，避免重构收尾阶段的渲染/类型回退

### 工程

- 新增最小 GitHub Actions CI，自动执行安装、测试和类型检查
- 新增 `.editorconfig`、`.gitattributes` 和源码衍生产物忽略规则，减少换行与误提交噪音
- 补齐开源仓库外围文件：`CONTRIBUTING.md`、`LICENSE`、`SECURITY.md`、`SUPPORT.md` 与 Issue 模板

## 0.0.7 - 2026-06-25

### 新增

- 遗失区域改为 Manifest 静态数据 + 每日轮换推算，不再依赖公共里程碑 API（修复 Bug #5）
- 新增 Manifest perk 库查询，武器目标规则支持从全量沙盒 perk 库选择
- 新增活动复盘增强：按 8 种类型分组（突袭/地牢/打击/PvP/智谋/赛季/遗失区域/其他）、完成率统计、连续完成计数
- 新增多端架构基础包（`packages/app`、`packages/services`），第一阶段骨架落地
- 新增 UI 样式规范 v1 文档

### 改进

- 商人售卖解析增强：五大关键商人（老九/枪匠/艾达/圣人/拉乎尔）各自角色标签和出现时间说明
- 仓库类型系统修复：`VaultArmorStatRule.min` 改为 number 类型
- `collectAccountItems` 去重提取为共享工具函数
- Renderer 层 API/组件/features 重构
- 样式系统继续扩展

### 文档

- 新增 `.editorconfig`、`.gitattributes`、`CONTRIBUTING.md`、`LICENSE`、`SECURITY.md`、`SUPPORT.md`

## 0.0.6 - 2026-06-23

### 新增

- 新增护甲属性筛选面板，支持按 Mobility/Resilience/Recovery/Discipline/Intellect/Strength 筛选
- 装备详情新增工具操作区（ItemDetailTools）

### 改进

- AI 配置协议重构，支持多平台 API 格式
- 装备详情面板 UI 重构为游戏风格布局
- 仓库筛选工具栏优化，筛选逻辑简化
- AI 分析面板和 AI 设置面板交互优化
- 样式系统大幅扩展

### 修复

- 修复 release workflow action 版本问题
- 修复 CI 中 latest.yml 依赖问题

## 0.0.5 - 2026-06-22

### 移除

- 删除本地评分系统：装备不再显示分值，仓库整理仅依赖玩家手动标签和实际属性数据
- 移除仓库筛选中的"推荐"和"评分"下拉框
- 移除装备详情中的评分分解面板（加分项/扣分项/评分原因/风险提示）
- 移除 AI 提示中的本地评分数据

### 新增

- 社区 Perk 推荐支持本地导入（CSV/JSON 格式），可导入自定义推荐表
- 社区推荐增加来源标签区分：DIM 愿望单、AI light.gg、本地社区表
- 新增 AGENTS.md 定义 Agent 工作规则
- 新增文档策略自动检查脚本（`pnpm docs:check`）

### 改进

- README 参考方向大幅扩展：新增 D2ArmorPicker、Destiny Recipes、Bray.tech、Destiny Sets、D2 Gunsmith 5 个参考工具，每个工具均列出完整能力描述
- 仓库分类逻辑优化
- AI light.gg 查询失败时增加降级提示
- IPC 模块按功能域拆分（account/vault/manifest/ai/loadout/wishlist/daily）
- 桌面端代码按 features/shared 重构目录结构

### 文档

- 文档结构重组：superpowers 目录迁移至 work/ 归档

## 0.0.4 - 2026-06-20

- 账号页自动读取已登录账号，登录失效时提示重新登录
- 角色使用 tab 切换，当前装备和背包合并显示并按 Destiny 位置分组
- 一键装备最高光等，可从角色、背包和仓库里选出最高光等组合
- 仓库支持按主分类、位置、弹药、锁定状态、标签和评分筛选
- DIM 风格仓库整理：同名装备对比、重复组建议、清理清单、游戏内定位提示
- 清理模式支持批量解锁和批量转移到角色背包
- 本地 loadout 模板和转移计划
- 今日 / 本周摘要面板
- 活动摘要和基础 Raid / Dungeon 统计
- AI 聊天式助手，支持基于已载入账号数据做自定义分析
- AI 配置支持 OpenAI Responses、OpenAI Chat Completions 和 Anthropic Claude
- 诊断导出、工具审计日志和写操作日志
- GitHub Release 自动打包 Windows NSIS 安装器并上传自动更新元数据（`latest.yml` / `.blockmap`）

### 改进

- d2-skill 只作为功能和安全思路参考，不照抄 CLI 形态
- AI 输出继续保持“事实 / 分析 / 建议 / 操作提醒”分区
- 今日 / 本周面板只展示 Bungie API 或本地资料库能确认的内容，不猜测
- 仓库重复组交互继续向 DIM 靠近，增强了候选选择和行内保留操作
- 文档结构重组，入口更清楚、重复更少

### 安全

- 写操作默认关闭，需要 Bungie Scope、本地开关和确认流程
- AI 不读取、也不发送 token、Client Secret 或 API Key
- d2-tools 不直接分解装备，最终分解仍需进游戏手动完成
- 诊断导出会自动脱敏

## 0.0.3 - 2026-06-19

### 新增

- 初步公开测试版本
- 账号、仓库、资料库、AI 助手和设置页基础可用
- 仓库标签、备注、单件装备详情和基础 AI 分析
- GitHub Release 自动打包 Windows NSIS 安装器

### 修复

- 修复打包后空白窗口问题
- 修复 GitHub Actions 中 workspace 包解析和 release 附件问题

## 0.0.2 - 2026-06-19

### 新增

- Windows NSIS 安装器发布流程
- Bungie OAuth、Manifest 初始化和基础资料库搜索

## 0.0.1 - 2026-06-18

### 新增

- 项目初始版本
- Electron + React + TypeScript 桌面客户端骨架
- 本地配置、健康检查和基础启动状态
