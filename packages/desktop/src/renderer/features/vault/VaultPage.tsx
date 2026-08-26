import { selectVaultPageModel } from "@d2-tools/app/vault";
import { ControlButton, ProductWorkspaceEmptyState, VaultPageContentView, type VaultWishlistActions } from "@d2-tools/ui";
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
  isBungieConfigured: boolean;
  isAccountLoggedIn: boolean;
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
  onLocalTargetRulesChanged: (rules: LocalTargetRules) => void;
  onEquipmentTargetStoreChanged: (store: EquipmentTargetStore) => void;
  onWishlistChanged: (wishlist: DimWishlist | null) => void;
  onCommunityRecommendationsChanged: () => Promise<void> | void;
  onOpenGuide: (targetId: string) => Promise<boolean>;
  onOpenArmorResult: (reference: { resultId: string; candidateId: string }) => void;
  onLoadAccount: () => void;
  onConfigureBungie: () => void;
  onLoginBungie: () => void;
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
  const wishlistActions = useMemo<VaultWishlistActions>(() => ({
    save: async (wishlist) => {
      const saved = await api.saveDimWishlist(wishlist);
      props.onWishlistChanged(saved);
      props.onEquipmentTargetStoreChanged(await api.getEquipmentTargetStore());
      await props.onCommunityRecommendationsChanged();
      return saved;
    },
    clear: async () => {
      await api.clearDimWishlist();
      props.onWishlistChanged(null);
      props.onEquipmentTargetStoreChanged(await api.getEquipmentTargetStore());
      await props.onCommunityRecommendationsChanged();
    }
  }), [props.onCommunityRecommendationsChanged, props.onEquipmentTargetStoreChanged, props.onWishlistChanged]);
  const loadLocalCommunityTable = useCallback(async () => {
    setLocalCommunityLoadState("loading");
    setLocalCommunityLoadError("");
    try {
      const table = await services.localData.getLocalCommunityRecommendations();
      setLocalCommunityTable(table);
      setLocalCommunityLoadState("ready");
      return table;
    } catch (error) {
      const message = error instanceof Error ? error.message : "遗留自定义规则读取失败";
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

  if (!props.isBungieConfigured || !props.isAccountLoggedIn || !props.account) {
    if (!props.isBungieConfigured || !props.isAccountLoggedIn) {
      const isConfigured = props.isBungieConfigured;
      return (
        <ProductWorkspaceEmptyState className="account-unavailable product-workspace-empty--page" uiKind="state-frame">
          <span className="ui-badge status-warning">未连接 Bungie</span>
          <h2>{isConfigured ? "账号还没有登录" : "还没有配置 Bungie 应用"}</h2>
          <p>{isConfigured ? "先登录 Bungie，读取账号数据后才能查看仓库、装备和清理候选。" : "先在设置里完成 Bungie 应用配置，再登录账号读取仓库数据。"}</p>
          <div className="button-row">
            {isConfigured ? (
              <button type="button" data-ui-kind="button" data-control-variant="primary" onClick={props.onLoginBungie}>登录 Bungie</button>
            ) : (
              <button type="button" data-ui-kind="button" data-control-variant="primary" onClick={props.onConfigureBungie}>去设置 Bungie</button>
            )}
          </div>
        </ProductWorkspaceEmptyState>
      );
    }

    return (
      <ProductWorkspaceEmptyState className="vault-empty-state product-workspace-empty--page">
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
      recommendationSourceState={{
        customRules: localCommunityTable,
        customRulesLoadState: localCommunityLoadState,
        customRulesLoadError: localCommunityLoadError
      }}
      wishlistActions={wishlistActions}
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
