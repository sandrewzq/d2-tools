import { useState } from "react";
import {
  type ActionLogEntry,
  type D2Config
} from "../../api/client";
import {
  copyActionDiagnostic,
  copyDiagnosticsExport,
  createDiagnosticsSettingsModel,
  loadActionLog
} from "./diagnosticsModel";
import { useUpdateFlow } from "./useUpdateFlow";

export function useDiagnosticsSettings(input: {
  onConfigChanged: () => void;
}) {
  const [diagnosticDataDir, setDiagnosticDataDir] = useState("");
  const [diagnosticManifestVersion, setDiagnosticManifestVersion] = useState<string | undefined>();
  const [diagnosticError, setDiagnosticError] = useState("");
  const [isRefreshingDiagnostics, setIsRefreshingDiagnostics] = useState(false);
  const [aiSettings, setAiSettings] = useState<D2Config["ai"]>({
    protocol: "",
    provider: "",
    api_key: "",
    model: "",
    base_url: "",
    enable_lightgg: false,
    force_lightgg: false
  });
  const [writeActionsEnabled, setWriteActionsEnabled] = useState(false);
  const [actionLog, setActionLog] = useState<ActionLogEntry[]>([]);
  const [actionLogResultFilter, setActionLogResultFilter] = useState<"all" | "success" | "failed">("all");
  const [actionLogTypeFilter, setActionLogTypeFilter] = useState<ActionLogEntry["action"] | "all">("all");
  const updateFlow = useUpdateFlow();

  const settingsModel = createDiagnosticsSettingsModel({
    onConfigChanged: input.onConfigChanged,
    setDiagnosticDataDir,
    setDiagnosticManifestVersion,
    setDiagnosticError,
    setIsRefreshingDiagnostics,
    setAiSettings,
    setWriteActionsEnabled,
    setActionLog,
    setSettingsMessage: updateFlow.setSettingsMessage,
    setSettingsError: updateFlow.setSettingsError
  });

  return {
    actionLog,
    actionLogResultFilter,
    actionLogTypeFilter,
    aiSettings,
    checkForUpdates: updateFlow.checkForUpdates,
    copyActionDiagnostic: (entry: ActionLogEntry) => copyActionDiagnostic(entry, updateFlow.setSettingsMessage, updateFlow.setSettingsError),
    copyDiagnosticsExport: () => copyDiagnosticsExport(updateFlow.setSettingsMessage, updateFlow.setSettingsError),
    diagnosticDataDir,
    diagnosticError,
    diagnosticManifestVersion,
    downloadUpdate: updateFlow.downloadUpdate,
    handleAiSettingsSaved: settingsModel.handleAiSettingsSaved,
    isRefreshingDiagnostics,
    loadActionLog: () => loadActionLog(setActionLog, updateFlow.setSettingsError),
    quitAndInstallUpdate: updateFlow.quitAndInstallUpdate,
    refreshDiagnostics: settingsModel.refreshDiagnostics,
    saveWriteActionsEnabled: settingsModel.saveWriteActionsEnabled,
    setActionLogResultFilter,
    setActionLogTypeFilter,
    setWriteActionsEnabled,
    settingsError: updateFlow.settingsError,
    settingsMessage: updateFlow.settingsMessage,
    updateSnapshot: updateFlow.updateSnapshot,
    writeActionsEnabled
  };
}
