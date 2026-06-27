import type { DailySummary } from "@d2-tools/core/daily/summary";
import type { StartupState } from "@d2-tools/core/startup/startupState";

export type HomeDashboardDiagnosticRow = {
  label: string;
  value: string;
  tone: "ok" | "warning" | "neutral";
};

export type HomeDashboardWorkspace = {
  state: StartupState;
  diagnosticRows: HomeDashboardDiagnosticRow[];
  diagnosticError: string;
  dailySummary: DailySummary | null;
  dailyMessage: string;
  dailyError: string;
  isLoggingIn: boolean;
  isInitializingManifest: boolean;
  isRefreshingDiagnostics: boolean;
  isLoadingDaily: boolean;
};

export type HomeDashboardActions = {
  onConfigure: () => void;
  onLogin: () => void;
  onInitializeManifest: () => void;
  onConfigureAi: () => void;
  onRefreshDiagnostics: () => void;
  onNavigate: (page: "home" | "account" | "vault" | "loadouts" | "library" | "settings") => void;
  onRefreshDaily: () => void;
  onCopyDailySummary: () => void;
  onCopyWeeklyFocus: () => void;
};

export function createHomeDashboardWorkspace(input: HomeDashboardWorkspace) {
  return input;
}

export function createHomeDashboardActions(input: HomeDashboardActions) {
  return input;
}
