import type { DailySummary, StartupState } from "../../api/client";
import {
  DiagnosticsPanel,
  type DiagnosticRow
} from "../../components/DiagnosticsPanel";
import { StatusOverview } from "../../components/StatusOverview";
import type { ShellPageKey } from "../../components/ShellLayout";
import { DailySummaryPanel } from "../../shared/components/DailySummaryPanel";

export function HomeDashboard(props: {
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
  return (
    <div className="home-workbench">
      <div className="home-primary-column">
        <DailySummaryPanel
          dailySummary={props.dailySummary}
          dailyMessage={props.dailyMessage}
          dailyError={props.dailyError}
          isLoading={props.isLoadingDaily}
          onRefresh={props.onRefreshDaily}
          onCopyDailySummary={props.onCopyDailySummary}
          onCopyWeeklyFocus={props.onCopyWeeklyFocus}
        />
      </div>
      <aside className="home-side-column">
        <StatusOverview
          state={props.state}
          isLoggingIn={props.isLoggingIn}
          isLoadingAccount={props.isLoadingAccount}
          accountError={props.accountError}
          hasAccountData={props.hasAccountData}
          isInitializingManifest={props.isInitializingManifest}
          onConfigure={props.onConfigure}
          onLogin={props.onLogin}
          onLoadAccount={props.onLoadAccount}
          onInitializeManifest={props.onInitializeManifest}
          onConfigureAi={props.onConfigureAi}
        />
        <DiagnosticsPanel
          rows={props.diagnosticRows}
          isRefreshing={props.isRefreshingDiagnostics}
          onRefresh={props.onRefreshDiagnostics}
        />
        {props.diagnosticError ? <p className="status-message status-error">{props.diagnosticError}</p> : null}
      </aside>
    </div>
  );
}
