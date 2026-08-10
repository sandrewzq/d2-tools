import { selectVaultPageModel } from "@d2-tools/app/vault";
import { ControlButton, ProductWorkspaceEmptyState, VaultPageContentView } from "@d2-tools/ui";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { LoadoutTemplateLookup } from "../../shared/domain/loadouts/loadoutLookup";
import type {
  AccountItemSummary,
  AccountSummary,
  ArmorSetCatalogItem,
  BatchItemActionResult,
  DimWishlist,
  EquipmentTargetStore,
  LocalTargetRules,
  LocalCommunityRecommendationTable,
  SaveVaultTagInput,
  VaultItemMatchInfo,
  VaultTags,
  VaultTagValue
} from "../../api/types";
import { api } from "../../api/client";
import { services } from "../../api/services";

export function VaultPage(props: {
  account: AccountSummary | null;
  isLoadingAccount: boolean;
  accountError: string;
  activeLoadoutLookup: LoadoutTemplateLookup | null;
  activeLoadoutName?: string;
  selectedCharacterId: string;
  writeActionsEnabled: boolean;
  tags: VaultTags;
  openingItemKey: string;
  locateRequest?: { hash: number; name: string; requestId: number } | null;
  targetLocateRequest?: { targetId: string; requestId: number } | null;
  wishlist: DimWishlist | null;
  localTargetRules: LocalTargetRules;
  equipmentTargetStore: EquipmentTargetStore;
  communityMatch: Map<number, VaultItemMatchInfo>;
  onContextFactsChange?: (facts: string[]) => void;
  onWishlistChanged: (wishlist: DimWishlist | null) => void;
  onCommunityRecommendationsChanged: () => Promise<void> | void;
  onLocalTargetRulesChanged: (rules: LocalTargetRules) => void;
  onEquipmentTargetStoreChanged: (store: EquipmentTargetStore) => void;
  onOpenGuide: (targetId: string) => Promise<boolean>;
  onOpenArmorResult: (reference: { resultId: string; candidateId: string }) => void;
  onLoadAccount: () => void;
  onSaveTagBatch: (inputs: SaveVaultTagInput[]) => void | Promise<void>;
  onBatchUnlock: (items: AccountItemSummary[], targetCharacterId: string) => Promise<string>;
  onBatchTransferToCharacter: (items: AccountItemSummary[], targetCharacterId: string) => Promise<BatchItemActionResult>;
  onOpenItem: (item: AccountItemSummary) => void;
  onSaveTag: (item: AccountItemSummary, tag: VaultTagValue) => void | Promise<void>;
}) {
  const [localCommunityTable, setLocalCommunityTable] = useState<LocalCommunityRecommendationTable | null>(null);
  const [localCommunityLoadState, setLocalCommunityLoadState] = useState<"loading" | "ready" | "error">("loading");
  const [localCommunityLoadError, setLocalCommunityLoadError] = useState("");
  const [armorSetCatalog, setArmorSetCatalog] = useState<ArmorSetCatalogItem[]>([]);
  const [armorSetCatalogStatus, setArmorSetCatalogStatus] = useState<"loading" | "ready" | "error">("loading");
  const loadItemDetail = useCallback((item: AccountItemSummary) => (
    item.instance_id ? api.getAccountItemDetail(item.instance_id) : Promise.resolve(item)
  ), []);
  const loadLocalCommunityTable = useCallback(async () => {
    setLocalCommunityLoadState("loading");
    setLocalCommunityLoadError("");
    try {
      const table = await services.localData.getLocalCommunityRecommendations();
      setLocalCommunityTable(table);
      setLocalCommunityLoadState("ready");
      return table;
    } catch (error) {
      const message = error instanceof Error ? error.message : "本地社区推荐表读取失败";
      setLocalCommunityLoadState("error");
      setLocalCommunityLoadError(message);
      throw error;
    }
  }, []);
  useEffect(() => {
    void loadLocalCommunityTable().catch(() => undefined);
  }, [loadLocalCommunityTable]);
  useEffect(() => {
    let active = true;
    setArmorSetCatalogStatus("loading");
    void api.getArmorSetCatalog().then(
      (catalog) => {
        if (!active) return;
        setArmorSetCatalog(catalog);
        setArmorSetCatalogStatus("ready");
      },
      () => {
        if (!active) return;
        setArmorSetCatalog([]);
        setArmorSetCatalogStatus("error");
      }
    );
    return () => {
      active = false;
    };
  }, []);
  const model = useMemo(() => props.account ? selectVaultPageModel({
    account: props.account,
    selectedCharacterId: props.selectedCharacterId,
    activeLoadoutLookup: props.activeLoadoutLookup,
    activeLoadoutName: props.activeLoadoutName,
    tags: props.tags,
    targetRules: props.localTargetRules,
    wishlist: props.wishlist,
    communityMatch: props.communityMatch
  }) : null, [
    props.account,
    props.selectedCharacterId,
    props.activeLoadoutLookup,
    props.activeLoadoutName,
    props.tags,
    props.localTargetRules,
    props.wishlist,
    props.communityMatch
  ]);

  if (!props.account) {
    return (
      <ProductWorkspaceEmptyState>
        <strong>{props.accountError ? "仓库读取失败" : props.isLoadingAccount ? "正在读取账号" : "还没有账号数据"}</strong>
        <span>{props.accountError || "先读取账号数据，然后查看完整仓库列表。"}</span>
        <ControlButton variant="primary" aria-busy={props.isLoadingAccount} disabled={props.isLoadingAccount} onClick={props.onLoadAccount}>刷新账号</ControlButton>
      </ProductWorkspaceEmptyState>
    );
  }

  if (!model) return null;

  return (
    <VaultPageContentView
      items={model.vaultItems}
      armorSetCatalog={armorSetCatalog}
      armorSetCatalogStatus={armorSetCatalogStatus}
      vaultItemCount={model.vaultItemCount}
      highlightedItemKeys={model.activeLoadoutLookup}
      highlightedLabel={model.activeLoadoutName}
      tags={model.tags}
      openingItemKey={props.openingItemKey}
      locateRequest={props.locateRequest}
      targetLocateRequest={props.targetLocateRequest}
      onSaveTagBatch={props.onSaveTagBatch}
      cleanupActions={{
        characters: props.account.characters,
        currentCharacterId: model.currentCharacterId,
        currentCharacterLabel: model.currentCharacterLabel,
        writeActionsEnabled: props.writeActionsEnabled,
        onBatchUnlock: props.onBatchUnlock,
        onBatchTransferToCharacter: props.onBatchTransferToCharacter
      }}
      wishlist={model.wishlist}
      localTargetRules={model.targetRules}
      equipmentTargetStore={props.equipmentTargetStore}
      communityMatch={model.communityMatch}
      recommendationImportActions={{
        localCommunityTable,
        localCommunityLoadState,
        localCommunityLoadError,
        onLoadLocalCommunity: loadLocalCommunityTable,
        onSaveWishlist: async (wishlist) => {
          const saved = await services.localData.saveDimWishlist(wishlist);
          props.onWishlistChanged(saved);
          props.onEquipmentTargetStoreChanged(await services.localData.getEquipmentTargetStore());
          return saved;
        },
        onClearWishlist: async () => {
          await services.localData.clearDimWishlist();
          props.onWishlistChanged(null);
          props.onEquipmentTargetStoreChanged(await services.localData.getEquipmentTargetStore());
        },
        onSaveLocalCommunity: async (table) => {
          const saved = await services.localData.saveLocalCommunityRecommendations(table);
          setLocalCommunityTable(saved);
          setLocalCommunityLoadState("ready");
          setLocalCommunityLoadError("");
          await props.onCommunityRecommendationsChanged();
          return saved;
        },
        onClearLocalCommunity: async () => {
          await services.localData.clearLocalCommunityRecommendations();
          setLocalCommunityTable(null);
          setLocalCommunityLoadState("ready");
          setLocalCommunityLoadError("");
          await props.onCommunityRecommendationsChanged();
        }
      }}
      targetRulesActions={{
        onSaveRules: async (rules) => {
          const saved = await services.localData.saveLocalTargetRules(rules);
          props.onLocalTargetRulesChanged(saved);
          props.onEquipmentTargetStoreChanged(await services.localData.getEquipmentTargetStore());
          return saved;
        },
        onClearRules: async () => {
          const cleared = await services.localData.clearLocalTargetRules();
          props.onLocalTargetRulesChanged(cleared);
          props.onEquipmentTargetStoreChanged(await services.localData.getEquipmentTargetStore());
          return cleared;
        },
        onSearchPerks: (query) => api.searchPerks(query),
        onSaveEquipmentTargetStore: async (store) => {
          const saved = await services.localData.saveEquipmentTargetStore(store);
          props.onEquipmentTargetStoreChanged(saved);
          return saved;
        },
        onClearEquipmentTargetStore: async () => {
          const cleared = await services.localData.clearEquipmentTargetStore();
          props.onEquipmentTargetStoreChanged(cleared);
          return cleared;
        },
        onOpenGuide: props.onOpenGuide,
        onOpenArmorResult: props.onOpenArmorResult
      }}
      onContextFactsChange={props.onContextFactsChange}
      onLoadItemDetail={loadItemDetail}
      onOpenItem={props.onOpenItem}
      onSaveTag={props.onSaveTag}
    />
  );
}
