import { LibraryPage } from "../../features/library/LibraryPage";
import { useDesktopMenuSession } from "./DesktopMenuProviderContext";

export function LibraryMenuProvider() {
  const session = useDesktopMenuSession();
  const library = session.library;
  const itemDetail = session.writeActions.itemDetail;

  return (
    <LibraryPage
      cache={{
        items: library.items,
        perks: library.perks,
        libraryHistory: library.libraryHistory,
        libraryCommunityMatch: library.libraryCommunityMatch,
        liveAvailability: library.liveAvailability,
        liveAvailabilityError: library.liveAvailabilityError,
        manifestStatus: library.manifestStatus,
        manifestStatusError: library.manifestStatusError
      }}
      state={{
        libraryViewMode: library.libraryViewMode,
        equipmentFilters: library.equipmentFilters,
        perkFilters: library.perkFilters,
        equipmentSearchTouched: library.equipmentSearchTouched,
        perkSearchTouched: library.perkSearchTouched,
        isSearching: library.isSearching,
        searchError: library.searchError,
        aliasDraft: library.aliasDraft,
        aliasTargetDraft: library.aliasTargetDraft,
        aliasKind: library.aliasKind,
        aliasMessage: library.aliasMessage,
        isLoadingLiveAvailability: library.isLoadingLiveAvailability,
        isLoadingManifestStatus: library.isLoadingManifestStatus,
        isInitializingManifest: library.isInitializingManifest,
        itemDetailLoadingKey: itemDetail.itemDetailLoadingKey
      }}
      actions={{
        onViewModeChange: library.setLibraryViewMode,
        onEquipmentFiltersChange: (patch) => library.setEquipmentFilters((current) => ({ ...current, ...patch })),
        onPerkFiltersChange: (patch) => library.setPerkFilters((current) => ({ ...current, ...patch })),
        onSearch: () => void library.searchItems(),
        onClearFilters: library.clearLibraryFilters,
        onRefreshManifestStatus: () => void library.refreshManifestStatus(),
        onRepairManifest: () => void library.repairManifest(),
        onAliasDraftChange: library.setAliasDraft,
        onAliasTargetDraftChange: library.setAliasTargetDraft,
        onAliasKindChange: library.setAliasKind,
        onSaveAlias: () => void library.saveAlias(),
        onOpenItemDetail: (item) => void itemDetail.openItemDetail(item),
        onAddFavorite: (item) => void library.addSelectedItemToFavorites(item),
        onRemoveFavorite: (hash) => void library.removeFavorite(hash)
      }}
    />
  );
}
