# T56：统一推荐模型与多来源导入

> 状态：🟠 开发完成，待真实数据验收（规则、文档来源持久化、DIM 分组和多来源展示已接入）

首批实现已新增 `recommendation_documents`、`recommendation_source_instances` 和 `recommendation_source_rules` 三层存储；旧版 `external_recommendation_sets` 仍保留用于兼容读取和迁移。

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
- 没有可识别元数据时，按文件内稳定顺序建立 `未标注来源 #1`、`未标注来源 #2` 等来源；
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
- DIM 无法唯一归栏的 Hash 仍使用 `all` 保留原始组合语义，并附带栏位诊断。
- `perks=` 为空的 DIM 规则转换为 `kind: "weapon_only"`，不得丢弃。
- 来源备注、作者、原始链接、分组、revision 和解析诊断作为 provenance 保留，不由 UI 猜测。

## Excel/CSV 模板

Excel 和 CSV 使用同一套 11 列字段合同，只提供两份表头语言版本：中文模板和英文模板。两份模板的列顺序、字段数量和填写规则完全一致；旧版 13 列普通玩家模板与 31 列 T20 完整包只保留兼容读取，不再继续导出。

中文模板字段：

```text
武器,规则名称,用途/分类,枪管/瞄具,弹匣,大师,Perk 1,Perk 2,起源特性,评级,备注
```

英文模板字段：

```text
Weapon,Rule Name,Mode / Category,Barrel / Sight,Magazine,Masterwork,Perk 1,Perk 2,Origin Trait,Rating,Note
```

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
  [ ] 未标注来源 #1
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
