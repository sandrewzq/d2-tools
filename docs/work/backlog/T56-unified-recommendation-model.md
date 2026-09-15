# T56：统一推荐模型与多来源导入

> 状态：🟠 开发中（模型归一进行中；工作流部分待真实账号与窄屏实窗验收）
> 合并说明：原 T57「仓库推荐工作流简化」已并入本文档，编号保留；T57 行的说明指向本文件。

首批实现已新增 `recommendation_documents`、`recommendation_source_instances` 和 `recommendation_source_rules` 三层存储。DIM 已收敛为单一真相：这三张表是 DIM 的唯一读写路径，旧版 `external_recommendation_sets` 的 DIM 数据只在首次读取时迁移一次，迁移后不再参与读写；`external_recommendation_*` 目前只为人工 CSV / Excel 保留。

DIM 来源身份按结构化分组，不由读取期推导：

- 注释段有 `title` 或 `author` 时，每个身份建立一个来源实例，标签为「标题 · 作者」；
- 注释段完全没有身份时，整份文档聚合成一个文档级来源，标签为文档标题；
- 标签在导入期写入 `recommendation_source_instances.label` 后不再变化，界面不显示「未标注来源 #N」这类内部编号。

匹配结果里保存了来源标签，因此 `vault_weapon_match_cache` 的 revision 必须覆盖新模型的文档与来源实例指纹，不能只看旧集合指纹。

DIM 不再作为内置推荐依赖，也不在启动或后台自动同步；在线入口和本地 `.txt / .wishlist`、粘贴文本入口均为玩家主动触发的手动导入。
> 优先级：P1
> 关联：T20 已完成并冻结；T55 的仓库多来源筛选需要消费本任务定义的稳定 `sourceId`

## 目标

将 DIM Wishlist、Excel/CSV 人工推荐和后续可接入的推荐文件统一为一套规范化推荐模型。

DIM、Excel 和 CSV 只负责解析各自的原始格式；导入完成后，匹配、筛选、仓库卡片和装备详情全部消费同一套来源与规则 DTO。

本任务不把 DIM 文件转换成旧版人工 CSV，也不把人工推荐降级成 DIM 的无序 Hash 列表。统一的是运行时模型和匹配接口，同时保留每种来源原本无法丢失的语义。

## 来源模型

一个来源类型可以有多个来源实例。DIM 需要在数据层保留“导入文档”和文档内部的作者/Wishlist 分组，但管理界面按导入文档作为来源行，与人工 CSV 来源平级展示；作者和 block 只在详情中查看。

运行时来源按可见的 Wishlist 标题与作者聚合重复注释分块；原始 block、规则与元数据仍完整保留在文档中。这样既能区分多个作者/多个 Wishlist，也不会把旧版生成的数千个重复 `source-N` 分块变成仓库筛选行。

三级关系固定为：

```text
一份导入文档
  → 多个逻辑来源（作者 / Wishlist / source block）
    → 多条推荐规则
```

文档和来源实例分别使用稳定 ID：

```ts
type RecommendationDocument = {
  documentId: string;
  origin: "url" | "file" | "paste";
  sourceUrl?: string;
  revision?: string;
  fingerprint: string;
  importedAt: string;
};

type RecommendationSource = {
  sourceId: string;
  documentId: string;
  kind: "dim" | "excel" | "csv" | "builtin";
  label: string;
  title: string;
  author?: string;
  blockId?: string;
  origin: "community" | "local-file" | "paste" | "builtin";
  sourceUrl?: string;
  revision?: string;
  fingerprint: string;
  state: "active" | "disabled" | "removed";
};
```

来源实例必须使用稳定 `sourceId` 区分。

例如以下来源可以同时启用：

- `excel:aegis`
- `excel:lgpig`
- `dim:lgpig-moc`
- `dim:voltron`
- `dim:my-pve`

同一作者发布不同标题、不同用途或不同地址的 Wishlist 时，必须建立不同来源实例。作者不是来源主键，Wishlist 标题和 block 也不能被丢弃。

同一来源的新 commit 或新 revision 更新原来源实例；不同作者、不同文件、不同来源地址或不同 Wishlist 标题建立新的来源实例；相同 fingerprint 重复导入必须幂等。

如果一份 DIM 文件包含多个作者或多个 source block：

- 有明确 `title`、`author` 或 block metadata 时，每个逻辑分组建立一个 `sourceId`；
- 完全没有可识别元数据时，整份文档聚合成一个文档级来源，标签为文档标题，不生成「未标注来源 #N」这类内部编号；原始 `blockId` 仍逐条保存在规则里；
- 规则必须保存 `sourceId` 和原始 `blockId`，不能只保存文档 ID；
- 文档级更新可以替换该文档下的来源和规则，但来源级停用、移除和规则纠错必须按 `sourceId` 隔离；
- 同一作者的多份 Wishlist 不能因为作者名称相同而自动合并。

## 统一规则模型

所有导入器输出统一的推荐规则：

```ts
type RecommendationRule = {
  sourceId: string;
  ruleId: string;
  itemHashes: number[];
  mode: "pve" | "pvp" | "general";
  kind: "roll" | "weapon_only";
  requirements: RecommendationRequirement[];
  note?: string;
};

type RecommendationRequirement = {
  slot?: "barrel" | "magazine" | "masterwork" | "perk1" | "perk2" | "origin";
  operator: "any" | "all";
  candidates: PerkRef[];
};
```

规则约束：

- 人工表格的同栏候选使用 `slot + any`；不同栏位之间按 AND 组合。
- DIM 一行保留为一套独立组合；多个组合互为备选，不跨组合累计 Perk。
- DIM 与人工推荐统一按「同一 Perk Hash 或同一 Perk 名称」判定是否满足要求：锻造强化特征与基础特性同名但 Hash 不同，装备了强化版即视为满足同名的普通特性要求，不能直接判为未命中。
- DIM 无法唯一归栏的 Hash 仍使用 `all` 保留原始组合语义，并附带栏位诊断。
- `perks=` 为空的 DIM 规则转换为 `kind: "weapon_only"`，不得丢弃。
- 来源备注、作者、原始链接、分组、revision 和解析诊断作为 provenance 保留，不由 UI 猜测。

## Excel/CSV 模板

Excel 和 CSV 使用同一套 11 列字段合同，只提供两份表头语言版本：中文模板和英文模板。两份模板的列顺序、字段数量和填写规则完全一致；旧版 13 列普通玩家模板与 31 列 T20 完整包只保留兼容读取，不再继续导出。

中文模板字段（**推荐来源固定为第一列**，允许任意自定义名称）：

```text
推荐来源,武器,规则名称,用途/分类,枪管/瞄具,弹匣,大师,Perk 1,Perk 2,起源特性,评级,备注
```

英文模板字段：

```text
Source,Weapon,Rule Name,Mode / Category,Barrel / Sight,Magazine,Masterwork,Perk 1,Perk 2,Origin Trait,Rating,Note
```

导入端优先读「推荐来源 / Source」，并兼容旧文件把来源名写在「规则名称 / Rule Name」里的写法。

字段规则：

- `武器 / Weapon` 和 `规则名称 / Rule Name` 必填；中文模板使用中文官方武器名称，英文模板使用英文官方武器名称。系统通过当前语言 Manifest 按名称取得官方 Hash，不要求维护者填写武器 ID。
- `用途/分类 / Mode / Category` 非必填；多个值使用 `/` 分隔，例如 `PvE / 清怪 / 输出`。导入器将可识别的 `PvE`、`PvP`、`通用`映射为内部 mode，其余值保存为标签；为空时内部使用 `general`。
- `Perk 1` 和 `Perk 2` 必填；其他栏位为空表示来源没有要求。
- 同一栏多个候选使用 `/` 分隔，表示满足其中一个即可；不同栏位之间按 AND 组合。
- 同一武器、同一规则名称存在多套推荐时，每套组合独立占一行。
- `评级` 和 `备注`为可选的来源说明，不参与武器身份匹配。
- 模板不暴露 `规则类型`。Excel/CSV 导入的有效行固定规范化为 `kind: "roll"`；DIM 的空 `perks=` 规则才规范化为 `kind: "weapon_only"`。
- 规则 ID、武器 Hash、图标、赛季、获取来源、勇士类型、来源更新时间和 Manifest 版本由系统生成或从资料库补齐。

模板不承担 DIM 原始 Wishlist 的导入。DIM 仍使用原生文本解析器，但解析结果必须进入同一套 `RecommendationSource` 与 `RecommendationRule` 模型。

## 实现范围

1. 在 `packages/core` 建立统一来源、规则、要求组和命中结果类型。
2. 将 DIM 解析器和 Excel/CSV 解析器改为输出统一规范化 DTO。
3. 将匹配服务改为消费规范化规则，不再通过顶层 `dim_wishlist` 分支维护第二套结果结构。
4. 将数据库从“单个 `dim_wishlist` 外部集合”升级为文档、来源实例和规则三级结构：规则、来源停用、规则移除和 revision 均按 `sourceId` 隔离，文档更新按 `documentId` 组织。
5. 保留原始导入内容、source block、作者、标题和可重建所需的 metadata，便于更新、纠错和问题追溯。
6. 将当前旧的单例 DIM 数据迁移为一个带 fingerprint 的文档和一个具体来源实例，不丢失已有规则和用户停用/移除状态。
7. 仓库来源行、推荐筛选、武器卡片和装备详情统一使用 `sourceId`；来源类型只作为展示标签，不作为业务分支。
8. 导入预览统一返回文档信息、来源分组、标题、作者、来源类型、revision、规则数、武器数、仅推荐武器数和异常摘要。

## UI 约束

来源列表按来源实例展示，而不是把所有 DIM 合并成一行：

```text
[✓] Aegis推荐
[✓] LGpig推荐
[ ] LGPig DIM愿望单 · moc
[ ] DIM Voltron
[ ] 我的 PVE 愿望单
```

仓库卡片和详情必须显示具体来源名称，例如“符合 LGPig DIM愿望单 · moc”，不能压缩为无来源的“符合 DIM”。多来源筛选继续按每个已选来源的独立条件执行 AND；同一来源的多条规则仍按备选组合处理。

同一文档包含多个来源时，管理界面仍以文档行作为顶层管理对象；来源实例、作者和 block 在详情中逐条查看：

```text
▾ DIM Community Sources
  [✓] LGPig Weapon Wishlist · moc
  [ ] Voltron PvE Wishlist · Voltron
  [ ] 未命名注释段的文档标题
```

文档折叠只影响管理界面的容器，不改变来源实例的启停、筛选和匹配语义。来源行必须保留标题和作者；作者相同的多个 Wishlist 仍显示为多行。

## 不在本任务范围

- 不重新设计 T20 已验收的仓库整理、锁定、转移和分解保护流程。
- 不新增推荐评分算法，不把多个来源计算成一个总分。
- 不把 DIM 语义强行改成固定六栏，也不把人工推荐改成 DIM 原始文本。
- 不在本任务内扩展攻略、AI 或配装导入格式。

## 验收标准

- 同时导入两份不同 DIM Wishlist 和一份 Excel 推荐表，三者在数据库、来源管理、仓库筛选、卡片和详情中均可独立识别。
- 导入一份包含多个作者或 source block 的 DIM 聚合文件时，各逻辑来源可独立启停、筛选、移除和显示；没有元数据的分组仍按稳定顺序保留。
- 同一 DIM 来源导入新 revision 时更新原来源，不产生重复来源；重复 fingerprint 导入保持幂等。
- 同一作者的两份不同 Wishlist 不会合并；同一文档下的不同来源规则不会互相覆盖。
- 空 `perks=` 规则保留并显示“仅推荐武器 / 未指定 Roll”。
- DIM 多条组合不跨组合累计；人工表格同栏候选仍按“任选其一”匹配。
- DIM 与 Excel 对同一规范化规则通过同一个匹配入口，卡片、详情和筛选的命中结果一致。
- 来源停用、来源移除、单条规则移除和旧单例数据迁移均按来源实例隔离；文档级更新不会抹掉其他文档的来源状态。
- 当前 T55 的竖向来源行可以直接消费多个唯一 `sourceId`，不会因来源名称相同而覆盖徽标或筛选事实。

## DIM 愿望单的组合结构（2026-09-14 实测）

用账号在用的两份真实文件全量统计，结论是「一个来源对一把武器写了几十上百行」几乎都不是几十套独立推荐，而是把「每栏候选」展开成了笛卡尔积：

| | 行数 | 武器数 | 多行武器 | 其中笛卡尔积 | 冗余行（超集） |
|---|---|---|---|---|---|
| Aegis（`dim_wishlist_aegis.txt`） | 8068 | 935 | 863 | **863（100%）** | 0 |
| 小棒猪（`DIMLGpigWeaponWishlist by moc.txt`） | 8956 | 413 | 257 | 0（原始）→ **257（100%，去冗余后）** | 257 把，占总行数 **81.4%** |

- Aegis 是机器生成的笛卡尔积：例如纳斯尔丁 36 行 = 2 刃 × 2 护手 × 3 Perk1 × 3 Perk2 × 1 起源。无重复行、无行列数不一致、单把最大展开 54 行。
- 小棒猪是「排序表 + 前缀子集」写法，行长 0～6 个 perk 混排，所以原始形态不是笛卡尔积；去掉**被包含的冗余行**后，257 把全部变成笛卡尔积，且**每把都恰好是「2 栏任选其一」**（如 350 行 → 20 行 = 4×5，21 → 6 = 3×2，毫不迟疑 3 → 2 = 1×2）。
- 超集行冗余的判据：一行要求所列 perk 全中，因此满足更长的行必然满足被它包含的短行，长行对「是否命中」没有额外贡献。
- 因此两种写法都可以按同一语义展示：**同一来源同一武器的组合先去掉冗余超集行，再折叠成「每栏候选池，每栏任选其一」**，与人工 CSV 来源已用的 `perk_pool` 展示一致。
### 已确认的判定口径（2026-09-14）

DIM 与人工 CSV 统一到同一个「逐栏候选池」模型，规则如下：

- 同一来源、同一武器的组合集合，**先去掉被包含的冗余超集行，再判断是否为各栏候选的笛卡尔积**；成立时归约成「每栏任选其一」，不成立时（例如在线合集 `dim_voltron`）保留原有的「一行一个完整组合」语义。
- 判定单位从「组合行」改为「栏」：每栏命中任一候选即该栏命中，**x/y = 命中栏数 / 真实要求的栏数**；取消「符合 N 套」这个指标（归约后只剩一套区间，命中即命中）。
- 布尔结论不变：穷举 257 把多行武器的全部可能 perk 组合，归约前后「是否命中」0 处不一致。变化的是 `x/y` 的分母（毫不迟疑从 `x/3` 变 `x/2`，VS速度指挥从 `3/6` 变 `2/2`），分母改由「这套推荐真实要求几栏」决定，不再受作者展开写法影响。
- 数据层仍保留 DIM 原始行、注释段与来源信息；归约只发生在匹配与展示投影，原始组合语义可随时还原。
- 归约后 DIM 与人工 CSV 共用同一套规则结构与文案：卡片统一 `Perk x/y · 完整 x/y`，详情统一「每栏候选池（每栏任选其一）」。

### 来源类型只做标签，不做业务分支

DIM 与人工 CSV 的区别只在**数据来源与清洗方式**：入库时必须归一成同一套模型，入库后判定、事实、渲染、文案、排序全部走同一条路径。当前实现按来源类型分叉了整整一层（数据模型 `PerkCombo` 对 `RecommendationSourceRecord`、匹配入口 `matchDimWishlistCombos` 对 `matchSourceRecords`、事实 `dim_wishlist` 对 `source_matches`、渲染「推荐 Roll 卡」对「来源证据卡」、文案 `符合 N 套 · 最佳组合 x/y` 对 `Perk x/y · 完整 x/y`、排序上 DIM 固定垫底），是本轮多个 Bug 的共同成因。归一后的目标模型：

- 一个来源实例下挂若干**规则**；一条规则是「若干栏要求」，每栏是 `{ slot, operator: any | all, candidates }`。
- 「一行全套组合」就是 `operator: all` 且每栏只有一个候选的**退化形态**，与「每栏任选其一」是同一个类型、同一个匹配函数、同一个渲染组件，不是两套模型。
- 来源级结论统一为「任一规则命中即该来源符合」。
- 来源类型只出现在**名字与标签**上，任何一层都不允许出现 `if (来源是 DIM)` 这类分支。
- 键也必须收敛：现在 DIM 同时存在 `dim_wishlist`（旧聚合键）、`dim:<documentKey>`（文档级）与 `dim_voltron`（在线合集）三套键，人工来源是 `source_key`；归一后所有来源实例统一用 `sourceId` 标识，聚合键只作为历史迁移别名存在。
- 缓存键同样要归一到同一份输入：现在 `vault_weapon_match_cache` 的 revision 由「匹配算法版本 + DIM 文档指纹 + 覆盖规则」组成，人工来源的规则变化不在其中；归一后 revision 必须覆盖**全部来源**的规则指纹。

### 目标分层

```text
① 入库层（允许按格式不同）
   DIM 解析器 / CSV 解析器 → 归一成同一个「来源实例 + 规则」模型
     SourceInstance { sourceId, kind: dim|csv|builtin, label, state }
     Rule { ruleId, mode, columns: [{ slot, operator: any|all, candidates: PerkRef[] }], provenance }

② 事实层（core，唯一）
   MatchFact：实例 × 来源 × 规则 → 逐栏 { state, 来源候选, 本件拥有, 当前启用 } + x/y
   卡片、筛选、详情、推荐来源、验收报告只读它，界面不自行判定

③ 投影 + 渲染（唯一）
   一个来源卡组件，按「栏」渲染两列（来源要求 ｜ 本件拥有）
   DIM / 人工 / 内置 / 将来任何来源都用它；来源类型只出现在名字与标签上
```

### 分叉的代价（为什么必须归一）

按 `/game-ui-ux` 的原则对照：分叉等于「按来源类型写死的 flag soup」——每加一种来源、每改一次判定，都要在数据、匹配、事实、渲染、文案、排序、缓存 N 处同步改，漏一处就是"卡片与详情不一致""交互不一致"，本轮 Bug #88 / #89 / #90 全部由此产生；等于两个 HUD 各自读不同的状态源（本该由事实层算一次推给界面）；等于用「来源类型」而不是「来源实例 + 规则 + 栏位」做锚点。归一后这些结构性成因才消失。

### 改造清单与交付顺序

内部收敛分四批，每批独立可验收，每批 bump 匹配算法版本：

1. **入库归一**：DIM 归约成逐栏候选（`operator: any`），与人工 CSV 使用同一个规则模型（已完成基础归约与栏位事实）。
2. **渲染归一**：DIM 也走来源证据卡（两列 来源要求 ｜ 本件拥有），删除 DIM 专属单列卡与「符合 N 套 · 最佳组合 x/y」文案；排序改为所有来源同级（按符合程度、平级按来源名）。
3. **匹配与事实归一**：删除 `matchDimWishlistCombos` 与顶层 `dim_wishlist` 事实形状，DIM 也走 `matchSourceRecords`，事实只留一份。
4. **键与缓存归一 + 合同改写**：`dim_wishlist` / `dim:<documentKey>` / `dim_voltron` 收敛到统一 `sourceId`；缓存 revision 覆盖全部来源指纹；删掉合同里「DIM 最低权重固定排在最后」「DIM 保持组合语义」这类按类型写的规则。
### 批次④ 现状（2026-09-15）

| 项 | 状态 |
|---|---|
| 缓存 revision 覆盖全部来源指纹 | ✅ 已满足，无需改动。现有输入：匹配算法版本、知识库 `source_fingerprint`、DIM 文档与来源实例（含 label / state / revision）、全部 `external_recommendation_sets` 指纹、本地覆盖状态 |
| 合同里按类型写的规则 | ✅ 已改写：「DIM 最低权重固定排在最后」→ 所有来源同级按符合程度排序；「DIM 保持组合语义 · 符合 N 套」→ 与人工来源同一套 `Perk x/y · 完整 x/y` |
| 删除恒空的 `dim_wishlist` 事实字段 | ⬜ 未做，**64 处引用 / 14 个文件**：`core/community-perks/{types,communityPerkRecommendationService,recommendationCardSummary}.ts`、`core/evidence/itemDecision.ts`、`core/targets/equipmentTargets.ts`、`app/workspaces/{vaultList,vaultRecommendationAudit}.ts`、`ui/recommendationMatchView.ts`、`desktop/renderer/features/vault/VaultPage.tsx`、`desktop/.../item-detail/{buildWeaponDetailView,ItemDetailCommunity}.tsx`、`desktop/.../ItemDetailModal.tsx`、`desktop/main/ipc/{community,targets}.ts`。建议顺序：core 类型 → core 服务（去掉 `dim` 返回值与 `sourceMatchCompatibilityResult` 的 DIM 参数）→ 卡片摘要类型 → core 其它消费方 → app / ui / desktop，每步编译驱动 |
| 键收敛（`dim_wishlist` / `dim_voltron` 别名 → 统一 `sourceId`） | ⬜ 未做，与上一条同一批文件，建议一起做 |
| 导入期校验（按行忽略） | ⬜ 未做，需要解析层报告「被忽略行数 / 涉及武器数 / 每类问题示例」，并在预览与导入回执中展示 |

### 键派生与来源模型收口（2026-09-15 已确认）

**结论：来源 key 必须由来源名派生，不允许存在「名字 → key」的字典表**——玩家自定义来源名无法穷举，字典表对已知名称有用、对其他名称无效，而且会被顺带用于写死显示名与排序权重。

| 项 | 决定 | 现状证据 |
|---|---|---|
| `stableSourceKeys` / `stableSourceUrls` 字典表 | **删除**，统一走已有的 `normalizeSourceKey()` 派生；原始链接改为来自导入内容或用户填写。需配一次旧 key → 新 key 的迁移（`aegis` / `lgpig` / `yxcrallxy` / `sayalarry` 已带数据） | `weaponRecommendationKnowledge.ts:56-70`、`:1535` 已存在 `stableSourceKeys[sourceLabel] ?? normalizeSourceKey(...)` 兜底 |
| `dim_voltron` | **删除**。它是字典表把「推荐来源 = DIM社区愿望单」映射出来的 key，代表「CSV 里混入的 DIM 数据」。删除字典表后一并清掉 4 个文件 / 12 处依赖：`weaponRecommendationKnowledge.ts`（7 处，含 `WHERE source_key != 'dim_voltron'`、匹配排除、两处 `continue/return`）、`recommendationMatchView.ts`（3 处）、`ItemDetailModal.tsx`（1 处）、`communityPerkRecommendationService.ts`（注释） | 玩家库里 `recommendation_sources` 无该行；其 CSV「推荐来源」列只有 Aegis / LGpig / YXCRALLXY / Sayalarry |
| `dim_wishlist` 作为**来源 key** | **删除**。旧版单例聚合键，当前库里无数据行；`wishlistStore.ts` 的一次性迁移入口随之移除（接受「不再迁移旧单例数据」） | `recommendation_sources` 无该行 |
| `dim_wishlist` 作为**组合类型标记**（`PerkCombo.source`） | **删除**。导入后数据已由来源实例标识，愿望单与 CSV 入库后的数据结构应当一致，差别只在解析方法；组合只需带 `source_id`，不再需要类型标记 | 现用 `PerkCombo.source: "dim_wishlist" | "local_community"` 区分两类组合 |

**执行顺序（一批做完，不做半迁移）**：① `normalizeSourceKey` 作为唯一派生 → ② 一次性迁移旧 key → ③ 删字典表与 `dim_voltron` 全部依赖 → ④ 删组合类型标记，改由 `source_id` 识别 → ⑤ 删 `dim_wishlist` 来源键与旧单例迁移入口 → ⑥ 全量类型检查、测试、bump 缓存版本。

**关键发现（2026-09-15）：来源名目前是白名单，不只是字典表。**

- 导入校验直接拒绝未知来源名：`weaponRecommendationKnowledge.ts` 校验分支里对不在字典中的 `推荐来源` 直接报错，文案为「人工推荐只接受 Aegis、LGpig、YXCRALLXY 和 Sayalarry 四个已管理来源；DIM 必须使用独立 Wishlist 数据链。」
- `curatedSourceKeys` 由字典表派生，来源管理界面因此只列这四个来源。
- 合同 `application-workspaces.md` 也写着「来源显示名固定使用 `Aegis推荐 / LGpig推荐 / YXCRALLXY推荐表 / Sayalarry推荐表 / DIM社区愿望单`」。
- 结论：这不是清理，而是**放开自定义来源**——玩家自己导出的任何推荐表都必须能导入、能作为独立来源管理。要改的是「名字 → key 派生规则 + 去掉白名单校验 + 来源管理改为完全从数据库读 + 合同改写」。

**进度（2026-09-15）**：① 已改纯派生规则并验证四个历史 key 不变（无需迁移）✅ ② 已删除来源白名单分支 ✅ ③ 已删除字典表与 `dim_voltron` 全部依赖（dist 中归零）✅ ④ 来源管理本就从 `recommendation_sources` 读，已满足 ✅。剩余 ⑤ 组合类型标记、⑥ `dim_wishlist` 来源键与旧单例迁移入口、⑧ 缓存版本。

### ⑤ 组合类型标记收口（方案 B，待执行）

目标：删除 `PerkCombo.source: "dim_wishlist" | "local_community"`。做法是**让 DIM 只产出来源事实（source records），不再产出 combos**，于是这个「来源类型」字段不再需要存在；「组合」概念只留给人工来源。

改动面（已核对）：

| 位置 | 改动 |
|---|---|
| `services/community/dimWishlistSource.ts`（112-137、255+） | `getRecommendations()` 不再产出 `combos`，改为产出按栏归约后的 `source_records`；`individual_perks`、`matched_modes` 等沿用 |
| `core/community-perks/communityPerkRecommendationService.ts`（514、841、860） | 删除 `matchDimWishlistCombos()` 与 `buildDimSourceMatch()` 等 DIM 专属路径（约 120 行）；`comboMatchRequirements()` / `evaluateComboRequirements()` 去掉 `combo.source === "dim_wishlist"` 分支，改判 `combo.dim_diagnostic` 是否存在 |
| `core/community-perks/types.ts`（63-70、104） | 删除 `PerkCombo.source` 与 `weapon_level_recommendations[].source` 字段 |
| `core/community-perks/localCommunityRecommendations.ts:36`、`services/community/weaponRecommendationKnowledge.ts:500` | 生产方不再打类型标记 |
| `core/ai/chat.ts:351`、`desktop/.../buildWeaponDetailView.ts:362` | 删除 `.filter((combo) => combo.source === "local_community")`——DIM 不产 combos 后这个过滤自然多余 |

风险：这条路径是匹配热路径（仓库扫描 748 件 + 缓存 + 验收报告）。必须一次做完并全量验证，**不做半迁移**；完成后再 bump 匹配算法版本。

**原执行顺序**：① 名字 → key 改为纯派生规则（规范化 + 去尾部「推荐/推荐表/社区愿望单」，保证 `Aegis推荐`→`aegis` 等现有 key 不变，无需迁移）→ ② 删除导入校验的来源白名单分支 → ③ 删字典表与 `dim_voltron` 全部依赖（4 文件 / 12 处）→ ④ 来源管理改为从数据库列出来源 → ⑤ 删组合类型标记，改由 `source_id` 识别 → ⑥ 删 `dim_wishlist` 来源键与旧单例迁移入口 → ⑦ 合同改写（去掉固定来源名）→ ⑧ 全量类型检查、测试、bump 缓存版本。


### 导入期校验：异常数据在入库前拦掉，运行期不留兜底

归约只能对「各栏候选的笛卡尔积」无损进行。实测两份真实文件的 1120 把多行武器全部可归约（Aegis 863/863、小棒猪去冗余后 257/257），但格式上并不能保证，因此**不把异常数据留到运行期兜底**，而是在解析后、写库前统一校验：

- **校验时机**：与人工 CSV 现有流程一致——先解析并展示预览与错误摘要，用户明确确认后才写入。
- **DIM 校验项**：① 每行形如 `dimwishlist:item=<hash>&perks=<hashes>`，item Hash 与 perk Hash 合法，`perks` 为空视为合法的「仅推荐武器」；② 同一武器组合集合去掉冗余超集行后，各栏候选种数之积须等于剩余组合数，且剩余组合两两不同；③ 同一行的全部 perk 都必须能唯一归入不同栏位（`cross_slot_ambiguous` / `unknown_slot` 不得进入栏位要求）。校验在**去冗余之后**执行，避免把作者正常写的前缀长行误判为冲突。
- **忽略粒度：按行忽略（已定）**。笔误在真实文件里很常见，因此只跳过有问题的那些行，其余正常行照常入库。被忽略的行不写入数据库。
- **忽略后的二次校验**：丢弃问题行后，该武器在该来源下的组合集合必须**重新通过可归约校验**。若剩余集合仍不构成各栏候选的笛卡尔积，则该武器的这部分规则**整体跳过**（不做"逐行删到能归约为止"，避免为了通过校验而悄悄丢掉正常数据）。因此运行期见到的永远是规范数据。
- **问题分类与归属**：
  - **可定位到具体行**（按行忽略）：Hash 非法、同一行内重复 perk、某行 perk 无法唯一归栏（`cross_slot_ambiguous` / `unknown_slot`）、同一行内两个 perk 落在同一栏。
  - **无法归因到单行**（整把武器跳过）：去掉重复行与冗余超集行后，剩余集合不构成各栏候选的笛卡尔积。
- **不做比例阈值**：不因为异常比例高而拒绝整份文件（笔误属于正常噪声）；仅当整份文件解析后**没有任何有效规则**时拒绝导入，沿用现有行为。
- **预览与回执**：导入预览列出被忽略的行数、涉及武器数、整把跳过的武器数，以及每一类问题的示例；**明确确认后导入**。导入结果回传「已忽略 N 条规则 / 涉及 M 把武器」，供界面与验收报告展示。
- **运行期**：入库数据保证已规范化，匹配与渲染不再保留第二条判定路径，也不再为异常数据写专属界面。

## 仓库推荐工作流（原 T57：仓库推荐工作流简化）

> 状态：🟠 重新设计中，待真实账号与窄屏实窗验收

### 目标

仓库只保留“浏览装备”和“推荐来源”两个工作区。推荐来源是独立来源工作台，进入后直接展示导入来源、覆盖统计和推荐结果；用户只需要“导入”或“管理”，规则、作者和证据放入详情弹框。不再提供独立的同名整理工作台和个人目标编辑入口。

### 已实现范围

- 移除仓库“整理同名”工作区，以及推荐结果行中的“整理同名”操作。
- 移除仓库“个人目标”子页，避免玩家在导入来源之外维护第二套推荐规则。
- 导入与导出平铺在推荐来源首屏，不再设置“导入人工推荐 CSV / 导入 DIM Wishlist”两个中介入口（两者原本打开同一弹框，只差初始焦点，属于多余层级）。
- DIM 在线 / 本地文件 / 粘贴文本与“导出为 CSV”作为一级操作直接点击；人工推荐 CSV 使用导入弹框，弹框内按“下载模板（中文 / 英文）→ 选择 CSV 文件 → 预览确认”排列，模板与导入属于同一条流程，不再作为独立导出项；导入始终保留“选文件 → 预览 → 确认写入”的确认边界。
- 保留导入预览、明确确认、来源管理、规则移除与恢复等真实能力。
- 同名比较、完整 Roll 和来源证据统一回到装备详情。
- 一个 DIM 导入文件只显示为一个顶层来源；作者 / 清单 block 只在详情弹框中展示。
- 推荐来源页移除三步引导、来源下拉和无来源时的大面积空态，来源行直接承载启停、删除、统计和详情入口。
- 一级页面先展示“已导入来源”管理列表；移除规则后的确认操作保持在详情弹框内，不会被弹框遮挡。
- 详情弹框使用仓库统一的 portal、背景 inert、Tab 焦点循环和关闭后焦点恢复，窄屏按底部抽屉方式容纳内容。

### 验收

1. 打开仓库，工作流栏只显示“浏览装备”和“推荐来源”。
2. 进入“推荐来源”后，来源列表、统计和推荐结果直接可见，不出现三步引导或“先选择来源”空白区。
3. 首屏能直接看到人工 CSV 和 DIM Wishlist 两个导入按钮；点击后在同一个弹框内完成预览和确认。
4. 一个 DIM 文件只显示一行；作者 / 清单分组只在该来源的详情弹框中显示。
5. 来源行直接提供查看详情、启用 / 停用和删除；删除会永久清除该来源的数据、规则和本地覆盖状态，不再显示在来源列表中。规则恢复只适用于详情中的单条规则移除。
6. 推荐结果行只保留“查看依据”，不再出现“整理同名”。
7. 页面中不再出现“个人目标”工作区或新增个人目标入口。
8. 结果排序保留名称、分组、品质、光等和护甲属性规则；选择“按推荐权重”时按优先级 → 比较 → 未收录、同级命中程度和来源权重排序，并保留规则说明。
9. 在 1280px、980px、760px 宽度检查容器换行，按钮和说明不横向溢出。

## 交接：剩余工作与执行清单（2026-09-15，可脱离上下文执行）

### 已完成并验证

四个包类型检查 0 错误、436 项测试全绿、产物已构建，匹配算法版本 18。

- **来源 key 派生**：`sourceKeyFromLabel()` 取代字典表（`Aegis推荐→aegis` 等四个历史 key 不变，无需迁移）；导入不再有来源白名单，任意自定义来源名可入库。
- **`dim_voltron` 清零**：字典表、SQL 排除、匹配排除、校验分支、UI 兜底全部删除，构建产物中已搜不到。
- **旧单例迁移入口移除**：`loadDimWishlist()` 只读新三级模型；`clearDimWishlist()` 不再清旧表。
- **DIM 与人工来源同构**：所有 DIM 来源产出来源事实（`source_matches[]`），`dim_wishlist` 事实恒为空；筛选事实、文案（`perk 命中`）、布局（统一 3 列网格）都不再按来源类型分叉。
- **模板**：`推荐来源` 为第一列，导入导出对齐。
- **界面层旧键兜底清零**：`isDimRecommendationSource`、`canonicalVaultRecommendationSourceId`、`VaultPage` 里的 `dim_wishlist` 兜底已删。

### 剩余工作

**⑤ 组合类型标记收口（方案 B）**：删除 `PerkCombo.source: "dim_wishlist" | "local_community"`。做法是让 **DIM 只产出来源事实、不再产出 combos**，于是「来源类型」字段不再需要；「组合」概念只留给人工来源。

| 文件 | 改动 |
|---|---|
| `services/community/dimWishlistSource.ts`（112-137、255+） | `getRecommendations()` 改为产出按栏归约后的 `source_records`，不再产出 `combos`；`individual_perks` / `matched_modes` 沿用 |
| `core/community-perks/communityPerkRecommendationService.ts`（514、841、860） | 删除 `matchDimWishlistCombos()` 与 `buildDimSourceMatch()` 等 DIM 专属路径（约 120 行）；`comboMatchRequirements()` / `evaluateComboRequirements()` 去掉 `combo.source === "dim_wishlist"` 分支，改判 `combo.dim_diagnostic` 是否存在 |
| `core/community-perks/types.ts`（63-70、104） | 删除 `PerkCombo.source` 与 `weapon_level_recommendations[].source` |
| `core/community-perks/localCommunityRecommendations.ts:36`、`services/community/weaponRecommendationKnowledge.ts:500` | 生产方不再打类型标记 |
| `core/ai/chat.ts:351`、`desktop/.../item-detail/buildWeaponDetailView.ts:362` | 删除 `.filter((combo) => combo.source === "local_community")`（DIM 不产 combos 后自然多余） |

### ⑥ 完成情况（2026-09-15 更新）

已清除（全部验证通过：类型检查 0 错误、436 项测试全绿、services 已重建）：

- `recommendationManagement.ts`：来源键过滤、规则作用域、override 判定里的旧键判断；**旧聚合键 hash 聚合分支**整块；**`removeSourceDataset` 旧键分支**整块（`dim:` 分支提升为首分支，`try/catch` 结构已核对）。
- `externalRecommendationStore.ts`：类型联合去掉 `"dim_wishlist"` 成员。
- `dimWishlistSource.ts` + `perkRecommendation.ts` + `core/test/communityPerks.test.ts`：删除旧式单来源 `createDimWishlistSource()`，测试改用 `createDimWishlistSources(dir)[0]`。

**仍未清（下一次连同 ⑤ 一起做）**：

- `communityPerkRecommendationService.ts` 的 DIM 组合路径（属 ⑤，见上表）。
- `desktop/main/ipc/community.ts:191` 的 `sourceKey === "dim_wishlist"` 兜底（已不可达）。
- 注意：`core/evidence/itemDecision.ts`、`core/targets/equipmentTargets.ts`、`desktop/main/ipc/targets.ts` 里的 `"dim_wishlist"` 是**装备目标的来源种类**（`dim_import` / `local_data`），属于另一个领域，**不在本次收敛范围**，不要误删。

**⑥ 原始清单（已完成大部分，见上）**： `dim_wishlist` 引用（7 处，均在 services，无活数据路径）**

| 位置 | 内容 |
|---|---|
| `recommendationManagement.ts:226` | 来源键过滤里的旧键判断 |
| `recommendationManagement.ts:241、248` | 旧聚合键的 hash 聚合分支 |
| `recommendationManagement.ts:293` | `removeSourceDataset` 的旧键分支 |
| `recommendationManagement.ts:342` | 规则作用域判断 |
| `recommendationManagement.ts:372` | override 来源判定 |
| `dimWishlistSource.ts:33` | 旧式单来源 `createDimWishlistSource()` 的聚合 id（core 有测试引用，需同步调整） |
| `externalRecommendationStore.ts:10` | 类型联合 `ExternalRecommendationSourceKind` 的旧成员 |

### 执行顺序与完成判据

1. 先做 ⑤（动匹配热路径，必须**一次做完、不做半迁移**），再做 ⑥（纯删除）。
2. 每步跑：`pnpm --filter @d2-tools/core typecheck`、`services typecheck`、`ui typecheck`、`pnpm --filter @d2-tools/desktop exec tsc -p tsconfig.renderer.json --noEmit`，以及 `npx vitest --run packages/core/test packages/app/test packages/desktop/test`（当前基线 114 文件 / 436 项）。
3. 完成后 bump `matchAlgorithmVersion`（当前 18）并重建 `core` / `services` / `app` / `ui`。
4. **完成判据**：全仓搜 `PerkCombo.source`、`combo.source`、作为键的 `"dim_wishlist"` 皆为 0 处；仓库扫描 748 件照常；卡片、详情、推荐来源筛选与改造前**显示一致**（因为匹配结果本来就来自来源事实）。

### ⑤ 的处置规则（2026-09-15 已定，替换原“待定”表述）

**问题**：`matchSourceRecords()`（人工来源匹配路径）只认六个栏位 `barrel / magazine / masterwork / perk1 / perk2 / origin`；DIM 诊断会产出六栏之外的值（`special` 特殊插槽、`unknown` 无法定位）。直接把 DIM 改成产 `source_records` 时，这些要求会被整条丢掉。

**实测澄清**：账号 748 件缓存中 `special` / `unknown` 均为 **0 例**；该缺口只在边界数据上出现。

- `unknown` = 候选项在当前武器定义里查不到（hash 不在该武器 perk 池、名字也对不上）→ 本质是「数据不足」。
- `special` = 插槽里只有「识别不了又不被忽略」的插件。实际来源是旧版武器的「构筑特性」（manifest 类别 `build_perk`，itemTypeDisplayName「弃用的特性」，插件如「手炮灵巧」「动能武器灵巧」）。

**处置规则**：

1. **弃用特性归入忽略类别**（已实现）：`isIgnoredWeaponRollPlug()` 增加 `build_perk` 与「弃用的特性」，这类插槽不再参与 Roll 分类，也不再产生 `special` 假栏位。
2. **定位不到的要求归「无法判断」，不得删除**：清单要求一个 Perk 时——能在本件任一插槽按 hash 或同名找到，就计入分母并核对命中/未命中；定位不到（栏位无法唯一归属、或属于被忽略类别），该条要求计入「无法判断」，**不参与命中数、但保留在要求总数里**。分母永远等于清单真实要求的条数，不允许出现“分母悄悄变小、x/y 变好看”。
3. **不新增「特殊插槽 / 未定位 Perk」两个栏位**：这两者是插槽模型的信息丢失，不是真实栏位。
4. **测试夹具同步**：`communityPerks.test.ts` 的合成武器 socket 定义不完整（会落到 `special`），实现 ⑤ 时把夹具改成正常插槽结构，并把断言从 `combos` 改为 `source_matches`。

**⑤ 执行顺序**：① 落实上面 1-4 → ② DIM 来源改为只产 `source_records`、`combos: []` → ③ 删除 core 的 DIM 组合路径（`matchDimWishlistCombos` / `buildDimSourceMatch` / `buildDimComboSourceMatch`，约 120 行）与 `combo.source === "dim_wishlist"` 分支 → ④ 删除 `PerkCombo.source` 与 `weapon_level_recommendations[].source` 及两个生产方的标记 → ⑤ 删除两处 `combo.source === "local_community"` 过滤 → ⑥ bump `matchAlgorithmVersion`（当前 18）并重建 core/services/app/ui → ⑦ 全量类型检查 + 测试全绿。

### ⑤ 第二次试做记录（2026-09-15，已回退，供下次直接复用）

**已完成的准备**（保留，均验证通过）：

- 测试夹具已补 `itemTypeDisplayName: "特性"` + `plug.plugCategoryIdentifier: "frames"`（顶层 11/22 与强化特征用例的 33/44/55），DIM 诊断不再落到 `special` → 15 项通过。
- `build_perk`（弃用的特性）已并入 `isIgnoredWeaponRollPlug()`。

**把 DIM 改成产 `source_records` 后，暴露的第二个缺口（本次卡点）**：

`matchSourceRecords()` 的逐栏拥有判定只从 `item.weapon_roll.sockets[].owned_plugs` 取：

```ts
const rollSocket = item.weapon_roll?.sockets.find((socket) => socket.slot === slot);
const instanceOwned = (rollSocket?.owned_plugs ?? []).map(...);
const matches = Boolean(rollSocket) && instanceOwned.some(...);
```

因此**没有 `weapon_roll`、只有 `socket_plugs` 的物品**（测试夹具即此形态，真实账号通常有 weapon_roll）会被判成 `uncheckable`；而 DIM 组合路径原本用 `ownedPlugIdentity()`（已支持 `socket_plugs` 兜底）能正常判定。表现：

```
× counts a same-named enhanced trait toward a base trait requirement
  expected 'uncheckable' to be 'full'
```

**下次的正确改法**（两处一起改，注意类型形状）：

1. `instanceOwned` 增加兜底：无 `weapon_roll` 且 `socket_plugs` 非空时，用全部 `socket_plugs` 作为该栏的"本件拥有"。注意这些对象必须满足 `AccountWeaponRollPlugSummary`（不要加 `current` 之类的额外字段，会触发 TS2322 联合类型不兼容）。
2. `matches` 去掉 `Boolean(rollSocket) &&`；`cannotCheck` 去掉 `|| !item.weapon_roll`，改成仅在"既无 weapon_roll 又无 socket_plugs"或 `rollSocket.complete === false`（或 `hasIncompleteRelevantRollData`）时才算无法判断。

**其余 3 条失败属预期**：测试断言仍在检查 `combos`（DIM 改为 `combos: []` 后为空），需按计划改为断言 `source_records` / `source_matches`：

| 测试 | 行 | 现断言 | 应改为 |
|---|---|---|---|
| returns recommendations from a local DIM wishlist | 85 | `result.combos` 长度 2 | `result.source_records` |
| matches vault items against community combos | 158 | 期望 2 | 断言 `source_matches` |
| aggregates every enabled local source when matching vault items | 187 | 期望 2 得到 1 | 同上 |

### 本轮踩过的坑（新会话直接复用，不要重犯）

1. **改了事实结构必须 bump 匹配算法版本**，否则读到旧缓存（本轮出现过「详情栏位整片空白」）。
2. **归一化会成批生效**：改数据形状时，必须同时盘清所有「按来源类型或固定来源写死」的映射。本轮陆续发现 7 处：导入白名单、筛选白名单 ×2、筛选事实分支、界面文案、完整下拉门禁、完整键收集、条件区网格列数——每漏一处就是一次返工。
3. **布局假设要跟着控件数走**：给 DIM 补上「完整」下拉后，条件区网格仍是 2 列 → 控件换行并压到下一行。控件数变化时必须同步检查宽屏与窄屏两处 `grid-template-columns`。
4. **不要用正则做大段删除**：本轮用正则删 JSX 时误删 23 行（组合列表 + 免责声明），必须按锚点精确替换，并用 `git diff` 核对改动范围。
