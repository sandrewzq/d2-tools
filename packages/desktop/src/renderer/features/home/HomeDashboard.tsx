import { HomePageView, type ShellPageKey } from "@d2-tools/ui";
import type { DailySummary, StartupState } from "../../api/client";
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
  return <HomePageView {...props} />;
}
