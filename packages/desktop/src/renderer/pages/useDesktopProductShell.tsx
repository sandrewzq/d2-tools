import {
  ControlButton,
  getLocaleCopy,
  ShellSidebarAccountSummary,
  ShellSidebarActions,
  StartupGate,
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
import { useGuideLibrary } from "../features/guides/useGuideLibrary";
import { useLibraryWorkspace } from "../features/library/useLibraryWorkspace";
import { useLoadoutTemplates } from "../features/loadouts/useLoadoutTemplates";
import { useLocalLoadoutPlans } from "../features/loadouts/useLocalLoadoutPlans";
import { useDiagnosticsSettings } from "../features/settings/useDiagnosticsSettings";
import { useVendorsWorkspace } from "../features/vendors/useVendorsWorkspace";
import { useVendorDefinitionDetail } from "../features/vendors/useVendorDefinitionDetail";
import type { DesktopMenuSession } from "./providers/DesktopMenuProviderContext";
import { useDesktopProductWriteActions } from "./useDesktopProductWriteActions";

const ACCOUNT_PAGE_REVALIDATE_MS = 60_000;
type SettingsInitialSection = "overview" | "account" | "bungie";

export function useDesktopProductShell(props: {
  state: StartupState;
  onConfigChanged: () => void;
  onLoginComplete: () => void;
  onManifestInitialized: () => void;
}) {
  // #region debug-point B:shell-hook-enter
  void fetch("http://127.0.0.1:7777/event", { method: "POST", body: JSON.stringify({ sessionId: "desktop-first-load-stall", runId: "pre-fix-2", hypothesisId: "B", location: "useDesktopProductShell.tsx:entry", msg: "[DEBUG] desktop shell hook entered", data: {}, ts: Date.now() }) }).catch(() => {});
  // #endregion
  const visualEnv = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env;
  const visualInitialPage = visualEnv?.VITE_D2_VISUAL_PAGE;
  const visualColorMode = isColorMode(visualEnv?.VITE_D2_VISUAL_THEME) ? visualEnv?.VITE_D2_VISUAL_THEME : undefined;
  const startupStep = props.state.nextStep;
  const initialPage: ShellPageKey = isShellPageKey(visualInitialPage)
    ? visualInitialPage
    : "home";
  const [activePage, setActivePage] = useState<ShellPageKey>(initialPage);
  const [settingsInitialSection, setSettingsInitialSection] = useState<SettingsInitialSection>(
    props.state.cards.bungieConfig.status === "missing" ? "bungie" : "overview"
  );
  const [assistantMode, setAssistantMode] = useState<ShellAssistantMode>(null);
  const [hasAutoLoadedAccount, setHasAutoLoadedAccount] = useState(false);
  const [vaultFacts, setVaultFacts] = useState<string[]>([]);
  const [vaultLocateRequest, setVaultLocateRequest] = useState<{
    hash: number;
    name: string;
    requestId: number;
  } | null>(null);
  const [vaultTargetLocateRequest, setVaultTargetLocateRequest] = useState<{
    targetId: string;
    requestId: number;
  } | null>(null);
  const [armorResultTraceRequest, setArmorResultTraceRequest] = useState<{
    resultId: string;
    candidateId: string;
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
    applyPendingAccountActionPatches,
    vaultTags,
    setVaultTags,
    accountError,
    setAccountError,
    accountWarning,
    isLoadingAccount,
    lastAccountLoadedAt,
    selectedCharacterId,
    activitySummary,
    importedWishlist,
    localTargetRules,
    setLocalTargetRules,
    equipmentTargetStore,
    setEquipmentTargetStore,
    refreshAccountSnapshot,
    refreshAuthoritativeAccountSnapshot,
    readAuthoritativeAccountSnapshot,
    applyBackgroundAccountSnapshot
  } = accountWorkspace;
  const refreshAccountManually = () => refreshAccountSnapshot("manual");
  const refreshAccountAfterWrite = () => refreshAccountSnapshot("write-action");
  const reloadAccountAfterWrite = async () => {
    await refreshAccountSnapshot("write-action");
  };
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
  const guides = useGuideLibrary({
    active: activePage === "guides",
    onEquipmentTargetStoreChanged: setEquipmentTargetStore
  });
  const loadoutLibrary = useLoadoutTemplates();
  const localLoadoutPlans = useLocalLoadoutPlans({ refreshAccount: refreshAccountAfterWrite });
  const writeActions = useDesktopProductWriteActions({
    accountSummary,
    applyAccountActionPatches,
    applyPendingAccountActionPatches,
    diagnostics,
    vaultTags,
    setVaultTags,
    importedWishlist,
    localTargetRules,
    itemDetailCacheScopeKey,
    setAccountError,
    loadAccountSummary: reloadAccountAfterWrite,
    loadAuthoritativeAccountSummary: refreshAuthoritativeAccountSnapshot,
    readAuthoritativeAccountSummary: readAuthoritativeAccountSnapshot,
    applyAuthoritativeAccountSummary: applyBackgroundAccountSnapshot,
    loadoutLibrary,
    onRecentHistoryChanged: library.setLibraryHistory
  });
  const itemDetail = writeActions.itemDetail;
  const vendorDefinitionDetail = useVendorDefinitionDetail({ vendorSourcePaths, vaultTags });
  const isRunningItemAction = writeActions.isRunningItemAction;

  function handlePageChange(page: ShellPageKey) {
    if (startupStep !== "home" && page !== "home" && page !== "settings") return;
    itemDetail.closeSelectedItemDetail();
    vendorDefinitionDetail.close();
    if (page === "settings") {
      setSettingsInitialSection("overview");
    }
    setActivePage(page);
  }

  function openBungieSettings() {
    setSettingsInitialSection("bungie");
    itemDetail.closeSelectedItemDetail();
    vendorDefinitionDetail.close();
    setActivePage("settings");
  }

  function openStartupSettings() {
    setSettingsInitialSection(startupStep === "bungie-config" ? "bungie" : "account");
    itemDetail.closeSelectedItemDetail();
    vendorDefinitionDetail.close();
    setActivePage("settings");
  }

  function locateVaultItem(item: { hash: number; name: string }) {
    setVaultLocateRequest((current) => ({
      ...item,
      requestId: (current?.requestId ?? 0) + 1
    }));
    setActivePage("vault");
  }

  function locateVaultTarget(targetId: string) {
    setVaultTargetLocateRequest((current) => ({
      targetId,
      requestId: (current?.requestId ?? 0) + 1
    }));
    setActivePage("vault");
  }

  function locateArmorResultReference(reference: { resultId: string; candidateId: string }) {
    setArmorResultTraceRequest((current) => ({
      ...reference,
      requestId: (current?.requestId ?? 0) + 1
    }));
    setActivePage("loadouts");
  }

  useEffect(() => {
    if (isVisualCapture) {
      return;
    }
    void diagnostics.refreshDiagnostics();
    void library.loadLibraryHistory();
  }, [isVisualCapture]);

  const isManifestReady = diagnostics.manifestStatus
    ? Boolean(
        diagnostics.manifestStatus.initialized
        && !diagnostics.manifestStatus.missing_required_components?.length
      )
    : props.state.cards.manifest.status === "ready";

  useEffect(() => {
    if (startupStep !== "home") {
      setActivePage("home");
    } else {
      setActivePage((current) => current === "settings" ? "home" : current);
    }
  }, [startupStep]);

  useEffect(() => {
    if (isVisualCapture || !isManifestReady) return;
    void daily.loadDailySummary();
  }, [isManifestReady, isVisualCapture]);

  const refreshAccountRef = useRef(refreshAccountSnapshot);
  const accountPageRefreshAttemptedRef = useRef(false);
  const previousManifestReadyRef = useRef(isManifestReady);
  refreshAccountRef.current = refreshAccountSnapshot;
  const canRefreshAccount = props.state.cards.bungieConfig.status === "ready"
    && props.state.cards.account.status === "ready";

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
    const wasReady = previousManifestReadyRef.current;
    previousManifestReadyRef.current = isManifestReady;
    if (isVisualCapture || wasReady || !isManifestReady || !canRefreshAccount || !hasAutoLoadedAccount) return;
    void refreshAccountRef.current("auto");
  }, [canRefreshAccount, hasAutoLoadedAccount, isManifestReady, isVisualCapture]);

  useEffect(() => {
    if (activePage !== "account") {
      accountPageRefreshAttemptedRef.current = false;
      return;
    }
    if (!hasAutoLoadedAccount || !canRefreshAccount || accountPageRefreshAttemptedRef.current) return;

    accountPageRefreshAttemptedRef.current = true;
    if (isLoadingAccount) return;
    if (lastAccountLoadedAt && Date.now() - lastAccountLoadedAt.getTime() < ACCOUNT_PAGE_REVALIDATE_MS) return;

    void refreshAccountRef.current("auto");
  }, [activePage, canRefreshAccount, hasAutoLoadedAccount, isLoadingAccount, lastAccountLoadedAt]);

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
    interfaceLocale: diagnostics.languagePreferences.interfaceLocale,
    onRepairManifest: () => void diagnostics.repairManifest(),
    onOpenAppUpdateSettings: () => {
      setSettingsInitialSection("overview");
      handlePageChange("settings");
    }
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
    onConfigure: openBungieSettings,
    onConfigChanged: props.onConfigChanged,
    setActivePage,
    settingsInitialSection,
    setSettingsInitialSection,
    setVaultFacts,
    vaultLocateRequest,
    locateVaultItem,
    vaultTargetLocateRequest,
    locateVaultTarget,
    armorResultTraceRequest,
    locateArmorResultReference,
    dismissArmorResultTrace: () => setArmorResultTraceRequest(null),
    lastAccountLoadedAt,
    refreshAccountManually,
    account: accountWorkspace,
    daily,
    diagnostics,
    home: homeDerivedState,
    guides,
    library,
    loadouts: loadoutLibrary,
    localLoadoutPlans,
    vendors: vendorsWorkspace,
    vendorDefinitionDetail,
    writeActions
  };

  const assistantPanel = (
    <GlobalAssistantSidebar
      assistantMode={assistantMode}
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
      onOpenArtifact={(artifact) => {
        if (artifact.kind === "guide_capture") {
          guides.startImportText({
            title: artifact.title,
            body: artifact.raw_text,
            sourceLabel: "AI 工作台整理"
          });
          setActivePage("guides");
          setAssistantMode(null);
          return;
        }
        localLoadoutPlans.prefillFromAssistant(artifact);
        setActivePage("loadouts");
        setAssistantMode(null);
      }}
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
      equipmentTargetStore,
      onLocateOwnedItem: locateVaultItem,
      interfaceLocale: diagnostics.languagePreferences.interfaceLocale,
      vendorDefinitionDetail,
      vaultTags
    },
    menuSession,
    startupGate: startupStep !== "home" && activePage !== "settings" ? (
      <StartupGate
        step={startupStep}
        isManifestReady={isManifestReady}
        isManifestBusy={diagnostics.isInitializingManifest}
        manifestError={diagnostics.manifestStatusError}
        isBusy={accountWorkspace.isLoggingIn}
        error={accountWorkspace.loginError || accountWorkspace.accountError}
        onConfigure={openBungieSettings}
        onLogin={() => void accountWorkspace.loginBungie()}
        onOpenSettings={openStartupSettings}
      />
    ) : null,
    pageHeader: {
      title: currentPageMeta.title,
      subtitle: currentPageMeta.subtitle,
      actions: activePage === "home" ? (
        daily.dailyError ? null : (
          <ControlButton
            variant="secondary"
            aria-busy={daily.isLoadingDaily}
            disabled={daily.isLoadingDaily || !isManifestReady}
            onClick={() => void daily.loadDailySummary(true)}
          >
            刷新公开情报
          </ControlButton>
        )
      ) : activePage === "account" ? (
        accountSummary ? (
          <>
            <ControlButton variant="secondary" disabled={accountWorkspace.isLoggingIn} onClick={() => void accountWorkspace.loginBungie()}>重新授权</ControlButton>
            <ControlButton variant="primary" aria-busy={isLoadingAccount} disabled={isLoadingAccount} onClick={() => void refreshAccountManually()}>刷新账号</ControlButton>
          </>
        ) : null
      ) : activePage === "vault" ? (
        accountSummary ? <ControlButton variant="primary" aria-busy={isLoadingAccount} disabled={isLoadingAccount} onClick={() => void refreshAccountManually()}>刷新账号装备</ControlButton> : null
      ) : activePage === "library" ? (
        <>
          <ControlButton onClick={() => void diagnostics.refreshManifestStatus()}>重新检查资料库</ControlButton>
          <ControlButton variant="primary" disabled={diagnostics.isInitializingManifest} onClick={() => void diagnostics.repairManifest()}>修复资料库</ControlButton>
        </>
      ) : activePage === "vendors" ? (
        accountSummary && vendorsWorkspace.model.vendors.length ? <ControlButton variant={vendorsWorkspace.model.statusBanner?.tone === "error" ? "primary" : "secondary"} aria-busy={vendorsWorkspace.isManualRefreshing} disabled={vendorsWorkspace.isManualRefreshing} onClick={() => void vendorsWorkspace.refresh()}>刷新商人库存</ControlButton> : null
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
  interfaceLocale: ProductPreferences["interfaceLocale"];
  onRepairManifest: () => void;
  onOpenAppUpdateSettings: () => void;
}): ShellStatusItem[] {
  const needsLibraryRepair = Boolean(input.manifestStatus?.missing_required_components?.length);
  const waitingForBungieConfig = !input.isBungieConfigured;
  const shellCopy = getLocaleCopy(input.interfaceLocale).shell;
  const appUpdateStatus = getAppUpdateShellStatus(input.appUpdateSnapshot, shellCopy.update);

  return [
    {
      key: "bungie",
      label: "Bungie",
      value: input.isBungieConfigured ? "已配置" : "未配置",
      tone: input.isBungieConfigured ? "ready" : "warning",
      priority: input.isBungieConfigured ? "quiet" : "attention"
    },
    {
      key: "account",
      label: "账号",
      value: formatAccountShellStatus(input.accountSummary, input.lastAccountLoadedAt, input.isLoadingAccount, input.accountError, input.accountWarning, input.canRefreshAccount),
      tone: getAccountStatusTone(input.accountSummary, input.isLoadingAccount, input.accountError, input.accountWarning, input.canRefreshAccount),
      priority: input.accountError || input.accountWarning ? "attention" : "standard"
    },
    {
      key: "library",
      label: "资料库",
      value: waitingForBungieConfig
        ? "等待配置"
        : input.manifestStatusError
        ? "检查失败"
        : (needsLibraryRepair ? "修复资料库" : formatManifestShellStatus(input.manifestStatus)),
      tone: waitingForBungieConfig ? "neutral" : input.manifestStatusError ? "error" : getManifestStatusTone(input.manifestStatus),
      priority: waitingForBungieConfig ? "standard" : input.manifestStatusError || needsLibraryRepair ? "attention" : "standard",
      actionLabel: waitingForBungieConfig || !needsLibraryRepair ? undefined : "修复资料库",
      onAction: waitingForBungieConfig || !needsLibraryRepair ? undefined : input.onRepairManifest
    },
    {
      key: "ai",
      label: "AI",
      value: input.isAiConfigured ? "已配置" : "未配置",
      tone: input.isAiConfigured ? "ready" : "warning",
      priority: input.isAiConfigured ? "quiet" : "standard"
    },
    {
      key: "app-version",
      kind: "update",
      ...appUpdateStatus,
      actionLabel: appUpdateStatus.priority === "quiet" ? undefined : shellCopy.update.open,
      onAction: appUpdateStatus.priority === "quiet" ? undefined : input.onOpenAppUpdateSettings
    }
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

function getAppUpdateShellStatus(
  snapshot: AppUpdateSnapshot | null,
  copy: ReturnType<typeof getLocaleCopy>["shell"]["update"]
): Pick<ShellStatusItem, "label" | "value" | "tone" | "priority"> {
  if (!snapshot) {
    return { label: copy.versionLabel, value: copy.reading, tone: "neutral", priority: "quiet" };
  }

  const currentVersion = formatAppVersion(snapshot.current_version);
  const availableVersion = snapshot.available_version ? formatAppVersion(snapshot.available_version) : undefined;
  const downloadedVersion = snapshot.downloaded_version
    ? formatAppVersion(snapshot.downloaded_version)
    : availableVersion;

  switch (snapshot.status) {
    case "idle":
      return { label: copy.versionLabel, value: currentVersion, tone: "neutral", priority: "quiet" };
    case "checking":
      return { label: copy.updateLabel, value: copy.checking, tone: "pending", priority: "standard" };
    case "available":
      return { label: copy.updateLabel, value: copy.available(availableVersion), tone: "pending", priority: "attention" };
    case "downloading":
      return { label: copy.updateLabel, value: copy.downloading(availableVersion, snapshot.progress_percent), tone: "pending", priority: "attention" };
    case "downloaded":
      return { label: copy.updateLabel, value: copy.downloaded(downloadedVersion), tone: "warning", priority: "critical" };
    case "error":
      return { label: copy.updateLabel, value: copy.error, tone: "error", priority: "attention" };
    case "not_available":
    default:
      return { label: copy.versionLabel, value: currentVersion, tone: "ready", priority: "quiet" };
  }
}

function formatAppVersion(version: string): string {
  return version.startsWith("v") ? version : `v${version}`;
}

function isShellPageKey(value: string | undefined): value is ShellPageKey {
  return value === "home" || value === "account" || value === "vault" || value === "loadouts" || value === "guides" || value === "library" || value === "vendors" || value === "settings";
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
