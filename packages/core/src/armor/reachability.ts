import type { ArmorStatKey } from "../loadouts/analysis.js";
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
import { validateArmorRuleset, type ArmorRuleset } from "./ruleset.js";

export type ArmorReachabilityTuning =
  | { mode: "plus3" }
  | {
      mode: "shift";
      fixed_to_stat?: ArmorStatKey;
      allowed_from_stats?: readonly ArmorStatKey[];
      allowed_to_stats?: readonly ArmorStatKey[];
    };

export type ArmorReachabilityPiece = {
  piece_id: string;
  slot: ArmorSlot;
  class: ArmorClass;
  archetype_id: string;
  tertiary_stat: ArmorStatKey;
  masterwork_tier?: number;
  tuning: ArmorReachabilityTuning;
  allowed_armor_mod_values?: readonly (0 | 5 | 10)[];
  item_hash?: number;
  name?: string;
  exotic?: boolean;
  exotic_class_item?: boolean;
  set?: {
    hash: number;
    name: string;
  };
};

export type ArmorReachabilityModBudget = {
  plus5: number;
  plus10: number;
  usage?: "at-most" | "exact";
};

export type ArmorStatReachability = {
  min: number;
  max: number;
  values: number[];
};

export type ArmorReachabilityIssue = {
  code: string;
  message: string;
  piece_id?: string;
};

export type ArmorReachabilityStatConstraint = {
  minimum?: number;
  maximum?: number;
  exact?: number;
};

export type NormalizedArmorTarget = Partial<
  Record<ArmorStatKey, { minimum: number; maximum: number }>
>;

export type NormalizeArmorTargetResult = {
  target: NormalizedArmorTarget;
  issues: ArmorReachabilityIssue[];
};

export type ArmorReachabilityResult = {
  status: "reachable" | "unreachable" | "invalid";
  ruleset_id: ArmorRuleset["ruleset_id"];
  ruleset_version: number;
  scope: "per-stat-marginal";
  exact: true;
  simultaneous_target_checked: false;
  ranges: Partial<Record<ArmorStatKey, ArmorStatReachability>>;
  fragment_adjustments: ArmorStatValues;
  armor_mod_budget: Required<ArmorReachabilityModBudget>;
  issues: ArmorReachabilityIssue[];
  warnings: string[];
};

export type ArmorTargetFeasibilityResult = {
  status: "reachable" | "unreachable" | "invalid";
  ruleset_id: ArmorRuleset["ruleset_id"];
  ruleset_version: number;
  exact: true;
  target: NormalizedArmorTarget;
  marginal_ranges: Partial<Record<ArmorStatKey, ArmorStatReachability>>;
  candidate?: {
    configurations: ArmorConfiguration[];
    armor_total: ArmorStatValues;
    fragment_adjustments: ArmorStatValues;
    final_total: ArmorStatValues;
  };
  states_examined: number;
  issues: ArmorReachabilityIssue[];
};

type PieceStatOption = {
  value: number;
  plus5: number;
  plus10: number;
};

type FullPieceOption = PieceStatOption & {
  configuration: ArmorConfiguration;
};

type TargetState = {
  totals: ArmorStatValues;
  plus5: number;
  plus10: number;
  configurations: ArmorConfiguration[];
};

export function analyzeArmorReachability(input: {
  ruleset: ArmorRuleset;
  pieces: readonly ArmorReachabilityPiece[];
  fragment_adjustments?: Partial<Record<ArmorStatKey, number>>;
  armor_mod_budget?: Partial<ArmorReachabilityModBudget>;
}): ArmorReachabilityResult {
  const budget = normalizeBudget(input.armor_mod_budget);
  const fragments = cloneArmorStatValues(input.fragment_adjustments);
  const issues = [
    ...validateBudgetInput(input.armor_mod_budget),
    ...validateReachabilityInput(input.ruleset, input.pieces, budget)
  ];
  if (issues.length) {
    return result("invalid", input.ruleset, fragments, budget, {}, issues);
  }

  const ranges: Partial<Record<ArmorStatKey, ArmorStatReachability>> = {};
  for (const stat of armorStatKeys) {
    const values = calculateReachableStatValues(
      input.ruleset,
      input.pieces,
      stat,
      fragments[stat],
      budget
    );
    if (!values.length) {
      issues.push({
        code: "armor_mod_budget_unreachable",
        message: "当前逐件模组限制无法满足指定的护甲模组预算。"
      });
      return result("unreachable", input.ruleset, fragments, budget, {}, issues);
    }
    ranges[stat] = {
      min: values[0]!,
      max: values[values.length - 1]!,
      values
    };
  }

  return result("reachable", input.ruleset, fragments, budget, ranges, []);
}

export function analyzeArmorTargetFeasibility(input: {
  ruleset: ArmorRuleset;
  pieces: readonly ArmorReachabilityPiece[];
  target: Partial<Record<ArmorStatKey, ArmorReachabilityStatConstraint>>;
  fragment_adjustments?: Partial<Record<ArmorStatKey, number>>;
  armor_mod_budget?: Partial<ArmorReachabilityModBudget>;
}): ArmorTargetFeasibilityResult {
  const targetResult = normalizeArmorTarget(input.target, input.ruleset);
  if (targetResult.issues.length) {
    return targetFeasibilityResult(input.ruleset, targetResult.target, {}, 0, targetResult.issues);
  }

  const marginal = analyzeArmorReachability(input);
  if (marginal.status === "invalid") {
    return targetFeasibilityResult(
      input.ruleset,
      targetResult.target,
      marginal.ranges,
      0,
      marginal.issues
    );
  }
  if (marginal.status === "unreachable") {
    return targetFeasibilityResult(
      input.ruleset,
      targetResult.target,
      marginal.ranges,
      0,
      marginal.issues,
      "unreachable"
    );
  }

  const marginalIssues = marginalTargetIssues(targetResult.target, marginal.ranges);
  if (marginalIssues.length) {
    return targetFeasibilityResult(
      input.ruleset,
      targetResult.target,
      marginal.ranges,
      0,
      marginalIssues,
      "unreachable"
    );
  }

  const budget = marginal.armor_mod_budget;
  const constraintStats = armorStatKeys.filter((stat) => targetResult.target[stat]);
  const optionsByPiece = input.pieces.map((piece) => (
    buildFullPieceOptions(input.ruleset, piece, constraintStats, budget)
  ));
  const remainingBounds = buildRemainingBounds(optionsByPiece, constraintStats);
  let states = new Map<string, TargetState>([[
    targetStateKey(createEmptyArmorStatValues(), 0, 0, constraintStats),
    {
      totals: createEmptyArmorStatValues(),
      plus5: 0,
      plus10: 0,
      configurations: []
    }
  ]]);
  let statesExamined = 0;

  for (let pieceIndex = 0; pieceIndex < optionsByPiece.length; pieceIndex += 1) {
    const next = new Map<string, TargetState>();
    for (const state of states.values()) {
      for (const option of optionsByPiece[pieceIndex] ?? []) {
        statesExamined += 1;
        const plus5 = state.plus5 + option.plus5;
        const plus10 = state.plus10 + option.plus10;
        if (plus5 > budget.plus5 || plus10 > budget.plus10) continue;
        const totals = addArmorStatValues(state.totals, option.configuration.stats.final);
        if (!canStillReachTarget(
          totals,
          targetResult.target,
          marginal.fragment_adjustments,
          remainingBounds[pieceIndex + 1]!,
          input.ruleset
        )) continue;
        if (budget.usage === "exact") {
          const remainingPieces = optionsByPiece.length - pieceIndex - 1;
          if (plus5 + remainingPieces < budget.plus5
            || plus10 + remainingPieces < budget.plus10) continue;
        }
        const key = targetStateKey(totals, plus5, plus10, constraintStats);
        if (!next.has(key)) {
          next.set(key, {
            totals,
            plus5,
            plus10,
            configurations: [...state.configurations, option.configuration]
          });
        }
      }
    }
    states = next;
  }

  const candidate = [...states.values()].find((state) => (
    budgetMatches(state, budget)
    && targetMatches(
      state.totals,
      targetResult.target,
      marginal.fragment_adjustments,
      input.ruleset
    )
  ));
  if (!candidate) {
    return targetFeasibilityResult(
      input.ruleset,
      targetResult.target,
      marginal.ranges,
      statesExamined,
      [{
        code: "joint_armor_target_unreachable",
        message: "各属性单独存在可达值，但当前逐件调整和模组预算无法同时满足全部六维约束。"
      }],
      "unreachable"
    );
  }

  const finalTotal = effectiveTotals(
    candidate.totals,
    marginal.fragment_adjustments,
    input.ruleset
  );
  return {
    status: "reachable",
    ruleset_id: input.ruleset.ruleset_id,
    ruleset_version: input.ruleset.version,
    exact: true,
    target: targetResult.target,
    marginal_ranges: marginal.ranges,
    candidate: {
      configurations: candidate.configurations,
      armor_total: candidate.totals,
      fragment_adjustments: marginal.fragment_adjustments,
      final_total: finalTotal
    },
    states_examined: statesExamined,
    issues: []
  };
}

function validateReachabilityInput(
  ruleset: ArmorRuleset,
  pieces: readonly ArmorReachabilityPiece[],
  budget: Required<ArmorReachabilityModBudget>
): ArmorReachabilityIssue[] {
  const issues: ArmorReachabilityIssue[] = [];
  const slots = new Set(pieces.map((piece) => piece.slot));
  const pieceIds = new Set<string>();
  const concreteClasses = new Set(
    pieces
      .map((piece) => piece.class)
      .filter((armorClass) => armorClass !== "any" && armorClass !== "unknown")
  );

  issues.push(...validateArmorRuleset(ruleset).map((message) => ({
    code: "invalid_armor_ruleset",
    message
  })));

  if (pieces.length !== armorSlots.length || armorSlots.some((slot) => !slots.has(slot))) {
    issues.push({ code: "invalid_armor_slots", message: "可达性分析必须提供五个不重复的护甲槽位。" });
  }
  if (budget.plus5 + budget.plus10 > pieces.length && budget.usage === "exact") {
    issues.push({ code: "armor_mod_budget_exceeds_slots", message: "精确模组数量不能超过护甲件数。" });
  }
  if (pieces.filter((piece) => piece.exotic || piece.exotic_class_item).length > 1) {
    issues.push({ code: "multiple_exotic_armor", message: "同一套配置最多包含一件异域护甲。" });
  }
  if (pieces.some((piece) => piece.class === "unknown") || concreteClasses.size > 1) {
    issues.push({ code: "incompatible_armor_classes", message: "五件护甲必须属于同一职业或通用职业。" });
  }

  for (const piece of pieces) {
    if (!piece.piece_id.trim()) {
      issues.push({ code: "missing_piece_id", message: "护甲配置缺少稳定 ID。" });
    } else if (pieceIds.has(piece.piece_id)) {
      issues.push({ code: "duplicate_piece_id", message: `护甲配置 ID 重复：${piece.piece_id}` });
    }
    pieceIds.add(piece.piece_id);

    const allowedMods = normalizeAllowedModValues(piece.allowed_armor_mod_values);
    if (!allowedMods.length) {
      issues.push({ code: "missing_allowed_mods", message: "护甲至少需要提供一种属性模组选择。", piece_id: piece.piece_id });
    }
    const tuningOptions = tuningAllocations(piece.tuning);
    if (!tuningOptions.length) {
      issues.push({ code: "missing_tuning_options", message: "护甲没有可用的调整分配。", piece_id: piece.piece_id });
      continue;
    }
    const probe = findValidPieceConfiguration(ruleset, piece, tuningOptions, allowedMods);
    if (probe.status === "invalid") {
      issues.push(...probe.issues.map((issue) => ({ ...issue, piece_id: piece.piece_id })));
    }
  }
  return issues;
}

function calculateReachableStatValues(
  ruleset: ArmorRuleset,
  pieces: readonly ArmorReachabilityPiece[],
  objectiveStat: ArmorStatKey,
  fragmentAdjustment: number,
  budget: Required<ArmorReachabilityModBudget>
): number[] {
  let states = new Map<string, Set<number>>([["0:0", new Set([0])]]);

  for (const piece of pieces) {
    const options = buildPieceStatOptions(ruleset, piece, objectiveStat, budget);
    const next = new Map<string, Set<number>>();
    for (const [budgetKey, totals] of states) {
      const [usedFive, usedTen] = budgetKey.split(":").map(Number);
      for (const option of options) {
        const nextFive = usedFive! + option.plus5;
        const nextTen = usedTen! + option.plus10;
        if (nextFive > budget.plus5 || nextTen > budget.plus10) continue;
        const key = `${nextFive}:${nextTen}`;
        const values = next.get(key) ?? new Set<number>();
        for (const total of totals) values.add(total + option.value);
        next.set(key, values);
      }
    }
    states = next;
  }

  const reachable = new Set<number>();
  for (const [budgetKey, totals] of states) {
    const [usedFive, usedTen] = budgetKey.split(":").map(Number);
    if (budget.usage === "exact"
      && (usedFive !== budget.plus5 || usedTen !== budget.plus10)) continue;
    for (const total of totals) {
      reachable.add(clamp(total + fragmentAdjustment, ruleset.stat_limits.minimum, ruleset.stat_limits.maximum));
    }
  }
  return [...reachable].sort((left, right) => left - right);
}

function buildPieceStatOptions(
  ruleset: ArmorRuleset,
  piece: ArmorReachabilityPiece,
  objectiveStat: ArmorStatKey,
  budget: Required<ArmorReachabilityModBudget>
): PieceStatOption[] {
  const options = new Map<string, PieceStatOption>();
  const modValues = normalizeAllowedModValues(piece.allowed_armor_mod_values);

  for (const tuning of tuningAllocations(piece.tuning)) {
    for (const modValue of modValues) {
      const modStats = modValue === 0 ? [undefined] : armorStatKeys;
      for (const modStat of modStats) {
        if (modValue === 5 && budget.plus5 === 0) continue;
        if (modValue === 10 && budget.plus10 === 0) continue;
        const built = buildArmorConfiguration(ruleset, configurationInput(
          piece,
          tuning,
          modStat ? { stat: modStat, value: modValue as 5 | 10 } : undefined
        ));
        if (built.status !== "valid") continue;
        const option = {
          value: built.configuration.stats.final[objectiveStat],
          plus5: modValue === 5 ? 1 : 0,
          plus10: modValue === 10 ? 1 : 0
        };
        options.set(`${option.value}:${option.plus5}:${option.plus10}`, option);
      }
    }
  }
  return [...options.values()];
}

function buildFullPieceOptions(
  ruleset: ArmorRuleset,
  piece: ArmorReachabilityPiece,
  constraintStats: readonly ArmorStatKey[],
  budget: Required<ArmorReachabilityModBudget>
): FullPieceOption[] {
  const options = new Map<string, FullPieceOption>();
  for (const tuning of tuningAllocations(piece.tuning)) {
    for (const modValue of normalizeAllowedModValues(piece.allowed_armor_mod_values)) {
      const modStats = modValue === 0 ? [undefined] : armorStatKeys;
      for (const modStat of modStats) {
        if (modValue === 5 && budget.plus5 === 0) continue;
        if (modValue === 10 && budget.plus10 === 0) continue;
        const built = buildArmorConfiguration(ruleset, configurationInput(
          piece,
          tuning,
          modStat ? { stat: modStat, value: modValue as 5 | 10 } : undefined
        ));
        if (built.status !== "valid") continue;
        const option = {
          configuration: built.configuration,
          value: 0,
          plus5: modValue === 5 ? 1 : 0,
          plus10: modValue === 10 ? 1 : 0
        };
        const key = [
          option.plus5,
          option.plus10,
          ...constraintStats.map((stat) => built.configuration.stats.final[stat])
        ].join(":");
        if (!options.has(key)) options.set(key, option);
      }
    }
  }
  return [...options.values()];
}

function configurationInput(
  piece: ArmorReachabilityPiece,
  tuning: ArmorConfigurationTuning,
  armorStatMod?: ArmorConfigurationInput["armor_stat_mod"]
): ArmorConfigurationInput {
  return {
    configuration_id: configurationId(piece.piece_id, tuning, armorStatMod),
    slot: piece.slot,
    class: piece.class,
    archetype_id: piece.archetype_id,
    tertiary_stat: piece.tertiary_stat,
    masterwork_tier: piece.masterwork_tier,
    tuning,
    armor_stat_mod: armorStatMod,
    item_hash: piece.item_hash,
    name: piece.name,
    exotic: piece.exotic,
    exotic_class_item: piece.exotic_class_item,
    set: piece.set
  };
}

function tuningAllocations(tuning: ArmorReachabilityTuning): ArmorConfigurationTuning[] {
  if (tuning.mode === "plus3") return [{ mode: "plus3" }];
  const fromStats = uniqueStats(tuning.allowed_from_stats ?? armorStatKeys);
  const toStats = uniqueStats(
    tuning.fixed_to_stat ? [tuning.fixed_to_stat] : tuning.allowed_to_stats ?? armorStatKeys
  );
  return fromStats.flatMap((fromStat) => toStats.flatMap((toStat) => (
    fromStat === toStat
      ? []
      : [{
          mode: "shift" as const,
          from_stat: fromStat,
          to_stat: toStat,
          ...(tuning.fixed_to_stat ? { rolled_to_stat: tuning.fixed_to_stat } : {})
        }]
  )));
}

function normalizeBudget(
  budget: Partial<ArmorReachabilityModBudget> | undefined
): Required<ArmorReachabilityModBudget> {
  return {
    plus5: nonNegativeInteger(budget?.plus5),
    plus10: nonNegativeInteger(budget?.plus10),
    usage: budget?.usage === "exact" ? "exact" : "at-most"
  };
}

function normalizeAllowedModValues(
  values: readonly (0 | 5 | 10)[] | undefined
): Array<0 | 5 | 10> {
  const normalized: readonly (0 | 5 | 10)[] = values ?? [0, 5, 10];
  return [...new Set(normalized.filter((value): value is 0 | 5 | 10 => (
    value === 0 || value === 5 || value === 10
  )))];
}

function findValidPieceConfiguration(
  ruleset: ArmorRuleset,
  piece: ArmorReachabilityPiece,
  tunings: readonly ArmorConfigurationTuning[],
  allowedMods: readonly (0 | 5 | 10)[]
): ReturnType<typeof buildArmorConfiguration> {
  let firstInvalid: ReturnType<typeof buildArmorConfiguration> | undefined;
  for (const tuning of tunings) {
    for (const modValue of allowedMods) {
      const modStats = modValue === 0 ? [undefined] : armorStatKeys;
      for (const modStat of modStats) {
        const built = buildArmorConfiguration(ruleset, configurationInput(
          piece,
          tuning,
          modStat ? { stat: modStat, value: modValue as 5 | 10 } : undefined
        ));
        if (built.status === "valid") return built;
        firstInvalid ??= built;
      }
    }
  }
  return firstInvalid ?? {
    status: "invalid",
    issues: [{ code: "invalid_piece_configuration", message: "护甲没有可用的理论配置。" }]
  };
}

function validateBudgetInput(
  budget: Partial<ArmorReachabilityModBudget> | undefined
): ArmorReachabilityIssue[] {
  const issues: ArmorReachabilityIssue[] = [];
  for (const [field, value] of [["plus5", budget?.plus5], ["plus10", budget?.plus10]] as const) {
    if (value !== undefined && (!Number.isInteger(value) || value < 0)) {
      issues.push({
        code: "invalid_armor_mod_budget",
        message: `${field} 护甲模组预算必须是非负整数。`
      });
    }
  }
  return issues;
}

export function normalizeArmorTarget(
  target: Partial<Record<ArmorStatKey, ArmorReachabilityStatConstraint>>,
  ruleset: ArmorRuleset
): NormalizeArmorTargetResult {
  const normalized: NormalizedArmorTarget = {};
  const issues: ArmorReachabilityIssue[] = [];
  for (const stat of armorStatKeys) {
    const constraint = target[stat];
    if (!constraint) continue;
    if (constraint.exact === undefined
      && constraint.minimum === undefined
      && constraint.maximum === undefined) continue;
    const minimum = constraint.exact ?? constraint.minimum ?? ruleset.stat_limits.minimum;
    const maximum = constraint.exact ?? constraint.maximum ?? ruleset.stat_limits.maximum;
    const exactConflicts = constraint.exact !== undefined
      && ((constraint.minimum !== undefined && constraint.exact < constraint.minimum)
        || (constraint.maximum !== undefined && constraint.exact > constraint.maximum));
    if (!Number.isInteger(minimum)
      || !Number.isInteger(maximum)
      || minimum < ruleset.stat_limits.minimum
      || maximum > ruleset.stat_limits.maximum
      || minimum > maximum
      || exactConflicts) {
      issues.push({
        code: "invalid_armor_target",
        message: `${stat} 的目标范围无效。`
      });
      continue;
    }
    if (minimum === ruleset.stat_limits.minimum && maximum === ruleset.stat_limits.maximum) {
      continue;
    }
    normalized[stat] = { minimum, maximum };
  }
  return { target: normalized, issues };
}

function configurationId(
  pieceId: string,
  tuning: ArmorConfigurationTuning,
  armorStatMod: ArmorConfigurationInput["armor_stat_mod"]
): string {
  const tuningId = tuning.mode === "plus3"
    ? "plus3"
    : `shift-${tuning.from_stat}-${tuning.to_stat}`;
  const modId = armorStatMod ? `mod-${armorStatMod.stat}-${armorStatMod.value}` : "mod-none";
  return `${pieceId}:${tuningId}:${modId}`;
}

function marginalTargetIssues(
  target: ArmorTargetFeasibilityResult["target"],
  ranges: ArmorReachabilityResult["ranges"]
): ArmorReachabilityIssue[] {
  return armorStatKeys.flatMap((stat) => {
    const constraint = target[stat];
    const range = ranges[stat];
    if (!constraint || !range) return [];
    const hasCandidate = range.values.some((value) => (
      value >= constraint.minimum && value <= constraint.maximum
    ));
    return hasCandidate ? [] : [{
      code: "armor_target_outside_reachable_range",
      message: `${stat} 的目标 ${constraint.minimum}-${constraint.maximum} 不在可达集合中。`
    }];
  });
}

function buildRemainingBounds(
  optionsByPiece: readonly FullPieceOption[][],
  stats: readonly ArmorStatKey[]
): Array<Record<ArmorStatKey, { minimum: number; maximum: number }>> {
  const bounds = Array.from({ length: optionsByPiece.length + 1 }, () => {
    return Object.fromEntries(
      armorStatKeys.map((stat) => [stat, { minimum: 0, maximum: 0 }])
    ) as Record<ArmorStatKey, { minimum: number; maximum: number }>;
  });
  for (let index = optionsByPiece.length - 1; index >= 0; index -= 1) {
    for (const stat of stats) {
      const values = (optionsByPiece[index] ?? []).map((option) => (
        option.configuration.stats.final[stat]
      ));
      bounds[index]![stat] = {
        minimum: Math.min(...values) + bounds[index + 1]![stat].minimum,
        maximum: Math.max(...values) + bounds[index + 1]![stat].maximum
      };
    }
  }
  return bounds;
}

function canStillReachTarget(
  totals: ArmorStatValues,
  target: ArmorTargetFeasibilityResult["target"],
  fragments: ArmorStatValues,
  remaining: Record<ArmorStatKey, { minimum: number; maximum: number }>,
  ruleset: ArmorRuleset
): boolean {
  return armorStatKeys.every((stat) => {
    const constraint = target[stat];
    if (!constraint) return true;
    const minimum = clamp(
      totals[stat] + remaining[stat].minimum + fragments[stat],
      ruleset.stat_limits.minimum,
      ruleset.stat_limits.maximum
    );
    const maximum = clamp(
      totals[stat] + remaining[stat].maximum + fragments[stat],
      ruleset.stat_limits.minimum,
      ruleset.stat_limits.maximum
    );
    return minimum <= constraint.maximum && maximum >= constraint.minimum;
  });
}

function targetStateKey(
  totals: ArmorStatValues,
  plus5: number,
  plus10: number,
  stats: readonly ArmorStatKey[]
): string {
  return [plus5, plus10, ...stats.map((stat) => totals[stat])].join(":");
}

function budgetMatches(
  state: Pick<TargetState, "plus5" | "plus10">,
  budget: Required<ArmorReachabilityModBudget>
): boolean {
  return budget.usage === "at-most"
    || (state.plus5 === budget.plus5 && state.plus10 === budget.plus10);
}

function targetMatches(
  totals: ArmorStatValues,
  target: ArmorTargetFeasibilityResult["target"],
  fragments: ArmorStatValues,
  ruleset: ArmorRuleset
): boolean {
  const final = effectiveTotals(totals, fragments, ruleset);
  return armorStatKeys.every((stat) => {
    const constraint = target[stat];
    return !constraint || (final[stat] >= constraint.minimum && final[stat] <= constraint.maximum);
  });
}

function effectiveTotals(
  totals: ArmorStatValues,
  fragments: ArmorStatValues,
  ruleset: ArmorRuleset
): ArmorStatValues {
  return Object.fromEntries(armorStatKeys.map((stat) => [
    stat,
    clamp(
      totals[stat] + fragments[stat],
      ruleset.stat_limits.minimum,
      ruleset.stat_limits.maximum
    )
  ])) as ArmorStatValues;
}

function targetFeasibilityResult(
  ruleset: ArmorRuleset,
  target: ArmorTargetFeasibilityResult["target"],
  ranges: ArmorReachabilityResult["ranges"],
  statesExamined: number,
  issues: ArmorReachabilityIssue[],
  status: ArmorTargetFeasibilityResult["status"] = "invalid"
): ArmorTargetFeasibilityResult {
  return {
    status,
    ruleset_id: ruleset.ruleset_id,
    ruleset_version: ruleset.version,
    exact: true,
    target,
    marginal_ranges: ranges,
    states_examined: statesExamined,
    issues
  };
}

function uniqueStats(values: readonly ArmorStatKey[]): ArmorStatKey[] {
  return [...new Set(values.filter((value) => armorStatKeys.includes(value)))];
}

function nonNegativeInteger(value: number | undefined): number {
  return Number.isFinite(value) ? Math.max(0, Math.trunc(value!)) : 0;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function result(
  status: ArmorReachabilityResult["status"],
  ruleset: ArmorRuleset,
  fragments: ArmorStatValues,
  budget: Required<ArmorReachabilityModBudget>,
  ranges: ArmorReachabilityResult["ranges"],
  issues: ArmorReachabilityIssue[]
): ArmorReachabilityResult {
  return {
    status,
    ruleset_id: ruleset.ruleset_id,
    ruleset_version: ruleset.version,
    scope: "per-stat-marginal",
    exact: true,
    simultaneous_target_checked: false,
    ranges,
    fragment_adjustments: fragments,
    armor_mod_budget: budget,
    issues,
    warnings: ["各属性集合分别精确计算；它们不能单独证明一组六维目标可以同时达成。"]
  };
}
