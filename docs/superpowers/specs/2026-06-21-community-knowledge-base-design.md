# 社区武器知识库（AI 引用）设计文档

> 日期：2026-06-21  
> 关联资料：
> - [腾讯表格：d2 武器 perk 推荐](https://docs.qq.com/sheet/DYkR5enNIdUt1VFhK?tab=000001)
> - [小黑盒：命运2-凯旋丰碑-全种类武器推荐](https://www.xiaoheihe.cn/bbs/post_share?h_camp=link&redirect_data=...)
> - 前期分析：[docs/2026-06-21-destiny2-weapon-sheet-analysis.md](../../2026-06-21-destiny2-weapon-sheet-analysis.md)

## 1. 目标

将腾讯表格（Aegis 整理）和小黑盒帖子（日栎撰写）这两份社区资料纳入 d2-tools 的 AI 助手上下文，使 AI 在分析单件装备、整个仓库或回答聊天问题时，能够引用中文社区对武器框架、perk 组合和活动掉落的评价，输出更贴近国服玩家语境的建议。

成功标准：
- AI 在分析装备了社区资料覆盖的武器时，回答中包含相关社区观点（明确标注来源）。
- 资料更新后，应用启动时能自动检测到变更并同步到本地知识库。
- 知识库可按活动/副本分组查询。
- 不引入重型向量数据库或外部 embedding 服务。

## 2. 背景与约束

- 当前 AI 助手通过直接调用 OpenAI/Anthropic/兼容接口，将 prompt 文本注入 messages。
- 当前社区 Perk 推荐已有 `CommunityPerkSource` 抽象和 `WeaponRecommendation` 类型，但只支持 perk 组合匹配，不包含文本评价。
- 腾讯表格以图标展示 perk，自动 OCR 成本高；小黑盒帖子是纯文本，更容易结构化。
- 资料属于社区创作，不在应用内直接分发原始表格/帖子全文，只在 README 中注明来源和作者。

## 3. 总体架构

```
原始资料（外部）
    │
    ▼
[build-knowledge]  构建脚本（开发/CI 时运行）
    │
    ▼
结构化知识库 JSON  （提交到仓库）
    │
    ▼
[KnowledgeService]  运行时服务
    │
    ▼
AI prompt 注入  ◄──  应用启动时 [UpdateChecker] 检查外部资料变更
```

## 4. 数据模型

### 4.1 原始资料存储

```
docs/external/weapon-recommendations/
├── README.md                 # 说明资料来源、作者、更新方式
├── tencent-sheet/
│   ├── metadata.json         # URL、作者、最后获取时间、checksum
│   └── screenshots/          # 关键区域截图（仅作为构建参考）
└── xiaoheihe-post/
    ├── metadata.json
    └── content.md            # 帖子正文（人工或半自动整理）
```

### 4.2 知识库条目

生成文件：`packages/core/src/knowledge/generated/weapon-knowledge.json`

```typescript
export type KnowledgeSource = {
  name: "tencent_sheet" | "xiaoheihe_post";
  url: string;
  author: string;
  title?: string;
  fetched_at: string;   // ISO 8601
  checksum: string;     // sha256 of raw content
};

export type WeaponKnowledgeEntry = {
  item_hash: number;
  item_name: string;
  sources: KnowledgeSource[];
  activities?: string[];            // 例如 ["救赎的边缘", "突袭"]
  loot_pools?: string[];            // 例如 ["凯旋丰碑"]
  framework_comment?: string;       // 小黑盒：框架级别评价
  archetype_note?: string;          // 例如 "速射框架是自动步枪中的异常值"
  pve_note?: string;                // PVE 总体评价
  pvp_note?: string;                // PVP 总体评价
  perk_suggestions?: Array<{
    mode: "pve" | "pvp";
    column: 3 | 4;
    perk_name: string;
    // 当无法精确映射到 perk hash 时使用英文/中文名称
    perk_hash?: number;
    reason?: string;
  }>;
  special_notes?: string[];         // 特殊说明，例如 "只建议在深渊赛季的目标修订上使用"
};

export type WeaponKnowledgeBase = {
  version: number;
  generated_at: string;
  sources: KnowledgeSource[];
  entries: WeaponKnowledgeEntry[];
  index: Record<string, number>;    // item_hash string -> entries index
};
```

### 4.3 按活动/副本分组

知识库顶层保留 `entries` 数组用于按 hash 快速查找，同时在生成时构建反向索引：

```typescript
export type ActivityGroup = {
  activity_name: string;
  item_hashes: number[];
  note?: string;
};
```

存储在 `activity-index.json` 中，方便 AI 回答"突袭有什么好武器"这类问题时检索。

## 5. 构建流程

脚本：`scripts/build-knowledge.ts`（或 `packages/core/scripts/build-knowledge.ts`）

职责：
1. 读取 `docs/external/weapon-recommendations/` 下的原始资料。
2. 解析 `xiaoheihe-post/content.md`，按武器类型/框架提取评价，并映射到具体武器 hash（第一阶段可人工维护映射表）。
3. 解析 `tencent-sheet/screenshots/` 和元数据，人工或半自动提取武器-perk 推荐（第一阶段以人工录入为主）。
4. 合并去重，生成 `weapon-knowledge.json` 和 `activity-index.json`。
5. 计算 checksum，写入 `metadata.json`。

执行方式：
- 开发：`pnpm run build:knowledge`
- CI：在打包前自动运行，保证发布版本包含最新知识库。

## 6. 运行时服务

`packages/core/src/knowledge/weaponKnowledgeService.ts`

```typescript
export class WeaponKnowledgeService {
  constructor(private base: WeaponKnowledgeBase) {}

  static async load(dataDir: string): Promise<WeaponKnowledgeService>;

  getByHash(item_hash: number): WeaponKnowledgeEntry | null;
  getByHashes(hashes: number[]): WeaponKnowledgeEntry[];
  getByActivity(activityName: string): WeaponKnowledgeEntry[];

  formatForPrompt(entries: WeaponKnowledgeEntry[]): string;
}
```

加载时机：
- 应用启动时从 `dataDir/knowledge/` 加载 JSON。
- 若加载失败，服务降级为空实现，不影响其他功能。

## 7. 与 AI 助手的集成

### 7.1 单件装备分析

在 `generateItemAiAdvice` 中：

1. 调用 `weaponKnowledgeService.getByHash(item.hash)`。
2. 若命中，将 `formatForPrompt(entry)` 拼接到 user prompt 中：

```
以下是该装备的社区参考资料（非官方，仅供参考）：
{formatted_entry}

分析时请注意：
- 区分"装备实际 roll"和"社区推荐 perk"。
- 如果实际 roll 接近社区推荐，可以指出；如果不接近，不要编造命中。
- 明确标注观点来源于社区资料，而非游戏内数据。
```

### 7.2 仓库整体分析

在 `generateVaultAiAdvice` 中：

1. 从 `local.items` 提取所有 hash。
2. 调用 `getByHashes(hashes)`，限制最多注入 N 条（例如 20 条），优先选择评分处于 review/junk 区间的武器。
3. 在 prompt 中提示 AI 仅对命中社区资料的武器给出引用建议。

### 7.3 聊天问答

在 `generateAiChatReply` 中：

1. 解析用户问题中提到的武器名称或活动名称（使用现有 `perkSearch.ts` 中的名称匹配能力）。
2. 调用 `getByHash` 或 `getByActivity`。
3. 将相关知识注入 prompt。

## 8. 启动时更新检查

`packages/core/src/knowledge/updateChecker.ts`

行为：
1. 应用启动后（主进程或 renderer 的合适时机），读取本地 `metadata.json` 中的 `checksum` 和 `fetched_at`。
2. 对每份原始资料，尝试通过 HTTP 获取最新内容（小黑盒页面、腾讯表格页面）并计算 checksum。
3. 若检测到变更：
   - 在设置/状态栏显示"社区知识库有新版本"。
   - 提供"立即更新"按钮，触发 `build-knowledge` 脚本或下载预构建包。
   - 不自动覆盖，避免网络异常破坏本地数据。
4. 若用户选择不更新，继续使用本地版本。

注意：腾讯表格的动态页面 checksum 可能不稳定，实际实现时可比较 `metadata.json` 中的 `fetched_at` 和页面上的"最后修改时间"（如果可获取），或采用每日/每周提示一次的策略。

## 9. 配置

在 `D2Config` 的 `ai` 段增加：

```typescript
knowledge_base?: {
  enabled: boolean;                              // 默认 true
  sources: ("tencent_sheet" | "xiaoheihe_post")[];
  check_for_updates: "startup" | "manual" | "off"; // 默认 "startup"
  max_entries_per_prompt: number;                // 默认 20
};
```

在 AI 设置面板中增加对应开关：
- 启用社区知识库
- 选择来源（腾讯表格、小黑盒帖子）
- 启动时检查更新
- 高级：打开知识库数据来源说明页面

## 10. 授权与来源声明

- 不将原始表格/帖子全文打包进应用。
- 在 `README.md` 和 `docs/external/weapon-recommendations/README.md` 中注明：
  - 腾讯表格作者：Aegis
  - 小黑盒帖子作者：日栎
  - 链接地址
  - "社区资料仅供参考，不代表官方观点"
- 若作者后续要求撤下，可通过配置快速关闭对应来源。

## 11. 实现阶段

### Phase 1：基础设施 + 小黑盒帖子

- 创建 `docs/external/weapon-recommendations/` 目录结构。
- 将小黑盒帖子整理为 `content.md`。
- 实现 `build-knowledge` 脚本，生成第一批以武器框架为主的条目。
- 实现 `WeaponKnowledgeService` 和 AI prompt 注入（单件 + 仓库 + 聊天）。
- 在 AI 设置面板增加开关。

### Phase 2：腾讯表格 perk 推荐

- 将表格中的武器-perk 推荐人工录入或半自动 OCR 为结构化数据。
- 扩展 `WeaponKnowledgeEntry.perk_suggestions`。
- 在 AI 分析中引用具体 perk 推荐。

### Phase 3：启动时更新检查

- 实现 `UpdateChecker`。
- 在应用启动时检查并提示用户更新。
- CI 中预构建知识库包，支持一键下载。

## 12. 测试策略

- 单元测试：`WeaponKnowledgeService.getByHash`、`formatForPrompt`、空数据降级。
- 集成测试：模拟 AI 调用，验证 prompt 中是否包含社区资料片段。
- 构建测试：验证 `build-knowledge` 生成的 JSON 符合 schema，无重复 hash。
- 手动测试：对几件已知武器触发 AI 分析，检查回答中是否正确引用社区观点。

## 13. 风险与缓解

| 风险 | 缓解 |
|---|---|
| 资料更新后 checksum 不稳定 | 对腾讯表格采用"每周提示一次"而非严格 checksum；小黑盒帖子采用文本 checksum |
| 人工录入工作量大 | 先覆盖热门武器/突袭武器；逐步扩展 |
| AI 编造未命中的推荐 | prompt 中强调"只引用已提供的资料"，并标注来源 |
| 作者撤下授权 | 配置开关可快速禁用对应来源；README 中保留来源声明 |
| token 消耗增加 | 限制每次 prompt 注入条目数；只注入相关武器的资料 |

## 14. 后续扩展

- 支持导入更多社区资料源（如 Bilibili 专栏、NGA 帖子）。
- 与 `CommunityPerkSource` 合并，让 perk 推荐既可用于 UI 命中提示，也可用于 AI 引用。
- 支持用户本地导入自己的 notes，作为个人知识库。
