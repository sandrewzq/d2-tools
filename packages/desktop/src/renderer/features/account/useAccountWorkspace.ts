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
      setLoginError(error instanceof Error ? error.message : "Bungie 登录失败");
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
      const { account: summary, tags, targetRules, wishlist } = workspace.data;
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
      const derived = await loadAccountDerivedWorkspace(services, summary);
      if (derived.status === "success") {
        setActivitySummary(derived.data.activitySummary);
        setVaultCommunityMatch(derived.data.vaultCommunityMatch);
        setActivityMessage(derived.data.activitySummary ? "最近活动已更新" : "");
      } else {
        setActivitySummary(null);
        setVaultCommunityMatch(new Map());
        setActivityError(derived.error?.message ?? "最近活动读取失败");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "账号数据读取失败";
      setAccountError(input.state.nextStep === "home"
        ? `登录可能已失效，请重新登录 Bungie。${message}`
        : message);
      setAccountSummary(null);
    } finally {
      setIsLoadingAccount(false);
    }
  }

  async function loadActivitySummary(summary = accountSummary) {
    if (!summary) return;

    setActivityError("");
    setActivityMessage("");
    const derived = await loadAccountDerivedWorkspace(services, summary);
    if (derived.status === "success") {
      setActivitySummary(derived.data.activitySummary);
      setVaultCommunityMatch(derived.data.vaultCommunityMatch);
      setActivityMessage(derived.data.activitySummary ? "最近活动已更新" : "");
      return;
    }

    setActivitySummary(null);
    setVaultCommunityMatch(new Map());
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
