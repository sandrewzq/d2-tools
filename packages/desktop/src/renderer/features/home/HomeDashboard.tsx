import {
  HomePageContentView,
  type ShellPageKey,
  type VendorInventoryItemView,
  type VendorOfferContextView
} from "@d2-tools/ui";
import {
  selectHomePageModel,
  type HomeDashboardActions,
  type HomePageModelInput
} from "@d2-tools/app/home";
import { useMemo } from "react";

export function HomeDashboard(props: HomePageModelInput & {
  interfaceLocale?: "zh-CN" | "en-US";
  onConfigure: () => void;
  onLogin: () => void;
  onLoadAccount: () => void;
  onInitializeManifest: () => void;
  onConfigureAi: () => void;
  onRefreshDiagnostics: () => void;
  onNavigate: (page: ShellPageKey) => void;
  onRefreshDaily: () => void;
  onOpenWeeklyActivityReward: HomeDashboardActions["onOpenWeeklyActivityReward"];
  onOpenXurOffer: (item: VendorInventoryItemView, context: VendorOfferContextView) => void;
}) {
  const model = useMemo(() => selectHomePageModel(props), [
    props.state,
    props.selectedCharacterId,
    props.selectedCharacterLabel,
    props.briefingFetchedAt,
    props.diagnosticRows,
    props.diagnosticError,
    props.accountError,
    props.hasAccountData,
    props.dailySummary,
    props.weeklySummary,
    props.dailyMessage,
    props.dailyError,
    props.isLoggingIn,
    props.isLoadingAccount,
    props.isInitializingManifest,
    props.isRefreshingDiagnostics,
    props.isLoadingDaily
  ]);

  return (
    <HomePageContentView
      {...model}
      onConfigure={props.onConfigure}
      onLogin={props.onLogin}
      onLoadAccount={props.onLoadAccount}
      onInitializeManifest={props.onInitializeManifest}
      onConfigureAi={props.onConfigureAi}
      onRefreshDiagnostics={props.onRefreshDiagnostics}
      onNavigate={props.onNavigate}
      onRefreshDaily={props.onRefreshDaily}
      onOpenWeeklyActivityReward={props.onOpenWeeklyActivityReward}
      onOpenXurOffer={props.onOpenXurOffer}
      interfaceLocale={props.interfaceLocale}
    />
  );
}
