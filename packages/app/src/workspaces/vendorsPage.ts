import { isXurActiveAt, xurVendorHash } from "@d2-tools/core/daily/xurSchedule";
import type { AccountSummary } from "@d2-tools/core/account/summary";
import type {
  VendorCharacterScope,
  VendorInventorySnapshot,
  VendorOffer
} from "@d2-tools/core/vendors/inventory";
import {
  composeVendorStructures,
  createDefaultVendorContentSections,
  createInventorySections,
  partitionVendorItems,
  type VendorContentKind
} from "./vendorStructure.js";
import {
  canonicalVendorHash,
  normalizeBungieIconUrl,
  slugify,
  vendorMatchKey
} from "./vendorIdentity.js";

export type VendorInventoryTone = "exotic" | "weapon" | "armor" | "material";
export type VendorInventoryStatus = "owned" | "recommended" | "unknown";
export type VendorInventoryState = "loaded" | "empty" | "unavailable";
export type VendorDetailState = "pending" | "ready" | "partial" | "failed";

export type VendorInventoryItemWorkspace = {
  id: string;
  name: string;
  itemType: string;
  summary: string;
  cost?: string;
  iconLabel: string;
  iconUrl?: string;
  costIconLabel?: string;
  costIconUrl?: string;
  tone: VendorInventoryTone;
  status: VendorInventoryStatus;
  itemHash?: number;
  quantity?: number;
  vendorItemIndex?: number;
  vendorHash?: number;
  categoryIndex?: number;
  categoryName?: string;
  categoryIdentifier?: string;
  previewVendorHash?: number;
  characterIds?: string[];
  decisionLabel?: string;
  canPurchase?: boolean;
  failureMessages?: string[];
  costs?: VendorCostWorkspace[];
  stats?: Record<string, number>;
  socketPlugs?: Array<{
    hash: number;
    name: string;
    iconUrl?: string;
    description?: string;
    categoryIdentifier?: string;
    statModifiers?: Record<string, number>;
    itemType?: string;
  }>;
  sourcePath?: string;
};

export type VendorInventorySectionWorkspace = {
  id: string;
  name: string;
  description?: string;
  presentation?: "standard" | "featured";
  items: VendorInventoryItemWorkspace[];
};

export type VendorContentSectionWorkspace = {
  id: string;
  kind: VendorContentKind;
  scope?: "character" | "account" | "clan";
  action?: "purchase" | "exchange" | "focus" | "decode" | "claim" | "acquire" | "inspect";
  condition?: string;
  name: string;
  description?: string;
  layout: "featured" | "columns" | "list" | "rank";
  groups: VendorInventorySectionWorkspace[];
  progression?: VendorProgressionWorkspace;
};

export type VendorCostWorkspace = {
  label: string;
  required: number;
  owned: number | null;
  affordable: boolean | null;
  iconUrl?: string;
};

export type VendorServiceWorkspace = {
  id: string;
  vendorHash?: number;
  name: string;
  description: string;
  items: VendorInventoryItemWorkspace[];
  sections?: VendorInventorySectionWorkspace[];
};

export type VendorProgressionWorkspace = {
  currentProgress: number;
  level: number;
  levelCap: number;
  progressToNextLevel: number;
  nextLevelAt: number;
};

export type VendorInventoryGroupWorkspace = {
  id: string;
  vendorHash?: number;
  vendorIdentifier?: string;
  vendorGroupHash?: number;
  vendorGroupName?: string;
  vendorGroupOrder?: number;
  name: string;
  description: string;
  badge: string;
  source: string;
  resetLabel: string;
  resetAt?: string;
  location?: string;
  category?: string;
  iconLabel?: string;
  iconUrl?: string;
  statusLabel?: string;
  taskCategory?: string;
  displayStatusLabel?: string;
  inventoryState?: VendorInventoryState;
  inventoryStateLabel?: string;
  railStatusLabel?: string;
  detailToolbar?: VendorDetailToolbarWorkspace;
  detailState?: VendorDetailState;
  detailFailureMessage?: string;
  featured?: boolean;
  items: VendorInventoryItemWorkspace[];
  services?: VendorServiceWorkspace[];
  rankRewards?: VendorInventoryItemWorkspace[];
  taskItems?: VendorInventoryItemWorkspace[];
  childInventoryEntries?: VendorInventoryItemWorkspace[];
  progression?: VendorProgressionWorkspace;
  contentSections?: VendorContentSectionWorkspace[];
};

export type VendorRailSectionWorkspace = {
  id: string;
  title: string;
  vendors: VendorInventoryGroupWorkspace[];
};

export type VendorDetailToolbarWorkspace = {
  taskCategory: string;
  inventoryStateLabel: string;
  statusLabel: string;
  itemCountLabel: string;
};

export type VendorsPageModel = {
  vendors: VendorInventoryGroupWorkspace[];
  railSections: VendorRailSectionWorkspace[];
  defaultVendorId: string | null;
  updatedLabel: string;
  updatedAt?: string;
  sourceLabel: string;
  nextResetLabel: string;
  nextResetAt?: string;
  recommendationCount: number;
  verifiedItemCount: number;
  selectedVendor?: VendorInventoryGroupWorkspace;
  scopeOptions?: VendorScopeOptionWorkspace[];
  selectedScope?: VendorScopeOptionWorkspace;
  selectedCharacterContext?: VendorCharacterContextWorkspace | null;
  search?: { query: string; resultCount: number };
  filters?: VendorFiltersWorkspace;
  statusBanner?: VendorStatusBannerWorkspace;
  resourceStatus: "unavailable" | "loading" | "refreshing" | "ready" | "stale" | "error";
  resourceSource: "local" | "remote" | "merged";
};

export type VendorsPageWorkspace = VendorsPageModel;

export type VendorScopeOptionWorkspace = {
  kind: "character" | "account";
  characterId?: string;
  label: string;
  description: string;
};

export type VendorCharacterContextWorkspace = {
  characterId?: string;
  armorerModHash: number | null;
  armorerModName: string | null;
  label: string;
};

export type VendorFiltersWorkspace = {
  affordableOnly: boolean;
  recommendedOnly: boolean;
};

export type VendorStatusBannerWorkspace = {
  tone: "neutral" | "error";
  message: string;
  live: "polite";
  busy: boolean;
} | null;

export type VendorsPageInput = {
  snapshot: VendorInventorySnapshot | null;
  account: AccountSummary | null;
  scope: VendorCharacterScope;
  now?: Date;
  selectedVendorId?: string;
  refreshState: "idle" | "refreshing" | "failed";
  refreshError?: string;
  statusMessage?: string;
};

export type VendorSearchInput = {
  query: string;
  filters: VendorFiltersWorkspace;
};

export type VendorSearchResults = {
  groups: Array<{
    vendorId: string;
    vendorName: string;
    items: VendorInventoryItemWorkspace[];
  }>;
};

export function selectVendorsPageModel(input: VendorsPageInput): VendorsPageModel {
  return selectSnapshotVendorsPageModel(input);
}

export function filterVendorSearchResults(
  model: VendorsPageModel,
  input: VendorSearchInput
): VendorSearchResults {
  const query = input.query.trim().toLocaleLowerCase();
  if (!query) return { groups: [] };

  const groups = model.vendors.flatMap((vendor) => {
    const directItems = vendor.items
      .filter((item) => matchesVendorSearch(item, query, input.filters))
      .map((item) => ({ ...item, sourcePath: vendor.name }));
    const serviceItems = (vendor.services ?? []).flatMap((service) =>
      service.items
        .filter((item) => matchesVendorSearch(item, query, input.filters))
        .map((item) => ({ ...item, sourcePath: `${vendor.name} → ${service.name}` }))
    );
    const rankItems = (vendor.rankRewards ?? [])
      .filter((item) => matchesVendorSearch(item, query, input.filters))
      .map((item) => ({ ...item, sourcePath: `${vendor.name} → 声望与等级` }));
    const taskItems = (vendor.taskItems ?? [])
      .filter((item) => matchesVendorSearch(item, query, input.filters))
      .map((item) => ({ ...item, sourcePath: `${vendor.name} → 任务` }));
    const items = [...directItems, ...serviceItems, ...rankItems, ...taskItems];
    return items.length ? [{ vendorId: vendor.id, vendorName: vendor.name, items }] : [];
  });
  return { groups };
}

export function buildVendorItemSourcePaths(model: VendorsPageModel): Map<number, string[]> {
  const paths = new Map<number, string[]>();
  for (const vendor of model.vendors) {
    addVendorItemPaths(paths, vendor.items, vendor.name);
    addVendorItemPaths(paths, vendor.rankRewards ?? [], `${vendor.name} → 声望与等级`);
    addVendorItemPaths(paths, vendor.taskItems ?? [], `${vendor.name} → 任务`);
    for (const service of vendor.services ?? []) {
      addVendorItemPaths(paths, service.items, `${vendor.name} → ${service.name}`);
    }
  }
  return paths;
}

function addVendorItemPaths(
  paths: Map<number, string[]>,
  items: VendorInventoryItemWorkspace[],
  fallbackPath: string
): void {
  for (const item of items) {
    if (item.itemHash === undefined) continue;
    const path = item.sourcePath?.trim() || fallbackPath;
    const itemPaths = paths.get(item.itemHash) ?? [];
    if (!itemPaths.includes(path)) itemPaths.push(path);
    paths.set(item.itemHash, itemPaths);
  }
}

function selectSnapshotVendorsPageModel(input: VendorsPageInput): VendorsPageModel {
  const snapshot = input.snapshot;
  const filters: VendorFiltersWorkspace = { affordableOnly: false, recommendedOnly: false };
  if (!snapshot) {
    return {
      vendors: [],
      railSections: createVendorRailSections([]),
      defaultVendorId: null,
      updatedLabel: "等待商人数据",
      sourceLabel: "Bungie 角色商人",
      nextResetLabel: "等待商人刷新时间",
      recommendationCount: 0,
      verifiedItemCount: 0,
      scopeOptions: [],
      selectedScope: undefined,
      selectedCharacterContext: null,
      search: { query: "", resultCount: 0 },
      filters,
      statusBanner: createStatusBanner(input),
      resourceStatus: input.refreshState === "refreshing" ? "loading" : input.refreshState === "failed" ? "error" : "unavailable",
      resourceSource: "merged"
    };
  }

  const visibleSnapshotVendors = isXurActiveAt(input.now)
    ? snapshot.vendors
    : snapshot.vendors.filter((vendor) => vendor.vendorHash !== xurVendorHash);
  const mappedVendors = visibleSnapshotVendors.map((vendor) => {
    const availableVendorHashes = new Set(visibleSnapshotVendors.map((candidate) => candidate.vendorHash));
    const detailFailures = getVendorDetailFailures(snapshot, vendor.vendorHash, input.scope);
    const detailState = getVendorDetailState(
      vendor.vendorHash,
      vendor.characterIds,
      detailFailures,
      input.scope,
      snapshot.detailVendorHashes
    );
    const mappedOffers = vendor.offers
      .filter((offer) => offerMatchesScope(offer, input.scope))
      .map((offer) => mapSnapshotOffer(offer, snapshot, vendor.name));
    const partitionedItems = partitionVendorItems(
      vendor.vendorHash,
      mappedOffers,
      availableVendorHashes
    );
    const serviceChildEntries: VendorInventoryItemWorkspace[] = [];
    const services = vendor.services.map((service) => {
      const mappedServiceOffers = service.offers
        .filter((offer) => offerMatchesScope(offer, input.scope))
        .map((offer) => mapSnapshotOffer(offer, snapshot, `${vendor.name} → ${service.name}`));
      const childEntries = mappedServiceOffers.filter((offer) =>
        offer.previewVendorHash !== undefined
        && offer.previewVendorHash !== vendor.vendorHash
        && availableVendorHashes.has(offer.previewVendorHash)
      );
      serviceChildEntries.push(...childEntries);
      const items = mappedServiceOffers.filter((offer) => !childEntries.includes(offer));
      return {
        id: service.id,
        name: service.name,
        description: service.description,
        items,
        sections: createInventorySections(items)
      };
    });
    return {
      id: vendor.id,
      vendorHash: vendor.vendorHash,
      vendorIdentifier: vendor.vendorIdentifier,
      vendorGroupHash: vendor.vendorGroupHash,
      vendorGroupName: vendor.vendorGroupName,
      vendorGroupOrder: vendor.vendorGroupOrder,
      name: vendor.name,
      description: vendor.description,
      iconUrl: normalizeBungieIconUrl(vendor.iconUrl),
      badge: vendor.vendorHash === xurVendorHash ? "周末" : "已确认",
      source: "Bungie 角色商人",
      resetLabel: "等待刷新时间",
      resetAt: vendor.nextRefreshAt,
      location: vendor.location,
      category: vendor.vendorHash === xurVendorHash ? "重点" : "已确认",
      statusLabel: detailState === "failed"
        ? "详情失败"
        : detailState === "partial"
          ? "部分详情失败"
          : detailState === "pending"
            ? "属性读取中"
            : "已确认",
      detailState,
      detailFailureMessage: getVendorDetailFailureMessage(detailState, detailFailures),
      featured: vendor.vendorHash === xurVendorHash,
      items: partitionedItems.items,
      services,
      rankRewards: partitionedItems.rankRewards,
      taskItems: partitionedItems.taskItems,
      childInventoryEntries: [
        ...(partitionedItems.childInventoryEntries ?? []),
        ...serviceChildEntries
      ],
      progression: vendor.progression ? {
        currentProgress: vendor.progression.currentProgress,
        level: vendor.progression.level,
        levelCap: vendor.progression.levelCap,
        progressToNextLevel: vendor.progression.progressToNextLevel,
        nextLevelAt: vendor.progression.nextLevelAt
      } : undefined
    } satisfies VendorInventoryGroupWorkspace;
  });
  const composedVendors = composeVendorStructures(mappedVendors);
  const groupedVendors = composedVendors.filter((vendor) => vendor.vendorGroupName);
  const vendors = (groupedVendors.length ? groupedVendors : composedVendors).map((vendor) => enrichVendorViewModel({
    ...vendor,
    contentSections: vendor.contentSections ?? createDefaultVendorContentSections(vendor)
  }));
  const defaultVendorId = input.selectedVendorId && vendors.some((vendor) => vendor.id === input.selectedVendorId)
    ? input.selectedVendorId
    : vendors.find((vendor) => vendor.featured)?.id ?? vendors[0]?.id ?? null;
  const selectedVendor = vendors.find((vendor) => vendor.id === defaultVendorId);
  const selectedCharacterContext = createSelectedCharacterContext(snapshot, input.scope);

  return {
    vendors,
    railSections: createVendorRailSections(vendors),
    defaultVendorId,
    selectedVendor,
    updatedLabel: "已读取商人数据",
    updatedAt: snapshot.fetchedAt,
    sourceLabel: "Bungie 角色商人",
    nextResetLabel: selectedVendor?.resetLabel ?? "等待商人刷新时间",
    nextResetAt: selectedVendor?.resetAt,
    recommendationCount: vendors.reduce(
      (count, vendor) => count + vendor.items.filter((item) => Boolean(item.decisionLabel)).length,
      0
    ),
    verifiedItemCount: vendors.reduce(
      (count, vendor) => count + vendor.items.length + (vendor.rankRewards?.length ?? 0) + (vendor.services ?? []).reduce(
        (serviceCount, service) => serviceCount + service.items.length,
        0
      ) + (vendor.taskItems?.length ?? 0),
      0
    ),
    scopeOptions: createScopeOptions(snapshot, input.account),
    selectedScope: createSelectedScopeOption(snapshot, input.account, input.scope),
    selectedCharacterContext,
    search: { query: "", resultCount: 0 },
    filters,
    statusBanner: createStatusBanner(input),
    resourceStatus: input.refreshState === "refreshing" ? "refreshing" : input.refreshState === "failed" ? "stale" : "ready",
    resourceSource: "merged"
  };
}

function mapSnapshotOffer(
  offer: VendorOffer,
  snapshot: VendorInventorySnapshot,
  sourcePath: string
): VendorInventoryItemWorkspace {
  const costs = offer.costs.map((cost) => {
    const owned = snapshot.currencyBalances[String(cost.itemHash)];
    return {
      label: cost.name,
      required: cost.quantity,
      owned: owned ?? null,
      affordable: owned === undefined ? null : owned >= cost.quantity,
      iconUrl: normalizeBungieIconUrl(cost.iconUrl)
    };
  });
  const tone = getInventoryTone(`${offer.name} ${offer.itemType} ${offer.tierType}`);
  return {
    id: offer.id,
    itemHash: offer.itemHash,
    quantity: offer.quantity,
    vendorItemIndex: offer.vendorItemIndex,
    vendorHash: offer.vendorHash,
    categoryIndex: offer.categoryIndex,
    categoryName: offer.categoryName,
    categoryIdentifier: offer.categoryIdentifier,
    previewVendorHash: offer.previewVendorHash,
    characterIds: [...offer.characterIds],
    name: offer.name,
    itemType: [offer.itemType, offer.tierType].filter(Boolean).join("，"),
    summary: offer.failureMessages[0] ?? "Bungie 当前角色商人库存",
    cost: costs.map((cost) => `${cost.required} ${cost.label}`).join(" / ") || undefined,
    costs,
    iconLabel: getIconLabel(offer.name),
    iconUrl: normalizeBungieIconUrl(offer.iconUrl),
    tone,
    status: "unknown",
    decisionLabel: tone === "exotic" ? "高质量售卖实例" : undefined,
    canPurchase: offer.canPurchase,
    failureMessages: [...offer.failureMessages],
    stats: { ...offer.stats },
    socketPlugs: (offer.socketPlugs ?? []).map((plug) => ({
      ...plug,
      iconUrl: normalizeBungieIconUrl(plug.iconUrl)
    })),
    sourcePath
  };
}

function offerMatchesScope(offer: VendorOffer, scope: VendorCharacterScope): boolean {
  return scope.kind === "account" || offer.characterIds.includes(scope.characterId);
}

function createScopeOptions(snapshot: VendorInventorySnapshot, account: AccountSummary | null): VendorScopeOptionWorkspace[] {
  const contexts = new Map(
    Object.values(snapshot.characterContexts).map((context) => [context.characterId, context])
  );
  const characterIds = account?.characters.length
    ? account.characters.map((character) => character.character_id)
    : Object.keys(snapshot.characterContexts);
  const classNameCounts = new Map<string, number>();
  const classNameIndexes = new Map<string, number>();
  for (const characterId of characterIds) {
    const label = account?.characters.find((character) => character.character_id === characterId)?.class_name ?? "当前角色";
    classNameCounts.set(label, (classNameCounts.get(label) ?? 0) + 1);
  }

  return [
    {
      kind: "account",
      label: "账号全部",
      description: "按各角色当前机灵模组合并"
    },
    ...characterIds.map((characterId, index) => {
      const character = account?.characters.find((candidate) => candidate.character_id === characterId);
      const context = contexts.get(characterId);
      const baseLabel = character?.class_name ?? `角色 ${index + 1}`;
      const duplicateIndex = (classNameIndexes.get(baseLabel) ?? 0) + 1;
      classNameIndexes.set(baseLabel, duplicateIndex);
      const label = (classNameCounts.get(baseLabel) ?? 0) > 1 ? `${baseLabel} ${duplicateIndex}` : baseLabel;
      return {
        kind: "character" as const,
        characterId,
        label,
        description: context?.armorerModName ? `当前机灵：${context.armorerModName}` : "当前机灵：未检测到护甲师模组"
      };
    })
  ];
}

function createSelectedScopeOption(
  snapshot: VendorInventorySnapshot,
  account: AccountSummary | null,
  scope: VendorCharacterScope
): VendorScopeOptionWorkspace {
  const options = createScopeOptions(snapshot, account);
  if (scope.kind === "account") return options[0] ?? { kind: "account", label: "账号全部", description: "按各角色当前机灵模组合并" };
  return options.find((option) => option.kind === "character" && option.characterId === scope.characterId)
    ?? { kind: "character", characterId: scope.characterId, label: "当前角色", description: "当前角色库存" };
}

function createSelectedCharacterContext(
  snapshot: VendorInventorySnapshot,
  scope: VendorCharacterScope
): VendorCharacterContextWorkspace {
  if (scope.kind === "account") {
    return {
      armorerModHash: null,
      armorerModName: null,
      label: "按各角色当前机灵模组合并"
    };
  }
  const context = snapshot.characterContexts[scope.characterId];
  return {
    characterId: scope.characterId,
    armorerModHash: context?.armorerModHash ?? null,
    armorerModName: context?.armorerModName ?? null,
    label: context?.armorerModName
      ? `当前机灵：${context.armorerModName}`
      : "当前机灵：未检测到护甲师模组"
  };
}

function getVendorDetailFailures(
  snapshot: VendorInventorySnapshot,
  vendorHash: number,
  scope: VendorCharacterScope
) {
  return snapshot.failedVendorDetails.filter((failure) =>
    failure.vendorHash === vendorHash
    && (scope.kind === "account" || failure.characterId === scope.characterId)
  );
}

function getVendorDetailState(
  vendorHash: number,
  vendorCharacterIds: string[],
  failures: VendorInventorySnapshot["failedVendorDetails"],
  scope: VendorCharacterScope,
  detailVendorHashes: number[] | undefined
): VendorDetailState {
  if (detailVendorHashes && !detailVendorHashes.includes(vendorHash)) return "pending";
  if (!failures.length) return "ready";
  const expectedCharacterIds = scope.kind === "account"
    ? vendorCharacterIds
    : [scope.characterId];
  const failedCharacterIds = new Set(failures.map((failure) => failure.characterId));
  return expectedCharacterIds.length > 0
    && expectedCharacterIds.every((characterId) => failedCharacterIds.has(characterId))
    ? "failed"
    : "partial";
}

function getVendorDetailFailureMessage(
  detailState: VendorDetailState,
  failures: VendorInventorySnapshot["failedVendorDetails"]
): string | undefined {
  if (detailState === "ready" || detailState === "pending") return undefined;
  if (detailState === "failed" && failures.length === 1) return failures[0].message;
  return `${new Set(failures.map((failure) => failure.characterId)).size} 个角色的属性与插槽详情读取失败`;
}

function createStatusBanner(input: VendorsPageInput): VendorStatusBannerWorkspace {
  if (input.refreshState === "refreshing") {
    const selectedVendorHash = input.snapshot?.vendors.find((vendor) => vendor.id === input.selectedVendorId)?.vendorHash
      ?? input.snapshot?.vendors.find((vendor) => vendor.vendorHash === 2190858386)?.vendorHash
      ?? input.snapshot?.vendors[0]?.vendorHash;
    const isLoadingSelectedDetail = selectedVendorHash !== undefined
      && input.snapshot?.detailVendorHashes !== undefined
      && !input.snapshot.detailVendorHashes.includes(selectedVendorHash);
    return {
      tone: "neutral",
      message: isLoadingSelectedDetail ? "正在读取当前商人属性" : "正在读取实时商人库存",
      live: "polite",
      busy: true
    };
  }
  if (input.refreshState === "failed") {
    return { tone: "error", message: input.refreshError ?? "商人数据刷新失败", live: "polite", busy: false };
  }
  if (input.snapshot?.failedCharacterIds.length || input.snapshot?.failedVendorDetails.length) {
    const messages = [];
    if (input.snapshot.failedCharacterIds.length) {
      messages.push(`${input.snapshot.failedCharacterIds.length} 个角色商人列表读取失败`);
    }
    if (input.snapshot.failedVendorDetails.length) {
      messages.push(`${input.snapshot.failedVendorDetails.length} 个商人详情读取失败`);
    }
    return { tone: "error", message: messages.join("；"), live: "polite", busy: false };
  }
  if (input.statusMessage) {
    return { tone: "neutral", message: input.statusMessage, live: "polite", busy: false };
  }
  return null;
}

function matchesVendorSearch(
  item: VendorInventoryItemWorkspace,
  query: string,
  filters: VendorFiltersWorkspace
): boolean {
  const text = `${item.name} ${item.itemType} ${item.summary}`.toLocaleLowerCase();
  if (!text.includes(query)) return false;
  if (filters.affordableOnly && !item.costs?.every((cost) => cost.affordable === true)) return false;
  if (filters.recommendedOnly && !item.decisionLabel) return false;
  return true;
}

const vendorLocationOrder = [
  "限时",
  "凯旋纪念碑",
  "反叛",
  "开普勒",
  "高塔",
  "苍白之心",
  "H.E.L.M.",
  "海王星",
  "王座世界",
  "木卫二",
  "月球",
  "永恒",
  "梦想之城",
  "涅索斯",
  "欧洲无人区",
  "发射基地",
  "其他地点"
];

const towerVendorHashes = new Set([
  2190858386,
  672118013,
  350061650,
  765357505,
  69482069,
  3603221665,
  248695599,
  2255782930,
  3347378076,
  1976548992
]);

function createVendorRailSections(vendors: VendorInventoryGroupWorkspace[]): VendorRailSectionWorkspace[] {
  if (vendors.some((vendor) => vendor.vendorGroupName)) {
    const sections = new Map<string, VendorRailSectionWorkspace & { order: number }>();
    for (const vendor of vendors) {
      const title = vendor.vendorGroupName?.trim() || vendor.location || "其他地点";
      const id = vendor.vendorGroupHash === undefined
        ? `location-${slugify(title)}`
        : `vendor-group-${vendor.vendorGroupHash}`;
      const existing = sections.get(id);
      if (existing) {
        existing.vendors.push(vendor);
        continue;
      }
      sections.set(id, {
        id,
        title,
        order: vendor.vendorGroupOrder ?? Number.MAX_SAFE_INTEGER,
        vendors: [vendor]
      });
    }
    return [...sections.values()]
      .sort((left, right) => left.order - right.order || left.title.localeCompare(right.title, "zh-CN"))
      .map(({ order: _order, ...section }) => section);
  }

  const vendorsByLocation = new Map<string, VendorInventoryGroupWorkspace[]>();
  for (const vendor of vendors) {
    const location = vendor.location ?? "其他地点";
    const locationVendors = vendorsByLocation.get(location) ?? [];
    locationVendors.push(vendor);
    vendorsByLocation.set(location, locationVendors);
  }
  return [...vendorsByLocation.entries()]
    .sort(([left], [right]) => compareVendorLocations(left, right))
    .map(([title, locationVendors]) => ({
      id: `location-${slugify(title)}`,
      title,
      vendors: locationVendors
    }));
}

function enrichVendorViewModel(vendor: VendorInventoryGroupWorkspace): VendorInventoryGroupWorkspace {
  const taskCategory = getVendorTaskCategory(vendor);
  const location = getVendorLocation(vendor);
  const inventoryState = getVendorInventoryState(vendor);
  const displayStatusLabel = getVendorDisplayStatusLabel(vendor, inventoryState);
  const inventoryStateLabel = getVendorInventoryStateLabel(inventoryState);
  const itemCountLabel = `${countVendorSaleItems(vendor)} 件物品`;
  return {
    ...vendor,
    location,
    taskCategory,
    displayStatusLabel,
    inventoryState,
    inventoryStateLabel,
    railStatusLabel: `${displayStatusLabel} · ${itemCountLabel}`,
    detailToolbar: {
      taskCategory,
      inventoryStateLabel,
      statusLabel: displayStatusLabel,
      itemCountLabel
    }
  };
}

function compareVendorLocations(left: string, right: string): number {
  const otherIndex = vendorLocationOrder.indexOf("其他地点");
  const leftKnownIndex = vendorLocationOrder.indexOf(left);
  const rightKnownIndex = vendorLocationOrder.indexOf(right);
  const leftIndex = leftKnownIndex >= 0 ? leftKnownIndex : otherIndex - 0.5;
  const rightIndex = rightKnownIndex >= 0 ? rightKnownIndex : otherIndex - 0.5;
  return leftIndex === rightIndex ? left.localeCompare(right, "zh-CN") : leftIndex - rightIndex;
}

function getVendorLocation(vendor: VendorInventoryGroupWorkspace): string {
  const location = normalizeVendorLocation(vendor.location);
  if (location) return location;

  const vendorHash = vendor.vendorHash === undefined ? undefined : canonicalVendorHash(vendor.vendorHash);
  if (vendorHash !== undefined && towerVendorHashes.has(vendorHash)) return "高塔";

  const value = `${vendor.id} ${vendor.name} ${vendor.description}`.toLocaleLowerCase();
  if (/仄|xur|xûr|班西|banshee|艾达|ada|圣人14|saint|萨瓦拉|zavala|沙克斯|shaxx|浪客|drifter|拉乎尔|rahool|泰斯|tess|霍桑|hawthorne|艾可拉|ikora|任务档案|特殊货物|失落光能纪念碑|过往赛季纪念碑/.test(value)) return "高塔";
  if (/星马|starhorse/.test(value)) return "永恒";
  if (/伊娃|eva|萨拉丁|saladin|限时|event/.test(value)) return "限时";
  if (/幽灵|ghost/.test(value)) return "苍白之心";
  if (/宁博思|nimbus/.test(value)) return "海王星";
  if (/芬奇|fynch/.test(value)) return "王座世界";
  if (/瓦里克斯|variks|陌客|exo stranger/.test(value)) return "木卫二";
  if (/厄里斯|eris|附魔台|lectern/.test(value)) return "月球";
  if (/佩特拉|petra/.test(value)) return "梦想之城";
  if (/失效保险|failsafe/.test(value)) return "涅索斯";
  if (/德弗里姆|devrim/.test(value)) return "欧洲无人区";
  if (/肖汉|shaw han/.test(value)) return "发射基地";
  return "其他地点";
}

function normalizeVendorLocation(value: string | undefined): string | undefined {
  const location = value?.trim();
  if (!location) return undefined;
  if (/高塔|tower/i.test(location)) return "高塔";
  if (/苍白之心|pale heart/i.test(location)) return "苍白之心";
  if (/凯旋纪念碑|monument to lost lights/i.test(location)) return "凯旋纪念碑";
  if (/反叛|renegades/i.test(location)) return "反叛";
  if (/开普勒|kepler/i.test(location)) return "开普勒";
  if (/h\.e\.l\.m/i.test(location)) return "H.E.L.M.";
  return location;
}

function getVendorInventoryState(vendor: VendorInventoryGroupWorkspace): VendorInventoryState {
  if (countVendorSaleItems(vendor) > 0 || (vendor.rankRewards?.length ?? 0) > 0) return "loaded";
  if (vendor.statusLabel === "已确认") return "empty";
  return "unavailable";
}

function countVendorSaleItems(vendor: VendorInventoryGroupWorkspace): number {
  return vendor.items.length + (vendor.services ?? []).reduce(
    (count, service) => count + service.items.length,
    0
  ) + (vendor.taskItems?.length ?? 0);
}

function getVendorDisplayStatusLabel(vendor: VendorInventoryGroupWorkspace, inventoryState: VendorInventoryState): string {
  if (vendor.detailState === "pending") return "属性读取中";
  if (vendor.detailState === "failed") return "详情失败";
  if (vendor.detailState === "partial") return "部分详情失败";
  if (inventoryState === "empty") return "暂无可读库存";
  if (inventoryState === "unavailable") return "无法确认";
  return vendor.statusLabel ?? vendor.badge;
}

function getVendorInventoryStateLabel(inventoryState: VendorInventoryState): string {
  if (inventoryState === "loaded") return "库存已读取";
  if (inventoryState === "empty") return "暂无可读库存";
  return "无法确认库存";
}

function getVendorTaskCategory(vendor: VendorInventoryGroupWorkspace): string {
  const key = vendorMatchKey(`${vendor.id} ${vendor.name} ${vendor.description}`);
  if (key === "xur" || key === "banshee" || key === "rahool") return "重点库存";
  if (key === "zavala" || key === "shaxx" || key === "drifter") return "仪式声望";
  if (key === "saint") return "周末活动";
  if (key === "ada" || key === "tess") return "外观 / 服务";

  const value = `${vendor.id} ${vendor.name} ${vendor.description} ${vendor.category ?? ""}`.toLocaleLowerCase();
  if (/xur|仄|周末异域|banshee|班西|武器商人|rahool|拉乎尔|记忆水晶/.test(value)) return "重点库存";
  if (/zavala|先锋|vanguard|shaxx|熔炉|crucible|drifter|浪客|智谋|gambit/.test(value)) return "仪式声望";
  if (/saint|试炼|trials|周末活动/.test(value)) return "周末活动";
  if (/ada|护甲合成|tess|外观|appearance|eververse|永恒之诗/.test(value)) return "外观 / 服务";
  return "其他商人";
}

function getInventoryTone(text: string): VendorInventoryTone {
  if (/异域|Exotic/i.test(text)) return "exotic";
  if (/护甲|头盔|臂铠|胸甲|腿甲|职业物品|Armor|Helmet|Gauntlets|Chest|Leg/i.test(text)) return "armor";
  if (/材料|货币|赏金|模组|Material|Currency|Bounty|Mod/i.test(text)) return "material";
  return "weapon";
}

function getIconLabel(name: string): string {
  const chars = Array.from(name.trim()).filter((char) => char.trim());
  return chars.slice(0, Math.min(chars.length, 2)).join("") || "商";
}
