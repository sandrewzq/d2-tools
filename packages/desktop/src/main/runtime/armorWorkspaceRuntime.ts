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
import {
  loadCachedArmorPieces,
  saveCachedArmorPieces,
  type ArmorPiecesIdentity
} from "@d2-tools/services/account/armorPiecesStore";
import { loadConfig } from "@d2-tools/services/config/store";
import { loadOAuthToken } from "@d2-tools/services/oauth/tokenStore";
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
  const resolved = needsAccount
    ? await resolveArmorPieces(manifest)
    : { pieces: [] as ArmorPieceSnapshot[], membershipId: undefined, degraded: false };
  const pieces = resolved.pieces;
  const accountRefreshDegraded = resolved.degraded;
  const resolvedJob = resolvePlannerJob(request.job, manifest.ruleset, manifest.armor_set_catalog, pieces);
  const sources: ArmorPlannerSourceRevision = {
    manifest: manifest.manifest_version,
    ruleset: manifest.source_revision,
    ...(resolved.membershipId
      ? { account: accountSourceRevision(resolved.membershipId, pieces) }
      : {})
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
    result: withAccountRefreshWarning(
      response.result as ArmorPlannerWorkspaceJobResult<Job>,
      accountRefreshDegraded
    )
  };
}

/**
 * 账号护甲数据刷新的整体时限。
 *
 * 链路里每一步各有 30 秒超时（`packages/services/src/bungie/client.ts:73`），但**整段没有上限**：
 * token、membership、profile、资料库串起来最坏是几分钟，而求解必须等它结束。玩家看到的就是一个
 * 不能取消、也没有进度的「计算中」。超过这个时限就退回上一次同步的账号继续算，把降级写进
 * `warnings` 让界面说明原因 —— 宁可给一份基于旧数据的结果，也不要无限等。
 */
const accountRefreshDeadlineMs = 20_000;

async function refreshArmorSnapshotWithinDeadline(
  fallback: Awaited<ReturnType<typeof getArmorPlannerAccountSummary>>
): Promise<{ account: Awaited<ReturnType<typeof getArmorPlannerAccountSummary>>; degraded: boolean }> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const refreshed = await Promise.race([
      getArmorPlannerAccountSummary("refresh").then((account) => ({ account })),
      new Promise<null>((resolve) => {
        timer = setTimeout(() => resolve(null), accountRefreshDeadlineMs);
      })
    ]);
    if (refreshed) return { account: refreshed.account, degraded: false };
    console.warn(
      `[armor-planner] 账号护甲数据刷新超过 ${accountRefreshDeadlineMs} ms，本次改用上次同步的账号数据。`
    );
  } catch (error) {
    console.warn("[armor-planner] 账号护甲数据刷新失败，本次改用上次同步的账号数据。", error);
  } finally {
    clearTimeout(timer);
  }
  return { account: fallback, degraded: true };
}

/**
 * 拿到这次求解要用的护甲棋子。
 *
 * 先读本地棋子缓存，没有才走账号摘要那条老路，拿到结果顺手落盘。账号摘要是「当前账号的完整
 * profile」，一次全量 GetProfile；命中本地缓存时这一步整个跳过，连带的「先 `cached` 再
 * `refresh`」两次拉取也一并消失。缓存只在这份账号数据里有效，超过 `armorPiecesMaxAgeMs`
 * 就作废重取。
 */
async function resolveArmorPieces(
  manifest: Awaited<ReturnType<typeof getArmorPlannerManifestData>>
): Promise<{ pieces: ArmorPieceSnapshot[]; membershipId?: string; degraded: boolean }> {
  const identity = armorPiecesIdentity(manifest);
  if (identity) {
    const cached = await loadCachedArmorPieces(identity.dataDir, identity.cacheKey);
    if (cached) {
      return {
        pieces: cached.pieces,
        membershipId: cached.destiny_membership_id,
        degraded: false
      };
    }
  }

  let account = await getArmorPlannerAccountSummary("cached");
  let pieces = normalizeAccountArmorPieces(account, manifest.ruleset);
  let degraded = false;
  if (armorSnapshotNeedsRefresh(pieces)) {
    const refreshed = await refreshArmorSnapshotWithinDeadline(account);
    account = refreshed.account;
    degraded = refreshed.degraded;
    pieces = normalizeAccountArmorPieces(account, manifest.ruleset);
  }
  if (identity && !degraded) {
    // 落盘不参与这次求解，失败也不该挡住结果。
    void saveCachedArmorPieces(
      identity.dataDir,
      identity.cacheKey,
      { destinyMembershipId: account.destiny_membership_id, pieces }
    ).catch(() => undefined);
  }
  return { pieces, membershipId: account.destiny_membership_id, degraded };
}

/**
 * 棋子缓存的账号作用域。取不到账号身份就不落盘、也不读缓存 —— 缓存按账号隔离，
 * 换个账号绝不能拿上一个人的护甲去算。
 */
function armorPiecesIdentity(
  manifest: Awaited<ReturnType<typeof getArmorPlannerManifestData>>
): { dataDir: string; cacheKey: ArmorPiecesIdentity } | undefined {
  const dataDir = loadConfig().data.data_dir;
  const accountId = loadOAuthToken(dataDir)?.membership_id;
  if (!accountId) return undefined;
  return {
    dataDir,
    cacheKey: {
      accountId,
      manifestVersion: manifest.manifest_version,
      rulesetId: manifest.ruleset.ruleset_id,
      rulesetVersion: manifest.ruleset.version
    }
  };
}

/**
 * 降级只影响账号数据的来源，不改变求解本身。结果类型四种都带 `warnings`，界面上已有渲染位置
 * （`LoadoutsPageContentView` 的警告区），所以直接挂进原有通道，不新开提示位。
 */
function withAccountRefreshWarning<Job extends ArmorPlannerWorkspaceJob>(
  result: ArmorPlannerWorkspaceJobResult<Job>,
  degraded: boolean
): ArmorPlannerWorkspaceJobResult<Job> {
  if (!degraded) return result;
  const warnings = (result as { warnings?: string[] }).warnings;
  if (!Array.isArray(warnings)) return result;
  return {
    ...result,
    warnings: [...warnings, "账号护甲数据未能刷新，本次结果基于上次同步的账号数据。"]
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
