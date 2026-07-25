# 商人页实现对照

本文件是商人原型迁入共享 UI 前的字段、操作和状态边界。静态原型只消费 `vendorsPageSnapshot.model`；正式产品必须改为现有 Vendor ViewModel，不得复制冻结快照的数值或状态。

## 原型结构与字段

| 原型区域 | 数据来源 | 必须呈现 | 不得伪造 |
|---|---|---|---|
| 地点目录 | `railSections[]`、`vendors[]` | 地点、商人名称、目录状态、当前项 | 不显示商人图标或首字母替代；不按本地化名称猜测身份，使用稳定 `id` / `vendorHash` |
| 商人身份区 | `name`、`location`、`description`、`source`、`resetLabel` | 当前地点、商人、来源、刷新边界、可见 Offer 数 | 缺少地点或说明时不补猜测文本 |
| 角色上下文 | `selectedCharacterContext` | 当前角色范围与护甲师模组状态 | 不跨角色合并库存或推断模组 |
| 库存章节 | `contentSections[]`、`groups[]` | 库存、子库存、任务、声望奖励及真实分组 | 不用分类摘要替代完整子库存 |
| Offer | `iconUrl`、`name`、`itemType`、`summary`、`costs`、`quantity`、`canPurchase`、`failureMessages` | 图标、名称、类型/摘要、成本、数量、可购买或受阻原因 | 无图标显示缺图态；不能以首字母替代；不把不可购买标记成可购买 |
| 右侧核对 | `inventoryStateLabel`、`displayStatusLabel`、`updatedLabel`、`verifiedItemCount` | 库存状态、来源/读取时间、刷新边界、核验范围 | 不把全局核验数表示为当前商人的库存数 |

## 操作边界

- 点击武器或护甲 Offer 进入统一详情原型 / 产品详情；材料、任务、解码器和其他非装备 Offer 只展示当前库存信息，不能错误打开武器详情。
- 刷新只重新读取 Vendor API 与 Manifest；加载、未开放或失败时清除旧轮换，不显示过期 Offer。
- 商人目录是 `ContextSwitcher`：当前项使用 `aria-current="page"`，每个目录项和 Offer 均以 `data-status` 传达状态，不仅依赖颜色。

## 布局与表面

- 地点目录、库存章节和右侧核对栏都是直角 `SurfaceList` / `PageSection`，目录只显示文字名称和状态，不显示商人图标。
- 商人库存沿纵向章节阅读；每个章节内的 Offer 宽屏五列、1280px 三列、980px 两列、760px 单列。不得把章节改成两列面板，也不得产生横向滚动。
- Offer 是唯一使用 `ObjectCard` 的对象，使用 `6px` 圆角；Offer 图标容器和所有控件使用 `4px` 圆角，状态 Chip 使用胶囊圆角。

## 状态矩阵

| 状态 | 目录 | 详情 | Offer |
|---|---|---|---|
| 加载 / pending | 保留地点和商人身份，标记读取中 | 保留身份区与章节骨架 | 不回退上次库存 |
| 部分可用 | 标记属性读取中 | 保留基础销售数据和缺失范围 | 显示类型、成本与已知摘要，注明属性/插槽不完整 |
| 未开放 / 不可用 | 标记不可用 | 清除过期轮换并解释原因 | 不显示旧 Offer |
| 失败 | 保留可切换目录 | 显示失败范围与刷新入口 | 不把静态快照伪装为最新数据 |
| 不可购买 | 正常 | 保留当前库存信息 | 显示 `failureMessages` 首项或“当前不可购买” |
