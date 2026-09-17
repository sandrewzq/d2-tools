import type {
  CommunityPerkSource,
  PerkCombo,
  PerkRef,
  RecommendationRequirementSlot,
  RecommendationSourceMatch,
  RecommendationSourceRecord,
  RecommendationSourceSlotMatch,
  SourceOptions,
  VaultItemInstanceMatchInfo,
  VaultItemMatchInfo,
  VaultItemMatchInput,
  WeaponRecommendation
} from "./types.js";

export class CommunityPerkRecommendationService {
  private sources: CommunityPerkSource[];

  constructor(sources?: CommunityPerkSource[]) {
    this.sources = sources ?? [];
  }

  addSource(source: CommunityPerkSource): void {
    this.sources.push(source);
  }

  async getRecommendations(
    item_hash: number,
    options: SourceOptions
  ): Promise<WeaponRecommendation | null> {
    for (const source of this.sources) {
      if (!source.isAvailable()) {
        continue;
      }
      try {
        const result = await source.getRecommendations(item_hash, options);
        if (result && isUsefulRecommendation(result)) {
          return result;
        }
      } catch {
        // 单个数据源失败时继续尝试下一个数据源
      }
    }
    return null;
  }

  async getRecommendationsWithAllSources(
    item_hash: number,
    options: SourceOptions
  ): Promise<WeaponRecommendation | null> {
    const available = this.sources.filter((s) => s.isAvailable());
    if (available.length === 0) return null;

    const results = await Promise.allSettled(
      available.map((s) => s.getRecommendations(item_hash, options))
    );
    const sourceWarnings = results.flatMap((result, index) => {
      if (result.status === "fulfilled") return [];
      const fallbackLabel = available.find((_, fallbackIndex) => {
        const fallbackResult = results[fallbackIndex];
        return fallbackIndex !== index
          && fallbackResult.status === "fulfilled"
          && fallbackResult.value
          && isUsefulRecommendation(fallbackResult.value);
      })?.name;
      return [`${available[index].name} 查询失败${fallbackLabel ? `，已显示 ${fallbackLabel} 数据` : ""}。`];
    });
    const valid = results
      .map((r) => (r.status === "fulfilled" ? r.value : null))
      .filter((r): r is WeaponRecommendation => r !== null && isUsefulRecommendation(r));
    if (valid.length === 0) return null;

    const combos = valid.flatMap((r) => r.combos);
    const weaponLevelRecommendations = valid.flatMap((recommendation) => (
      recommendation.weapon_level_recommendations ?? []
    ));
    const sourceRecords = uniqueSourceRecords(valid.flatMap((recommendation) => (
      recommendation.source_records ?? []
    )));
    const modes = Array.from(new Set([
      ...combos.map((combo) => combo.mode),
      ...weaponLevelRecommendations.map((entry) => entry.mode),
      ...sourceRecords.flatMap((record) => record.purposes)
    ]));

    return {
      item_hash,
      item_name: options.item_name ?? valid[0].item_name,
      combos,
      matched_modes: modes,
      individual_perks: uniquePerks(valid),
      weapon_level_recommendations: weaponLevelRecommendations,
      ...(sourceRecords.length ? { source_records: sourceRecords } : {}),
      sample_size: valid.reduce((sum, recommendation) => sum + (recommendation.sample_size ?? recommendation.combos.length), 0),
      source_label: Array.from(new Set(valid.map((r) => r.source_label).filter(Boolean))).join(" / ") || undefined,
      source_warnings: sourceWarnings.length ? sourceWarnings : undefined,
      disclaimer: valid.map((r) => r.disclaimer).filter(Boolean).join(" | ")
    };
  }

  async matchVaultItems(
    items: VaultItemMatchInput[],
    options: SourceOptions = {}
  ): Promise<Map<number, VaultItemMatchInfo>> {
    const uniqueHashes = Array.from(new Set(items.map((i) => i.hash)));

    const hashResults = new Map<number, WeaponRecommendation | null>();
    await Promise.all(
      uniqueHashes.map(async (hash) => {
        try {
          hashResults.set(hash, await this.getRecommendationsWithAllSources(hash, options));
        } catch {
          hashResults.set(hash, null);
        }
      })
    );

    const result = new Map<number, VaultItemMatchInfo>();
    for (const hash of uniqueHashes) {
      const rec = hashResults.get(hash);
      if (!rec) {
        result.set(hash, { matched: 0, available: 0, modes: [] });
        continue;
      }

      const itemsForHash = items.filter((item) => item.hash === hash);
      const ownedIdentities = itemsForHash.map(ownedPlugIdentity);
      const matchedComboIndexes = new Set<number>();
      const matchedModes = new Set<"pve" | "pvp" | "general">();
      const perkPoolCount = rec.source_records?.length ?? 0;
      const comboCount = rec.combos.length;

      for (let index = 0; index < rec.combos.length; index++) {
        const combo = rec.combos[index];
        for (const owned of ownedIdentities) {
          const allIn = comboMatchesItem(combo, owned);
          if (allIn) {
            matchedComboIndexes.add(index);
            matchedModes.add(combo.mode);
            break;
          }
        }
      }

      const matchedSourceFacts = itemsForHash.flatMap((item) => (
        matchSourceRecords(item, rec.source_records ?? [], options.itemDefinitions)
      )).filter((source) => source.matched_requirement_count > 0).length;
      result.set(hash, {
        matched: matchedComboIndexes.size + matchedSourceFacts,
        available: perkPoolCount + comboCount,
        perk_pool_count: perkPoolCount,
        combo_count: comboCount,
        modes: Array.from(matchedModes.size ? matchedModes : new Set(rec.matched_modes)),
        sample_perks: previewPerks(rec),
        source_label: rec.source_label
      });
    }

    return result;
  }

  /**
   * Matches every owned weapon independently. Unlike the legacy hash map,
   * duplicate copies of the same weapon never share a match result.
   */
  async matchVaultItemInstances(
    items: VaultItemMatchInput[],
    options: SourceOptions = {}
  ): Promise<VaultItemInstanceMatchInfo[]> {
    const recommendationRequests = new Map<string, Promise<WeaponRecommendation | null>>();
    const recommendationFor = (item: VaultItemMatchInput): Promise<WeaponRecommendation | null> => {
      const itemName = item.item_name?.trim() ?? "";
      const key = `${item.hash}\u0000${itemName}`;
      const existing = recommendationRequests.get(key);
      if (existing) return existing;
      const pending = this.getRecommendationsWithAllSources(item.hash, {
        ...options,
        item_name: itemName || options.item_name
      }).catch(() => null);
      recommendationRequests.set(key, pending);
      return pending;
    };

    return Promise.all(items.map(async (item): Promise<VaultItemInstanceMatchInfo> => {
      const recommendation = await recommendationFor(item);
      const canonicalWeaponName = item.item_name?.trim()
        || options.itemDefinitions?.[String(item.hash)]?.displayProperties?.name?.trim()
        || recommendation?.item_name
        || `Hash ${item.hash}`;
      if (!recommendation) {
        return {
          hash: item.hash,
          ...(item.instance_id ? { instance_id: item.instance_id } : {}),
          canonical_weapon_name: canonicalWeaponName,
          coverage: "uncovered",
          match_status: "indeterminate",
          recommendation_state: "uncovered",
          matched: 0,
          partial: 0,
          available: 0,
          modes: []
        };
      }

      const owned = ownedPlugIdentity(item);
      const weaponLevelRecommendations = recommendation.weapon_level_recommendations ?? [];
      const sourceMatches = matchSourceRecords(
        item,
        recommendation.source_records ?? [],
        options.itemDefinitions
      );
      // 所有来源（含 DIM）同构：结论只来自来源事实。
      const allSourceMatches = sourceMatches;
      if (allSourceMatches.length > 0) {
        return sourceMatchCompatibilityResult(
          item,
          canonicalWeaponName,
          recommendation,
          allSourceMatches
        );
      }
      if (owned.hashes.size === 0 && weaponLevelRecommendations.length === 0) {
        return {
          hash: item.hash,
          ...(item.instance_id ? { instance_id: item.instance_id } : {}),
          canonical_weapon_name: canonicalWeaponName,
          coverage: "covered",
          match_status: "indeterminate",
          recommendation_state: "compare",
          matched: 0,
          partial: 0,
          available: recommendation.combos.length,
          modes: recommendation.matched_modes,
          sample_perks: previewPerks(recommendation),
          source_label: recommendation.source_label
        };
      }

      if (hasIncompleteRelevantRollData(item) && recommendation.combos.length > 0) {
        return {
          hash: item.hash,
          ...(item.instance_id ? { instance_id: item.instance_id } : {}),
          canonical_weapon_name: canonicalWeaponName,
          coverage: "covered",
          match_status: "indeterminate",
          recommendation_state: "compare",
          matched: weaponLevelRecommendations.length,
          partial: 0,
          available: weaponLevelRecommendations.length + recommendation.combos.length,
          modes: recommendation.matched_modes,
          sample_perks: previewPerks(recommendation),
          source_label: recommendation.source_label
        };
      }

      const fullMatches = recommendation.combos.filter((combo) => comboMatchesItem(combo, owned));
      const partialMatches = recommendation.combos.filter((combo) => {
        if (combo.kind === "weapon_only") return false;
        const { matched: matchedPerks, total } = countMatchedRequirements(combo, owned);
        return matchedPerks > 0 && matchedPerks < total;
      });
      const matchedModes = Array.from(new Set(
        [
          ...weaponLevelRecommendations.map((entry) => entry.mode),
          ...(fullMatches.length > 0 ? fullMatches : partialMatches).map((combo) => combo.mode)
        ]
      ));
      const matched = weaponLevelRecommendations.length + fullMatches.length;
      const available = weaponLevelRecommendations.length + recommendation.combos.length;
      const recommendationState = allSourceMatches.some((source) => source.state === "full") || matched > 0
        ? "priority" as const
        : "compare" as const;
      return {
        hash: item.hash,
        ...(item.instance_id ? { instance_id: item.instance_id } : {}),
        canonical_weapon_name: canonicalWeaponName,
        coverage: "covered",
        match_status: allSourceMatches.some((source) => source.state === "uncheckable")
          ? "indeterminate"
          : matched > 0
            ? "full_match"
            : partialMatches.length > 0
              ? "partial_match"
              : "no_match",
        recommendation_state: recommendationState,
        matched,
        partial: partialMatches.length,
        available,
        modes: matchedModes.length ? matchedModes : recommendation.matched_modes,
        sample_perks: previewPerks(recommendation),
        source_label: recommendation.source_label
      };
    }));
  }
}

function matchSourceRecords(
  item: VaultItemMatchInput,
  records: readonly RecommendationSourceRecord[],
  itemDefinitions?: SourceOptions["itemDefinitions"]
): RecommendationSourceMatch[] {
  return records.map((record) => {
    const requirements = new Map(record.requirements.map((requirement) => [requirement.slot, requirement]));
    const slots = recommendationRequirementSlots.map((slot) => {
      const label = recommendationRequirementSlotLabels[slot] ?? unspecifiedRequirementSlotLabel;
      const requirement = requirements.get(slot);
      const rollSocket = item.weapon_roll?.sockets.find((socket) => socket.slot === slot);
      const fallbackOwned = (item.socket_plugs ?? []).map((plug) => ({
        hash: plug.hash, name: plug.name ?? "", current: false
      })) as unknown as RecommendationSourceSlotMatch["instance_owned"];
      const usedFallbackOwnership = !item.weapon_roll && fallbackOwned.length > 0;
      const instanceOwned: RecommendationSourceSlotMatch["instance_owned"] = rollSocket
        ? rollSocket.owned_plugs.map((plug) => hydrateWeaponRollPlug(plug, itemDefinitions))
        : usedFallbackOwnership ? fallbackOwned : [];
      const currentEnabled = rollSocket?.current_plug
        ? [hydrateWeaponRollPlug(rollSocket.current_plug, itemDefinitions)]
        : [];
      if (!requirement) {
        return {
          slot,
          label,
          state: "source_not_specified" as const,
          source_candidate_names: [],
          source_candidates: [],
          instance_owned: instanceOwned,
          current_enabled: currentEnabled
        };
      }

      const matches = instanceOwned.some((plug) => (
        requirement.candidates.some((candidate) => (
          plug.hash === candidate.hash || perkIdentityMatches(plug.name, candidate.name)
        ))
        || requirement.candidate_names.some((name) => (
          slot === "masterwork"
            ? masterworkRequirementMatches(name, plug.name)
            : perkIdentityMatches(plug.name, name)
        ))
      ));
      const hasComparableRequirement = requirement.candidates.length > 0
        || requirement.candidate_names.some((name) => Boolean(name.trim()));
      const cannotCheck = !matches && (
        !hasComparableRequirement
        || (rollSocket
          ? rollSocket.complete === false
          : hasIncompleteRelevantRollData(item) && !usedFallbackOwnership)
      );
      return {
        slot,
        label: requirement.label || label,
        state: matches ? "match" as const : cannotCheck ? "uncheckable" as const : "different" as const,
        source_candidate_names: requirement.candidate_names,
        source_candidates: requirement.candidates,
        instance_owned: instanceOwned,
        current_enabled: currentEnabled
      };
    });
    const locatedSlots = new Set<string>(recommendationRequirementSlots);
    for (const requirement of record.requirements.filter((item) => !locatedSlots.has(item.slot))) {
      slots.push({
        slot: requirement.slot,
        label: requirement.label || "其它要求",
        state: "uncheckable" as const,
        source_candidate_names: requirement.candidate_names,
        source_candidates: requirement.candidates,
        instance_owned: [],
        current_enabled: []
      });
    }
    const specified = slots.filter((slot) => slot.state !== "source_not_specified");
    const matched = specified.filter((slot) => slot.state === "match").length;
    const uncheckable = specified.filter((slot) => slot.state === "uncheckable").length;
    const checkable = specified.length - uncheckable;
    const coreRequirements = specified.filter((slot) => slot.slot === "perk1" || slot.slot === "perk2");
    const state = specified.length === 0
      ? "weapon_only" as const
      : checkable === 0
        ? "uncheckable" as const
        : matched === specified.length
          ? "full" as const
          : coreRequirements.some((slot) => slot.state === "different")
            ? "key_missing" as const
            : coreRequirements.length > 0
              ? "core" as const
              : matched > 0
                ? "close" as const
                : "not_matched" as const;
    return {
      rule_stable_id: record.rule_stable_id,
      source_id: record.source_id,
      source_group_id: record.source_group_id,
      source_label: record.source_label,
      ...(record.source_url ? { source_url: record.source_url } : {}),
      state,
      matched_requirement_count: matched,
      requirement_count: specified.length,
      checkable_requirement_count: checkable,
      uncheckable_requirement_count: uncheckable,
      purposes: record.purposes,
      ...(record.rating ? { rating: record.rating } : {}),
      ...(record.ranking ? { ranking: record.ranking } : {}),
      ...(record.note ? { note: record.note } : {}),
      ...(record.page_updated_at ? { page_updated_at: record.page_updated_at } : {}),
      ...(record.version ? { version: record.version } : {}),
      ...(record.source_location ? { source_location: record.source_location } : {}),
      slots
    };
  });
}

function hydrateWeaponRollPlug(
  plug: RecommendationSourceSlotMatch["instance_owned"][number],
  itemDefinitions: SourceOptions["itemDefinitions"]
): RecommendationSourceSlotMatch["instance_owned"][number] {
  if (plug.icon && plug.description) return plug;
  const definition = itemDefinitions?.[String(plug.hash)];
  const icon = definition?.displayProperties?.icon?.trim();
  const description = definition?.displayProperties?.description?.trim();
  return {
    ...plug,
    ...(!plug.icon && icon ? { icon } : {}),
    ...(!plug.description && description ? { description } : {})
  };
}

function sourceMatchCompatibilityResult(
  item: VaultItemMatchInput,
  canonicalWeaponName: string,
  recommendation: WeaponRecommendation,
  sourceMatches: RecommendationSourceMatch[]
): VaultItemInstanceMatchInfo {
  const positive = sourceMatches.filter((source) => (
    source.state === "full" || source.state === "core" || source.state === "weapon_only"
  ));
  const comparisonSources = sourceMatches.filter((source) => (
    source.state !== "full" && source.state !== "core" && source.state !== "weapon_only"
  ));
  const hasUncheckable = sourceMatches.some((source) => source.state === "uncheckable");
  const hasCuratedPurposeConflict = sourceMatches.some((left) => (
    (left.state === "full" || left.state === "core")
    && sourceMatches.some((right) => (
      (right.state === "key_missing" || right.state === "not_matched")
      && purposesOverlap(left.purposes, right.purposes)
    ))
  ));
  const positiveCuratedPurposes = sourceMatches
    .filter((source) => source.state === "full" || source.state === "core")
    .flatMap((source) => source.purposes);
  const negativeCuratedPurposes = sourceMatches
    .filter((source) => source.state === "key_missing" || source.state === "not_matched")
    .flatMap((source) => source.purposes);
  const hasCrossSourcePurposeConflict = positive.some((left) => (
    sourceMatches.some((right) => (
      (right.state === "key_missing" || right.state === "not_matched")
      && purposesOverlap(left.purposes, right.purposes)
    ))
  ));
  const hasPurposeConflict = hasCuratedPurposeConflict || hasCrossSourcePurposeConflict;
  const recommendationState = hasUncheckable || hasPurposeConflict
    ? "compare" as const
    : positive.length > 0
      ? "priority" as const
      : "compare" as const;
  return {
    hash: item.hash,
    ...(item.instance_id ? { instance_id: item.instance_id } : {}),
    canonical_weapon_name: canonicalWeaponName,
    coverage: "covered",
    match_status: hasUncheckable
      ? "indeterminate"
      : recommendationState === "priority"
        ? "full_match"
        : hasPurposeConflict && positive.length > 0
          ? "partial_match"
        : comparisonSources.some((source) => source.matched_requirement_count > 0)
          ? "partial_match"
          : "no_match",
    recommendation_state: recommendationState,
    matched: positive.length,
    partial: comparisonSources.filter((source) => source.matched_requirement_count > 0).length,
    available: sourceMatches.length,
    modes: recommendation.matched_modes,
    sample_perks: previewPerks(recommendation),
    source_label: recommendation.source_label,
    source_matches: sourceMatches
  };
}

function purposesOverlap(
  left: Array<"pve" | "pvp" | "general">,
  right: Array<"pve" | "pvp" | "general">
): boolean {
  if (left.includes("general") || right.includes("general")) return true;
  return left.some((purpose) => right.includes(purpose));
}

// 归约成功的来源以来源事实输出：与人工来源同一类型、同一渲染入口。

// 无法归约的来源：取最接近的一套规则，按「这一行要求的那些 perk」输出同一种来源事实。
// 每栏候选唯一时 any 与 all 等价，因此仍与人工来源共用同一个匹配与渲染入口。

// 归约成候选池后，逐栏结果由拥有情况给出；哈希与原组合保持同一套判定。

function hasIncompleteRelevantRollData(item: VaultItemMatchInput): boolean {
  if (!item.weapon_roll) return true;
  if (item.weapon_roll.incomplete_reasons.some((reason) => reason !== "unclassified_socket")) return true;
  return item.weapon_roll.sockets.some((socket) => socket.slot !== "other" && !socket.complete);
}

function masterworkRequirementMatches(
  requirementName: string,
  plugName: string
): boolean {
  return normalizeComparableName(stripMasterworkDisplayPrefix(requirementName))
    === normalizeComparableName(stripMasterworkDisplayPrefix(plugName));
}

function stripMasterworkDisplayPrefix(value: string): string {
  return value
    .replace(/^\s*\d+\s*阶\s*[：:]\s*/u, "")
    .replace(/^\s*大师杰作\s*[：:]\s*/u, "")
    .trim();
}

function uniqueSourceRecords(records: RecommendationSourceRecord[]): RecommendationSourceRecord[] {
  const unique = new Map<string, RecommendationSourceRecord>();
  for (const record of records) {
    const key = `${record.source_id}\u0000${record.rule_stable_id}`;
    if (!unique.has(key)) unique.set(key, record);
  }
  return [...unique.values()];
}

function normalizeComparableName(value: string): string {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase()
    .replace(/[\p{P}\p{Z}\s]+/gu, "");
}

function perkIdentityMatches(left: string, right: string): boolean {
  const leftIdentity = normalizeComparableName(left);
  return Boolean(leftIdentity) && leftIdentity === normalizeComparableName(right);
}

// 推荐要求按「同一插件 hash」或「同一插件名称」判定。
// 锻造强化特征与基础特性同名但 hash 不同，只比 hash 会把已装备的强化版判成未命中；
// 这条规则与人工推荐路径的 perkIdentityMatches 保持一致，并且是唯一实现。
export type OwnedPlugIdentityEntry = {
  hash: number;
  name: string;
  current: boolean;
  slot?: string;
};

export type OwnedPlugIdentity = {
  hashes: Set<number>;
  names: Set<string>;
  entries: OwnedPlugIdentityEntry[];
};

function ownedPlugHashes(item: VaultItemMatchInput): Set<number> {
  return new Set(ownedPlugIdentity(item).hashes);
}

export function ownedPlugIdentity(item: VaultItemMatchInput): OwnedPlugIdentity {
  const identity: OwnedPlugIdentity = { hashes: new Set(), names: new Set(), entries: [] };
  const collect = (plug: { hash: number; name?: string }, current: boolean, slot?: string) => {
    const name = plug.name?.trim() ?? "";
    identity.hashes.add(plug.hash);
    if (name) identity.names.add(normalizeComparableName(name));
    identity.entries.push({ hash: plug.hash, name, current, ...(slot ? { slot } : {}) });
  };
  if (item.weapon_roll) {
    for (const socket of item.weapon_roll.sockets) {
      for (const plug of socket.owned_plugs) collect(plug, socket.current_plug?.hash === plug.hash, socket.slot);
    }
    return identity;
  }
  for (const plug of item.socket_plugs ?? []) collect(plug, false);
  return identity;
}

export function requirementIsSatisfied(
  owned: OwnedPlugIdentity,
  hashes: readonly number[],
  names: readonly string[]
): boolean {
  return hashes.some((hash) => owned.hashes.has(hash))
    || names.some((name) => owned.names.has(normalizeComparableName(name)));
}

// 返回满足该要求的已拥有插件，用于界面显示“命中 / 命中·当前”。
export function findSatisfyingPlug(
  owned: OwnedPlugIdentity,
  hashes: readonly number[],
  names: readonly string[]
): OwnedPlugIdentityEntry | undefined {
  return owned.entries.find((entry) => hashes.includes(entry.hash))
    ?? owned.entries.find((entry) => entry.name && names.some((name) => (
      normalizeComparableName(name) === normalizeComparableName(entry.name)
    )));
}

function isUsefulRecommendation(recommendation: WeaponRecommendation): boolean {
  return recommendation.combos.length > 0
    || Boolean(recommendation.weapon_level_recommendations?.length)
    || Boolean(recommendation.source_records?.length);
}

function uniquePerks(recommendations: WeaponRecommendation[]): PerkRef[] {
  const perks = new Map<number, PerkRef>();
  for (const recommendation of recommendations) {
    for (const perk of recommendation.individual_perks ?? recommendation.combos.flatMap((combo) => combo.perks)) {
      if (!perks.has(perk.hash)) {
        perks.set(perk.hash, perk);
      }
    }
  }
  return [...perks.values()];
}

function previewPerks(recommendation: WeaponRecommendation): PerkRef[] | undefined {
  const perks = recommendation.individual_perks ?? recommendation.combos.flatMap((combo) => combo.perks);
  if (!perks.length) {
    return undefined;
  }

  const deduped = new Map<number, PerkRef>();
  for (const perk of perks) {
    if (!deduped.has(perk.hash)) {
      deduped.set(perk.hash, perk);
    }
    if (deduped.size >= 3) {
      break;
    }
  }
  return [...deduped.values()];
}

function comboMatchRequirements(combo: PerkCombo): number[][] {
  return combo.perks.map((perk) => [perk.hash]);
}

function comboMatchRequirementNames(combo: PerkCombo): string[][] {
  return combo.perks.map((perk) => (perk.name?.trim() ? [perk.name.trim()] : []));
}

export type ComboRequirementProgress = {
  hashes: number[];
  names: string[];
  slot?: string;
  matched: boolean;
  matchedPlug?: OwnedPlugIdentityEntry;
};

// 唯一的组合逐项判定：所有界面、卡片、详情、审计都必须消费它的结果。
export function evaluateComboRequirements(
  combo: PerkCombo,
  owned: OwnedPlugIdentity
): ComboRequirementProgress[] {
  const requirements = comboMatchRequirements(combo);
  const names = comboMatchRequirementNames(combo);
  const slots = combo.perks.map(() => undefined);
  return requirements.map((hashes, index) => {
    const candidates = names[index] ?? [];
    const matchedPlug = findSatisfyingPlug(owned, hashes, candidates);
    return {
      hashes,
      names: candidates,
      ...(slots[index] ? { slot: slots[index] } : {}),
      matched: Boolean(matchedPlug),
      ...(matchedPlug ? { matchedPlug } : {})
    };
  });
}

/**
 * 栏位的**唯一**顺序与名称来源。投影、匹配、标签全部读这里：
 * 曾经在 core 与本仓服务层各有一份私有表，名字改一处漏一处。
 */
export const recommendationRequirementSlots: RecommendationRequirementSlot[] = [
  "barrel",
  "magazine",
  "masterwork",
  "perk1",
  "perk2",
  "origin"
];

/** 某个字符串是不是标准六栏之一——「这条要求能不能进记录」的唯一入口。 */
export function isRecommendationRequirementSlot(slot: string): slot is RecommendationRequirementSlot {
  return (recommendationRequirementSlots as readonly string[]).includes(slot);
}

/**
 * 「这条规则是不是武器级推荐」的**唯一判据**：它没有任何落在标准六栏里的要求。
 *
 * 有一条能核对的栏位要求就是一条 Roll 推荐——**只有枪管也算**，不是只有特性栏才算。
 * 反过来，要求一条都定位不到栏位的规则才是武器级推荐：它推荐的是武器本身，
 * 没有任何可核对的东西（那种规则在记录投影里也必然是空的，两边口径一致）。
 *
 * 这个判断过去散在三个地方，而且**各说各话**：导入期看 `requirements.length`、
 * CSV 读取期看「有没有点 Perk 1 / Perk 2」、DIM 读取期看「有没有六栏要求」。
 * 于是同一份事实换一种格式写出来，武器级条数就变了——而它直接进
 * `matched` / `available`，用户看到的符合度会跟着格式变。判据只能有一份，住在这里。
 */
export function isWeaponLevelRule(requirements: ReadonlyArray<{ slot: string }>): boolean {
  return !requirements.some((requirement) => isRecommendationRequirementSlot(requirement.slot));
}

/** 来源只说「有个要求」而没说是哪一栏时的兜底标签。 */
export const unspecifiedRequirementSlotLabel = "推荐项";

export const recommendationRequirementSlotLabels: Record<string, string> = {
  barrel: "枪管/瞄具",
  magazine: "第二列",
  masterwork: "大师",
  perk1: "Perk 1",
  perk2: "Perk 2",
  origin: "起源特性",
  special: "特殊插槽",
  unknown: "推荐项位置未知"
};

// 返回满足的要求数与要求总数；hash 相同或名称相同都算满足。
function countMatchedRequirements(combo: PerkCombo, owned: OwnedPlugIdentity): { matched: number; total: number } {
  const progress = evaluateComboRequirements(combo, owned);
  return { matched: progress.filter((requirement) => requirement.matched).length, total: progress.length };
}

export type DimColumnPool = {
  columns: Array<{
    slot: string;
    candidates: string[][];
  }>;
};

/**
 * 把同一来源同一武器的组合集合归约成「每栏候选池」。
 *
 * 作者常把「每栏任选其一」展开成笛卡尔积逐行写出（实测 Aegis 863/863、小棒猪去冗余后 257/257 都是），
 * 这类行集合与栏位模型完全等价，可以无损归约。归约条件：
 * 1. 先去掉被包含的冗余超集行：一行要求所列插件全中，满足更长行必然满足被它包含的短行；
 * 2. 每套组合的插件不重复占同一栏；
 * 3. 去冗余后的组合数等于各栏候选种数之积，且两两不同。
 * 任一条不成立就保留原有的「一行一个完整组合」语义（例如在线合集 dim_voltron）。
 */
export function reduceCombosToColumnPool(
  requirementSets: ReadonlyArray<Array<{ slot?: string; hashes: number[] }>>
): DimColumnPool | undefined {
  const normalized = requirementSets
    .filter((set) => set.length > 0)
    .map((set) => set.map((requirement) => ({
      slot: requirement.slot ?? "unknown",
      hashes: [...requirement.hashes].sort((left, right) => left - right)
    })));
  if (normalized.length < 2) return undefined;

  const byIdentity = new Map<string, typeof normalized[number]>();
  for (const set of normalized) {
    byIdentity.set(set.map((requirement) => `${requirement.slot}:${requirement.hashes.join(",")}`).sort().join("|"), set);
  }
  const distinct = [...byIdentity.values()];

  // 冗余超集行：组合 A 的每栏要求都能被组合 B 覆盖时，A 不提供任何新命中。
  const minimal = distinct.filter((set, index) => !distinct.some((other, otherIndex) => {
    if (otherIndex === index || other.length > set.length) return false;
    return other.every((requirement) => set.some((candidate) => (
      candidate.slot === requirement.slot
      && requirement.hashes.every((hash) => candidate.hashes.includes(hash))
    )));
  }));
  if (minimal.length < 2) return undefined;

  const columns = new Map<string, number[][]>();
  for (const set of minimal) {
    const slots = set.map((requirement) => requirement.slot);
    if (new Set(slots).size !== slots.length) return undefined;
    for (const requirement of set) {
      columns.set(requirement.slot, [...(columns.get(requirement.slot) ?? []), requirement.hashes]);
    }
  }
  const slotOrder = [...columns.keys()];
  const candidateSets = slotOrder.map((slot) => {
    const seen = new Map<string, number[]>();
    for (const hashes of columns.get(slot) ?? []) seen.set(hashes.join(","), hashes);
    return [...seen.values()];
  });
  const product = candidateSets.reduce((total, candidates) => total * candidates.length, 1);
  if (product !== minimal.length) return undefined;
  if (candidateSets.some((candidates) => candidates.length < 1)) return undefined;

  // 组合数等于各栏种数之积、且两两不同时，去冗余后的集合必然等于完整的笛卡尔积。
  return {
    columns: slotOrder.map((slot, index) => ({
      slot,
      candidates: candidateSets[index].map((hashes) => hashes.map(String))
    }))
  };
}

function comboMatchesItem(combo: PerkCombo, owned: OwnedPlugIdentity): boolean {
  if (combo.kind === "weapon_only") return true;
  const { matched, total } = countMatchedRequirements(combo, owned);
  return total > 0 && matched === total;
}

export type { PerkCombo };
