export type HomeDashboardDiagnosticRow = {
  label?: string;
  value?: string;
  tone?: string;
};

export type HomeDashboardDailyItem = {
  title: string;
  subtitle?: string;
  description?: string;
  source?: string;
  iconUrl?: string;
  icon?: string;
  iconLabel?: string;
  items?: HomeDashboardDailyItem[];
};

export type HomeDashboardDailySource = {
  status: "neutral" | "ready" | "warning" | "error" | "pending";
  label?: string;
  message: string;
  items?: HomeDashboardDailyItem[];
};

export type HomeDashboardDailySummary = {
  date_label?: string;
  daily_reset: {
    label: string;
    next_reset_iso?: string;
    time_remaining_label: string;
  };
  weekly_reset: {
    label: string;
    next_reset_iso?: string;
    time_remaining_label: string;
  };
  sources: {
    rotations: HomeDashboardDailySource;
    vendors: HomeDashboardDailySource;
    lost_sector: HomeDashboardDailySource;
    weekly_report: HomeDashboardDailySource;
  };
  checklist: string[];
  recommendations?: string[];
};

export type HomeDashboardStartupState = {
  cards: {
    manifest: {
      label: string;
      status: string;
      lastUpdated?: string;
      needsUpdate?: boolean;
    };
  };
};

export type HomeDashboardWorkspace = {
  state: HomeDashboardStartupState;
  diagnosticRows: HomeDashboardDiagnosticRow[];
  diagnosticError: string;
  accountError: string;
  hasAccountData: boolean;
  dailySummary: HomeDashboardDailySummary | null;
  dailyMessage: string;
  dailyError: string;
  isLoggingIn: boolean;
  isLoadingAccount: boolean;
  isInitializingManifest: boolean;
  isRefreshingDiagnostics: boolean;
  isLoadingDaily: boolean;
};

export type HomeDashboardActions = {
  onConfigure: () => void;
  onLogin: () => void;
  onLoadAccount: () => void;
  onInitializeManifest: () => void;
  onConfigureAi: () => void;
  onRefreshDiagnostics: () => void;
  onNavigate: (page: "home" | "account" | "vault" | "loadouts" | "library" | "vendors" | "settings") => void;
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
