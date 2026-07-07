import { HomePageContentView, type ShellPageKey } from "@d2-tools/ui";
import { selectHomePageModel } from "@d2-tools/app";
import type { DailySummary, StartupState } from "../../api/types";
import { type DiagnosticRow } from "../../components/DiagnosticsPanel";

export function HomeDashboard(props: {
  interfaceLocale?: "zh-CN" | "en-US";
  state: StartupState;
  isLoggingIn: boolean;
  isLoadingAccount: boolean;
  isInitializingManifest: boolean;
  isRefreshingDiagnostics: boolean;
  diagnosticRows: DiagnosticRow[];
  diagnosticError: string;
  accountError: string;
  hasAccountData: boolean;
  dailySummary: DailySummary | null;
  dailyMessage: string;
  dailyError: string;
  isLoadingDaily: boolean;
  onConfigure: () => void;
  onLogin: () => void;
  onLoadAccount: () => void;
  onInitializeManifest: () => void;
  onConfigureAi: () => void;
  onRefreshDiagnostics: () => void;
  onNavigate: (page: ShellPageKey) => void;
  onRefreshDaily: () => void;
  onCopyDailySummary: () => void;
  onCopyWeeklyFocus: () => void;
}) {
  const model = selectHomePageModel(props);

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
      onCopyDailySummary={props.onCopyDailySummary}
      onCopyWeeklyFocus={props.onCopyWeeklyFocus}
    />
  );
}
