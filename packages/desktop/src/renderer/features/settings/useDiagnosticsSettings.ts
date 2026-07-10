import { api } from "../../api/client";
import type { ActionLogEntry } from "../../api/types";
import {
  copyActionDiagnostic,
  copyDataBackupGuide,
  copyDiagnosticsExport,
  createDiagnosticsSettingsModel,
  loadActionLog
} from "./diagnosticsModel";
import {
  useActionLogState,
  useAiWriteSettingsState,
  useColorModeState,
  useDiagnosticsStatusState,
  useLanguagePreferencesState
} from "./useDiagnosticsSettingsState";
import { useUpdateFlow } from "./useUpdateFlow";
import { useBackgroundTasks } from "../../shared/hooks/useBackgroundTasks";
import { useManifestStatus } from "../../shared/hooks/useManifestStatus";

export function useDiagnosticsSettings(input: {
  onConfigChanged: () => void;
  initialColorMode?: "light" | "dark";
  initialLanguagePreferences?: {
    interfaceLocale: "zh-CN" | "en-US";
    bungieLocale: string;
    followInterfaceLocaleForBungie: boolean;
  };
}) {
  const diagnosticsStatus = useDiagnosticsStatusState();
  const aiWriteSettings = useAiWriteSettingsState();
  const actionLogState = useActionLogState();
  const updateFlow = useUpdateFlow();
  const backgroundTaskState = useBackgroundTasks();
  const manifestStatusState = useManifestStatus();
  const colorModeState = useColorModeState(input.initialColorMode);
  const languagePreferencesState = useLanguagePreferencesState(normalizeInitialLanguagePreferences(input.initialLanguagePreferences));

  const settingsModel = createDiagnosticsSettingsModel({
    onConfigChanged: input.onConfigChanged,
    setDiagnosticDataDir: diagnosticsStatus.setDiagnosticDataDir,
    setDiagnosticManifestVersion: diagnosticsStatus.setDiagnosticManifestVersion,
    setDiagnosticError: diagnosticsStatus.setDiagnosticError,
    setIsRefreshingDiagnostics: diagnosticsStatus.setIsRefreshingDiagnostics,
    setAiSettings: aiWriteSettings.setAiSettings,
    setWriteActionsEnabled: aiWriteSettings.setWriteActionsEnabled,
    setColorMode: colorModeState.setColorMode,
    setLanguagePreferences: languagePreferencesState.setLanguagePreferences,
    setActionLog: actionLogState.setActionLog,
    setSettingsMessage: updateFlow.setSettingsMessage,
    setSettingsError: updateFlow.setSettingsError
  });

  return {
    actionLog: actionLogState.actionLog,
    actionLogResultFilter: actionLogState.actionLogResultFilter,
    actionLogTypeFilter: actionLogState.actionLogTypeFilter,
    aiSettings: aiWriteSettings.aiSettings,
    activeBackgroundTasks: backgroundTaskState.activeBackgroundTasks,
    backgroundTasks: backgroundTaskState.backgroundTasks,
    checkForUpdates: updateFlow.checkForUpdates,
    copyActionDiagnostic: (entry: ActionLogEntry) => copyActionDiagnostic(entry, updateFlow.setSettingsMessage, updateFlow.setSettingsError),
    copyDataBackupGuide: () => copyDataBackupGuide(diagnosticsStatus.diagnosticDataDir, updateFlow.setSettingsMessage, updateFlow.setSettingsError),
    copyDiagnosticsExport: () => copyDiagnosticsExport(updateFlow.setSettingsMessage, updateFlow.setSettingsError),
    copyUpdateDiagnostic: updateFlow.copyUpdateDiagnostic,
    exportConfig: () => runConfigBackupAction(api.exportConfig, updateFlow.setSettingsMessage, updateFlow.setSettingsError),
    importConfig: () => runConfigBackupAction(api.importConfig, updateFlow.setSettingsMessage, updateFlow.setSettingsError),
    clearCache: () => runConfigBackupAction(api.clearCache, updateFlow.setSettingsMessage, updateFlow.setSettingsError),
    diagnosticDataDir: diagnosticsStatus.diagnosticDataDir,
    diagnosticError: diagnosticsStatus.diagnosticError,
    diagnosticManifestVersion: diagnosticsStatus.diagnosticManifestVersion,
    downloadUpdate: updateFlow.downloadUpdate,
    handleAiSettingsSaved: settingsModel.handleAiSettingsSaved,
    colorMode: colorModeState.colorMode,
    languagePreferences: languagePreferencesState.languagePreferences,
    isRefreshingDiagnostics: diagnosticsStatus.isRefreshingDiagnostics,
    initializeManifest: manifestStatusState.initializeManifest,
    isInitializingManifest: manifestStatusState.isInitializingManifest,
    isLoadingManifestStatus: manifestStatusState.isLoadingManifestStatus,
    loadActionLog: () => loadActionLog(actionLogState.setActionLog, updateFlow.setSettingsError),
    manifestStatus: manifestStatusState.manifestStatus,
    manifestStatusError: manifestStatusState.manifestStatusError,
    openUpdateDownloadPage: updateFlow.openUpdateDownloadPage,
    quitAndInstallUpdate: updateFlow.quitAndInstallUpdate,
    refreshManifestStatus: manifestStatusState.refreshManifestStatus,
    repairManifest: manifestStatusState.repairManifest,
    refreshDiagnostics: settingsModel.refreshDiagnostics,
    saveWriteActionsEnabled: settingsModel.saveWriteActionsEnabled,
    saveLanguagePreferences: settingsModel.saveLanguagePreferences,
    toggleColorMode: () => settingsModel.saveColorMode(colorModeState.colorMode === "light" ? "dark" : "light"),
    toggleInterfaceLocale: () => {
      const interfaceLocale = languagePreferencesState.languagePreferences.interfaceLocale === "zh-CN" ? "en-US" : "zh-CN";
      const bungieLocale = languagePreferencesState.languagePreferences.followInterfaceLocaleForBungie
        ? interfaceLocaleToBungieLocale(interfaceLocale)
        : languagePreferencesState.languagePreferences.bungieLocale;
      return settingsModel.saveLanguagePreferences({
        ...languagePreferencesState.languagePreferences,
        interfaceLocale,
        bungieLocale
      });
    },
    setActionLogResultFilter: actionLogState.setActionLogResultFilter,
    setActionLogTypeFilter: actionLogState.setActionLogTypeFilter,
    setWriteActionsEnabled: aiWriteSettings.setWriteActionsEnabled,
    settingsError: updateFlow.settingsError,
    settingsMessage: updateFlow.settingsMessage,
    latestBackgroundTask: backgroundTaskState.latestBackgroundTask,
    updateSnapshot: updateFlow.updateSnapshot,
    writeActionsEnabled: aiWriteSettings.writeActionsEnabled
  };
}

function normalizeInitialLanguagePreferences(input: {
  interfaceLocale: "zh-CN" | "en-US";
  bungieLocale: string;
  followInterfaceLocaleForBungie: boolean;
} | undefined) {
  if (!input) return undefined;
  return {
    interfaceLocale: input.interfaceLocale,
    bungieLocale: input.bungieLocale === "en" ? "en" as const : "zh-chs" as const,
    followInterfaceLocaleForBungie: input.followInterfaceLocaleForBungie
  };
}

function interfaceLocaleToBungieLocale(locale: "zh-CN" | "en-US"): "zh-chs" | "en" {
  return locale === "en-US" ? "en" : "zh-chs";
}

async function runConfigBackupAction(
  action: () => Promise<{ ok: true; message: string; path?: string }>,
  setSettingsMessage: (message: string) => void,
  setSettingsError: (message: string) => void
): Promise<void> {
  setSettingsMessage("");
  setSettingsError("");

  try {
    const result = await action();
    setSettingsMessage(result.message);
  } catch (error) {
    setSettingsError(error instanceof Error ? error.message : "配置操作失败");
  }
}
