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
  isInitializingManifest: boolean;
  isRefreshingDiagnostics: boolean;
  diagnosticRows: DiagnosticRow[];
  diagnosticError: string;
  dailySummary: DailySummary | null;
  dailyMessage: string;
  dailyError: string;
  isLoadingDaily: boolean;
  onConfigure: () => void;
  onLogin: () => void;
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
          isInitializingManifest={props.isInitializingManifest}
          onConfigure={props.onConfigure}
          onLogin={props.onLogin}
          onInitializeManifest={props.onInitializeManifest}
          onConfigureAi={props.onConfigureAi}
        />
        <DiagnosticsPanel
          rows={props.diagnosticRows}
          isRefreshing={props.isRefreshingDiagnostics}
          onRefresh={props.onRefreshDiagnostics}
        />
        {props.diagnosticError ? <p className="error">{props.diagnosticError}</p> : null}
        <section className="tool-panel">
          <div className="section-heading">
            <div>
              <h2>常用入口</h2>
              <p>先完成状态诊断，再进入账号、资料库或设置页。</p>
            </div>
          </div>
          <div className="quick-actions">
            <button type="button" onClick={() => props.onNavigate("account")}>查看账号</button>
            <button type="button" onClick={() => props.onNavigate("library")}>搜索资料库</button>
            <button type="button" className="secondary-button" onClick={() => props.onNavigate("settings")}>打开设置</button>
          </div>
        </section>
      </aside>
    </div>
  );
}
