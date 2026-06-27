import { useState } from "react";
import type { ActionLogEntry, D2Config } from "../../api/client";
import { createDiagnosticsSettingsState } from "./diagnosticsModel";

export function useDiagnosticsStatusState() {
  const initialState = createDiagnosticsSettingsState();
  const [diagnosticDataDir, setDiagnosticDataDir] = useState(initialState.diagnosticDataDir);
  const [diagnosticManifestVersion, setDiagnosticManifestVersion] = useState<string | undefined>(
    initialState.diagnosticManifestVersion
  );
  const [diagnosticError, setDiagnosticError] = useState(initialState.diagnosticError);
  const [isRefreshingDiagnostics, setIsRefreshingDiagnostics] = useState(initialState.isRefreshingDiagnostics);

  return {
    diagnosticDataDir,
    diagnosticManifestVersion,
    diagnosticError,
    isRefreshingDiagnostics,
    setDiagnosticDataDir,
    setDiagnosticManifestVersion,
    setDiagnosticError,
    setIsRefreshingDiagnostics
  };
}

export function useAiWriteSettingsState() {
  const initialState = createDiagnosticsSettingsState();
  const [aiSettings, setAiSettings] = useState<D2Config["ai"]>(initialState.aiSettings);
  const [writeActionsEnabled, setWriteActionsEnabled] = useState(initialState.writeActionsEnabled);

  return {
    aiSettings,
    writeActionsEnabled,
    setAiSettings,
    setWriteActionsEnabled
  };
}

export function useActionLogState() {
  const initialState = createDiagnosticsSettingsState();
  const [actionLog, setActionLog] = useState<ActionLogEntry[]>(initialState.actionLog);
  const [actionLogResultFilter, setActionLogResultFilter] = useState<"all" | "success" | "failed">(
    initialState.actionLogResultFilter
  );
  const [actionLogTypeFilter, setActionLogTypeFilter] = useState<ActionLogEntry["action"] | "all">(
    initialState.actionLogTypeFilter
  );

  return {
    actionLog,
    actionLogResultFilter,
    actionLogTypeFilter,
    setActionLog,
    setActionLogResultFilter,
    setActionLogTypeFilter
  };
}
