import { useEffect, useRef, useState } from "react";
import { loadAccountWorkspace, loadAccountDerivedWorkspace } from "@d2-tools/app/account";
import type { VaultRecommendationScanState } from "@d2-tools/app/account";
import {
  api } from "../../api/client";
import type { AccountItemActionPatch, AccountSummary, ActivityHistorySummary, DimWishlist, EquipmentTargetStore, StartupState, VaultItemInstanceMatchInfo, LocalTargetRules, VaultTags } from "../../api/types";
import { createEmptyEquipmentTargetStore } from "@d2-tools/core/targets/equipmentTargets";
import { services } from "../../api/services";
import {
  applyCommittedAccountEntityPatches,
  confirmCommittedAccountEntityPatches,
  getAccountStoreRevision,
  getAccountSummarySnapshot,
  replaceAccountSummary,
  useAccountSummaryStore
} from "../../shared/stores/accountEntityStore";
import { formatBungieLoginError } from "./loginErrors";

type DiagnosticsBridge = {
  refreshDiagnostics: () => Promise<void>;
};

type AccountRefreshReason = "initial" | "manual" | "write-action";

export function useAccountWorkspace(input: {
  state: StartupState;
  diagnostics: DiagnosticsBridge;
  onLoginComplete: () => void;
  onManifestInitialized: () => void;
}) {
  const [loginMessage, setLoginMessage] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [manifestMessage, setManifestMessage] = useState("");
  const [manifestError, setManifestError] = useState("");
  const [isInitializingManifest, setIsInitializingManifest] = useState(false);
  const accountSummary = useAccountSummaryStore();
  const [vaultTags, setVaultTags] = useState<VaultTags>({ items: {} });
  const [localTargetRules, setLocalTargetRules] = useState<LocalTargetRules>({
    action_policy: "notify_only",
    armor: [],
    weapons: []
  });
  const [equipmentTargetStore, setEquipmentTargetStore] = useState<EquipmentTargetStore>(() => createEmptyEquipmentTargetStore());
  const [accountError, setAccountError] = useState("");
  const [accountSyncMessage, setAccountSyncMessage] = useState("");
  const [accountWarning, setAccountWarning] = useState("");
  const [isLoadingAccount, setIsLoadingAccount] = useState(false);
  const [isShowingCachedAccount, setIsShowingCachedAccount] = useState(false);
  const [lastAccountLoadedAt, setLastAccountLoadedAt] = useState<Date | null>(null);
  const [selectedCharacterId, setSelectedCharacterId] = useState("");
  const [activitySummary, setActivitySummary] = useState<ActivityHistorySummary | null>(null);
  const [activityMessage, setActivityMessage] = useState("");
  const [activityError, setActivityError] = useState("");
  const [importedWishlist, setImportedWishlist] = useState<DimWishlist | null>(null);
  const [vaultCommunityInstanceMatch, setVaultCommunityInstanceMatch] = useState<Map<string, VaultItemInstanceMatchInfo>>(new Map());
  const [isVaultCommunityMatchLoading, setIsVaultCommunityMatchLoading] = useState(false);
  const [vaultRecommendationScan, setVaultRecommendationScan] = useState<VaultRecommendationScanState>(() => createIdleVaultRecommendationScan());
  const accountRequestSequenceRef = useRef(0);
  const derivedRequestSequenceRef = useRef(0);
  const communityRequestSequenceRef = useRef(0);
  const recommendationScanAccountKeyRef = useRef("");
  const accountLoadingSequenceRef = useRef(0);
  const hasLoadedLocalAccountDataRef = useRef(false);

  useEffect(() => {
    let active = true;
    void api.getCachedAccountSnapshot()
      .then((cached) => {
        if (!active || !cached || getAccountSummarySnapshot()) return;
        applyAccountSummary(cached.snapshot);
        setIsShowingCachedAccount(true);
        const cachedAt = new Date(cached.saved_at);
        setLastAccountLoadedAt(Number.isNaN(cachedAt.getTime()) ? null : cachedAt);
        setAccountSyncMessage(`正在显示 ${formatCachedTime(cached.saved_at)} 的本地缓存`);
        setActivityMessage(`正在显示上次账号数据（${formatCachedTime(cached.saved_at)}）；本次游戏同步完成后页面会自动更新`);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  function setAccountSummaryState(summary: AccountSummary | null) {
    replaceAccountSummary(summary);
  }

  function applyAccountSummary(
    summary: AccountSummary,
    requestStartedRevision?: number,
    authoritative = false
  ) {
    replaceAccountSummary(summary, { requestStartedRevision, authoritative });
    setSelectedCharacterId((current) => {
      if (current && summary.characters.some((character) => character.character_id === current)) {
        return current;
      }
      return summary.characters[0]?.character_id ?? "";
    });
  }

  function applyCommittedAccountActionPatches(patches: readonly AccountItemActionPatch[]) {
    applyCommittedAccountEntityPatches(patches);
  }

  function confirmCommittedAccountActionPatches(patches: readonly AccountItemActionPatch[]) {
    confirmCommittedAccountEntityPatches(patches);
  }

  async function loginBungie() {
    setIsLoggingIn(true);
    setLoginMessage("");
    setLoginError("");

    try {
      const result = await api.loginBungie();
      accountRequestSequenceRef.current += 1;
      hasLoadedLocalAccountDataRef.current = false;
      derivedRequestSequenceRef.current += 1;
      communityRequestSequenceRef.current += 1;
      setAccountSummaryState(null);
      setAccountSyncMessage("");
      setIsShowingCachedAccount(false);
      setSelectedCharacterId("");
      setActivitySummary(null);
      setVaultCommunityInstanceMatch(new Map());
      setVaultRecommendationScan(createIdleVaultRecommendationScan());
      recommendationScanAccountKeyRef.current = "";
      setIsVaultCommunityMatchLoading(false);
      setActivityMessage("");
      setActivityError("");
      setLoginMessage(result.message);
      input.onLoginComplete();
      await input.diagnostics.refreshDiagnostics();
      await refreshAccountSnapshot("initial");
    } catch (error) {
      setLoginError(formatBungieLoginError(error));
    } finally {
      setIsLoggingIn(false);
    }
  }

  async function initializeManifest() {
    setIsInitializingManifest(true);
    setManifestMessage("");
    setManifestError("");

    try {
      const status = await api.initializeManifest();
      setManifestMessage(`资料库已初始化：${status.version ?? "未知版本"}`);
      input.onManifestInitialized();
      await input.diagnostics.refreshDiagnostics();
    } catch (error) {
      setManifestError(error instanceof Error ? error.message : "资料库初始化失败");
    } finally {
      setIsInitializingManifest(false);
    }
  }

  async function refreshAccountSnapshot(
    reason: AccountRefreshReason = getAccountSummarySnapshot() ? "manual" : "initial"
  ) {
    // 每次同步开始都清除上一轮读取错误；否则手动同步期间旧错误会一直
    // 覆盖页面。主进程负责把权威请求排到已有 in-flight 请求之后。
    setAccountError("");
    const previousSummary = getAccountSummarySnapshot();
    if (reason === "manual") setAccountSyncMessage("正在从游戏同步账号与仓库状态");
    // 初次读取和用户手动同步都属于可见的前台动作。只有明确写操作触发的
    // 对账刷新留在后台，并由写入反馈与任务 Dock 说明其进度。
    const foreground = reason !== "write-action";
    const requestSequence = ++accountRequestSequenceRef.current;
    const requestStartedRevision = getAccountStoreRevision();
    const loadingSequence = foreground ? ++accountLoadingSequenceRef.current : 0;
    if (foreground) setIsLoadingAccount(true);
    const request = (async (): Promise<AccountSummary | null> => {
      try {
        let summary: AccountSummary;
        if (!hasLoadedLocalAccountDataRef.current) {
          const workspace = await loadAccountWorkspace(services, {
            forceAccountRefresh: true,
            authoritativeAccountRefresh: reason === "manual" || reason === "write-action"
          });
          if (requestSequence !== accountRequestSequenceRef.current) return null;
          if (workspace.status !== "success") {
            throw new Error(workspace.error?.message ?? "账号数据读取失败");
          }
          summary = workspace.data.account;
          setVaultTags(workspace.data.tags);
          setLocalTargetRules(workspace.data.targetRules);
          setEquipmentTargetStore(workspace.data.equipmentTargets);
          setImportedWishlist(workspace.data.wishlist);
          hasLoadedLocalAccountDataRef.current = true;
          setAccountWarning(workspace.data.warnings.length
            ? `本地增强数据读取失败：${formatAccountWorkspaceWarnings(workspace.data.warnings)}`
            : "");
        } else {
          summary = await api.getAccountSummary({
            force: true,
            authoritative: reason === "manual" || reason === "write-action"
          });
          if (requestSequence !== accountRequestSequenceRef.current) return null;
        }

        applyAccountSummary(
          summary,
          requestStartedRevision,
          reason === "manual" || reason === "write-action"
        );
        setIsShowingCachedAccount(false);
        setLastAccountLoadedAt(new Date());
        if (reason !== "write-action") {
          setAccountSyncMessage(formatAccountSyncMessage(previousSummary, summary, reason));
        }
        communityRequestSequenceRef.current += 1;
        recommendationScanAccountKeyRef.current = "";
        setIsVaultCommunityMatchLoading(false);
        setVaultRecommendationScan((current) => ({
          phase: current.scanned_weapon_count || vaultCommunityInstanceMatch.size ? "partial" : "idle",
          total_weapon_count: countAccountWeapons(summary),
          scanned_weapon_count: vaultCommunityInstanceMatch.size,
          covered_weapon_count: [...vaultCommunityInstanceMatch.values()].filter((item) => item.coverage === "covered").length,
          retained_result_count: vaultCommunityInstanceMatch.size,
          message: vaultCommunityInstanceMatch.size
            ? "账号数据已更新，当前显示的是上次推荐核对结果，进入仓库后会重新核对。"
            : undefined
        }));
        if (reason === "initial" || reason === "manual") {
          setActivityMessage(reason === "manual"
            ? "已从游戏同步最新账号数据"
            : "账号数据已同步，最近活动会继续在后台读取");
        }
        if (reason === "initial") void refreshAccountDerivedData(summary);
        return summary;
      } catch (error) {
        if (requestSequence !== accountRequestSequenceRef.current) return null;
        const message = error instanceof Error ? error.message : "账号数据读取失败";
        const resolvedMessage = getAccountLoadErrorMessage(input.state, message);
        if (getAccountSummarySnapshot()) {
          setIsShowingCachedAccount(true);
          if (reason !== "write-action") setAccountSyncMessage("同步失败，继续显示上次账号数据");
          setAccountError(`${formatAccountRefreshFailurePrefix(reason)}，仍显示上次读取数据。${resolvedMessage}`);
        } else {
          setAccountError(resolvedMessage);
          setAccountSummaryState(null);
        }
        return null;
      }
    })();
    try {
      return await request;
    } finally {
      if (foreground && loadingSequence === accountLoadingSequenceRef.current) {
        setIsLoadingAccount(false);
      }
    }
  }

  async function refreshAccountDerivedData(summary = getAccountSummarySnapshot()) {
    if (!summary) return;

    const requestSequence = ++derivedRequestSequenceRef.current;
    setActivityError("");
    setActivityMessage("");
    const derived = await loadAccountDerivedWorkspace(services, summary, {
      includeActivity: true,
      includeCommunityMatch: false
    });
    if (requestSequence !== derivedRequestSequenceRef.current) return;
    if (derived.status === "success") {
      setActivitySummary(derived.data.activitySummary);
      setActivityMessage(derived.data.activitySummary ? "最近活动已更新" : "");
      return;
    }

    setActivitySummary(null);
    setActivityError(derived.error?.message ?? "最近活动读取失败");
  }

  async function loadVaultCommunityMatch(
    summary = getAccountSummarySnapshot(),
    options: { force?: boolean } = {}
  ) {
    if (!summary) return;
    const accountKey = `${summary.membership_type}:${summary.destiny_membership_id}`;
    if (!options.force && recommendationScanAccountKeyRef.current === accountKey) return;

    const requestSequence = ++communityRequestSequenceRef.current;
    const totalWeaponCount = countAccountWeapons(summary);
    const retainedInstanceMatches = vaultCommunityInstanceMatch;
    const retainedResultCount = retainedInstanceMatches.size;
    const startedAt = new Date().toISOString();
    setIsVaultCommunityMatchLoading(true);
    setVaultRecommendationScan({
      phase: "scanning",
      total_weapon_count: totalWeaponCount,
      scanned_weapon_count: 0,
      covered_weapon_count: 0,
      retained_result_count: retainedResultCount,
      started_at: startedAt,
      message: retainedResultCount
        ? `正在重新核对 ${totalWeaponCount} 件账号武器，暂时保留上次 ${retainedResultCount} 件结果。`
        : `正在核对 ${totalWeaponCount} 件账号武器。`
    });
    const derived = await loadAccountDerivedWorkspace(services, summary, {
      includeActivity: false,
      includeCommunityMatch: true
    });
    if (requestSequence !== communityRequestSequenceRef.current) return;
    if (derived.status === "success") {
      const blockingIssue = derived.data.vaultRecommendationIssues.find((issue) => issue.severity === "blocking");
      if (blockingIssue) {
        setVaultRecommendationScan({
          phase: retainedResultCount ? "partial" : "error",
          total_weapon_count: totalWeaponCount,
          scanned_weapon_count: retainedResultCount,
          covered_weapon_count: [...retainedInstanceMatches.values()].filter((item) => item.coverage === "covered").length,
          retained_result_count: retainedResultCount,
          started_at: startedAt,
          completed_at: new Date().toISOString(),
          blocking_reason: blockingIssue.code,
          issues: derived.data.vaultRecommendationIssues,
          manifest_version: derived.data.vaultRecommendationManifestVersion,
          recommendation_revision: derived.data.vaultRecommendationRevision,
          recommendation_schema_version: derived.data.vaultRecommendationSchemaVersion,
          message: retainedResultCount
            ? `${blockingIssue.message} 继续显示上次 ${retainedResultCount} 件结果。`
            : blockingIssue.message
        });
        setIsVaultCommunityMatchLoading(false);
        return;
      }
      recommendationScanAccountKeyRef.current = accountKey;
      setVaultCommunityInstanceMatch(derived.data.vaultCommunityInstanceMatch);
      const warningMessage = derived.data.vaultRecommendationIssues.map((issue) => issue.message).join(" ");
      setVaultRecommendationScan({
        phase: derived.data.vaultRecommendationIssues.length ? "partial" : "complete",
        total_weapon_count: totalWeaponCount,
        scanned_weapon_count: derived.data.vaultCommunityInstanceMatch.size,
        covered_weapon_count: [...derived.data.vaultCommunityInstanceMatch.values()].filter((item) => item.coverage === "covered").length,
        retained_result_count: 0,
        started_at: startedAt,
        completed_at: new Date().toISOString(),
        issues: derived.data.vaultRecommendationIssues,
        manifest_version: derived.data.vaultRecommendationManifestVersion,
        recommendation_revision: derived.data.vaultRecommendationRevision,
        recommendation_schema_version: derived.data.vaultRecommendationSchemaVersion,
        ...(warningMessage ? { message: warningMessage } : {})
      });
    } else {
      const message = derived.error?.message ?? "武器推荐来源核对失败";
      setVaultRecommendationScan({
        phase: retainedResultCount ? "partial" : "error",
        total_weapon_count: totalWeaponCount,
        scanned_weapon_count: retainedResultCount,
        covered_weapon_count: [...retainedInstanceMatches.values()].filter((item) => item.coverage === "covered").length,
        retained_result_count: retainedResultCount,
        started_at: startedAt,
        completed_at: new Date().toISOString(),
        message: retainedResultCount
          ? `本次核对失败，继续显示上次 ${retainedResultCount} 件结果：${message}`
          : message
      });
    }
    setIsVaultCommunityMatchLoading(false);
  }

  return {
    loginMessage,
    loginError,
    isLoggingIn,
    manifestMessage,
    manifestError,
    isInitializingManifest,
    accountSummary,
    setAccountSummary: setAccountSummaryState,
    applyCommittedAccountActionPatches,
    confirmCommittedAccountActionPatches,
    vaultTags,
    setVaultTags,
    localTargetRules,
    setLocalTargetRules,
    equipmentTargetStore,
    setEquipmentTargetStore,
    accountError,
    setAccountError,
    accountSyncMessage,
    accountWarning,
    isLoadingAccount,
    isShowingCachedAccount,
    lastAccountLoadedAt,
    selectedCharacterId,
    setSelectedCharacterId,
    activitySummary,
    activityMessage,
    activityError,
    importedWishlist,
    setImportedWishlist,
    vaultCommunityInstanceMatch,
    isVaultCommunityMatchLoading,
    vaultRecommendationScan,
    loginBungie,
    initializeManifest,
    loadAccountSummary: refreshAccountSnapshot,
    refreshAccountSnapshot,
    loadActivitySummary: refreshAccountDerivedData,
    loadVaultCommunityMatch,
    refreshAccountDerivedData
  };
}

function createIdleVaultRecommendationScan(): VaultRecommendationScanState {
  return {
    phase: "idle",
    total_weapon_count: 0,
    scanned_weapon_count: 0,
    covered_weapon_count: 0,
    retained_result_count: 0
  };
}

function countAccountWeapons(summary: AccountSummary): number {
  return [
    ...summary.characters.flatMap((character) => [
      ...character.equipped_items,
      ...character.inventory_items,
      ...character.postmaster_items
    ]),
    ...summary.vault.items
  ].filter((item) => item.group_key === "weapons").length;
}

function formatCachedTime(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "时间未知" : date.toLocaleString("zh-CN");
}

function formatAccountWorkspaceWarnings(warnings: Array<{ source: string; message: string }>): string {
  return warnings.map((warning) => `${formatAccountWarningSource(warning.source)}：${warning.message}`).join("；");
}

function formatAccountWarningSource(source: string): string {
  if (source === "vault-tags") return "本地标签";
  if (source === "target-rules") return "目标规则";
  if (source === "equipment-targets") return "装备目标";
  if (source === "wishlist") return "DIM wishlist";
  return "本地数据";
}

function formatAccountRefreshFailurePrefix(reason: AccountRefreshReason): string {
  if (reason === "write-action") return "操作后刷新账号数据失败";
  if (reason === "manual") return "从游戏同步账号数据失败";
  return "读取账号数据失败";
}

function formatAccountSyncMessage(
  previous: AccountSummary | null,
  next: AccountSummary,
  reason: AccountRefreshReason
): string {
  if (reason === "initial" || !previous) return "账号与仓库已从游戏同步";
  const previousVaultIds = new Set(previous.vault.items.flatMap((item) => item.instance_id ? [item.instance_id] : []));
  const nextVaultIds = new Set(next.vault.items.flatMap((item) => item.instance_id ? [item.instance_id] : []));
  const movedOut = [...previousVaultIds].filter((instanceId) => !nextVaultIds.has(instanceId)).length;
  const movedIn = [...nextVaultIds].filter((instanceId) => !previousVaultIds.has(instanceId)).length;
  const changes = [
    movedOut ? `${movedOut} 件装备移出仓库` : "",
    movedIn ? `${movedIn} 件装备移入仓库` : ""
  ].filter(Boolean);
  if (changes.length) return `同步完成：${changes.join("，")}`;
  const countDelta = next.vault.item_count - previous.vault.item_count;
  if (countDelta) return `同步完成：仓库总数${countDelta > 0 ? "增加" : "减少"} ${Math.abs(countDelta)} 件`;
  return "同步完成：游戏中的账号与仓库状态没有变化";
}

function getAccountLoadErrorMessage(state: StartupState, message: string): string {
  if (state.cards.bungieConfig.status !== "ready") {
    return `未连接 Bungie：请先在设置里填写 Bungie API Key、Client ID 和 Client Secret。${message}`;
  }

  if (state.cards.account.status !== "ready") {
    return `账号还没有登录：请先完成 Bungie 登录。${message}`;
  }

  return `登录可能已失效，请重新登录 Bungie。${message}`;
}
