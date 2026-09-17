# T62 护甲详情目标来源去分叉

护甲详情的「目标匹配」区按**硬编码的来源身份**分成三个页签，其中两个页签全仓没有生产点、恒空。这是 T56 在武器侧已经拆掉的那条分叉的同构残留（T56 L3-4b），口径应一致。本任务只做护甲侧，**不改推荐模型本身**。

## 现状（代码证据）

| 位置 | 内容 |
|---|---|
| `packages/ui/src/item-detail/armor/ArmorDetailContent.tsx:35` | `type ArmorTargetSource = "personal" \| "loadout" \| "community"` |
| 同上 `:761` | `useState<ArmorTargetSource>("personal")` 默认选中 `personal` |
| 同上 `:762-767` | 三个页签的取数**全部按硬编码字符串过滤**：`source_label === "我的推荐"` / `"应用推荐"` / `"在线补充推荐"` |
| 同上 `:768` | `sourceOrder = ["personal", "loadout", "community"]` |
| 同上 `:787-795` | 三个页签各带一个数量角标：`个人目标` / `配装与攻略` / `社区来源` |
| 同上 `:785` | 区标题：eyebrow「目标匹配」、title「独立数据源条件匹配」、description「个人目标、配装与攻略要求、社区来源分别匹配，不合并排序，不生成保留或购买结论。」 |
| 同上 `:797` | 空态：「当前来源没有护甲目标；不会从其他来源补齐。」 |
| 同上 `:956` | 卡片正面写死的行内文案：`{recommendation.source_label} · 独立来源` |
| `packages/app/src/workspaces/armorDetail.ts:99` | 类型被收窄成字面量联合：`source_label: "我的推荐" \| "应用推荐" \| "在线补充推荐"` |
| `packages/desktop/.../item-detail/buildArmorDetailView.ts:39-43` | 两条生产路径二选一：有装备目标库走 `buildEquipmentArmorRecommendations`，否则回退 `buildArmorRecommendations` |
| 同上 `:44-91` | `target.kind === "armor_acquisition"` 的装备目标 → `source_label: "我的推荐"`（`:77`） |
| 同上 `:110-135` | `localTargetRules.armor`（本地护甲属性目标）→ `source_label: "我的推荐"`（`:126`） |

**恒空证据**：全仓 grep `"应用推荐"` 与 `"在线补充推荐"`，只命中上面那处联合类型和两处过滤器——**没有任何生产点**。也就是说 `loadout` 与 `community` 两个页签的角标恒为 `0`，点进去只有一句空态。

## 为什么算缺陷

1. **消费层按来源身份分叉**（同 T56 不变量 I3）：取数、页签、空态、键盘导航全都挂在 `source_label` 这个字符串上。
2. **两个分支不可达**：`配装与攻略`、`社区来源` 恒空，用户看到的是一排永远点不出东西的页签，角标写着 `0`。
3. **来源身份是硬编码的**（同 T56 口径「不应该有硬编码，都从数据来源里取」）：装备目标自带 `target.source.label`（`VaultTargetRulesPanel.tsx:588` 已经在用它渲染），详情却把整类目标统一压成「我的推荐」。
4. **和面向用户的既有名字撞车**：`docs/player-facing-language.md:80` 把 **personal knowledge** 定为「我的推荐」（AI 分析里「保存到我的推荐」）。护甲的装备目标卡也写「我的推荐 · 独立来源」，两件事在用户侧同名但无关系。

## 数据不会丢

装备目标的管理面在 `packages/ui/src/vault/VaultTargetRulesPanel.tsx`（`:328` 读 `armor_acquisition` 的 `planner_context`；`:574`、`:580` 统计与格式化护甲目标），与武器侧装备目标同一套。详情页删页签**不会**移除数据或管理入口——这一点与 T56 L3-4b 处理武器侧 `personal` 页签时结论一致。

## 与武器侧的一处差异（决定了不能照抄）

武器侧删掉 `personal` 页签时，装备目标另有「目标命中」区块承接逐件命中展示。护甲侧没有这个承接区——「目标匹配」区就是本地护甲属性目标/装备目标的**唯一**逐件命中展示出口。所以护甲不能只删不搬，必须先定处置口径。

## 待拍板（三选一，执行前需用户确认）

- **A（建议）**：删掉 `配装与攻略`、`社区来源` 两个死页签与整套 `ArmorTargetSource` / tablist / 键盘导航，`个人目标` 变成不带页签的一张平铺列表；同时把 `ArmorRecommendation.source_label` 改为取数据（装备目标走 `target.source.label`，本地属性目标规则用其规则名，不再压成「我的推荐」）。
- **B（对齐武器侧）**：在 A 之上再拆区——装备目标/本地属性目标移出「目标匹配」，另设独立区块（对应武器侧「目标命中」）；「目标匹配」只留真正的来源事实。
- **C（最小）**：只删两个死页签，`source_label` 硬编码暂不动。

B 会改动「目标匹配」区的信息架构，需要单独确认；A 是纯去分叉，不新增区块。

## 改动清单（确认口径后执行）

1. `ArmorDetailContent.tsx`：删 `ArmorTargetSource`、三路 filter、`sourceOrder`、`handleSourceKeyDown`、tablist/tab 结构与角标；按定案口径渲染。
2. `armorDetail.ts`：`source_label` 类型随之放宽或改为来源名直取。
3. `buildArmorDetailView.ts`：两处 `source_label: "我的推荐"` 改为按数据取名。
4. CSS：`packages/ui/src/styles/components/10-armor-detail.css:192-198` 的 `.armor-detail-target-tabs` 规则若随之无引用则删除（**先核引用再删**）。
5. 空态文案与区 description 按定案口径重写，去掉「分别匹配」这类描述已删页签的措辞。

## 判据

- `pnpm typecheck` 7 包；`pnpm test:behavior`；`pnpm test:architecture`（0 违例，且**不往白名单加文件**）；`pnpm docs:check`。
- 全仓 grep `ArmorTargetSource`、`"应用推荐"`、`"在线补充推荐"` → 0 处。
- 护甲详情在「账号实例 / 商人售卖 / 定义」三种上下文下都能显示装备目标与本地属性目标命中；无目标时给单一空态。

## 备注

- **当前没有测试覆盖这三个页签**。`packages/core/test/communityPerks.test.ts:326` 的「社区来源」是推荐服务夹具名，与护甲页签无关。
- 护甲侧 CSS 只按 `aria-selected` 变色，**没有**按来源类型分支（对照武器侧曾存在的 `.weapon-detail-recommendation-combo[data-recommendation-source="dim"]` 真违例），这条不用改。

## 不在本任务范围

- 不改推荐模型、不改装备目标存储与迁移（`TargetSourceKind: "dim_wishlist"` 属装备目标域，勿动）。
- 不新增护甲侧的推荐来源导入（护甲没有 CSV / DIM 推荐来源）。
- 不引入跨来源评分或合并排序。
