import { HomeDashboard } from "../../features/home/HomeDashboard";
import { useHasAccountDataStore } from "../../shared/stores/accountEntityStore";
import { useDesktopMenuSession } from "./DesktopMenuProviderContext";

export function HomeMenuProvider() {
  const session = useDesktopMenuSession();
  const account = session.account;
  const daily = session.daily;
  const diagnostics = session.diagnostics;
  const hasAccountData = useHasAccountDataStore();

  return (
    <HomeDashboard
      state={session.state}
      selectedCharacterId={account.selectedCharacterId}
      isLoggingIn={account.isLoggingIn}
      isInitializingManifest={account.isInitializingManifest}
      isRefreshingDiagnostics={diagnostics.isRefreshingDiagnostics}
      diagnosticRows={session.home.diagnosticRows}
      diagnosticError={diagnostics.diagnosticError}
      accountError={account.accountError}
      hasAccountData={hasAccountData}
      dailySummary={daily.dailySummary}
      weeklySummary={daily.weeklySummary}
      dailyMessage={daily.dailyMessage}
      dailyError={daily.dailyError}
      isLoadingAccount={account.isLoadingAccount}
      isLoadingDaily={daily.isLoadingDaily}
      onConfigure={session.onConfigure}
      onLogin={() => void account.loginBungie()}
      onLoadAccount={session.refreshAccountManually}
      onInitializeManifest={() => void account.initializeManifest()}
      onConfigureAi={() => session.setActivePage("settings")}
      onRefreshDiagnostics={() => void diagnostics.refreshDiagnostics()}
      onNavigate={session.setActivePage}
      onRefreshDaily={() => void daily.loadDailySummary()}
      interfaceLocale={diagnostics.languagePreferences.interfaceLocale}
    />
  );
}
