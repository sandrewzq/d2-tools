import { AccountPage } from "../../features/account/AccountPage";
import { useAccountSummaryStore } from "../../shared/stores/accountEntityStore";
import { useDesktopMenuSession } from "./DesktopMenuProviderContext";

export function AccountMenuProvider() {
  const session = useDesktopMenuSession();
  const account = session.account;
  const accountSummary = useAccountSummaryStore();
  const writeActions = session.writeActions;

  return (
    <AccountPage
      interfaceLocale={session.diagnostics.languagePreferences.interfaceLocale}
      accountSummary={accountSummary}
      startupState={session.state}
      selectedCharacterId={account.selectedCharacterId}
      isLoadingAccount={account.isLoadingAccount}
      accountError={account.accountError}
      accountWarning={account.accountWarning}
      itemDetailError={writeActions.itemDetail.itemDetailError}
      itemDetailLoadingKey={writeActions.itemDetail.itemDetailLoadingKey}
      writeActionsEnabled={session.diagnostics.writeActionsEnabled}
      activitySummary={account.activitySummary}
      activityMessage={account.activityMessage}
      activityError={account.activityError}
      loadoutMessage={writeActions.loadoutMessage}
      itemActionMessage={writeActions.itemActionMessage}
      isRunningItemAction={writeActions.isRunningItemAction}
      activeLoadoutLookup={session.home.activeLoadoutLookup}
      activeLoadoutTemplate={session.loadouts.activeTemplate}
      onConfigureBungie={session.onConfigure}
      onOpenWriteSettings={() => {
        session.setSettingsInitialSection("account");
        session.setActivePage("settings");
      }}
      onLoginBungie={() => void account.loginBungie()}
      onLoadAccount={session.refreshAccountManually}
      onRefreshActivity={() => void account.refreshAccountDerivedData()}
      onSelectCharacter={account.setSelectedCharacterId}
      onSaveCharacterLoadout={(character) => void writeActions.loadoutWriteActions.saveCharacterLoadout(character)}
      onEquipHighestPowerItems={(character) => void writeActions.loadoutWriteActions.equipHighestPowerItems(character)}
      onOpenItem={(item, options) => void writeActions.itemDetail.openItemDetail(item, options)}
    />
  );
}
