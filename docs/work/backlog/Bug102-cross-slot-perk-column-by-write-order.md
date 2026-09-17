# Bug #102：「两栏都可能出」的 Perk 被判为无法归栏，整行丢掉

> 状态：✅ 代码已改并自验通过，待用户复验（2026-09-17）
> 现象（用户截图，DIM 文本导入预览）：`意外复苏（专家）` 那几行被报成问题跳过，
> 整份文件「18 行有问题将忽略 / 涉及 5 把武器 / 其中 2 把武器的规则整体跳过」。

## 一、是什么

DIM 文本里一行写成 `perks=A,B,C`，我们按**插件身份**反查它落在这把枪的哪一栏
（`dimWishlistDiagnostics` 的 `buildWeaponSlotCatalog` + `diagnoseDimWishlistRule`）。
有些插件在**两个特长栏的掉落池里都有**（实测：`意外复苏` 的两个特长插槽
`2417486252` / `2357767396` 的池子里都有 `脉冲增幅器`），于是反查得到两个候选栏位。

当时的处置是：候选多于一个 → 状态记 `cross_slot_ambiguous` → 导入期校验把**整行**跳过
（`ambiguous_slot`）。后果分两种：

1. **推荐的候选静默消失**：`意外复苏（专家）` 的 12 行是
   `{合金弹匣 / 切换弹匣} × {自动填装枪套 / 脉冲增幅器} × {紧逼近战 / 狂乱 / 腹背受敌}`
   （枪管与起源特性各一个）这一组完整候选。丢掉的 6 行正是含 `脉冲增幅器` 的那些，
   留下 6 行仍凑得成一组候选，于是**收池后第一个特长栏只剩 `自动填装枪套`**——
   作者推荐的 `脉冲增幅器` 从「任选其一」里被删掉了，而界面上看不出少过东西；
   真拿着一把 `脉冲增幅器` 的枪来看，会显示成「不符合推荐」。
2. **整把枪的规则一条不剩**：`砷毒噬咬-4b`、`沐雨栉风` 各自只有一行、且那一行含这种
   Perk，丢掉那一行 = 这把枪在这份来源里彻底消失（预览里只报「2 把武器的规则整体跳过」）。
   在 `DIM综合愿望单_voltron.txt` 里 `砷毒噬咬-4b` 因此丢了全部 342 行。

**为什么这是缺陷而不是保守取舍**：DIM 文本的写法本身就把栏位写清楚了——作者按栏位顺序
逐个写 Perk。实测 `dim_wishlist_aegis.txt` 里 8050 行「所有 Perk 都能唯一归栏」的行，
书写顺序与栏位顺序**逐行一致，0 例外**；`DIM综合愿望单_voltron.txt` 里 246521 行一致，
另有 2276 行是把某一栏的第二个候选写到行尾（同一栏写了两个 Perk，属另一种写法）。
「归不到唯一栏位」不是来源的毛病，是我们的反查方式丢掉了来源本来就有的信息。

## 二、怎么改：按作者写的那一栏归，不按「候选里第一个」也不按「哪栏都算」

**改法**：判定仍只在 `dimWishlistDiagnostics` 一处，但归栏时按**行内书写顺序**消歧——
逐个 Perk 取候选里「不早于上一个 Perk 所在栏、且这一行还没用过」的最靠前一个。
该 Perk 的归栏因此**只有一个结果**，不再有「多个候选」。

- `意外复苏（专家）`：`脉冲增幅器` 写在第三个位置（前一个是弹匣，特长栏都还空着）→ 归第一个特长栏；
  `紧逼近战` 等只可能落在第二个特长栏 → 各归各栏。12 行全部保留，收池后第一个特长栏
  = `{自动填装枪套, 脉冲增幅器}`，正是作者写的那组候选。
- `沐雨栉风`：一行里 `自动填装枪套`、`全自动击发系统` 两栏都可能出，按书写顺序分别归第一、第二栏。
- `砷毒噬咬-4b`：`蜻蜓` 只可能在第一栏且写在前面，`爆炸箭头` 归第二栏。整行保留。
- `荣誉利刃`：`无情打击` 占第一栏，`居合连斩` 取「还没用过」的那栏 → 第二栏
  （只按「不早于上一个」会撞进第一栏，所以「这一行还没用过」这一条是必需的）。

**为什么不是「两栏哪栏都算」**（我先前给用户的口头方案）：真实文件是**按栏位分栏写**的
（上面前两组实测），把要求改成「出现在哪一栏都算」会让逐栏证据面板说谎——
它按栏显示「来源要求这一栏是什么、你这把这一栏有什么」，要求若可以跨栏满足，
面板只能显示「命中」而列出的候选与实例插件对不上。另外这一改要动 core 的要求结构与匹配器、
还要给逐栏事实加「在哪一栏命中」的新字段，范围大得多，而它对真实文件的所有已知行
给出与上面的改法**相同**的匹配结果（分栏写法下，跨栏的额外命中都落不到真实存在的枪上）。

**没动的**：同一行里**同一栏**写了两个 Perk（作者把「任选其一」当成「都可以要」）仍照旧
报 `same_slot`——那是真的不可能同时拥有，是 T64 的既有口径。逐栏归约判据
（`dimColumnRequirementSets` / `reduceCombosToColumnPool`）也不用改：每个要求仍是**一个**栏位。

## 三、改到哪一层

| 层 | 位置 | 处置 |
|---|---|---|
| 归栏判定 | `services/src/community/dimWishlistDiagnostics.ts` | 目录项带上插槽序号（`socket`）；`diagnoseDimWishlistRule` 按行内顺序消歧，去掉 `cross_slot_ambiguous` 分支；判定后归栏唯一，`slot_candidates` 数组随之收成单值 `slot` |
| 导入期校验 | `services/src/community/dimWishlistValidation.ts` | 删掉 `ambiguous_slot` 的丢行分支；`findSameSlotConflict` 读单值 `slot` |
| 导入期问题类别 | `core/src/analysis/wishlistImport.ts` | 删掉 `ambiguous_slot` 类别 |
| 诊断类型 | `core/src/community-perks/types.ts` | `DimWishlistPerkDiagnostic` 去掉 `cross_slot_ambiguous` 状态，`slot_candidates: […]` 收成 `slot: …` |
| 匹配缓存 | `services/src/community/vaultRecommendationMatchCache.ts` | 算法版本 23 → 24：判定口径变了，旧缓存里的逐栏事实必须整体重算 |

**不改库、不用重新导入**：DIM 的规则在库里存的是原始 Perk 列表（`slot` 为空串、
由读取方按武器定义解析），归栏是**读取期**算的——所以改完直接生效，
`docs/todo.md` 里 T56 那条「人工推荐表格要重新导入」的提醒与本次无关。

## 四、测试与文档

| 位置 | 改动 |
|---|---|
| `services/test/dimWishlistImportValidation.test.ts` | 新增：①两栏都可能出的 Perk 写在第二个特长栏位置 → 不丢行、归第二栏；②一行两个这种 Perk → 按书写顺序分归两栏，不报同栏冲突；③一行里两个只可能落第一栏的 Perk → 照旧报 `same_slot`；④消歧之后才撞车的那一行（书写顺序与栏位顺序矛盾）也照旧报 |
| `core/test/communityPerks.test.ts` | 新增读取期用例：两栏都可能出的 Perk 写在第二栏 → `source_records` 里它归第二栏、且**收池后仍在第二栏的候选里**（Bug 的现象就是它从候选里消失） |
| `desktop/test/architecture-maintenance.test.ts` | 新增守卫：`cross_slot_ambiguous` / `ambiguous_slot` / `slot_candidates` 三个名字全仓不得再出现（它们回来就等于「归栏判不了就丢行」这条路又开了） |
| `docs/development.md` | 新增不变量：Perk 落在哪一栏由它在这一行里的书写顺序决定，不得判成无法归栏（含实测依据） |
| `docs/work/references/ui-specs/application-workspaces.md` | 「按行忽略的判据」那句删掉「Perk 归不到唯一栏位」一项 |
| `docs/work/backlog/T56-unified-recommendation-model.md` | 问题类别表里 `ambiguous_slot` 一行改为指向本 Bug |
| 本文件 | 记录与状态 |

## 五、验证

### 真实文件前后对比（用仓库自己的实现跑，只读）

`dim_wishlist_aegis.txt`（8068 条规则 / 935 把武器）——**就是用户截图那一份**：

| | 改前 | 改后 |
|---|---|---|
| 跳过行数 | 18 | **0** |
| 涉及武器 | 5 | **0** |
| 整把跳过 | 2（`砷毒噬咬-4b`、`沐雨栉风`） | **0** |

| 武器 | 改前 | 改后 |
|---|---|---|
| 意外复苏（专家）1141586039 | 12 留 6 | 12 全留，第一栏候选 = `{自动填装枪套, 脉冲增幅器}` |
| 意外复苏 4005780578 | 12 留 6 | 12 全留 |
| 荣誉利刃 2857348871 | 8 留 4 | 8 全留 |
| 砷毒噬咬-4b 720351795 | 1 丢 1 ★整把跳过 | 1 全留 |
| 沐雨栉风 2957367743 | 1 丢 1 ★整把跳过 | 1 全留 |

`DIM综合愿望单_voltron.txt`（255373 条规则 / 1234 把武器）：

| | 改前 | 改后 |
|---|---|---|
| 跳过行数 | 7463 | **3831** |
| 涉及武器 | 130 | 95 |
| 整把跳过 | 21 | 20（`砷毒噬咬-4b` 342 行全部回来） |
| 报 `ambiguous_slot` 的武器 | 38 | **0** |
| 报 `same_slot` 的武器 | 73 | 75 |
| 报 `unknown_perk` 的武器 | 23 | 23 |

两类剩余问题各有交代：`unknown_perk`（23 把）一个字没动，是 Hash / 名字真的写错；
`same_slot` 多出的 2 把（`暮光誓言` 等）是原先被「无法归栏」挡住的**真同栏行**浮出来了——
`暮光誓言` 里 `速射瞄准` 消歧到第二栏后，同一行的 `强力首发` 与 `充盈` 都只可能落第一栏，
「同一栏两个 Perk，不可能同时拥有」正是该报的（这把枪从「208 行留 64」变成「留 200、丢 8」）。

### 定向改坏表（每条改完即还原，改前改后 SHA-256 一致）

| 改坏什么 | 怎么改 | 被谁杀掉 |
|---|---|---|
| 归栏不再按书写顺序（退回「取第一个候选」） | `const chosen = chooseSlot(...)` → `nameMatches[0]` | 导入期 ①「写在第二个特长栏位置」、②「一行两个两栏 Perk」；读取期用例（`source_records` 从 1 条变 3 条，`脉冲增幅器` 那一栏散架） |
| 去掉「这一行还没用过」这一条 | `const free = candidates.filter(...)` → `[...candidates]` | 同上三条（第二个 Perk 会撞进上一个 Perk 的栏） |
| 去掉最后的退路（拿不准就判查不到） | `(forward.length ? forward : free.length ? free : candidates)[0]` → `(forward.length ? forward : free)[0]` | 导入期 ③「两个只可能落第一栏」、④「消歧后撞车」——它们会变成 `unknown_perk` 而不是 `same_slot` |
| 不再报同栏冲突 | `rowIssueFor` 里 `const sameSlot = findSameSlotConflict(...)` → `undefined` | 导入期 ③、④（真冲突被静默放过） |
| 那个状态名回来 | 在归栏判定里加一行注释提到 `cross_slot_ambiguous` | 架构守卫：命中清单里出现 `dimWishlistDiagnostics.ts` |
| 守卫的扫描读了个空 | `walkSource` 跳过名单里加上 `src` | 架构守卫（含既有的两条同类守卫）——证明「扫描有效」那两句不是空的 |

还原核对（`shasum -a 256`）：

| 文件 | SHA-256 |
|---|---|
| `services/src/community/dimWishlistDiagnostics.ts` | `0b76500d8238029a1f483eabc4288a57aeab28a125898b5ba7bd08d3e3a80301` |
| `services/src/community/dimWishlistValidation.ts` | `b6c04f346716ec7c50ba53847a514b18c6fbd86373d1c83a6f091addcecb29a8` |

### 闸门

`pnpm typecheck` ✅（7/7 包）· `pnpm test:behavior` ✅（147 文件 / 632 用例）·
`pnpm test:architecture` ✅（15 文件 / 83 用例）· `pnpm docs:check` ✅ · `pnpm test:quality` ✅ ·
`pnpm check` ✅ · `pnpm ci:local` ✅（本地 CI 门禁全部通过）。

### 落地后复核

- `packages/services/dist`（gitignored）在原型阶段被手工改过一个文件，已用 `shasum` 对照原始备份还原，
  临时放在 dist 旁边的原型副本已删除；仓库工作树里没有留下任何原型文件。
- 全仓 grep：`cross_slot_ambiguous` / `ambiguous_slot` / `slot_candidates` 三个名字在
  `packages/**/src` 里**一处都没有**（守卫按此断言）；余下只出现在架构守卫自己的断言文本、
  本文件与 T56 那张类别表里——守卫与说明都得说得出被删掉的是什么。

## 六、验收判据

1. 重新导入 `dim_wishlist_aegis.txt` 时，预览里**不再出现**「18 行有问题将忽略」，
   也没有武器被整体跳过。
2. `意外复苏（专家）` 这类武器的推荐里，作者写的两个第一栏候选（`自动填装枪套`、
   `脉冲增幅器`）都在；仓库里带 `脉冲增幅器` 的那把不再显示成「不符合推荐」。
3. `DIM综合愿望单_voltron.txt` 里 `砷毒噬咬-4b` 不再整把消失。
4. `pnpm typecheck` / `pnpm test:behavior` / `pnpm test:architecture` / `pnpm docs:check` /
   `pnpm test:quality` 全绿。

## 七、请用户复验

重新打包后进 仓库 → 推荐来源 重新导入那份 DIM 文本：预览应显示 0 行问题；
再去仓库找 `意外复苏（专家）`，看第一个特长栏的候选里是否有 `脉冲增幅器`，
以及一把带 `脉冲增幅器` 的该枪是否被算作符合推荐。
