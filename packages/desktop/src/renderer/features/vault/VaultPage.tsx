import { buildVaultRecommendationAuditReport, selectVaultPageModel } from "@d2-tools/app/vault";
import type { VaultRecommendationScanState } from "@d2-tools/app/account";
import { ProductWorkspaceEmptyState, RefreshControlButton, VaultPageContentView, type VaultWishlistActions } from "@d2-tools/ui";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { LoadoutTemplateLookup } from "../../shared/domain/loadouts/loadoutLookup";
import type {
  AccountItemSummary,
  ArmorSetCatalogItem,
  BatchItemActionResult,
  DimWishlist,
  EquipmentTargetStore,
  LocalTargetRules,
  RecommendationCardSummary,
  SaveVaultTagInput,
  VaultTags,
  VaultTagValue
} from "../../api/types";
import { api } from "../../api/client";
import { services } from "../../api/services";
import { loadAccountItemDetailCached } from "../../shared/hooks/useItemDetail";
import type { VaultAccountStoreSnapshot } from "../../shared/stores/accountEntityStore";

export function VaultPage(props: {
  account: VaultAccountStoreSnapshot | null;
  isBungieConfigured: boolean;
  isAccountLoggedIn: boolean;
  isLoadingAccount: boolean;
  isShowingCachedAccount: boolean;
  accountError: string;
  accountSyncMessage: string;
  detailCacheScopeKey?: string;
  activeLoadoutLookup: LoadoutTemplateLookup | null;
  cleanupProtectedItemKeys?: LoadoutTemplateLookup | null;
  activeLoadoutName?: string;
  selectedCharacterId: string;
  onSelectCharacter: (characterId: string) => void;
  tags: VaultTags;
  openingItemKey: string;
  locateRequest?: { hash: number; name: string; requestId: number } | null;
  targetLocateRequest?: { targetId: string; requestId: number } | null;
  wishlist: DimWishlist | null;
  localTargetRules: LocalTargetRules;
  equipmentTargetStore: EquipmentTargetStore;
  recommendationCardSummary: ReadonlyMap<string, RecommendationCardSummary>;
  recommendationScan: VaultRecommendationScanState;
  onContextFactsChange?: (facts: string[]) => void;
  onLocalTargetRulesChanged: (rules: LocalTargetRules) => void;
  onEquipmentTargetStoreChanged: (store: EquipmentTargetStore) => void;
  onWishlistChanged: (wishlist: DimWishlist | null) => void;
  onCommunityRecommendationsChanged: (weaponHashes?: readonly number[]) => Promise<void> | void;
  onOpenArmorResult: (reference: { resultId: string; candidateId: string }) => void;
  onLoadAccount: () => void;
  onConfigureBungie: () => void;
  onLoginBungie: () => void;
  onSaveTagBatch: (inputs: SaveVaultTagInput[]) => void | Promise<void>;
  onLockItem: (item: AccountItemSummary, targetCharacterId: string, state?: boolean) => Promise<string>;
  onBatchUnlock: (items: AccountItemSummary[], targetCharacterId: string) => Promise<string>;
  onBatchTransferToCharacter: (items: AccountItemSummary[], targetCharacterId: string) => Promise<BatchItemActionResult>;
  onOpenItem: (item: AccountItemSummary) => void;
  onSaveTag: (item: AccountItemSummary, tag: VaultTagValue) => void | Promise<void>;
}) {
  const [armorSetCatalog, setArmorSetCatalog] = useState<ArmorSetCatalogItem[]>([]);
  const [armorSetCatalogStatus, setArmorSetCatalogStatus] = useState<"loading" | "ready" | "error">("loading");
  const detailScopeKey = props.detailCacheScopeKey ?? (props.account
    ? `${props.account.membership_type}:${props.account.destiny_membership_id}`
    : "vault");
  const loadItemDetail = useCallback((item: AccountItemSummary) => (
    item.instance_id
      ? loadAccountItemDetailCached(item.instance_id, {
          scopeKey: detailScopeKey,
          rollFingerprint: item.weapon_roll?.fingerprint
        })
      : Promise.resolve(item)
  ), [detailScopeKey]);
  const loadRecommendationEvidence = useCallback(async (items: AccountItemSummary[]) => {
    const result = await api.matchCommunityVaultItems(
      items.map(toVaultMatchInput),
      { include_evidence: true }
    );
    return result.matches;
  }, []);
  const getRecommendationManagement = useCallback(() => api.getRecommendationManagement(), []);
  const listRecommendationRules = useCallback((sourceKey: string, query?: string) => (
    api.listRecommendationRules(sourceKey, query)
  ), []);
  const wishlistActions = useMemo<VaultWishlistActions>(() => ({
    listRecommendationDocuments: () => api.listRecommendationDocuments(),
    selectDimFile: () => api.selectDimWishlistFile(),
    readWishlistLink: (url) => api.readDimWishlistLink(url),
    confirmDimImport: async (token, target) => {
      const saved = await api.confirmDimWishlistImport(token, target);
      const affectedWeaponHashes = collectWishlistWeaponHashes(props.wishlist, saved);
      props.onWishlistChanged(await api.getDimWishlist());
      props.onEquipmentTargetStoreChanged(await api.getEquipmentTargetStore());
      await props.onCommunityRecommendationsChanged(affectedWeaponHashes);
      return saved;
    },
    exportKnowledgeTemplate: (language) => api.exportWeaponKnowledgeCsvTemplate(language),
    exportKnowledgeCsv: () => api.exportWeaponKnowledgePlayerCsv(),
    selectKnowledgeCsv: () => api.selectWeaponKnowledgeCsv(),
    confirmKnowledgeImport: async (token, target) => {
      const imported = await api.confirmWeaponKnowledgeCsvImport(token, target);
      await props.onCommunityRecommendationsChanged();
      return imported;
    },
    getRecommendationManagement,
    listRecommendationRules,
    setRecommendationSourceState: async (sourceKey, state) => {
      const snapshot = await api.setRecommendationSourceState(sourceKey, state);
      // 变更是否落在导入文档托管的来源上由服务给出，视图层不认来源键的写法。
      if (snapshot.stored_source_changed) {
        props.onWishlistChanged(await api.getDimWishlist());
        if (state === "removed") {
          props.onEquipmentTargetStoreChanged(await api.getEquipmentTargetStore());
        }
      }
      await Promise.resolve(props.onCommunityRecommendationsChanged(snapshot.affected_weapon_hashes)).catch(() => undefined);
      return snapshot;
    },
    setRecommendationRuleState: async (input) => {
      const snapshot = await api.setRecommendationRuleState(input);
      await Promise.resolve(props.onCommunityRecommendationsChanged(snapshot.affected_weapon_hashes)).catch(() => undefined);
      return snapshot;
    },
    clearImportedRecommendationRules: async () => {
      const snapshot = await api.clearImportedRecommendationRules();
      await Promise.resolve(props.onCommunityRecommendationsChanged(snapshot.affected_weapon_hashes)).catch(() => undefined);
      return snapshot;
    }
  }), [getRecommendationManagement, listRecommendationRules, props.onCommunityRecommendationsChanged, props.onEquipmentTargetStoreChanged, props.onWishlistChanged, props.wishlist]);
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
    targetRules: props.localTargetRules
  }) : null, [
    props.account,
    props.selectedCharacterId,
    props.activeLoadoutLookup,
    props.activeLoadoutName,
    props.tags,
    props.localTargetRules
  ]);

  if (!props.isBungieConfigured || !props.isAccountLoggedIn || !props.account) {
    if (!props.isBungieConfigured || !props.isAccountLoggedIn) {
      const isConfigured = props.isBungieConfigured;
      return (
        <ProductWorkspaceEmptyState className="account-unavailable product-workspace-empty--page" uiKind="state-frame">
          <span className="ui-badge status-warning">未连接 Bungie</span>
          <h2>{isConfigured ? "账号还没有登录" : "还没有配置 Bungie 应用"}</h2>
          <p>{isConfigured ? "先登录 Bungie；登录后会自动同步装备数据，随后即可查看仓库、装备和清理候选。" : "先在设置里完成 Bungie 应用配置，再登录账号同步装备数据。"}</p>
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
        <span>{props.accountError || "先同步装备数据，然后查看当前角色、背包和仓库中的真实装备。"}</span>
        <RefreshControlButton variant="primary" refreshing={props.isLoadingAccount} onClick={props.onLoadAccount}>同步装备数据</RefreshControlButton>
      </ProductWorkspaceEmptyState>
    );
  }

  const account = props.account;
  if (!model) return null;

  return (
    <VaultPageContentView
      items={model.vaultItems}
      currentCharacterId={model.currentCharacterId}
      characterTabs={model.characterTabs}
      onSelectCharacter={props.onSelectCharacter}
      armorSetCatalog={armorSetCatalog}
      armorSetCatalogStatus={armorSetCatalogStatus}
      accountResourceStatus={props.isLoadingAccount
        ? "refreshing"
        : props.accountError
          ? "stale"
          : props.isShowingCachedAccount
            ? "cached"
            : "ready"}
      accountResourceMessage={props.accountSyncMessage}
      accountResourceError={props.accountError}
      vaultItemCount={model.vaultItemCount}
      highlightedItemKeys={model.activeLoadoutLookup}
      cleanupProtectedItemKeys={props.cleanupProtectedItemKeys}
      highlightedLabel={model.activeLoadoutName}
      tags={model.tags}
      openingItemKey={props.openingItemKey}
      locateRequest={props.locateRequest}
      onSaveTagBatch={props.onSaveTagBatch}
      cleanupActions={{
        characters: props.account.characters,
        currentCharacterId: model.currentCharacterId,
        currentCharacterLabel: model.currentCharacterLabel,
        onLockItem: props.onLockItem,
        onBatchUnlock: props.onBatchUnlock,
        onBatchTransferToCharacter: props.onBatchTransferToCharacter
      }}
      recommendationCardSummary={props.recommendationCardSummary}      recommendationSourceState={{
        recommendationScan: props.recommendationScan,
      }}
      wishlistActions={wishlistActions}
      onLoadRecommendationEvidence={loadRecommendationEvidence}
      onCopyRecommendationAudit={async () => {
        const items = [
          ...account.characters.flatMap((character) => [
            ...character.equipped_items,
            ...character.inventory_items,
            ...character.postmaster_items
          ]),
          ...account.vault.items
        ];
        const result = await api.matchCommunityVaultItems(
          items.filter((item) => item.group_key === "weapons").map(toVaultMatchInput),
          { include_evidence: true }
        );
        await navigator.clipboard.writeText(buildVaultRecommendationAuditReport({
          items,
          instanceMatches: new Map(result.matches.map((match) => [
            match.instance_id ?? `hash:${match.hash}`,
            match
          ])),
          scan: props.recommendationScan
        }));
      }}
      onContextFactsChange={props.onContextFactsChange}
      onLoadItemDetail={loadItemDetail}
      onOpenItem={props.onOpenItem}
      onSaveTag={props.onSaveTag}
    />
  );
}

function toVaultMatchInput(item: AccountItemSummary) {
  return {
    hash: item.hash,
    ...(item.instance_id ? { instance_id: item.instance_id } : {}),
    item_name: item.name,
    ...(item.weapon_roll ? { weapon_roll: item.weapon_roll } : {}),
    ...(item.socket_plugs ? {
      socket_plugs: item.socket_plugs.map((plug) => ({
        hash: plug.hash,
        socket_index: plug.socket_index,
        name: plug.name
      }))
    } : {})
  };
}

function collectWishlistWeaponHashes(...wishlists: Array<DimWishlist | null | undefined>): number[] {
  return [...new Set(wishlists.flatMap((wishlist) => (
    wishlist?.rules.map((rule) => rule.item_hash) ?? []
  )))];
}
