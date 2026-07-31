import type { AccountItemSummary, AccountSummary } from "@d2-tools/core/account/summary";
import type { EquipableItemSetSummary } from "@d2-tools/core/items/equipableItemSet";
import type { ItemDefinitionVersionSummary, ItemReleaseSummary } from "@d2-tools/core/items/release";
import { formatLibraryVersion, matchesAnyKeyword, splitQueryTokens, uniqueInOrder, uniqueSorted } from "./libraryText.js";

export type AmmoTypeKey = "primary" | "special" | "heavy";
export type EquipmentGroupKey = "weapons" | "armor" | "equipment" | "other";

export type ItemSearchResult = {
  hash: number;
  name: string;
  description: string;
  icon?: string;
  item_type?: string;
  tier?: string;
  class_name?: string;
  damage_type?: string;
  is_adept?: boolean;
  origin_traits?: Array<{
    hash: number;
    name: string;
  }>;
  intrinsic_traits?: Array<{
    hash: number;
    name: string;
    description: string;
    icon?: string;
  }>;
  group_key?: EquipmentGroupKey;
  bucket_name?: string;
  ammo_type?: AmmoTypeKey;
  weapon_frame?: {
    key: string;
    name: string;
  };
  source: {
    status: "ready" | "missing";
    label: string;
    description: string;
    source_kind?: "item" | "collectible" | "linked_item" | "linked_collectible";
    source_hash?: number;
    linked_definition_hash?: number;
  };
  release?: ItemReleaseSummary;
  definition_version?: ItemDefinitionVersionSummary;
  armor_set?: EquipableItemSetSummary;
  definition_stats?: Array<{
    hash: number;
    name: string;
    value: number;
    display_maximum: number;
  }>;
  perks?: Array<{
    socket_index: number;
    plugs: Array<{
      hash: number;
      name: string;
      description: string;
      icon?: string;
    }>;
  }>;
};

export type PerkSearchResult = {
  hash: number;
  name: string;
  description: string;
  icon?: string;
  related_items?: Array<{
    hash: number;
    name: string;
    group_key?: EquipmentGroupKey;
  }>;
};

export type LibraryHistory = {
  recent: Array<{ hash: number; name: string; icon?: string; viewed_at?: string }>;
  favorites: Array<{ hash: number; name: string; icon?: string; viewed_at?: string }>;
};

export type ManifestStatus = {
  initialized: boolean;
  version?: string;
  latest_version?: string;
  needs_update?: boolean;
  checked_at?: string;
  language?: string;
  cached_at?: string;
  item_count?: number;
  perk_count?: number;
  relation_count?: number;
  missing_required_components?: string[];
};

export type LiveItemAvailability = {
  account_scope: "public" | "character";
  items: Record<string, LiveItemAvailabilityEntry>;
};

export type LiveItemAvailabilityEntry = {
  status: "character_vendor" | "public_vendor" | "public_activity" | "manifest_only" | "unknown";
  label: string;
  description: string;
  sources: Array<{
    kind: "character_vendor" | "public_vendor" | "public_activity";
    label: string;
    character_id?: string;
  }>;
};

export type VaultItemMatchInfo = {
  matched?: number;
  available?: number;
  modes?: string[];
  source_label?: string;
  sample_perks?: Array<{
    name: string;
    englishName?: string;
  }>;
};

export type LibraryViewMode = "equipment" | "perks";
export type LibraryEquipmentGroupFilter = EquipmentGroupKey | "all";
export type LibraryRelatedItemsFilter = "all" | "yes" | "no";
export type LibrarySourceStatusFilter = ItemSearchResult["source"]["status"] | "all";
export type LibraryPerkPoolFilter = "all" | "yes" | "no";
export type LibraryDropAccessKey = "available" | "rotation" | "archived" | "unknown";
export type LibraryDropAccessFilter = LibraryDropAccessKey | "all";
export type LibraryAcquisitionStatus = "current" | "historical" | "unknown";

export type LibraryOwnershipEntry = {
  status: "owned" | "not_owned" | "unavailable";
  totalCount: number;
  vaultCount: number;
  locations: Array<{
    kind: "vault" | "equipped" | "inventory" | "postmaster";
    label: string;
    count: number;
    characterId?: string;
  }>;
};

export type LibraryEquipmentFilter = {
  query: string;
  group: LibraryEquipmentGroupFilter;
  ownership?: "all" | "owned" | "definition";
  tier: string;
  bucket: string;
  ammo: AmmoTypeKey | "all";
  frame: string[];
  sourceStatus: LibrarySourceStatusFilter;
  perkPool: LibraryPerkPoolFilter;
  dropAccess: LibraryDropAccessFilter;
  perkQuery: string;
};

export type LibraryPerkFilter = {
  query: string;
  relatedGroup: LibraryEquipmentGroupFilter;
  hasRelatedItems: LibraryRelatedItemsFilter;
};

export type LibraryFilterOption = {
  value: string;
  label: string;
};

export type LibraryEquipmentFilterOptions = {
  groups: LibraryFilterOption[];
  tiers: LibraryFilterOption[];
  buckets: LibraryFilterOption[];
  ammo: LibraryFilterOption[];
  frames: LibraryFilterOption[];
};

export type LibraryDropQueryGroup = {
  key: LibraryDropAccessKey;
  label: string;
  description: string;
  items: ItemSearchResult[];
};

export type LibraryPageCache = {
  items: ItemSearchResult[];
  perks: PerkSearchResult[];
  libraryHistory: LibraryHistory;
  libraryCommunityMatch: Map<number, VaultItemMatchInfo>;
  liveAvailability: LiveItemAvailability | null;
  liveAvailabilityError: string;
  manifestStatus: ManifestStatus | null;
  manifestStatusError: string;
  accountSummary?: AccountSummary | null;
};

export type LibraryPageState = {
  libraryViewMode: LibraryViewMode;
  equipmentFilters: LibraryEquipmentFilter;
  perkFilters: LibraryPerkFilter;
  equipmentSearchTouched: boolean;
  perkSearchTouched: boolean;
  isSearching: boolean;
  searchError: string;
  aliasDraft: string;
  aliasTargetDraft: string;
  aliasKind: "item" | "perk";
  aliasMessage: string;
  isLoadingLiveAvailability: boolean;
  isLoadingManifestStatus: boolean;
  isInitializingManifest: boolean;
  itemDetailLoadingKey: string;
};

export type LibraryManifestAlertModel = {
  kind: "error" | "loading" | "not_initialized" | "missing_components" | "needs_update";
  className: "status-error" | "status-pending" | "status-warning";
  error?: string;
  missingComponentCount?: number;
  version?: string;
  latestVersion?: string;
};

export type LibraryEquipmentResultView = {
  item: ItemSearchResult;
  dropAccess: LibraryDropAccessKey;
  communityMatch?: VaultItemMatchInfo;
  liveEntry?: LiveItemAvailabilityEntry;
  acquisitionStatus: LibraryAcquisitionStatus;
  ownership: LibraryOwnershipEntry;
  isFavorite: boolean;
  isDetailLoading: boolean;
};

export type LibraryDefinitionDetailView = Pick<
  LibraryEquipmentResultView,
  "item" | "dropAccess" | "communityMatch" | "liveEntry" | "acquisitionStatus" | "ownership"
>;

export type LibraryEquipmentResultGroupView = {
  key: LibraryDropAccessKey;
  items: LibraryEquipmentResultView[];
};

export type LibraryPerkResultView = {
  perk: PerkSearchResult;
  relatedGroupKeys: EquipmentGroupKey[];
  relatedItemNames: string[];
  hasRelatedItems: boolean;
};

export type LibraryPageModel = {
  manifestSummary: {
    initialized: boolean | null;
    version?: string;
    latestVersion?: string;
    activatedAt?: string;
    checkedAt?: string;
    language?: string;
    itemCount?: number;
    perkCount?: number;
    relationCount?: number;
    needsUpdate: boolean;
    missingComponentCount: number;
    statusError: string;
  };
  queryPanel: {
    viewMode: LibraryViewMode;
    primaryQuery: string;
    isManifestBlocked: boolean;
    equipmentFilters: LibraryEquipmentFilter;
    perkFilters: LibraryPerkFilter;
    equipmentFilterOptions: LibraryEquipmentFilterOptions;
    perkGroupOptions: LibraryFilterOption[];
  };
  results: {
    mode: LibraryViewMode;
    hitCount: number;
    searchTouched: boolean;
    equipmentGroups: LibraryEquipmentResultGroupView[];
    perks: LibraryPerkResultView[];
  };
  stats: {
    dropQuery: {
      total: number;
      sourced: number;
      perkPools: number;
    };
    live: {
      scope: LiveItemAvailability["account_scope"] | "none";
      characterVendor: number;
      publicVendor: number;
      publicActivity: number;
    };
  };
  aliasPanel: {
    draft: string;
    targetDraft: string;
    kind: "item" | "perk";
    message: string;
    history: LibraryHistory;
  };
  status: {
    isSearching: boolean;
    searchError: string;
    liveAvailabilityError: string;
    isLoadingLiveAvailability: boolean;
    isLoadingManifestStatus: boolean;
    isInitializingManifest: boolean;
    manifestVersionDate?: string;
  };
  manifestAlert: LibraryManifestAlertModel | null;
  emptyState: { kind: "not_searched" | "no_results" } | null;
};

const groupLabels: Record<LibraryEquipmentGroupFilter, string> = {
  all: "全部分类",
  weapons: "武器",
  armor: "护甲",
  equipment: "装备",
  other: "其他"
};

const groupOrder: LibraryEquipmentGroupFilter[] = ["all", "weapons", "armor", "equipment", "other"];

const ammoLabels: Record<AmmoTypeKey, string> = {
  primary: "主弹",
  special: "特殊",
  heavy: "重弹"
};

const ammoOrder: AmmoTypeKey[] = ["primary", "special", "heavy"];

export const defaultLibraryEquipmentFilter: LibraryEquipmentFilter = {
  query: "",
  group: "all",
  ownership: "all",
  tier: "all",
  bucket: "all",
  ammo: "all",
  frame: [],
  sourceStatus: "all",
  perkPool: "all",
  dropAccess: "all",
  perkQuery: ""
};

export const defaultLibraryPerkFilter: LibraryPerkFilter = {
  query: "",
  relatedGroup: "all",
  hasRelatedItems: "all"
};

export function selectLibraryPageModel(cache: LibraryPageCache, state: LibraryPageState): LibraryPageModel {
  const ownership = buildLibraryOwnership(cache.accountSummary);
  const visibleItems = filterLibraryEquipmentItems(cache.items, state.equipmentFilters, ownership);
  const visiblePerks = filterLibraryPerks(cache.perks, state.perkFilters);
  const mode = state.libraryViewMode;
  const searchTouched = mode === "equipment" ? state.equipmentSearchTouched : state.perkSearchTouched;
  const hitCount = mode === "equipment" ? visibleItems.length : visiblePerks.length;

  return {
    manifestSummary: {
      initialized: cache.manifestStatus?.initialized ?? null,
      version: cache.manifestStatus?.version,
      latestVersion: cache.manifestStatus?.latest_version,
      activatedAt: cache.manifestStatus?.cached_at,
      checkedAt: cache.manifestStatus?.checked_at,
      language: cache.manifestStatus?.language,
      itemCount: cache.manifestStatus?.item_count,
      perkCount: cache.manifestStatus?.perk_count,
      relationCount: cache.manifestStatus?.relation_count,
      needsUpdate: Boolean(cache.manifestStatus?.needs_update),
      missingComponentCount: cache.manifestStatus?.missing_required_components?.length ?? 0,
      statusError: cache.manifestStatusError
    },
    queryPanel: {
      viewMode: mode,
      primaryQuery: mode === "equipment" ? state.equipmentFilters.query : state.perkFilters.query,
      isManifestBlocked: isManifestBlocked(cache.manifestStatus),
      equipmentFilters: state.equipmentFilters,
      perkFilters: state.perkFilters,
      equipmentFilterOptions: buildLibraryEquipmentFilterOptions(cache.items),
      perkGroupOptions: buildLibraryPerkGroupOptions(cache.perks)
    },
    results: {
      mode,
      hitCount,
      searchTouched,
      equipmentGroups: buildEquipmentResultGroups({
        visibleItems,
        history: cache.libraryHistory,
        communityMatch: cache.libraryCommunityMatch,
        liveAvailability: cache.liveAvailability,
        ownership,
        ownershipAvailable: Boolean(cache.accountSummary),
        itemDetailLoadingKey: state.itemDetailLoadingKey
      }),
      perks: visiblePerks.map((perk) => createPerkResultView(perk))
    },
    stats: {
      dropQuery: {
        total: visibleItems.length,
        sourced: visibleItems.filter((item) => item.source.status === "ready").length,
        perkPools: visibleItems.filter((item) => hasDisplayablePerkPool(item)).length
      },
      live: buildLiveAvailabilityStats(cache.liveAvailability, visibleItems)
    },
    aliasPanel: {
      draft: state.aliasDraft,
      targetDraft: state.aliasTargetDraft,
      kind: state.aliasKind,
      message: state.aliasMessage,
      history: cache.libraryHistory
    },
    status: {
      isSearching: state.isSearching,
      searchError: state.searchError,
      liveAvailabilityError: cache.liveAvailabilityError,
      isLoadingLiveAvailability: state.isLoadingLiveAvailability,
      isLoadingManifestStatus: state.isLoadingManifestStatus,
      isInitializingManifest: state.isInitializingManifest,
      manifestVersionDate: formatLibraryVersion(cache.manifestStatus?.version)
    },
    manifestAlert: buildManifestAlertModel(cache.manifestStatus, cache.manifestStatusError, state.isLoadingManifestStatus),
    emptyState: selectLibraryEmptyState({ searchTouched, isSearching: state.isSearching, searchError: state.searchError, hitCount })
  };
}

export function filterLibraryEquipmentItems(
  items: ItemSearchResult[],
  filter: LibraryEquipmentFilter,
  ownership: Map<number, LibraryOwnershipEntry> = new Map()
): ItemSearchResult[] {
  const query = filter.query.trim().toLocaleLowerCase();
  const ownershipFilter = filter.ownership ?? "all";
  const sourceStatus = filter.sourceStatus ?? "all";
  const perkPool = filter.perkPool ?? "all";
  const dropAccess = filter.dropAccess ?? "all";
  const perkTokens = splitQueryTokens(filter.perkQuery ?? "");

  return items.filter((item) => {
    if (filter.group !== "all" && item.group_key !== filter.group) return false;
    if (ownershipFilter === "owned" && ownership.get(item.hash)?.status !== "owned") return false;
    if (ownershipFilter === "definition" && ownership.get(item.hash)?.status === "owned") return false;
    if (filter.tier !== "all" && item.tier !== filter.tier) return false;
    if (filter.bucket !== "all" && item.bucket_name !== filter.bucket) return false;
    if (filter.ammo !== "all" && item.ammo_type !== filter.ammo) return false;
    if (filter.frame.length && !filter.frame.includes(item.weapon_frame?.key ?? "")) return false;
    if (sourceStatus !== "all" && item.source.status !== sourceStatus) return false;
    if (perkPool === "yes" && !hasDisplayablePerkPool(item)) return false;
    if (perkPool === "no" && hasDisplayablePerkPool(item)) return false;
    if (dropAccess !== "all" && classifyLibraryDropAccess(item) !== dropAccess) return false;
    if (perkTokens.length && !matchesPerkQuery(item, perkTokens)) return false;
    if (!query) return true;

    return [
      item.name,
      item.description,
      item.item_type,
      item.tier,
      item.bucket_name,
      item.weapon_frame?.name,
      item.source.description,
      ...(item.perks ?? []).flatMap((group) => group.plugs.map((plug) => plug.name))
    ]
      .filter(Boolean)
      .some((value) => value?.toLocaleLowerCase().includes(query));
  });
}

export function classifyLibraryDropAccess(item: ItemSearchResult): LibraryDropAccessKey {
  if (item.source.status !== "ready") {
    return "unknown";
  }

  const sourceText = item.source.description.toLocaleLowerCase();
  if (matchesAnyKeyword(sourceText, archivedSourceKeywords)) {
    return "archived";
  }
  if (matchesAnyKeyword(sourceText, rotationSourceKeywords)) {
    return "rotation";
  }
  return "available";
}

export function groupLibraryDropQueryItems(items: ItemSearchResult[]): LibraryDropQueryGroup[] {
  const groupMap: Record<LibraryDropAccessKey, ItemSearchResult[]> = {
    available: [],
    rotation: [],
    archived: [],
    unknown: []
  };

  for (const item of items) {
    groupMap[classifyLibraryDropAccess(item)].push(item);
  }

  return dropAccessGroups
    .map((group) => ({ ...group, items: groupMap[group.key] }))
    .filter((group) => group.items.length);
}

export function filterLibraryPerks(perks: PerkSearchResult[], filter: LibraryPerkFilter): PerkSearchResult[] {
  const query = filter.query.trim().toLocaleLowerCase();

  return perks.filter((perk) => {
    const relatedItems = perk.related_items ?? [];
    if (filter.hasRelatedItems === "yes" && !relatedItems.length) return false;
    if (filter.hasRelatedItems === "no" && relatedItems.length) return false;
    if (filter.relatedGroup !== "all" && !relatedItems.some((item) => item.group_key === filter.relatedGroup)) {
      return false;
    }
    if (!query) return true;

    return [
      perk.name,
      perk.description,
      ...relatedItems.map((item) => item.name)
    ]
      .filter(Boolean)
      .some((value) => value?.toLocaleLowerCase().includes(query));
  });
}

export function buildLibraryEquipmentFilterOptions(items: ItemSearchResult[]): LibraryEquipmentFilterOptions {
  const groups = groupOrder
    .filter((group) => group === "all" || items.some((item) => item.group_key === group))
    .map((group) => ({ value: group, label: groupLabels[group] }));

  return {
    groups,
    tiers: [
      { value: "all", label: "全部稀有度" },
      ...uniqueSorted(items.map((item) => item.tier)).map((value) => ({ value, label: value }))
    ],
    buckets: [
      { value: "all", label: "全部位置" },
      ...uniqueInOrder(items.map((item) => item.bucket_name)).map((value) => ({ value, label: value }))
    ],
    ammo: [
      { value: "all", label: "全部弹药" },
      ...ammoOrder
        .filter((ammo) => items.some((item) => item.ammo_type === ammo))
        .map((value) => ({ value, label: ammoLabels[value] }))
    ],
    frames: [
      { value: "all", label: "全部框架" },
      ...uniqueInOrder(items.map((item) => item.weapon_frame?.key))
        .map((value) => ({
          value,
          label: items.find((item) => item.weapon_frame?.key === value)?.weapon_frame?.name ?? value
        }))
    ]
  };
}

export function buildLibraryPerkGroupOptions(perks: PerkSearchResult[]): LibraryFilterOption[] {
  const presentGroups = new Set<EquipmentGroupKey>();

  for (const perk of perks) {
    for (const item of perk.related_items ?? []) {
      if (item.group_key) {
        presentGroups.add(item.group_key);
      }
    }
  }

  return groupOrder
    .filter((group): group is LibraryEquipmentGroupFilter => group === "all" || presentGroups.has(group))
    .map((group) => ({ value: group, label: groupLabels[group] }));
}

export { formatLibraryVersion };

function buildEquipmentResultGroups(input: {
  visibleItems: ItemSearchResult[];
  history: LibraryHistory;
  communityMatch: Map<number, VaultItemMatchInfo>;
  liveAvailability: LiveItemAvailability | null;
  ownership: Map<number, LibraryOwnershipEntry>;
  ownershipAvailable: boolean;
  itemDetailLoadingKey: string;
}): LibraryEquipmentResultGroupView[] {
  return groupLibraryDropQueryItems(input.visibleItems).map((group) => ({
    key: group.key,
    items: group.items.map((item) => ({
      ...buildLibraryDefinitionDetailView({
        item,
        liveEntry: input.liveAvailability?.items[String(item.hash)],
        communityMatch: input.communityMatch.get(item.hash),
        ownership: input.ownership.get(item.hash),
        ownershipAvailable: input.ownershipAvailable
      }),
      isFavorite: input.history.favorites.some((favorite) => favorite.hash === item.hash),
      isDetailLoading: getItemKey(item) === input.itemDetailLoadingKey
    }))
  }));
}

export function buildLibraryDefinitionDetailView(input: {
  item: ItemSearchResult;
  liveEntry?: LiveItemAvailabilityEntry;
  communityMatch?: VaultItemMatchInfo;
  ownership?: LibraryOwnershipEntry;
  ownershipAvailable: boolean;
}): LibraryDefinitionDetailView {
  return {
    item: input.item,
    dropAccess: classifyLibraryDropAccess(input.item),
    communityMatch: input.communityMatch,
    liveEntry: input.liveEntry,
    acquisitionStatus: classifyLibraryAcquisitionStatus(input.item, input.liveEntry),
    ownership: input.ownership ?? {
      status: input.ownershipAvailable ? "not_owned" : "unavailable",
      totalCount: 0,
      vaultCount: 0,
      locations: []
    }
  };
}

export function mergeLibraryVendorSourcePaths<T extends LiveItemAvailability>(
  availability: T,
  sourcePaths: Map<number, string[]> | undefined
): T {
  if (!sourcePaths?.size) return availability;
  const items = { ...availability.items };
  for (const [itemHash, paths] of sourcePaths) {
    const entry = items[String(itemHash)];
    if (!entry || !paths.length) continue;
    const characterId = entry.sources.find((source) => source.kind === "character_vendor")?.character_id;
    items[String(itemHash)] = {
      ...entry,
      status: "character_vendor",
      label: "当前商人售卖",
      description: paths.join("；"),
      sources: [
        ...entry.sources.filter((source) => source.kind !== "character_vendor" && source.kind !== "public_vendor"),
        ...paths.map((label) => ({
          kind: "character_vendor" as const,
          label,
          ...(characterId ? { character_id: characterId } : {})
        }))
      ]
    };
  }
  return { ...availability, items, account_scope: "character" } as T;
}

export function buildLibraryVendorLiveEntry(
  paths: string[],
  characterId?: string
): LiveItemAvailabilityEntry | undefined {
  const normalizedPaths = [...new Set(paths.map((path) => path.trim()).filter(Boolean))];
  if (!normalizedPaths.length) return undefined;
  return {
    status: "character_vendor",
    label: "当前商人售卖",
    description: normalizedPaths.join("；"),
    sources: normalizedPaths.map((label) => ({
      kind: "character_vendor",
      label,
      ...(characterId ? { character_id: characterId } : {})
    }))
  };
}

export function buildLibraryOwnership(account: AccountSummary | null | undefined): Map<number, LibraryOwnershipEntry> {
  const ownership = new Map<number, LibraryOwnershipEntry>();
  if (!account) return ownership;

  addOwnedItems(ownership, account.vault.items, { kind: "vault", label: "仓库" });
  for (const character of account.characters) {
    addOwnedItems(ownership, character.equipped_items, {
      kind: "equipped",
      label: `${character.class_name}已装备`,
      characterId: character.character_id
    });
    addOwnedItems(ownership, character.inventory_items, {
      kind: "inventory",
      label: `${character.class_name}背包`,
      characterId: character.character_id
    });
    addOwnedItems(ownership, character.postmaster_items, {
      kind: "postmaster",
      label: `${character.class_name}邮政官`,
      characterId: character.character_id
    });
  }
  return ownership;
}

export function classifyLibraryAcquisitionStatus(
  item: ItemSearchResult,
  liveEntry: LiveItemAvailabilityEntry | undefined
): LibraryAcquisitionStatus {
  if (
    liveEntry?.status === "character_vendor"
    || liveEntry?.status === "public_vendor"
    || liveEntry?.status === "public_activity"
  ) return "current";
  if (item.source.status === "ready") return "historical";
  return "unknown";
}

function addOwnedItems(
  ownership: Map<number, LibraryOwnershipEntry>,
  items: AccountItemSummary[],
  location: Omit<LibraryOwnershipEntry["locations"][number], "count">
): void {
  const counts = new Map<number, number>();
  for (const item of items) counts.set(item.hash, (counts.get(item.hash) ?? 0) + 1);
  for (const [hash, count] of counts) {
    const entry = ownership.get(hash) ?? {
      status: "owned" as const,
      totalCount: 0,
      vaultCount: 0,
      locations: []
    };
    entry.totalCount += count;
    if (location.kind === "vault") entry.vaultCount += count;
    entry.locations.push({ ...location, count });
    ownership.set(hash, entry);
  }
}

function createPerkResultView(perk: PerkSearchResult): LibraryPerkResultView {
  const relatedItems = perk.related_items ?? [];
  return {
    perk,
    relatedGroupKeys: [...new Set(relatedItems.map((item) => item.group_key).filter((group): group is EquipmentGroupKey => Boolean(group)))],
    relatedItemNames: relatedItems.map((item) => item.name),
    hasRelatedItems: relatedItems.length > 0
  };
}

function buildManifestAlertModel(
  status: ManifestStatus | null,
  error: string,
  isLoading: boolean
): LibraryManifestAlertModel | null {
  if (error) {
    return { kind: "error", className: "status-error", error };
  }
  if (isLoading && !status) {
    return { kind: "loading", className: "status-pending" };
  }
  if (!status) {
    return null;
  }
  const missingComponents = status.missing_required_components ?? [];
  if (!status.initialized) {
    return { kind: "not_initialized", className: "status-warning" };
  }
  if (missingComponents.length) {
    return {
      kind: "missing_components",
      className: "status-warning",
      missingComponentCount: missingComponents.length
    };
  }
  if (status.needs_update) {
    return {
      kind: "needs_update",
      className: "status-warning",
      version: status.version,
      latestVersion: status.latest_version
    };
  }
  return null;
}

function isManifestBlocked(status: ManifestStatus | null): boolean {
  return Boolean(status && (!status.initialized || status.missing_required_components?.length));
}

function selectLibraryEmptyState(input: {
  searchTouched: boolean;
  isSearching: boolean;
  searchError: string;
  hitCount: number;
}): LibraryPageModel["emptyState"] {
  if (!input.searchTouched && !input.isSearching && !input.searchError) {
    return { kind: "not_searched" };
  }
  if (input.searchTouched && !input.isSearching && !input.searchError && !input.hitCount) {
    return { kind: "no_results" };
  }
  return null;
}

function buildLiveAvailabilityStats(
  liveAvailability: LiveItemAvailability | null,
  visibleItems: ItemSearchResult[]
): LibraryPageModel["stats"]["live"] {
  const visibleHashes = new Set(visibleItems.map((item) => String(item.hash)));
  const entries = Object.entries(liveAvailability?.items ?? {})
    .filter(([hash]) => visibleHashes.has(hash))
    .map(([, entry]) => entry);

  return {
    scope: liveAvailability?.account_scope ?? "none",
    characterVendor: entries.filter((entry) => entry.status === "character_vendor").length,
    publicVendor: entries.filter((entry) => entry.status === "public_vendor").length,
    publicActivity: entries.filter((entry) => entry.status === "public_activity").length
  };
}

function getItemKey(item: ItemSearchResult): string {
  const possibleInstanceItem = item as ItemSearchResult & { instance_id?: unknown };
  return typeof possibleInstanceItem.instance_id === "string" && possibleInstanceItem.instance_id
    ? possibleInstanceItem.instance_id
    : `hash:${item.hash}`;
}

const rotationSourceKeywords = [
  "rotation",
  "rotator",
  "iron banner",
  "trials",
  "nightfall",
  "grandmaster",
  "weekly",
  "轮换",
  "每周",
  "铁旗",
  "试炼",
  "夜幕",
  "宗师",
  "活动期间"
];

const archivedSourceKeywords = [
  "no longer",
  "unavailable",
  "legacy",
  "archive",
  "sunset",
  "已下架",
  "不再",
  "不可获取",
  "纪念碑",
  "传承"
];

const dropAccessGroups: Array<Omit<LibraryDropQueryGroup, "items">> = [
  {
    key: "available",
    label: "来源可确认",
    description: "来源字段可确认，但不等同于当前在线可刷；实时活动或商人轮换接入前只作为刷取线索。"
  },
  {
    key: "rotation",
    label: "等轮换",
    description: "来源说明包含铁旗、试炼、夜幕、每周或轮换类线索，需要结合当前轮换复查。"
  },
  {
    key: "archived",
    label: "已下架或待确认",
    description: "来源说明显示不可获取、传承或下架状态。"
  },
  {
    key: "unknown",
    label: "来源待补",
    description: "资料库暂未提供可确认来源。"
  }
];

function hasDisplayablePerkPool(item: ItemSearchResult): boolean {
  return item.perks?.some((group) => group.plugs.length) ?? false;
}

function matchesPerkQuery(item: ItemSearchResult, perkTokens: string[]): boolean {
  const perkNames = (item.perks ?? [])
    .flatMap((group) => group.plugs)
    .map((plug) => plug.name.toLocaleLowerCase())
    .join(" ");

  return perkTokens.every((token) => perkNames.includes(token));
}
