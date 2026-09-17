import {
  isRecommendationRequirementSlot,
  isWeaponLevelRule,
  recommendationRequirementSlotLabels,
  type CommunityPerkSource,
  type PerkRef,
  type RecommendationSourceRecord,
  type RecommendationSourceRequirement,
  type SourceOptions,
  type WeaponRecommendation
} from "@d2-tools/core/community-perks";
import {
  loadRecommendationSources,
  type StoredRecommendationInstance
} from "./recommendationDocumentStore.js";
import type { RecommendationStoredRule } from "./recommendationRuleStore.js";
import {
  listRecommendationRuleOverrides,
  listRecommendationSourceOverrides,
  recommendationRemovedRuleIdsFor,
  recommendationSourceStateFor,
  type RecommendationRuleOverride,
  type RecommendationSourceOverride
} from "./recommendationOverrides.js";

/**
 * 三级模型 → `CommunityPerkSource` 的**适配器**（分层图 ②）：把一份人工导入的
 * 文档 / 来源实例 / 规则读成消费层认识的来源事实。
 *
 * 匹配只有一句话：**`rule.itemHashes.includes(itemHash)`**。
 * 「这条规则适用于哪些武器」属于身份推导，已经在导入期算完并写进 `item_hashes`（见
 * `expandRecommendationItemHashes`）；读取期重新推导（按发布组、变体、名称匹配）是 ⑤ 层越权，
 * 那正是 T56 要拆掉的分叉。因此本文件不认识 `weaponIdentityRelations`，也不做任何名称匹配。
 *
 * 与 DIM 适配器（`dimWishlistSource.ts`）的差别只在**要求的形态**：DIM 的来源写的是 Perk Hash，
 * 人工 CSV 写的是官方名。名字 → Hash 的解析同样已经在导入期用
 * `buildSlotPerkIndex`（「栏位 → 官方名 → 可用 Perk」的唯一权威）算完，落库的是 Hash；
 * 读取期只把 Hash 还原成 `PerkRef`（定义池覆盖本武器及其全部已列版本）。
 *
 * 本文件按格式分支是允许的（它就在解析 / 适配层），但它**不向 ③④⑤ 传播任何格式概念**：
 * 读出来的东西在合同上与 DIM 来源完全同构。
 */
export function createCsvRecommendationSources(dataDir: string): CommunityPerkSource[] {
  const sourceOverrides = listRecommendationSourceOverrides(dataDir);
  const ruleOverrides = listRecommendationRuleOverrides(dataDir);
  return loadRecommendationSources(dataDir, "csv")
    .filter((source) => recommendationSourceStateFor(source, sourceOverrides) === "active")
    .map((source) => createCsvRecommendationSource(source, { sourceOverrides, ruleOverrides }));
}

function createCsvRecommendationSource(
  source: StoredRecommendationInstance,
  overrides: {
    sourceOverrides: RecommendationSourceOverride[];
    ruleOverrides: RecommendationRuleOverride[];
  }
): CommunityPerkSource {
  const sourceLabel = source.label || source.documentTitle;
  // 状态与移除都走共享的身份继承（实例键优先、文档键兜底）——这里不自己写一份。
  const removedRuleIds = recommendationRemovedRuleIdsFor(source, overrides.ruleOverrides);
  const rules = source.rules.filter((rule) => !removedRuleIds.has(rule.ruleId));
  // 规则覆盖的武器是**存好的**，这里只是建索引——不存在第二条身份判据。
  const rulesByItemHash = new Map<number, RecommendationStoredRule[]>();
  for (const rule of rules) {
    for (const itemHash of rule.itemHashes) {
      const bucket = rulesByItemHash.get(itemHash);
      if (bucket) bucket.push(rule);
      else rulesByItemHash.set(itemHash, [rule]);
    }
  }

  return {
    name: sourceLabel,
    isAvailable: () => rules.length > 0,
    async getRecommendations(itemHash: number, options: SourceOptions): Promise<WeaponRecommendation | null> {
      const matching = dedupeByRuleId(rulesByItemHash.get(itemHash) ?? []);
      if (!matching.length) return null;
      // 定义池覆盖本武器及其全部已列版本：某个栏位的写法可能只在别的版本的定义里出现。
      const perkRefs = buildPerkRefMap(matching, options);
      const sourceRecords = matching.map((rule) => toSourceRecord(rule, source, sourceLabel, perkRefs));
      const weaponLevelRecommendations = matching
        .filter((rule) => isWeaponLevelRule(rule.requirements))
        .flatMap((rule) => rule.purposes.map((mode) => ({
          mode,
          source_label: sourceLabel,
          ...(ruleNote(rule, sourceLabel) ? { note: ruleNote(rule, sourceLabel) } : {})
        })));
      if (!sourceRecords.length && !weaponLevelRecommendations.length) return null;

      const modes = [
        ...weaponLevelRecommendations.map((entry) => entry.mode),
        ...sourceRecords.flatMap((record) => record.purposes)
      ];
      return {
        item_hash: itemHash,
        item_name: options.item_name ?? String(itemHash),
        // 人工来源保存的是逐栏候选池，拼不出「一条 Roll」——这一条与 DIM 来源一致。
        combos: [],
        matched_modes: [...new Set(modes)],
        individual_perks: uniquePerkRefs(sourceRecords),
        ...(weaponLevelRecommendations.length ? { weapon_level_recommendations: weaponLevelRecommendations } : {}),
        source_records: sourceRecords,
        sample_size: matching.length,
        source_label: sourceLabel,
        disclaimer: "来自应用内置的本地武器推荐知识库，推荐按官方武器身份汇总，并保留来源原始的逐栏候选池。"
      };
    }
  };
}

function toSourceRecord(
  rule: RecommendationStoredRule,
  source: StoredRecommendationInstance,
  sourceLabel: string,
  perkRefs: ReadonlyMap<number, PerkRef>
): RecommendationSourceRecord {
  const requirements = rule.requirements.flatMap((requirement): RecommendationSourceRequirement[] => {
    if (!isRecommendationRequirementSlot(requirement.slot)) return [];
    const refs = requirement.candidates.map((hash) => perkRefs.get(hash) ?? { hash, name: String(hash) });
    if (!refs.length) return [];
    return [{
      slot: requirement.slot,
      label: recommendationRequirementSlotLabels[requirement.slot] ?? requirement.slot,
      // 名字与候选同源：读取期没有第二份「来源写了什么」的数据，也不该有。
      candidate_names: [...new Set(refs.map((ref) => ref.name))],
      candidates: refs
    }];
  });
  return {
    rule_stable_id: rule.ruleId,
    source_id: source.sourceId,
    // 人工来源的键本身就是来源级：一个「推荐来源」列值是一个来源，不按文档合并。
    source_group_id: source.sourceId,
    source_label: sourceLabel,
    ...(rule.sourceUrl ? { source_url: rule.sourceUrl } : {}),
    purposes: rule.purposes,
    ...(rule.rating ? { rating: rule.rating } : {}),
    ...(rule.ranking ? { ranking: rule.ranking } : {}),
    ...(rule.note ? { note: rule.note } : {}),
    ...(rule.pageUpdatedAt ? { page_updated_at: rule.pageUpdatedAt } : {}),
    ...(rule.version ? { version: rule.version } : {}),
    ...(rule.sourceLocation ? { source_location: rule.sourceLocation } : {}),
    requirements
  };
}

function ruleNote(rule: RecommendationStoredRule, sourceLabel: string): string | undefined {
  return [
    `来源 ${sourceLabel}`,
    rule.rating ? `评级 ${rule.rating}` : "",
    rule.note
  ].filter(Boolean).join("；") || undefined;
}

function uniquePerkRefs(records: RecommendationSourceRecord[]): PerkRef[] {
  return [...new Map<number, PerkRef>(
    records
      .flatMap((record) => record.requirements)
      .flatMap((requirement) => requirement.candidates)
      .map((perk) => [perk.hash, perk] as const)
  ).values()];
}

function dedupeByRuleId(rules: RecommendationStoredRule[]): RecommendationStoredRule[] {
  return [...new Map(rules.map((rule) => [rule.ruleId, rule])).values()];
}

/**
 * Hash → `PerkRef`：与 DIM 适配器的同名函数同一职责（把存好的 Hash 还原成展示用的引用）。
 * 名字取当前语言定义；`englishName` 有就给，供消费层做双语显示。
 */
function buildPerkRefMap(
  rules: readonly RecommendationStoredRule[],
  options: SourceOptions
): Map<number, PerkRef> {
  const map = new Map<number, PerkRef>();
  const hashes = new Set(rules.flatMap((rule) => (
    rule.requirements.flatMap((requirement) => requirement.candidates)
  )));
  for (const hash of hashes) {
    const display = options.itemDefinitions?.[String(hash)]?.displayProperties;
    const name = display?.name?.trim();
    if (!name) continue;
    map.set(hash, {
      hash,
      name,
      ...(display?.description ? { description: display.description } : {}),
      ...(display?.icon ? { icon: display.icon } : {})
    });
  }
  if (options.englishItemDefinitions) {
    for (const hash of hashes) {
      const englishName = options.englishItemDefinitions[String(hash)]?.displayProperties?.name?.trim();
      if (!englishName) continue;
      map.set(hash, { ...(map.get(hash) ?? { hash, name: englishName }), englishName });
    }
  }
  // 定义池里查不到的名字：保留 Hash 本身，绝不让要求凭空消失——
  // 「来源要求了什么」必须原样到底，消费方自己判断能否核对。
  for (const hash of hashes) if (!map.has(hash)) map.set(hash, { hash, name: String(hash) });
  return map;
}
