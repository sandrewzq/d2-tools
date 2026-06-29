# 小日向攻略解析与账号证据工作台

> 状态：Backlog
> 更新时间：2026-06-29

## 目标

让用户粘贴中文攻略、视频文案、装备说明或一句配装目标后，小日向能判断“我的账号能不能照着做、缺什么、哪里需要确认、能不能先生成草稿”。这份 backlog 是独立可执行需求，不依赖其他 backlog 文档才能落地。

## 用户场景

玩家看到一段中文攻略：

> 猎人金枪头，带不朽 + 火箭筒，胸甲堆韧性，模组看情况补纪律，武器最好有嫉妒刺客 + 爆炸光能。

他希望 d2-tools 给出：

- 账号里有没有“金枪头”对应异域。
- 有没有“不朽”这把武器。
- 不朽是否命中推荐 perk。
- 火箭筒有没有可替代选择。
- 当前猎人护甲是否能接近韧性 / 纪律目标。
- 哪些词小日向不确定，需要用户确认。
- 能不能保存一个配装草稿，后续再手动装备或确认写操作。

## 产品原则

1. 事实优先：所有结论必须能回到账号、Manifest、wishlist 或本地规则。
2. AI 不编事实：AI 可以帮忙解析文本和总结，但不能直接断言账号里有什么。
3. 不确定要显式展示：俗称、模糊武器、缺失 Manifest、数据源不可用时显示“待确认”。
4. 先做可达性，不先做完整优化器：先告诉用户能不能抄、离目标差多少。
5. 可保存草稿，不自动执行：写操作必须继续经过开关、scope 和用户确认。

## 输入范围

支持输入：

- 纯中文攻略。
- 中英混写攻略。
- 武器 / perk 俗称。
- DIM 或社区配装文案。
- 一句自然语言目标，例如“给我看看术士火中能不能抄一套奶球”。

当前不要求支持：

- 图片 OCR。
- 视频链接自动解析。
- 完整 DIM build 链接还原。
- 自动读取第三方网页全文。

## 数据来源

必须优先使用：

- Destiny Manifest：装备、perk、socket、bucket、class、source。
- Bungie Profile：角色、装备实例、perk roll、位置、锁定状态。
- 本地 DIM wishlist：用户主动导入的愿望单规则。
- 本地目标规则：用户在仓库或装备详情中维护的目标。
- 本地缓存：Manifest、light.gg 分析缓存、账号快照。

可选使用：

- AI：解析自然语言、归纳结果、生成用户可读说明。
- light.gg 实时分析：仅在用户显式开启且服务可用时使用。

禁止行为：

- 在没有 Manifest 或账号证据时，把 AI 猜测显示成“已满足”。
- 外部网络失败时让核心匹配失败。
- 把 token、API Key、Client Secret 或 OAuth 细节发送给 AI。

## 核心数据模型

建议把小日向的输出统一成 `BuildGuideEvidence`：

```ts
type EvidenceStatus = "matched" | "partial" | "alternative" | "missing" | "uncertain";

interface BuildGuideEvidence {
  guide_id: string;
  source_text: string;
  parsed_requirements: ParsedGuideRequirement[];
  account_matches: GuideRequirementMatch[];
  alternatives: GuideAlternative[];
  armor_reachability: ArmorReachabilitySummary | null;
  draft_loadout: GuideLoadoutDraft | null;
  warnings: GuideEvidenceWarning[];
}
```

每个 `GuideRequirementMatch` 必须包含：

- `status`：统一状态。
- `requirement_label`：用户能看懂的要求。
- `normalized_target`：映射后的 Manifest / 本地规则目标。
- `evidence`：命中的 item hash、instance id、perk hash、rule id 或数据源。
- `reason`：中文解释。
- `confidence`：`high | medium | low`。

## 解析要求

### 装备识别

必须识别：

- 武器名称。
- 护甲名称。
- 异域名称。
- 职业限制。
- 槽位。
- 武器类型。
- 弹药类型。

处理方式：

- 精确命中 Manifest 名称时直接归一。
- 俗称通过本地 alias 表归一。
- 多个候选时进入待确认。
- 未识别时保留原词，并标成待确认。

### Perk 识别

必须识别：

- 中文 perk 名。
- 英文 perk 名。
- 常见缩写或口语。
- perk 组合关系，例如“嫉妒 + 爆炸光能”。

匹配时必须检查装备实例 socket 中是否含对应 perk hash，不能只看文本。

### 职业与子职业

必须识别：

- 泰坦、猎人、术士。
- 常见子职业和元素表达。
- 星相 / 碎片 / 手雷 / 近战的候选文本。

如果 Manifest 或当前数据无法可靠映射星相 / 碎片，先作为待确认要求展示，不要影响装备匹配主流程。

### 属性目标

必须识别：

- 韧性、恢复、纪律、智慧、力量、敏捷。
- “双百”“三百”“堆韧性”“补纪律”等模糊表达。

模糊目标必须转成区间或待确认，例如“堆韧性”显示为“韧性优先，具体数值待确认”。

## 界面设计

小日向侧栏应从单一结果区升级为“任务工作台”：

1. 输入区：粘贴攻略、选择当前角色、选择是否使用 AI。
2. 解析区：展示识别出的装备、perk、职业、属性目标和待确认词。
3. 账号命中区：按已满足、部分满足、可替代、缺失、待确认分组。
4. 证据区：展示命中的装备位置、角色、perk、规则来源。
5. 草稿区：允许保存配装草稿，但不自动装备。
6. 风险区：展示数据源失败、AI 不确定、light.gg 不可用等提示。

UI 文案必须中文优先。组件可以继续放在小日向侧栏中，但复杂展示逻辑应进入 `shared/domain/assistant` 或对应 ViewModel，避免 TSX 直接堆业务判断。

## 代码边界

建议落点：

- `packages/core/src/assistant/guideSchema.ts`：扩展结构化 schema。
- `packages/core/src/assistant/guideParsing.ts`：文本解析和 alias 处理。
- `packages/core/src/assistant/guideMatching.ts`：账号证据匹配。
- `packages/core/src/assistant/loadoutDraft.ts`：草稿生成。
- `packages/services/src/d2SkillService.ts`：服务层组合 Manifest、Profile、本地规则。
- `packages/app/src/workspaces/kohinataBot.ts`：workspace 输出稳定 ViewModel。
- `packages/desktop/src/main/ipc/assistant.ts`：IPC 契约。
- `packages/desktop/src/renderer/api/assistantApi.ts`：renderer API 类型。
- `packages/desktop/src/renderer/shared/domain/assistant/kohinataViewModel.ts`：UI 数据归一。
- `packages/desktop/src/renderer/components/GlobalAssistantSidebar.tsx`：界面呈现。

边界要求：

- `core` 不依赖 Electron、React、Node 平台能力。
- `services` 负责组合平台 adapter。
- `app` 负责 workspace 编排。
- `desktop` 只做 IPC、UI 和桌面交互。

## 开发切片

### 切片 1：证据模型统一

产出：

- 定义 `BuildGuideEvidence`、`EvidenceStatus`、`GuideRequirementMatch`。
- 现有解析和匹配结果迁移到统一状态。
- 测试覆盖已满足、部分满足、缺失、待确认。

验收：

- 任何攻略结果都能显示统一状态。
- 不再出现只有自然语言总结、没有证据来源的命中。

### 切片 2：Manifest 和 alias 归一

产出：

- 装备、perk、职业、属性的 alias 表。
- 中英混写解析。
- 多候选待确认。

验收：

- 真实中文攻略中的俗称不会直接丢失。
- 无法唯一确认的词显示为待确认。

### 切片 3：账号装备与 perk 命中

产出：

- 账号装备索引。
- socket perk hash 命中。
- DIM wishlist / 本地目标规则来源标注。

验收：

- 武器命中能说明具体 perk 是否满足。
- 同名不同 roll 能区分。

### 切片 4：轻量护甲可达性

产出：

- 固定职业下的护甲候选扫描。
- 固定异域或核心护甲条件。
- 目标属性可达 / 接近 / 不可达判断。

验收：

- 输出不超过 5 个候选方案。
- 每个方案能解释差距。
- 不假装是完整 optimizer。

### 切片 5：小日向工作台 UI

产出：

- 解析、命中、证据、草稿、风险五区展示。
- 清晰的空状态、错误态和加载态。
- 保存配装草稿入口。

验收：

- 1366px 和 1920px 下结果区不挤压。
- 长攻略不会让侧栏无法操作。
- 用户能一眼看出哪些要求已满足、哪些缺失。

## 测试要求

必须覆盖：

- `guideParsing` 的中文、英文、中英混写、俗称、多候选。
- `guideMatching` 的已满足、部分满足、可替代、缺失、待确认。
- `loadoutDraft` 的草稿生成和缺失阻断。
- `d2SkillService` 的服务组合。
- `kohinataBot` workspace 的 ViewModel。
- `GlobalAssistantSidebar` 的关键文案和状态。

推荐命令：

```powershell
npx pnpm@9.15.0 test
npx pnpm@9.15.0 typecheck
npx pnpm@9.15.0 docs:check
```

## 完成标准

这份 backlog 完成时，应满足：

1. 粘贴 10 条真实中文攻略，小日向能稳定提取装备、perk、职业、属性目标和待确认项。
2. 使用真实账号时，每个命中结论都有证据。
3. 同名不同 roll 能准确区分 perk 命中。
4. 护甲目标能给出可达性判断和差距说明。
5. 能保存配装草稿。
6. AI 和外部来源失败时，本地解析和账号匹配仍可用。

## 非目标

- 不做图片 OCR。
- 不做自动读取视频或网页全文。
- 不做完整 D2ArmorPicker 级优化器。
- 不自动装备或转移装备。
- 不自动分解装备。

