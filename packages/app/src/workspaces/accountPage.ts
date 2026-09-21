import type { AccountItemSummary, AccountMaterialSummary, AccountSummary } from "@d2-tools/core/account/summary";
import {
  buildAccountPursuitSummary,
  compareStableString,
  pursuitActionabilityRank,
  type AccountPursuit,
  type AccountPursuitSummary,
  type AccountPursuitTimeFrame
} from "@d2-tools/core/account/pursuits";
import type { ActivityHistorySummary } from "@d2-tools/core/activities/history";
import type { WeeklySummary } from "@d2-tools/core/weekly/summary";
import { accountEquipmentBucketHashes, bucketLabels, pursuitBucketHash } from "@d2-tools/core/items/classification";
import { buildCharacterPowerView, type CharacterPowerView } from "./accountPower.js";
import { buildAccountTodoChallenges, type AccountTodoChallenge } from "./accountTodoChallenges.js";
import { buildAccountCharacterTabs, type AccountCharacterTab } from "./characterTabs.js";

export type AccountOpenItemPayload = {
  item: AccountItemSummary;
  source_character_id: string;
  source_kind?: "equipped" | "inventory" | "postmaster";
  is_postmaster_item?: boolean;
};

export type AccountItemView = {
  key: string;
  name: string;
  icon?: string;
  primaryFacts: string[];
  stateFacts: string[];
  canOpenDetail: boolean;
  isPending: boolean;
  isSyncing: boolean;
  isLoadoutMatch: boolean;
  openPayload: AccountOpenItemPayload;
};

export type AccountReadonlyItemView = {
  key: string;
  name: string;
  icon?: string;
  typeLabel: string;
  sourceLabel: string;
  characterLabel?: string;
  progressLabel?: string;
  progressPercent?: number;
  isComplete?: boolean;
  statusLabel?: string;
  statusTone?: "neutral" | "pending" | "warning" | "success";
  /** 行正面主事实的字段名，例如「目标」「官方奖励名」。仅行动行有。 */
  primaryFactLabel?: string;
  /** 行正面主事实的值。字段名和值要么都有，要么都没有。 */
  primaryFactValue?: string;
  /** 行右侧时限提示，例如「14 小时后到期」。没有就退回 `statusLabel`。 */
  timeLabel?: string;
  /** 时限桶。行正面和事实表读同一份，不在渲染时重判一次。 */
  timeFrame?: AccountPursuitTimeFrame;
  /** 官方原文里带等级占位词（奖励物品名字或奖励物品的装备阶级）。二级「提光」按它收行。 */
  isPower?: boolean;
  /** 对应「本周刷取」里的活动键。挑战行有，任务行没有；深链接靠它认行、展开区靠它找掉落。 */
  activityKey?: string;
  /** 展开区的事实表。行动行才有；只读行没有可展开的内容。 */
  facts?: AccountReadonlyFactView[];
};

/** 行动行展开后的一行事实：字段名 / 值 / 这条值从哪来。 */
export type AccountReadonlyFactView = {
  label: string;
  value: string;
  source: string;
};

export type AccountReadonlyGroupView = {
  key: string;
  label: string;
  description: string;
  items: AccountReadonlyItemView[];
  status: "neutral" | "warning";
  defaultOpen?: boolean;
};

/** 页面视图用的角色页签名，和账号 / 仓库共用的那一份 builder 输出是同一个类型。 */
export type AccountCharacterTabView = AccountCharacterTab;

export type AccountSlotComparisonViewRow = {
  key: string;
  label: string;
  category: AccountSlotCategoryKey;
  equippedItems: AccountItemView[];
  inventoryItems: AccountItemView[];
};

export type AccountConnectionView = {
  hasAccount: boolean;
  isBungieConfigured: boolean;
  isAccountLoggedIn: boolean;
  canLoadAccount: boolean;
  isLoadingAccount: boolean;
  dataState: "synced" | "cached" | "refreshing";
  accountStatusLabel?: string;
};

export type AccountOperationFeedbackView = {
  tone: "neutral" | "pending" | "success" | "warning" | "error";
  message: string;
  phase?: "submitting" | "syncing" | "confirmed" | "partial" | "partial-confirmed" | "failed" | "delayed" | "paused" | "superseded";
  itemInstanceIds?: string[];
};

export type AccountFeedbackView = {
  accountError: string;
  accountWarning: string;
  itemDetailError: string;
  loadoutMessage: string;
  itemActionMessage: string;
  activityMessage: string;
  activityError: string;
  operation?: AccountOperationFeedbackView;
};

export type AccountProfileView = {
  accountName: string;
  profileLine: string;
  inventoryLine: string;
  snapshotAt?: string | number | Date | null;
};

export type AccountCharacterDetailView = {
  characterId: string;
  className: string;
  lightLabel: string;
  power: CharacterPowerView;
  emblemUrl?: string;
  summary: string;
};

export type AccountLoadoutSectionView = {
  equippedCount: number;
  inventoryCount: number;
  activeTemplateName?: string;
  selectedCharacterLoadoutMatchCount: number;
  isRunningItemAction: boolean;
  slotComparisonRows: AccountSlotComparisonViewRow[];
};

export type AccountActivitySectionView = {
  summary: ActivityHistorySummary | null;
  message: string;
  error: string;
};

export type AccountConfigurationSectionView = {
  primaryItems: AccountReadonlyItemView[];
  extraItems: AccountReadonlyItemView[];
};

/** 二级待办导航的五个入口。前四个按「多急」切时限，提光按奖励口径切。 */
export type AccountTodoPanelKey = "all" | "daily" | "weekly" | "timeless" | "power";

export type AccountTodoPanelView = {
  key: AccountTodoPanelKey;
  /** 这个面板里的可见行数。二级按钮上的计数直接用它，不另外手写。 */
  count: number;
  /**
   * 按可执行性把这一档的行分成四类，和行内排序第一维用的是同一个键。
   * 四类相加等于 `count`，是分区不是标签，渲染侧不再按状态文案重判一次。
   */
  actionableCount: number;
  pendingActionCount: number;
  closedCount: number;
  unknownCount: number;
  groups: AccountReadonlyGroupView[];
};

export type AccountTodoSectionView = {
  dataState: "confirmed" | "partial";
  isSyncing: boolean;
  statusLabel: string;
  errorMessage?: string;
  observedAt?: string;
  /** 「全部」「提光」和三个时限面板共用同一批段，只是各自过滤出自己要显示的行。 */
  panels: AccountTodoPanelView[];
  /**
   * 「全部」末尾的账号级事实：光等、邮政官、容量三行。常驻、只读，不参与分段、过滤和排序——
   * 它们回答的是「账号现在是什么样」，不是「还有什么没做完」（T91 第 7 节）。
   */
  accountFacts: AccountTodoFactsView;
};

export type AccountTodoFactView = {
  key: string;
  label: string;
  detail: string;
  /** 行正面主事实的字段名与值，两栏要么都有，要么都没有。 */
  factLabel: string;
  factValue: string;
  statusLabel: string;
  statusTone: "neutral" | "pending" | "warning" | "success";
};

export type AccountTodoFactsView = {
  label: string;
  description: string;
  /** 这三行读的是账号快照，时间戳跟着快照走，不跟待办那次任务读取走。 */
  observedAt?: string;
  items: AccountTodoFactView[];
};

export type AccountItemsSectionView = {
  itemCount: number;
  carriedCount: number;
  materialCount: number;
  collectionCount: number;
  unknownCount: number;
  groups: AccountReadonlyGroupView[];
};

export type AccountMaterialsSectionView = {
  rows: AccountMaterialRow[];
};

export type AccountPostmasterSectionView = {
  items: AccountItemView[];
  totalCount: number;
};

export type AccountCapacityRiskLevel = "safe" | "warning" | "danger" | "unknown";

export type AccountCapacityMetricView = {
  key: string;
  label: string;
  itemCount: number;
  capacity?: number;
  remaining?: number;
  usagePercent?: number;
  risk: AccountCapacityRiskLevel;
  statusLabel: string;
};

export type AccountCharacterCapacityView = {
  characterId: string;
  className: string;
  overallRisk: AccountCapacityRiskLevel;
  inventoryRisk: AccountCapacityRiskLevel;
  summaryLabel: string;
  postmaster: AccountCapacityMetricView;
  inventoryBuckets: AccountCapacityMetricView[];
  fullBucketCount: number;
  warningBucketCount: number;
};

export type AccountCapacitySectionView = {
  vault: AccountCapacityMetricView;
  selectedCharacter: AccountCharacterCapacityView | null;
  characters: AccountCharacterCapacityView[];
  overallRisk: AccountCapacityRiskLevel;
};

export type AccountPageViewModel = {
  connection: AccountConnectionView;
  feedback: AccountFeedbackView;
  profile: AccountProfileView | null;
  characterTabs: AccountCharacterTabView[];
  selectedCharacter: AccountCharacterDetailView | null;
  loadout: AccountLoadoutSectionView;
  configuration: AccountConfigurationSectionView;
  todo: AccountTodoSectionView;
  items: AccountItemsSectionView;
  activity: AccountActivitySectionView;
  materials: AccountMaterialsSectionView;
  postmaster: AccountPostmasterSectionView;
  capacity: AccountCapacitySectionView;
};

export type SharedDomainCache = {
  accountSummary: AccountSummary | null;
  activitySummary: ActivityHistorySummary | null;
  pursuitSummary?: AccountPursuitSummary | null;
  weeklySummary?: WeeklySummary | null;
};

export type AccountPageState = {
  selectedCharacterId: string;
  lastAccountLoadedAt?: string | number | Date | null;
  openingItemKey?: string;
  isLoadoutMatch?: (item: AccountItemSummary) => boolean;
  isBungieConfigured: boolean;
  isAccountLoggedIn: boolean;
  isLoadingAccount: boolean;
  pursuitStatus?: "unavailable" | "cached" | "stale" | "loading" | "refreshing" | "ready" | "error";
  pursuitError?: string;
  weeklySummaryStatus?: "unavailable" | "loading" | "refreshing" | "ready" | "stale" | "error";
  weeklySummaryError?: string;
  isShowingCachedAccount?: boolean;
  accountStatusLabel?: string;
  accountError: string;
  accountWarning?: string;
  itemDetailError: string;
  activityMessage: string;
  activityError: string;
  loadoutMessage: string;
  itemActionMessage: string;
  operationFeedback?: AccountOperationFeedbackView;
  isRunningItemAction: boolean;
  activeLoadoutTemplateName?: string;
};

export type AccountPageModelInput = {
  cache: SharedDomainCache;
  pageState: AccountPageState;
};

export type AccountPageWorkspace = {
  accountProfileLine: string;
  accountInventoryLine: string;
  characterTabs: AccountCharacterTab[];
  materialRows: AccountMaterialRow[];
  loadoutSlotRows: AccountLoadoutSlotRow[];
  selectedCharacter: AccountSummary["characters"][number] | null;
  selectedCharacterItems: AccountItemSummary[];
  equippedSlotCategories: AccountSlotCategory[];
  inventorySlotCategories: AccountSlotCategory[];
  slotComparisonRows: AccountSlotComparisonRow[];
  selectedCharacterLoadoutMatchCount: number;
  postmasterPreviewItems: AccountPostmasterPreviewItem[];
  selectedCharacterSummary: string;
};

export type AccountMaterialRow = {
  key: string;
  material: AccountMaterialSummary;
  meta: string;
};

export type AccountPostmasterPreviewItem = {
  key: string;
  item: AccountItemSummary;
  meta: string;
  isPending: boolean;
  isLoadoutMatch: boolean;
};

export type AccountLoadoutSlotRow = {
  key: string;
  slot: AccountSummary["characters"][number]["loadout_slots"][number];
  title: string;
  subtitle: string;
  preview: string;
};

export type AccountSlotCategoryKey = "weapons" | "armor" | "equipment" | "other";

export type AccountSlotGroup = {
  key: string;
  label: string;
  category: AccountSlotCategoryKey;
  items: AccountItemSummary[];
};

export type AccountSlotCategory = {
  key: AccountSlotCategoryKey;
  label: string;
  groups: AccountSlotGroup[];
  count: number;
};

export type AccountSlotComparisonRow = {
  key: string;
  label: string;
  category: AccountSlotCategoryKey;
  equippedItems: AccountItemSummary[];
  inventoryItems: AccountItemSummary[];
};

const categoryLabels: Record<AccountSlotCategoryKey, string> = {
  weapons: "武器",
  armor: "护甲",
  equipment: "装备",
  other: "其他"
};

const categoryOrder: AccountSlotCategoryKey[] = ["weapons", "armor", "equipment", "other"];

const configurationBuckets = new Set([
  "职业分支",
  "机灵",
  "飞船",
  "载具",
  "徽标",
  "公会战旗",
  "终结技",
  "动作"
]);

const primaryConfigurationBuckets = new Set(["职业分支", "机灵", "飞船", "载具", "徽标"]);

const bucketOrder = [
  "动能武器",
  "能量武器",
  "威能武器",
  "头盔",
  "臂铠",
  "胸甲",
  "腿甲",
  "职业物品",
  "职业分支",
  "机灵",
  "飞船",
  "载具",
  "徽标",
  "公会战旗",
  "终结技",
  "动作"
];

const otherGroupOrder = [
  "记忆水晶",
  "任务与追踪",
  "材料与货币",
  "消耗品",
  "模组与外观",
  "收藏与纪念",
  "未识别物品"
];

export function createAccountPageWorkspace(input: {
  account: AccountSummary | null;
  selectedCharacterId: string;
  openingItemKey?: string;
  isLoadoutMatch?: (item: AccountItemSummary) => boolean;
}): AccountPageWorkspace {
  const account = input.account;
  const selectedCharacter = account?.characters.find((character) => character.character_id === input.selectedCharacterId)
    ?? account?.characters[0]
    ?? null;
  const selectedCharacterItems = selectedCharacter ? getCharacterCombinedItems(selectedCharacter) : [];
  const combatEquippedItems = selectedCharacter?.equipped_items.filter(isCombatItem) ?? [];
  const combatInventoryItems = selectedCharacter?.inventory_items.filter(isCombatItem) ?? [];

  return {
    accountProfileLine: account ? `Membership ${account.membership_type} / ${account.destiny_membership_id}` : "",
    accountInventoryLine: account
      ? account.vault.capacity
        ? `仓库 ${account.vault.item_count}/${account.vault.capacity}`
        : `仓库 ${account.vault.item_count} 件`
      : "",
    characterTabs: account ? buildAccountCharacterTabs(account, selectedCharacter?.character_id ?? "") : [],
    materialRows: account ? buildAccountMaterialRows(account.materials.items) : [],
    loadoutSlotRows: selectedCharacter ? buildAccountLoadoutSlotRows(selectedCharacter) : [],
    selectedCharacter,
    selectedCharacterItems,
    equippedSlotCategories: selectedCharacter ? groupAccountItemsBySlot(selectedCharacter.equipped_items) : [],
    inventorySlotCategories: selectedCharacter ? groupAccountItemsBySlot(selectedCharacter.inventory_items) : [],
    slotComparisonRows: selectedCharacter
      ? buildAccountSlotComparisonRows(combatEquippedItems, combatInventoryItems)
      : [],
    selectedCharacterLoadoutMatchCount: input.isLoadoutMatch
      ? selectedCharacterItems.filter(input.isLoadoutMatch).length
      : 0,
    postmasterPreviewItems: selectedCharacter
      ? buildPostmasterPreviewItems({
        items: selectedCharacter.postmaster_items,
        openingItemKey: input.openingItemKey ?? "",
        isLoadoutMatch: input.isLoadoutMatch
      })
      : [],
    selectedCharacterSummary: selectedCharacter
      ? `光等 ${selectedCharacter.light ?? "-"} / 已装备 ${selectedCharacter.equipped_items.length} 件 / 背包 ${selectedCharacter.inventory_items.length} 件`
      : ""
  };
}

export function selectAccountPageModel(input: AccountPageModelInput): AccountPageViewModel {
  const { cache, pageState } = input;
  const workspace = createAccountPageWorkspace({
    account: cache.accountSummary,
    selectedCharacterId: pageState.selectedCharacterId,
    openingItemKey: pageState.openingItemKey,
    isLoadoutMatch: pageState.isLoadoutMatch
  });
  const selectedCharacter = workspace.selectedCharacter;
  const selectedCharacterId = selectedCharacter?.character_id ?? "";
  const selectedCharacterPower = workspace.characterTabs.find((tab) => tab.key === selectedCharacterId)?.power;
  const openingItemKey = pageState.openingItemKey ?? "";
  const isLoadoutMatch = pageState.isLoadoutMatch ?? (() => false);
  const syncingItemIds = new Set(
    pageState.operationFeedback
    && ["syncing", "delayed", "partial"].includes(pageState.operationFeedback.phase ?? "")
      ? pageState.operationFeedback.itemInstanceIds ?? []
      : []
  );
  const configuration = buildAccountConfigurationSection(selectedCharacter);
  const todo = buildAccountTodoSection({
    account: cache.accountSummary,
    pursuitSummary: cache.pursuitSummary ?? buildAccountPursuitSummary(cache.accountSummary),
    weeklySummary: cache.weeklySummary ?? null,
    characterId: selectedCharacterId,
    characterIndex: cache.accountSummary?.characters.findIndex((entry) => (
      entry.character_id === selectedCharacterId
    )) ?? -1,
    status: pageState.pursuitStatus ?? (pageState.isLoadingAccount ? "refreshing" : "ready"),
    errorMessage: pageState.pursuitError,
    weeklyStatus: pageState.weeklySummaryStatus,
    weeklyErrorMessage: pageState.weeklySummaryError
  });
  const items = buildAccountItemsSection(selectedCharacter, workspace.materialRows.length);
  const capacity = buildAccountCapacitySection(cache.accountSummary, selectedCharacterId);

  return {
    connection: {
      hasAccount: Boolean(cache.accountSummary),
      isBungieConfigured: pageState.isBungieConfigured,
      isAccountLoggedIn: pageState.isAccountLoggedIn,
      canLoadAccount: pageState.isBungieConfigured && pageState.isAccountLoggedIn,
      isLoadingAccount: pageState.isLoadingAccount,
      dataState: pageState.isLoadingAccount
        ? "refreshing"
        : pageState.isShowingCachedAccount
          ? "cached"
          : "synced",
      accountStatusLabel: pageState.accountStatusLabel
    },
    feedback: {
      accountError: pageState.accountError,
      accountWarning: pageState.accountWarning ?? "",
      itemDetailError: pageState.itemDetailError,
      loadoutMessage: pageState.loadoutMessage,
      itemActionMessage: pageState.itemActionMessage,
      activityMessage: pageState.activityMessage,
      activityError: pageState.activityError,
      operation: pageState.operationFeedback
    },
    profile: cache.accountSummary
      ? {
        accountName: cache.accountSummary.account_name,
        profileLine: workspace.accountProfileLine,
        inventoryLine: workspace.accountInventoryLine,
        snapshotAt: pageState.lastAccountLoadedAt
      }
      : null,
    characterTabs: workspace.characterTabs,
    selectedCharacter: selectedCharacter
      ? {
        characterId: selectedCharacter.character_id,
        className: selectedCharacter.class_name,
        lightLabel: `光等 ${selectedCharacter.light ?? "-"}`,
        power: selectedCharacterPower ?? buildCharacterPowerView(cache.accountSummary!, selectedCharacter),
        emblemUrl: selectedCharacter.emblem_url,
        summary: workspace.selectedCharacterSummary
      }
      : null,
    loadout: {
      equippedCount: workspace.slotComparisonRows.reduce((count, row) => count + row.equippedItems.length, 0),
      inventoryCount: workspace.slotComparisonRows.reduce((count, row) => count + row.inventoryItems.length, 0),
      activeTemplateName: pageState.activeLoadoutTemplateName,
      selectedCharacterLoadoutMatchCount: workspace.selectedCharacterLoadoutMatchCount,
      isRunningItemAction: pageState.isRunningItemAction,
      slotComparisonRows: workspace.slotComparisonRows.map((row) => ({
        key: row.key,
        label: row.label,
        category: row.category,
        equippedItems: row.equippedItems.map((item) => toAccountItemView({
          item,
          sourceCharacterId: selectedCharacterId,
          sourceKind: "equipped",
          openingItemKey,
          isLoadoutMatch,
          syncingItemIds
        })),
        inventoryItems: row.inventoryItems.map((item) => toAccountItemView({
          item,
          sourceCharacterId: selectedCharacterId,
          sourceKind: "inventory",
          openingItemKey,
          isLoadoutMatch,
          syncingItemIds
        }))
      }))
    },
    configuration,
    todo,
    items,
    activity: {
      summary: cache.activitySummary,
      message: pageState.activityMessage,
      error: pageState.activityError
    },
    materials: {
      rows: workspace.materialRows
    },
    postmaster: {
      items: selectedCharacter
        ? selectedCharacter.postmaster_items.map((item) => toAccountItemView({
          item,
          sourceCharacterId: selectedCharacter.character_id,
          sourceKind: "postmaster",
          openingItemKey,
          isLoadoutMatch,
          syncingItemIds,
          isPostmasterItem: true
        }))
        : [],
      totalCount: selectedCharacter?.postmaster_items.length ?? 0
    },
    capacity
  };
}

function buildAccountCapacitySection(
  account: AccountSummary | null,
  selectedCharacterId: string
): AccountCapacitySectionView {
  const vault = buildCapacityMetric({
    key: "vault",
    label: "仓库",
    itemCount: account?.vault.items.length ?? 0,
    capacity: account?.vault.capacity,
    kind: "vault"
  });
  const characters = account?.characters.map(buildCharacterCapacityView) ?? [];

  return {
    vault,
    selectedCharacter: characters.find((character) => character.characterId === selectedCharacterId) ?? characters[0] ?? null,
    characters,
    overallRisk: highestCapacityRisk([vault.risk, ...characters.map((character) => character.overallRisk)])
  };
}

function buildCharacterCapacityView(
  character: AccountSummary["characters"][number]
): AccountCharacterCapacityView {
  const limitsByBucket = new Map(
    character.capacity_limits?.inventory_buckets.map((bucket) => [bucket.bucket_hash, bucket]) ?? []
  );
  const carriedItems = [...character.equipped_items, ...character.inventory_items];
  const inventoryBuckets = accountEquipmentBucketHashes.map((bucketHash) => {
    const limit = limitsByBucket.get(bucketHash);
    return buildCapacityMetric({
      key: `inventory-${bucketHash}`,
      label: limit?.bucket_name || bucketLabels[bucketHash]?.name || `位置 ${bucketHash}`,
      itemCount: carriedItems.filter((item) => item.equipment_bucket_hash === bucketHash).length,
      capacity: limit?.capacity,
      kind: "inventory"
    });
  });
  const postmaster = buildCapacityMetric({
    key: `postmaster-${character.character_id}`,
    label: "邮政官",
    itemCount: character.postmaster_items.length,
    capacity: character.capacity_limits?.postmaster_capacity,
    kind: "postmaster"
  });
  const fullBucketCount = inventoryBuckets.filter((bucket) => bucket.risk === "danger").length;
  const warningBucketCount = inventoryBuckets.filter((bucket) => bucket.risk === "warning").length;
  const inventoryRisk = highestCapacityRisk(inventoryBuckets.map((bucket) => bucket.risk));
  const overallRisk = highestCapacityRisk([postmaster.risk, inventoryRisk]);

  return {
    characterId: character.character_id,
    className: character.class_name,
    overallRisk,
    inventoryRisk,
    summaryLabel: characterCapacitySummary({ postmaster, fullBucketCount, warningBucketCount, overallRisk }),
    postmaster,
    inventoryBuckets,
    fullBucketCount,
    warningBucketCount
  };
}

function buildCapacityMetric(input: {
  key: string;
  label: string;
  itemCount: number;
  capacity?: number;
  kind: "inventory" | "postmaster" | "vault";
}): AccountCapacityMetricView {
  const capacity = typeof input.capacity === "number" && input.capacity > 0 ? input.capacity : undefined;
  if (!capacity) {
    return {
      key: input.key,
      label: input.label,
      itemCount: input.itemCount,
      risk: "unknown",
      statusLabel: "容量上限待确认"
    };
  }

  const remaining = Math.max(0, capacity - input.itemCount);
  const warningThreshold = input.kind === "postmaster"
    ? 5
    : input.kind === "vault"
      ? Math.max(10, Math.ceil(capacity * 0.02))
      : 1;
  const risk: AccountCapacityRiskLevel = remaining === 0
    ? "danger"
    : remaining <= warningThreshold
      ? "warning"
      : "safe";
  const statusLabel = risk === "danger"
    ? input.kind === "postmaster" ? "已满，掉落存在覆盖风险" : "已满"
    : risk === "warning"
      ? `接近上限，剩余 ${remaining} 格`
      : `剩余 ${remaining} 格`;

  return {
    key: input.key,
    label: input.label,
    itemCount: input.itemCount,
    capacity,
    remaining,
    usagePercent: Math.min(100, Math.round((input.itemCount / capacity) * 100)),
    risk,
    statusLabel
  };
}

function characterCapacitySummary(input: {
  postmaster: AccountCapacityMetricView;
  fullBucketCount: number;
  warningBucketCount: number;
  overallRisk: AccountCapacityRiskLevel;
}): string {
  if (input.postmaster.risk === "danger") return "邮政官已满，有覆盖风险";
  if (input.fullBucketCount > 0) return `${input.fullBucketCount} 个携带槽位已满`;
  if (input.postmaster.risk === "warning") return input.postmaster.statusLabel;
  if (input.warningBucketCount > 0) return `${input.warningBucketCount} 个携带槽位接近上限`;
  if (input.overallRisk === "unknown") return "部分容量上限待确认";
  return "容量正常";
}

function highestCapacityRisk(risks: AccountCapacityRiskLevel[]): AccountCapacityRiskLevel {
  if (risks.includes("danger")) return "danger";
  if (risks.includes("warning")) return "warning";
  if (risks.includes("unknown")) return "unknown";
  return "safe";
}

function buildAccountConfigurationSection(
  character: AccountSummary["characters"][number] | null
): AccountConfigurationSectionView {
  const items = character?.equipped_items.filter((item) => configurationBuckets.has(item.bucket_name?.trim() ?? "")) ?? [];
  return {
    primaryItems: toReadonlyItems(
      items.filter((item) => primaryConfigurationBuckets.has(item.bucket_name?.trim() ?? "")),
      "当前配置"
    ),
    extraItems: toReadonlyItems(
      items.filter((item) => !primaryConfigurationBuckets.has(item.bucket_name?.trim() ?? "")),
      "当前配置"
    )
  };
}

type TodoBucketKey = "daily" | "weekly" | "timeless";

const todoBucketOrder: TodoBucketKey[] = ["daily", "weekly", "timeless"];

const todoBucketLabels: Record<TodoBucketKey, string> = {
  daily: "日常",
  weekly: "周常",
  timeless: "不限时"
};

/**
 * 清单条目。四个排序键先摊平出来再排，任务和挑战共用同一个比较器——
 * 时限决定它落在哪一段，段内顺序由这四个键决定。
 */
type TodoEntry = {
  id: string;
  bucket: TodoBucketKey;
  actionability: number;
  /** 服务器到期时间；没有到期时间记 Infinity，排在有限时间的后面。 */
  expiresAt: number;
  /** 稳定身份：活动 Hash 或任务 Hash；两者都没有记 Infinity，退到 id 比较。 */
  stableHash: number;
  characterIndex: number;
  isPower: boolean;
  view: AccountReadonlyItemView;
};

function buildAccountTodoSection(input: {
  account: AccountSummary | null;
  pursuitSummary: AccountPursuitSummary;
  weeklySummary: WeeklySummary | null;
  characterId: string;
  characterIndex: number;
  status: NonNullable<AccountPageState["pursuitStatus"]>;
  errorMessage?: string;
  weeklyStatus?: AccountPageState["weeklySummaryStatus"];
  weeklyErrorMessage?: string;
}): AccountTodoSectionView {
  const summary = input.pursuitSummary;
  const now = snapshotNow(summary);
  const weeklyReset = input.weeklySummary?.weekly_reset.next_reset_iso;
  const entries = [
    ...summary.items.map((pursuit) => toTodoEntryFromPursuit(pursuit, now)),
    ...buildAccountTodoChallenges({
      characterId: input.characterId,
      weeklySummary: input.weeklySummary
    }).map((challenge) => toTodoEntryFromChallenge({
      challenge,
      characterIndex: input.characterIndex,
      weeklyResetIso: weeklyReset
    }))
  ].sort(compareTodoEntries);

  const description = (bucket: TodoBucketKey) => todoBucketDescription({
    bucket,
    dailyResetIso: summary.daily_reset_iso,
    weeklyResetIso: weeklyReset ?? summary.weekly_reset_iso
  });
  const powerEntries = entries.filter((entry) => entry.isPower);

  return {
    dataState: summary.data_state === "partial"
      || input.status === "error"
      || input.status === "stale"
      || Boolean(input.weeklyErrorMessage)
      ? "partial"
      : "confirmed",
    isSyncing: input.status === "loading"
      || input.status === "refreshing"
      || input.weeklyStatus === "loading"
      || input.weeklyStatus === "refreshing",
    statusLabel: todoStatusLabel(input.status, input.weeklyStatus),
    ...(input.errorMessage ? { errorMessage: input.errorMessage } : {}),
    ...(summary.observed_at ? { observedAt: summary.observed_at } : {}),
    panels: [
      buildTodoPanel({ key: "all", entries, description }),
      buildTodoPanel({ key: "daily", entries: inBucket(entries, "daily"), description }),
      buildTodoPanel({ key: "weekly", entries: inBucket(entries, "weekly"), description }),
      buildTodoPanel({ key: "timeless", entries: inBucket(entries, "timeless"), description }),
      buildTodoPanel({ key: "power", entries: powerEntries, description })
    ],
    accountFacts: buildAccountTodoFacts({
      account: input.account,
      characterId: input.characterId
    })
  };
}

/**
 * 账号级事实三行。每行只在真有事实可报时出现：光等读不到就不报光等，容量上限没返回就只报
 * 数得到的一半，两半都没有就整行不出现。行不参与第 5 节的排序，也不进任何二级入口。
 */
function buildAccountTodoFacts(input: {
  account: AccountSummary | null;
  characterId: string;
}): AccountTodoFactsView {
  const account = input.account;
  const character = account?.characters.find((entry) => entry.character_id === input.characterId)
    ?? account?.characters[0];
  const items: AccountTodoFactView[] = [];

  const lights = (account?.characters ?? []).flatMap((entry) => (
    typeof entry.light === "number" ? [`${entry.class_name} ${entry.light}`] : []
  ));
  if (lights.length) {
    items.push({
      key: "light",
      label: "光等",
      detail: "按角色分别列出，不取平均也不取最高",
      factLabel: `${lights.length} 个角色`,
      factValue: lights.join(" / "),
      statusLabel: "只读",
      statusTone: "neutral"
    });
  }

  if (character) {
    const postmasterCount = character.postmaster_items.length;
    const postmasterCapacity = character.capacity_limits?.postmaster_capacity;
    items.push({
      key: "postmaster",
      label: "邮政官",
      detail: "待领取物品，不阻塞其他资源加载",
      factLabel: "待领取",
      factValue: `${postmasterCount}${postmasterCapacity ? ` / ${postmasterCapacity}` : ""} 件`,
      statusLabel: postmasterCount > 0 ? "可领取" : "没有待领取",
      statusTone: postmasterCount > 0 ? "pending" : "neutral"
    });
  }

  const pursuitUsed = character
    ? character.inventory_items.filter((item) => item.equipment_bucket_hash === pursuitBucketHash).length
    : undefined;
  const pursuitCapacity = character?.capacity_limits?.pursuit_capacity;
  const slots: string[] = [];
  if (pursuitUsed !== undefined && pursuitCapacity) slots.push(`任务 ${pursuitUsed} / ${pursuitCapacity}`);
  if (account && account.vault.capacity) slots.push(`仓库 ${account.vault.item_count} / ${account.vault.capacity}`);
  if (slots.length) {
    items.push({
      key: "capacity",
      label: "容量",
      detail: "任务槽位按当前角色计，仓库为账号级",
      factLabel: "占用",
      factValue: slots.join(" · "),
      statusLabel: "只读",
      statusTone: "neutral"
    });
  }

  return {
    label: "账号级事实",
    description: "常驻显示，不参与「多急」的分段",
    ...(account?.profile_minted_at ? { observedAt: account.profile_minted_at } : {}),
    items
  };
}

function buildTodoPanel(input: {
  key: AccountTodoPanelKey;
  entries: TodoEntry[];
  description: (bucket: TodoBucketKey) => string;
}): AccountTodoPanelView {
  const present = todoBucketOrder.filter((bucket) => (
    input.entries.some((entry) => entry.bucket === bucket)
  ));
  return {
    key: input.key,
    count: input.entries.length,
    actionableCount: countByActionability(input.entries, 0),
    pendingActionCount: countByActionability(input.entries, 1),
    closedCount: countByActionability(input.entries, 2),
    unknownCount: countByActionability(input.entries, 3),
    groups: present.map((bucket) => ({
      key: bucket,
      label: todoBucketLabels[bucket],
      description: input.description(bucket),
      items: input.entries.filter((entry) => entry.bucket === bucket).map((entry) => entry.view),
      status: "neutral" as const,
      // 段默认展开：清单的全部意义是看得到行，折叠起来等于多一次点击；
      // 首页深链接也要靠行已经在 DOM 里显示出来才滚得到。
      defaultOpen: true
    }))
  };
}

function inBucket(entries: TodoEntry[], bucket: TodoBucketKey): TodoEntry[] {
  return entries.filter((entry) => entry.bucket === bucket);
}

/**
 * T91 第 5 节的清单排序，全清单只有这一套：可执行性 → 时间 → 稳定身份 → 角色顺序。
 * 四个维度都不读本地化名称，同一份 Profile 在两台设备上顺序一致。
 */
function compareTodoEntries(left: TodoEntry, right: TodoEntry): number {
  return compareNumbers(left.actionability, right.actionability)
    || compareNumbers(left.expiresAt, right.expiresAt)
    || compareNumbers(left.stableHash, right.stableHash)
    || compareStableString(left.id, right.id)
    || compareNumbers(left.characterIndex, right.characterIndex);
}

/** 不写成相减：Infinity - Infinity 是 NaN，NaN 会一路穿过 `||` 链，结果不可控。 */
function compareNumbers(left: number, right: number): number {
  if (left === right) return 0;
  return left < right ? -1 : 1;
}

/**
 * 可选性四档在任务和挑战上是同一套编号：0 可执行、1 已完成待处理、2 已结束、3 状态待确认。
 * 挑战没有「待处理」这一档，所以那一格在挑战多的档里自然是 0，不是漏算。
 */
function countByActionability(entries: TodoEntry[], rank: number): number {
  return entries.filter((entry) => entry.actionability === rank).length;
}

function toTodoEntryFromPursuit(pursuit: AccountPursuit, now: number): TodoEntry {
  return {
    id: `pursuit:${pursuit.id}`,
    bucket: todoBucketForTimeFrame(pursuit.time_frame),
    actionability: pursuitActionabilityRank(pursuit),
    expiresAt: parseOrInfinity(pursuit.expiration_date),
    stableHash: pursuit.source_hash ?? pursuit.item_hash ?? Number.POSITIVE_INFINITY,
    characterIndex: pursuit.character_index,
    isPower: false,
    view: toReadonlyPursuit(pursuit, now)
  };
}

function toTodoEntryFromChallenge(input: {
  challenge: AccountTodoChallenge;
  characterIndex: number;
  weeklyResetIso?: string;
}): TodoEntry {
  return {
    id: `challenge:${input.challenge.key}`,
    // 活动挑战的时限由活动身份决定，一律进「周常」段（T91 第 4.4 节）。
    bucket: "weekly",
    actionability: challengeActionabilityRank(input.challenge),
    expiresAt: parseOrInfinity(input.weeklyResetIso),
    stableHash: input.challenge.activityHash ?? Number.POSITIVE_INFINITY,
    characterIndex: input.characterIndex < 0 ? Number.MAX_SAFE_INTEGER : input.characterIndex,
    isPower: input.challenge.isPower,
    view: toReadonlyChallenge(input.challenge)
  };
}

/**
 * 挑战只有「做 / 没做」两种确定状态，没有任务那种「已完成待领取」的信号，
 * 所以完成和本周领不到都排在同一档。
 */
function challengeActionabilityRank(challenge: AccountTodoChallenge): number {
  if (challenge.status === "available") return 0;
  if (challenge.status === "completed" || challenge.status === "unavailable") return 2;
  return 3;
}

/** `long` 是「过了下一个每周重置，但仍在限时」——赛季挑战这类，和 `weekly` 同段。 */
function todoBucketForTimeFrame(timeFrame: AccountPursuitTimeFrame): TodoBucketKey {
  if (timeFrame === "daily") return "daily";
  if (timeFrame === "timeless") return "timeless";
  return "weekly";
}

function parseOrInfinity(value: string | undefined): number {
  if (!value) return Number.POSITIVE_INFINITY;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : Number.POSITIVE_INFINITY;
}

/**
 * 时间基准只认这次快照。以前分桶、计数和行上的「还有多久」各用各的 now：
 * 计数固化在抓取时刻（`packages/core/src/account/pursuits.ts`），分组却在渲染时重算，
 * 同一个快照放一会儿就会出现「计数说 0 项、列表里有 3 行」。这里统一读快照的观测时刻。
 */
function snapshotNow(summary: AccountPursuitSummary): number {
  const observed = summary.observed_at ? Date.parse(summary.observed_at) : Number.NaN;
  return Number.isFinite(observed) ? observed : Date.now();
}

function todoBucketDescription(input: {
  bucket: TodoBucketKey;
  dailyResetIso?: string;
  weeklyResetIso?: string;
}): string {
  if (input.bucket === "daily") {
    const reset = formatResetMoment(input.dailyResetIso);
    return reset ? `${reset} 重置，不做就没了` : "每日重置后换新，不做就没了";
  }
  if (input.bucket === "weekly") {
    const reset = formatResetMoment(input.weeklyResetIso);
    return reset
      ? `${reset} 重置 · 周赏金、周挑战、轮换活动、限时活动`
      : "每周重置后换新 · 周赏金、周挑战、轮换活动、限时活动";
  }
  return "没有到期时间，不随重置消失";
}

function formatResetMoment(value: string | undefined): string {
  if (!value) return "";
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return "";
  const at = new Date(timestamp);
  return `${pad2(at.getMonth() + 1)}-${pad2(at.getDate())} ${pad2(at.getHours())}:${pad2(at.getMinutes())}`;
}

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function todoStatusLabel(
  status: NonNullable<AccountPageState["pursuitStatus"]>,
  weeklyStatus: AccountPageState["weeklySummaryStatus"]
): string {
  if (status === "loading") return "首次读取中";
  if (status === "refreshing") return "同步中";
  if (status === "cached") return "本地缓存";
  if (status === "stale") return "等待重新同步";
  if (status === "error") return "读取失败";
  if (status === "ready") {
    return weeklyStatus === "loading" || weeklyStatus === "refreshing" ? "轮换同步中" : "已确认";
  }
  return "尚未读取";
}

function buildAccountItemsSection(
  character: AccountSummary["characters"][number] | null,
  materialCount: number
): AccountItemsSectionView {
  const inventoryItems = character?.inventory_items ?? [];
  const carried = inventoryItems.filter((item) => Boolean(getAccountCarryKind(item)));
  const collection = inventoryItems.filter((item) => (
    !item.pursuit
    && !getAccountCarryKind(item)
    && isAccountCollectionItem(item)
  ));
  const unknown = inventoryItems.filter((item) => (
    !isCombatItem(item)
    && !item.pursuit
    && !getAccountCarryKind(item)
    && !isAccountCollectionItem(item)
  ));

  return {
    itemCount: carried.length + materialCount,
    carriedCount: carried.length,
    materialCount,
    collectionCount: collection.length,
    unknownCount: unknown.length,
    groups: [
      toReadonlyGroup("carried", "角色携带物品", "记忆水晶、消耗品和钥匙等角色物品", carried, "当前角色背包"),
      toReadonlyGroup("collection", "外观与可选配置", "未装备的职业分支、飞船、载具、徽标和外观", collection, "当前角色背包"),
      toReadonlyGroup(
        "unknown",
        "未分类数据",
        "暂未识别的角色物品，保留原始数据供查看",
        unknown,
        "当前角色背包",
        unknown.length ? "warning" : "neutral"
      )
    ]
  };
}

function getAccountCarryKind(item: AccountItemSummary): "engrams" | "consumables" | "" {
  const text = accountItemSearchText(item);
  if (includesAny(text, ["记忆水晶", "engram"])) return "engrams";
  if (includesAny(text, ["消耗品", "钥匙", "礼物", "加成", "consumable", "boost", "gift", "key"])) return "consumables";
  return "";
}

function isAccountCollectionItem(item: AccountItemSummary): boolean {
  const bucketName = item.bucket_name?.trim() ?? "";
  const text = `${bucketName} ${item.item_type ?? ""}`.toLowerCase();
  return configurationBuckets.has(bucketName)
    || includesAny(text, ["着色器", "配件", "外观", "投影", "shader", "ornament", "projection"]);
}

function isCombatItem(item: AccountItemSummary): boolean {
  return item.group_key === "weapons" || item.group_key === "armor";
}

function accountItemSearchText(item: AccountItemSummary): string {
  return `${item.bucket_name ?? ""} ${item.item_type ?? ""} ${item.name}`.toLowerCase();
}

function toReadonlyGroup(
  key: string,
  label: string,
  description: string,
  items: AccountItemSummary[],
  sourceLabel: string,
  status: AccountReadonlyGroupView["status"] = "neutral"
): AccountReadonlyGroupView {
  return {
    key,
    label,
    description,
    items: toReadonlyItems(items, sourceLabel),
    status
  };
}

function toReadonlyItems(items: AccountItemSummary[], sourceLabel: string): AccountReadonlyItemView[] {
  return items.map((item, index) => {
    const progress = buildReadonlyItemProgress(item);
    return {
      key: `${sourceLabel}:${getAccountPageItemKey(item)}:${index}`,
      name: item.name,
      icon: item.icon,
      typeLabel: item.item_type?.trim() || item.bucket_name?.trim() || "类型未识别",
      sourceLabel,
      ...progress
    };
  });
}

function toReadonlyPursuit(pursuit: AccountPursuit, now: number): AccountReadonlyItemView {
  const status = pursuit.completion_state === "completed_pending_action"
    ? { statusLabel: "已完成待处理", statusTone: "success" as const }
    : pursuit.completion_state === "completed_confirmed"
      ? { statusLabel: "已处理", statusTone: "neutral" as const }
      : pursuit.completion_state === "expired"
        ? { statusLabel: "已过期", statusTone: "warning" as const }
        : pursuit.tracked
          ? { statusLabel: "正在追踪", statusTone: "pending" as const }
          : pursuit.completion_state === "in_progress"
            ? { statusLabel: "进行中", statusTone: "neutral" as const }
            : { statusLabel: "状态待确认", statusTone: "warning" as const };
  const sourceKind = pursuit.source === "character_milestone"
    ? "角色目标"
    : pursuit.source === "record"
      ? "赛季挑战"
      : "任务";
  const bucket = todoBucketForTimeFrame(pursuit.time_frame);
  const expirationFact = pursuit.expiration_date
    ? `${formatResetMoment(pursuit.expiration_date)} · 游戏返回的到期字段`
    : "游戏没有返回到期字段，按不限时处理";
  return {
    key: `pursuit:${pursuit.id}`,
    name: pursuit.name,
    icon: pursuit.icon,
    typeLabel: `${pursuit.type_label} · ${pursuit.class_name}`,
    sourceLabel: sourceKind,
    ...(pursuit.progress_label ? { progressLabel: pursuit.progress_label } : {}),
    ...(pursuit.progress_percent !== undefined ? { progressPercent: pursuit.progress_percent } : {}),
    isComplete: pursuit.completion_state === "completed_pending_action" || pursuit.completion_state === "completed_confirmed",
    statusLabel: status.statusLabel,
    statusTone: status.statusTone,
    ...(pursuit.progress_label ? { primaryFactLabel: "目标", primaryFactValue: pursuit.progress_label } : {}),
    ...(pursuit.expiration_date
      ? { timeLabel: formatPursuitExpiration(pursuit.expiration_date, now) }
      : {}),
    timeFrame: pursuit.time_frame,
    isPower: false,
    facts: [
      {
        label: "任务进度",
        value: pursuit.progress_label ?? "游戏没有返回可见目标进度",
        source: "游戏返回"
      },
      { label: "到期时间", value: expirationFact, source: "游戏返回" },
      { label: "时限", value: `${todoBucketLabels[bucket]} · 按到期时间落段，不按名称`, source: "本机分桶规则" }
    ]
  };
}

function toReadonlyChallenge(challenge: AccountTodoChallenge): AccountReadonlyItemView {
  const status = challenge.status === "available"
    ? { statusLabel: "可执行", statusTone: "pending" as const }
    : challenge.status === "completed"
      ? { statusLabel: "本周已完成", statusTone: "success" as const }
      : challenge.status === "unavailable"
        ? { statusLabel: "当前不可执行", statusTone: "neutral" as const }
        : { statusLabel: "状态待确认", statusTone: "warning" as const };
  const rewardFact = challenge.rewardLabel ? `「${challenge.rewardLabel}」` : "游戏没有返回奖励名";
  const challengeFact = [
    status.statusLabel,
    challenge.progressLabel ? `目标 ${challenge.progressLabel}` : ""
  ].filter(Boolean).join(" · ");
  return {
    key: `challenge:${challenge.key}`,
    name: challenge.activityName,
    typeLabel: challenge.activityTypeLabel,
    sourceLabel: challenge.sourceLabel,
    ...(challenge.progressLabel ? { progressLabel: challenge.progressLabel } : {}),
    isComplete: challenge.status === "completed",
    statusLabel: status.statusLabel,
    statusTone: status.statusTone,
    primaryFactLabel: "官方奖励名",
    primaryFactValue: rewardFact,
    timeFrame: "weekly",
    isPower: challenge.isPower,
    ...(challenge.activityKey ? { activityKey: challenge.activityKey } : {}),
    facts: [
      { label: "挑战状态", value: challengeFact, source: "游戏返回" },
      { label: "官方奖励名", value: rewardFact, source: "官方定义" },
      { label: "时限", value: "周常 · 按活动身份落段，不按名称", source: "本机分桶规则" }
    ]
  };
}

/** 行上的「还有多久」。基准是 `now`（快照观测时刻），不是渲染时刻。 */
function formatPursuitExpiration(value: string, now: number): string {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return "到期时间待确认";
  const remaining = timestamp - now;
  if (remaining <= 0) return "已过期";
  const hours = Math.floor(remaining / (60 * 60 * 1000));
  if (hours < 24) return `${Math.max(1, hours)} 小时后到期`;
  return `${Math.floor(hours / 24)} 天后到期`;
}

function buildReadonlyItemProgress(item: AccountItemSummary): Pick<AccountReadonlyItemView, "progressLabel" | "progressPercent" | "isComplete"> {
  const objectives = item.item_objectives?.filter((objective) => objective.visible) ?? [];
  if (!objectives.length) return {};

  const isComplete = objectives.every((objective) => objective.complete);
  const progressPercent = Math.round(objectives.reduce((total, objective) => {
    if (objective.completion_value <= 0) return total + Number(objective.complete);
    return total + Math.min(1, Math.max(0, (objective.progress ?? 0) / objective.completion_value));
  }, 0) / objectives.length * 100);
  const firstObjective = objectives[0];
  const progressLabel = objectives.length === 1
    ? [
        firstObjective.progress_description,
        `${firstObjective.progress ?? 0}/${firstObjective.completion_value}`
      ].filter(Boolean).join(" · ")
    : `${objectives.filter((objective) => objective.complete).length}/${objectives.length} 项目标`;

  return { progressLabel, progressPercent, isComplete };
}

function toAccountItemView(input: {
  item: AccountItemSummary;
  sourceCharacterId: string;
  sourceKind?: "equipped" | "inventory" | "postmaster";
  openingItemKey: string;
  isLoadoutMatch: (item: AccountItemSummary) => boolean;
  syncingItemIds: ReadonlySet<string>;
  isPostmasterItem?: boolean;
}): AccountItemView {
  const key = getAccountPageItemKey(input.item);
  const canOpenDetail = input.item.group_key === "weapons" || input.item.group_key === "armor";
  const facts = formatAccountItemFacts(input.item);
  return {
    key,
    name: input.item.name,
    icon: input.item.icon,
    primaryFacts: facts.primary,
    stateFacts: facts.state,
    canOpenDetail,
    isPending: canOpenDetail && key === input.openingItemKey,
    isSyncing: Boolean(input.item.instance_id && input.syncingItemIds.has(input.item.instance_id)),
    isLoadoutMatch: input.isLoadoutMatch(input.item),
    openPayload: {
      item: input.item,
      source_character_id: input.sourceCharacterId,
      source_kind: input.sourceKind,
      is_postmaster_item: input.isPostmasterItem
    }
  };
}

export function getCharacterCombinedItems(character: AccountSummary["characters"][number]): AccountItemSummary[] {
  return [
    ...character.equipped_items,
    ...character.inventory_items
  ];
}

export function getAccountPageItemKey(item: AccountItemSummary): string {
  return item.instance_id ? item.instance_id : `hash:${item.hash}`;
}

export function formatAccountItemMeta(item: AccountItemSummary): string {
  return [
    item.equipment_bucket_name ?? item.bucket_name,
    item.tier,
    item.power ? `光等 ${item.power}` : undefined,
    formatArmorStatsSummary(item),
    item.locked ? "已锁定" : undefined
  ].filter(Boolean).join(" / ");
}

export function formatAccountItemFacts(item: AccountItemSummary): {
  primary: string[];
  state: string[];
} {
  return {
    primary: [
      item.group_key === "weapons" ? item.item_type : undefined,
      item.tier,
      typeof item.power === "number" ? `光等 ${item.power}` : undefined
    ].filter((value): value is string => Boolean(value)),
    state: [
      item.group_key === "armor" && item.armor_stats ? `总值 ${item.armor_stats.total}` : undefined,
      item.locked ? "锁定" : undefined
    ].filter((value): value is string => Boolean(value))
  };
}

export function buildAccountMaterialRows(materials: AccountMaterialSummary[]): AccountMaterialRow[] {
  return materials.map((material) => ({
    key: `material:${material.hash}`,
    material,
    meta: formatAccountMaterialMeta(material)
  }));
}

export function formatAccountMaterialMeta(material: AccountMaterialSummary): string {
  return [material.tier, material.item_type].filter(Boolean).join(" / ") || "材料";
}

export function buildPostmasterPreviewItems(input: {
  items: AccountItemSummary[];
  openingItemKey: string;
  isLoadoutMatch?: (item: AccountItemSummary) => boolean;
}): AccountPostmasterPreviewItem[] {
  return input.items.slice(0, 12).map((item) => {
    const key = getAccountPageItemKey(item);
    return {
      key,
      item,
      meta: formatAccountItemMeta(item),
      isPending: key === input.openingItemKey,
      isLoadoutMatch: input.isLoadoutMatch ? input.isLoadoutMatch(item) : false
    };
  });
}

export function buildAccountLoadoutSlotRows(
  character: AccountSummary["characters"][number]
): AccountLoadoutSlotRow[] {
  return character.loadout_slots.map((slot) => ({
    key: `${character.character_id}-loadout-${slot.index}`,
    slot,
    title: slot.name || `配装栏 ${slot.index + 1}`,
    subtitle: `槽位 ${slot.index + 1} / ${slot.item_count} 件装备`,
    preview: slot.items.slice(0, 4).map((item) => item.name).join(" / ") || "当前槽位为空"
  }));
}

export function formatArmorStatsSummary(item: Pick<AccountItemSummary, "armor_stats">): string | undefined {
  if (!item.armor_stats) {
    return undefined;
  }

  return [
    `总值 ${item.armor_stats.total}`,
    `生命值 ${item.armor_stats.health}`,
    `职业 ${item.armor_stats.class}`,
    `手雷 ${item.armor_stats.grenade}`
  ].join(" / ");
}

export function groupAccountItemsBySlot(items: AccountItemSummary[]): AccountSlotCategory[] {
  const groups = new Map<string, AccountSlotGroup>();

  for (const item of items) {
    const label = getAccountSlotLabel(item);
    const category = categoryForItem(item);
    const key = `${category}:${label}`;
    const group = groups.get(key) ?? {
      key,
      label,
      category,
      items: []
    };
    group.items.push(item);
    groups.set(key, group);
  }

  const sortedGroups = [...groups.values()].sort(compareSlotGroups);
  return categoryOrder
    .map((key) => {
      const categoryGroups = sortedGroups.filter((group) => group.category === key);
      return {
        key,
        label: categoryLabels[key],
        groups: categoryGroups,
        count: categoryGroups.reduce((sum, group) => sum + group.items.length, 0)
      };
    })
    .filter((category) => category.groups.length > 0);
}

export function buildAccountSlotComparisonRows(
  equippedItems: AccountItemSummary[],
  inventoryItems: AccountItemSummary[]
): AccountSlotComparisonRow[] {
  const rows = new Map<string, AccountSlotComparisonRow>();

  for (const item of equippedItems) {
    const row = getOrCreateSlotComparisonRow(rows, item);
    row.equippedItems.push(item);
  }

  for (const item of inventoryItems) {
    const row = getOrCreateSlotComparisonRow(rows, item);
    row.inventoryItems.push(item);
  }

  return [...rows.values()].sort(compareSlotComparisonRows);
}

function getOrCreateSlotComparisonRow(
  rows: Map<string, AccountSlotComparisonRow>,
  item: AccountItemSummary
): AccountSlotComparisonRow {
  const label = getAccountSlotLabel(item);
  const category = categoryForItem(item);
  const key = `${category}:${label}`;
  const existing = rows.get(key);
  if (existing) {
    return existing;
  }

  const row = {
    key,
    label,
    category,
    equippedItems: [],
    inventoryItems: []
  };
  rows.set(key, row);
  return row;
}

function compareSlotComparisonRows(left: AccountSlotComparisonRow, right: AccountSlotComparisonRow): number {
  return slotRank(left.label) - slotRank(right.label)
    || categoryOrder.indexOf(left.category) - categoryOrder.indexOf(right.category)
    || left.label.localeCompare(right.label, "zh-Hans-CN");
}

export function getAccountSlotLabel(item: AccountItemSummary): string {
  return item.bucket_name?.trim() || inferOtherSlotName(item);
}

function categoryForItem(item: AccountItemSummary): AccountSlotCategoryKey {
  if (item.group_key === "weapons" || item.group_key === "armor" || item.group_key === "equipment") {
    return item.group_key;
  }
  return "other";
}

function compareSlotGroups(left: AccountSlotGroup, right: AccountSlotGroup): number {
  return slotRank(left.label) - slotRank(right.label)
    || categoryOrder.indexOf(left.category) - categoryOrder.indexOf(right.category)
    || left.label.localeCompare(right.label, "zh-Hans-CN");
}

function slotRank(label: string): number {
  const index = bucketOrder.indexOf(label);
  if (index !== -1) return index;

  const otherIndex = otherGroupOrder.indexOf(label);
  return otherIndex === -1 ? 999 : 100 + otherIndex;
}

function inferOtherSlotName(item: AccountItemSummary): string {
  const type = item.item_type?.trim() ?? "";
  const name = item.name.trim();
  const text = `${type} ${name}`.toLowerCase();

  if (name.includes("记忆水晶") || text.includes("engram")) {
    return "记忆水晶";
  }
  if (includesAny(text, ["任务", "悬赏", "追踪", "证章", "行动", "召唤", "quest", "bounty"])) {
    return "任务与追踪";
  }
  if (includesAny(text, ["货币", "材料", "核心", "硬币", "水晶", "碎片", "currency", "material"])) {
    return "材料与货币";
  }
  if (includesAny(text, ["消耗品", "加成", "礼物", "钥匙", "consumable", "boost", "gift", "key"])) {
    return "消耗品";
  }
  if (includesAny(text, ["模组", "着色器", "皮肤", "投影", "mod", "shader", "ornament", "projection"])) {
    return "模组与外观";
  }
  if (includesAny(text, ["传承", "信条", "纪念", "收藏", "legacy", "collectible", "memento"])) {
    return "收藏与纪念";
  }
  return "未识别物品";
}

function includesAny(value: string, patterns: string[]): boolean {
  return patterns.some((pattern) => value.includes(pattern));
}
