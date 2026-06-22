import { useState } from "react";
import {
  api,
  type AccountSummary,
  type ActivityHistorySummary,
  type DimWishlist,
  type StartupState,
  type VaultItemMatchInfo,
  type VaultTags
} from "../../api/client";

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
  const [accountError, setAccountError] = useState("");
  const [isLoadingAccount, setIsLoadingAccount] = useState(false);
  const [selectedCharacterId, setSelectedCharacterId] = useState("");
  const [activitySummary, setActivitySummary] = useState<ActivityHistorySummary | null>(null);
  const [activityMessage, setActivityMessage] = useState("");
  const [activityError, setActivityError] = useState("");
  const [importedWishlist, setImportedWishlist] = useState<DimWishlist | null>(null);
  const [vaultCommunityMatch, setVaultCommunityMatch] = useState<Map<number, VaultItemMatchInfo>>(new Map());
  const [isVaultCommunityMatchLoading, setIsVaultCommunityMatchLoading] = useState(false);

  async function loadPersistedWishlist() {
    try {
      setImportedWishlist(await api.getDimWishlist());
    } catch {
      setImportedWishlist(null);
    }
  }

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
      const [summary, tags] = await Promise.all([api.getAccountSummary(), api.getVaultTags()]);
      setAccountSummary(summary);
      setVaultTags(tags);
      setSelectedCharacterId((current) => {
        if (current && summary.characters.some((character) => character.character_id === current)) {
          return current;
        }
        return summary.characters[0]?.character_id ?? "";
      });
      void loadActivitySummary(summary);
      void loadVaultCommunityMatch(summary);
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

  async function loadVaultCommunityMatch(summary: AccountSummary) {
    setIsVaultCommunityMatchLoading(true);
    try {
      const allItems = [
        ...summary.characters.flatMap((character) => [
          ...character.equipped_items,
          ...character.inventory_items,
          ...character.postmaster_items
        ]),
        ...summary.vault.items
      ];
      const inputs = allItems.map((item) => ({
        hash: item.hash,
        socket_plugs: item.socket_plugs?.map((plug) => ({ hash: plug.hash }))
      }));
      const result = await api.matchCommunityVaultItems(inputs);
      const map = new Map<number, VaultItemMatchInfo>();
      for (const item of result) {
        map.set(item.hash, {
          matched: item.matched,
          available: item.available,
          modes: item.modes,
          sample_perks: item.sample_perks,
          source_label: item.source_label
        });
      }
      setVaultCommunityMatch(map);
    } catch (error) {
      console.warn("社区推荐匹配失败：", error);
    } finally {
      setIsVaultCommunityMatchLoading(false);
    }
  }

  async function loadActivitySummary(summary = accountSummary) {
    if (!summary) return;

    setActivityError("");
    setActivityMessage("");
    try {
      setActivitySummary(await api.getActivitySummary({
        membership_type: summary.membership_type,
        membership_id: summary.destiny_membership_id,
        character_ids: summary.characters.map((character) => character.character_id)
      }));
      setActivityMessage("最近活动已更新");
    } catch (error) {
      setActivitySummary(null);
      setActivityError(error instanceof Error ? error.message : "最近活动读取失败");
    }
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
    loadPersistedWishlist,
    loginBungie,
    initializeManifest,
    loadAccountSummary,
    loadActivitySummary
  };
}
