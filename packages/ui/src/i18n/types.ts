import type { ShellPageKey } from "../shell/types.js";

export type InterfaceLocale = "zh-CN" | "en-US";
export type BungieManifestLocale = "zh-chs" | "en";

export type ProductPreferences = {
  interfaceLocale: InterfaceLocale;
  bungieLocale: BungieManifestLocale;
  followInterfaceLocaleForBungie: boolean;
  colorMode: "light" | "dark";
  density?: "compact" | "standard" | "comfortable";
};

export type ShellCopy = {
  brandSubtitle: string;
  statusAriaLabel: string;
  statusMenuLabel: string;
  update: {
    versionLabel: string;
    updateLabel: string;
    reading: string;
    checking: string;
    available: (version?: string) => string;
    downloading: (version?: string, progress?: number) => string;
    downloaded: (version?: string) => string;
    error: string;
    open: string;
  };
  toolstripAriaLabel: string;
  navigationAriaLabel: string;
  assistantPanelAriaLabel: string;
  windowControlsAriaLabel: string;
  windowControls: {
    minimize: string;
    toggleMaximize: string;
    close: string;
  };
  assistant: {
    title: string;
    currentPage: (page: string) => string;
    close: string;
  };
  backgroundTasks: {
    ariaLabel: string;
    title: string;
    itemCount: (count: number) => string;
    activeSummary: (count: number) => string;
    failedSummary: (count: number) => string;
    recentSummary: string;
    openAll: string;
    fallbackTitle: string;
    status: {
      idle: string;
      queued: string;
      running: string;
      runningProgress: (progress: number) => string;
      retrying: string;
      retryingAt: (time: string) => string;
      success: string;
      failed: string;
      blocked: string;
    };
  };
  navigation: Record<ShellPageKey, string>;
  tools: {
    switchToDark: string;
    switchToLight: string;
    switchToChinese: string;
    switchToEnglish: string;
    github: string;
    settings: string;
    openAiAssistant: string;
    aiAssistant: string;
    languageBadge: string;
  };
};

export type LocaleCopy = {
  shell: ShellCopy;
  home: HomeCopy;
  guides: GuideCopy;
  vault: VaultCopy;
  loadouts: LoadoutsCopy;
  library: LibraryCopy;
  vendors: VendorsCopy;
  account: AccountCopy;
  settings: SettingsCopy;
};

export type GuideCopy = {
  filters: { all: string; active: string; archived: string; favorites: string; categories: string };
  searchPlaceholder: string;
  importGuide: string;
  newGuide: string;
  emptyTitle: string;
  emptyDetail: string;
  noResultsTitle: string;
  noResultsDetail: string;
  selectTitle: string;
  selectDetail: string;
  actions: { edit: string; save: string; cancel: string; favorite: string; unfavorite: string; archive: string; restore: string; delete: string; retry: string; openSource: string };
  fields: { title: string; category: string; tags: string; sourceKind: string; sourceLabel: string; sourceUrl: string; body: string };
  sourceKinds: { text: string; note: string; url: string };
  tagPlaceholder: string;
  categoryPlaceholder: string;
  sourceLabelPlaceholder: string;
  sourceUrlPlaceholder: string;
  bodyPlaceholder: string;
  draftNotice: string;
  localOnly: string;
  archived: string;
  snapshots: (count: number) => string;
  results: (count: number) => string;
  updated: string;
  source: string;
  snapshotHistory: string;
  currentBody: string;
  loading: string;
  loadingDetail: string;
  saving: string;
  deleteConfirmation: (title: string) => string;
  sourceReader: {
    read: string;
    reading: string;
    title: string;
    detail: string;
    useBody: string;
    dismiss: string;
    finalUrl: string;
    sections: (count: number) => string;
    bytes: (count: number) => string;
    readAt: (time: string) => string;
    warnings: string;
    unavailable: string;
    previewTruncated: string;
  };
  extraction: {
    title: string;
    detail: string;
    extract: string;
    extracting: string;
    reextract: string;
    review: string;
    confirm: string;
    confirming: string;
    dismiss: string;
    confirmed: string;
    confirmedAt: (time: string) => string;
    accepted: (accepted: number, total: number) => string;
    noCandidates: string;
    reference: (line: number, quote: string) => string;
    warnings: string;
    confidence: { high: string; medium: string; low: string };
    candidateDetails: {
      class: string;
      subclass: string;
      exotic_armor: string;
      weapon_specific: string;
      weapon_archetype: string;
      weapon_element: string;
      weapon_role: string;
      armor_stat: string;
      armor_stat_legacy: string;
      mod: string;
      aspect: string;
      fragment: string;
    };
    perks: (names: string[]) => string;
    targetConversion: {
      title: string;
      detail: string;
      convert: string;
      converting: string;
      result: (created: number, unchanged: number) => string;
    };
    armorConstraintDraft: {
      title: string;
      detail: string;
      open: string;
      statLabels: Record<"health" | "melee" | "grenade" | "super" | "class" | "weapon", string>;
      summary: (targets: string[]) => string;
      exoticOnly: string;
      confirmation: (value: string) => string;
    };
    loadoutCandidates: {
      title: string;
      detail: string;
      create: string;
      creating: string;
      open: string;
      character: (className: string) => string;
      result: (matched: number, alternatives: number, missing: number) => string;
    };
  };
  derivedRelations: {
    title: string;
    detail: string;
    empty: string;
    open: string;
    createdAt: (time: string) => string;
    kinds: Record<
      | "guide_to_equipment_target"
      | "guide_to_armor_constraint_draft"
      | "guide_to_loadout_candidates"
      | "armor_result_to_equipment_target"
      | "armor_constraint_draft_to_local_loadout_plan"
      | "loadout_candidates_to_local_loadout_plan",
      string
    >;
  };
};

export type HomeCopy = {
  inline: Record<string, string>;
  dataStripAriaLabel: string;
  sections: {
    weeklyRewards: { title: string; subtitle: string; badge: string };
    today: { title: string; subtitle: string };
    vendors: { title: string; subtitle: string };
    account: { title: string; subtitle: string };
    pending: { title: string; subtitle: string };
  };
  actions: {
    runDiagnostics: string;
    diagnosing: string;
  };
  labels: {
    dailyReset: string;
    weeklyReset: string;
    manifest: string;
    accountData: string;
    priority: string;
    focusCount: string;
    confirmed: string;
    pending: string;
    error: string;
    focus: string;
  };
  fallback: {
    dailyPending: string;
    dailyWaiting: string;
    weeklyPending: string;
    weeklyResetDetail: string;
    manifestReady: string;
    manifestNeedsAttention: string;
    accountFailed: string;
    accountReady: string;
    accountPending: string;
    weeklyFixedMeta: string;
    otherRewardMeta: string;
    waitingRefresh: string;
    todayLoadingTitle: string;
    todayLoadingMessage: string;
    todayActionTitle: string;
    todayQuiet: string;
    noGuessBeforeWeekend: string;
    nightfallWaiting: string;
    vendorsWaiting: string;
    healthFailed: string;
    healthReady: string;
  };
  rewardGroups: {
    powerTitle: string;
    otherTitle: string;
    powerPriority: string;
  };
  intel: {
    publicRotation: string;
    weekendWindow: string;
    raidDungeon: string;
    activityIntel: string;
    doubleRewards: string;
    doubleRewardsDetail: string;
    xur: string;
    trialsMap: string;
    trialsMapDetail: string;
    weekendChecklist: string;
    weekendChecklistDetail: string;
  };
  vendors: {
    xurDetail: string;
    bansheeDetail: string;
    adaDetail: string;
    weekendBadge: string;
    waitingBadge: string;
  };
  account: {
    failedTitle: string;
    readyTitle: string;
    pendingTitle: string;
    syncing: string;
    pendingMessage: string;
    failedBadge: string;
    readyBadge: string;
    pendingBadge: string;
    vaultTitle: string;
    vaultReady: string;
    vaultMissing: string;
    vaultReadyBadge: string;
    vaultMissingBadge: string;
    diagnosticWarningTitle: string;
    diagnosticReadyTitle: string;
    diagnosticWarning: (count: number) => string;
    diagnosticReady: string;
    diagnosticWarningBadge: string;
  };
};

export type VaultCopy = {
  title: string;
  subtitle: string;
  emptyTitle: string;
  emptySubtitle: string;
  loading: string;
  loadAccount: string;
};

export type LoadoutsCopy = {
  inline: Record<string, string>;
  title: string;
  subtitle: string;
  riskTitle: string;
  riskSubtitle: string;
  missingItems: string;
  readyItems: string;
  actionableItems: string;
};

export type LibraryCopy = {
  inline: Record<string, string>;
  title: string;
  subtitle: string;
  versionLabel: string;
  freshLabel: string;
  staleLabel: string;
  tabs: {
    equipment: string;
    perks: string;
  };
};

export type VendorsCopy = {
  inline: Record<string, string>;
  title: string;
  subtitle: string;
  inventoryTitle: string;
  inventorySubtitle: string;
  updatedLabel: string;
  resetLabel: string;
  sourceLabel: string;
  recommendationsLabel: string;
  verifiedInventory: string;
  loadingTitle: string;
  emptyTitle: string;
  emptyBody: string;
  labels: {
    items: string;
    cost: string;
    evidence: string;
    owned: string;
    recommended: string;
    unknown: string;
  };
};

export type AccountCopy = {
  inline: Record<string, string>;
  title: string;
  subtitle: string;
  loadAccount: string;
  loadingAccount: string;
  disconnectedBadge: string;
  loginMissingTitle: string;
  configMissingTitle: string;
  emptyBody: string;
  configureBungie: string;
  loginBungie: string;
  nav: {
    overview: string;
    loadout: string;
    activity: string;
    postmaster: string;
  };
  actions: {
    equipHighestPower: string;
    running: string;
  };
};

export type SettingsCopy = {
  inline: Record<string, string>;
  menuAriaLabel: string;
  menu: {
    overview: { label: string; hint: string };
    language: { label: string; hint: string };
    account: { label: string; hint: string };
    library: { label: string; hint: string };
    bungie: { label: string; hint: string };
    ai: { label: string; hint: string };
    backup: { label: string; hint: string };
    diagnostics: { label: string; hint: string };
  };
  overview: {
    title: string;
    subtitle: string;
    commonActionsTitle: string;
    commonActionsSubtitle: string;
  };
  labels: {
    account: string;
    library: string;
    bungie: string;
    ai: string;
    appVersion: string;
    backgroundTasks: string;
  };
};
