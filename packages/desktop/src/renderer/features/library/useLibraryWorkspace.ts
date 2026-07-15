import { useEffect, useState } from "react";
import { mergeLibraryVendorSourcePaths } from "@d2-tools/app/library";
import {
  api } from "../../api/client";
import type { ItemSearchResult, LibraryHistory, LiveItemAvailability, PerkSearchResult, VaultItemMatchInfo } from "../../api/types";
import { useManifestStatus } from "../../shared/hooks/useManifestStatus";
import {
  defaultLibraryEquipmentFilter,
  defaultLibraryPerkFilter,
  type LibraryEquipmentFilter,
  type LibraryPerkFilter,
  type LibraryViewMode
} from "../../utils/libraryFilters";

export function useLibraryWorkspace(input: { vendorSourcePaths?: Map<number, string[]> } = {}) {
  const [libraryViewMode, setLibraryViewMode] = useState<LibraryViewMode>("equipment");
  const [items, setItems] = useState<ItemSearchResult[]>([]);
  const [perks, setPerks] = useState<PerkSearchResult[]>([]);
  const [equipmentFilters, setEquipmentFilters] = useState<LibraryEquipmentFilter>(defaultLibraryEquipmentFilter);
  const [perkFilters, setPerkFilters] = useState<LibraryPerkFilter>(defaultLibraryPerkFilter);
  const [equipmentSearchTouched, setEquipmentSearchTouched] = useState(false);
  const [perkSearchTouched, setPerkSearchTouched] = useState(false);
  const [libraryHistory, setLibraryHistory] = useState<LibraryHistory>({ recent: [], favorites: [] });
  const [aliasDraft, setAliasDraft] = useState("");
  const [aliasTargetDraft, setAliasTargetDraft] = useState("");
  const [aliasKind, setAliasKind] = useState<"item" | "perk">("item");
  const [aliasMessage, setAliasMessage] = useState("");
  const [searchError, setSearchError] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [libraryCommunityMatch, setLibraryCommunityMatch] = useState<Map<number, VaultItemMatchInfo>>(new Map());
  const [liveAvailability, setLiveAvailability] = useState<LiveItemAvailability | null>(null);
  const [liveAvailabilityError, setLiveAvailabilityError] = useState("");
  const [isLoadingLiveAvailability, setIsLoadingLiveAvailability] = useState(false);
  const manifestStatusState = useManifestStatus();

  useEffect(() => {
    if (libraryViewMode !== "equipment" || !items.length) {
      setLibraryCommunityMatch(new Map());
      return;
    }
    const uniqueHashes = [...new Set(items.map((item) => item.hash))];
    const inputs = uniqueHashes.map((hash) => ({ hash, socket_plugs: undefined }));
    api.matchCommunityVaultItems(inputs)
      .then((result) => {
        const map = new Map<number, VaultItemMatchInfo>();
        for (const item of result) {
          map.set(item.hash, {
            matched: item.matched,
            available: item.available,
            modes: item.modes,
            sample_perks: item.sample_perks,
            source_label: item.source_label
          });
        }
        setLibraryCommunityMatch(map);
      })
      .catch((error) => {
        console.warn("资料库社区推荐匹配失败：", error);
      });
  }, [libraryViewMode, items]);

  useEffect(() => {
    if (libraryViewMode !== "equipment" || !items.length) {
      setLiveAvailability(null);
      setLiveAvailabilityError("");
      setIsLoadingLiveAvailability(false);
      return;
    }

    let cancelled = false;
    const uniqueHashes = [...new Set(items.map((item) => item.hash))];
    setIsLoadingLiveAvailability(true);
    setLiveAvailabilityError("");

    api.getLiveItemAvailability(uniqueHashes)
      .then((result) => {
        if (cancelled) return;
        setLiveAvailability(mergeLibraryVendorSourcePaths(result, input.vendorSourcePaths));
      })
      .catch((error) => {
        if (cancelled) return;
        setLiveAvailability(buildVendorPathAvailability(uniqueHashes, input.vendorSourcePaths));
        setLiveAvailabilityError(error instanceof Error ? error.message : "实时状态查询失败");
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoadingLiveAvailability(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [input.vendorSourcePaths, libraryViewMode, items]);

  async function loadLibraryHistory() {
    try {
      setLibraryHistory(await api.getLibraryHistory());
    } catch {
      setLibraryHistory({ recent: [], favorites: [] });
    }
  }

  async function searchItems() {
    setIsSearching(true);
    setSearchError("");
    if (libraryViewMode === "perks") {
      setPerkSearchTouched(true);
    } else {
      setEquipmentSearchTouched(true);
    }

    const activeQuery = libraryViewMode === "perks"
      ? perkFilters.query
      : equipmentFilters.query;

    try {
      if (libraryViewMode === "perks") {
        setPerks(await api.searchPerks(activeQuery));
        setItems([]);
      } else {
        setItems(await api.searchItems(activeQuery));
        setPerks([]);
      }
    } catch (error) {
      setSearchError(error instanceof Error ? error.message : "搜索失败");
      setItems([]);
      setPerks([]);
    } finally {
      setIsSearching(false);
    }
  }

  async function saveAlias() {
    setAliasMessage("");
    setSearchError("");
    try {
      await api.saveItemAlias({
        alias: aliasDraft,
        target: aliasTargetDraft,
        kind: aliasKind
      });
      setAliasDraft("");
      setAliasTargetDraft("");
      setAliasMessage("别名已保存，下次搜索会自动命中。");
    } catch (error) {
      setSearchError(error instanceof Error ? error.message : "别名保存失败");
    }
  }

  async function addSelectedItemToFavorites(item: ItemSearchResult | PerkSearchResult) {
    try {
      setLibraryHistory(await api.addFavoriteItem({ hash: item.hash, name: item.name, icon: item.icon }));
    } catch (error) {
      setSearchError(error instanceof Error ? error.message : "收藏失败");
    }
  }

  async function removeFavorite(hash: number) {
    try {
      setLibraryHistory(await api.removeFavoriteItem(hash));
    } catch (error) {
      setSearchError(error instanceof Error ? error.message : "取消收藏失败");
    }
  }

  function clearLibraryFilters() {
    if (libraryViewMode === "equipment") {
      setEquipmentFilters(defaultLibraryEquipmentFilter);
      setItems([]);
      setLiveAvailability(null);
      setLiveAvailabilityError("");
      setEquipmentSearchTouched(false);
    } else {
      setPerkFilters(defaultLibraryPerkFilter);
      setPerks([]);
      setPerkSearchTouched(false);
    }
  }

  return {
    addSelectedItemToFavorites,
    aliasDraft,
    aliasKind,
    aliasMessage,
    aliasTargetDraft,
    clearLibraryFilters,
    equipmentFilters,
    equipmentSearchTouched,
    isLoadingLiveAvailability,
    isLoadingManifestStatus: manifestStatusState.isLoadingManifestStatus,
    isInitializingManifest: manifestStatusState.isInitializingManifest,
    isSearching,
    items,
    libraryCommunityMatch,
    libraryHistory,
    libraryViewMode,
    liveAvailability,
    liveAvailabilityError,
    loadLibraryHistory,
    initializeManifest: manifestStatusState.initializeManifest,
    manifestStatus: manifestStatusState.manifestStatus,
    manifestStatusError: manifestStatusState.manifestStatusError,
    perkFilters,
    perkSearchTouched,
    perks,
    removeFavorite,
    refreshManifestStatus: manifestStatusState.refreshManifestStatus,
    repairManifest: manifestStatusState.repairManifest,
    saveAlias,
    searchError,
    searchItems,
    setAliasDraft,
    setAliasKind,
    setAliasTargetDraft,
    setEquipmentFilters,
    setLibraryHistory,
    setLibraryViewMode,
    setPerkFilters
  };
}

function buildVendorPathAvailability(
  itemHashes: number[],
  sourcePaths: Map<number, string[]> | undefined
): LiveItemAvailability | null {
  if (!sourcePaths?.size) return null;
  const items = Object.fromEntries(itemHashes.map((hash) => {
    const paths = sourcePaths.get(hash) ?? [];
    return [String(hash), paths.length ? {
      hash,
      status: "character_vendor" as const,
      label: "当前商人售卖",
      description: paths.join("；"),
      sources: paths.map((label) => ({ kind: "character_vendor" as const, label }))
    } : {
      hash,
      status: "manifest_only" as const,
      label: "未发现当前公开入口",
      description: "当前只保留资料库来源线索。",
      sources: []
    }];
  }));
  return {
    checked_at: new Date().toISOString(),
    items,
    milestone_clues: [],
    account_scope: "character"
  };
}
