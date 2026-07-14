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
import { useAppUpdateFlow } from "./useAppUpdateFlow";
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
  const appUpdateFlow = useAppUpdateFlow();
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
    setSettingsMessage: appUpdateFlow.setSettingsMessage,
    setSettingsError: appUpdateFlow.setSettingsError
  });

  return {
    actionLog: actionLogState.actionLog,
    actionLogResultFilter: actionLogState.actionLogResultFilter,
    actionLogTypeFilter: actionLogState.actionLogTypeFilter,
    aiSettings: aiWriteSettings.aiSettings,
    activeBackgroundTasks: backgroundTaskState.activeBackgroundTasks,
    backgroundTasks: backgroundTaskState.backgroundTasks,
    checkAppUpdate: appUpdateFlow.checkAppUpdate,
    copyActionDiagnostic: (entry: ActionLogEntry) => copyActionDiagnostic(entry, appUpdateFlow.setSettingsMessage, appUpdateFlow.setSettingsError),
    copyDataBackupGuide: () => copyDataBackupGuide(diagnosticsStatus.diagnosticDataDir, appUpdateFlow.setSettingsMessage, appUpdateFlow.setSettingsError),
    copyDiagnosticsExport: () => copyDiagnosticsExport(appUpdateFlow.setSettingsMessage, appUpdateFlow.setSettingsError),
    copyAppUpdateDiagnostic: appUpdateFlow.copyAppUpdateDiagnostic,
    exportConfig: () => runConfigBackupAction(api.exportConfig, appUpdateFlow.setSettingsMessage, appUpdateFlow.setSettingsError),
    importConfig: () => runConfigBackupAction(api.importConfig, appUpdateFlow.setSettingsMessage, appUpdateFlow.setSettingsError),
    clearCache: () => runConfigBackupAction(api.clearCache, appUpdateFlow.setSettingsMessage, appUpdateFlow.setSettingsError),
    diagnosticDataDir: diagnosticsStatus.diagnosticDataDir,
    diagnosticError: diagnosticsStatus.diagnosticError,
    diagnosticManifestVersion: diagnosticsStatus.diagnosticManifestVersion,
    downloadAppUpdate: appUpdateFlow.downloadAppUpdate,
    handleAiSettingsSaved: settingsModel.handleAiSettingsSaved,
    colorMode: colorModeState.colorMode,
    languagePreferences: languagePreferencesState.languagePreferences,
    isRefreshingDiagnostics: diagnosticsStatus.isRefreshingDiagnostics,
    initializeManifest: manifestStatusState.initializeManifest,
    isInitializingManifest: manifestStatusState.isInitializingManifest,
    isLoadingManifestStatus: manifestStatusState.isLoadingManifestStatus,
    loadActionLog: () => loadActionLog(actionLogState.setActionLog, appUpdateFlow.setSettingsError),
    manifestStatus: manifestStatusState.manifestStatus,
    manifestStatusError: manifestStatusState.manifestStatusError,
    openAppUpdateDownloadPage: appUpdateFlow.openAppUpdateDownloadPage,
    quitAndInstallAppUpdate: appUpdateFlow.quitAndInstallAppUpdate,
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
    settingsError: appUpdateFlow.settingsError,
    settingsMessage: appUpdateFlow.settingsMessage,
    latestBackgroundTask: backgroundTaskState.latestBackgroundTask,
    appUpdateSnapshot: appUpdateFlow.appUpdateSnapshot,
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
