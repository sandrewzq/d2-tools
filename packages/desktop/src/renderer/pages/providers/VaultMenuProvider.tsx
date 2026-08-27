import { VaultPage } from "../../features/vault/VaultPage";
import { useAccountSummaryStore } from "../../shared/stores/accountEntityStore";
import { useDesktopMenuSession } from "./DesktopMenuProviderContext";
import { useEffect } from "react";

export function VaultMenuProvider() {
  const session = useDesktopMenuSession();
  const account = session.account;
  const accountSummary = useAccountSummaryStore();
  const writeActions = session.writeActions;

  useEffect(() => {
    void account.loadVaultCommunityMatch();
  }, [accountSummary?.destiny_membership_id, accountSummary?.membership_type]);

  return (
    <VaultPage
      account={accountSummary}
      isBungieConfigured={session.state.cards.bungieConfig.status === "ready"}
      isAccountLoggedIn={session.state.cards.account.status === "ready"}
      isLoadingAccount={account.isLoadingAccount}
      accountError={account.accountError}
      detailCacheScopeKey={[
        accountSummary
          ? `${accountSummary.membership_type}:${accountSummary.destiny_membership_id}`
          : "signed-out",
        session.diagnostics.manifestStatus?.version ?? "manifest-unavailable",
        session.diagnostics.manifestStatus?.language ?? "",
        session.diagnostics.manifestStatus?.cached_at ?? ""
      ].join("\u0000")}
      activeLoadoutLookup={session.home.activeLoadoutLookup}
      activeLoadoutName={session.loadouts.activeTemplate?.name}
      selectedCharacterId={account.selectedCharacterId}
      tags={account.vaultTags}
      openingItemKey={writeActions.itemDetail.itemDetailLoadingKey}
      locateRequest={session.vaultLocateRequest}
      targetLocateRequest={session.vaultTargetLocateRequest}
      wishlist={account.importedWishlist}
      localTargetRules={account.localTargetRules}
      equipmentTargetStore={account.equipmentTargetStore}
      communityMatch={account.vaultCommunityMatch}
      onContextFactsChange={session.setVaultFacts}
      onLocalTargetRulesChanged={account.setLocalTargetRules}
      onEquipmentTargetStoreChanged={account.setEquipmentTargetStore}
      onWishlistChanged={account.setImportedWishlist}
      onCommunityRecommendationsChanged={() => account.loadVaultCommunityMatch(undefined, { force: true })}
      onOpenGuide={async (targetId) => {
        const guideDocumentId = await session.guides.findGuideDocumentIdForDerivedEntity(targetId);
        if (!guideDocumentId) return false;
        session.guides.selectDocument(guideDocumentId);
        session.setActivePage("guides");
        return true;
      }}
      onOpenArmorResult={session.locateArmorResultReference}
      onLoadAccount={session.refreshAccountManually}
      onConfigureBungie={session.onConfigure}
      onLoginBungie={() => void account.loginBungie()}
      onSaveTagBatch={(inputs) => writeActions.vaultWriteActions.saveVaultTagsBatch(inputs)}
      onBatchUnlock={writeActions.vaultWriteActions.handleVaultCleanupUnlock}
      onBatchTransferToCharacter={writeActions.vaultWriteActions.handleVaultCleanupTransfer}
      onOpenItem={(item) => void writeActions.itemDetail.openItemDetail(item, { is_vault_item: true })}
      onSaveTag={(item, tag) => writeActions.vaultWriteActions.saveVaultTag(item, tag)}
    />
  );
}
