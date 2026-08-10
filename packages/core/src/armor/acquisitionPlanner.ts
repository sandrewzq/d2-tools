import type { ArmorStatKey } from "../loadouts/analysis.js";
import {
  armorStatKeys,
  type ArmorClass,
  type ArmorLocation,
  type ArmorPieceSnapshot,
  type ArmorSlot
} from "./model.js";
import {
  planTheoreticalArmor,
  type ArmorTheoreticalCandidate,
  type ArmorTheoreticalPieceChoice,
  type ArmorTheoreticalPlanRequest,
  type ArmorTheoreticalPlanResult
} from "./theoreticalPlanner.js";

export type ArmorAcquisitionPlanRequest = ArmorTheoreticalPlanRequest & {
  owned_pieces: readonly ArmorPieceSnapshot[];
  owned_allowed_locations?: readonly ArmorLocation[];
  nearest_owned_limit?: number;
};

export type ArmorAcquisitionIdentity = {
  slot: ArmorSlot;
  class: ArmorClass;
  item_hash?: number;
  item_name?: string;
  archetype_id: string;
  archetype_name: string;
  tertiary_stat: ArmorStatKey;
  tuning: { mode: "plus3" } | { mode: "shift"; fixed_to_stat: ArmorStatKey };
  set?: { hash: number; name: string };
  exotic: boolean;
  exotic_class_item: boolean;
  target_masterwork_tier: number;
};

export type ArmorAcquisitionOwnedMatch = {
  instance_id: string;
  item_hash: number;
  name: string;
  slot: ArmorSlot;
  location: ArmorLocation;
  source_character_id?: string;
  set?: { hash: number; name: string };
  current_masterwork_tier?: number;
  target_masterwork_tier: number;
  upgrade_status: "ready" | "required" | "unknown";
  masterwork_tiers_required?: number;
};

export type ArmorAcquisitionNearestMatch = ArmorAcquisitionOwnedMatch & {
  identity_mismatch_count: number;
  stat_distance: number;
  reasons: string[];
};

export type ArmorAcquisitionPiecePlan = {
  theoretical_choice: ArmorTheoreticalPieceChoice;
  identity: ArmorAcquisitionIdentity;
  acquisition_required: boolean;
  exact_owned_matches: ArmorAcquisitionOwnedMatch[];
  nearest_owned_matches: ArmorAcquisitionNearestMatch[];
};

export type ArmorAcquisitionCandidate = {
  candidate_id: string;
  theoretical_candidate: ArmorTheoreticalCandidate;
  fulfillment_status: "owned" | "upgrade-only" | "verification-required" | "acquisition-required";
  missing_piece_count: number;
  upgrade_piece_count: number;
  verification_piece_count: number;
  pieces: ArmorAcquisitionPiecePlan[];
};

export type ArmorAcquisitionPlanResult = {
  status: ArmorTheoreticalPlanResult["status"];
  theoretical_result: ArmorTheoreticalPlanResult;
  candidates: ArmorAcquisitionCandidate[];
  owned_data: {
    input_piece_count: number;
    eligible_piece_count: number;
    excluded_without_identity: number;
    excluded_by_class: number;
    excluded_by_location: number;
  };
  warnings: string[];
};

export function planArmorAcquisition(
  request: ArmorAcquisitionPlanRequest
): ArmorAcquisitionPlanResult {
  const theoreticalResult = planTheoreticalArmor(request);
  const ownedData = summarizeOwnedData(request);
  const ownedPieces = eligibleOwnedPieces(request);
  const nearestLimit = normalizeLimit(request.nearest_owned_limit, 2, 5);
  const candidates = theoreticalResult.candidates.map((candidate) => {
    const pieces = candidate.pieces.map((choice) => buildPiecePlan(
      choice,
      request.class,
      ownedPieces,
      nearestLimit
    ));
    const missingPieceCount = pieces.filter((piece) => piece.acquisition_required).length;
    const upgradePieceCount = pieces.filter((piece) => pieceFulfillment(piece) === "upgrade").length;
    const verificationPieceCount = pieces.filter((piece) => pieceFulfillment(piece) === "unknown").length;
    return {
      candidate_id: candidate.candidate_id,
      theoretical_candidate: candidate,
      fulfillment_status: missingPieceCount > 0
        ? "acquisition-required" as const
        : verificationPieceCount > 0
          ? "verification-required" as const
        : upgradePieceCount > 0
          ? "upgrade-only" as const
          : "owned" as const,
      missing_piece_count: missingPieceCount,
      upgrade_piece_count: upgradePieceCount,
      verification_piece_count: verificationPieceCount,
      pieces
    };
  }).sort((left, right) => (
    (left.theoretical_candidate.hard_constraints_met ? 0 : 1)
    - (right.theoretical_candidate.hard_constraints_met ? 0 : 1)
    || left.missing_piece_count - right.missing_piece_count
    || left.verification_piece_count - right.verification_piece_count
    || left.upgrade_piece_count - right.upgrade_piece_count
    || left.theoretical_candidate.total_gap - right.theoretical_candidate.total_gap
    || left.candidate_id.localeCompare(right.candidate_id)
  ));
  const warnings: string[] = [];
  if (ownedData.excluded_without_identity > 0) {
    warnings.push(
      `有 ${ownedData.excluded_without_identity} 件真实护甲缺少可确认的框架、第三属性或调整身份，未用于“已有同身份”判断。`
    );
  }
  if (theoreticalResult.status === "indeterminate") {
    warnings.push("理论搜索已截断，当前待刷身份只对应已保留候选，不代表全局唯一最优获取目标。");
  }
  return {
    status: theoreticalResult.status,
    theoretical_result: theoreticalResult,
    candidates,
    owned_data: ownedData,
    warnings
  };
}

function buildPiecePlan(
  choice: ArmorTheoreticalPieceChoice,
  targetClass: ArmorClass,
  ownedPieces: readonly ArmorPieceSnapshot[],
  nearestLimit: number
): ArmorAcquisitionPiecePlan {
  const identity = acquisitionIdentity(choice);
  const sameSlotPieces = ownedPieces.filter((piece) => (
    piece.slot === identity.slot && classMatches(targetClass, piece.class)
  ));
  const ranked = sameSlotPieces
    .map((piece) => scoreOwnedPiece(piece, choice))
    .sort(compareScoredOwnedPieces);
  const exactOwnedMatches = ranked
    .filter((entry) => entry.identity_mismatch_count === 0)
    .slice(0, nearestLimit)
    .map((entry) => ownedMatch(entry.piece, choice));
  const nearestOwnedMatches = ranked
    .filter((entry) => entry.identity_mismatch_count > 0)
    .slice(0, nearestLimit)
    .map((entry) => ({
      ...ownedMatch(entry.piece, choice),
      identity_mismatch_count: entry.identity_mismatch_count,
      stat_distance: entry.stat_distance,
      reasons: entry.reasons
    }));
  return {
    theoretical_choice: choice,
    identity,
    acquisition_required: exactOwnedMatches.length === 0,
    exact_owned_matches: exactOwnedMatches,
    nearest_owned_matches: nearestOwnedMatches
  };
}

function acquisitionIdentity(choice: ArmorTheoreticalPieceChoice): ArmorAcquisitionIdentity {
  const configuration = choice.configuration;
  return {
    slot: configuration.slot,
    class: configuration.class,
    item_hash: configuration.item_hash,
    item_name: configuration.item_hash === undefined ? undefined : configuration.name,
    archetype_id: configuration.archetype.id,
    archetype_name: configuration.archetype.name,
    tertiary_stat: configuration.archetype.tertiary_stat,
    tuning: configuration.tuning.mode === "plus3"
      ? { mode: "plus3" }
      : { mode: "shift", fixed_to_stat: configuration.tuning.to_stat },
    set: configuration.set ? { ...configuration.set } : undefined,
    exotic: configuration.exotic,
    exotic_class_item: configuration.exotic_class_item,
    target_masterwork_tier: configuration.masterwork_tier
  };
}

function scoreOwnedPiece(
  piece: ArmorPieceSnapshot,
  choice: ArmorTheoreticalPieceChoice
): {
  piece: ArmorPieceSnapshot;
  identity_mismatch_count: number;
  stat_distance: number;
  reasons: string[];
} {
  const configuration = choice.configuration;
  const reasons: string[] = [];
  if (configuration.item_hash !== undefined
    && toUnsignedHash(piece.item_hash) !== toUnsignedHash(configuration.item_hash)) {
    reasons.push("指定装备不同");
  }
  if (piece.archetype?.id !== configuration.archetype.id) reasons.push("护甲框架不同");
  if (piece.archetype?.tertiary_stat !== configuration.archetype.tertiary_stat) {
    reasons.push("第三属性不同");
  }
  if (!tuningMatches(piece, choice)) reasons.push("调整身份不同");
  if (!setMatches(piece, choice)) reasons.push("套装身份不同");
  if (piece.exotic !== configuration.exotic) reasons.push("异域类型不同");
  if (piece.exotic_class_item !== configuration.exotic_class_item) reasons.push("异域职业物品类型不同");
  return {
    piece,
    identity_mismatch_count: reasons.length,
    stat_distance: statDistance(piece, choice),
    reasons
  };
}

function tuningMatches(piece: ArmorPieceSnapshot, choice: ArmorTheoreticalPieceChoice): boolean {
  const target = choice.configuration.tuning;
  if (target.mode === "plus3") return piece.tuning?.mode === "plus3";
  return piece.tuning?.mode === "shift" && piece.tuning.rolled_to_stat === target.to_stat;
}

function setMatches(piece: ArmorPieceSnapshot, choice: ArmorTheoreticalPieceChoice): boolean {
  const targetHash = choice.configuration.set?.hash;
  const pieceHash = piece.set?.hash;
  if (targetHash === undefined) return true;
  if (pieceHash === undefined) return false;
  return toUnsignedHash(targetHash) === toUnsignedHash(pieceHash);
}

function statDistance(piece: ArmorPieceSnapshot, choice: ArmorTheoreticalPieceChoice): number {
  const target = choice.configuration.stats.raw;
  const actual = piece.stats.base ?? piece.stats.final;
  return armorStatKeys.reduce((total, stat) => total + Math.abs(target[stat] - actual[stat]), 0);
}

function ownedMatch(
  piece: ArmorPieceSnapshot,
  choice: ArmorTheoreticalPieceChoice
): ArmorAcquisitionOwnedMatch {
  const targetTier = choice.configuration.masterwork_tier;
  const currentTier = piece.masterwork?.tier;
  const upgradeStatus = currentTier === undefined
    ? "unknown" as const
    : currentTier >= targetTier
      ? "ready" as const
      : "required" as const;
  return {
    instance_id: piece.instance_id!,
    item_hash: piece.item_hash,
    name: piece.name,
    slot: piece.slot!,
    location: piece.location,
    source_character_id: piece.source_character_id,
    set: piece.set ? { ...piece.set } : undefined,
    current_masterwork_tier: currentTier,
    target_masterwork_tier: targetTier,
    upgrade_status: upgradeStatus,
    ...(currentTier !== undefined && currentTier < targetTier
      ? { masterwork_tiers_required: targetTier - currentTier }
      : {})
  };
}

function eligibleOwnedPieces(request: ArmorAcquisitionPlanRequest): ArmorPieceSnapshot[] {
  const allowedLocations = new Set(request.owned_allowed_locations?.length
    ? request.owned_allowed_locations
    : ["equipped", "inventory", "vault", "postmaster"] as const);
  return request.owned_pieces.filter((piece) => (
    Boolean(piece.instance_id && piece.slot)
    && piece.quality.owned_ready
    && piece.quality.acquisition_identity_ready
    && classMatches(request.class, piece.class)
    && allowedLocations.has(piece.location)
  ));
}

function summarizeOwnedData(
  request: ArmorAcquisitionPlanRequest
): ArmorAcquisitionPlanResult["owned_data"] {
  const allowedLocations = new Set(request.owned_allowed_locations?.length
    ? request.owned_allowed_locations
    : ["equipped", "inventory", "vault", "postmaster"] as const);
  const result = {
    input_piece_count: request.owned_pieces.length,
    eligible_piece_count: 0,
    excluded_without_identity: 0,
    excluded_by_class: 0,
    excluded_by_location: 0
  };
  for (const piece of request.owned_pieces) {
    if (!classMatches(request.class, piece.class)) {
      result.excluded_by_class += 1;
    } else if (!allowedLocations.has(piece.location)) {
      result.excluded_by_location += 1;
    } else if (!piece.instance_id || !piece.slot || !piece.quality.owned_ready
      || !piece.quality.acquisition_identity_ready) {
      result.excluded_without_identity += 1;
    } else {
      result.eligible_piece_count += 1;
    }
  }
  return result;
}

function compareScoredOwnedPieces(
  left: ReturnType<typeof scoreOwnedPiece>,
  right: ReturnType<typeof scoreOwnedPiece>
): number {
  return left.identity_mismatch_count - right.identity_mismatch_count
    || left.stat_distance - right.stat_distance
    || locationRank(left.piece.location) - locationRank(right.piece.location)
    || left.piece.name.localeCompare(right.piece.name, "zh-Hans-CN")
    || left.piece.instance_id!.localeCompare(right.piece.instance_id!);
}

function locationRank(location: ArmorLocation): number {
  return { equipped: 0, inventory: 1, vault: 2, postmaster: 3 }[location];
}

function classMatches(target: ArmorClass, piece: ArmorClass): boolean {
  return target === "any" || target === piece || piece === "any";
}

function pieceFulfillment(piece: ArmorAcquisitionPiecePlan): "owned" | "upgrade" | "unknown" | "missing" {
  if (piece.acquisition_required) return "missing";
  if (piece.exact_owned_matches.some((match) => match.upgrade_status === "ready")) return "owned";
  if (piece.exact_owned_matches.some((match) => match.upgrade_status === "required")) return "upgrade";
  return "unknown";
}

function normalizeLimit(value: number | undefined, fallback: number, maximum: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(maximum, Math.max(1, Math.trunc(value!)));
}

function toUnsignedHash(value: number): number {
  return Number.isFinite(value) ? value >>> 0 : 0;
}
