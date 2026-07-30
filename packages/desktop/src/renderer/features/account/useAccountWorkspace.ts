import { useEffect, useRef, useState } from "react";
import { loadAccountWorkspace, loadAccountDerivedWorkspace } from "@d2-tools/app/account";
import {
  api } from "../../api/client";
import type { AccountItemActionPatch, AccountSummary, ActivityHistorySummary, DimWishlist, StartupState, VaultItemMatchInfo, LocalTargetRules, VaultTags } from "../../api/types";
import { services } from "../../api/services";
import {
  applyAccountEntityPatches,
  getAccountSummarySnapshot,
  replaceAccountSummary,
  useAccountSummaryStore
} from "../../shared/stores/accountEntityStore";
import { formatBungieLoginError } from "./loginErrors";

type DiagnosticsBridge = {
  refreshDiagnostics: () => Promise<void>;
};

type AccountRefreshReason = "initial" | "manual" | "auto" | "write-action";

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
  const [accountError, setAccountError] = useState("");
  const [accountWarning, setAccountWarning] = useState("");
  const [isLoadingAccount, setIsLoadingAccount] = useState(false);
  const [selectedCharacterId, setSelectedCharacterId] = useState("");
  const [activitySummary, setActivitySummary] = useState<ActivityHistorySummary | null>(null);
  const [activityMessage, setActivityMessage] = useState("");
  const [activityError, setActivityError] = useState("");
  const [importedWishlist, setImportedWishlist] = useState<DimWishlist | null>(null);
  const [vaultCommunityMatch, setVaultCommunityMatch] = useState<Map<number, VaultItemMatchInfo>>(new Map());
  const [isVaultCommunityMatchLoading, setIsVaultCommunityMatchLoading] = useState(false);
  const accountRequestSequenceRef = useRef(0);
  const derivedRequestSequenceRef = useRef(0);
  const communityRequestSequenceRef = useRef(0);
  const communityMatchAccountKeyRef = useRef("");

  useEffect(() => {
    let active = true;
    void api.getCachedAccountSnapshot()
      .then((cached) => {
        if (!active || !cached || getAccountSummarySnapshot()) return;
        applyAccountSummary(cached.snapshot);
        setActivityMessage(`正在显示上次账号数据（${formatCachedTime(cached.saved_at)}），后台将继续刷新`);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  function setAccountSummaryState(summary: AccountSummary | null) {
    replaceAccountSummary(summary);
  }

  function applyAccountSummary(summary: AccountSummary) {
    setAccountSummaryState(summary);
    setSelectedCharacterId((current) => {
      if (current && summary.characters.some((character) => character.character_id === current)) {
        return current;
      }
      return summary.characters[0]?.character_id ?? "";
    });
  }

  function applyAccountActionPatches(patches: readonly AccountItemActionPatch[]) {
    applyAccountEntityPatches(patches);
  }

  async function loginBungie() {
    setIsLoggingIn(true);
    setLoginMessage("");
    setLoginError("");

    try {
      const result = await api.loginBungie();
      accountRequestSequenceRef.current += 1;
      derivedRequestSequenceRef.current += 1;
      communityRequestSequenceRef.current += 1;
      setAccountSummaryState(null);
      setSelectedCharacterId("");
      setActivitySummary(null);
      setVaultCommunityMatch(new Map());
      communityMatchAccountKeyRef.current = "";
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

  async function refreshAccountSnapshot(reason: AccountRefreshReason = getAccountSummarySnapshot() ? "manual" : "initial") {
    const requestSequence = ++accountRequestSequenceRef.current;
    setIsLoadingAccount(true);
    setAccountError("");
    setAccountWarning("");

    try {
      const workspace = await loadAccountWorkspace(services, {
        forceAccountRefresh: reason !== "initial"
      });
      if (requestSequence !== accountRequestSequenceRef.current) return null;
      if (workspace.status !== "success") {
        throw new Error(workspace.error?.message ?? "账号数据读取失败");
      }
      const {
        account: summary,
        tags,
        targetRules,
        wishlist
      } = workspace.data;
      applyAccountSummary(summary);
      setVaultTags(tags);
      setLocalTargetRules(targetRules);
      setImportedWishlist(wishlist);
      setActivitySummary(null);
      communityRequestSequenceRef.current += 1;
      setVaultCommunityMatch(new Map());
      communityMatchAccountKeyRef.current = "";
      setIsVaultCommunityMatchLoading(false);
      setActivityMessage("账号已读取，最近活动会继续在后台刷新");
      if (workspace.data.warnings.length) {
        setAccountWarning(`本地增强数据读取失败：${formatAccountWorkspaceWarnings(workspace.data.warnings)}`);
      }
      void refreshAccountDerivedData(summary);
      return summary;
    } catch (error) {
      if (requestSequence !== accountRequestSequenceRef.current) return null;
      const message = error instanceof Error ? error.message : "账号数据读取失败";
      const resolvedMessage = getAccountLoadErrorMessage(input.state, message);
      if (getAccountSummarySnapshot()) {
        setAccountError(`${formatAccountRefreshFailurePrefix(reason)}，仍显示上次读取数据。${resolvedMessage}`);
      } else {
        setAccountError(resolvedMessage);
        setAccountSummaryState(null);
      }
      return null;
    } finally {
      if (requestSequence === accountRequestSequenceRef.current) {
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

  async function loadVaultCommunityMatch(summary = getAccountSummarySnapshot()) {
    if (!summary) return;
    const accountKey = `${summary.membership_type}:${summary.destiny_membership_id}`;
    if (communityMatchAccountKeyRef.current === accountKey) return;

    const requestSequence = ++communityRequestSequenceRef.current;
    setIsVaultCommunityMatchLoading(true);
    const derived = await loadAccountDerivedWorkspace(services, summary, {
      includeActivity: false,
      includeCommunityMatch: true
    });
    if (requestSequence !== communityRequestSequenceRef.current) return;
    if (derived.status === "success") {
      communityMatchAccountKeyRef.current = accountKey;
      setVaultCommunityMatch(derived.data.vaultCommunityMatch);
    } else {
      setVaultCommunityMatch(new Map());
      setActivityError(derived.error?.message ?? "社区匹配读取失败");
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
    applyAccountActionPatches,
    vaultTags,
    setVaultTags,
    localTargetRules,
    setLocalTargetRules,
    accountError,
    setAccountError,
    accountWarning,
    isLoadingAccount,
    selectedCharacterId,
    setSelectedCharacterId,
    activitySummary,
    activityMessage,
    activityError,
    importedWishlist,
    setImportedWishlist,
    vaultCommunityMatch,
    isVaultCommunityMatchLoading,
    loginBungie,
    initializeManifest,
    loadAccountSummary: refreshAccountSnapshot,
    refreshAccountSnapshot,
    loadActivitySummary: refreshAccountDerivedData,
    loadVaultCommunityMatch,
    refreshAccountDerivedData
  };
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
  if (source === "wishlist") return "DIM wishlist";
  return "本地数据";
}

function formatAccountRefreshFailurePrefix(reason: AccountRefreshReason): string {
  if (reason === "auto") return "自动刷新账号数据失败";
  if (reason === "write-action") return "操作后刷新账号数据失败";
  return "刷新账号数据失败";
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
