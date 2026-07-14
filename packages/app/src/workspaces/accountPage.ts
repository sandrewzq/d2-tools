import type { AccountItemSummary, AccountMaterialSummary, AccountSummary } from "@d2-tools/core/account/summary";
import type { ActivityHistorySummary } from "@d2-tools/core/activities/history";

export type AccountOpenItemPayload = {
  item: AccountItemSummary;
  source_character_id: string;
  source_kind?: "equipped" | "inventory";
  is_postmaster_item?: boolean;
};

export type AccountItemView = {
  key: string;
  name: string;
  icon?: string;
  meta: string;
  isPending: boolean;
  isLoadoutMatch: boolean;
  openPayload: AccountOpenItemPayload;
};

export type AccountCharacterTabView = {
  key: string;
  className: string;
  lightLabel: string;
  emblemUrl?: string;
  isSelected: boolean;
};

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
  accountStatusLabel?: string;
};

export type AccountFeedbackView = {
  accountError: string;
  accountWarning: string;
  itemDetailError: string;
  loadoutMessage: string;
  itemActionMessage: string;
  activityMessage: string;
  activityError: string;
  writeActionsEnabled: boolean;
};

export type AccountProfileView = {
  accountName: string;
  profileLine: string;
  inventoryLine: string;
};

export type AccountPageNavItem = {
  key: "profile" | "loadout" | "activity" | "materials" | "postmaster";
  href: string;
  labelKey: "overview" | "loadout" | "activity" | "materials" | "postmaster";
};

export type AccountCharacterDetailView = {
  characterId: string;
  className: string;
  lightLabel: string;
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

export type AccountMaterialsSectionView = {
  rows: AccountMaterialRow[];
};

export type AccountPostmasterSectionView = {
  items: AccountItemView[];
};

export type AccountPageViewModel = {
  connection: AccountConnectionView;
  feedback: AccountFeedbackView;
  profile: AccountProfileView | null;
  navigation: AccountPageNavItem[];
  characterTabs: AccountCharacterTabView[];
  selectedCharacter: AccountCharacterDetailView | null;
  loadout: AccountLoadoutSectionView;
  activity: AccountActivitySectionView;
  materials: AccountMaterialsSectionView;
  postmaster: AccountPostmasterSectionView;
};

export type SharedDomainCache = {
  accountSummary: AccountSummary | null;
  activitySummary: ActivityHistorySummary | null;
};

export type AccountPageState = {
  selectedCharacterId: string;
  openingItemKey?: string;
  isLoadoutMatch?: (item: AccountItemSummary) => boolean;
  isBungieConfigured: boolean;
  isAccountLoggedIn: boolean;
  isLoadingAccount: boolean;
  writeActionsEnabled: boolean;
  accountStatusLabel?: string;
  accountError: string;
  accountWarning?: string;
  itemDetailError: string;
  activityMessage: string;
  activityError: string;
  loadoutMessage: string;
  itemActionMessage: string;
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

export type AccountCharacterTab = {
  key: string;
  character: AccountSummary["characters"][number];
  className: string;
  lightLabel: string;
  emblemUrl?: string;
  isSelected: boolean;
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

  return {
    accountProfileLine: account ? `Membership ${account.membership_type} / ${account.destiny_membership_id}` : "",
    accountInventoryLine: account ? `仓库装备：${account.vault.item_count} / 材料与消耗品：${account.materials.item_count}` : "",
    characterTabs: account ? buildAccountCharacterTabs(account, selectedCharacter?.character_id ?? "") : [],
    materialRows: account ? buildAccountMaterialRows(account.materials.items) : [],
    loadoutSlotRows: selectedCharacter ? buildAccountLoadoutSlotRows(selectedCharacter) : [],
    selectedCharacter,
    selectedCharacterItems,
    equippedSlotCategories: selectedCharacter ? groupAccountItemsBySlot(selectedCharacter.equipped_items) : [],
    inventorySlotCategories: selectedCharacter ? groupAccountItemsBySlot(selectedCharacter.inventory_items) : [],
    slotComparisonRows: selectedCharacter
      ? buildAccountSlotComparisonRows(selectedCharacter.equipped_items, selectedCharacter.inventory_items)
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
  const openingItemKey = pageState.openingItemKey ?? "";
  const isLoadoutMatch = pageState.isLoadoutMatch ?? (() => false);

  return {
    connection: {
      hasAccount: Boolean(cache.accountSummary),
      isBungieConfigured: pageState.isBungieConfigured,
      isAccountLoggedIn: pageState.isAccountLoggedIn,
      canLoadAccount: pageState.isBungieConfigured && pageState.isAccountLoggedIn,
      isLoadingAccount: pageState.isLoadingAccount,
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
      writeActionsEnabled: pageState.writeActionsEnabled
    },
    profile: cache.accountSummary
      ? {
        accountName: cache.accountSummary.account_name,
        profileLine: workspace.accountProfileLine,
        inventoryLine: workspace.accountInventoryLine
      }
      : null,
    navigation: accountPageNavigation(),
    characterTabs: workspace.characterTabs.map((tab) => ({
      key: tab.key,
      className: tab.className,
      lightLabel: tab.lightLabel,
      emblemUrl: tab.emblemUrl,
      isSelected: tab.isSelected
    })),
    selectedCharacter: selectedCharacter
      ? {
        characterId: selectedCharacter.character_id,
        className: selectedCharacter.class_name,
        lightLabel: `光等 ${selectedCharacter.light ?? "-"}`,
        emblemUrl: selectedCharacter.emblem_url,
        summary: workspace.selectedCharacterSummary
      }
      : null,
    loadout: {
      equippedCount: selectedCharacter?.equipped_items.length ?? 0,
      inventoryCount: selectedCharacter?.inventory_items.length ?? 0,
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
          isLoadoutMatch
        })),
        inventoryItems: row.inventoryItems.map((item) => toAccountItemView({
          item,
          sourceCharacterId: selectedCharacterId,
          sourceKind: "inventory",
          openingItemKey,
          isLoadoutMatch
        }))
      }))
    },
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
        ? selectedCharacter.postmaster_items.slice(0, 12).map((item) => toAccountItemView({
          item,
          sourceCharacterId: selectedCharacter.character_id,
          openingItemKey,
          isLoadoutMatch,
          isPostmasterItem: true
        }))
        : []
    }
  };
}

function accountPageNavigation(): AccountPageNavItem[] {
  return [
    { key: "profile", href: "#account-profile", labelKey: "overview" },
    { key: "loadout", href: "#account-loadout", labelKey: "loadout" },
    { key: "activity", href: "#account-activity", labelKey: "activity" },
    { key: "materials", href: "#account-materials", labelKey: "materials" },
    { key: "postmaster", href: "#account-postmaster", labelKey: "postmaster" }
  ];
}

function toAccountItemView(input: {
  item: AccountItemSummary;
  sourceCharacterId: string;
  sourceKind?: "equipped" | "inventory";
  openingItemKey: string;
  isLoadoutMatch: (item: AccountItemSummary) => boolean;
  isPostmasterItem?: boolean;
}): AccountItemView {
  const key = getAccountPageItemKey(input.item);
  return {
    key,
    name: input.item.name,
    icon: input.item.icon,
    meta: formatAccountItemMeta(input.item),
    isPending: key === input.openingItemKey,
    isLoadoutMatch: input.isLoadoutMatch(input.item),
    openPayload: {
      item: input.item,
      source_character_id: input.sourceCharacterId,
      source_kind: input.sourceKind,
      is_postmaster_item: input.isPostmasterItem
    }
  };
}

export function buildAccountCharacterTabs(account: AccountSummary, selectedCharacterId: string): AccountCharacterTab[] {
  return account.characters.map((character) => ({
    key: character.character_id,
    character,
    className: character.class_name,
    lightLabel: `光等 ${character.light ?? "-"}`,
    emblemUrl: character.emblem_url,
    isSelected: character.character_id === selectedCharacterId
  }));
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
    item.bucket_name,
    item.tier,
    item.power ? `光等 ${item.power}` : undefined,
    formatArmorStatsSummary(item),
    item.locked ? "已锁定" : undefined
  ].filter(Boolean).join(" / ");
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
