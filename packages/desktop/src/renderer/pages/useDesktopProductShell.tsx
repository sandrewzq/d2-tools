import {
  ShellSidebarAccountSummary,
  ShellSidebarActions,
  type ProductPreferences,
  type ShellAssistantMode,
  type ShellPageKey,
  type ShellStatusItem
} from "@d2-tools/ui";
import { buildVendorItemSourcePaths } from "@d2-tools/app/vendors";
import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../api/client";
import type { AccountSummary, AppUpdateSnapshot, ManifestStatus, StartupState } from "../api/types";
import { GlobalAssistantSidebar } from "../components/GlobalAssistantSidebar";
import { useAccountWorkspace } from "../features/account/useAccountWorkspace";
import { useDailySummary } from "../features/daily/useDailySummary";
import { useHomePageDerivedState } from "../features/home/useHomePageDerivedState";
import { useLibraryWorkspace } from "../features/library/useLibraryWorkspace";
import { useLoadoutTemplates } from "../features/loadouts/useLoadoutTemplates";
import { useDiagnosticsSettings } from "../features/settings/useDiagnosticsSettings";
import { useVendorsWorkspace } from "../features/vendors/useVendorsWorkspace";
import { useVendorDefinitionDetail } from "../features/vendors/useVendorDefinitionDetail";
import type { DesktopMenuSession } from "./providers/DesktopMenuProviderContext";
import { useDesktopProductWriteActions } from "./useDesktopProductWriteActions";

export function useDesktopProductShell(props: {
  state: StartupState;
  onConfigure: () => void;
  onConfigChanged: () => void;
  onLoginComplete: () => void;
  onManifestInitialized: () => void;
}) {
  const visualEnv = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env;
  const visualInitialPage = visualEnv?.VITE_D2_VISUAL_PAGE;
  const visualColorMode = isColorMode(visualEnv?.VITE_D2_VISUAL_THEME) ? visualEnv?.VITE_D2_VISUAL_THEME : undefined;
  const initialPage: ShellPageKey = isShellPageKey(visualInitialPage) ? visualInitialPage : "home";
  const [activePage, setActivePage] = useState<ShellPageKey>(initialPage);
  const [settingsInitialSection, setSettingsInitialSection] = useState<"overview" | "account">("overview");
  const [assistantMode, setAssistantMode] = useState<ShellAssistantMode>(null);
  const [hasAutoLoadedAccount, setHasAutoLoadedAccount] = useState(false);
  const [lastAccountLoadedAt, setLastAccountLoadedAt] = useState<Date | null>(null);
  const [vaultFacts, setVaultFacts] = useState<string[]>([]);
  const [vaultLocateRequest, setVaultLocateRequest] = useState<{
    hash: number;
    name: string;
    requestId: number;
  } | null>(null);
  const isVisualCapture = visualEnv?.VITE_D2_VISUAL_CAPTURE === "1";
  const daily = useDailySummary();
  const diagnostics = useDiagnosticsSettings({
    onConfigChanged: props.onConfigChanged,
    initialColorMode: visualColorMode ?? props.state.colorMode,
    initialDensity: props.state.density ?? "standard",
    initialLanguagePreferences: props.state.languagePreferences
  });
  const desktopPlatformActions = useMemo(() => ({
    openExternal: (url: string) => window.d2.openExternal(url),
    setColorMode: (mode: "light" | "dark") => window.d2?.setWindowColorMode?.(mode),
    windowControls: {
      minimize: () => window.d2.minimizeWindow(),
      toggleMaximize: () => window.d2.toggleMaximizeWindow(),
      close: () => window.d2.closeWindow()
    }
  }), []);
  const accountWorkspace = useAccountWorkspace({
    state: props.state,
    diagnostics,
    onLoginComplete: props.onLoginComplete,
    onManifestInitialized: props.onManifestInitialized
  });
  const {
    accountSummary,
    applyAccountActionPatches,
    vaultTags,
    setVaultTags,
    accountError,
    setAccountError,
    accountWarning,
    isLoadingAccount,
    selectedCharacterId,
    activitySummary,
    importedWishlist,
    localTargetRules,
    setLocalTargetRules,
    refreshAccountSnapshot
  } = accountWorkspace;
  const refreshAccountManually = () => refreshAccountSnapshot("manual");
  const refreshAccountAfterWrite = () => refreshAccountSnapshot("write-action");
  const vendorsWorkspace = useVendorsWorkspace({
    accountSummary,
    selectedCharacterId,
    active: activePage === "vendors",
    loadCachedInventory: api.getCachedVendorInventory,
    loadInventory: api.refreshVendorInventory
  });
  const vendorSourcePaths = useMemo(
    () => buildVendorItemSourcePaths(vendorsWorkspace.model),
    [vendorsWorkspace.model]
  );
  const itemDetailCacheScopeKey = useMemo(() => [
    accountSummary
      ? `${accountSummary.membership_type}:${accountSummary.destiny_membership_id}`
      : "signed-out",
    diagnostics.manifestStatus?.version ?? "manifest-unavailable",
    diagnostics.manifestStatus?.language ?? "",
    diagnostics.manifestStatus?.cached_at ?? ""
  ].join("\u0000"), [
    accountSummary?.destiny_membership_id,
    accountSummary?.membership_type,
    diagnostics.manifestStatus?.cached_at,
    diagnostics.manifestStatus?.language,
    diagnostics.manifestStatus?.version
  ]);
  const library = useLibraryWorkspace({ vendorSourcePaths });
  const loadoutLibrary = useLoadoutTemplates();
  const writeActions = useDesktopProductWriteActions({
    accountSummary,
    applyAccountActionPatches,
    diagnostics,
    vaultTags,
    setVaultTags,
    importedWishlist,
    localTargetRules,
    itemDetailCacheScopeKey,
    setAccountError,
    loadAccountSummary: refreshAccountAfterWrite,
    loadoutLibrary,
    onRecentHistoryChanged: library.setLibraryHistory
  });
  const itemDetail = writeActions.itemDetail;
  const vendorDefinitionDetail = useVendorDefinitionDetail({ vendorSourcePaths, vaultTags });
  const isRunningItemAction = writeActions.isRunningItemAction;
  const loadoutWriteActions = writeActions.loadoutWriteActions;

  function handlePageChange(page: ShellPageKey) {
    itemDetail.closeSelectedItemDetail();
    vendorDefinitionDetail.close();
    setActivePage(page);
  }

  function locateVaultItem(item: { hash: number; name: string }) {
    setVaultLocateRequest((current) => ({
      ...item,
      requestId: (current?.requestId ?? 0) + 1
    }));
    setActivePage("vault");
  }

  useEffect(() => {
    if (isVisualCapture) {
      return;
    }
    void diagnostics.refreshDiagnostics();
    void library.loadLibraryHistory();
  }, [isVisualCapture]);

  const isManifestReady = props.state.cards.manifest.status === "ready";

  useEffect(() => {
    if (isVisualCapture || !isManifestReady) return;
    void daily.loadDailySummary();
  }, [isManifestReady, isVisualCapture]);

  const refreshAccountRef = useRef(refreshAccountSnapshot);
  refreshAccountRef.current = refreshAccountSnapshot;
  const canRefreshAccount = props.state.cards.bungieConfig.status === "ready"
    && props.state.cards.account.status === "ready"
    && isManifestReady;

  useEffect(() => {
    if (hasAutoLoadedAccount || !canRefreshAccount) {
      return;
    }
    setHasAutoLoadedAccount(true);
    void refreshAccountRef.current("initial");
  }, [canRefreshAccount, hasAutoLoadedAccount]);

  useEffect(() => {
    if (!canRefreshAccount) return;

    const id = setInterval(() => {
      void refreshAccountRef.current("auto");
    }, 10 * 60 * 1000);

    return () => clearInterval(id);
  }, [canRefreshAccount]);

  useEffect(() => {
    if (accountSummary) {
      setLastAccountLoadedAt(new Date());
    }
  }, [accountSummary]);

  const activeLoadoutTemplate = loadoutLibrary.activeTemplate;
  const homeDerivedState = useHomePageDerivedState({
    activePage,
    state: props.state,
    accountSummary,
    selectedCharacterId,
    activeLoadoutTemplate,
    vaultFacts,
    library,
    diagnostics
  });
  const currentPageMeta = homeDerivedState.currentPageMeta;
  const assistantPageContext = homeDerivedState.assistantPageContext;
  const isAiConfigured = homeDerivedState.isAiConfigured;
  const appUpdateSnapshot = diagnostics.appUpdateSnapshot;
  const shellStatus = buildShellStatus({
    manifestStatus: diagnostics.manifestStatus,
    manifestStatusError: diagnostics.manifestStatusError,
    accountSummary,
    lastAccountLoadedAt,
    isLoadingAccount,
    accountError,
    accountWarning,
    canRefreshAccount,
    isBungieConfigured: props.state.cards.bungieConfig.status === "ready",
    isAiConfigured,
    appUpdateSnapshot,
    onRepairManifest: () => void diagnostics.repairManifest()
  });

  const productPreferences: ProductPreferences = {
    ...diagnostics.languagePreferences,
    colorMode: diagnostics.colorMode,
    density: diagnostics.density
  };

  function handleProductPreferencesChange(preferences: ProductPreferences) {
    if (preferences.colorMode !== diagnostics.colorMode) {
      void diagnostics.toggleColorMode();
    }

    const density = preferences.density ?? "standard";
    if (density !== diagnostics.density) {
      void diagnostics.saveDensity(density);
    }

    if (
      preferences.interfaceLocale !== diagnostics.languagePreferences.interfaceLocale
      || preferences.bungieLocale !== diagnostics.languagePreferences.bungieLocale
      || preferences.followInterfaceLocaleForBungie !== diagnostics.languagePreferences.followInterfaceLocaleForBungie
    ) {
      void diagnostics.saveLanguagePreferences({
        interfaceLocale: preferences.interfaceLocale,
        bungieLocale: preferences.bungieLocale,
        followInterfaceLocaleForBungie: preferences.followInterfaceLocaleForBungie
      });
    }
  }

  const menuSession: DesktopMenuSession = {
    state: props.state,
    onConfigure: props.onConfigure,
    setActivePage,
    settingsInitialSection,
    setSettingsInitialSection,
    setVaultFacts,
    vaultLocateRequest,
    locateVaultItem,
    lastAccountLoadedAt,
    refreshAccountManually,
    account: accountWorkspace,
    daily,
    diagnostics,
    home: homeDerivedState,
    library,
    loadouts: loadoutLibrary,
    vendors: vendorsWorkspace,
    vendorDefinitionDetail,
    writeActions
  };

  const assistantPanel = (
    <GlobalAssistantSidebar
      assistantMode={assistantMode}
      activePage={activePage}
      isConfigured={isAiConfigured}
      account={accountSummary}
      daily={daily.dailySummary}
      activity={activitySummary}
      pageContext={assistantPageContext}
      tags={vaultTags}
      isLoadingAccount={isLoadingAccount}
      onLoadAccount={() => void refreshAccountManually()}
      onConfigureAi={() => {
        setActivePage("settings");
        setAssistantMode(null);
      }}
      onSaveGuideDraft={(draft) => void loadoutWriteActions.saveGuideDraft(draft)}
      onClose={() => setAssistantMode(null)}
    />
  );

  return {
    activePage,
    assistantMode,
    assistantPanel,
    backgroundTasks: diagnostics.backgroundTasks,
    handleAssistantModeChange: setAssistantMode,
    handlePageChange,
    handleProductPreferencesChange,
    itemDetailModalProps: {
      accountSummary,
      aiSettingsEnableLightgg: diagnostics.aiSettings.enable_lightgg,
      importedWishlist,
      itemDetail,
      isRunningItemAction,
      localTargetRules,
      onLocateOwnedItem: locateVaultItem,
      interfaceLocale: diagnostics.languagePreferences.interfaceLocale,
      vendorDefinitionDetail,
      vaultTags
    },
    menuSession,
    pageHeader: {
      title: currentPageMeta.title,
      subtitle: currentPageMeta.subtitle,
      actions: activePage === "home" ? (
        <>
          <button
            type="button"
            className="secondary-button"
            disabled={daily.isLoadingDaily || !isManifestReady}
            onClick={() => void daily.loadDailySummary(true)}
          >
            {daily.isLoadingDaily ? "刷新中..." : "刷新公开情报"}
          </button>
        </>
      ) : activePage === "account" ? (
        <>
          <button type="button" className="secondary-button" disabled={isLoadingAccount} onClick={() => void refreshAccountManually()}>刷新账号</button>
          <button type="button" className="secondary-button" disabled={accountWorkspace.isLoggingIn} onClick={() => void accountWorkspace.loginBungie()}>重新授权</button>
        </>
      ) : activePage === "vault" ? (
        <button type="button" className="primary-button" disabled={isLoadingAccount} onClick={() => void refreshAccountManually()}>刷新账号装备</button>
      ) : activePage === "library" ? (
        <>
          <button type="button" className="secondary-button" onClick={() => void diagnostics.refreshManifestStatus()}>重新检查资料库</button>
          <button type="button" className="primary-button" disabled={diagnostics.isInitializingManifest} onClick={() => void diagnostics.repairManifest()}>修复资料库</button>
        </>
      ) : activePage === "vendors" ? (
        <button type="button" className="primary-button" disabled={vendorsWorkspace.isRefreshing} onClick={() => void vendorsWorkspace.refresh()}>刷新商人库存</button>
      ) : null
    },
    platformActions: desktopPlatformActions,
    productPreferences,
    sidebarHeader: (
      <ShellSidebarAccountSummary
        accountName={accountSummary?.account_name}
        characterCount={accountSummary?.characters.length}
        vaultItemCount={accountSummary?.vault.item_count}
        vaultCapacity={accountSummary?.vault.capacity}
      />
    ),
    sidebarFooter: (
      <ShellSidebarActions
        isAiOpen={assistantMode !== null}
        onToggleAi={() => setAssistantMode((current) => current === null ? "ai" : null)}
      />
    ),
    shellStatus
  };
}

function buildShellStatus(input: {
  manifestStatus: ManifestStatus | null;
  manifestStatusError: string;
  accountSummary: AccountSummary | null;
  lastAccountLoadedAt: Date | null;
  isLoadingAccount: boolean;
  accountError: string;
  accountWarning: string;
  canRefreshAccount: boolean;
  isBungieConfigured: boolean;
  isAiConfigured: boolean;
  appUpdateSnapshot: AppUpdateSnapshot | null;
  onRepairManifest: () => void;
}): ShellStatusItem[] {
  const needsLibraryRepair = Boolean(input.manifestStatus?.missing_required_components?.length);

  return [
    {
      key: "bungie",
      label: "Bungie",
      value: input.isBungieConfigured ? "已配置" : "未配置",
      tone: input.isBungieConfigured ? "ready" : "warning"
    },
    {
      key: "account",
      label: "账号",
      value: formatAccountShellStatus(input.accountSummary, input.lastAccountLoadedAt, input.isLoadingAccount, input.accountError, input.accountWarning, input.canRefreshAccount),
      tone: getAccountStatusTone(input.accountSummary, input.isLoadingAccount, input.accountError, input.accountWarning, input.canRefreshAccount)
    },
    {
      key: "library",
      label: "资料库",
      value: input.manifestStatusError
        ? "检查失败"
        : (needsLibraryRepair ? "修复资料库" : formatManifestShellStatus(input.manifestStatus)),
      tone: input.manifestStatusError ? "error" : getManifestStatusTone(input.manifestStatus),
      actionLabel: needsLibraryRepair ? "修复资料库" : undefined,
      onAction: needsLibraryRepair ? input.onRepairManifest : undefined
    },
    {
      key: "ai",
      label: "AI",
      value: input.isAiConfigured ? "已配置" : "未配置",
      tone: input.isAiConfigured ? "ready" : "warning"
    },
    {
      key: "app-version",
      label: "应用版本",
      value: formatAppUpdateShellStatus(input.appUpdateSnapshot),
      tone: getAppUpdateStatusTone(input.appUpdateSnapshot)
    },
  ];
}

function formatAccountShellStatus(
  accountSummary: AccountSummary | null,
  lastAccountLoadedAt: Date | null,
  isLoadingAccount: boolean,
  accountError: string,
  accountWarning: string,
  canRefreshAccount: boolean
): string {
  if (isLoadingAccount) return accountSummary ? "刷新中" : "读取中";
  if (accountError && accountSummary) return "刷新失败";
  if (accountError) return "读取失败";
  if (accountWarning && accountSummary) return "增强数据异常";
  if (accountSummary) {
    const characterCount = `${accountSummary.characters.length} 个角色`;
    const loadedAt = formatTime(lastAccountLoadedAt);
    return loadedAt ? `${characterCount} · ${loadedAt}` : characterCount;
  }
  return canRefreshAccount ? "可读取" : "未登录";
}

function getAccountStatusTone(
  accountSummary: AccountSummary | null,
  isLoadingAccount: boolean,
  accountError: string,
  accountWarning: string,
  canRefreshAccount: boolean
): ShellStatusItem["tone"] {
  if (accountError) return "error";
  if (isLoadingAccount) return "warning";
  if (accountWarning && accountSummary) return "warning";
  if (accountSummary) return "ready";
  return canRefreshAccount ? "warning" : "neutral";
}

function formatManifestShellStatus(status: ManifestStatus | null): string {
  if (!status) return "读取中";
  if (!status.initialized) return "未准备";
  if (status.missing_required_components?.length) return "需修复";
  if (status.needs_update) return "可更新";
  return formatLibraryVersion(status.version) ?? "可用";
}

function formatAppUpdateShellStatus(snapshot: AppUpdateSnapshot | null): string {
  const version = snapshot?.current_version ?? "未读取";
  if (!snapshot) return version;
  if (snapshot.status === "available") return `${version} 有新版`;
  if (snapshot.status === "downloaded") return `${version} 待安装`;
  if (snapshot.status === "downloading") return `${version} 下载中`;
  if (snapshot.status === "error") return `${version} 检查失败`;
  return `${version} 最新`;
}

function isShellPageKey(value: string | undefined): value is ShellPageKey {
  return value === "home" || value === "account" || value === "vault" || value === "loadouts" || value === "library" || value === "vendors" || value === "settings";
}

function isColorMode(value: string | undefined): value is "light" | "dark" {
  return value === "light" || value === "dark";
}

function formatLibraryVersion(version?: string): string | undefined {
  if (!version) return undefined;
  const match = version.match(/(?:^|\.)(\d{2})\.(\d{2})\.(\d{2})(?:\.|-)/);
  if (!match) return undefined;
  const yearNumber = Number(match[1]);
  const fullYear = yearNumber < 80 ? 2000 + yearNumber : 1900 + yearNumber;
  return `${fullYear}/${match[2]}/${match[3]}`;
}

function formatTime(date: Date | null): string | undefined {
  if (!date) return undefined;
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(date);
}

function getManifestStatusTone(status: ManifestStatus | null): ShellStatusItem["tone"] {
  if (!status) return "neutral";
  if (!status.initialized || status.missing_required_components?.length || status.needs_update) return "warning";
  return "ready";
}

function getAppUpdateStatusTone(snapshot: AppUpdateSnapshot | null): ShellStatusItem["tone"] {
  if (!snapshot) return "neutral";
  if (snapshot.status === "error") return "error";
  if (snapshot.status === "available" || snapshot.status === "downloaded" || snapshot.status === "downloading") return "warning";
  return "ready";
}
