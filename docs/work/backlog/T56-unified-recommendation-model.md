# T56：统一推荐模型与多来源导入

> 状态：✅ 已完成并关闭（2026-09-19 用户验收通过）
> **判据① 五路对拍 / 判据② 边界扫描：全绿（2026-09-17 复跑，10 条用例）。**
> Layer 1 / 2 / 3（含 L3-0～L3-4b）/ 4 / 4.5 / 5 均已完成，S8 v11 与判据复跑已过；**Layer 6 三条已全部闭合**。
> **判据① 与判据② 之外已完成**：L3-2c 归约合并、Layer 6 三条、判据① 复验时发现并拍板的**分组粒度分叉**（按来源名分多行），以及同一轮实测撞出并修掉的**「停用整份导入」在 CSV 上失效**，以及**导入期校验（原 T60，含 4 处变异验证）**。
> **Bug #80–#87 的人工复验已于 2026-09-19 全部通过**；下方「如实记录」里主动押后的那一项（验收报告归入诊断）仍未做，属主动押后、不是欠账。**本任务已无未完成项。**
> 合并说明：原 T55 / T57 / T59 / T60 / T61 与 Bug #80–#87 已并入本文件，编号冻结作追溯；`docs/todo.md` 已删除 T56 行。
> 本文件只留**当前计划与未完成事项**，已完成工作只记关键结论。逐次执行记录与原始设计稿见 git 历史，不再留档。

## 口径（用户已定，执行时不得偏离）

1. **对用户不存在「DIM 愿望单」概念**——DIM 文本只是**数据来源格式之一**，与人工推荐 CSV 同级。面向用户不出现格式名。
2. **不存在硬编码来源与判定**：来源名一律取 `source_label`；判断只由来源规则产生。
3. **可见性对称**：一条规则覆盖的每个版本（普通版 / 专家版 / 失时版）在各自页面上都要看到它，无主次。**「减少显示」＝应用端错误。**
4. **导入身份 = 用户给的名字**，强制二选一：新建（必填名、不得撞名）/ 覆盖（同名，**全删全增**）。覆盖判定用命名，不用来源名 / 内容指纹。
5. **不做临时双写、不做自动迁移**（做法一）：读取 / 写入 / 状态门 / 管理面 / 导出同一次落地，落地后 **CSV 需用户重新导入一次**（DIM 侧不重导）。这条对外代价**已于 2026-09-17 告知用户并获得确认**。
6. 项目规则：**Agent 自动验证默认禁用**，只有用户明确要求时才跑本地测试 / 构建 / 打包。

## 架构目标（唯一判据）

### 分层与格式边界

```text
① 格式（允许不同）
   CSV 文件        DIM 文本
        │              │
② 解析 / 适配  ← 唯一允许按格式分支的层
        └──────┬───────┘
               ▼
③ 来源实例 + 规则（同一套模型）  一个格式可以产出多个来源实例
               ▼
④ 事实（同一套模型）
               ▼
⑤ 消费（同一套路径）判定 / 筛选 / 卡片 / 详情 / 排序
```

**允许出现在 ② 的差异**：字段映射、清洗、校验、来源实例切分。
**一律禁止出现在 ③④⑤**：`kind === 'dim'`、`startsWith("dim:")`、`sourceId` 前缀判别、`isDim*`、按类型写死的排序权重 / 文案 / 槽位名、格式名进事实主键。

### 不变量

**I1（核心）** 对任意来源事实，把来源类型 `dim` ⇄ `csv` 互换，判定、筛选、卡片、详情、排序的输出必须逐字段相同。仅允许来源名与署名文案不同。

**I2** 新增一种来源格式时，只允许新增 ① 与 ② 的代码；不得新增 ③④⑤ 的判定、筛选、排序分支。

**I3** 任何按来源类型（含 `sourceId` 前缀、`kind` 判别位、格式名进主键）分叉的代码都是缺陷，无论它当前是否可被用户观察到。

**I4** 同一格式产出多个来源实例必须是模型的一等能力；任何「一个格式 = 一个来源」的隐含假设都是缺陷。

### 验收判据

完成判据 = 下面**两组测试全部转绿**。不以「测试全绿、类型检查 0 错误」代替。

| | 内容 | 状态 |
|---|---|---|
| ① | `packages/ui/test/recommendation-source-parity.test.ts`——同构事实（`dim:x` / `csv:x`）跑五路（摘要 / 排序 / 筛选 / 卡片 / 冲突清理保护）断言逐字段相同 | ✅ 全绿 |
| ② | `packages/app/test/recommendation-source-boundaries.test.ts`（架构测试）——③④⑤ 层静态扫描禁止模式，命中即失败；已进 `scripts/test-classification.mjs` 架构白名单 | ✅ **0 处违例** |

两组分工：① 管**值级**（事实投影逐字段相等），② 管**结构级**（控制流与命名）——像 `vaultRecommendationPrimaryFilterLabel(filter, isDim)` 这种「函数多了一个 `isDim` 参数」，值级对拍测不出来。

**权威判定**：口径以 `ui-specs/application-workspaces.md` 为准（所有来源同级，按符合程度排序，平级按来源名）；`docs/development.md` 与代码是待修正方。

## 总状态

| 层 | 状态 |
|---|---|
| 判据① 五路对拍 | ✅ 全绿 |
| 判据② 边界扫描 | ✅ 0 处违例（视图层 / 服务层 / 存储层全部清零） |
| Layer 1 死代码清理 | ✅ |
| Layer 2 来源身份抽象 | ✅ 来源分类改由「住在哪张表」决定，键不再携带类型 |
| Layer 3 · L3-0 回归网 / L3-1 schema v9 / L3-2a 标签表三合一 / L3-2b 删重复通道 | ✅ |
| Layer 3 · **L3-2c 归约合并** | ✅ 已完成并变异验证（2026-09-16）；连带的分组粒度分叉**已拍板并落地** |
| Layer 3 · S3′-2 → S7 一次切换 | ✅ 代码完成，判据已复跑（2026-09-16） |
| Layer 3 · S8 schema v11 删旧 CSV 表族 | ✅ 代码与测试完成，判据已复跑（2026-09-16） |
| Layer 3 · L3-4 合同改写余项 | ✅ 已核（2026-09-16）：`development.md` 已无 `DIM Wishlist` / `dim_wishlist` / 三处旧口径短语 |
| Layer 3 · **L3-4b 详情页推荐区去分叉** | ✅ 代码完成，四门判据全绿（2026-09-16） |
| Layer 4 / 4.5 / 5 | ✅ |
| Layer 6 不变量固化 | ✅ 三条全部闭合（I1–I4 进 `development.md`、测试类型检查盲区修掉、生产者侧断言补上） |

**背景一句话**：本次审计推翻了 T56 ✅ / T59 ✅ 的旧完成声明——统一只发生在**接口层**，存储层 CSV 与 DIM 是两套表、两条 `requirements` 投影路径。根因是**投影层未合流**，不是「表未合流」。

---

# 未完成工作

## S8 · schema v11 删旧 CSV 表族（✅ 代码与测试完成，判据已复跑）

**改动边界**

- **删 5 张表**：`recommendation_sources`、`weapon_recommendations`、`weapon_recommendation_item_ids`、`weapon_recommendation_purposes`、`weapon_recommendation_perks`。
- **删 6 个 metadata 键**：`schema_version`、`source_fingerprint`、`imported_at`、`semantic_validation_version`、`validated_manifest_version`、`dataset_revision`。
- **`knowledge_metadata` 表本身不删**——（2026-09-17 更正：它现在**没有任何读写方**。当初的理由是 `dimWishlistUpdates.ts` 仍用它做在线更新缓存，而那条固定地址在线导入已随 T63 删除；表仍保留，因为它是 `hasRecommendationTables` 识别 v1 旧库的标志之一，删表要连识别口径一起改，属于另一次 schema 变更。）
- v10 的键改写 `unifyDocumentKeys` 已落地；**S8 不再改键**，只做删除 + 探针更新。

**已落地**

| 项 | 内容 |
|---|---|
| 版本与阶梯 | `recommendationDatabaseSchemaVersion` 10 → 11；删 `recommendationSemanticValidationVersion`；删 `shouldRebuildCurated` 分支与 `migrateCuratedRecommendationRules` |
| `dropLegacyCsvTables` | 新函数，由废弃的 `dropCuratedRecommendationTables` 改写而来：DROP 5 张表 + DELETE 6 个 metadata 键。**自门控**（`IF EXISTS` + `knowledge_metadata` 存在才 DELETE），因此**无条件调用**——不受版本区间约束，全新库上是空操作 |
| `dropRecommendationTables` | 只删当前模型的表（并补上两个子表，顺序子先于父）；CSV 表交给 `dropLegacyCsvTables`，两边不重复列举 |
| `hasRecommendationTables` | v1 探针缩到 `knowledge_metadata` + `external_recommendation_sets`（这两张每个版本都有，判别力不减） |
| 大 `exec` | 删掉 5 条 CSV `CREATE TABLE` 与 8 条 `CREATE INDEX` |

**测试**

- `packages/services/test/recommendationRuleStorage.test.ts` 新增 `v10 → v11 upgrade` 两条用例：**手工搭真 v10 库**（先按当前 schema 建库、再补回 5 张 CSV 表 + 写一行真数据 + 6 个 CSV 键 + 2 个 DIM 在线缓存键 + 一条停用选择，最后 `user_version = 10`）。断言：版本变 11；5 张表消失；`knowledge_metadata` 保留且只剩 `etag` / `latest_revision`；`PRAGMA foreign_key_check` 为空；DIM 规则与停用选择逐条不变；第二次打开幂等。
- 原 `v8 → v10` 用例更名为 `v8 → v11`，版本断言 10 → 11。

**判据**：✅ 已随 2026-09-16 判据复跑通过（见〈判据复跑〉一节）。

## 测试改写（S3′-2 → S7 的连带，✅ 已完成）

| 文件 | 改动 |
|---|---|
| `packages/services/test/weaponRecommendationKnowledge.test.ts` | 按新契约重写：`importWeaponRecommendationCsv` 补 `target`；`validation_state` 断言删除；读取一律经 `createDefaultCommunityPerkService`（库里可能同时住两种格式）；导出改 2 参（传入定义池反解名字）；管理面断言改为「可管理来源 = 导入文档」 |
| 同上 · 新增三条用例 | **同名新建冲突 / 覆盖未命中报错 / 空名字拒绝**；**覆盖 = 全删全增**（来源实例 2→1、无差量 `removed_rules`）；**清空只清 CSV**（愿望单文档与 DIM 来源原样留着） |
| `packages/services/test/recommendationIdentityExpansion.test.ts` | 读取侧改走组装后的服务（`csvRecommendationSource` 适配器）；`SourceOptions.weaponIdentityRelations` 形参删除；`createWeaponRecommendationKnowledgeSource` 引用清除 |
| `packages/services/test/recommendationRuleStorage.test.ts` | 见上方 S8 的 v10→v11 两条新用例；原 v8 用例版本断言随之更新 |

**一处口径修正（写测试时发现，值得记）**：管理面的「可管理来源」是**导入文档**（用户命名的那个），不是文件内部的「推荐来源」列值——后者只是文档下的来源实例。这与 DIM 侧「一份导入 = 一个可管理来源」同构，不是两种粒度。旧测试期望列出来源标签为 `["Aegis推荐","LGpig推荐"]`，那是按实例投影的旧行为。

## 判据复跑（✅ 2026-09-16 全绿，用户已授权本次验证）

1. `pnpm typecheck` 7 包 —— ✅ 通过（core / http / services / app / ui / desktop / web）；
2. `pnpm test:behavior` —— ✅ 134 文件 / 522 用例（519 + 生产者侧分组键 + 跨格式分组粒度 + 停用继承三条新用例）；
3. `pnpm test:architecture` —— ✅ 64 用例 / 边界扫描 0 处违例，且**没有往白名单加文件**（反而把 7 条里 4 条死路径 + 3 条零作用条目全部清空，见 L3-4b）；
4. 全仓 grep 五张旧表名，只剩 `recommendationDatabase.ts` 的迁移 —— ✅ 已核（无测试引用，仅 `dropLegacyCsvTables` 的 5 行 DROP）；
5. `import_mode` 从预览 / 结果 / 契约 / UI 文案中彻底消失 —— ✅ 已核（全仓 0 处）；
6. `pnpm docs:check` —— ✅ 文档策略 + 编码检查通过。

> 复跑发生在 L3-4b（详情页去分叉）落地之后；清空白名单后 architecture 从 64 → 66 用例（新增两条自检），仍全绿。
> **2026-09-16 第二次复跑（L3-2c / Layer 6 / 分组粒度落地后）**：typecheck 7 包 ✅、behavior 134 文件 / **522** 用例 ✅、architecture 15 文件 / 66 用例 ✅、`pnpm docs:check` ✅。
> **2026-09-16 第三次复跑（导入期校验落地后）**：typecheck 7 包 ✅、behavior 135 文件 / **533** 用例 ✅（+11 条导入期校验用例）、architecture 15 文件 / 66 用例 ✅、`pnpm docs:check` ✅。

## Layer 6 · 不变量固化

1. ✅ 把 I1–I4 写进 `docs/development.md`（新增 **2.7 推荐来源统一模型**：分层图 + I1–I4 + 两个守卫测试 + 权威判定指向 ui-specs），并同步修掉该文件的按类型规则（见 L3-4）。
2. ✅ **修掉判据① 自身的类型检查盲区**。处置：两个包各加 `tsconfig.test.json`（`noEmit`，`include` 扩到 `test/**`），`typecheck` 脚本改为 `tsc -p tsconfig.json --noEmit && tsc -p tsconfig.test.json`。

   **口径要点（决定这个门有没有意义）**：测试实际由 vitest/esbuild 按 bundler 语义加载，所以测试配置必须用 `module/moduleResolution: Bundler`；同时 `paths` 要清空，让 `@d2-tools/core` 走 node_modules 解析到 **dist**——与运行期一致。若沿用构建配置的 `NodeNext`，会把 40+ 条 `TS2835`（相对导入缺 `.js` 后缀）算成错误，门就废了。`rootDir` 需放到仓库根（`../..`），因为测试会跨包引用源码。

   **修掉的真错误**：
   - 判据① 自身 2 条：`test/recommendation-source-parity.test.ts` 缺 `source_group_id` 与 `socket_plugs`。`source_group_id` 补成**不带格式前缀**的真实分组键（`document:<docId>`）——变异测试验证过：写成 `${prefix}:…` 会让卡片摘要那条当场变红。
   - services 侧 5 条**与 T56 无关的既有漂移**（类型长胖、夹具没跟上）：`account.session` 的 `AccountItemSnapshot`、`gameData.readerCatalog` 的 `GameDataSearchIndex`、`manifest.cache` 的 `D2Config.features`、`memory-adapter` 的 `ActivityHistorySummary.review` 与 `AccountItemSummary.socket_plugs`。
   - 本任务自己写的测试 5 条：`RecommendationImportTarget` 应从 `recommendationDocumentStore` 导入（此前从 `weaponRecommendationKnowledge` 导，那里只 import 不 re-export）、三处 `source_records?.[0]` 少了一层可选链、`DimWishlistRule.note` 必填。

3. ✅ **判据① 的覆盖缺口（2026-09-16 已闭合）**：`source_group_id` 如今在**三条路径**上被断言——
   - **消费层 · 筛选事实**与**来源选项**：把 `recommendationMatchView.ts` 的 `sourceId: source.source_group_id` 变异成 `source.source_id` 后，两条用例当场变红。
   - **生产者侧**（本轮补上）：`packages/services/test/recommendationSourceProjectionParity.test.ts` 第 3 条用例直接读两个适配器的真实产出，断言「格式前缀不得进分组键」+「同一来源的多条记录必须同一个分组」。两处变异分别验证：CSV 分组键写成 `csv:${sourceId}` → 红；DIM 分组键改成逐规则级 → 红。

   **补网时发现的新问题**：分组**粒度**本身按格式分叉（CSV 实例级 / DIM 文档级），是真实 I1 违例，已转〈L3-2c · 新发现〉待用户拍板。**该用例刻意不钉粒度**，只在注释里写明待补，避免用一条断言把未拍板的口径悄悄固化下来。

## L3-2c · 归约合并（✅ 已完成并变异验证，2026-09-16）

两个**适配器**保留（格式差异止步于分层图 ②）；要合并的是混在格式链里的第三件——**判断 / 归约**。

**结论修正（重要）**：我一开始判「L3-2c 未做」是**错的**，依据是「`reduceCombosToColumnPool` 只有一个调用点」。真实的收敛已经发生，而且不在归约函数上：

1. **CSV 表达「每栏任选其一」的方式是一格多值**（`特性甲 / 特性乙`），投影出来本来就是逐栏候选池——与 DIM 的归约结果逐字段相同。展开写成多行**进不来**：同一「武器 + 推荐来源」第二次出现，导入期就判阻塞（`该武器身份与来源在文件前文已经存在`），见 `weaponRecommendationKnowledge.ts:672`。也就是说 CSV 侧不存在「作者把笛卡尔积展开写成多行」这种输入，归约无从谈起。
2. **真正的分叉是「武器级推荐」的判据**：DIM 用「有没有一条可核对栏位」判，CSV 过去用「Perk 1 / Perk 2 有没有填」判。同一份事实（只点了枪管）换格式写，一边算 Roll 推荐、一边算武器级推荐——而武器级条数直接进 `matched` / `available`，用户看到的符合度随格式变。已把判据抽到 core（`isWeaponLevelRule`），两侧都读它。

**证据（`packages/services/test/recommendationSourceProjectionParity.test.ts`，3 条用例全绿）**：

| 用例 | 内容 |
|---|---|
| 每栏任选其一 | CSV 一格多值 vs DIM 四条展开规则 → 投影逐字段相同（含非空锚点） |
| 只点枪管 | 旧版普通玩家模板单栏要求 vs DIM 单条 → 不得退化成武器级 |
| 分组键（生产者侧） | 格式前缀不得进 `source_group_id`；同一来源的多条记录必须同一个分组 |

**变异验证（三条，都必须变红）**：

- 把 `reduceCombosToColumnPool` 短接 → 用例 1 红（**注意：core 改完必须 `pnpm --filter @d2-tools/core build`**，下游测试解析的是 `dist`，不重建等于没改）；
- 把 CSV 的武器级判据换回旧启发式（「没填 Perk 1 / Perk 2」）→ 用例 2 红；
- 把格式前缀写进 CSV 分组键 / 把 DIM 分组键改成逐规则级 → 用例 3 红（两处分别验证）。

### 分组粒度按格式分叉（✅ 用户已拍板并落地，2026-09-16）

补生产者侧断言时实测到的**真实 I1 违例**：

```text
同一份存储形状（1 个文档 + 2 个命名来源实例，同一把武器）
  CSV：2 条记录 → source_group_id 各不相同 → 来源选项出 2 行
  DIM：2 条记录 → source_group_id 都是文档键 → 来源选项收敛成 1 行
```

**用户拍板：按来源名分多行**（一个具名来源 = 一行，两种格式一致），即改 DIM 侧。

**落地（`dimWishlistSource.ts`）**：

- `sourceGroupId = sourceId`（原来取 `documentId`）。
- **关键：把兼职的变量拆开**。`documentLevel`（这个实例本身就是文档级来源）服务的**是覆盖状态继承**，原来写成 `sourceGroupId === sourceId`——分组键一改，它就会恒为 `true`，**对整份文档的停用 / 移除会悄悄失效**。现改为 `sourceId === documentId`，继承链显式查 `documentId`，与分组解耦。
- 已核实 `source_group_id` 不被管理面消费（管理面用 `document_id` / `source_id` 存储键，`recommendationManagement.ts:156`），所以这次只影响来源列表的显示粒度。
- `>512` 实例的折叠逻辑不必改：它本来就把实例键改写成文档键，折叠后自然回落成文档级一行。

**同步改掉的文档契约（否则会被下一个 agent「改回去」）**：

| 位置 | 原内容 → 现内容 |
|---|---|
| `ui-specs/application-workspaces.md:203` | 「文件内的 block **不单独出现在来源选择**和管理列表」→ 具名 block 各占一行；管理面（导入 / 覆盖 / 停用 / 移除）仍按导入文档，文档级停用继承到全部实例 |
| `development.md` 2.7 | 新增**来源身份口径**：一个具名来源实例 = 一个身份 = 一行；唯一例外是管理面按导入文档；并写明「`source_group_id` 必须由实例键派生，覆盖继承必须显式查文档键——两件事共用一个变量就会在改动时悄悄失效」 |
| `recommendationMatchView.ts:118` | 注释从「同一文档 / 同一次导入的多个实例收敛到同一个键」改为「一个具名来源 = 一个键 = 一行」 |
| `ui/test/recommendation-source-parity.test.ts:51`、`:159` | 夹具注释随之更正；那条「多实例收敛成一行」降级为**消费层分组机制**的测试（键相同就并成一行），不再冒充生产端契约 |

**网（`recommendationSourceProjectionParity.test.ts` 第 4 条用例）**：同一份存储形状的两种编码（CSV 两行不同「推荐来源」 / DIM 一个文档两个带标题注释段），断言**分组数 = 具名来源数 = 2**、且没有哪一行混着两个来源名。三个量都得看——只看分组数，「并成一行」和「拆成两行」都能骗过去。

**变异验证**：把 `sourceGroupId` 退回 `documentId`（= 拍板前的旧行为）→ 该用例当场变红（`expected 1 to be 2`），其余 3 条不受影响；还原后 4 条全绿。

## 顺带修掉：停用整份导入在 CSV 上静默失效（✅ 已修，2026-09-16）

做上面那条分组粒度改动时，为了确认「覆盖状态继承没被碰坏」而实测，结果撞出一个**独立的真实缺陷**：

```text
管理面以「导入文档」为单位（停用整份导入写的是文档键），来源事实按实例投影。
  CSV：停用文档键 → 停用前 2 条，停用后 2 条   ← 用户点停用没有任何反应
  DIM：停用文档键 → 停用前 2 条，停用后 0 条   ← 正常
```

**根因**：这段「实例键优先、文档键兜底」的继承规则**在两个适配器里各写了一份**。DIM 那份有文档键兜底，CSV 那份只查实例键（`csvRecommendationSource.ts` 原 `resolveSourceState`），于是文档键上的停用读不出来。同一份事实换格式，停用行为不同——又一个 I1 违例，而且是用户按得到的。

**修法（只留一处实现，杜绝再次漂移）**：把继承规则提到 `recommendationOverrides.ts` 的 `recommendationSourceStateFor` / `recommendationRemovedRuleIdsFor`，两个适配器都调它；CSV 的私有副本删除，DIM 的私有副本删除（含规则级移除的继承，CSV 原本同样缺这一段）。分组键与继承键因此彻底分开表达。

**网**（`recommendationSourceProjectionParity.test.ts` 第 5 条用例）：同一份存储形状的两种编码，各做两步——文档键停用 → 必须全部停用；再单开一个实例 → 实例级优先于文档级。**变异验证**：把共享函数里的文档键兜底去掉（= 修复前 CSV 的行为）→ 该用例当场变红（`expected [...] to have a length of +0 but got 2`）。

## L3-4 · 合同改写余项（✅ 已完成，2026-09-16）

| 位置 | 原内容 | 处置 |
|---|---|---|
| `docs/development.md:234` | 「31 列 CSV 只允许 Aegis / LGpig / YXCRALLXY / Sayalarry」的来源白名单（代码里早已删除）+「DIM 不转换为普通六栏 CSV」的边界声明 | ✅ 已删；白名单在代码里早已不存在，文档是唯一残留 |
| `docs/development.md:235` | 「DIM 固定排在人工来源之后」「符合 n 套」「DIM revision」三处按类型写的规则 | ✅ 已改为同级口径（按符合程度排序，平级按来源名） |
| `docs/development.md:237` | 筛选索引把「DIM Wishlist」列为独立精确规则 | ✅ 已删该条 |
| `ui-specs/application-workspaces.md:225/229` | 「条目标识使用规则 ID」等 DIM 专属表述 | ✅ 已复查并改为统一口径 |
| 缓存键 | D7 归一 | ✅ 已随一次切换落地（单一 `recommendation_revision`），无残留双输入 |

判据：两份文档口径一致；`pnpm docs:check` 通过。

**核实结果（2026-09-16，逐条 grep 过）**：`docs/development.md` 的 5 条按类型规则**已全部清零**（`DIM Wishlist` / `dim_wishlist` / 四位作者白名单 / 「固定排在」/ 「DIM revision」全仓 0 处）。但**口径残留不在 development.md，而在另外几份参考文档**，属于「面向用户不出现格式名」这一条的收尾，当时另立清单跟踪，**2026-09-19 T56 关闭时已一并清完**：

| 位置 | 残留 | 2026-09-19 收尾 |
|---|---|---|
| `ui-specs/application-workspaces.md:207`（现 `:213`，行号已漂移） | 整段以「DIM Wishlist 是第三方辅助数据」组织，并把两种格式分开叙述（其中「笔误行按行忽略 / 整把武器跳过」是导入期校验的口径，与本任务〈导入期校验〉一节一致，改文案时不要改掉） | ✅ 开篇改为「愿望单文本是玩家导入的来源格式之一，与人工推荐表格同级」；同段与 `:207` / `:209` / `:225` 的 `DIM` 字样改为中性说法；**「笔误行按行忽略 / 整把武器跳过」的原句一字未动** |
| `equipment-detail-and-knowledge-analysis.md:448` | 「DIM Wishlist 保留为用户手动导入的个人目标」 | ✅ 改为「愿望单文本由用户手动导入，是推荐来源的一种格式（与人工推荐表格同级）」；同文件 `:352` / `:477` / `:521` / `:536` / `:579` / `:581` 六处同类表述一并改掉（`:477` / `:579` 原文按格式分岔描述展示口径，改为两种格式同一套栏位口径） |
| `destiny-tool-reference.md:117` | 「来源身份：社区维护的 DIM Wishlist 聚合」——**这条是外部工具的客观描述，不是本应用的用户文案，建议保留** | ⏸ 按建议保留，未动 |
| `user-guide.md` §8.3 | 「导入 DIM Wishlist」等切换前名称（已在 `docs/todo.md` 登记） | ✅ `:27` / `:147` / `:167` 三处改为「愿望单文本」（`§8.3` 正文本身在 T68 收尾时已改完）；`security.md:20`、`T45-weekly-farming-checklist.md:142` 两处同名字样一并改掉 |

**当时为什么没有顺手改**：这些都是合同 / 参考文档，改它们要同时核对「导入期校验」口径与用户指南的措辞，硬塞进 L3-4 会让「文档口径一致」这条判据无法被单独验证。关闭 T56 时单独做了一次，判据是 `pnpm docs:check` 通过 —— 本地未跑，交由 CI。

**刻意没动的地方**：`equipment-detail-and-knowledge-analysis.md:246`（「人工来源推荐的适用边界由已证明的发布组决定，DIM 仍以精确 Hash 为边界」）说的是武器身份边界，属于另一条口径，这次的清理没碰。代码里的 `dim_wishlist` / `dim_import` 是存储与类型的**内部标识**、不是用户文案，按 T56 口径（「判定、标签、文案一律从数据来源取」）保留。

## L3-4b · 详情页推荐区去分叉（✅ 代码完成，四门判据全绿 2026-09-16）

用户指出武器详情仍挂着 `["community","攻略推荐"] / ["personal","我的推荐"]` 两个页签、且旧「社区推荐」面板还在——这正是分层图 ⑤ 消费层里最后一条按来源身份劈开的路径。

**关键事实（先查清再动手）**：

1. **`community` 那一栏本来就是统一路径**：它渲染 `evidence.sourceMatches`（→ `RecommendationSourceEvidenceCard`）；页签**标签**才是分叉。
2. **`personal` 那一栏不是推荐来源**：它是装备目标库（`buildEquipmentTargetWeaponViews` + `EquipmentTargetStore.targets`）。删页签**不丢数据**——目标另在「目标命中」展示，并在装备目标库面板管理（`VaultTargetRulesPanel.tsx:327`）。
3. **`combos` 恒为空**：两个适配器都写死 `combos: []`，所以 `explicitCombos`、`ItemDetailCommunity` 主分支、`"combo"` 展示**永远走不到**。
4. **发现并修掉一处真实的 I3 违例（CSS）**：`.weapon-detail-recommendation-combo[data-recommendation-source="dim"]`——消费层按来源类型改样式。

**改动**：

| 位置 | 内容 |
|---|---|
| `WeaponDetailContent.tsx` | `RecommendationSection` 重写：删页签栏、删 `WeaponTargetSource` / `availableWeaponTargetSources` / `preferredWeaponTargetSource` 与相关 state+effect；只留「账号实例渲染来源事实、定义/商人渲染来源规则」一条路径 |
| `buildWeaponDetailView.ts` | 删 `buildEquipmentTargetWeaponViews`、删恒空 `explicitCombos` 分支与其中的 `\|\| "社区推荐"` 硬编码兜底来源名、删 HEAD 就零调用的 `dimDiagnosticSlotLabel` |
| `ItemDetailCommunity.tsx` | **删除文件**（只经 `ItemDetailTools` 挂载，渲染恒空的 `combos`） |
| `ItemDetailTools.tsx` | 删社区推荐区块、删装饰性假页签栏（`概览 / 同名对比 / 社区推荐 / 操作`） |
| `weaponDetail.ts` | 删 `WeaponRecommendationSource` 与 `WeaponRecommendation.source`。溯源核过：`"dim"` 生产点随第三身份已删（`b9a1371` 引入 / `5f63234` 删除），`"external"` **历史上从未有生产点** |
| CSS | 删 13 个 `.community-*` 选择器（`01-operational-surfaces.css`）+ `.item-detail-tool-tabs` / `.item-detail-tool-community`（`07-item-detail.css`）+ DIM 专属样式规则；并清掉因此空出来的 `grid-template-areas` 的 `community` 行 |
| 文档 | `ui-specs/equipment-details.md` :79/:92/:93 改为「不按来源身份分页签，按符合程度排列」；`application-workspaces.md` 8 处同级口径 |

**顺带查出的守卫缺陷（已修）**：`recommendation-source-boundaries.test.ts` 的白名单 7 条里 **4 条指向不存在的路径**，且**整张白名单一条都不起作用**——把白名单整个停用后扫描仍是 0 处违例。也就是说它当时只是在**假装**守卫存在。已把白名单清空，并加两条自检：① 每个扫描根目录必须真实存在；② 白名单每一条都必须压住真实违例（空洞条目直接判红）。两条自检都做了变异验证（塞空洞条目 / 改坏根目录名 / 往 ⑤ 层塞真违例，三处都当场变红）。

### 护甲侧的同构分叉 → 已拆出为独立任务

护甲详情的「目标匹配」区有同样的按硬编码来源身份分页签的结构（`ArmorTargetSource = "personal" | "loadout" | "community"`，其中两个页签全仓无生产点、恒空）。它涉及护甲侧信息架构取舍，**不在 T56 内处理**，已拆到 [T62](T62-armor-detail-target-source-defork.md)；T62 于 2026-09-19 拍板做 A（纯去分叉），同日实窗验收关闭。

## 下游复验登记（✅ 已完成，2026-09-16）

Layer 3 改变了消费方输入形状——已逐个核查并登记，**没有静默改动它们的输入**。核查结论比预想窄：四个任务里只有 T45 真的消费推荐来源。

| 任务 | 结论 | 依据 |
|---|---|---|
| `T45` | ⚠️ **受影响，已登记 §15** | :23/:24/:33/:117/:142/:174 直接消费 T20 来源事实、来源摘要与推荐 revision |
| `T43` | ✅ 不受影响 | 全文「推荐」指任务优先级推荐；唯一 DIM 提及是「不复制 DIM 的 Progress 页面」 |
| `T44` | ✅ 不受影响 | 全文「推荐」指提光路线推荐（自有按奖励等级排序的规则） |
| `T46` | ✅ 不受影响 | 本文件明确「不做商人购买推荐」；「推荐」只出现在排除性表述里 |

## 导入期校验（原 T60，✅ 已完成并变异验证，2026-09-16）

**先说清是哪个导入**：这条口径针对 **DIM 文本导入**（`ui-specs/application-workspaces.md` 的来源工作区一节：「DIM Wishlist 预览除统计信息外，还要列出被忽略的问题行数、涉及武器数、整体跳过的武器数与每一类问题的示例」）。人工 CSV 侧已有自己的校验与阻塞规则，不在这条里。

### 与「不可归约也能展示」的关系（两处文档的冲突及取舍）

**口径原文**：「去掉问题行后重新做可归约校验；**剩余集合仍不构成各栏候选的笛卡尔积** → 该武器这部分规则整体跳过」。而 `ui-specs/application-workspaces.md` 明确「不能归约时保持一行一个完整组合展示」（T20 已验收）。照字面执行，作者写了几条互不相干的独立组合、其中一行有笔误时，**其余好组合会被一起删掉**——正是口径里那句「避免为通过校验而悄悄丢正常数据」要防的事。

**落地取舍（把触发条件收窄到「丢行打破了原本成立的候选集合」）**——**2026-09-16 用户拍板：坏行只丢那一行（即采用下面这个收窄口径），不按「有坏行就丢整把武器」执行**：

| 情形 | 丢行前 | 丢行后 | 处置 |
|---|---|---|---|
| 作者写全了一组候选，一行被丢 | 完整乘积 | 不再完整 | **整把枪这部分规则跳过**（口径要的场景） |
| 作者写的是互不相干的独立组合，一行被丢 | 本来就不是乘积 | 仍不是 | 只少那一行，其余按「一行一个完整组合」展示 |
| 某行本来只写了半栏，一行被丢 | 不是完整乘积 | 仍不是 | 同上 |

**「完整乘积」不能拿 `reduceCombosToColumnPool` 有没有返回值当结论**：它自己先去掉冗余超集再比数量，一条只写半栏的规则会让整组看起来凑巧可归约。所以另外写了 `formsCompleteProduct`（没有重复行、每条规则恰好覆盖池子每一栏、条数等于各栏候选数之积），前后两侧都用它。**判宽了会删正常数据，判严了这个分支永不触发等于没做**，两个方向都在测试里钉住了（见下）。

### 判定表（复用读取期同一份诊断）

| 类别 | 判据 | 来源 |
|---|---|---|
| `unparseable_rule` | 行不符合规则语法（`dimwishlist:` 开头但读不出来、Hash 超 32 位） | 解析器 `parseDimWishlistWithIssues` |
| `duplicate_perk` | 同一条规则里同一个 Perk Hash 出现两次 | 解析器（去重前才看得见） |
| `unknown_perk` | 该 Perk 在这把枪的候选里查不到 | 诊断状态 `unknown_slot` |
| ~~`ambiguous_slot`~~ | 已删除：该 Perk 能落在多个栏位时按作者书写的栏位顺序归栏，归栏恒为单值，不再有「归不了栏」这一档 | 见 Bug102 |
| `same_slot` | 同一条规则里两个 Perk 落在同一栏（同一栏写了两个，或书写顺序与栏位顺序矛盾） | 诊断后标准栏位重复 |
| `irreducible_weapon` | 丢行把原本写全的一组候选拆残 | `formsCompleteProduct` 前后对比 |

**不参与归约判定的正常情况**：`special` 栏位（大师、起源特性等，不属标准六栏）多个并存不算冲突；一行只写标准栏位之外的东西按「仅推荐这把武器」处理，不跳过。

**定义池缺这把枪时一行都不判**（`hasWeaponSlotCatalog` 为空即放行）：目录为空时每个 Perk 都会落成「查不到」，判下去会把整份文件误判没。这是最危险的失败方向，两个测试钉住。资料库整个不可用时退回空定义池，导入照常（只做语法校验），与改动前行为一致——**导入不能因为资料库没就绪而失败**。

**整份文件仍然只在解析后没有任何有效规则时拒绝导入**（不做比例阈值）。

### 落地清单

| 位置 | 内容 |
|---|---|
| `core/analysis/wishlistImport.ts` | 规则加 `line_number`（只存在于解析结果，落库时随 `normalizeDimWishlist` 丢掉）；新增 `DimWishlistParseIssue` / `DimWishlistImportIssue` / 六类判据；解析器拆成 `parseDimWishlistWithIssues` + 薄壳 `parseDimWishlist`（**只有一份语法实现**）；`DimWishlistImportPreview` 加 `importable_rule_count` / `importable_weapon_count` / `skipped_row_count` / `affected_weapon_count` / `skipped_weapon_count` / `issues` / `issue_count` |
| `services/community/dimWishlistDiagnostics.ts`（新） | 从 `dimWishlistSource.ts` 提出的共享件：槽位目录、逐 Perk 诊断、`buildPerkRefMap`、`weaponDisplayName` / `perkDisplayName` |
| `services/community/dimWishlistValidation.ts`（新） | `filterDimWishlistForImport`：按行判定 + 整把枪判定 + 计数与示例（示例上限 50 条）；注释段里一条规则都不剩的会被一并去掉，不留空来源 |
| `services/community/dimWishlistSource.ts` | 读取期改用共享诊断（**行为逐字段不变**，见下面的回归证据） |
| `desktop/main/ipc/wishlist.ts` | 文件预览 / 确认都跑校验，**落库写的是过滤后的规则**且与预览同一个函数；定义池装载失败退回空池（当时还有一条粘贴路径的写入同样过一遍，该路径已随 T63 删除） |
| `ui/vault/VaultWishlistManager.tsx` | 预览显示「N 条可导入 / M 条规则」与跳过汇总（行数、涉及武器数、整把跳过数、每类示例含行号与原文）；可导入为 0 时禁用确认 |

### 测试与变异（`packages/services/test/dimWishlistImportValidation.test.ts`，11 条）

四个变异各自只让对应的那条变红，证明护栏有牙齿：

| 变异 | 变红的那条 |
|---|---|
| 去掉「定义池缺这把枪就不判」 | 两条 fail-open 断言（`expected [] to have a length of 2`） |
| 触发条件放宽成「归约函数有无返回值」 | 「作者本来写的是几条独立组合…其余照常保留」 |
| 删掉整把枪跳过分支 | 「丢行破坏了原本成立的候选集合…一起跳过」 |
| 去掉同行同栏判定 | 「同一行里两个 perk 落在同一栏」 |

**读取期重构的回归证据**：`pnpm test:behavior` 全绿（135 文件 / 533 用例），其中 `recommendationSourceProjectionParity.test.ts` 的五路投影对拍把 DIM 适配器的输出逐字段钉住，说明「改用共享诊断」没有改变任何读取结果。

### 残留（明确不做 / 待定，如实记录）

1. ~~**粘贴路径没有服务端预览**：粘贴仍由渲染层本地解析并即时显示…~~ **已随 T63 关闭**——粘贴通道整条删除，不再有这条缺口。
2. ~~**在线导入（URL）不走这套校验**：`dimWishlistUpdates` 是从固定地址拉取并直接换库的在线更新流程…~~ **已随 T63 关闭**——固定地址在线导入整条删除；取而代之的「贴链接读取」与本地文件共用同一条解析 / 校验 / 预览流水线（`wishlist.ts` 里三个入口走同一个 `parseDimWishlist` + `filterDimWishlistForImport`）。
3. **`unknown_perk` 的理论误伤**：如果官方定义池里确实看不到某个 DIM 认可的特色 Perk（插槽摘要展不出来），该行会被判成笔误跳过。当前判定依赖「武器目录非空 ⇒ 插件池已就位」，未做更强的证据核验；出错方向是少导入一行、且预览先报出来，可由用户取消。

## 人工表格核对只看了武器的一部分版本（✅ 已修并实测验收，2026-09-16）

**症状**：用户拿自己那两份表导入（`Sayalarry推荐表_导入模板.csv` 70 行、`YXCRALLXY推荐表_导入模板.csv` 455 行），预览报「Sayalarry 18 行异常将忽略 / YXCRALLXY 1 行异常将忽略」，文案都是「无法在这把武器**任一已列版本**的对应官方栏位中精确确认」。**这句话本身是假话**：对只写武器名的行，一整版都没看过，谈不上「任一已列版本」。

**两个来路，同一个后果**——两个文件都只写武器名、没有武器 ID（上一版 11 列模板本来就没有 ID 列），名字 → 官方定义走的是**搜索**（`searchItems`）。搜索是有排序、有上限、并且按「同一把武器的代表版本」折叠过的，于是拿到的定义池只包含这把武器的一部分版本：

| 来路 | 实测（用户自己的文件 + 本机资料库） |
|---|---|
| 版本被折叠：「好建议」在资料库里有两条记录，起源特性分别是「问题解决者」与「加速突击」；搜索只返回前者（后者是前者的非代表版本，连候选都进不去），于是表里写的「加速突击」被判查不到 | 第 2 行报错，实测复现 |
| 结果被截断：「允诺」这个名字搜出来前 20 条全是同名护甲（允诺胜利战靴、允诺统治披风…），真正那把斥候步枪的另外两个版本被挤出榜单 | 第 435 行 6 个 Perk 里报 4 个；把这 4 个拿去查，**版本 `-1076665273` 的 Perk 1 池正好是「边打边劫 / 维度偏移 / 切勿靠近 / 冲击支撑」、Perk 2 池正好是「枯萎凝视 / 高爆载荷」**——与表格逐字一致，即该行本来就照这个版本抄的 |

**判据口径没有争议**：这几份表是按「同一把武器的任意一个官方版本能证明就保留」写的（`destiny-tool-reference.md:111` 记的就是这个生成口径），导入期的身份展开 `expandRecommendationItemHashes` 也一直是「同名武器全体 → 按发布组 / 变体归约」。缺的只是**定义池**。

**处置（只加不减）**：导入期装载定义池时，除了搜索命中，再按**精确官方名**取该名字的全部官方版本（`getItemHashesByExactName`，读 `search_documents` 的 `name` / `search_text`，不排序、不折叠、不设上限）。搜索命中保留不动——名字与官方名只差大小写 / 标点的老路径因此不受影响。

| 位置 | 内容 |
|---|---|
| `services/gameData/searchIndex.ts` + `sqliteSearchIndex.ts` | 新增 `getItemHashesByExactName(names)`：按名精确取**全部**同名装备（含被折叠的非代表版本），逐 250 个名字分批 |
| `services/gameData/catalog.ts` + `readerCatalog.ts` / `memoryCatalog.ts` / `jsonCatalog.ts` | 目录层同名方法（读取层委托索引；内存 / JSON 目录按名字筛自己的定义） |
| `services/community/weaponRecommendationKnowledge.ts` | 新增 `collectWeaponRecommendationDefinitionHashes(text, lookup)`：**导入期定义池的唯一入口** = 文件里的武器 ID ∪ 搜索命中 ∪ 同名全部版本（`lookup` 只要 `searchItems` + `getItemHashesByExactName`，不要整个目录） |
| `desktop/main/runtime/gameDataRuntime.ts` + `workers/gameDataWorker.ts` | 把 `getItemHashesByExactName` 接进 worker 桥（操作名、15 秒超时、代理方法、`handleRequest` 分支）；英文副索引一并参与（`sqliteCatalog` 的复合索引里取并集） |
| `desktop/main/ipc/community.ts` | 改调它；三步装载（武器 / 插件集 / 插件）本身不变 |

**验收判据**：

1. 用户那两份文件预览**异常为 0**（改前 18 + 1）。
2. `getItemHashesByExactName` 返回被折叠的版本：同一名字的两条记录都要在（拿 sqlite 索引夹具钉住）。
3. 搜索命中仍然保留：名字对不上官方原始写法、但 `normalizeName` 相等的老路径行为不变。
4. 只写武器 ID 的行不受影响（定义池按 ID 取，与本改动无关）。
5. `pnpm typecheck` / `test:behavior` / `test:architecture` / `docs:check` / `test:quality` 全绿；每条判据配一处变异，各自只让对应用例变红。

### 验证结果（2026-09-16）

定义池完全由生产代码给出（不手工塞 hash），跑真实导入链路 + 本机资料库 + 用户全部四份模板：

| 文件 | 记录 | 可导入 | 异常行 |
|---|---|---|---|
| `Sayalarry推荐表_导入模板.csv` | 70 | **70** | **18 → 0** |
| `YXCRALLXY推荐表_导入模板.csv` | 455 | **455** | **1 → 0** |
| `Aegis武器推荐_导入模板.csv` | 729 | 729 | 0（无回归） |
| `LGpig传说武器推荐_导入模板.csv` | 201 | 201 | 0（无回归） |

判据 2 / 3 / 4 由新增用例钉住：`services/test/gameData.sqliteSearchIndex.test.ts`（真实 sqlite 夹具：同名 4 个版本全部返回，其中 `100` 在任何一条「代表版本折叠」路线里都拿不到；搜索限 2 条时只剩 2 个）、`services/test/gameData.readerCatalog.test.ts`（目录层透明转发）、`services/test/weaponRecommendationKnowledge.test.ts`（定义池 = ID ∪ 搜索命中 ∪ 同名全部版本）。

**变异测试**（每处只让对应用例变红，改完全部按 MD5 复原）：

| 变异 | 结果 |
|---|---|
| 定义池不再调 `getItemHashesByExactName` | **两行数回到 18 + 1**（与用户截图逐行一致：`Sayalarry` 52 可导入 / 18 异常、`YXCRALLXY` 454 可导入 / 第 435 行 4 条），另 2 条用例变红 |
| 定义池丢掉搜索命中 | 只有「搜索命中仍然保留」那条变红 |
| 定义池对只写 ID 的文件也照查名字 | 只有「只写 ID 不用问名字」那条变红 |
| 精确名查询重新按代表版本折叠（`AND hash IN (SELECT canonical_hash …)`） | sqlite 索引夹具的两条用例变红，其余全绿 |

判据 5：`pnpm typecheck`（7 包）、行为 138 文件 559 用例、架构 66 用例、`docs:check`、`test:quality` 全绿。

## 不在本任务范围

- 不重新设计 T20 已验收的仓库整理、锁定、转移和分解保护流程
- 不新增推荐评分算法，不把多个来源计算成一个总分
- 不把 DIM 语义强行改成固定六栏，也不把人工推荐改成 DIM 原始文本
- 不在本任务内扩展攻略、AI 或配装导入格式
- 装备目标域的 `TargetSourceKind: "dim_wishlist"` 与 `dim_wishlist_imported_at` 属另一个领域，**勿误删**

---

# 已落地决定（追溯用，勿当待办）

| 决定 | 内容 |
|---|---|
| D1 / D2 | 备选关系由「一条规则 = 一条 record」表达，规则表**不存 `operator`**；`rule_group_id` 落库（CSV = `rule_id`，DIM = `<source_id>\|<item_hash>`）替代「按格式猜怎么合并」 |
| D3 | `slot = ''` = 来源未指定栏位，读时按武器定义解析；投影只有一条路径 |
| D4 | `recommendation_source_rule_items` 子表：一条规则对多把武器；`item_hash` 列降级为「主 hash」 |
| D5 | CSV 与 DIM 共用「命名 + 新建 / 覆盖」，删 merge / replace / `partialImport` |
| D7 | 缓存键归一到单一来源事实 revision |
| D8 | `kind` 的真实取值由数据决定，③④⑤ 层不得读它 |
| DD3 | 允许按格式分支的只有两个适配器入口；判据② 是最终裁判，**新文件不需要任何禁止模式就不加白名单** |
| 身份定死 | CSV 的「这把武器适用哪些 hash」在**导入期**展开成完整 hash 集，读取期只做 `itemHashes.includes(item_hash)`；`rule_stable_id` / `identity_key` 仍按**声明身份**算（否则重导会冲掉用户的覆盖选择） |
| 不搬跨行压制 | 旧读取期的「来源桶淘汰」**不搬**，直接放宽——按行独立展开，只增不减 |
| 身份函数搬导入侧 | `selectKnowledgeRecommendations` / `collectKnowledgeCandidates` 等读取期身份机制已删除，身份推导只在导入期做一次 |
| 覆盖与状态 | 覆盖 = `DELETE` 文档 + 整份重写（`ON DELETE CASCADE` 连带清实例与规则）；`recommendation_source_overrides` 按 `source_key` 独立存，停用 / 移除状态跨覆盖保留 |
| 文档键 | 单一名字空间：文档 `document:<sha256(名字)[0:24]>`，实例 `<documentId>:<sha256(sourceKey)[0:16]>`；格式只由 `recommendation_source_instances.kind` 表达 |

# 踩坑（复用，不要重犯）

1. **改了事实结构必须 bump 匹配算法版本**（现为 22），否则读到旧缓存。
2. **归一化会成批生效**：改数据形状时必须同时盘清所有「按来源类型或固定来源写死」的映射与文案——本轮陆续发现 7 处，每漏一处就是一次返工。
3. **`packages/*/test/**` 不在类型检查范围内**（`ui` 与 `services` 都是）：测试全绿 ≠ 结论成立。
4. **改完 core / services 必须重建 `dist`** 才能在下游看到真实类型影响（跨包 import 解析到 `dist/*.d.ts`）。
5. **删除范围必须对着当前文件状态复核**：一次 python 范围删除曾因早前的行偏移误删 `releaseGroupRank` 方法与 `isUnspecifiedRequirementName`。不要用正则做大段删除，按锚点整块替换并用 `git diff` 核对。
6. **先写会红的网再删代码**：本轮靠这个抓到两个真实缺陷——「只写名字」分支漏归约、`saveRecommendationDocument` 循环体误用旧变量导致规则一条都写不进去。**变异测试是证明网有效的唯一手段**（短接某分支，网必须变红）。
7. **布局假设跟着控件数走**：加减控件时同步检查宽屏与窄屏两处 `grid-template-columns`。
8. **事务内绝不能再 `openRecommendationDatabase`**：`ensureRecommendationSchema` 每次打开都跑一次 `BEGIN IMMEDIATE`，内层连接会等外层自己持有的写锁，5 秒 busy_timeout 后报 `database is locked`。`clearImportedRecommendationRules` 就是这样 100% 失败的（用户点「清空导入的推荐规则」必崩）。凡是「已持有连接」的调用方一律走 `...From(database, …)` 变体（如 `listRecommendationDocumentsFrom`）。**这个 bug 是判据复跑抓到的，不是代码评审抓到的**——重写后的测试一直没跑，等于没有网。
