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
  useDiagnosticsStatusState
} from "./useDiagnosticsSettingsState";
import { useUpdateFlow } from "./useUpdateFlow";

export function useDiagnosticsSettings(input: {
  onConfigChanged: () => void;
}) {
  const diagnosticsStatus = useDiagnosticsStatusState();
  const aiWriteSettings = useAiWriteSettingsState();
  const actionLogState = useActionLogState();
  const updateFlow = useUpdateFlow();

  const settingsModel = createDiagnosticsSettingsModel({
    onConfigChanged: input.onConfigChanged,
    setDiagnosticDataDir: diagnosticsStatus.setDiagnosticDataDir,
    setDiagnosticManifestVersion: diagnosticsStatus.setDiagnosticManifestVersion,
    setDiagnosticError: diagnosticsStatus.setDiagnosticError,
    setIsRefreshingDiagnostics: diagnosticsStatus.setIsRefreshingDiagnostics,
    setAiSettings: aiWriteSettings.setAiSettings,
    setWriteActionsEnabled: aiWriteSettings.setWriteActionsEnabled,
    setActionLog: actionLogState.setActionLog,
    setSettingsMessage: updateFlow.setSettingsMessage,
    setSettingsError: updateFlow.setSettingsError
  });

  return {
    actionLog: actionLogState.actionLog,
    actionLogResultFilter: actionLogState.actionLogResultFilter,
    actionLogTypeFilter: actionLogState.actionLogTypeFilter,
    aiSettings: aiWriteSettings.aiSettings,
    checkForUpdates: updateFlow.checkForUpdates,
    copyActionDiagnostic: (entry: ActionLogEntry) => copyActionDiagnostic(entry, updateFlow.setSettingsMessage, updateFlow.setSettingsError),
    copyDataBackupGuide: () => copyDataBackupGuide(diagnosticsStatus.diagnosticDataDir, updateFlow.setSettingsMessage, updateFlow.setSettingsError),
    copyDiagnosticsExport: () => copyDiagnosticsExport(updateFlow.setSettingsMessage, updateFlow.setSettingsError),
    diagnosticDataDir: diagnosticsStatus.diagnosticDataDir,
    diagnosticError: diagnosticsStatus.diagnosticError,
    diagnosticManifestVersion: diagnosticsStatus.diagnosticManifestVersion,
    downloadUpdate: updateFlow.downloadUpdate,
    handleAiSettingsSaved: settingsModel.handleAiSettingsSaved,
    isRefreshingDiagnostics: diagnosticsStatus.isRefreshingDiagnostics,
    loadActionLog: () => loadActionLog(actionLogState.setActionLog, updateFlow.setSettingsError),
    quitAndInstallUpdate: updateFlow.quitAndInstallUpdate,
    refreshDiagnostics: settingsModel.refreshDiagnostics,
    saveWriteActionsEnabled: settingsModel.saveWriteActionsEnabled,
    setActionLogResultFilter: actionLogState.setActionLogResultFilter,
    setActionLogTypeFilter: actionLogState.setActionLogTypeFilter,
    setWriteActionsEnabled: aiWriteSettings.setWriteActionsEnabled,
    settingsError: updateFlow.settingsError,
    settingsMessage: updateFlow.settingsMessage,
    updateSnapshot: updateFlow.updateSnapshot,
    writeActionsEnabled: aiWriteSettings.writeActionsEnabled
  };
}
