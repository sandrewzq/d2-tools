# Bug 清单

> 记录于 2026-06-21，根据本地手动测试反馈整理。

## 高优先级

### Bug #1: 账号页"装备最高光等"按钮点击无反应
- 文件: `packages/desktop/src/renderer/pages/HomePage.tsx` — `equipHighestPowerItems()`
- 现象：点击按钮后无任何反馈，无弹窗、无消息提示、无网络请求
- 可能原因：早期返回路径（写操作开关未开启、当前已是最高光等）的消息提示位置偏下，用户看不到

### Bug #5: 今日/本周页遗失区域数据获取不到
- 现象：Lost Sector 数据为空或获取失败
- 引用: `packages/core/src/daily/liveData.ts`

### Bug #6: 商人库存（Xur/老九）未显示具体售卖内容
- 现象：只显示"库存名称暂不可读"，不列出具体售卖物品
- 用户期望：列出 Xur 每周售卖的具体装备名称和属性

### Bug #8: 账号页存在未识别物品（Item 3359067392），名称未解析
- 现象：仓库或角色装备中某个 item 显示原始 hash/id，无法正常显示中文名称
- 可能原因：Manifest 资料库中缺失该物品定义，或查找逻辑有遗漏

### Bug #10: 仓库页装备分类错误，全部物品被归到"其他"
- 现象：仓库页中"武器""护甲""装备"分类均为 0，全部 763 件物品被归入"其他"
- 可能原因：物品分类逻辑（`group_key` 或 `item_type` 映射）与仓库页分类条件不匹配
- 引用: `packages/core/src/items/classification.ts` 或 `packages/desktop/src/renderer/pages/HomePage.tsx` — 仓库分类筛选逻辑

### Bug #11: 仓库页缺少数值筛选，评分系统不合理
- 现象：仓库筛选只能按分类/标签/文本搜索，缺少 DIM 风格的按韧性/恢复/纪律等具体属性值筛选
- 评分系统问题：当前评分来源不清晰，用户认为不合理
- 核心需求：配装是为了凑属性数值（如双百/三百），需要支持按属性值筛选和排序
- 建议参考：DIM 的仓库过滤器数值比较语法，以及护甲属性统计视图

## 中优先级

### Bug #2: 全局样式——页面排版过长，左右两侧空间未利用
- 现象：全局所有页面内容竖向单列排列太长，页面左右两侧大量空白
- 影响范围：账号页、仓库页、资料库、日报周报、AI 助手等所有页面
- 建议：改为多栏布局或卡片网格，充分利用横向空间，各功能模块采用分栏并行展示
- 暂缓修改

### Bug #3: 装备模板/本地配装模板使用方式不明确
- 现象：用户不知道"保存当前装备为模板"之后能干什么、怎么用
- 需优化引导体验，增加使用说明

### Bug #4: 每页顶部重复显示 Bungie 配置/登录/资料库/AI 状态卡片
- 现象：登录后各页面顶部仍然展示状态卡片，信息冗余
- 建议：登录完成后精简或隐藏

### Bug #7: 日报/周报内容过于简略
- 现象：日报/周报只显示基础轮换信息，缺乏实用价值
- 期望：参考 TWID 周报格式，聚合活动掉落、沙盒改动、奖励刷新、版本更新等详细资讯

### Bug #9: DIM 整理工具——文案/交互混乱
- 现象：用户分不清"DIM 整理工具"是在用 DIM 的功能还是 d2-tools 自己的功能
- 功能边界模糊，需要重新梳理命名和交互流程

### Bug #13: 资料库筛选下拉无值，需整体优化
- 现象：资料库页面的"分类""稀有度""位置"等筛选下拉框均为空，无选项值
- 用户期望：筛选应有实际可用选项，参考 DIM 等工具的筛选设计
- 引用: `packages/desktop/src/renderer/pages/HomePage.tsx` — 资料库搜索区域 / `packages/core/src/items/search.ts`

### Bug #14: AI 助手对话区过长，需改为侧边栏布局
- 现象：连续问几个问题后对话内容竖向堆积很长，需要一直滚动
- 用户期望：AI 助手改为侧边栏模式，和主内容区并行展示，避免挤占页面空间
- 引用: `packages/desktop/src/renderer/components/AiAnalysisPanel.tsx` / `packages/desktop/src/renderer/pages/HomePage.tsx` — AI 助手区域

### Bug #15: 同名对比功能——不应看分值，应看属性数值和 perk
- 现象：同名装备对比只显示一个总分值，无法区分优劣
- 用户期望：护甲对比应展示韧性/恢复/纪律等具体属性值差异，武器对比应展示 perk 差异
- 当前的问题：评分分值对用户没有参考意义，凑属性值和选 perk 才是核心需求
- 引用: `packages/core/src/analysis/duplicates.ts` / `packages/desktop/src/renderer/pages/HomePage.tsx` — DIM 整理工具 / 同名对比区域

### Bug #12: 装备详情不显示属性数值，perk 池混在一起
- 现象：已拥有的装备详情只显示 perk 列表，没有显示已有的属性数值（韧性/恢复/纪律等）
- 用户期望：已拥有装备应先展示当前属性值，perk 池信息放在分隔区域
- 引用: `packages/desktop/src/renderer/pages/HomePage.tsx` — 装备详情弹窗 / `packages/core/src/items/detail.ts`

### Bug #10: 社区推荐——AI 查询失败时无降级提示
- 文件: `packages/core/src/communityPerks/communityPerkRecommendationService.ts` — `getRecommendations()`
- 现象：AI light.gg 查询失败时静默降级到 DIM wishlist，用户感知不到 light.gg 查询失败过
- 期望：UI 显示类似"light.gg 查询失败，显示 DIM 愿望单数据"的提示

### Bug #11: 社区推荐——AI 返回无法解析时丢失原始分析文本
- 文件: `packages/core/src/communityPerks/aiLightggSource.ts` — `parseLightggResponse()`
- 现象：AI 返回的 JSON 解析失败时直接返回 `null`，丢弃了 AI 的原始分析文本
- 期望：无法解析结构化数据时保留 `ai_analysis` 原始文本供用户参考

### Bug #12: 社区推荐——WeaponRecommendation 缺少设计文档定义的字段
- 文件: `packages/core/src/communityPerks/types.ts` — `WeaponRecommendation`
- 缺少字段：`individual_perks`、`sample_size`、`source_label`、`ai_analysis`

### Bug #13: 社区推荐——仓库/资料库匹配时没有加载英文定义
- 文件: `packages/desktop/src/main/ipc.ts` — `community:vault:match`
- 现象：仓库匹配只用 DIM wishlist，但未传入英文定义，命中提示中的 perk 名称无英文显示

## 低优先级 / 改进项

### Improvement #1: 社区推荐——Prompt 要求 AI 同时返回 perk hash
- 文件: `packages/core/src/communityPerks/aiLightggSource.ts` — `buildLightggQuery()`
- 当前 prompt 只要求 `{"name": "..."}`，需模糊匹配中文名
- 建议：同时要求 `{"hash": 123, "name": "..."}`，匹配准确性更高

### Improvement #2: 社区推荐——资料库入口较弱
- 文件: `packages/desktop/src/renderer/pages/HomePage.tsx` — 资料库结果卡片
- 现象：资料库只显示"社区推荐 N 个组合"数量标记，无详细展开，需点"查看详情"才能看推荐内容
- 建议：资料库卡片上直接展开推荐详情

### Improvement #3: 社区推荐——缓存内容不完整
- 文件: `packages/core/src/communityPerks/aiLightggSource.ts` — `writeCache()`
- 现象：缓存只保存解析后的 `recommendation` 和 `cached_at`
- 期望：同时缓存原始 AI 返回文本，便于调试和降级展示

### Improvement #4: 社区推荐——core 包缺少 communityPerks 子路径 exports
- 文件: `packages/core/package.json`
- 只能通过 `@d2-tools/core` 整体导入，没有暴露 `./communityPerks` 子路径
- 建议：新增 `"./communityPerks"` exports 入口

### Improvement #5: 社区推荐——测试覆盖不足
- 已覆盖：DIM wishlist 解析、仓库匹配、AI 失败降级
- 未覆盖：缓存 TTL 过期、AI 返回正常 JSON / 无法解析 / 原始文本、中英文名称填充
