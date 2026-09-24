import {
  isRecommendationRequirementSlot,
  isWeaponLevelRule,
  reduceCombosToColumnPool,
  recommendationRequirementSlotLabels,
  unspecifiedRequirementSlotLabel,
  type CommunityPerkSource,
  type PerkRef,
  type RecommendationSourceRecord,
  type RecommendationSourceRequirement,
  type SourceOptions,
  type WeaponRecommendation
} from "@d2-tools/core/community-perks";
import { resolveDimWishlistRuleMetadata, type DimWishlist } from "@d2-tools/core/analysis/wishlistImport";
import { dimWishlistForSource } from "../analysis/wishlistStore.js";
import {
  diagnoseDimWishlistRules,
  dimColumnRequirementSets
} from "./dimWishlistDiagnostics.js";
import {
  loadRecommendationSources,
  recommendationSourceNames,
  type StoredRecommendationInstance
} from "./recommendationDocumentStore.js";
import {
  listRecommendationRuleOverrides,
  listRecommendationSourceOverrides,
  recommendationRemovedRuleIdsFor,
  recommendationSourceStateFor,
  type RecommendationRuleOverride,
  type RecommendationSourceOverride
} from "./recommendationOverrides.js";

const maxDimSourceInstances = 512;

export function createDimWishlistSources(dataDir: string): CommunityPerkSource[] {
  const sourceOverrides = listRecommendationSourceOverrides(dataDir);
  const ruleOverrides = listRecommendationRuleOverrides(dataDir);
  // 来源实例是 DIM 的唯一来源真相；对外名只在 `recommendationSourceNames` 里判一次，
  // 不从规则内容重新推导来源名。
  const storedSources = loadRecommendationSources(dataDir, "dim");
  if (!storedSources.length) return [];
  return summarizeDimSources(storedSources)
    .filter((source) => source.state === "active")
    .map((source) => {
      const { label, declaredLabel } = recommendationSourceNames(source);
      return createDimWishlistSourceForRules(
        dataDir,
        source.sourceId,
        source.documentId,
        label,
        declaredLabel,
        dimWishlistForSource(source),
        { sourceOverrides, ruleOverrides }
      );
    });
}

// 旧版本曾按 block 生成数千个实例。异常膨胀时收敛到文档级来源，
// 保证仓库来源行数量可控，而不是回退到旧的单例读取路径。
function summarizeDimSources(
  storedSources: StoredRecommendationInstance[]
): StoredRecommendationInstance[] {
  if (storedSources.length <= maxDimSourceInstances) return storedSources;
  const byDocument = new Map<string, StoredRecommendationInstance>();
  for (const source of storedSources) {
    const existing = byDocument.get(source.documentId);
    if (existing) existing.rules.push(...source.rules);
    else byDocument.set(source.documentId, {
      ...source,
      sourceId: source.documentId,
      // 收敛只改身份的粒度，不改名字的来路：声明名仍取实例自己的 title / label，主名由适配层按文档标题给。
      label: source.title || source.label,
      rules: [...source.rules]
    });
  }
  return [...byDocument.values()];
}

function createDimWishlistSourceForRules(
  dataDir: string,
  sourceId: string,
  documentId: string,
  sourceLabel: string,
  declaredLabel: string | undefined,
  loadedWishlist: DimWishlist,
  overrides?: { sourceOverrides: RecommendationSourceOverride[]; ruleOverrides: RecommendationRuleOverride[] }
): CommunityPerkSource {
  const sourceOverrides = overrides?.sourceOverrides ?? listRecommendationSourceOverrides(dataDir);
  // 分组键取**实例自己的**键（用户 2026-09-16 拍板：来源列表按来源名分多行，不按导入文件合并）。
  // 两种格式的模型一致：一个具名来源 = 一行。
  //
  // 状态与规则移除**不在本文件里判**：走 `recommendationSourceStateFor` / `recommendationRemovedRuleIdsFor`
  // 的共享身份继承（实例键优先、文档键兜底）。这段规则过去在两个适配器里各写一份，CSV 那份漏了兜底，
  // 「停用整份导入」在 CSV 上静默失效——所以分组键与继承键必须分开表达，且继承只留一处实现。
  const sourceGroupId = sourceId;
  const sourceState = recommendationSourceStateFor({ sourceId, documentId }, sourceOverrides);
  const ruleOverrides = overrides?.ruleOverrides ?? listRecommendationRuleOverrides(dataDir);
  const removedRuleIds = recommendationRemovedRuleIdsFor({ sourceId, documentId }, ruleOverrides);
  const wishlist = sourceState === "active" && loadedWishlist
    ? { ...loadedWishlist, rules: loadedWishlist.rules.filter((rule) => !rule.rule_stable_id || !removedRuleIds.has(rule.rule_stable_id)) }
    : null;
  const rulesByItemHash = new Map<number, NonNullable<typeof wishlist>["rules"]>();
  wishlist?.rules.forEach((rule) => {
    // 家族全展开在导入期算完（`item_hashes`）；缺省表示这条规则只覆盖它自己那一把。
    for (const itemHash of rule.item_hashes?.length ? rule.item_hashes : [rule.item_hash]) {
      const existing = rulesByItemHash.get(itemHash);
      if (existing) existing.push(rule);
      else rulesByItemHash.set(itemHash, [rule]);
    }
  });
  return {
    name: sourceLabel,
    isAvailable: () => wishlist !== null,
    async getRecommendations(itemHash: number, options: SourceOptions): Promise<WeaponRecommendation | null> {
      if (!wishlist) return null;
      const matchingRules = rulesByItemHash.get(itemHash) ?? [];
      if (!matchingRules.length) return null;
      // 归栏判定与导入期校验读**同一份**实现（`dimWishlistDiagnostics`），这里不再自己算一遍。
      const { evaluated, perkHashToRef } = diagnoseDimWishlistRules(itemHash, matchingRules, options);
      const diagnosed = evaluated.map((entry) => ({
        ...entry,
        metadata: resolveDimWishlistRuleMetadata(wishlist, entry.rule)
      }));
      if (!diagnosed.length) return null;
      type DimRequirement = { slot: string; hashes: number[]; name: string };
      // 「能进记录的栏位」与「是不是武器级推荐」都读 core 的同一份判据（`isWeaponLevelRule`
      // 就是「一条 locatable 都没有」），这里不再自己列一份栏位表——两份表就是两条口径。
      const locatable = (requirements: DimRequirement[]) => (
        requirements.filter((requirement) => isRecommendationRequirementSlot(requirement.slot))
      );
      const weaponLevelRecommendations = diagnosed
        .filter(({ requirements }) => isWeaponLevelRule(requirements))
        .map(({ rule, metadata }) => ({
          mode: rule.mode,
          source_label: sourceLabel,
          ...(metadata.note || metadata.source_title ? { note: metadata.note || metadata.source_title } : {})
        }));
      const pool = reduceCombosToColumnPool(dimColumnRequirementSets(diagnosed));
      const slotLabel = (slot: string) => recommendationRequirementSlotLabels[slot] ?? unspecifiedRequirementSlotLabel;
      const candidateRefs = (hashes: number[]): PerkRef[] => (
        hashes.map((hash) => perkHashToRef.get(hash) ?? { hash, name: String(hash) })
      );
      const toRequirement = (slot: string, names: string[], refs: PerkRef[]): RecommendationSourceRequirement => ({
        slot: slot as RecommendationSourceRequirement["slot"],
        label: slotLabel(slot),
        candidate_names: names,
        candidates: refs
      });
      const sourceRecords: RecommendationSourceRecord[] = pool
        ? [{ rule_stable_id: sourceId + ":pool", source_id: sourceId, source_group_id: sourceGroupId, source_label: sourceLabel,
             ...(declaredLabel ? { declared_label: declaredLabel } : {}),
             purposes: [...new Set(diagnosed.map(({ rule }) => rule.mode))],
             requirements: pool.columns.map((column) => {
               const refs = candidateRefs([...new Set(column.candidates.flat().map(Number))]);
               return toRequirement(column.slot, refs.map((ref) => ref.name), refs);
             }) }]
        : diagnosed
            // 每条规则都出一条来源事实——**武器级规则（「有就行」）也在内**，只是要求列表为空。
            // 异域武器在愿望单里就是这种写法，少了这一条，比对结果里就只剩来源**名字**、
            // 没有了来源**编号**：来源清单数不着它、按来源勾选筛选也筛不出它，
            // 而武器自己还标着「符合推荐」。人工推荐表格那边一直是每条都出，这里补齐同一件事。
            .map(({ rule, metadata, requirements }) => ({
              rule_stable_id: rule.rule_stable_id ?? (sourceId + ":" + rule.item_hash + ":" + rule.perk_hashes.join(",")),
              source_id: sourceId, source_group_id: sourceGroupId, source_label: sourceLabel,
              ...(declaredLabel ? { declared_label: declaredLabel } : {}),
              purposes: [rule.mode],
              ...(metadata.note || metadata.source_title ? { note: metadata.note || metadata.source_title } : {}),
              requirements: locatable(requirements)
                .map((requirement) => toRequirement(requirement.slot, [requirement.name], candidateRefs(requirement.hashes))) }));
      return {
        item_hash: itemHash, item_name: options.item_name ?? String(itemHash),
        combos: [],
        source_records: sourceRecords,
        ...(weaponLevelRecommendations.length ? { weapon_level_recommendations: weaponLevelRecommendations } : {}),
        matched_modes: Array.from(new Set(diagnosed.map(({ rule }) => rule.mode))),
        individual_perks: [...new Set(matchingRules.flatMap((rule) => rule.perk_hashes))]
          .map((hash) => perkHashToRef.get(hash) ?? { hash, name: String(hash) }),
        sample_size: matchingRules.length, source_label: sourceLabel,
        disclaimer: wishlist.title ? ("来自 " + wishlist.title + "，仅反映愿望单作者的偏好。") : "来自本地导入的 DIM Wishlist，仅反映愿望单作者的偏好。"
      };
    }
  };
}
