import {
  armorStatKeys,
  type ArmorAcquisitionCandidate,
  type ArmorAcquisitionOwnedMatch,
  type ArmorAcquisitionPlanResult,
  type ArmorOwnedCandidate,
  type ArmorOwnedPieceChoice,
  type ArmorOwnedPlanResult,
  type ArmorSetCoverage,
  type ArmorSlot,
  type ArmorStatValues,
  type ArmorTheoreticalCandidate,
  type ArmorTheoreticalPieceChoice,
  type ArmorTheoreticalPlanResult,
  type ArmorUpgradeCandidate,
  type ArmorUpgradePlanResult
} from "@d2-tools/core/armor";
import type { ArmorStatKey } from "@d2-tools/core/loadouts/analysis";
import type {
  ArmorPlannerRulesetContext,
  ArmorPlannerWorkspaceJob,
  ArmorPlannerWorkspaceJobResult
} from "./armorPlannerContracts.js";

export type ArmorPlannerMode = ArmorPlannerWorkspaceJob["mode"];
export type ArmorPlannerOutcome = "reachable" | "unreachable" | "indeterminate" | "invalid";

export type ArmorPlannerTargetStatView = {
  key: ArmorStatKey;
  minimum?: number;
  maximum?: number;
  exact?: number;
};

export type ArmorPlannerCandidateStatView = ArmorPlannerTargetStatView & {
  value: number;
  shortfall: number;
  overflow: number;
  meetsTarget: boolean;
};

export type ArmorPlannerSetCoverageView = {
  mode: ArmorSetCoverage["mode"];
  satisfied: boolean;
  totalMissingPieceCount: number;
  requirements: Array<{
    setHash: number;
    name: string;
    minimumPieceCount: 2 | 4;
    actualPieceCount: number;
    missingPieceCount: number;
    satisfied: boolean;
  }>;
};

export type ArmorPlannerCandidateSummaryView = {
  candidateId: string;
  hardConstraintsMet: boolean;
  finalStats: ArmorStatValues;
  stats: ArmorPlannerCandidateStatView[];
  totalGap: number;
  maximumGap: number;
  statWaste: number;
  armorModUsage: { plus5: number; plus10: number };
  armorSetCoverage: ArmorPlannerSetCoverageView;
};

export type ArmorPlannerTheoreticalPieceView = {
  kind: "theoretical";
  configurationId: string;
  slot: ArmorSlot;
  itemHash?: number;
  name: string;
  exotic: boolean;
  exoticClassItem: boolean;
  set?: { hash: number; name: string };
  archetype: {
    id: string;
    name: string;
    primaryStat: ArmorStatKey;
    secondaryStat: ArmorStatKey;
    tertiaryStat: ArmorStatKey;
  };
  masterworkTier: number;
  tuning:
    | { mode: "plus3" }
    | {
        mode: "shift";
        fromStat: ArmorStatKey;
        toStat: ArmorStatKey;
        rolledToStat?: ArmorStatKey;
      };
  armorStatMod?: { stat: ArmorStatKey; value: 5 | 10 };
  energy: {
    capacity: number;
    reserved: number;
    armorStatMod: number;
    final: number;
    remaining: number;
  };
  rawStats: ArmorStatValues;
  finalStats: ArmorStatValues;
  equivalentIdentityIds: string[];
  equivalentIdentityCount: number;
};

export type ArmorPlannerOwnedPieceView = {
  kind: "owned";
  instanceId: string;
  itemHash: number;
  name: string;
  slot: ArmorSlot;
  location: ArmorOwnedPieceChoice["location"];
  sourceCharacterId?: string;
  exotic: boolean;
  exoticClassItem: boolean;
  set?: { hash: number; name: string };
  observedFinalStats: ArmorStatValues;
  finalStats: ArmorStatValues;
  tuning?: {
    mode: "shift" | "plus3";
    fromStat?: ArmorStatKey;
    toStat?: ArmorStatKey;
    plugHash: number;
  };
  armorStatMod?: {
    stat: ArmorStatKey;
    value: 5 | 10;
    plugHash: number;
    socketIndex: number;
    energyCost: number;
  };
  armorStatModSocketPlugHash?: number;
  plannedNonStatPlugHashes: number[];
  energy: {
    capacity: number;
    reserved: number;
    armorStatMod: number;
    final: number;
    remaining: number;
  };
};

export type ArmorPlannerOwnedMatchView = {
  instanceId: string;
  itemHash: number;
  name: string;
  slot: ArmorSlot;
  location: ArmorAcquisitionOwnedMatch["location"];
  sourceCharacterId?: string;
  set?: { hash: number; name: string };
  currentMasterworkTier?: number;
  targetMasterworkTier: number;
  upgradeStatus: ArmorAcquisitionOwnedMatch["upgrade_status"];
  masterworkTiersRequired?: number;
};

export type ArmorPlannerCandidateView =
  | {
      kind: "theoretical";
      summary: ArmorPlannerCandidateSummaryView;
      pieces: ArmorPlannerTheoreticalPieceView[];
    }
  | {
      kind: "owned";
      summary: ArmorPlannerCandidateSummaryView;
      pieces: ArmorPlannerOwnedPieceView[];
      equippedCount: number;
      transferCount: number;
      replacementCount: number;
    }
  | {
      kind: "acquisition";
      summary: ArmorPlannerCandidateSummaryView;
      fulfillmentStatus: ArmorAcquisitionCandidate["fulfillment_status"];
      missingPieceCount: number;
      upgradePieceCount: number;
      verificationPieceCount: number;
      pieces: Array<{
        slot: ArmorSlot;
        acquisitionRequired: boolean;
        identity: {
          itemHash?: number;
          itemName?: string;
          archetypeId: string;
          archetypeName: string;
          tertiaryStat: ArmorStatKey;
          tuning: { mode: "plus3" } | { mode: "shift"; fixedToStat: ArmorStatKey };
          set?: { hash: number; name: string };
          exotic: boolean;
          exoticClassItem: boolean;
          targetMasterworkTier: number;
        };
        theoretical: ArmorPlannerTheoreticalPieceView;
        exactOwnedMatches: ArmorPlannerOwnedMatchView[];
        nearestOwnedMatches: Array<ArmorPlannerOwnedMatchView & {
          identityMismatchCount: number;
          statDistance: number;
          reasons: string[];
        }>;
      }>;
    }
  | {
      kind: "upgrade";
      summary: ArmorPlannerCandidateSummaryView;
      pieces: ArmorPlannerOwnedPieceView[];
      replacementCount: number;
      retainedInstanceIds: string[];
      replacements: Array<{
        slot: ArmorSlot;
        fromInstanceId: string;
        fromName: string;
        toInstanceId: string;
        toName: string;
      }>;
      steps: Array<{
        step: number;
        kind: "replace-piece" | "adjust-armor-mods";
        slot?: ArmorSlot;
        fromInstanceId?: string;
        toInstanceId?: string;
        finalStats: ArmorStatValues;
        totalGap: number;
        maximumGap: number;
        armorSetCoverage: ArmorPlannerSetCoverageView;
        hardConstraintsMet: boolean;
      }>;
    };

export type ArmorPlannerIssueView = {
  code: string;
  message: string;
  pieceId?: string;
};

export type ArmorPlannerSearchView = {
  truncated: boolean;
  statesExamined: number;
  statesRetained: number;
  pieceOptionCounts: Record<ArmorSlot, number>;
};

export type ArmorPlannerViewModel = {
  mode: ArmorPlannerMode;
  outcome: ArmorPlannerOutcome;
  ruleset: {
    id: "armor-3.0";
    version: number;
    sourceReference: string;
    manifestVersion?: string;
  };
  target: ArmorPlannerTargetStatView[];
  candidates: ArmorPlannerCandidateView[];
  candidateCount: number;
  reachableCandidateCount: number;
  warnings: string[];
  issues: ArmorPlannerIssueView[];
  search?: ArmorPlannerSearchView;
  dataQuality?: Record<string, number>;
  baseline?: {
    finalStats: ArmorStatValues;
    stats: ArmorPlannerCandidateStatView[];
    totalGap: number;
    maximumGap: number;
    armorSetCoverage: ArmorPlannerSetCoverageView;
    hardConstraintsMet: boolean;
  };
  minimumReplacementCount?: number;
};

type CandidateLike = Pick<
  ArmorTheoreticalCandidate,
  | "candidate_id"
  | "hard_constraints_met"
  | "final_total"
  | "target_shortfalls"
  | "target_overflows"
  | "total_gap"
  | "maximum_gap"
  | "stat_waste"
  | "armor_mod_usage"
  | "armor_set_coverage"
>;

export function buildArmorPlannerViewModel(
  job: ArmorPlannerWorkspaceJob,
  ruleset: ArmorPlannerRulesetContext,
  result: ArmorPlannerWorkspaceJobResult
): ArmorPlannerViewModel {
  const target = buildTargetView(job.request.target);
  const base = {
    mode: job.mode,
    ruleset: { ...ruleset },
    target
  };

  if (job.mode === "theoretical") {
    const plan = result as ArmorTheoreticalPlanResult;
    const candidates = plan.candidates.map((candidate) => theoreticalCandidateView(candidate, target));
    return finalizeViewModel({
      ...base,
      mode: "theoretical",
      outcome: plan.status,
      candidates,
      warnings: [...plan.warnings],
      issues: issuesView(plan.issues),
      search: searchView(plan.search)
    });
  }
  if (job.mode === "owned") {
    const plan = result as ArmorOwnedPlanResult;
    const candidates = plan.candidates.map((candidate) => ownedCandidateView(candidate, target));
    return finalizeViewModel({
      ...base,
      mode: "owned",
      outcome: plan.status,
      candidates,
      warnings: [...plan.warnings],
      issues: issuesView(plan.issues),
      search: searchView(plan.search),
      dataQuality: { ...plan.data_quality }
    });
  }
  if (job.mode === "acquisition") {
    const plan = result as ArmorAcquisitionPlanResult;
    const candidates = plan.candidates.map((candidate) => acquisitionCandidateView(candidate, target));
    return finalizeViewModel({
      ...base,
      mode: "acquisition",
      outcome: plan.status,
      candidates,
      warnings: uniqueStrings([
        ...plan.theoretical_result.warnings,
        ...plan.warnings
      ]),
      issues: issuesView(plan.theoretical_result.issues),
      search: searchView(plan.theoretical_result.search),
      dataQuality: { ...plan.owned_data }
    });
  }

  const plan = result as ArmorUpgradePlanResult;
  const candidates = plan.candidates.map((candidate) => upgradeCandidateView(candidate, target));
  const baseline = plan.baseline
    ? {
        finalStats: plan.baseline.final_total,
        stats: buildCandidateStats(
          plan.baseline.final_total,
          target,
          plan.baseline.target_shortfalls,
          plan.baseline.target_overflows
        ),
        totalGap: plan.baseline.total_gap,
        maximumGap: plan.baseline.maximum_gap,
        armorSetCoverage: setCoverageView(plan.baseline.armor_set_coverage),
        hardConstraintsMet: plan.baseline.hard_constraints_met
      }
    : undefined;
  return finalizeViewModel({
    ...base,
    mode: "upgrade",
    outcome: plan.status,
    candidates,
    warnings: [...plan.warnings],
    issues: issuesView(plan.issues),
    ...(plan.owned_result ? {
      search: searchView(plan.owned_result.search),
      dataQuality: { ...plan.owned_result.data_quality }
    } : {}),
    ...(baseline ? { baseline } : {}),
    ...(plan.minimum_replacement_count === undefined
      ? {}
      : { minimumReplacementCount: plan.minimum_replacement_count })
  });
}

function finalizeViewModel(input: Omit<
  ArmorPlannerViewModel,
  "candidateCount" | "reachableCandidateCount"
>): ArmorPlannerViewModel {
  return {
    ...input,
    candidateCount: input.candidates.length,
    reachableCandidateCount: input.candidates.filter((candidate) => (
      candidate.summary.hardConstraintsMet
    )).length
  };
}

function theoreticalCandidateView(
  candidate: ArmorTheoreticalCandidate,
  target: readonly ArmorPlannerTargetStatView[]
): Extract<ArmorPlannerCandidateView, { kind: "theoretical" }> {
  return {
    kind: "theoretical",
    summary: candidateSummaryView(candidate, target),
    pieces: candidate.pieces.map(theoreticalPieceView)
  };
}

function ownedCandidateView(
  candidate: ArmorOwnedCandidate,
  target: readonly ArmorPlannerTargetStatView[]
): Extract<ArmorPlannerCandidateView, { kind: "owned" }> {
  return {
    kind: "owned",
    summary: candidateSummaryView(candidate, target),
    pieces: candidate.pieces.map(ownedPieceView),
    equippedCount: candidate.equipped_count,
    transferCount: candidate.transfer_count,
    replacementCount: candidate.replacement_count
  };
}

function acquisitionCandidateView(
  candidate: ArmorAcquisitionCandidate,
  target: readonly ArmorPlannerTargetStatView[]
): Extract<ArmorPlannerCandidateView, { kind: "acquisition" }> {
  return {
    kind: "acquisition",
    summary: candidateSummaryView(candidate.theoretical_candidate, target),
    fulfillmentStatus: candidate.fulfillment_status,
    missingPieceCount: candidate.missing_piece_count,
    upgradePieceCount: candidate.upgrade_piece_count,
    verificationPieceCount: candidate.verification_piece_count,
    pieces: candidate.pieces.map((piece) => ({
      slot: piece.identity.slot,
      acquisitionRequired: piece.acquisition_required,
      identity: {
        ...(piece.identity.item_hash === undefined ? {} : { itemHash: piece.identity.item_hash }),
        ...(piece.identity.item_name ? { itemName: piece.identity.item_name } : {}),
        archetypeId: piece.identity.archetype_id,
        archetypeName: piece.identity.archetype_name,
        tertiaryStat: piece.identity.tertiary_stat,
        tuning: piece.identity.tuning.mode === "plus3"
          ? { mode: "plus3" }
          : { mode: "shift", fixedToStat: piece.identity.tuning.fixed_to_stat },
        ...(piece.identity.set ? { set: { ...piece.identity.set } } : {}),
        exotic: piece.identity.exotic,
        exoticClassItem: piece.identity.exotic_class_item,
        targetMasterworkTier: piece.identity.target_masterwork_tier
      },
      theoretical: theoreticalPieceView(piece.theoretical_choice),
      exactOwnedMatches: piece.exact_owned_matches.map(ownedMatchView),
      nearestOwnedMatches: piece.nearest_owned_matches.map((match) => ({
        ...ownedMatchView(match),
        identityMismatchCount: match.identity_mismatch_count,
        statDistance: match.stat_distance,
        reasons: [...match.reasons]
      }))
    }))
  };
}

function upgradeCandidateView(
  candidate: ArmorUpgradeCandidate,
  target: readonly ArmorPlannerTargetStatView[]
): Extract<ArmorPlannerCandidateView, { kind: "upgrade" }> {
  return {
    kind: "upgrade",
    summary: candidateSummaryView(candidate.owned_candidate, target),
    pieces: candidate.owned_candidate.pieces.map(ownedPieceView),
    replacementCount: candidate.replacement_count,
    retainedInstanceIds: [...candidate.retained_instance_ids],
    replacements: candidate.replacements.map((replacement) => ({
      slot: replacement.slot,
      fromInstanceId: replacement.from_instance_id,
      fromName: replacement.from_name,
      toInstanceId: replacement.to_instance_id,
      toName: replacement.to_name
    })),
    steps: candidate.steps.map((step) => ({
      step: step.step,
      kind: step.kind,
      ...(step.slot ? { slot: step.slot } : {}),
      ...(step.from_instance_id ? { fromInstanceId: step.from_instance_id } : {}),
      ...(step.to_instance_id ? { toInstanceId: step.to_instance_id } : {}),
      finalStats: step.final_total,
      totalGap: step.total_gap,
      maximumGap: step.maximum_gap,
      armorSetCoverage: setCoverageView(step.armor_set_coverage),
      hardConstraintsMet: step.hard_constraints_met
    }))
  };
}

function candidateSummaryView(
  candidate: CandidateLike,
  target: readonly ArmorPlannerTargetStatView[]
): ArmorPlannerCandidateSummaryView {
  return {
    candidateId: candidate.candidate_id,
    hardConstraintsMet: candidate.hard_constraints_met,
    finalStats: candidate.final_total,
    stats: buildCandidateStats(
      candidate.final_total,
      target,
      candidate.target_shortfalls,
      candidate.target_overflows
    ),
    totalGap: candidate.total_gap,
    maximumGap: candidate.maximum_gap,
    statWaste: candidate.stat_waste,
    armorModUsage: { ...candidate.armor_mod_usage },
    armorSetCoverage: setCoverageView(candidate.armor_set_coverage)
  };
}

function theoreticalPieceView(
  choice: ArmorTheoreticalPieceChoice
): ArmorPlannerTheoreticalPieceView {
  const configuration = choice.configuration;
  return {
    kind: "theoretical",
    configurationId: configuration.configuration_id,
    slot: configuration.slot,
    ...(configuration.item_hash === undefined ? {} : { itemHash: configuration.item_hash }),
    name: configuration.name,
    exotic: configuration.exotic,
    exoticClassItem: configuration.exotic_class_item,
    ...(configuration.set ? { set: { ...configuration.set } } : {}),
    archetype: {
      id: configuration.archetype.id,
      name: configuration.archetype.name,
      primaryStat: configuration.archetype.primary_stat,
      secondaryStat: configuration.archetype.secondary_stat,
      tertiaryStat: configuration.archetype.tertiary_stat
    },
    masterworkTier: configuration.masterwork_tier,
    tuning: configuration.tuning.mode === "plus3"
      ? { mode: "plus3" }
      : {
          mode: "shift",
          fromStat: configuration.tuning.from_stat,
          toStat: configuration.tuning.to_stat,
          ...(configuration.tuning.rolled_to_stat
            ? { rolledToStat: configuration.tuning.rolled_to_stat }
            : {})
        },
    ...(configuration.armor_stat_mod
      ? { armorStatMod: { ...configuration.armor_stat_mod } }
      : {}),
    energy: {
      capacity: configuration.energy.capacity,
      reserved: configuration.energy.reserved,
      armorStatMod: configuration.energy.armor_stat_mod,
      final: configuration.energy.final,
      remaining: configuration.energy.remaining
    },
    rawStats: configuration.stats.raw,
    finalStats: configuration.stats.final,
    equivalentIdentityIds: [...choice.equivalent_identity_ids],
    equivalentIdentityCount: choice.equivalent_identity_count
  };
}

function ownedPieceView(piece: ArmorOwnedPieceChoice): ArmorPlannerOwnedPieceView {
  return {
    kind: "owned",
    instanceId: piece.instance_id,
    itemHash: piece.item_hash,
    name: piece.name,
    slot: piece.slot,
    location: piece.location,
    ...(piece.source_character_id ? { sourceCharacterId: piece.source_character_id } : {}),
    exotic: piece.exotic,
    exoticClassItem: piece.exotic_class_item,
    ...(piece.set ? { set: { ...piece.set } } : {}),
    observedFinalStats: piece.observed_final,
    finalStats: piece.final,
    ...(piece.applied_tuning ? {
      tuning: {
        mode: piece.applied_tuning.mode,
        ...(piece.applied_tuning.from_stat ? { fromStat: piece.applied_tuning.from_stat } : {}),
        ...(piece.applied_tuning.to_stat ? { toStat: piece.applied_tuning.to_stat } : {}),
        plugHash: piece.applied_tuning.source_plug_hash
      }
    } : {}),
    ...(piece.applied_armor_stat_mod
      ? {
          armorStatMod: {
            stat: piece.applied_armor_stat_mod.stat,
            value: piece.applied_armor_stat_mod.value,
            plugHash: piece.applied_armor_stat_mod.source_plug_hash,
            socketIndex: piece.applied_armor_stat_mod.socket_index,
            energyCost: piece.applied_armor_stat_mod.energy_cost
          }
        }
      : {}),
    ...(piece.armor_stat_mod_socket_plug_hash === undefined
      ? {}
      : { armorStatModSocketPlugHash: piece.armor_stat_mod_socket_plug_hash }),
    plannedNonStatPlugHashes: [...piece.planned_non_stat_plug_hashes],
    energy: {
      capacity: piece.energy.capacity,
      reserved: piece.energy.reserved,
      armorStatMod: piece.energy.armor_stat_mod,
      final: piece.energy.final,
      remaining: piece.energy.remaining
    }
  };
}

function ownedMatchView(match: ArmorAcquisitionOwnedMatch): ArmorPlannerOwnedMatchView {
  return {
    instanceId: match.instance_id,
    itemHash: match.item_hash,
    name: match.name,
    slot: match.slot,
    location: match.location,
    ...(match.source_character_id ? { sourceCharacterId: match.source_character_id } : {}),
    ...(match.set ? { set: { ...match.set } } : {}),
    ...(match.current_masterwork_tier === undefined
      ? {}
      : { currentMasterworkTier: match.current_masterwork_tier }),
    targetMasterworkTier: match.target_masterwork_tier,
    upgradeStatus: match.upgrade_status,
    ...(match.masterwork_tiers_required === undefined
      ? {}
      : { masterworkTiersRequired: match.masterwork_tiers_required })
  };
}

function buildTargetView(
  target: ArmorPlannerWorkspaceJob["request"]["target"]
): ArmorPlannerTargetStatView[] {
  return armorStatKeys.flatMap((key) => {
    const constraint = target[key];
    if (!constraint) return [];
    return [{
      key,
      ...(constraint.minimum === undefined ? {} : { minimum: constraint.minimum }),
      ...(constraint.maximum === undefined ? {} : { maximum: constraint.maximum }),
      ...(constraint.exact === undefined ? {} : { exact: constraint.exact })
    }];
  });
}

function buildCandidateStats(
  values: ArmorStatValues,
  target: readonly ArmorPlannerTargetStatView[],
  shortfalls: Partial<Record<ArmorStatKey, number>>,
  overflows: Partial<Record<ArmorStatKey, number>>
): ArmorPlannerCandidateStatView[] {
  const targetByKey = new Map(target.map((entry) => [entry.key, entry]));
  return armorStatKeys.map((key) => {
    const constraint = targetByKey.get(key);
    const shortfall = shortfalls[key] ?? 0;
    const overflow = overflows[key] ?? 0;
    return {
      key,
      value: values[key],
      ...(constraint?.minimum === undefined ? {} : { minimum: constraint.minimum }),
      ...(constraint?.maximum === undefined ? {} : { maximum: constraint.maximum }),
      ...(constraint?.exact === undefined ? {} : { exact: constraint.exact }),
      shortfall,
      overflow,
      meetsTarget: shortfall === 0 && overflow === 0
    };
  });
}

function setCoverageView(coverage: ArmorSetCoverage): ArmorPlannerSetCoverageView {
  return {
    mode: coverage.mode,
    satisfied: coverage.satisfied,
    totalMissingPieceCount: coverage.total_missing_piece_count,
    requirements: coverage.requirements.map((requirement) => ({
      setHash: requirement.set_hash,
      name: requirement.name,
      minimumPieceCount: requirement.minimum_piece_count,
      actualPieceCount: requirement.actual_piece_count,
      missingPieceCount: requirement.missing_piece_count,
      satisfied: requirement.satisfied
    }))
  };
}

function searchView(search: {
  truncated: boolean;
  states_examined: number;
  states_retained: number;
  piece_option_counts: Record<ArmorSlot, number>;
}): ArmorPlannerSearchView {
  return {
    truncated: search.truncated,
    statesExamined: search.states_examined,
    statesRetained: search.states_retained,
    pieceOptionCounts: { ...search.piece_option_counts }
  };
}

function uniqueStrings(values: readonly string[]): string[] {
  return [...new Set(values)];
}

function issuesView(
  issues: readonly { code: string; message: string; piece_id?: string }[]
): ArmorPlannerIssueView[] {
  return issues.map((issue) => ({
    code: issue.code,
    message: issue.message,
    ...(issue.piece_id ? { pieceId: issue.piece_id } : {})
  }));
}
