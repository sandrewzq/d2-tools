import { createHash } from "node:crypto";
import type {
  ArmorPlannerClient,
  ArmorPlannerClientRunRequest,
  ArmorPlannerClientRunResult,
  ArmorPlannerRulesetContext,
  ArmorPlannerWorkspaceJob,
  ArmorPlannerWorkspaceJobResult
} from "@d2-tools/app/armor";
import {
  normalizeAccountArmorPieces,
  type ArmorPieceSnapshot
} from "@d2-tools/core/armor";
import { createServiceError } from "@d2-tools/services";
import type {
  ArmorPlannerJob,
  ArmorPlannerSourceRevision
} from "@d2-tools/services/armor/planner";
import { getArmorPlannerAccountSummary } from "./accountSession.js";
import {
  invalidateArmorPlannerRuntime,
  planArmorInWorker
} from "./armorPlannerRuntime.js";
import { getArmorPlannerManifestData } from "./gameDataRuntime.js";

export const desktopArmorPlannerClient: ArmorPlannerClient = {
  plan: planArmorWorkspaceInRuntime,
  invalidate(scopeId?: string): void {
    invalidateArmorPlannerRuntime(scopeId);
  }
};

export async function planArmorWorkspaceInRuntime<Job extends ArmorPlannerWorkspaceJob>(
  request: ArmorPlannerClientRunRequest<Job>
): Promise<ArmorPlannerClientRunResult<Job>> {
  const manifest = await getArmorPlannerManifestData();
  if (manifest.status !== "ready") {
    throw createServiceError({
      code: "manifest_unavailable",
      message: manifest.warnings[0] ?? "当前资料库无法构建完整的 Armor 3.0 规则集",
      retryable: true,
      causeCategory: "unavailable",
      details: {
        manifestVersion: manifest.manifest_version,
        archetypeCount: manifest.archetype_count,
        matchedPlugCount: manifest.matched_plug_count
      }
    });
  }

  const needsAccount = request.job.mode !== "theoretical";
  let account = needsAccount ? await getArmorPlannerAccountSummary("cached") : null;
  let pieces = account
    ? normalizeAccountArmorPieces(account, manifest.ruleset)
    : [];
  if (account && armorSnapshotNeedsRefresh(pieces)) {
    account = await getArmorPlannerAccountSummary("refresh");
    pieces = normalizeAccountArmorPieces(account, manifest.ruleset);
  }
  const resolvedJob = resolvePlannerJob(request.job, manifest.ruleset, manifest.armor_set_catalog, pieces);
  const sources: ArmorPlannerSourceRevision = {
    manifest: manifest.manifest_version,
    ruleset: manifest.source_revision,
    ...(account ? { account: accountSourceRevision(account.destiny_membership_id, pieces) } : {})
  };
  const response = await planArmorInWorker({
    scope_id: request.scopeId,
    revision: request.revision,
    sources,
    job: resolvedJob
  });
  return {
    status: response.status,
    scopeId: response.scope_id,
    revision: response.revision,
    resultId: response.result_id,
    cacheKey: response.cache_key,
    fromCache: response.from_cache,
    checkedAt: response.checked_at,
    expiresAt: response.expires_at,
    sources,
    ruleset: rulesetContext(manifest.ruleset),
    result: response.result as ArmorPlannerWorkspaceJobResult<Job>
  };
}

function resolvePlannerJob(
  job: ArmorPlannerWorkspaceJob,
  ruleset: Parameters<typeof normalizeAccountArmorPieces>[1],
  armorSetCatalog: Awaited<ReturnType<typeof getArmorPlannerManifestData>>["armor_set_catalog"],
  pieces: readonly ArmorPieceSnapshot[]
): ArmorPlannerJob {
  if (job.mode === "theoretical") {
    return {
      mode: "theoretical",
      request: {
        ...job.request,
        ruleset,
        armor_set_catalog: armorSetCatalog
      }
    };
  }
  if (job.mode === "owned") {
    return {
      mode: "owned",
      request: {
        ...job.request,
        ruleset,
        pieces,
        armor_set_catalog: armorSetCatalog
      }
    };
  }
  if (job.mode === "acquisition") {
    return {
      mode: "acquisition",
      request: {
        ...job.request,
        ruleset,
        owned_pieces: pieces,
        armor_set_catalog: armorSetCatalog
      }
    };
  }
  return {
    mode: "upgrade",
    request: {
      ...job.request,
      ruleset,
      pieces,
      armor_set_catalog: armorSetCatalog
    }
  };
}

function rulesetContext(
  ruleset: Parameters<typeof normalizeAccountArmorPieces>[1]
): ArmorPlannerRulesetContext {
  return {
    id: ruleset.ruleset_id,
    version: ruleset.version,
    sourceReference: ruleset.source.reference,
    ...(ruleset.manifest?.version ? { manifestVersion: ruleset.manifest.version } : {})
  };
}

function accountSourceRevision(
  membershipId: string,
  pieces: readonly ArmorPieceSnapshot[]
): string {
  const fingerprint = createHash("sha256")
    .update(JSON.stringify(pieces.map((piece) => ({
      instance_id: piece.instance_id,
      item_hash: piece.item_hash,
      slot: piece.slot,
      location: piece.location,
      source_character_id: piece.source_character_id,
      final: piece.stats.final,
      archetype: piece.archetype?.id,
      tuning: piece.tuning,
      installation: {
        gear_tier: piece.installation.gear_tier,
        energy_capacity: piece.installation.energy_capacity,
        reserved_energy: piece.installation.reserved_energy,
        armor_stat_mod_options: piece.installation.armor_stat_mod_options.map((option) => ({
          plug_hash: option.source_plug_hash,
          value: option.value,
          stat: option.stat,
          energy_cost: option.energy_cost
        })),
        armor_stat_mod_clear_plug_hashes: piece.installation.armor_stat_mod_clear_options.map((plug) => plug.plug_hash),
        tuning_plug_hashes: piece.installation.tuning_options.map((option) => option.tuning.source_plug_hash),
        available_non_stat_plugs: piece.installation.available_non_stat_plugs.map((plug) => ({
          plug_hash: plug.plug_hash,
          socket_index: plug.socket_index,
          energy_cost: plug.energy_cost
        }))
      },
      set_hash: piece.set?.hash
    })).sort((left, right) => (
      (left.instance_id ?? "").localeCompare(right.instance_id ?? "")
      || left.item_hash - right.item_hash
    ))))
    .digest("hex");
  return `${membershipId}:${fingerprint}`;
}

function armorSnapshotNeedsRefresh(pieces: readonly ArmorPieceSnapshot[]): boolean {
  return pieces.some((piece) => (
    piece.quality.owned_ready
    && (!piece.quality.checks.has_base_stats
      || !piece.quality.checks.has_energy_capacity
      || !piece.quality.checks.has_stat_mod_socket
      || !piece.installation.armor_stat_mod_clear_options.length
      || (piece.installation.gear_tier === 5 && !piece.installation.tuning_options.length))
  ));
}
