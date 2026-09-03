import { AccountPage } from "../../features/account/AccountPage";
import { useAccountSummaryStore } from "../../shared/stores/accountEntityStore";
import { useDesktopMenuSession } from "./DesktopMenuProviderContext";
import { useEffect } from "react";

export function AccountMenuProvider() {
  const session = useDesktopMenuSession();
  const account = session.account;
  const accountSummary = useAccountSummaryStore();
  const writeActions = session.writeActions;

  useEffect(() => {
    void account.loadVaultCommunityMatch();
  }, [account.lastAccountLoadedAt, accountSummary?.destiny_membership_id, accountSummary?.membership_type]);

  return (
    <AccountPage
      interfaceLocale={session.diagnostics.languagePreferences.interfaceLocale}
      accountSummary={accountSummary}
      startupState={session.state}
      selectedCharacterId={account.selectedCharacterId}
      lastAccountLoadedAt={session.lastAccountLoadedAt}
      isLoadingAccount={account.isLoadingAccount}
      isShowingCachedAccount={account.isShowingCachedAccount}
      accountError={account.accountError}
      accountWarning={account.accountWarning}
      itemDetailError={writeActions.itemDetail.itemDetailError}
      itemDetailLoadingKey={writeActions.itemDetail.itemDetailLoadingKey}
      activitySummary={account.activitySummary}
      activityMessage={account.activityMessage}
      activityError={account.activityError}
      loadoutMessage={writeActions.loadoutMessage}
      itemActionMessage={writeActions.itemActionMessage}
      operationFeedback={writeActions.accountOperationFeedback}
      isRunningItemAction={writeActions.isRunningItemAction}
      activeLoadoutLookup={session.home.activeLoadoutLookup}
      activeLoadoutTemplate={session.loadouts.activeTemplate}
      wishlist={account.importedWishlist}
      communityInstanceMatch={account.vaultCommunityInstanceMatch}
      onConfigureBungie={session.onConfigure}
      onLoginBungie={() => void account.loginBungie()}
      onLoadAccount={session.refreshAccountManually}
      onRefreshActivity={() => void account.refreshAccountDerivedData()}
      onSelectCharacter={account.setSelectedCharacterId}
      onEquipHighestPowerItems={(character) => void writeActions.loadoutWriteActions.equipHighestPowerItems(character)}
      onOpenItem={(item, options) => void writeActions.itemDetail.openItemDetail(item, options)}
    />
  );
}
