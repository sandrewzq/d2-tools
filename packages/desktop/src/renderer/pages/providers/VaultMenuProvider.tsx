import { VaultPage } from "../../features/vault/VaultPage";
import { useDesktopMenuSession } from "./DesktopMenuProviderContext";

export function VaultMenuProvider() {
  const session = useDesktopMenuSession();
  const account = session.account;
  const writeActions = session.writeActions;

  return (
    <VaultPage
      account={account.accountSummary}
      isLoadingAccount={account.isLoadingAccount}
      accountError={account.accountError}
      activeLoadoutLookup={session.home.activeLoadoutLookup}
      activeLoadoutName={session.loadouts.activeTemplate?.name}
      selectedCharacterId={account.selectedCharacterId}
      writeActionsEnabled={session.diagnostics.writeActionsEnabled}
      tags={account.vaultTags}
      openingItemKey={writeActions.itemDetail.itemDetailLoadingKey}
      wishlist={account.importedWishlist}
      localTargetRules={account.localTargetRules}
      communityMatch={account.vaultCommunityMatch}
      onContextFactsChange={session.setVaultFacts}
      onWishlistChanged={account.setImportedWishlist}
      onLocalTargetRulesChanged={account.setLocalTargetRules}
      onLoadAccount={session.refreshAccountManually}
      onSaveTagBatch={(inputs) => writeActions.vaultWriteActions.saveVaultTagsBatch(inputs)}
      onBatchUnlock={writeActions.vaultWriteActions.handleVaultCleanupUnlock}
      onBatchTransferToCharacter={writeActions.vaultWriteActions.handleVaultCleanupTransfer}
      onOpenItem={(item) => void writeActions.itemDetail.openItemDetail(item, { is_vault_item: true })}
      onSaveTag={(item, tag) => writeActions.vaultWriteActions.saveVaultTag(item, tag)}
    />
  );
}
