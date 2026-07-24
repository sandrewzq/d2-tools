# 首页商人库存契约

## 目标

首页商人区域必须展示当前商人实际售卖物品，不能只显示商人名称、库存数量或分类摘要。首页与商人页使用同一份库存数据；两者只允许布局不同，不允许字段、时效和可见 Offer 数量互相矛盾。

稳定契约标识：`home.vendor-stock`。

## 数据输入

| 字段 | 必需 | 来源 | 说明 |
|---|---|---|---|
| `vendorHash` | 是 | Vendor API | 商人身份，不能只依赖本地化名称识别 |
| `title` | 是 | Vendor API + Manifest | 商人显示名称 |
| `location` | 否 | Vendor API / 已确认位置映射 | 当前地点 |
| `characterId` | 否 | Profile / Vendor API | 当前读取库存对应角色 |
| `refreshAt` | 否 | Vendor API / 重置规则 | 当前库存失效边界 |
| `confirmedAt` | 是 | 本地读取记录 | 最近一次成功确认时间 |
| `items` | 是 | Vendor API + Manifest | 当前角色可见 Offer；首页必须逐件消费 |

每个 `items[]` 至少包含：

- `itemHash` 或可追踪到定义的 `related_hashes`。
- 名称、图标、分类或副标题。
- 当前 Offer 可确认的 Roll、属性或简要说明。
- 可用状态。
- 价格与货币是可选字段；只有真实 Offer 返回时才显示，禁止按物品类型、顺序或固定文案推测。

## 展示要求

- 首页仄模块的标题固定表达为“仄本周八件轮换”，不使用“异域装备”概括，避免误导为只包含武器和护甲。
- 当前八件轮换必须完整展示，包含“仄浪板”载具与七件护甲商品；不得按装备类型过滤载具。
- 展示商人名称、地点、离开或刷新倒计时、库存总数、当前角色和读取时间。
- 正常状态下逐件展示所有当前可见 Offer；如果产品需要折叠，必须明确显示 `已展示数量 / 总数` 和“展开全部”，不能静默截断。
- 每件 Offer 显示真实图标、名称、类型以及当前可确认的 Roll 或属性摘要。
- 保留“打开完整库存”入口。
- 首页与商人页必须从同一个 ViewModel / fixture 派生，不分别硬编码库存。

## 模块状态

| 状态 | 行为 |
|---|---|
| `ready` | 展示完整当前库存和最新确认时间 |
| `loading` | 保留模块尺寸，展示库存骨架，不回退到旧库存 |
| `partial` | 展示已确认 Offer，并明确标记缺少 Manifest 定义的数量 |
| `unavailable` | 当前商人未开放或当前角色不可见，不展示旧 Offer |
| `error` | 显示读取失败与重新读取入口，不展示过期库存 |

状态属于首页商人模块，不能通过覆盖整个首页的全屏状态来代替。

## 还原映射

- 原型：`[data-contract-id="home.vendor-stock"]`
- 共享 UI：`HomePageContentView` 中唯一的商人库存模块
- 数据模型：`HomeConfirmedXur` 或后续同职责 ViewModel
- Desktop / Web / Prototype：只提供真实 adapter 或 mock fixture

正式还原时不得重新创建 `presentation="archive"` 之类的简化 DOM 分支。视觉样式应作用于完整库存组件，而不是用摘要组件替换它。
