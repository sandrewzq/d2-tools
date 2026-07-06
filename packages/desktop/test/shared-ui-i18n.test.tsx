import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  AppShell,
  AccountPageView,
  AccountPageContentView,
  defaultProductPreferences,
  getEffectiveBungieLocale,
  getLocaleCopy,
  getLocalizedNavItems,
  HomePageView,
  LibraryPageContentView,
  LoadoutsPageContentView,
  SettingsPageView,
  SettingsPageContentView,
  VendorsPageContentView,
  type ProductPreferences
} from "../../ui/src/index";

describe("shared UI i18n", () => {
  it("keeps shell copy keys complete across supported interface locales", () => {
    const zhCopy = getLocaleCopy("zh-CN");
    const enCopy = getLocaleCopy("en-US");

    expect(Object.keys(enCopy.shell)).toEqual(Object.keys(zhCopy.shell));
    expect(Object.keys(enCopy.shell.tools)).toEqual(Object.keys(zhCopy.shell.tools));
    expect(Object.keys(enCopy.home)).toEqual(Object.keys(zhCopy.home));
    expect(Object.keys(enCopy.home.sections)).toEqual(Object.keys(zhCopy.home.sections));
    expect(Object.keys(enCopy.home.actions)).toEqual(Object.keys(zhCopy.home.actions));
    expect(getLocalizedNavItems("zh-CN").map((item) => item.label)).toEqual([
      "首页",
      "账号",
      "仓库",
      "配装",
      "资料库",
      "商人",
      "设置"
    ]);
    expect(getLocalizedNavItems("en-US").map((item) => item.label)).toEqual([
      "Home",
      "Account",
      "Vault",
      "Loadouts",
      "Library",
      "Vendors",
      "Settings"
    ]);
  });

  it("derives Bungie manifest locale from interface locale when follow mode is enabled", () => {
    const preferences: ProductPreferences = {
      ...defaultProductPreferences,
      interfaceLocale: "en-US",
      bungieLocale: "zh-chs",
      followInterfaceLocaleForBungie: true
    };

    expect(getEffectiveBungieLocale(preferences)).toBe("en");
    expect(getEffectiveBungieLocale({ ...preferences, followInterfaceLocaleForBungie: false })).toBe("zh-chs");
  });

  it("renders AppShell navigation and language switch from locale copy", () => {
    const html = renderToStaticMarkup(
      <AppShell
        activePage="home"
        assistantMode={null}
        colorMode="light"
        interfaceLocale="en-US"
        shellStatus={[{ label: "Bungie", value: "Ready", tone: "ready" }]}
        assistantPanel={<p>AI</p>}
        platformActions={{ openExternal: () => undefined }}
        onNavigate={() => {}}
        onAssistantModeChange={() => {}}
        onColorModeToggle={() => {}}
        onInterfaceLocaleToggle={() => {}}
      >
        <section>Home content</section>
      </AppShell>
    );

    expect(html).toContain("Home");
    expect(html).toContain("Settings");
    expect(html).toContain("Switch to Chinese");
    expect(html).toContain("EN");
    expect(html).not.toContain(">首页<");
  });

  it("renders prototype fallback views from English locale copy", () => {
    const accountHtml = renderToStaticMarkup(<AccountPageView interfaceLocale="en-US" />);
    const settingsHtml = renderToStaticMarkup(<SettingsPageView interfaceLocale="en-US" />);

    expect(accountHtml).toContain("Account workbench");
    expect(accountHtml).toContain("Refresh account");
    expect(accountHtml).not.toMatch(/[\u4e00-\u9fff]/);

    expect(settingsHtml).toContain("Settings");
    expect(settingsHtml).toContain("Refresh account");
    expect(settingsHtml).toContain("Backup migration");
    expect(settingsHtml).not.toMatch(/[\u4e00-\u9fff]/);
  });

  it("renders AppShell assistant drawer and account status without Chinese shell internals", () => {
    const html = renderToStaticMarkup(
      <AppShell
        activePage="home"
        assistantMode="ai"
        colorMode="light"
        interfaceLocale="en-US"
        shellStatus={[{ label: "Account", value: "Ready", tone: "ready", key: "account" }]}
        assistantPanel={<p>AI</p>}
        platformActions={{ openExternal: () => undefined }}
        onNavigate={() => {}}
        onAssistantModeChange={() => {}}
        onColorModeToggle={() => {}}
        onInterfaceLocaleToggle={() => {}}
      >
        <section>Home content</section>
      </AppShell>
    );

    expect(html).toContain("shell-account-status");
    expect(html).toContain('aria-label="AI assistant drawer"');
    expect(html).not.toMatch(/[\u4e00-\u9fff]/);
  });

  it("renders shared home view static labels from interface locale copy", () => {
    const html = renderToStaticMarkup(
      <HomePageView
        interfaceLocale="en-US"
        diagnosticRows={[{ tone: "ready" }]}
        onCopyDailySummary={() => undefined}
        onRefreshDiagnostics={() => undefined}
      />
    );

    expect(html).toContain("Weekly update");
    expect(html).toContain("Daily update");
    expect(html).toContain("Account alerts");
    expect(html).toContain("Weekly public rotation");
    expect(html).not.toContain("本周奖励与轮换");
    expect(html).not.toContain("今天可确认");
    expect(html).not.toMatch(/[\u4e00-\u9fff]/);
  });

  it("renders shared account and settings page copy from English locale", () => {
    const accountHtml = renderToStaticMarkup(
      <AccountPageContentView
        interfaceLocale="en-US"
        accountSummary={null}
        startupState={{ cards: { account: { label: "Not signed in" } } }}
        accountWorkspace={{}}
        selectedCharacter={null}
        selectedCharacterId=""
        isBungieConfigured={false}
        isAccountLoggedIn={false}
        canLoadAccount={false}
        isLoadingAccount={false}
        accountError=""
        itemDetailError=""
        itemDetailLoadingKey=""
        writeActionsEnabled={false}
        activitySummary={null}
        activityMessage=""
        activityError=""
        loadoutMessage=""
        itemActionMessage=""
        isRunningItemAction={false}
        activeLoadoutLookup={null}
        activeLoadoutTemplate={null}
        onConfigureBungie={() => undefined}
        onLoginBungie={() => undefined}
        onLoadAccount={() => undefined}
        onRefreshActivity={() => undefined}
        onSelectCharacter={() => undefined}
        onSaveCharacterLoadout={() => undefined}
        onEquipHighestPowerItems={() => undefined}
        onOpenItem={() => undefined}
        isLoadoutMatch={() => false}
        getAccountPageItemKey={() => ""}
        formatAccountItemMeta={() => ""}
      />
    );

    const settingsHtml = renderToStaticMarkup(
      <SettingsPageContentView
        interfaceLocale="en-US"
        initialSection="overview"
        message=""
        error=""
        diagnosticDataDir=""
        writeActionsEnabled={false}
        updateSnapshot={null}
        manifestStatus={null}
        manifestStatusError=""
        isLoadingManifestStatus={false}
        isInitializingManifest={false}
        accountSummary={null}
        accountError=""
        isLoadingAccount={false}
        lastAccountLoadedAt={null}
        isAiConfigured={false}
        onRefreshAccount={() => undefined}
        onReauthorizeAccount={() => undefined}
        backgroundTasks={[]}
        actionLog={[]}
        actionLogResultFilter="all"
        actionLogTypeFilter="all"
        aiSettingsPanel={<p>AI</p>}
        onOpenDataDir={() => undefined}
        onWriteActionsEnabledChange={() => undefined}
        onCheckForUpdates={() => undefined}
        onDownloadUpdate={() => undefined}
        onQuitAndInstallUpdate={() => undefined}
        onOpenUpdateDownloadPage={() => undefined}
        onCopyUpdateDiagnostic={() => undefined}
        onRefreshManifestStatus={() => undefined}
        onInitializeManifest={() => undefined}
        onRepairManifest={() => undefined}
        onExportConfig={() => undefined}
        onImportConfig={() => undefined}
        onClearCache={() => undefined}
        onCopyDataBackupGuide={() => undefined}
        onCopyDiagnosticsExport={() => undefined}
        onRefreshDiagnostics={() => undefined}
        onRefreshActionLog={() => undefined}
        onActionLogResultFilterChange={() => undefined}
        onActionLogTypeFilterChange={() => undefined}
        onCopyActionDiagnostic={() => undefined}
        languagePreferences={{
          interfaceLocale: "en-US",
          bungieLocale: "en",
          followInterfaceLocaleForBungie: true
        }}
        onLanguagePreferencesChange={() => undefined}
        onLoadBungieConfig={async () => ({ bungie: { api_key: "", client_id: "", client_secret: "", redirect_uri: "" } })}
        onSaveBungieConfig={async () => undefined}
      />
    );

    expect(accountHtml).toContain("Account");
    expect(accountHtml).toContain("Configure Bungie");
    expect(accountHtml).not.toContain("账号摘要");
    expect(accountHtml).not.toContain("未连接 Bungie");
    expect(accountHtml).not.toMatch(/[\u4e00-\u9fff]/);

    expect(settingsHtml).toContain("Settings");
    expect(settingsHtml).toContain("Common actions");
    expect(settingsHtml).not.toContain("设置总览");
    expect(settingsHtml).not.toContain("常用操作");
    expect(settingsHtml).not.toContain("检查更新");
    expect(settingsHtml).not.toMatch(/[\u4e00-\u9fff]/);
  });

  it("renders shared library, vendors and loadouts page copy from English locale", () => {
    const libraryHtml = renderToStaticMarkup(
      <LibraryPageContentView
        interfaceLocale="en-US"
        libraryViewMode="equipment"
        items={[]}
        perks={[]}
        equipmentFilters={{
          query: "",
          group: "all",
          tier: "all",
          bucket: "all",
          ammo: "all",
          frame: [],
          sourceStatus: "all",
          perkPool: "all",
          dropAccess: "all",
          perkQuery: ""
        }}
        perkFilters={{ query: "", relatedGroup: "all", hasRelatedItems: "all" }}
        equipmentSearchTouched={false}
        perkSearchTouched={false}
        isSearching={false}
        searchError=""
        aliasDraft=""
        aliasTargetDraft=""
        aliasKind="item"
        aliasMessage=""
        libraryHistory={{ recent: [], favorites: [] }}
        libraryCommunityMatch={new Map()}
        liveAvailability={null}
        liveAvailabilityError=""
        isLoadingLiveAvailability={false}
        manifestStatus={null}
        manifestStatusError=""
        isLoadingManifestStatus={false}
        isInitializingManifest={false}
        itemDetailLoadingKey=""
        onViewModeChange={() => undefined}
        onEquipmentFiltersChange={() => undefined}
        onPerkFiltersChange={() => undefined}
        onSearch={() => undefined}
        onClearFilters={() => undefined}
        onRefreshManifestStatus={() => undefined}
        onInitializeManifest={() => undefined}
        onAliasDraftChange={() => undefined}
        onAliasTargetDraftChange={() => undefined}
        onAliasKindChange={() => undefined}
        onSaveAlias={() => undefined}
        onOpenItemDetail={() => undefined}
        onAddFavorite={() => undefined}
        onRemoveFavorite={() => undefined}
      />
    );

    const selectedLoadoutTemplate = {
      id: "template-1",
      name: "Test build",
      class_name: "Hunter",
      created_at: "2026-07-02T00:00:00.000Z",
      updated_at: "2026-07-02T00:00:00.000Z",
      items: [
        {
          hash: 1,
          name: "Test item",
          bucket_name: "Kinetic",
          weapon_frame_name: "Adaptive",
          perk_names: ["Trait"]
        }
      ]
    };

    const loadoutsHtml = renderToStaticMarkup(
      <LoadoutsPageContentView
        interfaceLocale="en-US"
        accountSummary={null}
        templates={[selectedLoadoutTemplate]}
        selectedTemplate={selectedLoadoutTemplate}
        compareTemplate={null}
        selectedAnalysis={null}
        transferPlan={null}
        statusSummary={[]}
        visibleCompareRows={[]}
        missingCount={0}
        readyCount={0}
        actionableCount={0}
        compareTemplateId=""
        renameDraft=""
        showDiffOnly={false}
        message=""
        isRunningItemAction={false}
        actionFeedback={{}}
        getItemStatus={() => ({ key: "missing", badge_tone: "neutral", badge_label: "Missing", location_label: "" })}
        getBlockedDetails={() => null}
        getSourceItem={() => null}
        getActionFeedbackKey={() => ""}
        formatComparePerks={(perks) => perks.join(" / ")}
        onSelectTemplate={() => undefined}
        onSelectCompareTemplate={() => undefined}
        onRenameDraftChange={() => undefined}
        onShowDiffOnlyChange={() => undefined}
        onRenameTemplate={() => undefined}
        onDeleteTemplate={() => undefined}
        onCreateTransferPlan={() => undefined}
        onCopyMissingItems={() => undefined}
        onExecuteMissingTransfer={() => undefined}
        onExecuteSingleItemTransfer={() => undefined}
        onEquipSingleItem={() => undefined}
        onEquipSavedLoadout={() => undefined}
        onSnapshotCurrentLoadout={() => undefined}
        onOpenTemplateSourceItem={() => undefined}
      />
    );

    const vendorsHtml = renderToStaticMarkup(
      <VendorsPageContentView
        interfaceLocale="en-US"
        vendors={[]}
      />
    );

    expect(libraryHtml).toContain("Source lookup");
    expect(libraryHtml).toContain("Search results");
    expect(libraryHtml).not.toMatch(/[\u4e00-\u9fff]/);

    expect(vendorsHtml).toContain("No vendor inventory");
    expect(vendorsHtml).toContain("verified inventory samples");
    expect(vendorsHtml).not.toMatch(/[\u4e00-\u9fff]/);

    expect(loadoutsHtml).toContain("Loadout risk");
    expect(loadoutsHtml).toContain("Loadout workbench");
    expect(loadoutsHtml).not.toMatch(/[\u4e00-\u9fff]/);
  });
});
