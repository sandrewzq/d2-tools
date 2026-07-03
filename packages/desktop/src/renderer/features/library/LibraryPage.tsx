import { LibraryPageContentView } from "@d2-tools/ui";
import type {
  ItemSearchResult,
  LibraryHistory,
  LiveItemAvailability,
  ManifestStatus,
  PerkSearchResult,
  VaultItemMatchInfo
} from "../../api/types";
import type {
  LibraryEquipmentFilter,
  LibraryPerkFilter,
  LibraryViewMode
} from "../../utils/libraryFilters";

export function LibraryPage(props: {
  libraryViewMode: LibraryViewMode;
  items: ItemSearchResult[];
  perks: PerkSearchResult[];
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
  libraryHistory: LibraryHistory;
  libraryCommunityMatch: Map<number, VaultItemMatchInfo>;
  liveAvailability: LiveItemAvailability | null;
  liveAvailabilityError: string;
  isLoadingLiveAvailability: boolean;
  manifestStatus: ManifestStatus | null;
  manifestStatusError: string;
  isLoadingManifestStatus: boolean;
  isInitializingManifest: boolean;
  itemDetailLoadingKey: string;
  onViewModeChange: (mode: LibraryViewMode) => void;
  onEquipmentFiltersChange: (patch: Partial<LibraryEquipmentFilter>) => void;
  onPerkFiltersChange: (patch: Partial<LibraryPerkFilter>) => void;
  onSearch: () => void;
  onClearFilters: () => void;
  onRefreshManifestStatus: () => void;
  onInitializeManifest: () => void;
  onAliasDraftChange: (value: string) => void;
  onAliasTargetDraftChange: (value: string) => void;
  onAliasKindChange: (kind: "item" | "perk") => void;
  onSaveAlias: () => void;
  onOpenItemDetail: (item: ItemSearchResult) => void;
  onAddFavorite: (item: ItemSearchResult | PerkSearchResult) => void;
  onRemoveFavorite: (hash: number) => void;
}) {
  return <LibraryPageContentView {...props} showInternalHeading={false} />;
}
