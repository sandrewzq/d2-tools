import { useState } from "react";
import { loadAccountWorkspace, loadAccountDerivedWorkspace } from "@d2-tools/app";
import {
  api,
  type AccountSummary,
  type ActivityHistorySummary,
  type DimWishlist,
  type StartupState,
  type VaultItemMatchInfo,
  type LocalTargetRules,
  type VaultTags
} from "../../api/client";
import { services } from "../../api/services";
import { formatBungieLoginError } from "./loginErrors";

type DiagnosticsBridge = {
  refreshDiagnostics: () => Promise<void>;
};

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
  const [accountSummary, setAccountSummary] = useState<AccountSummary | null>(null);
  const [vaultTags, setVaultTags] = useState<VaultTags>({ items: {} });
  const [localTargetRules, setLocalTargetRules] = useState<LocalTargetRules>({
    action_policy: "notify_only",
    armor: [],
    weapons: []
  });
  const [accountError, setAccountError] = useState("");
  const [isLoadingAccount, setIsLoadingAccount] = useState(false);
  const [selectedCharacterId, setSelectedCharacterId] = useState("");
  const [activitySummary, setActivitySummary] = useState<ActivityHistorySummary | null>(null);
  const [activityMessage, setActivityMessage] = useState("");
  const [activityError, setActivityError] = useState("");
  const [importedWishlist, setImportedWishlist] = useState<DimWishlist | null>(null);
  const [vaultCommunityMatch, setVaultCommunityMatch] = useState<Map<number, VaultItemMatchInfo>>(new Map());
  const [isVaultCommunityMatchLoading, setIsVaultCommunityMatchLoading] = useState(false);

  async function loginBungie() {
    setIsLoggingIn(true);
    setLoginMessage("");
    setLoginError("");

    try {
      const result = await api.loginBungie();
      setLoginMessage(result.message);
      input.onLoginComplete();
      await input.diagnostics.refreshDiagnostics();
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

  async function loadAccountSummary() {
    setIsLoadingAccount(true);
    setAccountError("");

    try {
      const workspace = await loadAccountWorkspace(services);
      if (workspace.status !== "success") {
        throw new Error(workspace.error?.message ?? "账号数据读取失败");
      }
      const {
        account: summary,
        tags,
        targetRules,
        wishlist
      } = workspace.data;
      setAccountSummary(summary);
      setVaultTags(tags);
      setLocalTargetRules(targetRules);
      setImportedWishlist(wishlist);
      setSelectedCharacterId((current) => {
        if (current && summary.characters.some((character) => character.character_id === current)) {
          return current;
        }
        return summary.characters[0]?.character_id ?? "";
      });
      setActivitySummary(null);
      setVaultCommunityMatch(new Map());
      setActivityMessage("账号已读取，最近活动和社区匹配会继续在后台更新");
      void loadActivitySummary(summary);
    } catch (error) {
      const message = error instanceof Error ? error.message : "账号数据读取失败";
      setAccountError(getAccountLoadErrorMessage(input.state, message));
      setAccountSummary(null);
    } finally {
      setIsLoadingAccount(false);
    }
  }

  async function loadActivitySummary(summary = accountSummary) {
    if (!summary) return;

    setActivityError("");
    setActivityMessage("");
    setIsVaultCommunityMatchLoading(true);
    const derived = await loadAccountDerivedWorkspace(services, summary);
    if (derived.status === "success") {
      setActivitySummary(derived.data.activitySummary);
      setVaultCommunityMatch(derived.data.vaultCommunityMatch);
      setIsVaultCommunityMatchLoading(false);
      setActivityMessage(derived.data.activitySummary ? "最近活动已更新" : "");
      return;
    }

    setActivitySummary(null);
    setVaultCommunityMatch(new Map());
    setIsVaultCommunityMatchLoading(false);
    setActivityError(derived.error?.message ?? "最近活动读取失败");
  }

  return {
    loginMessage,
    loginError,
    isLoggingIn,
    manifestMessage,
    manifestError,
    isInitializingManifest,
    accountSummary,
    setAccountSummary,
    vaultTags,
    setVaultTags,
    localTargetRules,
    setLocalTargetRules,
    accountError,
    setAccountError,
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
    loadAccountSummary,
    loadActivitySummary
  };
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
