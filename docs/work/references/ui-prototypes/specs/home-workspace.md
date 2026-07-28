# 首页工作区迁移合同

## 现有功能清单

- 展示每日、每周与仄到访 / 离开三个刷新边界，并按本地系统时区更新倒计时。
- 展示日落、轮换突袭、轮换地牢三类本周核心活动及可确认奖励。
- 展示限时活动与本周加成；公开接口未确认时保持待确认状态，不使用历史内容推测。
- 展示仄当前可见轮换 Offer、地点、刷新边界，并可进入商人页或打开装备详情。
- 保留公开情报手动刷新、加载反馈、读取成功消息和失败恢复入口。

## 冻结原型视觉结构

1. Shell 页头：`公开游戏世界 / 本周情报 / 描述 / 重新读取公开情报`，由共享 Shell 持有。
2. 刷新节奏：三格连续 `StatusMatrix`，宽度不足时按 `2 + 1`、单列和移动端信息重排。
3. 核心活动：日落、轮换突袭、轮换地牢三个独立 `SummaryFrame`；内部条目使用连续行分隔。
4. 周信号：限时活动与本周加成两个独立 `SummaryFrame`。
5. 周末商人：无首层卡片壳的内容章节，包含标题操作栏、两格概览、Offer 对象卡和来源追踪。
6. 仄 Offer：宽屏四列，`<=1280px` 两列，`<=980px` 单列。

刷新矩阵、活动摘要、周信号、商人概览与模块状态统一使用 `4px` 轻圆角 `SurfaceFrame`；内部连续单元保持直角。单件 Offer 使用 `6px` `ObjectCard`，Shell、章节和页面结构保持直角。

## 字段与 Action 绑定

| 原型对象 | 真实字段 / Action | 约束 |
|---|---|---|
| 每日更新 | `dailySummary.daily_reset` | 时间按当前系统时区格式化 |
| 每周更新 | `weeklySummary.weekly_reset`，回退到 `dailySummary.weekly_reset` | 不显示固定示例时间 |
| 仄到访 / 离开 | `isXurActiveAt`、`nextXurBoundaryAt` | 顶部节奏和库存摘要共用公开时间边界，不把 Vendor `nextRefreshDate` 当成离开时间 |
| 三类核心活动 | `weeklySummary.priorities.*.entries` | 无 entries 时仅使用已确认 priority，不补 mock |
| 活动奖励 | `entries[].rewards[]` | 只展示已确认奖励，不提供点击或详情入口 |
| 两类周信号 | `special_event`、`weekly_bonus` | pending 时显示待确认 |
| 仄库存 | `dailySummary.sources.vendors` | 与商人真实读取共用数据，不硬编码八件数组 |
| 库存确认时间 | `HomeBriefing.fetched_at` | 使用系统时区完整时间 |
| 当前角色 | 当前账号选中角色 | 仅显示真实职业标签 |
| 刷新 | `onRefreshDaily` | 加载中禁用，失败状态可重试 |
| 打开完整库存 | `onNavigate("vendors")` | 无导航 action 时禁用 |
| 打开 Offer | `onOpenXurOffer` | 继续使用真实商人详情上下文 |

## 状态矩阵

| 区域 | 状态 | 展示行为 |
|---|---|---|
| 首页 | loading | 保留已有活动布局，显示非遮挡刷新提示 |
| 首页 | success | 显示读取结果消息，不改变事实值颜色 |
| 首页 | error | 显示错误 callout 与重试；仄模块不显示旧 Offer |
| 核心活动 | ready | 展示已确认条目和奖励 |
| 核心活动 | pending / empty | 对应卡片显示“公开接口暂未确认本周内容” |
| 活动奖励 | ready / missing | 已确认奖励只读展示；缺失时显示“奖励待确认”，不伪造名称、图标或详情入口 |
| 仄 | loading | 保留模块尺寸并显示骨架，不回退旧库存 |
| 仄 | ready | 展示全部当前可见 Offer、地点、角色、确认时间与刷新边界 |
| 仄 | partial | 展示可读 Offer，并明确缺失定义数量 |
| 仄 | unavailable | 清除旧 Offer，说明商人未开放或当前不可见 |
| 仄 | error | 清除旧 Offer，显示失败原因和重新读取入口 |

## 样式所有权

- 首页内容层只修改 `packages/ui/src/home/` 和 `.home-*` / `.weekly-*` 菜单样式。
- Shell 页头、页面 gutter、按钮几何、全局文字与 surface token 继续由共享层持有。
- 页面章节不添加完整卡片壳；只有活动摘要、状态矩阵和 Offer 独立对象拥有完整外框。
