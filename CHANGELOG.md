# 更新日志

这个项目使用面向玩家的更新日志。这里优先记录”玩家能感知到什么变化”，而不是逐条展开内部实现细节。

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
- GitHub Release 自动打包 Windows `.7z` 绿色包

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
- GitHub Release 自动打包 Windows `.7z`

### 修复

- 修复打包后空白窗口问题
- 修复 GitHub Actions 中 workspace 包解析和 release 附件问题

## 0.0.2 - 2026-06-19

### 新增

- Windows 绿色包发布流程
- Bungie OAuth、Manifest 初始化和基础资料库搜索

## 0.0.1 - 2026-06-18

### 新增

- 项目初始版本
- Electron + React + TypeScript 桌面客户端骨架
- 本地配置、健康检查和基础启动状态
