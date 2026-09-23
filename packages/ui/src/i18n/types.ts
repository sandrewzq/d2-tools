import type { ShellPageKey } from "../shell/types.js";
import type { ToolAccess, ToolCategory } from "../directory/toolDirectory.js";
import type {
  VaultAmmoFilter,
  VaultChampionFilter,
  VaultClassFilter,
  VaultCraftingFilter,
  VaultDamageFilter,
  VaultGearTierFilter,
  VaultGroupFilter,
  VaultKnownSlotKey,
  VaultLockFilter,
  VaultLocationFilter,
  VaultRarityFilter,
  VaultSortKey,
  VaultTagFilter
} from "@d2-tools/app/vault";
import type { ArmorStatKey } from "@d2-tools/core/loadouts/analysis";

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
    openDetails: string;
    dismiss: string;
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
    openAiAssistant: string;
    aiAssistant: string;
    settings: string;
    languageBadge: string;
  };
};

export type LocaleCopy = {
  shell: ShellCopy;
  home: HomeCopy;
  vault: VaultCopy;
  itemDetail: ItemDetailCopy;
  loadouts: LoadoutsCopy;
  library: LibraryCopy;
  vendors: VendorsCopy;
  account: AccountCopy;
  settings: SettingsCopy;
  directory: DirectoryCopy;
};

export type DirectoryCopy = {
  searchLabel: string;
  searchPlaceholder: string;
  categoryLabel: string;
  categoryAll: string;
  categories: Record<ToolCategory, string>;
  accessLabels: Record<ToolAccess, string>;
  recommendedBadge: string;
  resultCount: (count: number) => string;
  open: string;
  openGithub: string;
  android: string;
  ios: string;
  reset: string;
  emptyTitle: string;
  emptyBody: string;
  developerTitle: string;
  developerHint: string;
  boundaryNotice: string;
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
    refreshHomeIntel: string;
    refreshingHomeIntel: string;
    retryHomeIntel: string;
    runDiagnostics: string;
    diagnosing: string;
  };
  labels: {
    homeIntel: string;
    lastRefreshed: string;
    notRefreshed: string;
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
  /**
   * 模板串与一次性文案的兜底表：zh-CN 侧留空，key 就是最终展示的中文原文；
   * en-US 侧以同一段中文原文为 key 写英文。消费侧统一用 `copy.inline[key] ?? key`。
   */
  inline: Record<string, string>;
  title: string;
  subtitle: string;
  emptyTitle: string;
  emptySubtitle: string;
  loading: string;
  loadAccount: string;
  /**
   * 时间戳按界面语言格式化。日期写法本身也是语言的一部分，而渲染层只拿得到 copy，
   * 所以它跟文案一起放在这里，不再各处硬编码 `Intl.DateTimeFormat("zh-CN", …)`。
   */
  formatDateTime: (value: string) => string;
  /**
   * 枚举标签是下拉项与筛选摘要的唯一来源，UI 按 key 查表，app 不需要知道 locale。
   * app 侧原来那批 `*Labels` 映射在迁移完成后删除，不留第二份。
   */
  labels: {
    groups: Record<VaultGroupFilter, string>;
    locations: Record<VaultLocationFilter, string>;
    tags: Record<VaultTagFilter, string>;
    sorts: Record<VaultSortKey, string>;
    locks: Record<VaultLockFilter, string>;
    ammo: Record<VaultAmmoFilter, string>;
    rarity: Record<VaultRarityFilter, string>;
    gearTiers: Record<VaultGearTierFilter, string>;
    classes: Record<VaultClassFilter, string>;
    damage: Record<VaultDamageFilter, string>;
    champions: Record<VaultChampionFilter, string>;
    crafting: Record<VaultCraftingFilter, string>;
    armorStats: Record<ArmorStatKey, string>;
    /**
     * 槽位名按 `VaultSlotKey` 查表，不再用 bucket 显示名。认不出的桶（`hash:` / `label:` 键）
     * 查不到表，消费侧回落到 app 给的原始名。
     */
    slots: Record<VaultKnownSlotKey, { label: string; short: string }>;
    slotAll: { label: string; short: string };
  };
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

/**
 * 装备详情用 `inline` 兜底：zh-CN 侧留空、key 就是最终展示的中文原文，
 * en-US 侧以同一段中文原文为 key 查英文。判别联合的分支结构不做成字段，
 * 由组件按原三元直接查表，避免把 kind 判断搬进 copy。
 */
export type ItemDetailCopy = {
  inline: Record<string, string>;
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
  accountContextLabel: string;
  verifiedInventory: string;
  loadingTitle: string;
  emptyTitle: string;
  emptyBody: string;
  labels: {
    items: string;
    cost: string;
    evidence: string;
    owned: string;
    unowned: string;
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
    sources: { label: string; hint: string };
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
