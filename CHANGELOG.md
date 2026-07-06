# 更新日志

这个项目使用面向玩家的更新日志。这里优先记录”玩家能感知到什么变化”，而不是逐条展开内部实现细节。

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
