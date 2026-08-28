# T15：本地优先账号数据与统一缓存层

> 状态：账号写结果即时提交与刷新去重已接入，待真实账号复验
> 优先级：P1
> 更新时间：2026-08-28

## 一句话目标

把 d2-tools 从“页面打开后分别请求数据”改造成“本地优先、后台同步、按需补全、写入后精确失效”的账号工作台。

用户打开仓库、装备详情、配装或账号页时，先看到本地可用数据；网络请求只负责刷新过期数据、补齐缺失详情和执行明确的游戏操作，不重复读取已经缓存的资料。

## 背景与问题

当前项目已经存在多种缓存，但缓存按功能分散，缺少统一的账号数据仓库、过期语义和失效规则。

### 当前数据来源

| 数据 | 当前实现 | 当前问题 |
|---|---|---|
| 公共装备 / Perk / Socket 定义 | Manifest SQLite 与内存 LRU | 这一层基本正确，但只保存定义和图标地址，不保存账号实例状态或实际图片 |
| 账号仓库与角色快照 | `account-snapshot-cache.json` | 能持久化摘要，但字段粒度有限，页面无法从中得到完整实例详情 |
| 当前启用 Perk | 账号快照中的 `ItemSockets` 摘要 | 首屏快，但只能回答“现在装了什么” |
| 完整 Socket / reusable plugs | `getAccountItemDetail` 远程实例详情 | 当前只存在服务进程内存 Map，TTL 45 秒，最多 48 件，重启后丢失 |
| 首页 / 商人 | 各自的缓存文件和刷新计划 | 有缓存但缺少统一的 freshness / stale / refreshing 表达 |
| light.gg / 社区 / AI | 各自独立缓存 | 生命周期、账号上下文和资料库版本没有统一关联 |
| 标签、Wishlist、目标、配装、攻略 | 本地 JSON / local data | 用户数据应保留，但与账号快照的关联和版本失效需要明确 |

### 现象

- 同一件装备在同名整理、装备详情和配装页重复读取。
- 首屏摘要已经可用，但完整 Roll 还要等待单件 Bungie 请求。
- 应用重启后，之前读取过的实例详情重新请求。
- 账号快照、实例详情、商人缓存和首页缓存无法统一显示“数据来自何处、何时同步”。
- 写入锁定、转移或游戏内 Perk 后，部分页面更新、部分页面仍持有旧缓存。
- UI 容易把“后台刷新”误显示成“空白加载”或自动改变布局。

### 关键证据

- Manifest 定义读取位于 `packages/services/src/gameData/sqliteDefinitionReader.ts`，按公共 Hash 查询。
- 账号快照持久化为 `account-snapshot-cache.json`，位于 `packages/services/src/account/snapshotStore.ts`。
- 账号实例详情缓存为 `packages/services/src/account/session.ts` 内的 `itemDetails` Map，默认 TTL 45 秒、最多 48 件。
- 完整实例详情请求使用 `Item` 接口组件 `300,301,304,305,307,309,310`，其中 `310 ItemReusablePlugs` 不在普通仓库快照请求中。

## 产品目标

1. 应用启动后优先显示上次成功同步的账号数据。
2. 仓库筛选、同名整理、装备详情和配装页共享同一份账号数据与实例详情缓存。
3. 完整 Roll、护甲 Socket、能量和目标进度只在缺失或过期时读取。
4. 后台刷新不能清空当前可见内容，也不能偷偷切换用户展示模式。
5. Bungie 单件写接口明确成功，或批量接口返回单项成功状态后，立即精确更新受影响实例、位置和派生光等；轻量 Profile 只在后台对账，页面不等待完整账号快照，也不清空整个账号缓存。
6. 用户始终能知道数据是否来自本地缓存、何时同步、是否过期、是否正在刷新。
7. 离线时仍可查看账号上次状态、本地标签、目标、攻略和配装；需要联网的动作必须明确禁用。
8. 静态资料、账号事实、派生结果、用户决策和外部推荐之间有清晰的 source of truth。

## 非目标

- 不把 Manifest 公共资料与账号私有实例数据混入同一个生命周期或同一个版本号。
- 不保证本地缓存永远等于游戏当前状态；必须保留过期和重新验证语义。
- 不在 UI 中直接访问 SQLite、文件系统或 Bungie API。
- 不把 AI、light.gg 或社区推荐变成仓库基础功能的前置依赖。
- 不在普通页面中自动执行转移、解锁、拆解或游戏内 Perk 切换。
- 不为了缓存改动现有页面职责，不保留 Web / Desktop 两套产品页面。

## 数据分层与事实归属

### A. 公共静态资料

包括装备定义、Perk 定义、插槽类别、伤害属性、套装、官方图标路径和阶级覆盖图。

- 存储：现有 Manifest SQLite。
- 版本：以 Manifest 版本和语言为命名空间。
- 更新：资料库更新任务完成后原子切换。
- 失效：Manifest 版本变化时清理定义派生缓存，不删除用户决策和账号实例记录。

### B. 账号快照

包括仓库、角色装备、位置、光等、锁定、当前装备状态、当前启用 Perk 和护甲属性。

- 存储：迁移期可以继续读取 `account-snapshot-cache.json`，最终进入账号缓存库。
- 键：账号身份、会员类型、Destiny membership、snapshot revision。
- 持久化元数据：`snapshot_revision` 由保存顺序生成、可按字典序比较；`manifest_revision` 仅在调用方明确提供 Manifest 版本时记录，旧 `version=2` 快照缺少这些字段时仍可读取。
- 用途：仓库首屏、筛选、分组、账号页、配装候选初始输入。
- 新鲜度：支持 `cached / stale / refreshing / ready / error`。

### C. 账号实例详情

包括完整 Socket、`reusable_plugs`、可切换能力、插入失败原因、Perk 目标进度和实例公共数据。

- 存储：独立账号缓存库，不能只保留在内存 Map。
- 键：`account_id + instance_id`。
- 用途：完整 Roll、装备详情、配装执行预检和逐件护甲求解。
- 失效：游戏内写操作、账号显式刷新、详情版本变化或确认数据过期时精确失效。

### D. 派生分析

包括重复组、筛选命中、Wishlist 命中、装备目标命中、护甲求解和推荐证据。

- 默认不作为唯一事实长期保存。
- 使用账号快照、实例详情、Manifest 版本和规则集版本计算。
- 如需缓存，必须带输入指纹，输入变化后自动失效。

### E. 用户决策

包括保留、待复查、待处理、Wishlist、目标、配装方案、攻略确认、收藏和归档。

- 永久保存到本地数据域。
- 不被账号刷新覆盖。
- 与账号事实通过稳定 `instance_id / item_hash / target_id / result_id` 关联。

### F. 外部分析

包括 light.gg、社区推荐、公开活动、商人库存和 AI 结果。

- 单独缓存。
- 带来源、抓取时间、账号 / 角色作用域、Manifest 版本和请求参数指纹。
- 失败时保留上次成功结果，并显示过期状态。

## 目标存储结构

### Manifest 数据库

继续使用现有只读 Manifest SQLite：

```text
manifest.sqlite
├── item definitions
├── plug definitions
├── plug sets
├── bucket / damage / tier definitions
└── search indexes
```

### 账号缓存库

新增独立的 `account-cache.sqlite`，或在不影响现有 Manifest 的前提下使用等价的本地存储实现：

```text
account-cache.sqlite
├── account_context
├── account_snapshots
├── item_instances
├── item_sockets
├── reusable_plugs
├── item_detail_raw
├── sync_state
└── invalidation_queue
```

建议字段：

```text
account_context
  account_id
  membership_type
  destiny_membership_id
  last_snapshot_revision

item_instances
  account_id
  instance_id
  item_hash
  location_kind
  character_id
  power
  locked
  equipped
  summary_json
  fetched_at
  stale_at
  source_revision

item_sockets
  account_id
  instance_id
  socket_index
  selected_plug_hash
  reusable_plugs_json
  fetched_at
  detail_revision

sync_state
  scope
  key
  status
  fetched_at
  stale_at
  error_code
  error_message
```

实现上允许保留规范化列和一份原始 JSON：规范化列用于筛选和状态判断，原始 JSON 用于兼容新字段和诊断。

### 用户数据域

继续保存攻略、目标、配装、标签和 Wishlist，但通过稳定引用连接账号缓存，不复制完整账号快照：

```text
local-data/
├── vault-tags.json
├── wishlist.json
├── equipment-targets.json
├── loadout-plans.json
├── guide-library.json
├── guide-extractions.json
└── guide-derived-relations.json
```

## 统一数据服务接口

在 `packages/services` 增加跨页面使用的账号数据仓库，名称可以是 `AccountDataRepository` 或等价实现。

### 读取接口

```ts
getSnapshot(options?: {
  freshness?: "cached" | "allow-stale" | "refresh";
}): Promise<AccountSnapshotResource>;

getItemDetail(instanceId: string, options?: {
  freshness?: "cached" | "allow-stale" | "refresh";
}): Promise<AccountItemDetailResource>;

prefetchItems(instanceIds: string[], options?: {
  priority?: "visible" | "background";
}): Promise<void>;
```

资源对象必须包含：

```ts
type DataResource<T> = {
  data: T | null;
  status: "unavailable" | "cached" | "stale" | "loading" | "refreshing" | "ready" | "error";
  fetchedAt?: string;
  staleAt?: string;
  source: "local" | "remote" | "merged";
  error?: { code: string; message: string };
};
```

### 订阅接口

页面不轮询状态，由仓库或写操作协调器发布事件：

```ts
subscribe(event: "snapshot" | "item-detail" | "sync" | "write-operation", listener): () => void;
```

事件必须带稳定键：

```text
account_id
instance_id
scope
revision
operation_id
```

## 同步与缓存策略

### 启动

```text
启动应用
→ 读取 Manifest 状态
→ 读取账号快照缓存
→ 读取用户数据
→ UI 立即展示可用内容
→ 后台创建同步计划
→ 只刷新过期或缺失范围
```

### Stale-while-revalidate

有旧数据时不得进入空白 loading：

```text
有缓存 + 未过期     → 直接显示
有缓存 + 已过期     → 显示旧数据 + refreshing
无缓存 + 可读取     → loading 骨架
刷新失败            → 保留旧数据 + error + 重试
```

### 同名整理

```text
读取账号快照
→ 本地计算同名组
→ 读取本组已有完整 Roll 缓存
→ 有缓存的实例立即可查看
→ 只请求缺失 / 过期实例
→ 每件实例返回后立即落盘
→ 用户视图保持当前模式，不自动切换
```

完整 Roll 控件应按缓存状态表达：

- 有本地详情：立即可点击，显示上次同步时间。
- 只有部分详情：显示 `已读取 2 / 5`，完整 Roll 可在全部满足比较条件后启用。
- 没有详情：显示读取中，但当前启用仍可用。
- 读取失败：保留当前启用，允许仅重试失败实例。

### 账号刷新

- 普通刷新优先使用现有快照完成首屏，再后台更新。
- 显式“刷新账号”只发起一份可合并的远程账号快照请求；已有同范围请求时复用，不排队重复强刷。
- 手动刷新可以正常合并服务器事实；已提交写结果独立于账号快照保存，服务器暂时仍返回旧状态时继续叠加受保护的 committed patch，不得用旧 Profile 回退页面、AccountSession 或磁盘快照。
- 自动刷新使用独立后台状态，不设置页面级 `isLoadingAccount`，不禁用账号页或详情弹层操作。
- 标签、目标、Wishlist 等本地用户数据与远程账号快照分开加载，不随每次手动刷新重复读取。
- Activity History 和社区匹配使用独立 freshness；账号刷新不得先清空已有结果，也不得把派生读取计入前台刷新耗时。
- 快照更新后只发布受影响的实例和位置事件。
- 账号切换时使用不同 `account_id` 命名空间，不能复用旧账号数据。

### 2026-08-28 真实账号复现结论

单件详情装备已证明旧确认链路把大部分时间浪费在 Profile 对账，而不是 Bungie 写接口：

- Bungie `EquipItem` 写接口约 `433ms` 返回成功，但弹窗总计等待约 `197s` 才结束。
- 随后的完整权威账号读取分别耗时约 `43.6s / 28.6s / 30.0s / 30.0s / 26.9s`；接近 `30s` 的读取命中了 Bungie GET 默认超时。
- `useItemDetailWorkspace` 仍在前台执行最多 8 次完整账号快照轮询，固定等待序列为 `0 / 0.75 / 1.5 / 2.5 / 4 / 6 / 8 / 10s`。
- `AccountSession.patch` 在写后约 `750ms` 自动启动完整快照重新验证；详情前台轮询、最高光等轻量确认和手动刷新会与它竞争 Profile 请求。
- 最高光等轻量确认成功后 renderer 仍会再读取一次完整权威账号；该读取不锁按钮，但继续消耗网络、定义水合和 IPC 传输。
- 当前账号快照缓存文件约 `4.36MB`；完整刷新还包含 9 个 Profile 组件、Manifest 定义水合、快照构建和 IPC 序列化。
- `accountRequestSequenceRef` 只能丢弃旧 UI 结果，不能取消已经发出的请求；强制刷新遇到 in-flight 时可能等待后再执行一轮，形成串行浪费。
- 后续复现中 Bungie 单件写接口约 `291–579ms`，平均约 `412ms`；Profile 对账约 `2.4–101.6s`。
- 一次最高光等单件操作的写入约 `291ms`，Profile 第三次才命中，总计约 `19.3s`，其中固定等待占 `17s`。
- 后台对账的 `2s → 5s → 10s → 20s → 30s` 退避可以用于最终一致性维护，但不能继续作为玩家操作完成条件。

因此不能把问题归因于“等待时间不够”。正确修复是删除 feature 内前台轮询，以 Bungie 写结果作为本次操作的提交事实，立即更新本地账号状态；长生命周期协调器只做低优先级 Profile 对账，账号刷新继续具备请求合并、范围隔离和后台状态。

## 写操作与失效规则

### 统一写操作生命周期

写接口是否成功与账号 Profile 是否已经反映结果是两个独立事实，不能继续压缩成一个页面级 `isRunning`：

```text
submitting
→ Bungie 写接口逐件返回
→ failed / committed / partial-committed
→ 前台立即结束并更新页面
→ 后台轻量对账
→ reconciled / delayed / paused / superseded
```

- `submitting` 是唯一阻断重复提交的前台阶段；Bungie 写接口返回后立即结束前台等待。
- 单件装备调用一次 `EquipItem`，两件及以上调用一次 `EquipItems`；不因缺失结果或 `1623` 在前台固定等待后重复写入，批量响应按每件状态码立即形成成功项和失败项。
- Bungie 写接口明确成功后，成功项立即提交到中央账号 Store、AccountSession 快照和持久化账号缓存；装备、位置、锁定和光等随 committed patch 同步更新。明确失败项保持原状态。
- 这里的 committed patch 不是无依据的乐观预测，而是 Bungie 写接口的明确成功结果。Profile 是最终一致读取缓存，可能在写接口成功后的数秒到数十秒内继续返回旧数据。
- 后台对账由长生命周期协调器持有，页面和 feature hook 只订阅 `write-operation` 事件，不得自行 `while` 轮询。
- 对账只读取目标角色或实例所需的轻量组件；未命中时按约 `2s → 5s → 10s → 20s → 30s` 退避，后续维持低频对账，不重复构建完整账号摘要，也不占用前台 Loading。
- Bungie 写接口明确失败时直接结束对应项且不提交 patch；批量部分成功逐项提交成功 patch，并提供失败原因和仅重试失败项的入口。
- Profile 长时间未反映结果进入 `delayed`，离线进入 `paused`，新操作覆盖旧目标进入 `superseded`；这些状态只描述后台对账，不得把已经成功的 Bungie 写操作改写成失败。
- 轻量 Profile 命中后只解除对应 committed patch 的 revision / pending 保护并发布 `reconciled`；不二次应用 patch，也不为一次写操作额外刷新材料、商人、首页和无关角色数据。
- 普通刷新遇到尚未反映写结果的旧 Profile 时必须继续叠加 committed patch；只有对账命中、明确的新反向写操作或账号切换才能解除保护。
- 所有对账结果必须比较 revision 与 `operation_id`；旧任务被新操作替代时进入 `superseded`，不得被后台任务框架转换为 `success`，也不得解除最新写结果的保护。

普通单项写操作使用当前可见账号事实，不在点击后强制刷新完整账号。只有数据已明确过期、目标实例缺失或复杂多步骤配装需要重新预检时，才执行一次范围明确的读取；该读取不能演变为页面级持续刷新。

### 锁定 / 解锁

```text
用户确认
→ 调用真实 Bungie action
→ 成功后更新本地 item_instances.locked
→ 失效该实例的保护派生结果
→ 发布 item-detail / snapshot 事件
```

### 转移

```text
用户确认目标角色
→ 执行真实转移
→ Bungie 返回成功后立即提交目标位置 patch
→ 失效该实例详情和相关快照
→ 直接继续后续写入步骤，不等待 Profile 读回
→ 后台协调器轻量对账最终位置并解除保护
```

### 游戏内切换 Perk

```text
执行成功
→ 失效该 instance_id 的 sockets 与 reusable_plugs
→ 重新获取该实例详情
→ 更新装备详情、同名整理和配装候选
```

### 本地整理标签

```text
修改待应用状态
→ 只保存在 UI 临时状态
→ 应用本组状态
→ 写入本地标签
→ 不改变账号实例缓存
→ 不自动转移、解锁或拆解
```

## 各工作区的职责与数据流

### 首页

- 读取本地首页 / 公开情报缓存。
- 用后台任务更新活动、商人和账号摘要。
- 过期时保留旧内容并显示时间边界。
- 不因公开情报失败而阻塞账号功能。

### 账号页

- 读取账号快照和用户可见账号级数据。
- 角色切换只改变展示作用域，不重复读取已经缓存的实例。
- 详情需要时复用实例详情仓库。

### 仓库

- 筛选、排序、重复分组全部本地计算。
- 当前启用来自账号快照。
- 完整 Roll 只补齐当前同名组缺失实例。
- Wishlist、目标和社区证据作为派生数据，不改变账号事实。
- “待处理”是本地整理决策，游戏内转移 / 拆解是后续显式动作。

### 配装

- 求解器只依赖本地账号快照、实例详情、Manifest 和规则集。
- 重新计算不应访问网络。
- 普通单项穿戴使用当前账号事实；只有数据明确过期、目标缺失或复杂多步骤执行时才做一次范围明确的预检。
- 转移成功后可直接进入装备步骤，不等待完整 Profile 快照反映中间位置。
- 执行中每个 Bungie 成功步骤立即提交精确增量；后台只对账受影响角色、实例和 Socket，不让页面承担轮询生命周期。

### 资料库

- 装备、Perk、框架和关系搜索完全走本地 Manifest SQLite。
- 公开来源、社区和实时渠道按需加载并单独缓存。
- Manifest 版本变化时清理查询派生缓存，不清理用户历史。

### 商人

- 先显示带重置时间的本地商人快照。
- 按地点、角色作用域和重置边界建立缓存键。
- 切换角色只请求缺失作用域，不能静默保留旧角色库存。
- 读取失败时保留上次可用库存并显示过期提示。

### 攻略、目标与本地方案

- 完全本地持久化，不依赖账号实时刷新才能阅读。
- 账号匹配只在打开对应工作区时使用当前缓存。
- 攻略派生关系只保存稳定 ID，不复制完整账号数据。

### AI / light.gg / 社区

- 必须由用户明确触发。
- 用请求参数、账号上下文、实例 ID 和 Manifest 版本生成缓存键。
- 缓存命中时直接展示，后台可重新验证。
- 不参与仓库基础批量扫描，不阻塞首屏。

## UI / UX 合同

### 数据来源可见

每个需要账号数据的页面应能表达：

- 数据来源：本地缓存 / 已读取 / 后台刷新；
- 最近同步时间；
- 是否可能过期；
- 当前是否可执行写操作。

### 几何稳定

- 后台刷新保留原有列表、表格和筛选控件。
- 不因详情完成自动切换 Roll 模式。
- 不因刷新成功改变列数、页面级分栏或焦点位置。
- 加载状态使用邻近提示、`aria-busy` 和进度，不使用整页闪烁。

### 焦点与交互

- 页面打开时将焦点放在第一个可用控制。
- 后台刷新不得抢走焦点。
- 当前操作失败后焦点留在重试或原操作位置。
- 详情弹层关闭后恢复到来源控件。
- 缓存旧数据仍可查看时，不应把所有按钮误设为 disabled；只有确实需要最新数据的写操作才阻断。

### 写操作反馈

- 确认弹层只展示会变化的物品和步骤，使用共享弹层管理焦点陷阱、Escape 与关闭后的焦点恢复，不使用原生 `window.confirm`。
- 页面稳定状态行区分“正在提交”“成功”“部分成功”和“明确失败”；Bungie 写结果返回后立即形成前台终态，不用一条不断变长的对账文案造成布局跳动。
- 后台 `reconciling / delayed` 不保持按钮或页面全局 Loading，也不覆盖已经显示的成功 / 部分成功反馈；需要诊断时由共享后台任务 Dock 展示。
- 写接口成功后立即更新当前装备、位置和光等；失败项保持原状态。轻量 Profile 命中只解除写结果保护，不重复改变页面或再次显示成功 toast。
- 长时间对账进入共享后台任务 Dock；切换菜单、关闭弹层或卸载账号页不能中断任务，也不能抢走当前焦点。

### 离线语义

- 本地数据可读时允许浏览、筛选、比较和编辑本地决策。
- 转移、解锁、切换 Perk、账号刷新等网络动作显示离线原因。
- 不显示假成功 toast，不把本地变更冒充为游戏已同步。

## 分阶段实施计划

### 阶段 1：盘点与接口冻结（P1）

- [x] 列出每个页面的事实数据、派生数据、用户数据和外部数据。
- [x] 冻结 `DataResource` 状态和 freshness 字段。
- [x] 为快照、实例详情、商人、首页、社区数据定义缓存键（现有各域缓存上下文与账号复合键已统一记录）。
- [x] 明确账号切换、Manifest 版本变化和写操作的失效边界，并在快照保存时记录 Manifest revision。
- [x] 更新相关 UI 合同，禁止页面自行决定远程请求时机。

### 阶段 2：实例详情持久化（P1）

> 该阶段已完成：独立账号实例详情缓存、AccountSession 接入、统一资源状态和跨页面订阅均已落地。

- [x] 新增账号实例详情持久化存储（独立 `cache/account-cache.sqlite`，按账号与实例复合主键隔离）。
- [x] 将 `itemDetails` 内存缓存改为“持久化缓存 + 内存热点缓存”。
- [x] 以 `membership_type + destiny_membership_id + instance_id` 隔离账号。
- [x] 保存完整 Socket、reusable plugs、目标进度和规范化详情。
- [x] 保留现有请求去重和 in-flight 合并能力。
- [x] 为已有 `account-snapshot-cache.json` 增加兼容读取，不破坏旧用户数据；旧 `version=2` 文件缺少 revision 时仍可正常加载。

### 阶段 3：统一 AccountDataRepository（P1）

- [x] 在 `packages/services` 实现统一账号数据仓库（共享资源状态、订阅和预取入口）。
- [x] Desktop runtime 的 snapshot 与 item detail 已接入统一仓库；新增资源状态 IPC，invalidate 复用 AccountSession 精确失效并同步清理 repository。
- [x] 将装备详情、仓库同名整理、配装页改为消费同一入口（仓库、详情弹层与配装入口均已共享 renderer 级实例缓存/去重）。
- [x] 增加订阅事件和共享预取入口，并为持久化账号快照生成单调可比较的 `snapshot_revision`；`manifest_revision` 仅在调用方明确提供版本时保存，不伪造资料库版本。
- [x] 实例详情支持 stale-while-revalidate：过期数据立即返回并标记 `stale`，后台触发强制刷新，失败时保留旧详情。
- [x] 首页与商人缓存增加统一 `DataResource` freshness 包装，按 TTL 与活动重置边界自动标记 stale，同时保留旧 API 兼容。

### 阶段 4：页面接入本地优先流（P1）

- [x] 仓库筛选先读快照，再后台刷新，并显示资源来源/过期/同步状态。
- [x] 同名整理按本地缓存补齐完整 Roll（最多 3 并发、实例级去重，已有详情自动跳过）。
- [x] 完整 Roll 有缓存时立即可用，无缓存时显示明确进度。
- [x] 装备详情复用同名整理已读取的实例详情（按账号作用域去重并带短 TTL）。
- [x] 配装求解入口避免同一实例重复打开，详情链路复用共享缓存。
- [x] 账号页和首页保留旧数据直到新数据成功（现有 workspace 状态层与资源 hook 均采用保留旧数据策略）。

### 阶段 5：写操作精确失效（P1）

- [x] 锁定 / 解锁后的 runtime patch 会同步广播实例资源失效，不再让详情仓库继续复用旧条目。
- [x] 转移后更新位置并失效相关详情（account patch + repository item invalidation）。
- [x] Plug 写入后失效 sockets 和 reusable plugs（写入成功后精确失效并重新读取详情）。
- [x] 删除最高光等前台完整账号预刷新、无限权威快照轮询和固定 `15s` 等待。
- [x] 单件装备接入 `EquipItem`，批量装备继续使用 `EquipItems` 并保留逐件结果、部分成功和失败项重试语义。
- [x] 将详情弹窗中的装备、转移、邮政官取回和锁定迁入统一写操作协调器，删除 `verifyAccountPatchUntilConfirmed` 与 feature 内前台轮询。
- [x] 将当前仅服务最高光等的 `highestPowerSync` 单值状态升级为按 `operation_id / instance_id / character_id` 管理的统一操作注册表，支持跨弹层、跨菜单和多个角色并存。
- [ ] 所有单件写接口成功后立即把 committed patch 应用到 renderer Store、AccountSession 和持久化快照；Profile 旧结果不得回退（代码已接入，待真实账号复验）。
- [x] 详情单件操作按类型执行轻量对账：装备读取 `CharacterEquipment 205`，转移读取 `ProfileInventories 102` 或 `CharacterInventories 201`，邮政官读取目标角色库存，锁定读取账号库存与装备轻量组件；Plug 继续使用单实例详情确认。
- [ ] 轻量对账命中后只解除受影响角色或实例的 committed patch 保护；不得二次提交增量或立即执行完整权威账号刷新（代码已接入，待真实账号复验）。
- [x] 禁止 Desktop 写 action 的 `AccountSession.patch` 在 `750ms` 后自动启动完整账号重验证；对账任务或下一次合并刷新负责最终调和。
- [x] 删除详情弹窗的全局 `isRunningItemAction` 长时间占用，只在写接口提交与后台任务登记期间锁定；`syncing / delayed` 期间允许关闭弹层和继续浏览其他装备。
- [x] 账号页接入共享确认弹层、稳定操作状态行、物品级同步标记和后台任务 Dock，写接口返回后立即解除按钮锁定。

### 阶段 5.1：账号刷新去重与范围隔离（P1）

- [x] 首次读取继续组装账号 workspace；后续远程账号刷新不再重复读取标签、目标、Wishlist 等本地用户数据。
- [x] 手动刷新只执行一次非破坏性的远程快照更新；已有同范围 in-flight 时复用 Promise，不在其结束后再排队一次强制请求。
- [x] 启动读取、Manifest 就绪、进入账号页和 10 分钟定时刷新共用同一 renderer in-flight；同一时刻只运行一个账号快照同步计划。
- [x] 自动刷新在已有账号数据时不设置全局“账号刷新中”，不禁用页面按钮或重置焦点、滚动位置。
- [x] 保留现有 Activity History 与社区匹配；账号自动刷新不再先清空结果或重复触发活动读取。
- [ ] 增加账号刷新分阶段诊断：OAuth、Membership、Profile、定义水合、快照构建、持久化与 IPC，并记录请求是否复用或被合并。

### 阶段 6：静态资源缓存（P2）

- [x] 增加图标和 tier overlay 的浏览器本地资源缓存（CacheStorage，失败回退原图地址与内存缓存）。
- [x] 使用 URL + Manifest 版本/语言命名空间管理静态资源；HTTP ETag / Last-Modified 仍由浏览器缓存层负责。
- [x] 网络失败时优先使用本地旧图标（仅限可安全读取的 basic / CORS 响应；opaque 响应继续使用浏览器 HTTP 缓存）。
- [x] 清理缓存时区分 Manifest、账号和用户数据；缓存维护接口只清理选定易失缓存，不触碰 OAuth、配置和用户决策数据。

### 阶段 7：统一后台任务与诊断（P2）

- [x] 账号同步、资料库更新、商人刷新、资源下载接入任务中心（资源下载由 renderer 发起实际写入，任务中心负责去重、超时和结果展示）。
- [x] 设置侧新增缓存分域状态与清理 IPC，可查看路径、大小、更新时间并选择清理范围；后台任务在设置与共享任务 Dock 中统一展示。
- [x] 账号缓存诊断记录 hit、miss、stale、refresh、error，并通过缓存状态 IPC / 诊断导出提供。
- [x] 普通页面只显示“本地缓存 / 缓存已过期 / 后台同步中”等用户可理解状态，不暴露 SQLite、CacheStorage 等实现名词。

### 阶段 8：清理重复实现（P2）

- [x] 已删除仓库、详情和配装入口的主要重复请求路径；其余历史 adapter 继续按菜单边界清理。
- [x] 清理只为兼容旧请求时序而存在的重复 loading 分支；保留的 loading 状态均对应真实首次读取、详情补全或错误恢复流程。
- [x] 合并重复的 account / item detail adapter，renderer 统一经过共享详情 hook，Desktop runtime 统一经过 AccountDataRepository。
- [x] 保留 Web fixture 的共享页面和预览 adapter，不复制 Desktop 页面。

## 验收标准

### 数据与性能

- [x] 冷启动有本地账号快照时，仓库首屏不等待 Bungie 请求。
- [x] 已读取过的实例详情在应用重启后可从本地缓存恢复。
- [x] 同一实例被仓库、详情和配装页使用时不重复请求。
- [x] 同名组只请求缺失或过期实例，而不是请求全部账号装备。
- [x] Manifest 定义查询不访问网络。
- [x] 账号缓存、Manifest 缓存和用户数据可以分别清理。
- [ ] 单次手动刷新最多产生一份完整 Profile 请求，不因自动刷新、写后确认或旧 in-flight 串行追加请求。
- [ ] 单件写操作后台对账不读取完整账号快照；Bungie 写接口返回后前台操作立即结束。

### 正确性

- [x] 账号、角色和实例缓存不会串号。
- [x] 过期缓存明确标记，不伪装成最新数据。
- [ ] 所有游戏内写请求明确成功后，成功项立即更新位置、装备、锁定与光等，失败项保持原状态；旧 Profile 和旧快照不得覆盖已提交增量。
- [x] Manifest 版本变化后不会用旧定义解释新账号数据（快照持久化记录 manifest_revision，定义层按当前 Manifest 版本读取）。
- [x] 派生结果可由缓存事实和版本指纹重新计算。

### UI / UX

- [x] 后台刷新不清空可见列表，不改变页面级布局。
- [x] 完整 Roll 有缓存时立即可用；无缓存时显示进度和原因。
- [x] 当前启用与完整 Roll 不因异步完成自动互换。
- [x] 加载、过期、失败、离线和重试状态均有可理解的中文反馈。
- [x] 刷新过程中保留已有数据与 DOM 结构；仓库、商人等列表使用稳定 key / roving tabindex，后台刷新不会重置当前焦点或滚动容器。
- [x] 写操作失败后保留可继续修改或重试的状态。
- [ ] 所有写操作前台只阻断到 Bungie 返回，后台同步不会让账号页持续 Loading、重复刷新或丢失焦点。
- [ ] 单件与批量写操作都具备成功、部分成功、明确失败和后台对账暂停反馈，且长时间对账可在后台任务 Dock 持续查看，不覆盖前台结果。

### 账号与游戏边界

- [x] 本地标签和目标不会被误认为已经同步到游戏。
- [x] 转移、解锁、拆解和切换 Perk 仍然走真实 action / IPC。
- [ ] 写接口结果与后台 Profile 对账状态在所有入口分层表达；复杂执行按需预检，写后通过轻量后台读取对账，不把 Profile 延迟误报为失败或前台未完成。
- [x] 离线时不会显示假成功。

## 风险与处理

### 缓存数据过期

风险：玩家在游戏内改动装备后，本地仍显示旧数据。

处理：显示同步时间；写接口明确成功后立即提交受保护的 committed patch；普通单项操作使用当前事实，复杂或明确过期的数据才做范围明确的预检；后台 Profile 命中后只解除保护。

### 账号缓存体积增长

风险：长期保存所有实例完整详情导致数据库增大。

处理：按账号隔离；原始响应压缩或分层保存；可回收低频详情，但保留摘要和最近使用记录；设置页提供按账号清理。

### Bungie 限流

风险：首次同步大量实例触发限流。

处理：只预取可见同名组；请求去重；并发上限；指数退避；把后台刷新与手动刷新区分开。

### Manifest 与账号数据版本不一致

风险：旧定义解释新实例，导致名称、Perk 或 Socket 错误。

处理：缓存记录 Manifest 版本；版本不匹配时允许显示基础身份，但阻断依赖定义的执行操作并提示更新资料库。

### 写入中断

风险：本地缓存写成功但游戏写入失败，或反过来。

处理：写操作先调用真实 action；只有 Bungie 明确成功项才提交本地 committed patch，明确失败项保留旧事实；后台轻量对账解除保护，使用 revision 与 `operation_id` 防止旧响应覆盖新结果。

### 多端数据差异

风险：Web fixture、Desktop 真实账号和本地缓存状态不同。

处理：共享 ViewModel 和 `DataResource` 合同；Web 只模拟状态，不伪造真实写入；Desktop 负责最终真实验收。

## 迁移与兼容

1. 保留现有 `account-snapshot-cache.json` 作为只读迁移输入。
2. 首次启动时导入快照摘要到账号缓存库，成功后保留原文件作为可恢复备份。
3. 现有标签、Wishlist、目标、配装和攻略文件不迁移格式，继续由各自 store 管理。
4. 旧内存详情缓存继续作为热点层，但写入账号缓存库后才算成功缓存。
5. 账号切换或缓存损坏时只能丢弃对应账号缓存，不删除用户决策数据。
6. 提供设置页的“清理账号缓存”与“清理全部缓存”，两者必须明确区分。

## 验证策略

本任务属于跨 `services / app / desktop / ui` 的架构改造，完成阶段需要由用户明确要求后再运行本地测试、类型检查、构建或视觉检查。

验收重点：

- Web：首次无缓存、已有缓存、过期刷新、失败重试、同名组详情进度。
- Desktop：真实账号实例、重启复用、账号切换、写操作后失效、执行前后复核。
- UI：`1280 / 980 / 760` 容器宽度、明暗主题、键盘 / 游戏手柄焦点、后台刷新期间几何稳定。

本地自动化验证不属于默认编码循环，由后续本地测试、CI 或 Release 负责。

## 完成定义

当用户打开任何核心工作区时，页面能够优先使用本地缓存完成首屏；同一份账号实例数据可被多个页面复用；后台刷新不会造成内容跳变；Bungie 写接口明确成功后由事件驱动链路立即提交精确增量，Profile 只在后台对账并解除保护，旧快照不能覆盖已提交新状态；离线和过期状态清晰可见；且 Web / Desktop 继续共用同一套 `packages/ui` 产品实现时，T15 才算完成。
