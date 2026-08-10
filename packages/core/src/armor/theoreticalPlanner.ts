import type { ArmorStatKey } from "../loadouts/analysis.js";
import type { ArmorSetCatalogEntry } from "../items/equipableItemSet.js";
import {
  addArmorStatValues,
  armorSlots,
  armorStatKeys,
  cloneArmorStatValues,
  createEmptyArmorStatValues,
  type ArmorClass,
  type ArmorSlot,
  type ArmorStatValues
} from "./model.js";
import {
  buildArmorConfiguration,
  type ArmorConfiguration,
  type ArmorConfigurationInput,
  type ArmorConfigurationTuning
} from "./configuration.js";
import {
  normalizeArmorTarget,
  type ArmorReachabilityIssue,
  type ArmorReachabilityModBudget,
  type ArmorReachabilityPiece,
  type ArmorReachabilityStatConstraint,
  type NormalizedArmorTarget
} from "./reachability.js";
import { validateArmorRuleset, type ArmorRuleset } from "./ruleset.js";
import {
  buildArmorSetCoverage,
  normalizeArmorSetConstraint,
  type ArmorSetCoverage,
  type ArmorSetConstraint,
  type NormalizedArmorSetConstraint
} from "./sets.js";

export type ArmorTheoreticalTuningMode = "shift" | "plus3";

export type ArmorTheoreticalIdentity = {
  identity_id: string;
  archetype_id: string;
  archetype_name: string;
  primary_stat: ArmorStatKey;
  secondary_stat: ArmorStatKey;
  tertiary_stat: ArmorStatKey;
  tuning_mode: ArmorTheoreticalTuningMode;
};

export type EnumerateArmorTheoreticalIdentitiesOptions = {
  archetype_ids?: readonly string[];
  tertiary_stats?: readonly ArmorStatKey[];
  tuning_modes?: readonly ArmorTheoreticalTuningMode[];
};

export type ArmorTheoreticalPlanRequest = EnumerateArmorTheoreticalIdentitiesOptions & {
  ruleset: ArmorRuleset;
  class: ArmorClass;
  target: Partial<Record<ArmorStatKey, ArmorReachabilityStatConstraint>>;
  fragment_adjustments?: Partial<Record<ArmorStatKey, number>>;
  armor_mod_budget?: Partial<ArmorReachabilityModBudget>;
  allowed_armor_mod_values?: readonly (0 | 5 | 10)[];
  masterwork_tier?: number;
  fixed_pieces?: Partial<Record<ArmorSlot, ArmorReachabilityPiece>>;
  armor_set_catalog?: readonly ArmorSetCatalogEntry[];
  set_constraint?: ArmorSetConstraint;
  priority_stats?: readonly ArmorStatKey[];
  limit?: number;
  state_limit?: number;
};

export type ArmorTheoreticalPieceChoice = {
  configuration: ArmorConfiguration;
  equivalent_identity_ids: string[];
  equivalent_identity_count: number;
};

export type ArmorTheoreticalCandidate = {
  candidate_id: string;
  hard_constraints_met: boolean;
  pieces: ArmorTheoreticalPieceChoice[];
  armor_total: ArmorStatValues;
  fragment_adjustments: ArmorStatValues;
  final_total: ArmorStatValues;
  target_shortfalls: Partial<Record<ArmorStatKey, number>>;
  target_overflows: Partial<Record<ArmorStatKey, number>>;
  total_gap: number;
  maximum_gap: number;
  stat_waste: number;
  armor_mod_usage: {
    plus5: number;
    plus10: number;
  };
  tuning_mode_counts: Record<ArmorTheoreticalTuningMode, number>;
  armor_set_coverage: ArmorSetCoverage;
};

export type ArmorTheoreticalPlanResult = {
  status: "reachable" | "unreachable" | "indeterminate" | "invalid";
  ruleset_id: ArmorRuleset["ruleset_id"];
  ruleset_version: number;
  target: NormalizedArmorTarget;
  fragment_adjustments: ArmorStatValues;
  armor_mod_budget: Required<ArmorReachabilityModBudget>;
  armor_set_constraint: NormalizedArmorSetConstraint;
  candidates: ArmorTheoreticalCandidate[];
  nearest_feasible_values?: ArmorStatValues;
  search: {
    stat_outcomes_complete: boolean;
    truncated: boolean;
    states_examined: number;
    states_retained: number;
    piece_option_counts: Record<ArmorSlot, number>;
  };
  issues: ArmorReachabilityIssue[];
  warnings: string[];
};

type TheoreticalPieceOption = {
  choice: ArmorTheoreticalPieceChoice;
  plus5: number;
  plus10: number;
  equivalent_identity_ids: Set<string>;
  set_hash?: number;
};

type TheoreticalSearchState = {
  totals: ArmorStatValues;
  plus5: number;
  plus10: number;
  set_counts: number[];
  choices: ArmorTheoreticalPieceChoice[];
};

type RemainingStatBounds = Record<ArmorStatKey, { minimum: number; maximum: number }>;
type RemainingSetCapacity = number[];

export function enumerateArmorTheoreticalIdentities(
  ruleset: ArmorRuleset,
  options: EnumerateArmorTheoreticalIdentitiesOptions = {}
): ArmorTheoreticalIdentity[] {
  const allowedArchetypes = options.archetype_ids?.length
    ? new Set(options.archetype_ids)
    : undefined;
  const allowedTertiary = options.tertiary_stats?.length
    ? new Set(options.tertiary_stats)
    : undefined;
  const allowedModes = new Set(
    options.tuning_modes?.length ? options.tuning_modes : ["shift", "plus3"]
  );
  const identities: ArmorTheoreticalIdentity[] = [];

  for (const archetype of ruleset.archetypes) {
    if (allowedArchetypes && !allowedArchetypes.has(archetype.id)) continue;
    for (const tertiaryStat of armorStatKeys) {
      if (tertiaryStat === archetype.primary_stat || tertiaryStat === archetype.secondary_stat) continue;
      if (allowedTertiary && !allowedTertiary.has(tertiaryStat)) continue;
      for (const tuningMode of ["shift", "plus3"] as const) {
        if (!allowedModes.has(tuningMode)) continue;
        identities.push({
          identity_id: `${archetype.id}:${tertiaryStat}:${tuningMode}`,
          archetype_id: archetype.id,
          archetype_name: archetype.name,
          primary_stat: archetype.primary_stat,
          secondary_stat: archetype.secondary_stat,
          tertiary_stat: tertiaryStat,
          tuning_mode: tuningMode
        });
      }
    }
  }

  return identities.sort((left, right) => left.identity_id.localeCompare(right.identity_id));
}

export function planTheoreticalArmor(
  request: ArmorTheoreticalPlanRequest
): ArmorTheoreticalPlanResult {
  const targetResult = normalizeArmorTarget(request.target, request.ruleset);
  const fragments = cloneArmorStatValues(request.fragment_adjustments);
  const budget = normalizeModBudget(request.armor_mod_budget);
  const priorityStats = normalizePriorityStats(request.priority_stats);
  const limit = normalizeLimit(request.limit, 5, 20);
  const stateLimit = normalizeLimit(request.state_limit, 1500, 50_000);
  const identities = enumerateArmorTheoreticalIdentities(request.ruleset, request);
  const setResult = normalizeArmorSetConstraint({
    constraint: request.set_constraint,
    catalog: request.armor_set_catalog,
    ruleset: request.ruleset,
    class: request.class
  });
  const issues = [
    ...targetResult.issues,
    ...setResult.issues,
    ...validateTheoreticalRequest(request, budget, identities)
  ];

  if (issues.length) {
    return emptyPlanResult(
      request.ruleset,
      targetResult.target,
      fragments,
      budget,
      setResult.constraint,
      issues
    );
  }

  const optionsBySlot = new Map<ArmorSlot, TheoreticalPieceOption[]>();
  for (const slot of armorSlots) {
    const fixedPiece = request.fixed_pieces?.[slot];
    const options = fixedPiece
      ? buildFixedPieceOptions(request, slot, fixedPiece, budget)
      : buildGenericPieceOptions(request, slot, identities, budget, setResult.constraint);
    if (!options.length) {
      issues.push({
        code: "missing_theoretical_piece_options",
        message: `${slot} 没有满足当前框架、调整和模组限制的理论配置。`,
        piece_id: fixedPiece?.piece_id
      });
    }
    optionsBySlot.set(slot, options);
  }
  if (issues.length) {
    return emptyPlanResult(
      request.ruleset,
      targetResult.target,
      fragments,
      budget,
      setResult.constraint,
      issues
    );
  }

  const remainingBounds = buildRemainingBounds(optionsBySlot);
  const remainingSetCapacities = buildRemainingSetCapacities(
    optionsBySlot,
    setResult.constraint
  );
  const emptySetCounts = setResult.constraint.requirements.map(() => 0);
  let states = new Map<string, TheoreticalSearchState>([[
    searchStateKey(createEmptyArmorStatValues(), 0, 0, emptySetCounts),
    {
      totals: createEmptyArmorStatValues(),
      plus5: 0,
      plus10: 0,
      set_counts: emptySetCounts,
      choices: []
    }
  ]]);
  let statesExamined = 0;
  let truncated = false;

  for (let slotIndex = 0; slotIndex < armorSlots.length; slotIndex += 1) {
    const slot = armorSlots[slotIndex]!;
    const options = optionsBySlot.get(slot) ?? [];
    let next = new Map<string, TheoreticalSearchState>();
    for (const state of states.values()) {
      for (const option of options) {
        statesExamined += 1;
        const plus5 = state.plus5 + option.plus5;
        const plus10 = state.plus10 + option.plus10;
        if (plus5 > budget.plus5 || plus10 > budget.plus10) continue;
        const remainingPieces = armorSlots.length - slotIndex - 1;
        if (budget.usage === "exact"
          && ((budget.plus5 - plus5) + (budget.plus10 - plus10) > remainingPieces)) continue;

        const totals = addArmorStatValues(state.totals, option.choice.configuration.stats.final);
        const setCounts = incrementSetCounts(
          state.set_counts,
          option.set_hash,
          slot,
          setResult.constraint
        );
        const key = searchStateKey(totals, plus5, plus10, setCounts);
        if (!next.has(key)) {
          next.set(key, {
            totals,
            plus5,
            plus10,
            set_counts: setCounts,
            choices: [...state.choices, option.choice]
          });
        }
      }

      if (next.size > stateLimit * 4) {
        truncated = true;
        next = retainBestStates(
          next,
          stateLimit * 2,
          remainingBounds[slotIndex + 1]!,
          remainingSetCapacities[slotIndex + 1]!,
          targetResult.target,
          fragments,
          priorityStats,
          request.ruleset,
          setResult.constraint
        );
      }
    }

    if (next.size > stateLimit) {
      truncated = true;
      next = retainBestStates(
        next,
        stateLimit,
        remainingBounds[slotIndex + 1]!,
        remainingSetCapacities[slotIndex + 1]!,
        targetResult.target,
        fragments,
        priorityStats,
        request.ruleset,
        setResult.constraint
      );
    }
    states = next;
  }

  const candidates = [...states.values()]
    .filter((state) => budgetMatches(state, budget))
    .map((state) => buildCandidate(
      state,
      targetResult.target,
      fragments,
      request.ruleset,
      setResult.constraint
    ))
    .sort((left, right) => compareCandidates(left, right, priorityStats))
    .slice(0, limit);
  const reachable = candidates.some((candidate) => candidate.hard_constraints_met);
  const status = reachable
    ? "reachable"
    : truncated
      ? "indeterminate"
      : "unreachable";
  const warnings: string[] = [];
  if (truncated) {
    warnings.push(reachable
      ? "已找到达标理论方案，但搜索达到状态上限，当前排序不保证是全局唯一最优。"
      : "搜索达到状态上限，当前最近候选不能证明目标不可达。"
    );
  }
  if (!reachable && !truncated) {
    warnings.push("已完整枚举保留的属性结果，未找到同时满足全部目标的理论方案。"
    );
  }

  return {
    status,
    ruleset_id: request.ruleset.ruleset_id,
    ruleset_version: request.ruleset.version,
    target: targetResult.target,
    fragment_adjustments: fragments,
    armor_mod_budget: budget,
    armor_set_constraint: setResult.constraint,
    candidates,
    ...(!reachable && candidates[0]
      ? { nearest_feasible_values: cloneArmorStatValues(candidates[0].final_total) }
      : {}),
    search: {
      stat_outcomes_complete: !truncated,
      truncated,
      states_examined: statesExamined,
      states_retained: states.size,
      piece_option_counts: Object.fromEntries(armorSlots.map((slot) => [
        slot,
        optionsBySlot.get(slot)?.length ?? 0
      ])) as Record<ArmorSlot, number>
    },
    issues: status === "unreachable"
      ? [{ code: "theoretical_target_unreachable", message: "当前规则与限制下没有达标理论方案。" }]
      : [],
    warnings
  };
}

function validateTheoreticalRequest(
  request: ArmorTheoreticalPlanRequest,
  budget: Required<ArmorReachabilityModBudget>,
  identities: readonly ArmorTheoreticalIdentity[]
): ArmorReachabilityIssue[] {
  const issues: ArmorReachabilityIssue[] = validateArmorRuleset(request.ruleset).map((message) => ({
    code: "invalid_armor_ruleset",
    message
  }));
  if (request.class === "unknown") {
    issues.push({ code: "unknown_armor_class", message: "理论规划必须指定有效职业。" });
  }
  if (!identities.length && Object.keys(request.fixed_pieces ?? {}).length < armorSlots.length) {
    issues.push({ code: "missing_theoretical_identities", message: "当前规则和筛选没有可用的理论护甲身份。" });
  }
  if (budget.usage === "exact" && budget.plus5 + budget.plus10 > armorSlots.length) {
    issues.push({ code: "armor_mod_budget_exceeds_slots", message: "精确模组数量不能超过五件护甲。" });
  }
  if (request.masterwork_tier !== undefined
    && (!Number.isInteger(request.masterwork_tier)
      || request.masterwork_tier < 0
      || request.masterwork_tier > request.ruleset.masterwork.maximum_tier)) {
    issues.push({
      code: "invalid_masterwork_tier",
      message: `大师杰作等级必须位于 0-${request.ruleset.masterwork.maximum_tier}。`
    });
  }
  issues.push(...validateBudgetInput(request.armor_mod_budget));

  const fixedPieces = Object.entries(request.fixed_pieces ?? {})
    .filter((entry): entry is [string, ArmorReachabilityPiece] => Boolean(entry[1]))
    .map(([slot, piece]) => [slot as ArmorSlot, piece] as const);
  const fixedPieceIds = new Set<string>();
  if (fixedPieces.filter(([, piece]) => piece.exotic || piece.exotic_class_item).length > 1) {
    issues.push({ code: "multiple_exotic_armor", message: "同一套理论配置最多包含一件异域护甲。" });
  }
  for (const [slot, piece] of fixedPieces) {
    if (!piece.piece_id.trim()) {
      issues.push({ code: "missing_piece_id", message: "固定护甲缺少稳定 ID。" });
    } else if (fixedPieceIds.has(piece.piece_id)) {
      issues.push({
        code: "duplicate_piece_id",
        message: `固定护甲 ID 重复：${piece.piece_id}`,
        piece_id: piece.piece_id
      });
    }
    fixedPieceIds.add(piece.piece_id);
    if (piece.slot !== slot) {
      issues.push({
        code: "fixed_piece_slot_mismatch",
        message: `固定护甲 ${piece.piece_id} 的槽位与 ${slot} 约束不一致。`,
        piece_id: piece.piece_id
      });
    }
    if (!classesCompatible(request.class, piece.class)) {
      issues.push({
        code: "fixed_piece_class_mismatch",
        message: `固定护甲 ${piece.piece_id} 与目标职业不兼容。`,
        piece_id: piece.piece_id
      });
    }
    if (piece.class === "unknown") {
      issues.push({
        code: "unknown_fixed_piece_class",
        message: `固定护甲 ${piece.piece_id} 的职业未知。`,
        piece_id: piece.piece_id
      });
    }
  }
  return issues;
}

function buildGenericPieceOptions(
  request: ArmorTheoreticalPlanRequest,
  slot: ArmorSlot,
  identities: readonly ArmorTheoreticalIdentity[],
  budget: Required<ArmorReachabilityModBudget>,
  setConstraint: NormalizedArmorSetConstraint
): TheoreticalPieceOption[] {
  const options = new Map<string, TheoreticalPieceOption>();
  const modValues = normalizeAllowedMods(request.allowed_armor_mod_values);
  const setOptions = [
    undefined,
    ...setConstraint.requirements
      .filter((requirement) => requirement.eligible_slots.includes(slot))
      .map((requirement) => ({ hash: requirement.set_hash, name: requirement.name }))
  ];
  for (const armorSet of setOptions) {
    for (const identity of identities) {
      for (const tuning of identityTuningAllocations(identity)) {
        addConfigurationOptions({
          options,
          ruleset: request.ruleset,
          slot,
          armorClass: request.class,
          identity,
          tuning,
          modValues,
          budget,
          masterworkTier: request.masterwork_tier,
          armorSet
        });
      }
    }
  }
  return [...options.values()].sort(comparePieceOptions);
}

function buildFixedPieceOptions(
  request: ArmorTheoreticalPlanRequest,
  slot: ArmorSlot,
  piece: ArmorReachabilityPiece,
  budget: Required<ArmorReachabilityModBudget>
): TheoreticalPieceOption[] {
  const options = new Map<string, TheoreticalPieceOption>();
  const globalMods = normalizeAllowedMods(request.allowed_armor_mod_values);
  const pieceMods = piece.allowed_armor_mod_values === undefined
    ? globalMods
    : normalizeAllowedMods(piece.allowed_armor_mod_values).filter((value) => globalMods.includes(value));
  const archetype = request.ruleset.archetypes.find((candidate) => candidate.id === piece.archetype_id);
  if (!archetype) return [];
  const identity: ArmorTheoreticalIdentity = {
    identity_id: `fixed:${piece.piece_id}`,
    archetype_id: archetype.id,
    archetype_name: archetype.name,
    primary_stat: archetype.primary_stat,
    secondary_stat: archetype.secondary_stat,
    tertiary_stat: piece.tertiary_stat,
    tuning_mode: piece.tuning.mode
  };
  for (const tuning of reachabilityTuningAllocations(piece)) {
    addConfigurationOptions({
      options,
      ruleset: request.ruleset,
      slot,
      armorClass: piece.class,
      identity,
      tuning,
      modValues: pieceMods,
      budget,
      masterworkTier: piece.masterwork_tier ?? request.masterwork_tier,
      fixedPiece: piece
    });
  }
  return [...options.values()].sort(comparePieceOptions);
}

function addConfigurationOptions(input: {
  options: Map<string, TheoreticalPieceOption>;
  ruleset: ArmorRuleset;
  slot: ArmorSlot;
  armorClass: ArmorClass;
  identity: ArmorTheoreticalIdentity;
  tuning: ArmorConfigurationTuning;
  modValues: readonly (0 | 5 | 10)[];
  budget: Required<ArmorReachabilityModBudget>;
  masterworkTier?: number;
  fixedPiece?: ArmorReachabilityPiece;
  armorSet?: { hash: number; name: string };
}): void {
  const armorSet = input.fixedPiece?.set ?? input.armorSet;
  for (const modValue of input.modValues) {
    if (modValue === 5 && input.budget.plus5 === 0) continue;
    if (modValue === 10 && input.budget.plus10 === 0) continue;
    const modStats = modValue === 0 ? [undefined] : armorStatKeys;
    for (const modStat of modStats) {
      const armorStatMod = modStat
        ? { stat: modStat, value: modValue as 5 | 10 }
        : undefined;
      const built = buildArmorConfiguration(input.ruleset, {
        configuration_id: theoreticalConfigurationId(
          input.slot,
          input.identity.identity_id,
          input.tuning,
          armorStatMod,
          armorSet?.hash
        ),
        slot: input.slot,
        class: input.armorClass,
        archetype_id: input.identity.archetype_id,
        tertiary_stat: input.identity.tertiary_stat,
        masterwork_tier: input.masterworkTier,
        tuning: input.tuning,
        armor_stat_mod: armorStatMod,
        item_hash: input.fixedPiece?.item_hash,
        name: input.fixedPiece?.name ?? input.identity.archetype_name,
        exotic: input.fixedPiece?.exotic,
        exotic_class_item: input.fixedPiece?.exotic_class_item,
        set: armorSet
      });
      if (built.status !== "valid") continue;

      const plus5 = modValue === 5 ? 1 : 0;
      const plus10 = modValue === 10 ? 1 : 0;
      const key = [
        input.tuning.mode,
        armorSet?.hash ?? 0,
        plus5,
        plus10,
        ...armorStatKeys.map((stat) => built.configuration.stats.final[stat])
      ].join(":");
      const existing = input.options.get(key);
      if (existing) {
        existing.equivalent_identity_ids.add(input.identity.identity_id);
        existing.choice.equivalent_identity_ids = [...existing.equivalent_identity_ids].sort();
        existing.choice.equivalent_identity_count = existing.equivalent_identity_ids.size;
      } else {
        const equivalentIdentityIds = new Set([input.identity.identity_id]);
        input.options.set(key, {
          choice: {
            configuration: built.configuration,
            equivalent_identity_ids: [...equivalentIdentityIds],
            equivalent_identity_count: equivalentIdentityIds.size
          },
          plus5,
          plus10,
          equivalent_identity_ids: equivalentIdentityIds,
          ...(armorSet ? { set_hash: toUnsignedHash(armorSet.hash) } : {})
        });
      }
    }
  }
}

function identityTuningAllocations(
  identity: ArmorTheoreticalIdentity
): ArmorConfigurationTuning[] {
  if (identity.tuning_mode === "plus3") return [{ mode: "plus3" }];
  return armorStatKeys.flatMap((fromStat) => armorStatKeys.flatMap((toStat) => (
    fromStat === toStat
      ? []
      : [{ mode: "shift" as const, from_stat: fromStat, to_stat: toStat }]
  )));
}

function reachabilityTuningAllocations(
  piece: ArmorReachabilityPiece
): ArmorConfigurationTuning[] {
  if (piece.tuning.mode === "plus3") return [{ mode: "plus3" }];
  const fromStats = uniqueStats(piece.tuning.allowed_from_stats ?? armorStatKeys);
  const toStats = uniqueStats(
    piece.tuning.fixed_to_stat
      ? [piece.tuning.fixed_to_stat]
      : piece.tuning.allowed_to_stats ?? armorStatKeys
  );
  return fromStats.flatMap((fromStat) => toStats.flatMap((toStat) => (
    fromStat === toStat
      ? []
      : [{
          mode: "shift" as const,
          from_stat: fromStat,
          to_stat: toStat,
          ...(piece.tuning.mode === "shift" && piece.tuning.fixed_to_stat
            ? { rolled_to_stat: piece.tuning.fixed_to_stat }
            : {})
        }]
  )));
}

function buildRemainingBounds(
  optionsBySlot: ReadonlyMap<ArmorSlot, readonly TheoreticalPieceOption[]>
): RemainingStatBounds[] {
  const bounds = Array.from({ length: armorSlots.length + 1 }, emptyBounds);
  for (let index = armorSlots.length - 1; index >= 0; index -= 1) {
    const options = optionsBySlot.get(armorSlots[index]!) ?? [];
    for (const stat of armorStatKeys) {
      const values = options.map((option) => option.choice.configuration.stats.final[stat]);
      bounds[index]![stat] = {
        minimum: Math.min(...values) + bounds[index + 1]![stat].minimum,
        maximum: Math.max(...values) + bounds[index + 1]![stat].maximum
      };
    }
  }
  return bounds;
}

function buildRemainingSetCapacities(
  optionsBySlot: ReadonlyMap<ArmorSlot, readonly TheoreticalPieceOption[]>,
  constraint: NormalizedArmorSetConstraint
): RemainingSetCapacity[] {
  const capacities = Array.from(
    { length: armorSlots.length + 1 },
    () => constraint.requirements.map(() => 0)
  );
  for (let index = armorSlots.length - 1; index >= 0; index -= 1) {
    const options = optionsBySlot.get(armorSlots[index]!) ?? [];
    capacities[index] = constraint.requirements.map((requirement, requirementIndex) => (
      (requirement.eligible_slots.includes(armorSlots[index]!)
        && options.some((option) => option.set_hash === requirement.set_hash) ? 1 : 0)
      + capacities[index + 1]![requirementIndex]!
    ));
  }
  return capacities;
}

function retainBestStates(
  states: ReadonlyMap<string, TheoreticalSearchState>,
  limit: number,
  remaining: RemainingStatBounds,
  remainingSetCapacity: RemainingSetCapacity,
  target: NormalizedArmorTarget,
  fragments: ArmorStatValues,
  priorityStats: readonly ArmorStatKey[],
  ruleset: ArmorRuleset,
  setConstraint: NormalizedArmorSetConstraint
): Map<string, TheoreticalSearchState> {
  const ranked = [...states.entries()].sort((left, right) => (
    comparePartialStates(
      left[1],
      right[1],
      remaining,
      remainingSetCapacity,
      target,
      fragments,
      priorityStats,
      ruleset,
      setConstraint
    )
  ));
  return new Map(ranked.slice(0, limit));
}

function comparePartialStates(
  left: TheoreticalSearchState,
  right: TheoreticalSearchState,
  remaining: RemainingStatBounds,
  remainingSetCapacity: RemainingSetCapacity,
  target: NormalizedArmorTarget,
  fragments: ArmorStatValues,
  priorityStats: readonly ArmorStatKey[],
  ruleset: ArmorRuleset,
  setConstraint: NormalizedArmorSetConstraint
): number {
  const leftScore = partialScore(
    left,
    remaining,
    remainingSetCapacity,
    target,
    fragments,
    priorityStats,
    ruleset,
    setConstraint
  );
  const rightScore = partialScore(
    right,
    remaining,
    remainingSetCapacity,
    target,
    fragments,
    priorityStats,
    ruleset,
    setConstraint
  );
  return compareNumberArrays(leftScore, rightScore)
    || compareChoiceIds(left.choices, right.choices);
}

function partialScore(
  state: TheoreticalSearchState,
  remaining: RemainingStatBounds,
  remainingSetCapacity: RemainingSetCapacity,
  target: NormalizedArmorTarget,
  fragments: ArmorStatValues,
  priorityStats: readonly ArmorStatKey[],
  ruleset: ArmorRuleset,
  setConstraint: NormalizedArmorSetConstraint
): number[] {
  const gaps: number[] = [];
  for (const stat of armorStatKeys) {
    const constraint = target[stat];
    if (!constraint) continue;
    const minimum = effectiveValue(
      state.totals[stat] + remaining[stat].minimum,
      fragments[stat],
      ruleset
    );
    const maximum = effectiveValue(
      state.totals[stat] + remaining[stat].maximum,
      fragments[stat],
      ruleset
    );
    gaps.push(rangeGap(minimum, maximum, constraint.minimum, constraint.maximum));
  }
  const priorityPotential = priorityStats.map((stat) => -effectiveValue(
    state.totals[stat] + remaining[stat].maximum,
    fragments[stat],
    ruleset
  ));
  const impossibleSetGaps = setConstraint.requirements.map((requirement, index) => Math.max(
    requirement.minimum_piece_count
      - (state.set_counts[index]! + remainingSetCapacity[index]!),
    0
  ));
  const currentSetGaps = setConstraint.requirements.map((requirement, index) => Math.max(
    requirement.minimum_piece_count - state.set_counts[index]!,
    0
  ));
  return [
    impossibleSetGaps.reduce((total, gap) => total + gap, 0),
    Math.max(0, ...impossibleSetGaps),
    gaps.reduce((total, gap) => total + gap, 0),
    Math.max(0, ...gaps),
    currentSetGaps.reduce((total, gap) => total + gap, 0),
    ...priorityPotential,
    state.plus5 + state.plus10,
    state.plus5 * 5 + state.plus10 * 10,
    state.plus10
  ];
}

function buildCandidate(
  state: TheoreticalSearchState,
  target: NormalizedArmorTarget,
  fragments: ArmorStatValues,
  ruleset: ArmorRuleset,
  setConstraint: NormalizedArmorSetConstraint
): ArmorTheoreticalCandidate {
  const finalTotal = effectiveTotals(state.totals, fragments, ruleset);
  const shortfalls: Partial<Record<ArmorStatKey, number>> = {};
  const overflows: Partial<Record<ArmorStatKey, number>> = {};
  const gaps: number[] = [];
  for (const stat of armorStatKeys) {
    const constraint = target[stat];
    if (!constraint) continue;
    const shortfall = Math.max(constraint.minimum - finalTotal[stat], 0);
    const overflow = Math.max(finalTotal[stat] - constraint.maximum, 0);
    if (shortfall) shortfalls[stat] = shortfall;
    if (overflow) overflows[stat] = overflow;
    gaps.push(shortfall + overflow);
  }
  const tuningModeCounts = { shift: 0, plus3: 0 };
  for (const choice of state.choices) tuningModeCounts[choice.configuration.tuning.mode] += 1;
  const totalGap = gaps.reduce((total, gap) => total + gap, 0);
  const setCoverage = buildArmorSetCoverage(setConstraint, state.set_counts);
  return {
    candidate_id: state.choices.map((choice) => choice.configuration.configuration_id).join("|"),
    hard_constraints_met: totalGap === 0 && setCoverage.satisfied,
    pieces: state.choices,
    armor_total: cloneArmorStatValues(state.totals),
    fragment_adjustments: cloneArmorStatValues(fragments),
    final_total: finalTotal,
    target_shortfalls: shortfalls,
    target_overflows: overflows,
    total_gap: totalGap,
    maximum_gap: Math.max(0, ...gaps),
    stat_waste: armorStatKeys.reduce((total, stat) => total + (finalTotal[stat] % 10), 0),
    armor_mod_usage: { plus5: state.plus5, plus10: state.plus10 },
    tuning_mode_counts: tuningModeCounts,
    armor_set_coverage: setCoverage
  };
}

function compareCandidates(
  left: ArmorTheoreticalCandidate,
  right: ArmorTheoreticalCandidate,
  priorityStats: readonly ArmorStatKey[]
): number {
  const leftScore = [
    left.hard_constraints_met ? 0 : 1,
    left.armor_set_coverage.total_missing_piece_count,
    left.total_gap,
    left.maximum_gap,
    ...priorityStats.map((stat) => -left.final_total[stat]),
    left.stat_waste,
    left.armor_mod_usage.plus5 + left.armor_mod_usage.plus10,
    left.armor_mod_usage.plus5 * 5 + left.armor_mod_usage.plus10 * 10,
    left.armor_mod_usage.plus10
  ];
  const rightScore = [
    right.hard_constraints_met ? 0 : 1,
    right.armor_set_coverage.total_missing_piece_count,
    right.total_gap,
    right.maximum_gap,
    ...priorityStats.map((stat) => -right.final_total[stat]),
    right.stat_waste,
    right.armor_mod_usage.plus5 + right.armor_mod_usage.plus10,
    right.armor_mod_usage.plus5 * 5 + right.armor_mod_usage.plus10 * 10,
    right.armor_mod_usage.plus10
  ];
  return compareNumberArrays(leftScore, rightScore)
    || left.candidate_id.localeCompare(right.candidate_id);
}

function effectiveTotals(
  totals: ArmorStatValues,
  fragments: ArmorStatValues,
  ruleset: ArmorRuleset
): ArmorStatValues {
  return Object.fromEntries(armorStatKeys.map((stat) => [
    stat,
    effectiveValue(totals[stat], fragments[stat], ruleset)
  ])) as ArmorStatValues;
}

function effectiveValue(
  armorValue: number,
  fragmentValue: number,
  ruleset: ArmorRuleset
): number {
  return Math.min(
    ruleset.stat_limits.maximum,
    Math.max(ruleset.stat_limits.minimum, armorValue + fragmentValue)
  );
}

function normalizeModBudget(
  budget: Partial<ArmorReachabilityModBudget> | undefined
): Required<ArmorReachabilityModBudget> {
  return {
    plus5: normalizeNonNegativeInteger(budget?.plus5),
    plus10: normalizeNonNegativeInteger(budget?.plus10),
    usage: budget?.usage === "exact" ? "exact" : "at-most"
  };
}

function validateBudgetInput(
  budget: Partial<ArmorReachabilityModBudget> | undefined
): ArmorReachabilityIssue[] {
  return (["plus5", "plus10"] as const).flatMap((field) => {
    const value = budget?.[field];
    return value !== undefined && (!Number.isInteger(value) || value < 0)
      ? [{ code: "invalid_armor_mod_budget", message: `${field} 护甲模组预算必须是非负整数。` }]
      : [];
  });
}

function normalizeAllowedMods(
  values: readonly (0 | 5 | 10)[] | undefined
): Array<0 | 5 | 10> {
  const normalized: readonly (0 | 5 | 10)[] = values ?? [0, 5, 10];
  return [...new Set(normalized)].sort((left, right) => left - right);
}

function normalizePriorityStats(values: readonly ArmorStatKey[] | undefined): ArmorStatKey[] {
  return uniqueStats(values ?? []);
}

function normalizeLimit(value: number | undefined, fallback: number, maximum: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(maximum, Math.max(1, Math.trunc(value!)));
}

function normalizeNonNegativeInteger(value: number | undefined): number {
  return Number.isFinite(value) ? Math.max(0, Math.trunc(value!)) : 0;
}

function budgetMatches(
  state: Pick<TheoreticalSearchState, "plus5" | "plus10">,
  budget: Required<ArmorReachabilityModBudget>
): boolean {
  return budget.usage === "at-most"
    || (state.plus5 === budget.plus5 && state.plus10 === budget.plus10);
}

function searchStateKey(
  totals: ArmorStatValues,
  plus5: number,
  plus10: number,
  setCounts: readonly number[]
): string {
  return [plus5, plus10, ...setCounts, ...armorStatKeys.map((stat) => totals[stat])].join(":");
}

function incrementSetCounts(
  counts: readonly number[],
  setHash: number | undefined,
  slot: ArmorSlot,
  constraint: NormalizedArmorSetConstraint
): number[] {
  if (setHash === undefined) return [...counts];
  return constraint.requirements.map((requirement, index) => (
    (counts[index] ?? 0) + (
      requirement.set_hash === setHash && requirement.eligible_slots.includes(slot) ? 1 : 0
    )
  ));
}

function comparePieceOptions(left: TheoreticalPieceOption, right: TheoreticalPieceOption): number {
  return left.choice.configuration.configuration_id.localeCompare(
    right.choice.configuration.configuration_id
  );
}

function compareChoiceIds(
  left: readonly ArmorTheoreticalPieceChoice[],
  right: readonly ArmorTheoreticalPieceChoice[]
): number {
  return left
    .map((choice) => choice.configuration.configuration_id)
    .join("|")
    .localeCompare(right.map((choice) => choice.configuration.configuration_id).join("|"));
}

function compareNumberArrays(left: readonly number[], right: readonly number[]): number {
  for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
    const delta = (left[index] ?? 0) - (right[index] ?? 0);
    if (delta) return delta;
  }
  return 0;
}

function rangeGap(
  actualMinimum: number,
  actualMaximum: number,
  targetMinimum: number,
  targetMaximum: number
): number {
  if (actualMaximum < targetMinimum) return targetMinimum - actualMaximum;
  if (actualMinimum > targetMaximum) return actualMinimum - targetMaximum;
  return 0;
}

function theoreticalConfigurationId(
  slot: ArmorSlot,
  identityId: string,
  tuning: ArmorConfigurationTuning,
  armorStatMod: ArmorConfigurationInput["armor_stat_mod"],
  setHash?: number
): string {
  const tuningId = tuning.mode === "plus3"
    ? "plus3"
    : `shift-${tuning.from_stat}-${tuning.to_stat}`;
  const modId = armorStatMod ? `mod-${armorStatMod.stat}-${armorStatMod.value}` : "mod-none";
  const setId = setHash === undefined ? "set-none" : `set-${toUnsignedHash(setHash)}`;
  return `${slot}:${identityId}:${tuningId}:${modId}:${setId}`;
}

function emptyBounds(): RemainingStatBounds {
  return Object.fromEntries(armorStatKeys.map((stat) => [
    stat,
    { minimum: 0, maximum: 0 }
  ])) as RemainingStatBounds;
}

function uniqueStats(values: readonly ArmorStatKey[]): ArmorStatKey[] {
  return [...new Set(values.filter((value) => armorStatKeys.includes(value)))];
}

function classesCompatible(target: ArmorClass, piece: ArmorClass): boolean {
  return target === "any" || piece === "any" || target === piece;
}

function toUnsignedHash(value: number): number {
  return Number.isFinite(value) ? value >>> 0 : 0;
}

function emptyPlanResult(
  ruleset: ArmorRuleset,
  target: NormalizedArmorTarget,
  fragments: ArmorStatValues,
  budget: Required<ArmorReachabilityModBudget>,
  setConstraint: NormalizedArmorSetConstraint,
  issues: ArmorReachabilityIssue[]
): ArmorTheoreticalPlanResult {
  return {
    status: "invalid",
    ruleset_id: ruleset.ruleset_id,
    ruleset_version: ruleset.version,
    target,
    fragment_adjustments: fragments,
    armor_mod_budget: budget,
    armor_set_constraint: setConstraint,
    candidates: [],
    search: {
      stat_outcomes_complete: true,
      truncated: false,
      states_examined: 0,
      states_retained: 0,
      piece_option_counts: {
        helmet: 0,
        arms: 0,
        chest: 0,
        legs: 0,
        class: 0
      }
    },
    issues,
    warnings: []
  };
}
