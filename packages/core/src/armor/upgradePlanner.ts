import type { ArmorStatKey } from "../loadouts/analysis.js";
import {
  addArmorStatValues,
  armorSlots,
  armorStatKeys,
  cloneArmorStatValues,
  type ArmorPieceSnapshot,
  type ArmorSlot,
  type ArmorStatValues
} from "./model.js";
import {
  planOwnedArmor,
  type ArmorOwnedCandidate,
  type ArmorOwnedPieceChoice,
  type ArmorOwnedPlanRequest,
  type ArmorOwnedPlanResult
} from "./ownedPlanner.js";
import type { ArmorReachabilityIssue, NormalizedArmorTarget } from "./reachability.js";
import type { ArmorRuleset } from "./ruleset.js";
import {
  buildArmorSetCoverage,
  type ArmorSetCoverage,
  type NormalizedArmorSetConstraint
} from "./sets.js";

export type ArmorUpgradePlanRequest = ArmorOwnedPlanRequest & {
  current_instance_ids: readonly string[];
};

export type ArmorUpgradeBaseline = {
  pieces: ArmorPieceSnapshot[];
  armor_total: ArmorStatValues;
  fragment_adjustments: ArmorStatValues;
  final_total: ArmorStatValues;
  target_shortfalls: Partial<Record<ArmorStatKey, number>>;
  target_overflows: Partial<Record<ArmorStatKey, number>>;
  total_gap: number;
  maximum_gap: number;
  armor_set_coverage: ArmorSetCoverage;
  hard_constraints_met: boolean;
};

export type ArmorUpgradeReplacement = {
  slot: ArmorSlot;
  from_instance_id: string;
  from_name: string;
  to_instance_id: string;
  to_name: string;
};

export type ArmorUpgradeStep = {
  step: number;
  kind: "replace-piece" | "adjust-armor-mods";
  slot?: ArmorSlot;
  from_instance_id?: string;
  to_instance_id?: string;
  final_total: ArmorStatValues;
  target_shortfalls: Partial<Record<ArmorStatKey, number>>;
  target_overflows: Partial<Record<ArmorStatKey, number>>;
  total_gap: number;
  maximum_gap: number;
  armor_set_coverage: ArmorSetCoverage;
  hard_constraints_met: boolean;
};

export type ArmorUpgradeCandidate = {
  candidate_id: string;
  owned_candidate: ArmorOwnedCandidate;
  replacement_count: number;
  retained_instance_ids: string[];
  replacements: ArmorUpgradeReplacement[];
  steps: ArmorUpgradeStep[];
};

export type ArmorUpgradePlanResult = {
  status: ArmorOwnedPlanResult["status"];
  baseline?: ArmorUpgradeBaseline;
  owned_result?: ArmorOwnedPlanResult;
  minimum_replacement_count?: number;
  candidates: ArmorUpgradeCandidate[];
  issues: ArmorReachabilityIssue[];
  warnings: string[];
};

type EvaluatedTotals = Pick<
  ArmorUpgradeBaseline,
  | "armor_total"
  | "fragment_adjustments"
  | "final_total"
  | "target_shortfalls"
  | "target_overflows"
  | "total_gap"
  | "maximum_gap"
  | "hard_constraints_met"
>;

export function planArmorUpgrade(request: ArmorUpgradePlanRequest): ArmorUpgradePlanResult {
  const baselineResult = resolveBaselinePieces(request);
  if (baselineResult.issues.length) {
    return {
      status: "invalid",
      candidates: [],
      issues: baselineResult.issues,
      warnings: []
    };
  }

  const ownedResult = planOwnedArmor({
    ...request,
    preferred_instance_ids: baselineResult.pieces.map((piece) => piece.instance_id!)
  });
  const baseline = buildBaseline(
    baselineResult.pieces,
    ownedResult.target,
    ownedResult.fragment_adjustments,
    request.ruleset,
    ownedResult.armor_set_constraint
  );
  const candidates = ownedResult.candidates.map((candidate) => buildUpgradeCandidate(
    baselineResult.pieces,
    candidate,
    ownedResult.target,
    ownedResult.fragment_adjustments,
    request.ruleset,
    ownedResult.armor_set_constraint
  ));
  const reachableCandidates = candidates.filter((candidate) => (
    candidate.owned_candidate.hard_constraints_met
  ));
  const minimumReplacementCount = reachableCandidates.length
    ? Math.min(...reachableCandidates.map((candidate) => candidate.replacement_count))
    : undefined;
  const warnings = [...ownedResult.warnings];
  if (baseline.hard_constraints_met) {
    warnings.push("当前基线已经满足全部属性与套装硬约束；升级候选仅用于优化优先属性、浪费或调度成本。");
  }
  if (ownedResult.status === "indeterminate") {
    warnings.push("库存搜索已截断，当前最少替换数量只对已保留候选成立，不能证明是全局最小值。");
  }
  return {
    status: ownedResult.status,
    baseline,
    owned_result: ownedResult,
    ...(minimumReplacementCount === undefined
      ? {}
      : { minimum_replacement_count: minimumReplacementCount }),
    candidates,
    issues: ownedResult.issues,
    warnings
  };
}

function resolveBaselinePieces(request: ArmorUpgradePlanRequest): {
  pieces: ArmorPieceSnapshot[];
  issues: ArmorReachabilityIssue[];
} {
  const issues: ArmorReachabilityIssue[] = [];
  const ids = [...new Set(request.current_instance_ids.map((value) => value.trim()).filter(Boolean))];
  const pieces: ArmorPieceSnapshot[] = [];
  const bySlot = new Map<ArmorSlot, ArmorPieceSnapshot>();
  for (const instanceId of ids) {
    const piece = request.pieces.find((candidate) => candidate.instance_id === instanceId);
    if (!piece) {
      issues.push({
        code: "current_armor_instance_missing",
        message: `当前基线护甲实例 ${instanceId} 不在输入快照中。`,
        piece_id: instanceId
      });
      continue;
    }
    if (!piece.slot || !piece.quality.owned_ready) {
      issues.push({
        code: "current_armor_instance_incomplete",
        message: `当前基线护甲实例 ${instanceId} 缺少槽位、实例 ID 或最终属性。`,
        piece_id: instanceId
      });
      continue;
    }
    if (request.class !== "any" && piece.class !== "any" && piece.class !== request.class) {
      issues.push({
        code: "current_armor_class_mismatch",
        message: `当前基线护甲实例 ${instanceId} 与目标职业不兼容。`,
        piece_id: instanceId
      });
      continue;
    }
    if (bySlot.has(piece.slot)) {
      issues.push({
        code: "duplicate_current_armor_slot",
        message: `当前基线在 ${piece.slot} 槽位包含多个实例。`,
        piece_id: instanceId
      });
      continue;
    }
    bySlot.set(piece.slot, piece);
    pieces.push(piece);
  }
  for (const slot of armorSlots) {
    if (!bySlot.has(slot)) {
      issues.push({
        code: "missing_current_armor_slot",
        message: `当前基线缺少 ${slot} 护甲实例。`
      });
    }
  }
  if (pieces.filter((piece) => piece.exotic).length > 1) {
    issues.push({ code: "multiple_current_exotic_armor", message: "当前基线包含多件异域护甲。" });
  }
  return { pieces: armorSlots.flatMap((slot) => bySlot.get(slot) ?? []), issues };
}

function buildBaseline(
  pieces: readonly ArmorPieceSnapshot[],
  target: NormalizedArmorTarget,
  fragments: ArmorStatValues,
  ruleset: ArmorRuleset,
  setConstraint: NormalizedArmorSetConstraint
): ArmorUpgradeBaseline {
  const evaluated = evaluateTotals(
    pieces.map((piece) => cloneArmorStatValues(piece.stats.final)),
    target,
    fragments,
    ruleset
  );
  const setCoverage = coverageForSnapshots(pieces, setConstraint);
  return {
    pieces: [...pieces],
    ...evaluated,
    armor_set_coverage: setCoverage,
    hard_constraints_met: evaluated.hard_constraints_met && setCoverage.satisfied
  };
}

function buildUpgradeCandidate(
  baselinePieces: readonly ArmorPieceSnapshot[],
  candidate: ArmorOwnedCandidate,
  target: NormalizedArmorTarget,
  fragments: ArmorStatValues,
  ruleset: ArmorRuleset,
  setConstraint: NormalizedArmorSetConstraint
): ArmorUpgradeCandidate {
  const baselineBySlot = new Map(baselinePieces.map((piece) => [piece.slot!, piece]));
  const candidateBySlot = new Map(candidate.pieces.map((piece) => [piece.slot, piece]));
  const retainedInstanceIds = candidate.pieces
    .filter((piece) => baselineBySlot.get(piece.slot)?.instance_id === piece.instance_id)
    .map((piece) => piece.instance_id)
    .sort();
  const replacements = armorSlots.flatMap((slot) => {
    const from = baselineBySlot.get(slot)!;
    const to = candidateBySlot.get(slot)!;
    return from.instance_id === to.instance_id ? [] : [{
      slot,
      from_instance_id: from.instance_id!,
      from_name: from.name,
      to_instance_id: to.instance_id,
      to_name: to.name
    }];
  });
  return {
    candidate_id: candidate.candidate_id,
    owned_candidate: candidate,
    replacement_count: replacements.length,
    retained_instance_ids: retainedInstanceIds,
    replacements,
    steps: buildUpgradeSteps(
      baselineBySlot,
      candidateBySlot,
      replacements,
      target,
      fragments,
      ruleset,
      setConstraint
    )
  };
}

function buildUpgradeSteps(
  baselineBySlot: ReadonlyMap<ArmorSlot, ArmorPieceSnapshot>,
  candidateBySlot: ReadonlyMap<ArmorSlot, ArmorOwnedPieceChoice>,
  replacements: readonly ArmorUpgradeReplacement[],
  target: NormalizedArmorTarget,
  fragments: ArmorStatValues,
  ruleset: ArmorRuleset,
  setConstraint: NormalizedArmorSetConstraint
): ArmorUpgradeStep[] {
  const selected = new Map<ArmorSlot, ArmorPieceSnapshot | ArmorOwnedPieceChoice>(baselineBySlot);
  const remaining = [...replacements];
  const steps: ArmorUpgradeStep[] = [];
  while (remaining.length) {
    const ranked = remaining.map((replacement) => {
      const probe = new Map(selected);
      probe.set(replacement.slot, candidateBySlot.get(replacement.slot)!);
      const snapshot = evaluateSelection(probe, target, fragments, ruleset, setConstraint);
      return { replacement, snapshot };
    }).sort((left, right) => (
      left.snapshot.armor_set_coverage.total_missing_piece_count
      - right.snapshot.armor_set_coverage.total_missing_piece_count
      || left.snapshot.total_gap - right.snapshot.total_gap
      || left.snapshot.maximum_gap - right.snapshot.maximum_gap
      || armorSlots.indexOf(left.replacement.slot) - armorSlots.indexOf(right.replacement.slot)
    ));
    const next = ranked[0]!;
    selected.set(next.replacement.slot, candidateBySlot.get(next.replacement.slot)!);
    remaining.splice(remaining.indexOf(next.replacement), 1);
    steps.push({
      step: steps.length + 1,
      kind: "replace-piece",
      slot: next.replacement.slot,
      from_instance_id: next.replacement.from_instance_id,
      to_instance_id: next.replacement.to_instance_id,
      ...next.snapshot
    });
  }

  const finalSelection = new Map<ArmorSlot, ArmorPieceSnapshot | ArmorOwnedPieceChoice>(
    armorSlots.map((slot) => [slot, candidateBySlot.get(slot)!] as const)
  );
  const finalSnapshot = evaluateSelection(finalSelection, target, fragments, ruleset, setConstraint);
  if (!selectionMatchesCandidate(selected, candidateBySlot)) {
    steps.push({
      step: steps.length + 1,
      kind: "adjust-armor-mods",
      ...finalSnapshot
    });
  }
  return steps;
}

function evaluateSelection(
  selected: ReadonlyMap<ArmorSlot, ArmorPieceSnapshot | ArmorOwnedPieceChoice>,
  target: NormalizedArmorTarget,
  fragments: ArmorStatValues,
  ruleset: ArmorRuleset,
  setConstraint: NormalizedArmorSetConstraint
): Omit<ArmorUpgradeStep, "step" | "kind" | "slot" | "from_instance_id" | "to_instance_id"> {
  const values = armorSlots.map((slot) => selectionStats(selected.get(slot)!));
  const evaluated = evaluateTotals(values, target, fragments, ruleset);
  const setCoverage = coverageForSelection(selected, setConstraint);
  return {
    final_total: evaluated.final_total,
    target_shortfalls: evaluated.target_shortfalls,
    target_overflows: evaluated.target_overflows,
    total_gap: evaluated.total_gap,
    maximum_gap: evaluated.maximum_gap,
    armor_set_coverage: setCoverage,
    hard_constraints_met: evaluated.hard_constraints_met && setCoverage.satisfied
  };
}

function evaluateTotals(
  values: readonly ArmorStatValues[],
  target: NormalizedArmorTarget,
  fragments: ArmorStatValues,
  ruleset: ArmorRuleset
): EvaluatedTotals {
  const armorTotal = addArmorStatValues(...values);
  const finalTotal = Object.fromEntries(armorStatKeys.map((stat) => [
    stat,
    Math.min(
      ruleset.stat_limits.maximum,
      Math.max(ruleset.stat_limits.minimum, armorTotal[stat] + fragments[stat])
    )
  ])) as ArmorStatValues;
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
  return {
    armor_total: armorTotal,
    fragment_adjustments: cloneArmorStatValues(fragments),
    final_total: finalTotal,
    target_shortfalls: shortfalls,
    target_overflows: overflows,
    total_gap: totalGap,
    maximum_gap: Math.max(0, ...gaps),
    hard_constraints_met: totalGap === 0
  };
}

function coverageForSnapshots(
  pieces: readonly ArmorPieceSnapshot[],
  constraint: NormalizedArmorSetConstraint
): ArmorSetCoverage {
  return buildArmorSetCoverage(constraint, countSets(
    pieces.map((piece) => ({ slot: piece.slot!, set_hash: piece.set?.hash })),
    constraint
  ));
}

function coverageForSelection(
  selected: ReadonlyMap<ArmorSlot, ArmorPieceSnapshot | ArmorOwnedPieceChoice>,
  constraint: NormalizedArmorSetConstraint
): ArmorSetCoverage {
  return buildArmorSetCoverage(constraint, countSets(
    armorSlots.map((slot) => ({ slot, set_hash: selected.get(slot)?.set?.hash })),
    constraint
  ));
}

function countSets(
  pieces: readonly { slot: ArmorSlot; set_hash?: number }[],
  constraint: NormalizedArmorSetConstraint
): number[] {
  return constraint.requirements.map((requirement) => pieces.filter((piece) => (
    piece.set_hash !== undefined
    && toUnsignedHash(piece.set_hash) === requirement.set_hash
    && requirement.eligible_slots.includes(piece.slot)
  )).length);
}

function selectionStats(piece: ArmorPieceSnapshot | ArmorOwnedPieceChoice): ArmorStatValues {
  return "observed_final" in piece
    ? cloneArmorStatValues(piece.final)
    : cloneArmorStatValues(piece.stats.final);
}

function equalStats(left: ArmorStatValues, right: ArmorStatValues): boolean {
  return armorStatKeys.every((stat) => left[stat] === right[stat]);
}

function selectionMatchesCandidate(
  selected: ReadonlyMap<ArmorSlot, ArmorPieceSnapshot | ArmorOwnedPieceChoice>,
  candidate: ReadonlyMap<ArmorSlot, ArmorOwnedPieceChoice>
): boolean {
  return armorSlots.every((slot) => equalStats(
    selectionStats(selected.get(slot)!),
    candidate.get(slot)!.final
  ));
}

function toUnsignedHash(value: number): number {
  return Number.isFinite(value) ? value >>> 0 : 0;
}
