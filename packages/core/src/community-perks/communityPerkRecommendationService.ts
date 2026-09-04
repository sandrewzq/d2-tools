import type {
  CommunityPerkSource,
  PerkCombo,
  PerkRef,
  RecommendationRequirementSlot,
  RecommendationSourceMatch,
  RecommendationSourceRecord,
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
      ai_analysis: valid.map((r) => r.ai_analysis).filter(Boolean).join("\n\n") || undefined,
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
      const matchedComboIndexes = new Set<number>();
      const matchedModes = new Set<"pve" | "pvp" | "general">();

      for (let index = 0; index < rec.combos.length; index++) {
        const combo = rec.combos[index];
        for (const item of itemsForHash) {
          const actualHashes = ownedPlugHashes(item);
          const allIn = comboMatchRequirements(combo).every((hashes) => hashes.some((hash) => actualHashes.has(hash)));
          if (allIn) {
            matchedComboIndexes.add(index);
            matchedModes.add(combo.mode);
            break;
          }
        }
      }

      result.set(hash, {
        matched: matchedComboIndexes.size,
        available: rec.combos.length,
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
          matched: 0,
          partial: 0,
          available: 0,
          modes: []
        };
      }

      const actualHashes = ownedPlugHashes(item);
      const weaponLevelRecommendations = recommendation.weapon_level_recommendations ?? [];
      const sourceMatches = matchSourceRecords(item, recommendation.source_records ?? []);
      const dimWishlistMatch = matchDimWishlistCombos(item, recommendation.combos, actualHashes);
      if (sourceMatches.length > 0) {
        return sourceMatchCompatibilityResult(
          item,
          canonicalWeaponName,
          recommendation,
          sourceMatches,
          dimWishlistMatch
        );
      }
      if (actualHashes.size === 0 && weaponLevelRecommendations.length === 0) {
        return {
          hash: item.hash,
          ...(item.instance_id ? { instance_id: item.instance_id } : {}),
          canonical_weapon_name: canonicalWeaponName,
          coverage: "covered",
          match_status: "indeterminate",
          matched: 0,
          partial: 0,
          available: recommendation.combos.length,
          modes: recommendation.matched_modes,
          sample_perks: previewPerks(recommendation),
          source_label: recommendation.source_label,
          ...(dimWishlistMatch ? { dim_wishlist: dimWishlistMatch } : {})
        };
      }

      if (hasIncompleteRelevantRollData(item) && recommendation.combos.length > 0) {
        return {
          hash: item.hash,
          ...(item.instance_id ? { instance_id: item.instance_id } : {}),
          canonical_weapon_name: canonicalWeaponName,
          coverage: "covered",
          match_status: "indeterminate",
          matched: weaponLevelRecommendations.length,
          partial: 0,
          available: weaponLevelRecommendations.length + recommendation.combos.length,
          modes: recommendation.matched_modes,
          sample_perks: previewPerks(recommendation),
          source_label: recommendation.source_label,
          ...(dimWishlistMatch ? { dim_wishlist: dimWishlistMatch } : {})
        };
      }

      const fullMatches = recommendation.combos.filter((combo) => (
        comboMatchRequirements(combo).every((hashes) => hashes.some((hash) => actualHashes.has(hash)))
      ));
      const partialMatches = recommendation.combos.filter((combo) => {
        const requirements = comboMatchRequirements(combo);
        const matchedPerks = requirements.filter((hashes) => hashes.some((hash) => actualHashes.has(hash))).length;
        return matchedPerks > 0 && matchedPerks < requirements.length;
      });
      const matchedModes = Array.from(new Set(
        [
          ...weaponLevelRecommendations.map((entry) => entry.mode),
          ...(fullMatches.length > 0 ? fullMatches : partialMatches).map((combo) => combo.mode)
        ]
      ));
      const matched = weaponLevelRecommendations.length + fullMatches.length;
      const available = weaponLevelRecommendations.length + recommendation.combos.length;
      return {
        hash: item.hash,
        ...(item.instance_id ? { instance_id: item.instance_id } : {}),
        canonical_weapon_name: canonicalWeaponName,
        coverage: "covered",
        match_status: matched > 0
          ? "full_match"
          : partialMatches.length > 0
            ? "partial_match"
            : "no_match",
        matched,
        partial: partialMatches.length,
        available,
        modes: matchedModes.length ? matchedModes : recommendation.matched_modes,
        sample_perks: previewPerks(recommendation),
        source_label: recommendation.source_label,
        ...(dimWishlistMatch ? { dim_wishlist: dimWishlistMatch } : {})
      };
    }));
  }
}

const recommendationSlots: Array<{ slot: RecommendationRequirementSlot; label: string }> = [
  { slot: "barrel", label: "枪管/瞄具" },
  { slot: "magazine", label: "第二列" },
  { slot: "masterwork", label: "大师" },
  { slot: "perk1", label: "Perk 1" },
  { slot: "perk2", label: "Perk 2" },
  { slot: "origin", label: "起源特性" }
];

function matchSourceRecords(
  item: VaultItemMatchInput,
  records: readonly RecommendationSourceRecord[]
): RecommendationSourceMatch[] {
  return records.map((record) => {
    const requirements = new Map(record.requirements.map((requirement) => [requirement.slot, requirement]));
    const slots = recommendationSlots.map(({ slot, label }) => {
      const requirement = requirements.get(slot);
      const rollSocket = item.weapon_roll?.sockets.find((socket) => socket.slot === slot);
      if (!requirement) {
        return {
          slot,
          label,
          state: "source_not_specified" as const,
          source_candidate_names: [],
          source_candidates: [],
          unresolved_source_candidate_names: [],
          instance_owned: rollSocket?.owned_plugs ?? [],
          current_enabled: rollSocket?.current_plug ? [rollSocket.current_plug] : []
        };
      }

      const matches = Boolean(rollSocket) && rollSocket!.owned_plugs.some((plug) => (
        requirement.candidates.some((candidate) => (
          plug.hash === candidate.hash || perkIdentityMatches(plug.name, candidate.name)
        ))
        || requirement.candidate_names.some((name) => (
          slot === "masterwork"
            ? masterworkRequirementMatches(name, plug.name, plug.category_identifier)
            : perkIdentityMatches(plug.name, name)
        ))
      ));
      const cannotCheck = !matches && (
        !item.weapon_roll
        || (rollSocket ? rollSocket.complete === false : hasIncompleteRelevantRollData(item))
      );
      return {
        slot,
        label: requirement.label || label,
        state: matches ? "match" as const : cannotCheck ? "uncheckable" as const : "different" as const,
        source_candidate_names: requirement.candidate_names,
        source_candidates: requirement.candidates,
        unresolved_source_candidate_names: requirement.unresolved_candidate_names,
        instance_owned: rollSocket?.owned_plugs ?? [],
        current_enabled: rollSocket?.current_plug ? [rollSocket.current_plug] : []
      };
    });
    const specified = slots.filter((slot) => slot.state !== "source_not_specified");
    const matched = specified.filter((slot) => slot.state === "match").length;
    const uncheckable = specified.filter((slot) => slot.state === "uncheckable").length;
    const checkable = specified.length - uncheckable;
    return {
      source_id: record.source_id,
      source_label: record.source_label,
      ...(record.source_url ? { source_url: record.source_url } : {}),
      state: specified.length === 0
        ? "weapon_only" as const
        : uncheckable > 0
          ? "uncheckable" as const
          : "checked" as const,
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

function sourceMatchCompatibilityResult(
  item: VaultItemMatchInput,
  canonicalWeaponName: string,
  recommendation: WeaponRecommendation,
  sourceMatches: RecommendationSourceMatch[],
  dimWishlistMatch: VaultItemInstanceMatchInfo["dim_wishlist"]
): VaultItemInstanceMatchInfo {
  const fullyMatched = sourceMatches.filter((source) => (
    source.state === "weapon_only"
    || (source.uncheckable_requirement_count === 0 && source.requirement_count > 0
      && source.matched_requirement_count === source.requirement_count)
  ));
  const partiallyMatched = sourceMatches.filter((source) => (
    source.matched_requirement_count > 0
    && source.matched_requirement_count < source.requirement_count
  ));
  const hasCheckable = sourceMatches.some((source) => source.checkable_requirement_count > 0 || source.state === "weapon_only");
  const hasUncheckable = sourceMatches.some((source) => source.state === "uncheckable");
  return {
    hash: item.hash,
    ...(item.instance_id ? { instance_id: item.instance_id } : {}),
    canonical_weapon_name: canonicalWeaponName,
    coverage: "covered",
    match_status: fullyMatched.length > 0
      ? "full_match"
      : partiallyMatched.length > 0
        ? "partial_match"
        : !hasCheckable && hasUncheckable
          ? "indeterminate"
          : "no_match",
    matched: fullyMatched.length,
    partial: partiallyMatched.length,
    available: sourceMatches.length,
    modes: recommendation.matched_modes,
    sample_perks: previewPerks(recommendation),
    source_label: recommendation.source_label,
    source_matches: sourceMatches,
    ...(dimWishlistMatch ? { dim_wishlist: dimWishlistMatch } : {})
  };
}

function matchDimWishlistCombos(
  item: VaultItemMatchInput,
  combos: readonly PerkCombo[],
  actualHashes: ReadonlySet<number>
): VaultItemInstanceMatchInfo["dim_wishlist"] {
  const dimCombos = combos.filter((combo) => combo.source === "dim_wishlist");
  if (!dimCombos.length) return undefined;
  const rules = dimCombos.map((combo) => {
    const requirements = comboMatchRequirements(combo);
    const matched = requirements.filter((hashes) => hashes.some((hash) => actualHashes.has(hash))).length;
    const incomplete = hasIncompleteRelevantRollData(item);
    return {
      mode: combo.mode,
      state: matched === requirements.length
        ? "match" as const
        : incomplete
          ? "uncheckable" as const
          : matched > 0
            ? "partial" as const
            : "different" as const,
      matched_requirement_count: matched,
      requirement_count: requirements.length,
      ...(combo.dim_diagnostic ? { diagnostic_status: combo.dim_diagnostic.status } : {})
    };
  });
  const bestRule = selectBestDimRuleProgress(rules);
  return {
    matched_combo_count: rules.filter((rule) => rule.state === "match").length,
    partial_combo_count: rules.filter((rule) => rule.state === "partial").length,
    uncheckable_combo_count: rules.filter((rule) => rule.state === "uncheckable").length,
    combo_count: rules.length,
    best_matched_requirement_count: bestRule?.matched_requirement_count ?? 0,
    best_requirement_count: bestRule?.requirement_count ?? 0,
    modes: [...new Set(rules.map((rule) => rule.mode))],
    rules
  };
}

function hasIncompleteRelevantRollData(item: VaultItemMatchInput): boolean {
  if (!item.weapon_roll) return true;
  if (item.weapon_roll.incomplete_reasons.some((reason) => reason !== "unclassified_socket")) return true;
  return item.weapon_roll.sockets.some((socket) => socket.slot !== "other" && !socket.complete);
}

function masterworkRequirementMatches(
  requirementName: string,
  plugName: string,
  categoryIdentifier?: string
): boolean {
  const requirement = masterworkStatIdentity(requirementName);
  if (!requirement) return normalizeComparableName(requirementName) === normalizeComparableName(plugName);
  return requirement === masterworkStatIdentity(`${categoryIdentifier ?? ""} ${plugName}`);
}

function masterworkStatIdentity(value: string): string | undefined {
  const normalized = normalizeComparableName(value);
  if (!normalized) return undefined;
  if (includesComparableText(normalized, ["reload", "填装", "装填"])) return "reload";
  if (includesComparableText(normalized, ["range", "射程"])) return "range";
  if (includesComparableText(normalized, ["stability", "稳定"])) return "stability";
  if (includesComparableText(normalized, ["handling", "操控"])) return "handling";
  if (includesComparableText(normalized, ["chargetime", "充能时间", "充能"])) return "charge_time";
  if (includesComparableText(normalized, ["drawtime", "拉弓时间", "拉弓"])) return "draw_time";
  if (includesComparableText(normalized, ["velocity", "弹速"])) return "velocity";
  if (includesComparableText(normalized, ["blastradius", "爆炸范围"])) return "blast_radius";
  if (includesComparableText(normalized, ["impact", "冲击"])) return "impact";
  if (includesComparableText(normalized, ["accuracy", "精准度", "精准"])) return "accuracy";
  return undefined;
}

function includesComparableText(value: string, candidates: readonly string[]): boolean {
  return candidates.some((candidate) => value.includes(normalizeComparableName(candidate)));
}

function selectBestDimRuleProgress<T extends {
  matched_requirement_count: number;
  requirement_count: number;
}>(rules: readonly T[]): T | undefined {
  return rules.reduce<T | undefined>((best, rule) => {
    if (!best) return rule;
    const ruleComplete = rule.requirement_count > 0
      && rule.matched_requirement_count === rule.requirement_count;
    const bestComplete = best.requirement_count > 0
      && best.matched_requirement_count === best.requirement_count;
    if (ruleComplete !== bestComplete) return ruleComplete ? rule : best;
    const ratioDifference = rule.matched_requirement_count * best.requirement_count
      - best.matched_requirement_count * rule.requirement_count;
    if (ratioDifference !== 0) return ratioDifference > 0 ? rule : best;
    if (rule.requirement_count !== best.requirement_count) {
      return rule.requirement_count > best.requirement_count ? rule : best;
    }
    return rule.matched_requirement_count > best.matched_requirement_count ? rule : best;
  }, undefined);
}

function uniqueSourceRecords(records: RecommendationSourceRecord[]): RecommendationSourceRecord[] {
  const unique = new Map<string, RecommendationSourceRecord>();
  for (const record of records) {
    const key = `${record.source_id}\u0000${record.source_label}`;
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

function normalizePerkIdentity(value: string): string {
  return normalizeComparableName(value)
    .replace(/强化(?:版|型|特性)?/gu, "");
}

function perkIdentityMatches(left: string, right: string): boolean {
  const leftIdentity = normalizePerkIdentity(left);
  return Boolean(leftIdentity) && leftIdentity === normalizePerkIdentity(right);
}

function ownedPlugHashes(item: VaultItemMatchInput): Set<number> {
  if (item.weapon_roll) {
    return new Set(item.weapon_roll.sockets.flatMap((socket) => (
      socket.owned_plugs.map((plug) => plug.hash)
    )));
  }
  return new Set(item.socket_plugs?.map((plug) => plug.hash) ?? []);
}

function isUsefulRecommendation(recommendation: WeaponRecommendation): boolean {
  return recommendation.combos.length > 0
    || Boolean(recommendation.weapon_level_recommendations?.length)
    || Boolean(recommendation.source_records?.length)
    || Boolean(recommendation.ai_analysis?.trim());
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
  if (combo.source !== "dim_wishlist" || !combo.dim_diagnostic) {
    return combo.perks.map((perk) => [perk.hash]);
  }
  return combo.dim_diagnostic.perks.map((perk) => (
    perk.resolved_hashes?.length ? perk.resolved_hashes : [perk.resolved_hash ?? perk.original_hash]
  ));
}

export type { PerkCombo };
