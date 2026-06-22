# 项目状态

更新日期：2026-06-22

## 项目定位

d2-tools 是面向 Windows 玩家的本地 Destiny 2 中文桌面助手。

它的主入口是 GUI，不要求普通玩家部署服务端，也不要求使用 AstrBot、Docker、NAS 或命令行。后续即使保留 HTTP / 工具接口方向，普通玩家的主入口仍然是双击 `d2-tools.exe`。

## 当前版本状态

当前公开测试基线版本：`0.0.4`

当前版本已经能完成：

- Bungie 配置和 OAuth 登录
- Manifest 初始化和本地缓存
- 账号、角色、背包、仓库、资料库查询
- DIM 风格仓库整理
- 今日 / 本周基础摘要
- 聊天式 AI 分析
- 社区 Perk 推荐基础展示和可选 light.gg 实时分析
- 本地配装模板、缺失项分析、转移计划和轻量对比
- 有边界的 Bungie 写操作

## 已支持

### 基础能力

- Windows Electron + React 图形客户端
- Windows x64 绿色包
- 首次启动配置引导
- 本地数据目录保存配置、token、Manifest 缓存、标签、备注和日志

### Bungie 与资料库

- Bungie OAuth 登录
- 本地 HTTPS callback
- OAuth token 本地保存和自动刷新
- Manifest 初始化和缓存
- 装备搜索
- perk 搜索
- 本地别名搜索

### 账号与仓库

- 自动读取已登录账号
- 角色 tab 切换
- 当前装备和背包分组显示
- 邮政官和材料摘要
- 仓库完整列表
- 仓库按主分类、位置、子弹、锁定状态、标签和评分筛选

### 仓库整理

- 本地标签和备注
- 同名装备对比
- 重复装备建议
- 批量候选选择
- 清理清单复制
- 游戏内定位提示
- 批量解锁和转移到角色背包
- 一键装备最高光等
- 武器 frame 筛选
- 社区推荐命中提示

### AI

- OpenAI Responses API
- OpenAI Chat Completions
- OpenAI 兼容接口
- Anthropic Claude
- 聊天式 AI 助手
- 单件装备 AI 解读
- 仓库 AI 分析

### 工具与诊断

- 本地 HTTP / 工具入口骨架
- 工具审计日志
- 诊断导出
- 敏感字段脱敏

## 部分支持

这些能力已经有入口或基础实现，但还没达到参考工具的成熟度：

- DIM 愿望单 / 社区推荐：支持本地导入、基础命中提示和可选 AI light.gg 分析，还不是完整社区 roll 生态
- Loadout：支持本地模板、基础转移计划和轻量对比，还不是完整配装器
- 护甲属性组合建议：已有基础分析，还不是完整优化器
- 今日 / 本周信息：已有基础面板，还缺更完整的中文周报和掉落地图
- 活动摘要：已有 Bungie 活动历史基础统计，还不是 Destiny Tracker 或 Raid Report 级别

## 未支持

这些方向目前没有完整实现：

- 完整 DIM 级配装器
- 拖拽式装备移动
- 完整护甲属性优化器
- 完整 Light.gg 社区 roll 数据
- 完整 D2Checkpoint 或 checkpoint 流程接入
- Destiny Tracker 级排行榜
- Raid Report 级完整副本复盘
- 自动更新
- 安装包
- 托盘图标
- 本地备份 / 恢复向导

## 明确不做

这些不是当前产品方向：

- 在公开包里内置任何人的 Bungie 密钥
- 默认暴露公网服务
- 把 CLI 当普通玩家主入口
- 让 AI 自动执行写操作
- 直接分解装备
- 展示无法确认的数据
- 图片化分享、多用户共享链接或公开报告发布

## 参考方向

- [DIM](https://app.destinyitemmanager.com/)：仓库、移动、loadout 体验参考
- [命运之小日向 Bot](https://qun.qq.com/qunpro/robot/share?robot_appid=102076550)：中文日报、周报和轮换信息表达参考
- [d2-skill](https://github.com/Lin-Guanguo/d2-skill)：OAuth、Manifest、AI、安全写操作和工具接口参考
- [Light.gg](https://www.light.gg/db/category/1/weapons/)：武器、perk、来源和推荐信息参考
- [Today In Destiny](https://www.todayindestiny.com/)：每日 / 每周轮换内容参考
- [Destiny Tracker](https://destinytracker.com/)：PVP / PVE 统计方向参考
- [Raid Report](https://raid.report/)：Raid 记录和复盘方向参考
- [D2Checkpoint](https://d2checkpoint.com/)：checkpoint 获取、保存流程和入口体验参考

## 下一步看什么

- 想看未来方向：去看 [路线图](roadmap.md)
- 想看当前待办：去看 [当前待办](todo.md)
- 想知道怎么开发和打包：去看 [开发说明](development.md)
- 想开始使用：去看 [玩家使用指南](user-guide.md)
