# 小日向与 d2-skill 产品级能力总纲

> 状态：Backlog
> 更新时间：2026-06-29

## 目标

把当前“小日向 + d2-skill”从“能解析攻略、能生成草稿”的功能，升级成一个面向中文 Destiny 2 玩家日常使用的产品级助理。它不复制 DIM、D2ArmorPicker 或 d2-skill CLI，而是在 d2-tools 的本地桌面、真实账号、中文攻略和安全写操作边界内，做一条更适合本项目的路径。

最终体验应当是：

1. 玩家粘贴中文攻略、视频文案、DIM 链接说明或一句自然语言目标。
2. 小日向把文本拆成可核验的装备、perk、职业、目标属性和活动要求。
3. d2-skill facts 层只用 Bungie API、Manifest、本地缓存、DIM wishlist、本地目标规则和用户授权账号数据给出事实。
4. UI 明确显示“已满足、部分满足、缺失、待确认、可替代”，并展示证据。
5. 在用户确认前，不自动执行写操作；即使有写操作，也只输出安全计划和可撤销动作。

## 为什么不是照抄参考工具

### DIM

DIM 的核心是网页端装备管理、搜索表达式、拖拽移动、wishlist、loadout optimizer 和清算模式。d2-tools 可以学习 DIM 的信息密度、证据展示、愿望单匹配和清理工作流，但不应做“中文 DIM 复刻”。原因是 DIM 已经非常成熟，直接复制会拖入巨大搜索语法、拖拽交互、跨浏览器状态和完整 optimizer 成本。

d2-tools 适合吸收：

- 同名装备对比。
- DIM wishlist 导入与本地命中。
- 仓库清理清单，而不是直接自动分解。
- Loadout 草稿与装备定位提示。
- 证据优先的工具区。

### D2ArmorPicker

D2ArmorPicker 专注护甲组合求解，适合学习“目标属性 + 异域锁定 + 多方案排序”的求解模式。d2-tools 当前更适合先做轻量可达性判断，而不是直接上完整护甲优化器。

适合先做：

- 固定职业、异域和目标属性后的“是否可达”。
- 账号内近似方案和缺口说明。
- 把不可达原因解释清楚，例如缺对应槽位高韧性护甲、能量不足、异域不在账号内。

暂不适合一开始做：

- 完整碎片属性、模组成本、艺术品、职业全部组合的爆炸式 optimizer。
- 需要长期维护完整游戏规则的自动推荐。

### d2-skill

d2-skill 更像开发者工具：OAuth、Manifest、搜索、AI 分析、wishlist、写操作框架。它最值得借鉴的是“AI 不直接编事实，AI 只消费事实”的边界。

d2-tools 应把 d2-skill 方向产品化：

- facts 层输出结构化证据。
- AI 只做中文理解、总结和提问。
- 写操作先生成计划，再由用户确认。
- 所有结论都能回到 Manifest hash、账号实例、wishlist 规则或本地目标规则。

### 小日向 Bot

小日向 Bot 的价值是中文玩家熟悉的日报、周报、商人、掉落查询和指令交互。d2-tools 不需要复制 QQ 机器人形态，但应学习“中文日常查询入口”和“把复杂数据讲成人话”。

适合 d2-tools 的形态：

- 首页每日 / 每周信息。
- 小日向侧栏回答“今天有什么”“这把去哪刷”“我这套能不能抄”。
- 资料库和仓库里的上下文问答。

### Light.gg 与 D2 Gunsmith

Light.gg 提供社区投票、perk 推荐和装备评分；D2 Gunsmith 提供武器 perk 模拟。d2-tools 适合使用它们的公开思路和用户导入数据，不适合无边界地实时依赖外站。

适合做：

- 本地 DIM wishlist 优先。
- light.gg 实时分析作为用户显式开启的辅助来源。
- 外站失败时保留本地判断。
- 武器详情里展示 perk 命中、来源和风险提示。

## 当前仓库已具备的基础

当前实现已经具备这些能力基础：

- `packages/core/src/assistant/guideParsing.ts`：攻略文本解析。
- `packages/core/src/assistant/guideMatching.ts`：攻略要求与账号 / 仓库事实匹配。
- `packages/core/src/assistant/loadoutDraft.ts`：配装草稿生成。
- `packages/services/src/d2SkillService.ts`：d2-skill 服务入口。
- `packages/app/src/workspaces/d2Skill.ts`：d2-skill workspace。
- `packages/app/src/workspaces/kohinataBot.ts`：小日向 workspace。
- `packages/desktop/src/main/ipc/assistant.ts`：桌面 assistant IPC。
- `packages/desktop/src/renderer/components/GlobalAssistantSidebar.tsx`：小日向侧栏。
- `packages/desktop/src/renderer/shared/domain/assistant/kohinataViewModel.ts`：侧栏 ViewModel。
- DIM wishlist、本地目标规则、light.gg AI 分析缓存、装备详情社区推荐、同名对比和仓库筛选已经有基础链路。

现阶段的主要缺口不是“完全没做”，而是：

- 事实证据不够统一，用户难以判断结论可信度。
- 攻略解析对别名、俗称、中英混写、模糊词的产品级处理不足。
- 配装还偏草稿，缺少围绕真实账号的可达性求解。
- 仓库清理、目标规则、愿望单、小日向建议之间还没有统一解释模型。
- 日报 / 周报 / 商人 / 掉落查询还没有形成小日向的稳定信息入口。

## 推荐总路线

推荐采用“证据优先”路线，而不是“完整 optimizer 优先”或“AI 自由对话优先”。

原因：

- 用户已经有真实账号，最先需要的是“我账号里有没有、哪里缺、为什么这么判断”。
- 证据层做实后，攻略解析、仓库整理、轻量配装、日报查询都能复用。
- 完整 optimizer 成本高，容易在规则不完整时给出看似聪明但不可靠的结果。
- AI 如果没有事实边界，会变成泛泛聊天，不符合工具产品定位。

## 能力分层

### 1. 事实层

职责：统一生产可信事实，不做主观推荐。

来源：

- Bungie API：Profile、Character、Inventory、Activities、Vendors。
- Destiny Manifest：物品定义、perk、socket、class、bucket、source。
- 本地数据：DIM wishlist、本地目标规则、本地标签、缓存。
- 用户授权账号：装备实例、perk rolls、锁定状态、位置、可装备状态。
- 用户显式开启的外部分析：light.gg AI 实时分析缓存。

输出要求：

- 每条事实必须能说明来源。
- 每条命中必须能指向 item hash、instance id、perk hash 或规则 id。
- 数据缺失时要输出“未知 / 待确认”，不能伪装成否定。

### 2. 攻略理解层

职责：把中文自然语言转成候选要求。

支持输入：

- 中文攻略。
- 中英混写。
- 武器俗称、perk 俗称、职业简称。
- 视频文案中的口语描述。
- DIM 配装说明或装备列表。

输出要求：

- 明确置信度。
- 模糊词进入待确认项。
- 不把 AI 猜测写成事实。

### 3. 规则归一层

职责：把人类文本映射到 Manifest 和本地规则。

包括：

- 装备中文名 / 英文名 / 俗称。
- perk 中文名 / 英文名 / 俗称。
- 职业、子职业、超能、手雷、近战、碎片、星相。
- 装备槽位、弹药类型、武器框架。
- DIM wishlist 规则与本地目标规则。

### 4. 匹配解释层

职责：告诉用户“账号能不能抄这套作业”。

状态必须统一：

- 已满足：账号中有精确命中。
- 部分满足：核心装备有，但 perk、属性、职业、能量或位置不完全满足。
- 可替代：没有原件，但有同类或同目标替代方案。
- 缺失：明确账号中没有。
- 待确认：数据源不足或文本解析不确定。

### 5. 轻量求解层

职责：先解决“这套能不能抄”和“离目标差多少”，不追求完整 optimizer。

优先范围：

- 固定职业。
- 固定异域或核心武器。
- 固定目标属性。
- 账号内装备候选。
- 输出 3 到 5 套可解释方案。

### 6. 产品 UI 层

职责：把小日向从“按钮 + 树状结果”升级为任务工作台。

关键界面：

- 攻略原文区。
- 解析结果区。
- 账号命中 / 缺口区。
- 可替代方案区。
- 配装草稿区。
- 证据与风险提示区。

## Backlog 拆分

这条路线可拆成三份独立 backlog，每份可以单独阅读、开发和验收：

1. `kohinata-guide-evidence-workbench.md`：攻略解析与账号证据工作台。
2. `vault-recommendation-and-cleanup-workbench.md`：仓库推荐、愿望单、清理工作台。
3. `daily-report-and-drops-assistant.md`：小日向日报、商人、掉落查询。

轻量配装求解在第一份中作为二期切片处理，因为它依赖攻略解析和证据模型；完整 DIM / D2ArmorPicker 级 optimizer 暂不进入当前 backlog。

## 验收标准

这组能力完成后，应满足：

1. 粘贴 10 条真实中文攻略，小日向能结构化提取装备、perk、职业、目标属性和不确定项。
2. 对真实账号输出“已满足 / 部分满足 / 可替代 / 缺失 / 待确认”，每条有证据来源。
3. 武器命中能识别具体 perk，不只匹配武器名。
4. 护甲先能判断目标是否可达，并解释差距。
5. 仓库清理建议能区分 DIM wishlist、本地目标、社区推荐、启发式判断和未知项。
6. 小日向日报只展示可确认数据；无法确认的遗失区域、轮换、奖励不做猜测。
7. 外部来源失败时，本地核心功能仍可用，并提示失败来源。

## 非目标

- 不在当前阶段实现完整 DIM 搜索语法。
- 不在当前阶段实现完整拖拽式仓库管理。
- 不在当前阶段实现完整 D2ArmorPicker 级优化器。
- 不自动分解装备。
- 不默认内置未经授权的社区数据。
- 不把 AI 输出当作事实来源。

