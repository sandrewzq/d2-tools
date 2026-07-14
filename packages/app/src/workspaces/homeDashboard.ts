export type HomeDashboardDiagnosticRow = {
  label?: string;
  value?: string;
  tone?: string;
};

export type HomeDashboardDailyItem = {
  title: string;
  characterId?: string;
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

export type HomeDashboardWeeklyPriorityKind =
  | "nightfall"
  | "rotating_raid"
  | "rotating_dungeon"
  | "weekly_bonus"
  | "special_event";

export type HomeDashboardWeeklySummary = {
  weekly_reset: {
    label: string;
    next_reset_iso?: string;
    time_remaining_label: string;
  };
  priorities: Record<HomeDashboardWeeklyPriorityKind, {
    status: "ready" | "pending";
    title: string;
    detail: string;
    evidence?: string;
    source?: string;
  }>;
  public_clues: Array<{
    title: string;
    subtitle?: string;
    description?: string;
    source?: string;
    weeklyActivityKind?: HomeDashboardWeeklyPriorityKind | "public_clue";
  }>;
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
  selectedCharacterId?: string;
  diagnosticRows: HomeDashboardDiagnosticRow[];
  diagnosticError: string;
  accountError: string;
  hasAccountData: boolean;
  dailySummary: HomeDashboardDailySummary | null;
  weeklySummary: HomeDashboardWeeklySummary | null;
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
};
