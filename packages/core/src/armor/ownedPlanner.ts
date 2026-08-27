import type { ArmorSetCatalogEntry } from "../items/equipableItemSet.js";
import type { ArmorStatKey } from "../loadouts/analysis.js";
import {
  addArmorStatValues,
  armorSlots,
  armorStatKeys,
  cloneArmorStatValues,
  createEmptyArmorStatValues,
  subtractArmorStatValues,
  type ArmorClass,
  type ArmorLocation,
  type ArmorPlannedPlugSnapshot,
  type ArmorPieceSnapshot,
  type ArmorSlot,
  type ArmorStatValues
} from "./model.js";
import {
  normalizeArmorTarget,
  type ArmorReachabilityIssue,
  type ArmorReachabilityModBudget,
  type ArmorReachabilityStatConstraint,
  type NormalizedArmorTarget
} from "./reachability.js";
import { validateArmorRuleset, type ArmorRuleset } from "./ruleset.js";
import {
  buildArmorSetCoverage,
  normalizeArmorSetConstraint,
  type ArmorSetConstraint,
  type ArmorSetCoverage,
  type NormalizedArmorSetConstraint
} from "./sets.js";

export type ArmorOwnedPlanningMode = "strict" | "conservative";

export type ArmorOwnedPlanRequest = {
  ruleset: ArmorRuleset;
  class: ArmorClass;
  pieces: readonly ArmorPieceSnapshot[];
  target: Partial<Record<ArmorStatKey, ArmorReachabilityStatConstraint>>;
  fragment_adjustments?: Partial<Record<ArmorStatKey, number>>;
  armor_mod_budget?: Partial<ArmorReachabilityModBudget>;
  allowed_armor_mod_values?: readonly (0 | 5 | 10)[];
  allowed_locations?: readonly ArmorLocation[];
  locked_instance_ids?: readonly string[];
  excluded_instance_ids?: readonly string[];
  preferred_instance_ids?: readonly string[];
  target_character_id?: string;
  armor_set_catalog?: readonly ArmorSetCatalogEntry[];
  set_constraint?: ArmorSetConstraint;
  priority_stats?: readonly ArmorStatKey[];
  reserved_energy_by_slot?: Partial<Record<ArmorSlot, number>>;
  planned_non_stat_plug_hashes_by_slot?: Partial<Record<ArmorSlot, readonly number[]>>;
  mode?: ArmorOwnedPlanningMode;
  limit?: number;
  state_limit?: number;
};

export type ArmorOwnedPieceChoice = {
  instance_id: string;
  item_hash: number;
  name: string;
  slot: ArmorSlot;
  class: ArmorClass;
  location: ArmorLocation;
  source_character_id?: string;
  exotic: boolean;
  exotic_class_item: boolean;
  set?: { hash: number; name: string };
  observed_final: ArmorStatValues;
  planning_base: ArmorStatValues;
  applied_tuning?: {
    mode: "shift" | "plus3";
    from_stat?: ArmorStatKey;
    to_stat?: ArmorStatKey;
    source_plug_hash: number;
    values: ArmorStatValues;
  };
  applied_armor_stat_mod?: {
    stat: ArmorStatKey;
    value: 5 | 10;
    source_plug_hash: number;
    socket_index: number;
    energy_cost: number;
  };
  armor_stat_mod_socket_plug_hash?: number;
  planned_non_stat_plug_hashes: number[];
  energy: {
    capacity: number;
    reserved: number;
    armor_stat_mod: number;
    final: number;
    remaining: number;
  };
  final: ArmorStatValues;
};

export type ArmorOwnedCandidate = {
  candidate_id: string;
  hard_constraints_met: boolean;
  pieces: ArmorOwnedPieceChoice[];
  armor_total: ArmorStatValues;
  fragment_adjustments: ArmorStatValues;
  final_total: ArmorStatValues;
  target_shortfalls: Partial<Record<ArmorStatKey, number>>;
  target_overflows: Partial<Record<ArmorStatKey, number>>;
  total_gap: number;
  maximum_gap: number;
  stat_waste: number;
  armor_mod_usage: { plus5: number; plus10: number };
  armor_set_coverage: ArmorSetCoverage;
  equipped_count: number;
  transfer_count: number;
  replacement_count: number;
};

export type ArmorOwnedPlanResult = {
  status: "reachable" | "unreachable" | "indeterminate" | "invalid";
  mode: ArmorOwnedPlanningMode;
  ruleset_id: ArmorRuleset["ruleset_id"];
  ruleset_version: number;
  target: NormalizedArmorTarget;
  fragment_adjustments: ArmorStatValues;
  armor_mod_budget: Required<ArmorReachabilityModBudget>;
  armor_set_constraint: NormalizedArmorSetConstraint;
  candidates: ArmorOwnedCandidate[];
  nearest_feasible_values?: ArmorStatValues;
  data_quality: {
    input_piece_count: number;
    eligible_piece_count: number;
    excluded_not_owned_ready: number;
    excluded_not_strict_ready: number;
    excluded_by_class: number;
    excluded_by_location: number;
    excluded_by_request: number;
  };
  search: {
    truncated: boolean;
    states_examined: number;
    states_retained: number;
    piece_option_counts: Record<ArmorSlot, number>;
  };
  issues: ArmorReachabilityIssue[];
  warnings: string[];
};

type OwnedPieceOption = {
  choice: ArmorOwnedPieceChoice;
  plus5: number;
  plus10: number;
  set_hash?: number;
};

type OwnedSearchState = {
  totals: ArmorStatValues;
  plus5: number;
  plus10: number;
  set_counts: number[];
  exotic_count: number;
  equipped_count: number;
  transfer_count: number;
  replacement_count: number;
  choices: ArmorOwnedPieceChoice[];
};

type RemainingStatBounds = Record<ArmorStatKey, { minimum: number; maximum: number }>;
type DataQualitySummary = ArmorOwnedPlanResult["data_quality"];

export function planOwnedArmor(request: ArmorOwnedPlanRequest): ArmorOwnedPlanResult {
  const mode = request.mode === "conservative" ? "conservative" : "strict";
  const targetResult = normalizeArmorTarget(request.target, request.ruleset);
  const fragments = cloneArmorStatValues(request.fragment_adjustments);
  const budget = normalizeModBudget(request.armor_mod_budget);
  const priorityStats = uniqueStats(request.priority_stats ?? []);
  const setResult = normalizeArmorSetConstraint({
    constraint: request.set_constraint,
    catalog: request.armor_set_catalog,
    ruleset: request.ruleset,
    class: request.class
  });
  const issues: ArmorReachabilityIssue[] = [
    ...targetResult.issues,
    ...setResult.issues,
    ...validateRequest(request, budget)
  ];
  const quality = summarizeDataQuality(request, mode);
  if (issues.length) {
    return emptyResult(
      "invalid",
      request,
      mode,
      targetResult.target,
      fragments,
      budget,
      setResult.constraint,
      quality,
      issues,
      []
    );
  }

  const eligiblePieces = filterEligiblePieces(request, mode);
  const lockedBySlot = resolveLockedPieces(request, eligiblePieces, issues);
  if (issues.length) {
    return emptyResult(
      "invalid",
      request,
      mode,
      targetResult.target,
      fragments,
      budget,
      setResult.constraint,
      quality,
      issues,
      []
    );
  }

  const optionsBySlot = new Map<ArmorSlot, OwnedPieceOption[]>();
  for (const slot of armorSlots) {
    const locked = lockedBySlot.get(slot);
    const slotPieces = eligiblePieces.filter((piece) => (
      piece.slot === slot && (!locked || piece.instance_id === locked.instance_id)
    ));
    const options = slotPieces.flatMap((piece) => buildPieceOptions(request, mode, piece, budget));
    optionsBySlot.set(slot, options.sort(comparePieceOptions));
    if (!options.length) {
      issues.push({
        code: "missing_owned_armor_slot",
        message: `${slot} 没有满足职业、位置、数据完整度和锁定条件的真实护甲实例。`
      });
    }
  }
  if (issues.length) {
    return emptyResult(
      "unreachable",
      request,
      mode,
      targetResult.target,
      fragments,
      budget,
      setResult.constraint,
      quality,
      issues,
      planningWarnings(mode, quality, false, false)
    );
  }

  const limit = normalizeLimit(request.limit, 5, 20);
  const stateLimit = normalizeLimit(request.state_limit, 2000, 100_000);
  const remainingBounds = buildRemainingBounds(optionsBySlot);
  const remainingSetCapacities = buildRemainingSetCapacities(optionsBySlot, setResult.constraint);
  const emptySetCounts = setResult.constraint.requirements.map(() => 0);
  const preferredInstanceIds = new Set(normalizeIds(request.preferred_instance_ids));
  let states = new Map<string, OwnedSearchState>([[
    stateKey(createEmptyArmorStatValues(), 0, 0, emptySetCounts, 0),
    {
      totals: createEmptyArmorStatValues(),
      plus5: 0,
      plus10: 0,
      set_counts: emptySetCounts,
      exotic_count: 0,
      equipped_count: 0,
      transfer_count: 0,
      replacement_count: 0,
      choices: []
    }
  ]]);
  let statesExamined = 0;
  let truncated = false;

  for (let slotIndex = 0; slotIndex < armorSlots.length; slotIndex += 1) {
    const slot = armorSlots[slotIndex]!;
    const options = optionsBySlot.get(slot) ?? [];
    let next = new Map<string, OwnedSearchState>();
    for (const state of states.values()) {
      for (const option of options) {
        statesExamined += 1;
        const plus5 = state.plus5 + option.plus5;
        const plus10 = state.plus10 + option.plus10;
        const exoticCount = state.exotic_count + (option.choice.exotic ? 1 : 0);
        if (plus5 > budget.plus5 || plus10 > budget.plus10 || exoticCount > 1) continue;
        const remainingPieces = armorSlots.length - slotIndex - 1;
        if (budget.usage === "exact"
          && ((budget.plus5 - plus5) + (budget.plus10 - plus10) > remainingPieces)) continue;

        const totals = addArmorStatValues(state.totals, option.choice.final);
        const setCounts = incrementSetCounts(
          state.set_counts,
          option.set_hash,
          slot,
          setResult.constraint
        );
        const nextState: OwnedSearchState = {
          totals,
          plus5,
          plus10,
          set_counts: setCounts,
          exotic_count: exoticCount,
          equipped_count: state.equipped_count + equippedValue(option.choice, request.target_character_id),
          transfer_count: state.transfer_count + transferValue(option.choice, request.target_character_id),
          replacement_count: state.replacement_count
            + replacementValue(option.choice, preferredInstanceIds),
          choices: [...state.choices, option.choice]
        };
        const key = stateKey(totals, plus5, plus10, setCounts, exoticCount);
        const existing = next.get(key);
        if (!existing || compareLogistics(nextState, existing) < 0) next.set(key, nextState);
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
  const status = reachable ? "reachable" : truncated ? "indeterminate" : "unreachable";
  const warnings = planningWarnings(mode, quality, truncated, reachable);
  if (!reachable && !truncated) {
    warnings.push("已完整搜索当前允许的真实护甲实例，未找到同时满足属性、套装和模组限制的组合。");
  }

  return {
    status,
    mode,
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
    data_quality: quality,
    search: {
      truncated,
      states_examined: statesExamined,
      states_retained: states.size,
      piece_option_counts: Object.fromEntries(armorSlots.map((slot) => [
        slot,
        optionsBySlot.get(slot)?.length ?? 0
      ])) as Record<ArmorSlot, number>
    },
    issues: status === "unreachable"
      ? [{ code: "owned_armor_target_unreachable", message: "当前真实库存与限制下没有达标护甲组合。" }]
      : [],
    warnings
  };
}

function validateRequest(
  request: ArmorOwnedPlanRequest,
  budget: Required<ArmorReachabilityModBudget>
): ArmorReachabilityIssue[] {
  const issues: ArmorReachabilityIssue[] = validateArmorRuleset(request.ruleset).map((message) => ({
    code: "invalid_armor_ruleset",
    message
  }));
  if (request.class === "any" || request.class === "unknown") {
    issues.push({ code: "owned_armor_requires_concrete_class", message: "真实库存规划必须指定具体职业。" });
  }
  if (budget.usage === "exact" && budget.plus5 + budget.plus10 > armorSlots.length) {
    issues.push({ code: "armor_mod_budget_exceeds_slots", message: "精确模组数量不能超过五件护甲。" });
  }
  issues.push(...validateBudgetInput(request.armor_mod_budget));
  const locked = new Set(normalizeIds(request.locked_instance_ids));
  for (const instanceId of normalizeIds(request.excluded_instance_ids)) {
    if (locked.has(instanceId)) {
      issues.push({
        code: "locked_owned_piece_excluded",
        message: `护甲实例 ${instanceId} 不能同时锁定和排除。`,
        piece_id: instanceId
      });
    }
  }
  return issues;
}

function summarizeDataQuality(
  request: ArmorOwnedPlanRequest,
  mode: ArmorOwnedPlanningMode
): DataQualitySummary {
  const allowedLocations = new Set(request.allowed_locations?.length
    ? request.allowed_locations
    : ["equipped", "inventory", "vault", "postmaster"] as const);
  const excludedIds = new Set(normalizeIds(request.excluded_instance_ids));
  const result: DataQualitySummary = {
    input_piece_count: request.pieces.length,
    eligible_piece_count: 0,
    excluded_not_owned_ready: 0,
    excluded_not_strict_ready: 0,
    excluded_by_class: 0,
    excluded_by_location: 0,
    excluded_by_request: 0
  };
  for (const piece of request.pieces) {
    if (!classMatches(request.class, piece.class)) {
      result.excluded_by_class += 1;
    } else if (!allowedLocations.has(piece.location)) {
      result.excluded_by_location += 1;
    } else if (piece.instance_id && excludedIds.has(piece.instance_id)) {
      result.excluded_by_request += 1;
    } else if (!piece.quality.owned_ready) {
      result.excluded_not_owned_ready += 1;
    } else if (mode === "strict" && !piece.quality.strict_replay_ready) {
      result.excluded_not_strict_ready += 1;
    } else {
      result.eligible_piece_count += 1;
    }
  }
  return result;
}

function filterEligiblePieces(
  request: ArmorOwnedPlanRequest,
  mode: ArmorOwnedPlanningMode
): ArmorPieceSnapshot[] {
  const allowedLocations = new Set(request.allowed_locations?.length
    ? request.allowed_locations
    : ["equipped", "inventory", "vault", "postmaster"] as const);
  const excludedIds = new Set(normalizeIds(request.excluded_instance_ids));
  return request.pieces.filter((piece) => (
    Boolean(piece.instance_id && piece.slot)
    && classMatches(request.class, piece.class)
    && allowedLocations.has(piece.location)
    && !excludedIds.has(piece.instance_id!)
    && piece.quality.owned_ready
    && (mode === "conservative" || piece.quality.strict_replay_ready)
  ));
}

function resolveLockedPieces(
  request: ArmorOwnedPlanRequest,
  pieces: readonly ArmorPieceSnapshot[],
  issues: ArmorReachabilityIssue[]
): Map<ArmorSlot, ArmorPieceSnapshot> {
  const lockedBySlot = new Map<ArmorSlot, ArmorPieceSnapshot>();
  for (const instanceId of normalizeIds(request.locked_instance_ids)) {
    const piece = pieces.find((candidate) => candidate.instance_id === instanceId);
    if (!piece?.slot) {
      issues.push({
        code: "locked_owned_piece_unavailable",
        message: `锁定的护甲实例 ${instanceId} 不满足当前职业、位置或数据完整度限制。`,
        piece_id: instanceId
      });
      continue;
    }
    if (lockedBySlot.has(piece.slot)) {
      issues.push({
        code: "multiple_locked_owned_pieces_in_slot",
        message: `${piece.slot} 存在多个锁定实例，无法同时装备。`,
        piece_id: instanceId
      });
      continue;
    }
    lockedBySlot.set(piece.slot, piece);
  }
  if ([...lockedBySlot.values()].filter((piece) => piece.exotic).length > 1) {
    issues.push({ code: "multiple_locked_exotic_armor", message: "锁定实例中最多只能包含一件异域护甲。" });
  }
  return lockedBySlot;
}

function buildPieceOptions(
  request: ArmorOwnedPlanRequest,
  mode: ArmorOwnedPlanningMode,
  piece: ArmorPieceSnapshot,
  budget: Required<ArmorReachabilityModBudget>
): OwnedPieceOption[] {
  if (!piece.instance_id || !piece.slot) return [];
  const observedFinal = cloneArmorStatValues(piece.stats.final);
  const existingArmorMod = createEmptyArmorStatValues();
  if (mode === "strict" && piece.armor_stat_mod) {
    existingArmorMod[piece.armor_stat_mod.stat] = piece.armor_stat_mod.value;
  }
  const existingTuning = mode === "strict"
    ? piece.modifiers.find((modifier) => (
        modifier.plug_hash === piece.tuning?.source_plug_hash
        && (modifier.kind === "tuning_shift" || modifier.kind === "tuning_plus3")
      ))?.values
    : undefined;
  const autoTune = mode === "strict"
    && piece.installation.gear_tier === request.ruleset.masterwork.maximum_tier
    && piece.installation.tuning_options.length > 0;
  const planningBase = mode === "strict"
    ? subtractArmorStatValues(
        subtractArmorStatValues(observedFinal, existingArmorMod),
        autoTune && existingTuning ? existingTuning : createEmptyArmorStatValues()
      )
    : observedFinal;
  const modValues = mode === "strict" ? normalizeAllowedMods(request.allowed_armor_mod_values) : [0] as const;
  const tuningOptions = autoTune ? piece.installation.tuning_options : [undefined];
  const energyCapacity = piece.installation.energy_capacity ?? 0;
  const requestedNonStatPlugHashes = request.planned_non_stat_plug_hashes_by_slot?.[piece.slot];
  const plannedNonStatPlugs = resolvePlannedNonStatPlugs(piece, requestedNonStatPlugHashes);
  if (!plannedNonStatPlugs) return [];
  const reservedEnergy = requestedNonStatPlugHashes === undefined
    ? piece.installation.reserved_energy ?? energyCapacity
    : plannedNonStatPlugs.reduce((total, plug) => total + plug.energy_cost, 0);
  const remainingEnergy = Math.max(0, energyCapacity - reservedEnergy);
  const options: OwnedPieceOption[] = [];
  for (const tuningOption of tuningOptions) {
    const tunedBase = tuningOption
      ? addArmorStatValues(planningBase, tuningOption.values)
      : planningBase;
    for (const modValue of modValues) {
      if (modValue === 5 && budget.plus5 === 0) continue;
      if (modValue === 10 && budget.plus10 === 0) continue;
      const modStats = modValue === 0 ? [undefined] : armorStatKeys;
      for (const modStat of modStats) {
        const clearOption = mode === "strict" && modValue === 0
          ? piece.installation.armor_stat_mod_clear_options[0]
          : undefined;
        if (mode === "strict" && modValue === 0 && !clearOption) continue;
        const installationOption = modStat && modValue !== 0
          ? piece.installation.armor_stat_mod_options
              .filter((candidate) => (
                candidate.stat === modStat
                && candidate.value === modValue
                && candidate.energy_cost <= remainingEnergy
              ))
              .sort((left, right) => (
                left.energy_cost - right.energy_cost
                || left.source_plug_hash - right.source_plug_hash
              ))[0]
          : undefined;
        if (modStat && !installationOption) continue;
        const appliedMod = installationOption
          ? {
              stat: installationOption.stat,
              value: installationOption.value,
              source_plug_hash: installationOption.source_plug_hash,
              socket_index: installationOption.socket_index,
              energy_cost: installationOption.energy_cost
            }
          : undefined;
        const modBlock = createEmptyArmorStatValues();
        if (appliedMod) modBlock[appliedMod.stat] = appliedMod.value;
        const final = addArmorStatValues(tunedBase, modBlock);
        const armorStatModEnergy = appliedMod?.energy_cost ?? clearOption?.energy_cost ?? 0;
        const finalEnergy = reservedEnergy + armorStatModEnergy;
        const choice: ArmorOwnedPieceChoice = {
          instance_id: piece.instance_id,
          item_hash: piece.item_hash,
          name: piece.name,
          slot: piece.slot,
          class: piece.class,
          location: piece.location,
          source_character_id: piece.source_character_id,
          exotic: piece.exotic,
          exotic_class_item: piece.exotic_class_item,
          set: piece.set ? { ...piece.set } : undefined,
          observed_final: observedFinal,
          planning_base: cloneArmorStatValues(planningBase),
          ...(tuningOption ? {
            applied_tuning: {
              mode: tuningOption.tuning.mode,
              ...(tuningOption.tuning.mode === "shift"
                ? {
                    from_stat: tuningOption.tuning.from_stat,
                    to_stat: tuningOption.tuning.to_stat
                  }
                : {}),
              source_plug_hash: tuningOption.tuning.source_plug_hash,
              values: cloneArmorStatValues(tuningOption.values)
            }
          } : {}),
          applied_armor_stat_mod: appliedMod,
          ...((appliedMod?.source_plug_hash ?? clearOption?.plug_hash) !== undefined
            ? { armor_stat_mod_socket_plug_hash: appliedMod?.source_plug_hash ?? clearOption?.plug_hash }
            : {}),
          planned_non_stat_plug_hashes: plannedNonStatPlugs.map((plug) => plug.plug_hash),
          energy: {
            capacity: energyCapacity,
            reserved: reservedEnergy,
            armor_stat_mod: armorStatModEnergy,
            final: finalEnergy,
            remaining: Math.max(0, energyCapacity - finalEnergy)
          },
          final
        };
        options.push({
          choice,
          plus5: modValue === 5 ? 1 : 0,
          plus10: modValue === 10 ? 1 : 0,
          ...(piece.set ? { set_hash: toUnsignedHash(piece.set.hash) } : {})
        });
      }
    }
  }
  return options;
}

function resolvePlannedNonStatPlugs(
  piece: ArmorPieceSnapshot,
  requestedPlugHashes: readonly number[] | undefined
): ArmorPlannedPlugSnapshot[] | undefined {
  if (requestedPlugHashes === undefined) {
    return piece.installation.planned_non_stat_plugs.map((plug) => ({ ...plug }));
  }
  const candidates = requestedPlugHashes.map((plugHash, requestIndex) => ({
    requestIndex,
    plugHash: toUnsignedHash(plugHash),
    options: piece.installation.available_non_stat_plugs.filter((plug) => (
      plug.plug_hash === toUnsignedHash(plugHash)
    ))
  }));
  if (candidates.some((candidate) => !candidate.plugHash || !candidate.options.length)) return undefined;

  const assignment = new Array<ArmorPlannedPlugSnapshot | undefined>(requestedPlugHashes.length);
  const usedSocketIndexes = new Set<number>();
  const ordered = [...candidates].sort((left, right) => (
    left.options.length - right.options.length
    || left.requestIndex - right.requestIndex
  ));

  function assign(index: number): boolean {
    if (index >= ordered.length) return true;
    const candidate = ordered[index]!;
    for (const option of candidate.options) {
      if (usedSocketIndexes.has(option.socket_index)) continue;
      usedSocketIndexes.add(option.socket_index);
      assignment[candidate.requestIndex] = option;
      if (assign(index + 1)) return true;
      assignment[candidate.requestIndex] = undefined;
      usedSocketIndexes.delete(option.socket_index);
    }
    return false;
  }

  if (!assign(0)) return undefined;
  const planned = assignment
    .filter((plug): plug is ArmorPlannedPlugSnapshot => Boolean(plug))
    .map((plug) => ({ ...plug }));
  for (const currentPlug of piece.installation.planned_non_stat_plugs) {
    if (usedSocketIndexes.has(currentPlug.socket_index)) continue;
    usedSocketIndexes.add(currentPlug.socket_index);
    planned.push({ ...currentPlug });
  }
  return planned.sort((left, right) => left.socket_index - right.socket_index || left.plug_hash - right.plug_hash);
}

function buildRemainingBounds(
  optionsBySlot: ReadonlyMap<ArmorSlot, readonly OwnedPieceOption[]>
): RemainingStatBounds[] {
  const bounds = Array.from({ length: armorSlots.length + 1 }, emptyBounds);
  for (let index = armorSlots.length - 1; index >= 0; index -= 1) {
    const options = optionsBySlot.get(armorSlots[index]!) ?? [];
    for (const stat of armorStatKeys) {
      const values = options.map((option) => option.choice.final[stat]);
      bounds[index]![stat] = {
        minimum: Math.min(...values) + bounds[index + 1]![stat].minimum,
        maximum: Math.max(...values) + bounds[index + 1]![stat].maximum
      };
    }
  }
  return bounds;
}

function buildRemainingSetCapacities(
  optionsBySlot: ReadonlyMap<ArmorSlot, readonly OwnedPieceOption[]>,
  constraint: NormalizedArmorSetConstraint
): number[][] {
  const capacities = Array.from(
    { length: armorSlots.length + 1 },
    () => constraint.requirements.map(() => 0)
  );
  for (let index = armorSlots.length - 1; index >= 0; index -= 1) {
    const slot = armorSlots[index]!;
    const options = optionsBySlot.get(slot) ?? [];
    capacities[index] = constraint.requirements.map((requirement, requirementIndex) => (
      (requirement.eligible_slots.includes(slot)
        && options.some((option) => option.set_hash === requirement.set_hash) ? 1 : 0)
      + capacities[index + 1]![requirementIndex]!
    ));
  }
  return capacities;
}

function retainBestStates(
  states: ReadonlyMap<string, OwnedSearchState>,
  limit: number,
  remaining: RemainingStatBounds,
  remainingSetCapacity: readonly number[],
  target: NormalizedArmorTarget,
  fragments: ArmorStatValues,
  priorityStats: readonly ArmorStatKey[],
  ruleset: ArmorRuleset,
  setConstraint: NormalizedArmorSetConstraint
): Map<string, OwnedSearchState> {
  return new Map([...states.entries()]
    .sort((left, right) => compareNumberArrays(
      partialScore(left[1], remaining, remainingSetCapacity, target, fragments, priorityStats, ruleset, setConstraint),
      partialScore(right[1], remaining, remainingSetCapacity, target, fragments, priorityStats, ruleset, setConstraint)
    ) || compareLogistics(left[1], right[1]))
    .slice(0, limit));
}

function partialScore(
  state: OwnedSearchState,
  remaining: RemainingStatBounds,
  remainingSetCapacity: readonly number[],
  target: NormalizedArmorTarget,
  fragments: ArmorStatValues,
  priorityStats: readonly ArmorStatKey[],
  ruleset: ArmorRuleset,
  setConstraint: NormalizedArmorSetConstraint
): number[] {
  const statGaps = armorStatKeys.flatMap((stat) => {
    const constraint = target[stat];
    if (!constraint) return [];
    const minimum = effectiveValue(state.totals[stat] + remaining[stat].minimum, fragments[stat], ruleset);
    const maximum = effectiveValue(state.totals[stat] + remaining[stat].maximum, fragments[stat], ruleset);
    return [rangeGap(minimum, maximum, constraint.minimum, constraint.maximum)];
  });
  const impossibleSetGaps = setConstraint.requirements.map((requirement, index) => Math.max(
    requirement.minimum_piece_count - (state.set_counts[index]! + remainingSetCapacity[index]!),
    0
  ));
  const currentSetGap = setConstraint.requirements.reduce((total, requirement, index) => (
    total + Math.max(requirement.minimum_piece_count - state.set_counts[index]!, 0)
  ), 0);
  return [
    impossibleSetGaps.reduce((total, gap) => total + gap, 0),
    Math.max(0, ...impossibleSetGaps),
    statGaps.reduce((total, gap) => total + gap, 0),
    Math.max(0, ...statGaps),
    currentSetGap,
    ...priorityStats.map((stat) => -effectiveValue(
      state.totals[stat] + remaining[stat].maximum,
      fragments[stat],
      ruleset
    )),
    state.replacement_count,
    state.transfer_count,
    -state.equipped_count,
    state.plus5 + state.plus10,
    state.plus5 * 5 + state.plus10 * 10,
    state.plus10
  ];
}

function buildCandidate(
  state: OwnedSearchState,
  target: NormalizedArmorTarget,
  fragments: ArmorStatValues,
  ruleset: ArmorRuleset,
  setConstraint: NormalizedArmorSetConstraint
): ArmorOwnedCandidate {
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
  const totalGap = gaps.reduce((total, gap) => total + gap, 0);
  const setCoverage = buildArmorSetCoverage(setConstraint, state.set_counts);
  return {
    candidate_id: choiceIds(state.choices),
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
    armor_set_coverage: setCoverage,
    equipped_count: state.equipped_count,
    transfer_count: state.transfer_count,
    replacement_count: state.replacement_count
  };
}

function compareCandidates(
  left: ArmorOwnedCandidate,
  right: ArmorOwnedCandidate,
  priorityStats: readonly ArmorStatKey[]
): number {
  return compareNumberArrays([
    left.hard_constraints_met ? 0 : 1,
    left.armor_set_coverage.total_missing_piece_count,
    left.total_gap,
    left.maximum_gap,
    left.replacement_count,
    ...priorityStats.map((stat) => -left.final_total[stat]),
    left.stat_waste,
    left.transfer_count,
    -left.equipped_count,
    left.armor_mod_usage.plus5 + left.armor_mod_usage.plus10,
    left.armor_mod_usage.plus5 * 5 + left.armor_mod_usage.plus10 * 10,
    left.armor_mod_usage.plus10
  ], [
    right.hard_constraints_met ? 0 : 1,
    right.armor_set_coverage.total_missing_piece_count,
    right.total_gap,
    right.maximum_gap,
    right.replacement_count,
    ...priorityStats.map((stat) => -right.final_total[stat]),
    right.stat_waste,
    right.transfer_count,
    -right.equipped_count,
    right.armor_mod_usage.plus5 + right.armor_mod_usage.plus10,
    right.armor_mod_usage.plus5 * 5 + right.armor_mod_usage.plus10 * 10,
    right.armor_mod_usage.plus10
  ]) || left.candidate_id.localeCompare(right.candidate_id);
}

function compareLogistics(left: OwnedSearchState, right: OwnedSearchState): number {
  return left.replacement_count - right.replacement_count
    || left.transfer_count - right.transfer_count
    || right.equipped_count - left.equipped_count
    || choiceIds(left.choices).localeCompare(choiceIds(right.choices));
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

function stateKey(
  totals: ArmorStatValues,
  plus5: number,
  plus10: number,
  setCounts: readonly number[],
  exoticCount: number
): string {
  return [plus5, plus10, exoticCount, ...setCounts, ...armorStatKeys.map((stat) => totals[stat])].join(":");
}

function equippedValue(choice: ArmorOwnedPieceChoice, targetCharacterId: string | undefined): number {
  return choice.location === "equipped"
    && (targetCharacterId === undefined || choice.source_character_id === targetCharacterId) ? 1 : 0;
}

function transferValue(choice: ArmorOwnedPieceChoice, targetCharacterId: string | undefined): number {
  if (targetCharacterId === undefined) return 0;
  return choice.source_character_id === targetCharacterId
    && (choice.location === "equipped" || choice.location === "inventory") ? 0 : 1;
}

function replacementValue(choice: ArmorOwnedPieceChoice, preferredInstanceIds: ReadonlySet<string>): number {
  return preferredInstanceIds.size > 0 && !preferredInstanceIds.has(choice.instance_id) ? 1 : 0;
}

function classMatches(target: ArmorClass, piece: ArmorClass): boolean {
  return piece === "any" || target === piece;
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

function effectiveValue(armorValue: number, fragmentValue: number, ruleset: ArmorRuleset): number {
  return Math.min(
    ruleset.stat_limits.maximum,
    Math.max(ruleset.stat_limits.minimum, armorValue + fragmentValue)
  );
}

function planningWarnings(
  mode: ArmorOwnedPlanningMode,
  quality: DataQualitySummary,
  truncated: boolean,
  reachable: boolean
): string[] {
  const warnings: string[] = [];
  if (mode === "conservative") {
    warnings.push("保守模式固定使用实例当前最终属性，不移除或重新分配现有护甲属性模组。");
  }
  if (quality.excluded_not_strict_ready > 0 && mode === "strict") {
    warnings.push(`已排除 ${quality.excluded_not_strict_ready} 件无法严格回放属性账本的护甲。`);
  }
  if (quality.excluded_not_owned_ready > 0) {
    warnings.push(`已排除 ${quality.excluded_not_owned_ready} 件缺少实例 ID、槽位或最终属性的护甲。`);
  }
  if (truncated) {
    warnings.push(reachable
      ? "已找到达标真实库存方案，但搜索达到状态上限，当前排序不保证是全局唯一最优。"
      : "真实库存搜索达到状态上限，当前最近候选不能证明目标不可达。"
    );
  }
  return warnings;
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

function budgetMatches(
  state: Pick<OwnedSearchState, "plus5" | "plus10">,
  budget: Required<ArmorReachabilityModBudget>
): boolean {
  return budget.usage === "at-most"
    || (state.plus5 === budget.plus5 && state.plus10 === budget.plus10);
}

function normalizeAllowedMods(values: readonly (0 | 5 | 10)[] | undefined): Array<0 | 5 | 10> {
  return [...new Set<0 | 5 | 10>(values ?? [0, 5, 10])].sort((left, right) => left - right);
}

function normalizeIds(values: readonly string[] | undefined): string[] {
  return [...new Set((values ?? []).map((value) => value.trim()).filter(Boolean))];
}

function normalizeLimit(value: number | undefined, fallback: number, maximum: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(maximum, Math.max(1, Math.trunc(value!)));
}

function normalizeNonNegativeInteger(value: number | undefined): number {
  return Number.isFinite(value) ? Math.max(0, Math.trunc(value!)) : 0;
}

function uniqueStats(values: readonly ArmorStatKey[]): ArmorStatKey[] {
  return [...new Set(values.filter((value) => armorStatKeys.includes(value)))];
}

function comparePieceOptions(left: OwnedPieceOption, right: OwnedPieceOption): number {
  return pieceChoiceId(left.choice).localeCompare(pieceChoiceId(right.choice));
}

function pieceChoiceId(choice: ArmorOwnedPieceChoice): string {
  return [
    choice.instance_id,
    choice.applied_tuning?.source_plug_hash ?? 0,
    choice.armor_stat_mod_socket_plug_hash ?? 0,
    choice.planned_non_stat_plug_hashes.join(",")
  ].join(":");
}

function choiceIds(choices: readonly ArmorOwnedPieceChoice[]): string {
  return choices.map(pieceChoiceId).join("|");
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

function emptyBounds(): RemainingStatBounds {
  return Object.fromEntries(armorStatKeys.map((stat) => [
    stat,
    { minimum: 0, maximum: 0 }
  ])) as RemainingStatBounds;
}

function toUnsignedHash(value: number): number {
  return Number.isFinite(value) ? value >>> 0 : 0;
}

function emptyResult(
  status: "invalid" | "unreachable",
  request: ArmorOwnedPlanRequest,
  mode: ArmorOwnedPlanningMode,
  target: NormalizedArmorTarget,
  fragments: ArmorStatValues,
  budget: Required<ArmorReachabilityModBudget>,
  setConstraint: NormalizedArmorSetConstraint,
  quality: DataQualitySummary,
  issues: ArmorReachabilityIssue[],
  warnings: string[]
): ArmorOwnedPlanResult {
  return {
    status,
    mode,
    ruleset_id: request.ruleset.ruleset_id,
    ruleset_version: request.ruleset.version,
    target,
    fragment_adjustments: fragments,
    armor_mod_budget: budget,
    armor_set_constraint: setConstraint,
    candidates: [],
    data_quality: quality,
    search: {
      truncated: false,
      states_examined: 0,
      states_retained: 0,
      piece_option_counts: { helmet: 0, arms: 0, chest: 0, legs: 0, class: 0 }
    },
    issues,
    warnings
  };
}
