# T58 游戏内配装完整子职业配置

## 目标

游戏内配装里的子职业不是普通装备。它携带超能、技能、星象、碎片和模组，Bungie 在 `characterLoadouts[].items[].plugItemHashes` 里按 socket 位置返回，DIM 用 `socketOverrides` 表达同一份数据。

本任务只负责**保真**：读准、存得下、显示对、和 DIM 往返不丢。

**不包含「把子职业配置写回游戏」**。那件事单独立项，前提是先验证子职业 socket 的可写能力。

## 现状（2026-09-20 复核）

已落地：

- 数据链路通了：Bungie component 206（`packages/services/src/account/session.ts:150`）→ 收集 hash（`packages/core/src/account/definitionRequest.ts:69-76`）→ 加载定义（`packages/desktop/src/main/runtime/accountDefinitions.ts:45-168`）→ 解析（`packages/core/src/account/summary.ts:1883-1952`）。
- 原始 socket 位置保留：`summary.ts:1907` 用 `plugItemHashes` 的数组下标作 `socket_index`。
- 游戏内槽位复制到应用配装会生成 `subclass_target`（`packages/app/src/workspaces/localLoadoutPlanWorkbench.ts:89-104`）；「子职业当普通装备」的旧行为已在 `524915cb` 修掉。
- DIM 导入导出保留 `socket_overrides`（`packages/core/src/loadouts/dimImport.ts:249-259`、`:372-393`）。

未落地，本次要解决：

**1. 分类靠字符串正则，不是 socket 语义。** `summary.ts:1946-1952` 用 `category_identifier + item_type + name` 拼串做正则猜 ability / aspect / fragment，其余落 `other`；而 `localLoadoutPlanWorkbench.ts:100` 把 `other` 当成 `mod_hashes`。后果：棱镜子职业、非中英文名称、名称不含关键词的 plug 全部误分类。

根因是 Manifest 缺定义：白名单（`packages/core/src/manifest/definitions.ts:3-25`、`:218-238`）没有 `DestinySocketTypeDefinition`，`DefinitionRecord.sockets.socketEntries`（`:189-197`）也没声明 `socketTypeHash`。不先补这两处，换不了正式 socket category。

**2. 未定位实例的子职业整块丢失。** `summary.ts:1921` 要求实例能反查账号物品且 bucket 是 `3284755031`，否则不生成 `subclass_configuration`，UI 只显示「未定位实例」（`:1934`）。测试 fixture `packages/core/test/account.summary.test.ts:195` 的 `itemInstanceId: "0"` 会被 `isValidLoadoutItemInstanceId`（`summary.ts:1954-1958`）过滤，而测试对该路径零断言——这条链的真假只能在真实账号上验。

**3. 「从当前装备开始」仍把子职业当普通装备目标。** `packages/core/src/loadouts/plans.ts:242-247` 无过滤地映射 `equipped_items`，`characterEquipment` 前 16 格含子职业（`summary.ts:1302-1314`）。T58 之前只修了「游戏内槽位 → 复制」一条路径。

**4. 执行指纹丢 socket。** `packages/core/src/loadouts/localPlanExecution.ts:600-615` 只序列化 `plug_hashes`，不含 `socket_index`，穿戴核对看不出 socket 级差异。

**5. 展示层。** 折叠摘要把子职业拍平取前 3 个（`packages/ui/src/loadouts/LoadoutsPageContentView.tsx:674-678`）；图标在上游已有（`summary.ts:1914`）但被丢弃（`:643-646`）；同一份数据渲染两遍（`:688` 与 `:690-700`）；`loadout-in-game-subclass-detail` 这个类名在 `packages/ui/src/styles/menus/loadouts/03-workspace.css` 里没有定义；空组被 `.filter(group => group.rows.length)` 删掉（`:570`）；chip 被 `max-width:150px` 截断（`03-workspace.css:766-779`）；对比表只有计数（`packages/app/src/workspaces/applicationLoadoutWorkspace.ts:751-762`）；`packages/ui/src/i18n/copy/loadouts.ts` 没有任何子职业术语 key，英文界面必然回落中文。

## 切分

1. `实现: 补齐 socket 语义定义` — Manifest 白名单加 `DestinySocketTypeDefinition`，必要时连带 `DestinySocketCategoryDefinition`；`socketEntries` 补 `socketTypeHash`。
2. `实现: 子职业分类改走 socket category` — 替换 `classifySubclassPlug`，正则降级为兜底。
3. `实现: 子职业身份保真` — 空槽显式建模、未定位子职业不丢分组、真实账号核对实例 ID 假设。
4. `整理: 收敛子职业复制入口` — `plans.ts:242-247` 不再产生子职业 `item_target`，所有入口只生成 `subclass_target`。
5. `实现: 指纹按集合比较` — 计入 `socket_index`，顺序无关。
6. `整理: 子职业展示` — 分组、官方图标、空位占位、去重复渲染、补 CSS 类、补 i18n key、对比表展开明细。

## 验收（需要真实账号）

- 三个职业的各元素分支，以及棱镜子职业。
- 空槽位：未装星象、碎片槽不满、整格为空。
- 旧版本子职业。
- 未定位实例的子职业仍显示分组。
- DIM 导入 → 应用配装 → DIM 导出往返一致，socket 位置不漂。

## DIM 参考

子职业配置在 DIM 里只有一个载体：`socketOverrides`（socket index → plug hash）。子职业是非实例物品，按 hash 解析，武器护甲按实例 ID 解析。

DIM 踩过的两个坑：

- issue #8718：同一批碎片换个 socket 顺序，会被当成变化，剥离再插一遍。
- issue #10344 / #8750：星象和碎片在 socket 间无谓改动，会让玩家在游戏内丢掉全部超能/技能能量。所以 DIM 在保存、草稿、同步、导出到游戏内槽位时统一排序。

对本仓库的直接约束：`applicationLoadoutWorkspace.ts:764` 的 `subclassConfigurationFingerprint` 和 `localPlanExecution.ts` 的指纹必须按集合等价比较，不能按序列化顺序。否则等价配置会被判成差异；一旦将来接上写回，顺序抖动等于每次穿戴都清空玩家能量。
