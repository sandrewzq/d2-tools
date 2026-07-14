import type { DailySummary, DailySummaryItem } from "@d2-tools/core/daily/summary";
import type { AccountSummary } from "@d2-tools/core/account/summary";
import type {
  VendorCharacterScope,
  VendorInventorySnapshot,
  VendorOffer
} from "@d2-tools/core/vendors/inventory";

export type VendorInventoryTone = "exotic" | "weapon" | "armor" | "material";
export type VendorInventoryStatus = "owned" | "recommended" | "unknown";
export type VendorInventoryState = "loaded" | "empty" | "not_read" | "unavailable";
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
  categoryIndex?: number;
  categoryName?: string;
  characterIds?: string[];
  decisionLabel?: string;
  costs?: VendorCostWorkspace[];
  stats?: Record<string, number>;
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
  name: string;
  description: string;
  badge: string;
  source: string;
  resetLabel: string;
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
  progression?: VendorProgressionWorkspace;
  contentSections?: VendorContentSectionWorkspace[];
};

export type VendorRailSectionWorkspace = {
  id: "featured" | "ritual" | "weekend" | "cosmetic" | "other";
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
  sourceLabel: string;
  nextResetLabel: string;
  recommendationCount: number;
  verifiedItemCount: number;
  selectedVendor?: VendorInventoryGroupWorkspace;
  scopeOptions?: VendorScopeOptionWorkspace[];
  selectedCharacterContext?: VendorCharacterContextWorkspace | null;
  search?: { query: string; resultCount: number };
  filters?: VendorFiltersWorkspace;
  statusBanner?: VendorStatusBannerWorkspace;
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

const publicVendorSourceLabel = "Bungie 公共商人";
const xurVendorHash = 2190858386;
const xurOffersVendorHash = 537912098;
const xurGearVendorHash = 3751514131;
const xurChildVendorHashes = [xurOffersVendorHash, xurGearVendorHash] as const;

export function selectVendorsPageModel(input: DailySummary | VendorsPageInput | null): VendorsPageModel {
  if (isVendorsPageInput(input)) return selectSnapshotVendorsPageModel(input);
  return selectLegacyVendorsPageModel(input);
}

function selectLegacyVendorsPageModel(dailySummary: DailySummary | null): VendorsPageModel {
  const vendorSource = dailySummary?.sources.vendors;
  if (!dailySummary || vendorSource?.status !== "ready") {
    return buildVendorsPageModel({
      vendors: createLocalVendorDirectory(dailySummary?.daily_reset.time_remaining_label ?? "等待每日重置时间"),
      updatedLabel: dailySummary?.date_label ? `更新：${dailySummary.date_label}` : "等待商人数据",
      sourceLabel: "等待 Bungie 公共商人",
      nextResetLabel: dailySummary?.daily_reset.time_remaining_label ?? "等待每日重置时间",
      recommendationCount: 0,
      verifiedItemCount: 0
    });
  }

  const vendorItems = vendorSource.items ?? [];
  const liveVendors = vendorItems
    .filter((item) => item.title.trim())
    .map((item, index) => mapDailyVendorItem(item, dailySummary, index));
  const vendors = mergeLiveVendorsWithDirectory(liveVendors, dailySummary.daily_reset.time_remaining_label);
  const verifiedItemCount = liveVendors.reduce((count, vendor) => count + vendor.items.length, 0);

  return buildVendorsPageModel({
    vendors,
    updatedLabel: dailySummary?.date_label ? `更新：${dailySummary.date_label}` : "等待商人数据",
    sourceLabel: liveVendors[0]?.source ?? publicVendorSourceLabel,
    nextResetLabel: dailySummary?.daily_reset.time_remaining_label ?? "等待每日重置时间",
    recommendationCount: vendors.reduce(
      (count, vendor) => count + vendor.items.filter((item) => item.status === "recommended").length,
      0
    ),
    verifiedItemCount
  });
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
    const items = [...directItems, ...serviceItems, ...rankItems];
    return items.length ? [{ vendorId: vendor.id, vendorName: vendor.name, items }] : [];
  });
  return { groups };
}

function isVendorsPageInput(input: DailySummary | VendorsPageInput | null): input is VendorsPageInput {
  return Boolean(input && "snapshot" in input && "scope" in input);
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
      selectedCharacterContext: null,
      search: { query: "", resultCount: 0 },
      filters,
      statusBanner: createStatusBanner(input)
    };
  }

  const mappedVendors = snapshot.vendors.map((vendor) => {
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
    const items = vendor.vendorHash === xurVendorHash
      ? mappedOffers.filter((offer) => offer.categoryIndex === 0)
      : mappedOffers;
    const rankRewards = vendor.vendorHash === xurVendorHash
      ? mappedOffers.filter((offer) => offer.categoryIndex === 4)
      : undefined;
    const services = vendor.services.map((service) => ({
      id: service.id,
      name: service.name,
      description: service.description,
      items: service.offers
        .filter((offer) => offerMatchesScope(offer, input.scope))
        .map((offer) => mapSnapshotOffer(offer, snapshot, `${vendor.name} → ${service.name}`)),
      sections: createInventorySections(service.offers
        .filter((offer) => offerMatchesScope(offer, input.scope))
        .map((offer) => mapSnapshotOffer(offer, snapshot, `${vendor.name} → ${service.name}`)))
    }));
    return {
      id: vendor.id,
      vendorHash: vendor.vendorHash,
      name: vendor.name,
      description: vendor.description,
      iconUrl: normalizeBungieIconUrl(vendor.iconUrl),
      badge: vendor.vendorHash === 2190858386 ? "周末" : "已确认",
      source: "Bungie 角色商人",
      resetLabel: formatVendorRefreshLabel(vendor.nextRefreshAt),
      category: vendor.vendorHash === 2190858386 ? "重点" : "已确认",
      statusLabel: detailState === "failed"
        ? "详情失败"
        : detailState === "partial"
          ? "部分详情失败"
          : detailState === "pending"
            ? "属性读取中"
            : "已确认",
      detailState,
      detailFailureMessage: getVendorDetailFailureMessage(detailState, detailFailures),
      featured: vendor.vendorHash === 2190858386,
      items,
      services,
      rankRewards,
      progression: vendor.progression ? {
        currentProgress: vendor.progression.currentProgress,
        level: vendor.progression.level,
        levelCap: vendor.progression.levelCap,
        progressToNextLevel: vendor.progression.progressToNextLevel,
        nextLevelAt: vendor.progression.nextLevelAt
      } : undefined
    } satisfies VendorInventoryGroupWorkspace;
  });
  const vendors = composeXurVendorFamily(mappedVendors).map((vendor) => enrichVendorViewModel({
    ...vendor,
    contentSections: vendor.contentSections ?? createDefaultContentSections(vendor)
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
    updatedLabel: `更新：${snapshot.fetchedAt}`,
    sourceLabel: "Bungie 角色商人",
    nextResetLabel: selectedVendor?.resetLabel ?? "等待商人刷新时间",
    recommendationCount: vendors.reduce(
      (count, vendor) => count + vendor.items.filter((item) => Boolean(item.decisionLabel)).length,
      0
    ),
    verifiedItemCount: vendors.reduce(
      (count, vendor) => count + vendor.items.length + (vendor.rankRewards?.length ?? 0) + (vendor.services ?? []).reduce(
        (serviceCount, service) => serviceCount + service.items.length,
        0
      ),
      0
    ),
    scopeOptions: createScopeOptions(snapshot),
    selectedCharacterContext,
    search: { query: "", resultCount: 0 },
    filters,
    statusBanner: createStatusBanner(input)
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
    categoryIndex: offer.categoryIndex,
    categoryName: offer.categoryName,
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
    stats: { ...offer.stats },
    sourcePath
  };
}

function formatVendorRefreshLabel(value: string | undefined): string {
  if (!value) return "等待刷新时间";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "等待刷新时间";

  const parts = new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).formatToParts(date);
  const part = (type: string) => parts.find((entry) => entry.type === type)?.value ?? "";
  return `刷新：${part("year")}年${part("month")}月${part("day")}日 ${part("weekday")} ${part("hour")}:${part("minute")}`;
}

function composeXurVendorFamily(
  vendors: VendorInventoryGroupWorkspace[]
): VendorInventoryGroupWorkspace[] {
  const parent = vendors.find((vendor) => vendor.vendorHash === xurVendorHash);
  if (!parent) return vendors;

  const children = xurChildVendorHashes
    .map((vendorHash) => vendors.find((vendor) => vendor.vendorHash === vendorHash))
    .filter((vendor): vendor is VendorInventoryGroupWorkspace => Boolean(vendor));
  const childServices = children.map((child) => {
    const items = child.items.map((item) => ({
      ...item,
      sourcePath: `${parent.name} → ${child.name}`
    }));
    return {
      id: child.id,
      vendorHash: child.vendorHash,
      name: child.name,
      description: child.description,
      items,
      sections: createInventorySections(items)
    };
  });
  const family = [parent, ...children];
  const detailState = mergeVendorDetailStates(family.map((vendor) => vendor.detailState));
  const detailFailureMessage = family
    .map((vendor) => vendor.detailFailureMessage)
    .filter((message): message is string => Boolean(message))
    .join("；") || undefined;
  const services = [
    ...(parent.services ?? []).filter((service) => service.items.length > 0),
    ...childServices
  ];
  const mergedParent: VendorInventoryGroupWorkspace = {
    ...parent,
    detailState,
    detailFailureMessage,
    services,
    contentSections: createXurContentSections(parent, services)
  };

  return vendors
    .filter((vendor) => !xurChildVendorHashes.includes(vendor.vendorHash as typeof xurChildVendorHashes[number]))
    .map((vendor) => vendor.vendorHash === xurVendorHash ? mergedParent : vendor);
}

function createXurContentSections(
  parent: VendorInventoryGroupWorkspace,
  childServices: VendorServiceWorkspace[]
): VendorContentSectionWorkspace[] {
  const sections: VendorContentSectionWorkspace[] = [];
  if (parent.rankRewards?.length || parent.progression) {
    sections.push({
      id: "xur-rank",
      name: "声望与等级",
      description: parent.progression
        ? `等级上限 ${parent.progression.levelCap} · ${parent.rankRewards?.length ?? 0} 个奖励`
        : `${parent.rankRewards?.length ?? 0} 个等级奖励`,
      layout: "rank",
      progression: parent.progression,
      groups: [{
        id: "xur-rank-rewards",
        name: "等级奖励",
        items: parent.rankRewards ?? []
      }]
    });
  }
  if (parent.items.length) {
    sections.push({
      id: "xur-weekly",
      name: "多样奇异优惠",
      description: `当前角色 ${parent.items.length} 件`,
      layout: "featured",
      groups: [{ id: "xur-weekly-items", name: "", items: parent.items }]
    });
  }
  for (const service of childServices) {
    const groups = orderXurServiceSections(service).map((group) => decorateXurServiceSection(service, group));
    sections.push({
      id: service.id,
      name: service.name,
      description: service.description || undefined,
      layout: groups.length > 1 ? "columns" : "list",
      groups: groups.length ? groups : [{
        id: `${service.id}-items`,
        name: "",
        items: service.items
      }]
    });
  }
  return sections;
}

function decorateXurServiceSection(
  service: VendorServiceWorkspace,
  group: VendorInventorySectionWorkspace
): VendorInventorySectionWorkspace {
  if (service.vendorHash === xurOffersVendorHash) {
    if (group.name === "玖的忠诚计划") {
      return { ...group, description: "账户级增益", presentation: "featured" };
    }
    if (group.name === "奇异材料优惠") {
      return { ...group, description: `${group.items.length} 个独立兑换条目` };
    }
    if (group.name === "奇异可重复优惠") {
      return { ...group, description: "可重复兑换" };
    }
  }
  if (service.vendorHash === xurGearVendorHash) {
    if (group.name === "异域装备") {
      return { ...group, description: "武器、记忆水晶与催化剂" };
    }
    if (group.name === "传说武器") {
      return { ...group, description: `${group.items.length} 件武器与记忆水晶` };
    }
    if (group.name === "传说护甲") {
      return { ...group, description: "当前角色职业套装" };
    }
  }
  return group;
}

function orderXurServiceSections(service: VendorServiceWorkspace): VendorInventorySectionWorkspace[] {
  const groups = service.sections ?? [];
  const names = service.vendorHash === xurOffersVendorHash
    ? ["玖的忠诚计划", "奇异材料优惠", "奇异可重复优惠"]
    : service.vendorHash === xurGearVendorHash
      ? ["异域装备", "传说武器", "传说护甲"]
      : [];
  if (!names.length) return groups;
  return [...groups].sort((left, right) => {
    const leftIndex = names.indexOf(left.name);
    const rightIndex = names.indexOf(right.name);
    return (leftIndex < 0 ? Number.MAX_SAFE_INTEGER : leftIndex)
      - (rightIndex < 0 ? Number.MAX_SAFE_INTEGER : rightIndex);
  });
}

function createDefaultContentSections(
  vendor: VendorInventoryGroupWorkspace
): VendorContentSectionWorkspace[] {
  const sections: VendorContentSectionWorkspace[] = [];
  if (vendor.items.length) {
    sections.push({
      id: `${vendor.id}-inventory`,
      name: "库存",
      description: `${vendor.items.length} 件`,
      layout: "featured",
      groups: createInventorySections(vendor.items)
    });
  }
  for (const service of vendor.services ?? []) {
    if (!service.items.length) continue;
    sections.push({
      id: service.id,
      name: service.name,
      description: service.description || `${service.items.length} 件`,
      layout: (service.sections?.length ?? 0) > 1 ? "columns" : "list",
      groups: service.sections?.length ? service.sections : [{
        id: `${service.id}-items`,
        name: "",
        items: service.items
      }]
    });
  }
  if (vendor.rankRewards?.length || vendor.progression) {
    sections.push({
      id: `${vendor.id}-rank`,
      name: "声望与等级",
      layout: "rank",
      progression: vendor.progression,
      groups: [{
        id: `${vendor.id}-rank-rewards`,
        name: "等级奖励",
        items: vendor.rankRewards ?? []
      }]
    });
  }
  return sections;
}

function createInventorySections(items: VendorInventoryItemWorkspace[]): VendorInventorySectionWorkspace[] {
  const sections = new Map<string, VendorInventoryItemWorkspace[]>();
  for (const item of items) {
    const name = item.categoryName?.trim() || "其他";
    const sectionItems = sections.get(name) ?? [];
    sectionItems.push(item);
    sections.set(name, sectionItems);
  }
  return [...sections.entries()].map(([name, sectionItems], index) => ({
    id: `${slugify(name) || "section"}-${index}`,
    name,
    items: sectionItems
  }));
}

function mergeVendorDetailStates(
  states: Array<VendorDetailState | undefined>
): VendorDetailState | undefined {
  if (states.some((state) => state === "failed" || state === "partial")) return "partial";
  if (states.some((state) => state === "pending")) return "pending";
  if (states.every((state) => state === "ready")) return "ready";
  return states.find((state): state is VendorDetailState => Boolean(state));
}

function offerMatchesScope(offer: VendorOffer, scope: VendorCharacterScope): boolean {
  return scope.kind === "account" || offer.characterIds.includes(scope.characterId);
}

function createScopeOptions(snapshot: VendorInventorySnapshot): VendorScopeOptionWorkspace[] {
  return [
    {
      kind: "account",
      label: "账号全部",
      description: "按各角色当前机灵模组合并"
    },
    ...Object.values(snapshot.characterContexts).map((context) => ({
      kind: "character" as const,
      characterId: context.characterId,
      label: context.characterId,
      description: context.armorerModName ? `当前机灵：${context.armorerModName}` : "当前机灵：未检测到护甲师模组"
    }))
  ];
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

function buildVendorsPageModel(input: {
  vendors: VendorInventoryGroupWorkspace[];
  updatedLabel: string;
  sourceLabel: string;
  nextResetLabel: string;
  recommendationCount: number;
  verifiedItemCount: number;
}): VendorsPageModel {
  const vendors = input.vendors.map(enrichVendorViewModel);
  return {
    ...input,
    vendors,
    railSections: createVendorRailSections(vendors),
    defaultVendorId: vendors.find((vendor) => vendor.featured)?.id ?? vendors[0]?.id ?? null
  };
}

function mergeLiveVendorsWithDirectory(
  liveVendors: VendorInventoryGroupWorkspace[],
  resetLabel: string
): VendorInventoryGroupWorkspace[] {
  const directory = createLocalVendorDirectory(resetLabel);
  const usedLiveIds = new Set<string>();
  const mergedDirectory = directory.map((directoryVendor) => {
    const liveVendorIndex = liveVendors.findIndex((vendor) => isSameVendor(directoryVendor, vendor));
    if (liveVendorIndex < 0) {
      return directoryVendor;
    }

    const liveVendor = liveVendors[liveVendorIndex];
    usedLiveIds.add(liveVendor.id);
    return {
      ...directoryVendor,
      ...liveVendor,
      id: directoryVendor.id,
      name: liveVendor.name,
      category: directoryVendor.category,
      iconLabel: directoryVendor.iconLabel,
      featured: directoryVendor.featured ?? liveVendor.featured
    };
  });

  const unknownLiveVendors = liveVendors.filter((vendor) => !usedLiveIds.has(vendor.id));
  return [...mergedDirectory, ...unknownLiveVendors];
}

function mapDailyVendorItem(item: DailySummaryItem, dailySummary: DailySummary, index: number): VendorInventoryGroupWorkspace {
  const vendorName = item.title.trim();
  const source = item.source?.trim() || publicVendorSourceLabel;

  return {
    id: item.vendorHash !== undefined ? `vendor-${item.vendorHash}` : `vendor-${slugify(vendorName) || index}`,
    vendorHash: item.vendorHash,
    name: vendorName,
    description: item.subtitle?.trim() || "可确认商人库存",
    badge: "已确认",
    source,
    resetLabel: dailySummary.daily_reset.time_remaining_label,
    category: isFeaturedVendor(vendorName, item.vendorHash) ? "重点" : "已确认",
    iconLabel: getIconLabel(vendorName),
    iconUrl: normalizeBungieIconUrl(item.iconUrl ?? item.icon),
    statusLabel: "已确认",
    featured: isFeaturedVendor(vendorName, item.vendorHash),
    items: item.items?.length
      ? item.items.slice(0, 12).map((saleItem, saleIndex) => mapDailySaleItem(saleItem, vendorName, saleIndex, item.vendorHash))
      : parseInventoryDescription(item.description ?? "", vendorName, item.items !== undefined)
  };
}

function mapDailySaleItem(item: DailySummaryItem, vendorName: string, index: number, vendorHash?: number): VendorInventoryItemWorkspace {
  const itemType = item.subtitle?.trim() || inferItemType(item.title);
  const cost = item.description?.trim() || undefined;
  const tone = getInventoryTone(`${item.title} ${itemType}`);
  return {
    id: `${slugify(vendorName)}-${slugify(item.title) || index}`,
    name: item.title.trim(),
    itemType,
    summary: item.source?.trim() || "Bungie 公共商人库存",
    cost,
    iconLabel: item.iconLabel?.trim() || getIconLabel(item.title),
    iconUrl: normalizeBungieIconUrl(item.iconUrl ?? item.icon),
    costIconLabel: cost?.includes("奇异硬币") ? "◈" : "◇",
    costIconUrl: normalizeBungieIconUrl(item.costIconUrl),
    tone,
    status: isFeaturedVendor(vendorName, vendorHash) && tone === "exotic" ? "recommended" : "unknown"
  };
}

function inferItemType(value: string): string {
  return getInventoryTone(value) === "armor" ? "护甲库存" : getInventoryTone(value) === "material" ? "材料库存" : "武器库存";
}

function createLocalVendorDirectory(resetLabel: string): VendorInventoryGroupWorkspace[] {
  return [
    createDirectoryVendor({
      id: "xur",
      vendorHash: 2190858386,
      name: "周末异域商人",
      description: "周末异域商人；库存读取后展示本周售卖和价格。",
      badge: "周末",
      category: "重点",
      iconLabel: "Xû",
      featured: true,
      resetLabel,
      items: []
    }),
    createDirectoryVendor({
      id: "banshee",
      vendorHash: 672118013,
      name: "每日武器商人",
      description: "每日武器库存和声望；后续接入武器 perk 复查。",
      badge: "每日",
      category: "重点",
      iconLabel: "B4",
      resetLabel,
      items: []
    }),
    createDirectoryVendor({
      id: "ada",
      vendorHash: 3500617033,
      name: "护甲合成商人",
      description: "护甲合成和外观相关入口。",
      badge: "常驻",
      category: "重点",
      iconLabel: "A1",
      resetLabel,
      items: []
    }),
    createDirectoryVendor({
      id: "saint",
      vendorHash: 3902439767,
      name: "试炼商人",
      description: "试炼声望、周末奖励和聚焦入口。",
      badge: "周末",
      category: "周末",
      iconLabel: "S14",
      resetLabel,
      items: []
    }),
    createDirectoryVendor({
      id: "zavala",
      name: "先锋商人",
      description: "先锋声望、聚焦和周常奖励。",
      badge: "周更",
      category: "常驻",
      iconLabel: "ZV",
      resetLabel,
      items: []
    }),
    createDirectoryVendor({
      id: "shaxx",
      name: "熔炉商人",
      description: "熔炉竞技场声望和聚焦奖励。",
      badge: "周更",
      category: "常驻",
      iconLabel: "SX",
      resetLabel,
      items: []
    }),
    createDirectoryVendor({
      id: "drifter",
      name: "智谋商人",
      description: "智谋声望、聚焦和周常奖励。",
      badge: "周更",
      category: "常驻",
      iconLabel: "Dr",
      resetLabel,
      items: []
    }),
    createDirectoryVendor({
      id: "rahool",
      vendorHash: 2255782930,
      name: "记忆水晶商人",
      description: "记忆水晶解码和材料兑换。",
      badge: "常驻",
      category: "常驻",
      iconLabel: "Rh",
      resetLabel,
      items: []
    }),
    createDirectoryVendor({
      id: "tess",
      name: "外观商人",
      description: "永恒之诗外观和光尘轮换。",
      badge: "周更",
      category: "特殊 / 活动",
      iconLabel: "EV",
      resetLabel,
      items: []
    })
  ];
}

function createDirectoryVendor(input: {
  id: string;
  vendorHash?: number;
  name: string;
  description: string;
  badge: string;
  category: string;
  iconLabel: string;
  iconUrl?: string;
  resetLabel: string;
  featured?: boolean;
  items: VendorInventoryItemWorkspace[];
}): VendorInventoryGroupWorkspace {
  return {
    id: input.id,
    vendorHash: input.vendorHash,
    name: input.name,
    description: input.description,
    badge: input.badge,
    source: "本地商人目录",
    resetLabel: input.resetLabel,
    category: input.category,
    iconLabel: input.iconLabel,
    iconUrl: input.iconUrl,
    statusLabel: "等待库存读取",
    featured: input.featured,
    items: input.items
  };
}

const vendorRailSectionOrder: Array<Pick<VendorRailSectionWorkspace, "id" | "title">> = [
  { id: "featured", title: "重点库存" },
  { id: "ritual", title: "仪式声望" },
  { id: "weekend", title: "周末活动" },
  { id: "cosmetic", title: "外观 / 服务" },
  { id: "other", title: "其他商人" }
];

function createVendorRailSections(vendors: VendorInventoryGroupWorkspace[]): VendorRailSectionWorkspace[] {
  return vendorRailSectionOrder.map((section) => ({
    ...section,
    vendors: vendors.filter((vendor) => vendor.taskCategory === section.title)
  }));
}

function enrichVendorViewModel(vendor: VendorInventoryGroupWorkspace): VendorInventoryGroupWorkspace {
  const taskCategory = getVendorTaskCategory(vendor);
  const inventoryState = getVendorInventoryState(vendor);
  const displayStatusLabel = getVendorDisplayStatusLabel(vendor, inventoryState);
  const inventoryStateLabel = getVendorInventoryStateLabel(inventoryState);
  const itemCountLabel = `${countVendorSaleItems(vendor)} 件物品`;
  return {
    ...vendor,
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

function getVendorInventoryState(vendor: VendorInventoryGroupWorkspace): VendorInventoryState {
  if (countVendorSaleItems(vendor) > 0 || (vendor.rankRewards?.length ?? 0) > 0) return "loaded";
  if (vendor.source === "本地商人目录") return "not_read";
  if (vendor.statusLabel === "已确认") return "empty";
  return "unavailable";
}

function countVendorSaleItems(vendor: VendorInventoryGroupWorkspace): number {
  return vendor.items.length + (vendor.services ?? []).reduce(
    (count, service) => count + service.items.length,
    0
  );
}

function getVendorDisplayStatusLabel(vendor: VendorInventoryGroupWorkspace, inventoryState: VendorInventoryState): string {
  if (vendor.detailState === "pending") return "属性读取中";
  if (vendor.detailState === "failed") return "详情失败";
  if (vendor.detailState === "partial") return "部分详情失败";
  if (inventoryState === "not_read") return "未读取";
  if (inventoryState === "empty") return "暂无可读库存";
  if (inventoryState === "unavailable") return "无法确认";
  return vendor.statusLabel ?? vendor.badge;
}

function getVendorInventoryStateLabel(inventoryState: VendorInventoryState): string {
  if (inventoryState === "loaded") return "库存已读取";
  if (inventoryState === "empty") return "暂无可读库存";
  if (inventoryState === "not_read") return "未读取库存";
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

function parseInventoryDescription(
  description: string,
  vendorName: string,
  hasStructuredItems = false
): VendorInventoryItemWorkspace[] {
  if (hasStructuredItems || isUnreadableInventoryDescription(description)) {
    return [];
  }

  return description
    .split(/\s+\/\s+/)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry, index) => parseInventoryEntry(entry, vendorName, index));
}

function isUnreadableInventoryDescription(description: string): boolean {
  const normalized = description.trim();
  return normalized === "" || normalized === "库存名称暂不可读";
}

function parseInventoryEntry(entry: string, vendorName: string, index: number): VendorInventoryItemWorkspace {
  const match = entry.match(/^(.+?)（(.+?)）$/);
  const name = (match?.[1] ?? entry).trim();
  const detail = (match?.[2] ?? "").trim();
  const detailParts = detail.split(/[；;]/).map((part) => part.trim()).filter(Boolean);
  const cost = detailParts.length > 1 ? detailParts.at(-1) : undefined;
  const itemType = detailParts.length > 1 ? detailParts.slice(0, -1).join("，") : detail || "库存物品";
  const tone = getInventoryTone(`${name} ${itemType}`);

  return {
    id: `${slugify(vendorName)}-${slugify(name) || index}`,
    name,
    itemType,
    summary: buildItemSummary(tone),
    cost,
    iconLabel: getIconLabel(name),
    tone,
    status: tone === "exotic" ? "recommended" : "unknown"
  };
}

function getInventoryTone(text: string): VendorInventoryTone {
  if (/异域|Exotic/i.test(text)) return "exotic";
  if (/护甲|头盔|臂铠|胸甲|腿甲|职业物品|Armor|Helmet|Gauntlets|Chest|Leg/i.test(text)) return "armor";
  if (/材料|货币|赏金|模组|Material|Currency|Bounty|Mod/i.test(text)) return "material";
  return "weapon";
}

function buildItemSummary(tone: VendorInventoryTone): string {
  if (tone === "exotic") return "异域库存，建议优先检查收藏缺口和属性卷。";
  if (tone === "armor") return "护甲库存，需要结合属性和职业需求确认。";
  if (tone === "material") return "功能或材料库存，按当前资源需求处理。";
  return "武器库存，perk 价值需要结合资料库和目标规则确认。";
}

function getIconLabel(name: string): string {
  const chars = Array.from(name.trim()).filter((char) => char.trim());
  return chars.slice(0, Math.min(chars.length, 2)).join("") || "商";
}

function isFeaturedVendor(name: string, vendorHash?: number): boolean {
  if (vendorHash === 2190858386) return true;
  return /老九|仄|Xur/i.test(name);
}

function isSameVendor(left: VendorInventoryGroupWorkspace, right: VendorInventoryGroupWorkspace): boolean {
  if (left.vendorHash !== undefined && right.vendorHash !== undefined) {
    return left.vendorHash === right.vendorHash;
  }
  const leftKey = vendorMatchKey(`${left.id} ${left.name} ${left.description}`);
  const rightKey = vendorMatchKey(`${right.id} ${right.name} ${right.description}`);
  return leftKey !== "" && leftKey === rightKey;
}

function vendorMatchKey(value: string): string {
  if (/xur|仄|老九/i.test(value)) return "xur";
  if (/banshee|枪匠|班西/i.test(value)) return "banshee";
  if (/ada|艾达/i.test(value)) return "ada";
  if (/saint|试炼|圣-?14|圣人/i.test(value)) return "saint";
  if (/zavala|萨瓦拉|先锋/i.test(value)) return "zavala";
  if (/shaxx|沙克斯|熔炉/i.test(value)) return "shaxx";
  if (/drifter|浪客|智谋/i.test(value)) return "drifter";
  if (/rahool|拉乎尔|密码学家/i.test(value)) return "rahool";
  if (/tess|苔丝|eververse|永恒之诗/i.test(value)) return "tess";
  return "";
}

function normalizeBungieIconUrl(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith("data:")) return trimmed;
  if (trimmed.startsWith("/")) return `https://www.bungie.net${trimmed}`;
  return trimmed;
}

function slugify(value: string): string {
  return Array.from(value.trim())
    .map((char) => {
      if (/^[a-z0-9]$/i.test(char)) return char.toLowerCase();
      return char.codePointAt(0)?.toString(36) ?? "";
    })
    .filter(Boolean)
    .join("-");
}
