import { useEffect } from "react";
import { AccountPage } from "../../features/account/AccountPage";
import { useAccountSummaryStore } from "../../shared/stores/accountEntityStore";
import { useDesktopMenuSession } from "./DesktopMenuProviderContext";
import { findWeeklyFarmingAccountItem, toWeeklyFarmingDefinitionItem } from "../../shared/domain/library/weeklyFarmingItemDetail";

export function AccountMenuProvider() {
  const session = useDesktopMenuSession();
  const account = session.account;
  const accountSummary = useAccountSummaryStore();
  const writeActions = session.writeActions;

  useEffect(() => {
    void session.library.loadWeeklyFarming(false);
  }, [session.library.loadWeeklyFarming]);

  return (
    <AccountPage
      interfaceLocale={session.diagnostics.languagePreferences.interfaceLocale}
      accountSummary={accountSummary}
      pursuitResource={account.pursuitResource}
      startupState={session.state}
      selectedCharacterId={account.selectedCharacterId}
      lastAccountLoadedAt={session.lastAccountLoadedAt}
      isLoadingAccount={account.isLoadingAccount}
      isShowingCachedAccount={account.isShowingCachedAccount}
      accountError={account.accountError}
      accountWarning={account.accountWarning}
      itemDetailError=""
      itemDetailLoadingKey=""
      activitySummary={account.activitySummary}
      weeklySummary={session.daily.weeklySummary}
      weeklySummaryStatus={session.daily.dailyResourceStatus}
      weeklySummaryError={session.daily.dailyError}
      activityMessage={account.activityMessage}
      activityError={account.activityError}
      loadoutMessage={writeActions.loadoutMessage}
      itemActionMessage={writeActions.itemActionMessage}
      operationFeedback={writeActions.accountOperationFeedback}
      isRunningItemAction={writeActions.isRunningItemAction}
      activeLoadoutLookup={session.home.activeLoadoutLookup}
      activeLoadoutTemplate={session.loadouts.activeTemplate}
      wishlist={account.importedWishlist}
      recommendationCardSummary={account.vaultRecommendationCardSummary}
      weeklyFarmingCatalog={session.library.weeklyFarmingCatalog}
      weeklyFarmingCommunityMatch={session.library.weeklyFarmingCommunityMatch}
      weeklyFarmingInstanceRecommendationReady={session.account.vaultRecommendationScan.phase === "complete"}
      weeklyFarmingError={session.library.weeklyFarmingError}
      weeklyFarmingRecommendationError={session.library.weeklyFarmingRecommendationError}
      isLoadingWeeklyFarming={session.library.isLoadingWeeklyFarming}
      isRefreshingWeeklyRotation={session.daily.isLoadingDaily}
      weeklyRotationError={session.daily.dailyError}
      onConfigureBungie={session.onConfigure}
      onLoginBungie={() => void account.loginBungie()}
      onLoadAccount={session.refreshAccountManually}
      onRefreshActivity={() => void account.refreshAccountDerivedData()}
      onRefreshPowerRoute={() => void session.daily.loadDailySummary(true)}
      onSelectCharacter={account.setSelectedCharacterId}
      onEquipHighestPowerItems={(character) => void writeActions.loadoutWriteActions.equipHighestPowerItems(character)}
      onOpenItem={(item, options) => session.itemDetail.openItemDetail(item, options)}
      onRefreshWeeklyRotation={() => void session.daily.loadDailySummary(true)}
      onRefreshWeeklyFarming={() => void session.library.loadWeeklyFarming(true)}
      onOpenWeeklyFarmingItem={(row) => void session.itemDetail.openItemDetail(
        findWeeklyFarmingAccountItem(accountSummary, row) ?? toWeeklyFarmingDefinitionItem(row)
      )}
    />
  );
}
