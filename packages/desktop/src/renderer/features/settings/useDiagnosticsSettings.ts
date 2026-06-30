import type { ActionLogEntry } from "../../api/client";
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
  useDiagnosticsStatusState
} from "./useDiagnosticsSettingsState";
import { useUpdateFlow } from "./useUpdateFlow";
import { useBackgroundTasks } from "../../shared/hooks/useBackgroundTasks";
import { useManifestStatus } from "../../shared/hooks/useManifestStatus";

export function useDiagnosticsSettings(input: {
  onConfigChanged: () => void;
  initialColorMode?: "light" | "dark";
}) {
  const diagnosticsStatus = useDiagnosticsStatusState();
  const aiWriteSettings = useAiWriteSettingsState();
  const actionLogState = useActionLogState();
  const updateFlow = useUpdateFlow();
  const backgroundTaskState = useBackgroundTasks();
  const manifestStatusState = useManifestStatus();
  const colorModeState = useColorModeState(input.initialColorMode);

  const settingsModel = createDiagnosticsSettingsModel({
    onConfigChanged: input.onConfigChanged,
    setDiagnosticDataDir: diagnosticsStatus.setDiagnosticDataDir,
    setDiagnosticManifestVersion: diagnosticsStatus.setDiagnosticManifestVersion,
    setDiagnosticError: diagnosticsStatus.setDiagnosticError,
    setIsRefreshingDiagnostics: diagnosticsStatus.setIsRefreshingDiagnostics,
    setAiSettings: aiWriteSettings.setAiSettings,
    setWriteActionsEnabled: aiWriteSettings.setWriteActionsEnabled,
    setColorMode: colorModeState.setColorMode,
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
    diagnosticDataDir: diagnosticsStatus.diagnosticDataDir,
    diagnosticError: diagnosticsStatus.diagnosticError,
    diagnosticManifestVersion: diagnosticsStatus.diagnosticManifestVersion,
    downloadUpdate: updateFlow.downloadUpdate,
    handleAiSettingsSaved: settingsModel.handleAiSettingsSaved,
    colorMode: colorModeState.colorMode,
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
    refreshDiagnostics: settingsModel.refreshDiagnostics,
    saveWriteActionsEnabled: settingsModel.saveWriteActionsEnabled,
    toggleColorMode: () => settingsModel.saveColorMode(colorModeState.colorMode === "light" ? "dark" : "light"),
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
