import { AccountPage } from "../../features/account/AccountPage";
import { useAccountSummaryStore } from "../../shared/stores/accountEntityStore";
import { useDesktopMenuSession } from "./DesktopMenuProviderContext";
import { findWeeklyFarmingAccountItem, toWeeklyFarmingDefinitionItem } from "../../shared/domain/library/weeklyFarmingItemDetail";

export function AccountMenuProvider() {
  const session = useDesktopMenuSession();
  const account = session.account;
  const accountSummary = useAccountSummaryStore();
  const writeActions = session.writeActions;

  /**
   * 玩家进「待办」时才读这两份资源：任务资源走账号 Session 里那条 202 + 900 的链，
   * 本周刷取走活动掉落数据集。两份都不在首屏上（T91 第 8 节）。
   */
  function requestTodoResources(): void {
    void account.ensurePursuits();
    void session.library.loadWeeklyFarming(false);
  }

  // 首页简报把日报与周报装在一次读取里。周报读到了就不算轮换失败——那可能只是日报那半出错，
  // 也可能只是这批结果偏旧。只有周报确实没读到，待办才报轮换读不到（T91 第 8 节）。
  const weeklyRotationError = session.daily.weeklySummary ? "" : session.daily.dailyError;

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
      recommendationCardSummary={account.vaultRecommendationCardSummary}
      weeklyFarmingCatalog={session.library.weeklyFarmingCatalog}
      weeklyFarmingCommunityMatch={session.library.weeklyFarmingCommunityMatch}
      weeklyFarmingInstanceRecommendationReady={session.account.vaultRecommendationScan.phase === "complete"}
      weeklyFarmingError={session.library.weeklyFarmingError}
      weeklyFarmingRecommendationError={session.library.weeklyFarmingRecommendationError}
      weeklyFarmingLocateRequest={session.weeklyFarmingLocateRequest ?? undefined}
      isLoadingWeeklyFarming={session.library.isLoadingWeeklyFarming}
      isRefreshingWeeklyRotation={session.daily.isLoadingDaily}
      weeklyRotationError={weeklyRotationError}
      onConfigureBungie={session.onConfigure}
      onLoginBungie={() => void account.loginBungie()}
      onLoadAccount={session.refreshAccountManually}
      onRefreshActivity={() => void account.refreshAccountDerivedData()}
      // 待办同时读任务资源和首页简报里的轮换，重试要把两份都重新要一遍；
      // 只重试简报修不好任务那半（T91 第 8 节）。
      onRefreshTasks={() => {
        void account.ensurePursuits(true);
        void session.daily.loadDailySummary(true);
      }}
      onRequestTodoResources={requestTodoResources}
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
