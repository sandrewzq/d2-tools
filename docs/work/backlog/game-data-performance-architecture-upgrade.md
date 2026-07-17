# 资料库与运行时性能架构升级

> 状态：设计草案，待确认后推进
> 更新时间：2026-07-17

## 目标

把当前“整份 Definition JSON 读取、解析并长期驻留内存”的实现，升级为按需查询、紧凑账号快照、合并 Bungie 请求和可观测的运行时架构。

本计划不仅处理 SQLite 迁移，也处理与它相互放大的其他性能问题：

- 主进程同步读取和解析大型 JSON。
- 同一批 Definition 在主进程和临时 worker 中重复加载。
- `AccountSummary` 为数百件装备重复展开 Perk 文案和可复用插槽数据。
- 启动阶段账号、每日、每周和诊断请求同时执行，并重复访问 Bungie membership、Profile 和里程碑接口。
- IPC 传输和 Renderer 长期持有大型对象图。
- 资料库搜索和 Perk 关联查询反复全表扫描。
- 新增 Definition 依赖时触发完整资料库重建，并被错误描述为“修复资料库”。

最终目标是：

1. Renderer 和业务调用方只接触领域查询结果，不接触原始 Definition 表或 SQLite。
2. Desktop 使用 SQLite 作为主要 Bungie Definition 数据源，JSON 只作为 SQLite 未覆盖数据的补充 Adapter。
3. 装备、Perk、活动和商人数据按 hash 或查询条件读取，不再默认加载整张表。
4. 账号列表使用紧凑快照；完整 socket、可切换 Perk 和详情数据在用户打开装备时按需加载。
5. 启动阶段共享 Bungie 会话和请求缓存，避免重复 membership、Profile 和里程碑请求。
6. 资料库更新、查询、IPC 和 Renderer 内存都有明确性能预算和诊断数据。

## 当前基线

2026-07-17 在当前开发机和真实本地资料库上进行只读专项测量，结果如下。

### Definition 存储

| 项目 | 当前数据 |
|---|---:|
| Bungie JSON Definition 类型 | 98 |
| 当前应用声明的必要组件 | 16 |
| 中文必要 JSON | 约 263 MiB |
| 英文装备与 PlugSet JSON | 约 200 MiB |
| 中文 Bungie SQLite ZIP | 约 36.5 MiB |
| 中文 Bungie SQLite 解压后 | 约 341.9 MiB |
| 英文 Bungie SQLite ZIP | 约 35.2 MiB |
| 英文 Bungie SQLite 解压后 | 约 342.6 MiB |
| SQLite Definition 表 | 83 |

当前 16 个必要组件均存在于 Bungie SQLite。另有 16 类 JSON Definition 不在 SQLite 中，因此目标实现必须保留 JSON 补充能力，不能假设 SQLite 覆盖全部 Bungie 数据。

### JSON 加载

| 场景 | 耗时 | 内存变化 |
|---|---:|---:|
| `DestinyInventoryItemDefinition.json` 首次读取和解析 | 约 1.97 秒 | 峰值 RSS 增加约 625 MiB |
| 每日信息 Definition 组合 | 约 2.51 秒 | GC 后 RSS 增加约 320 MiB |
| 英文装备与 PlugSet Definition | 约 2.11 秒 | GC 后 RSS 增加约 280 MiB |

装备 Definition 单文件约 189.5 MiB，其中磁盘读取约 664 ms，`JSON.parse` 约 1304 ms。

### SQLite 点查对照

| 操作 | 耗时 |
|---|---:|
| 打开本地 SQLite | 约 0.5 ms |
| 首条装备查询并解析 | 约 2.15 ms |
| 查询并解析 1000 条装备 | 约 468 ms |
| 平均单条查询并解析 | 约 0.468 ms |
| 1000 次查询后的 RSS 增量 | 约 5.5 MiB |

这些结果证明 SQLite 按需读取有显著收益，但不能直接证明“把 JSON 文件换成 SQLite 文件”就会自动解决问题。调用方必须停止全表加载和大型对象图传输，才能保留收益。

### 当前运行态

开发版 Electron 在账号与首页数据已经加载后，观察到：

- Renderer 私有内存约 1017 MiB。
- 主进程私有内存约 437 MiB。

开发模式会增加 Chromium、source map 和热更新开销，因此不能把 Renderer 的全部内存归因于业务数据。但主进程占用与 Definition JSON 基准基本一致，Renderer 大对象图也需要独立收口。

## 根因分析

### 1. Definition 模块接口过浅

当前主要接口是：

```ts
loadDefinitionComponent(dataDir, component): DefinitionComponentData
```

调用方必须知道：

- Definition 表名。
- 缓存文件位置和语言。
- 整张表何时加载。
- 如何扫描、关联和解释记录。
- 哪些其他表是当前功能的辅助依赖。

这个接口几乎没有隐藏复杂度。删除该模块后，复杂度不会明显增加，因为复杂度已经分散在各 IPC 和领域函数中。它是一个浅模块。

### 2. 账号快照同时承担列表和详情

`AccountSummary` 同时服务首页摘要、账号页、仓库列表、配装、商人上下文和装备详情。为了支持详情和远程切换，它为每件实例展开：

- selected plug 的名称、描述、图标和属性修正。
- instance、character、profile 和 Manifest 提供的全部 reusable plugs。
- objective 文案和插槽状态。

相同 Perk Definition 会在大量装备实例中重复复制，再通过 IPC 传给 Renderer。列表只需要少量摘要，却被迫持有完整详情数据。

### 3. 启动请求没有统一会话

首页启动会并行触发账号、每日和每周读取。当前链路可能重复执行：

- membership 查询 3 次。
- `/Destiny2/Milestones/` 查询 2 次。
- Profile 查询 3 次，且请求的 component 集合存在重叠。
- 主进程和账号 worker 分别解析装备 Definition。

请求并发并没有形成更快的启动，反而造成 CPU、磁盘、网络和 Bungie 限流压力同时上升。

### 4. 搜索与关联依赖全表扫描

当前装备搜索通过 `Object.values(definitions)` 扫描全部装备。Perk 搜索还会扫描装备表建立关联，再扫描装备表查找命中项。数据规模继续增长后，搜索时间会随表大小和结果数增长。

### 5. 资料库更新没有同步计划

新增一个必要 Definition 后，状态层只知道“缺失必要组件”，更新 worker 会创建全新 staging 目录并重新下载全部必要组件。正常能力升级、Bungie 数据更新和文件损坏没有被建模为不同状态。

## 设计原则

### 深模块

新架构必须把存储格式、hash 编码、缓存、查询计划、语言、更新和回滚隐藏在少量稳定接口后面。

调用方只描述需要的领域结果，不描述需要打开哪张表、读取哪个文件或执行哪条 SQL。这样才能获得：

- **Leverage**：同一份查询、缓存和更新能力服务账号、资料库、商人、活动和详情。
- **Locality**：SQLite、JSON 回退和 Bungie 变更集中在少数模块中处理。
- **Depth**：接口保持小，复杂实现留在模块内部。

### Seam 位置

存储 Seam 放在 `packages/services`，不是 `packages/core`、Renderer IPC 或 UI。

- `packages/core` 只保留领域类型、纯投影和确定性分析。
- `packages/services` 持有 Bungie、SQLite、JSON、文件系统和运行时缓存 Adapter。
- `packages/app` 只消费领域 DTO 和构建 ViewModel。
- Desktop 主进程负责组合模块、worker 和 IPC。
- Renderer 不直接接触 SQLite、Definition 表名或原始 Bungie Profile。

### Adapter 真实性

Definition 读取 Seam 有三个真实 Adapter：

1. SQLite Adapter：Desktop 正式主数据源。
2. JSON Supplement Adapter：读取 SQLite 未覆盖的 Definition。
3. Memory Adapter：Prototype 和模块接口测试。

这不是为未来假设创建的抽象，而是当前已经存在的多实现需求。

## 目标架构

```text
Renderer / packages/app
        |
        |  compact domain DTO
        v
Desktop domain IPC
        |
        v
RuntimeCoordinator
  |          |             |                 |
  v          v             v                 v
GameDataCatalog     AccountSession     BungieSession     ManifestLifecycle
  |                       |                  |                  |
  |                       |                  |                  |
  v                       v                  v                  v
DefinitionReader    compact snapshot   Bungie HTTP      download / validate
  |                  detail on demand   cache / dedupe    activate / rollback
  |
  +-- SQLite Adapter
  +-- JSON Supplement Adapter
  +-- Memory Adapter
```

### 建议代码落点

| Module | 建议位置 | 责任 |
|---|---|---|
| `GameDataCatalog` | `packages/services/src/gameData/` | 领域查询、结果组装和内部 DefinitionReader 编排 |
| `DefinitionReader` | `packages/services/src/manifest/` 内部目录 | 按 hash 批量读取，隐藏 SQLite 与 JSON |
| `ManifestLifecycle` | `packages/services/src/manifest/` | metadata、下载、解压、校验、激活和回滚 |
| `BungieSession` | `packages/services/src/bungie/` | token、membership、请求合并、TTL 和限流 |
| `AccountSession` | `packages/services/src/account/` | 紧凑快照、详情水合、缓存和局部失效 |
| `RuntimeCoordinator` | `packages/desktop/src/main/runtime/` | Desktop 启动顺序和 worker 生命周期 |
| 查询 worker | `packages/desktop/src/main/workers/` | 长生命周期 SQLite 连接和重查询 |
| 纯投影与领域类型 | `packages/core/src/` 对应领域 | 不包含 HTTP、文件系统或 SQLite |
| 跨端查询状态与 ViewModel | `packages/app/src/` 对应领域 | 消费紧凑 DTO，不接触存储实现 |
| Desktop 契约 | `packages/desktop/src/renderer/api/*Api.ts` | 分域 IPC DTO，不扩大聚合文件 |

`packages/services` 根入口只导出稳定的领域 Interface，不导出 SQLite Adapter、SQL、连接对象或内部 DefinitionReader。Desktop composition root 负责选择正式 Adapter，Prototype 使用 Memory Adapter，Web 继续通过远端或内存 Adapter 接入。

### 1. GameDataCatalog

`GameDataCatalog` 是上层使用的深模块。建议外部接口只暴露领域操作：

```ts
type GameDataCatalog = {
  searchItems(input: ItemSearchInput): Promise<ItemSearchPage>;
  searchPerks(input: PerkSearchInput): Promise<PerkSearchPage>;
  getItemDetail(input: ItemDetailInput): Promise<ItemDefinitionDetail | null>;
};
```

接口不暴露：

- SQLite 表名。
- SQL。
- `DefinitionComponentData`。
- 原始 JSON 文件路径。
- signed / unsigned hash 转换。
- 哪些辅助表用于组装装备详情。

账号、商人、每日和每周模块需要的批量 Definition 读取通过 `GameDataCatalog` 的内部 Seam 完成，不从 services 根入口导出通用全表读取方法。

### 2. DefinitionReader

`DefinitionReader` 是 `GameDataCatalog`、`AccountSession` 和首页数据模块内部使用的存储接口。建议能力控制在：

```ts
type DefinitionReader = {
  get(table: DefinitionTable, hash: number, language?: string): Promise<DefinitionRecord | null>;
  getMany(table: DefinitionTable, hashes: readonly number[], language?: string): Promise<Map<number, DefinitionRecord>>;
};
```

禁止提供默认 `all()` 或返回完整表的方法。确有批处理需求时，通过专门的离线索引构建流程处理，不能让普通请求退回全表加载。

SQLite Adapter 负责：

- Bungie unsigned hash 与 SQLite signed integer 的转换。
- BLOB 解码和 JSON 解析。
- prepared statement 缓存。
- 小型按表 LRU 缓存。
- 连接生命周期和只读模式。

JSON Supplement Adapter 只读取 SQLite 缺失的组件，不重新成为默认主数据源。

### 3. ManifestLifecycle

`ManifestLifecycle` 负责资料库全生命周期，建议接口为：

```ts
type ManifestLifecycle = {
  getStatus(): Promise<ManifestRuntimeStatus>;
  ensureReady(input?: { force?: boolean }): Promise<ManifestRuntimeStatus>;
  repair(): Promise<ManifestRuntimeStatus>;
};
```

内部实现负责：

- 获取 Bungie Manifest metadata。
- 下载当前界面语言的 SQLite ZIP。
- 解压到 staging。
- 校验 SQLite header、必要表、版本和基本记录数。
- 构建搜索 sidecar index。
- 下载必要的 JSON-only supplements。
- 通知查询 worker 关闭旧连接。
- 原子切换目录并重新打开连接。
- 失败时保留旧资料库并回滚。

状态必须区分：

- `ready`：本地可用。
- `update_available`：Bungie 有新版本。
- `supplement_required`：应用新增了 SQLite 未覆盖的数据依赖。
- `repair_required`：文件损坏、校验失败或必要表缺失。
- `updating`：后台更新中。
- `failed_but_usable`：更新失败，但旧数据仍可用。

正常功能迭代不得再统一显示“修复资料库”。

### 4. AccountSession

`AccountSession` 负责 Bungie 账号数据的运行时生命周期。建议对外接口为：

```ts
type AccountSession = {
  getSnapshot(input?: { freshness?: "cached" | "refresh" }): Promise<AccountSnapshot>;
  getItemDetail(input: AccountItemDetailRequest): Promise<AccountItemDetail>;
  invalidate(input: AccountInvalidation): void;
};
```

`AccountSnapshot` 只包含列表和工作台需要的数据：

- 账号、角色和位置摘要。
- 装备 hash、instance id、bucket、光等、锁定和装备状态。
- 护甲最终属性摘要。
- 当前已选 plug hash 和必要的短名称。
- 配装引用所需的最小字段。

以下数据移出账号快照，在打开详情时按需获取：

- 全部 reusable plugs。
- 完整 Perk 描述和属性修正。
- objective 文案。
- 完整插槽候选和 Manifest Perk 池。
- 详情专用来源、版本和知识数据。

主进程保存规范化账号实体，Renderer 通过 instance id 和 hash 引用数据，避免在多个菜单复制完整对象。

写操作成功后优先应用局部 patch，并在后台重新校验受影响实体。锁定、转移、装备和插槽切换不应默认触发完整账号 Profile 重建。

### 5. BungieSession

`BungieSession` 隐藏 token 刷新、membership 解析、请求去重、TTL、限流和 stale-while-revalidate。

内部能力包括：

- 同一时间相同请求只保留一个 Promise。
- membership 在合理 TTL 内复用。
- Profile component 按集合记录，已有 superset 时复用。
- 每日与每周共享 `/Destiny2/Milestones/` 结果。
- 账号 Profile 中已经包含的 character、equipment 和 socket component 不再次请求。
- Bungie 限流或网络失败时返回仍有效的缓存，并标记数据时间。

`fetchBungieJson` 作为 true external 的 HTTP Adapter，测试使用 mock Adapter。URL、component 编号和重试细节不进入上层接口。

### 6. RuntimeCoordinator

`RuntimeCoordinator` 负责启动优先级，不负责具体业务计算。

推荐启动顺序：

1. 读取轻量配置和资料库状态，尽快显示产品外壳。
2. 打开 SQLite 和读取持久化的紧凑账号快照。
3. 首屏先显示缓存数据和更新时间。
4. 后台刷新账号与首页简报，共享 `BungieSession`。
5. 延后应用更新检查、社区增强和非当前菜单数据。

每日和每周信息合并为一个 `HomeBriefing` 请求，内部共享里程碑、Profile 和 Definition 查询，Renderer 不再同时调用两个独立 IPC。

## 搜索索引

Bungie SQLite 的 Definition 表主要只有 `id` 和 `json BLOB`，仅换用 SQLite 不会自动获得高效名称搜索。

资料库更新完成后，需要在本地构建 sidecar SQLite index，建议包含：

- `item_search`：hash、中文名、英文名、归一化名称、类型、稀有度、bucket、图标和可搜索文本。
- `perk_search`：hash、名称、描述和类别。
- `item_plug_relation`：装备 hash、plug hash、socket index 和来源类型。
- `item_version_relation`：同名版本和 canonical identity。
- 必要的来源、collectible 和活动关系索引。

普通搜索只查询 sidecar，命中后再由 `DefinitionReader.getMany()` 读取少量完整记录。

索引是可重建衍生数据，不进入用户备份；损坏时重建索引，不把整个资料库标记为损坏。

## Renderer 与 IPC 收口

### IPC

- IPC 只返回领域 DTO，不返回原始 Definition 或 Bungie Profile。
- 账号快照、搜索结果和详情 DTO 必须可测量序列化大小。
- 搜索返回分页或明确上限。
- 装备详情、同名版本、实时来源和社区数据允许并行，但必须支持请求序号或取消，避免旧响应覆盖新选择。
- 新增契约进入对应 `api/*Api.ts`，不扩大 `api/types.ts` 和 `api/client.ts`。

### Renderer 状态

- 账号实体按 instance id 规范化，菜单只订阅自己使用的 slice。
- 详情状态与账号列表状态分离，关闭详情后允许释放大型详情数据。
- 资料库状态和后台任务由单一共享 store 持有，避免多个 hook 重复订阅和重复读取。
- 当前仓库首批渲染限制继续保留；完成紧凑快照后再根据测量决定是否引入虚拟列表。
- 菜单级代码拆分属于低优先级优化。当前 Renderer 主 chunk 约 431 KiB，不是主要瓶颈。

## 本地 JSON 的处理范围

不应把所有本地 JSON 一并迁入 SQLite。

以下数据体积小、写入频率低、结构简单，可以继续使用有上限的 JSON：

- 配置。
- 资料库历史和收藏。
- 操作日志。
- 本地标签和备注。
- 本地方案。
- 个人推荐和目标规则。

SQLite 优先承载高容量、按 hash 查询、需要关系索引或频繁筛选的数据。避免为了统一技术栈，把简单数据引入不必要的 schema 和迁移成本。

## 分阶段实施计划

### 阶段 0：决策门禁与可观测性

目标：确认 SQLite 驱动和 Release 链路，建立可重复基线。

- `实现: 资料库性能诊断`：记录主进程启动阶段、Definition 查询、IPC payload 大小和账号快照大小。
- `实现: SQLite 驱动打包 spike`：比较升级 Electron 后使用内置 `node:sqlite` 与 `better-sqlite3` 两条路径。
- `整理: 性能预算`：在打包版 Windows 环境确认本计划中的暂定预算。

决策门禁：必须证明开发版、打包版、安装版和 Release workflow 都能稳定打开、查询、关闭和替换 SQLite，才能进入正式迁移。

### 阶段 1：建立 Catalog Seam

目标：先改变调用方式，再改变存储实现。

- `实现: DefinitionReader 接口与 Memory Adapter`。
- `实现: JSON DefinitionReader Adapter`：复用现有 JSON，行为保持不变。
- `实现: GameDataCatalog 装备详情 tracer bullet`：先迁移 `items:detail`。
- `实现: GameDataCatalog 装备搜索 tracer bullet`：搜索调用方不再直接拿完整 Definition 表。
- `整理: ManifestService`：删除或收窄当前未落地的通用 `getDefinition(tableName, hash)` 根接口，避免两套抽象长期并存。

这一阶段完成后，即使仍使用 JSON，上层也不再依赖存储格式。

### 阶段 2：紧凑账号快照

目标：优先降低 Renderer 内存和 IPC 数据量。

- `实现: AccountSnapshot`：列表只保留实例、位置、当前选择和必要摘要。
- `实现: AccountItemDetail`：完整 socket 和 reusable plug 按需读取。
- `实现: AccountSession`：缓存规范化实体和最近成功快照。
- `实现: 账号快照持久化`：应用启动先显示脱敏的本地快照，再后台刷新。
- `实现: 写操作局部失效`：成功后 patch 受影响实例，并后台重新校验。
- `整理: AccountSummary 调用方`：账号、仓库、配装、详情和商人逐步改用紧凑契约。

阶段完成后，Renderer 不再持有所有装备的完整可复用 Perk 文案。

### 阶段 3：SQLite 主数据源

目标：用 SQLite Adapter 替换大型 JSON 主缓存。

- `实现: SQLite DefinitionReader Adapter`。
- `实现: SQLite ZIP 下载与解压`。
- `实现: SQLite 必要表和版本校验`。
- `实现: 查询 worker 与连接生命周期`。
- `实现: staging 原子切换和失败回滚`。
- `实现: JSON Supplement Adapter`：只覆盖 SQLite 缺失组件。
- `整理: 资料库状态语义`：区分可更新、待补充和需修复。

SQLite 查询放在长生命周期 worker 中，主进程和 Renderer 不执行大文件解析。同步 SQLite 驱动不得在 Electron UI 主线程执行可能扫描大量行的查询。

### 阶段 4：搜索与关系索引

目标：消除装备、Perk 和关联装备的全表扫描。

- `实现: item_search sidecar`。
- `实现: perk_search sidecar`。
- `实现: item_plug_relation`。
- `实现: 同名版本和 canonical identity 索引`。
- `实现: 中英文轻量索引`：英文按需下载和构建，不默认长期保留完整英文 SQLite。
- `整理: core 搜索函数`：保留纯结果投影，移除必须接收完整 Definition 表的入口。

### 阶段 5：BungieSession 与启动协调

目标：减少重复网络请求和启动争用。

- `实现: BungieSession 请求去重和 TTL`。
- `实现: Profile component superset 复用`。
- `实现: HomeBriefing`：合并每日和每周读取。
- `实现: RuntimeCoordinator 分阶段启动`。
- `实现: stale-while-revalidate`：优先展示缓存，再后台更新。
- `整理: core 网络调用`：把账号、每日和每周中的 HTTP 移到 services Adapter，core 只保留纯映射。

### 阶段 6：Renderer 状态与交互性能

目标：在数据体积收口后处理剩余 Renderer 热点。

- `实现: 账号实体规范化 store`。
- `实现: 资料库状态与后台任务共享 store`。
- `实现: 详情关闭后的大型状态释放`。
- `整理: ViewModel selector`：按稳定输入缓存账号、仓库和详情投影。
- `整理: 仓库筛选索引`：只有测量仍超预算时才增加预计算索引或虚拟列表。
- `整理: 菜单级代码拆分`：只有启动 JS 解析仍超预算时推进。

### 阶段 7：遗留实现退场

目标：删除双轨复杂度。

- `整理: 大型 JSON 主缓存退场`。
- `整理: loadDefinitionComponent 调用点清零`。
- `整理: 临时兼容 DTO 和旧 IPC 清理`。
- `整理: 旧账号详情展开字段清理`。
- `整理: 诊断与用户文档更新`。

至少经过一个稳定 Release 并确认回滚路径有效后，才能删除 JSON 主数据回退。JSON-only supplements 继续保留。

### 阶段依赖与并行关系

- 阶段 0 是所有后续阶段的门禁。
- 阶段 1 是 SQLite、账号详情按需加载和搜索索引的共同前置。
- 阶段 2 可以先使用 JSON Adapter 落地，不需要等待 SQLite 完成，并且应优先解决 Renderer 大对象图。
- 阶段 3 完成后才能让 SQLite 成为默认主数据源。
- 阶段 4 依赖阶段 3 的 SQLite 生命周期，但 sidecar schema 可以在阶段 1 后提前设计。
- 阶段 5 与阶段 2、3 大部分独立，可以在阶段 0 后单独推进；它负责网络和启动收益，不应被 SQLite 迁移长期阻塞。
- 阶段 6 必须基于阶段 2、3、5 完成后的新基线决定范围，避免优化已经被数据收口消除的问题。
- 阶段 7 只能在全部正式调用切换且 Release 回滚路径验证后推进。

## 暂定性能预算

以下预算需要在阶段 0 的打包版基线中确认：

| 指标 | 目标 |
|---|---:|
| 打包版外壳可交互 | 1.5 秒内 |
| 缓存账号首页可见 | 1.0 秒内 |
| 本地装备详情 p95 | 50 ms 内 |
| 本地装备搜索 p95 | 100 ms 内 |
| 本地 Perk 搜索 p95 | 120 ms 内 |
| AccountSnapshot IPC payload | 10 MiB 内 |
| 单个 AccountItemDetail IPC payload | 250 KiB 内 |
| 首页稳定后主进程私有内存 | 250 MiB 内 |
| 账号与仓库加载后 Renderer 私有内存 | 450 MiB 内 |
| 主进程同步读取单文件 | 不允许超过 10 MiB |
| 普通请求全 Definition 表扫描 | 0 次 |
| 同一刷新窗口 membership 请求 | 最多 1 次 |
| 同一刷新窗口里程碑请求 | 最多 1 次 |

性能预算用于发现回归，不应在普通 CI 中使用依赖机器绝对时间的脆弱断言。CI 重点验证接口行为、查询结果、IPC 契约和架构依赖；绝对性能在本地专项诊断和 Release 环境记录。

## 验证策略

这次升级涉及 SQLite、IPC、数据写入、原子替换和关键架构 Seam，属于允许增加最小行为测试的高风险范围。

测试只通过模块 Interface 验证：

- Memory Adapter 与 SQLite Adapter 对同一 fixture 返回一致领域结果。
- ManifestLifecycle 更新失败后旧资料库仍可查询。
- JSON-only Definition 能通过 supplement 回退读取。
- AccountSnapshot 不包含完整 reusable plug 文案，详情请求能恢复完整数据。
- 同一 Bungie 请求在并发调用中只执行一次。
- 写操作 patch 后目标实例状态正确，并能后台重新校验。
- Renderer Interface 契约不返回原始 Definition 表或 Bungie Profile。

不新增读取源码字符串、SQL 文本、import 顺序或 CSS 的测试。

## 风险与对策

### Electron SQLite 驱动

风险：当前 Electron 33 使用 Node 20，不能直接假设可用内置 `node:sqlite`。

对策：阶段 0 同时验证 Electron 升级和 `better-sqlite3`。以 Release 安装包稳定性为第一决策条件，不仅比较本地开发体验。

### SQLite 表覆盖不完整

风险：SQLite 83 张表少于 JSON 的 98 类 Definition。

对策：维护明确的 SQLite 表能力清单；未覆盖数据通过 JSON Supplement Adapter 按需下载，不把缺少 JSON-only 组件视为整库损坏。

### Hash 编码

风险：Bungie hash 常以 unsigned 32-bit 表示，SQLite `id` 可能使用 signed integer。

对策：转换逻辑只存在于 SQLite Adapter，并通过固定样例覆盖高位 hash。

### Windows 文件锁

风险：SQLite 连接未关闭时无法原子替换数据库。

对策：ManifestLifecycle 与查询 worker 使用显式 quiesce / close / swap / reopen 协议；超时则保留旧库并终止切换。

### 双轨长期存在

风险：JSON 和 SQLite 两套正式实现长期并存会增加维护成本。

对策：JSON Adapter 的正式职责限定为迁移回退和 JSON-only supplements；每阶段都记录待删除调用点，阶段 7 完成主数据退场。

### 账号缓存陈旧

风险：缓存快照和局部 patch 可能暂时偏离 Bungie 真值。

对策：每份快照带 `refreshed_at`、来源和 stale 状态；写操作成功后局部 patch，随后后台 revalidate；失败时明确保留旧状态和提示。

## 不在本计划范围

- 重做现有产品视觉。
- 把所有小型本地 JSON 都迁入 SQLite。
- 为 Web 或移动端直接暴露本地 SQLite 文件。
- 让 Renderer 执行 SQL。
- 在迁移期间重写装备、商人、仓库或配装领域规则。
- 为追求统一而删除仍有价值的 JSON-only Definition。

## 完成标准

1. 普通运行链路没有 `loadDefinitionComponent` 全表读取。
2. Desktop 主数据源为 Bungie SQLite，JSON 仅用于明确的 supplement。
3. 装备搜索、Perk 搜索和详情使用按需查询与 sidecar index。
4. AccountSnapshot 不携带所有 reusable plug 完整文案，详情按需加载。
5. 启动账号、每日和每周共享 BungieSession，不再重复 membership 和里程碑请求。
6. 主进程和 Renderer 达到确认后的性能预算，诊断导出能显示关键耗时和 payload 大小。
7. 资料库更新失败时旧数据继续可用，SQLite 切换可回滚。
8. Prototype、Web 和 Desktop 继续通过 services / app / ui 的既有分层消费能力，不把平台存储实现泄漏到共享 UI。
