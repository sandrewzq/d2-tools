import {
  SettingsPageContentView,
  type InterfaceLocale,
  type SettingsActionLogResultFilter,
  type SettingsActionLogTypeFilter,
  type SettingsBungieConfigInput
} from "@d2-tools/ui";
import { api } from "../../api/client";
import type { AccountSummary, ActionLogEntry, BackgroundTaskSnapshot, ManifestStatus, UpdateSnapshot } from "../../api/types";
import { AiSettingsPanel } from "../../components/AiSettingsPanel";
import type { LanguagePreferences } from "./diagnosticsModel";

export type { SettingsActionLogResultFilter, SettingsActionLogTypeFilter };

export function SettingsPage(props: {
  interfaceLocale?: InterfaceLocale;
  message: string;
  error: string;
  diagnosticDataDir: string;
  writeActionsEnabled: boolean;
  updateSnapshot: UpdateSnapshot | null;
  manifestStatus: ManifestStatus | null;
  manifestStatusError: string;
  isLoadingManifestStatus: boolean;
  isInitializingManifest: boolean;
  accountSummary: AccountSummary | null;
  accountError: string;
  isLoadingAccount: boolean;
  lastAccountLoadedAt: Date | null;
  isAiConfigured: boolean;
  onRefreshAccount: () => void;
  onReauthorizeAccount: () => void;
  backgroundTasks: BackgroundTaskSnapshot[];
  actionLog: ActionLogEntry[];
  actionLogResultFilter: SettingsActionLogResultFilter;
  actionLogTypeFilter: SettingsActionLogTypeFilter;
  onAiSettingsSaved: () => void;
  onOpenDataDir: () => void;
  onWriteActionsEnabledChange: (enabled: boolean) => void;
  onCheckForUpdates: () => void;
  onDownloadUpdate: () => void;
  onQuitAndInstallUpdate: () => void;
  onOpenUpdateDownloadPage: () => void;
  onCopyUpdateDiagnostic: () => void;
  onRefreshManifestStatus: () => void;
  onInitializeManifest: () => void;
  onRepairManifest: () => void;
  onExportConfig: () => void;
  onImportConfig: () => void;
  onClearCache: () => void;
  onCopyDataBackupGuide: () => void;
  onCopyDiagnosticsExport: () => void;
  onRefreshDiagnostics: () => void;
  onRefreshActionLog: () => void;
  onActionLogResultFilterChange: (filter: SettingsActionLogResultFilter) => void;
  onActionLogTypeFilterChange: (filter: SettingsActionLogTypeFilter) => void;
  onCopyActionDiagnostic: (entry: ActionLogEntry) => void;
  languagePreferences: LanguagePreferences;
  onLanguagePreferencesChange: (preferences: LanguagePreferences) => void;
}) {
  const initialSection = ((import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env?.VITE_D2_VISUAL_SETTINGS_SECTION ?? "overview") as Parameters<typeof SettingsPageContentView>[0]["initialSection"];

  return (
    <SettingsPageContentView
      {...props}
      initialSection={initialSection}
      aiSettingsPanel={<AiSettingsPanel onSaved={props.onAiSettingsSaved} />}
      onLoadBungieConfig={() => api.getConfig()}
      onSaveBungieConfig={saveBungieConfig}
    />
  );
}

async function saveBungieConfig(bungie: SettingsBungieConfigInput): Promise<void> {
  const current = await api.getConfig();
  await api.saveConfig({
    ...current,
    bungie: {
      ...current.bungie,
      ...bungie
    }
  });
}
