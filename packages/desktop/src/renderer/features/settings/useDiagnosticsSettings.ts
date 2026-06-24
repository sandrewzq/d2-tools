import { useEffect, useState } from "react";
import {
  api,
  type ActionLogEntry,
  type D2Config,
  type UpdateSnapshot
} from "../../api/client";

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
  const [settingsMessage, setSettingsMessage] = useState("");
  const [settingsError, setSettingsError] = useState("");
  const [actionLog, setActionLog] = useState<ActionLogEntry[]>([]);
  const [actionLogResultFilter, setActionLogResultFilter] = useState<"all" | "success" | "failed">("all");
  const [actionLogTypeFilter, setActionLogTypeFilter] = useState<ActionLogEntry["action"] | "all">("all");
  const [updateSnapshot, setUpdateSnapshot] = useState<UpdateSnapshot | null>(null);

  useEffect(() => {
    let mounted = true;
    void api.getUpdateStatus()
      .then((snapshot) => {
        if (mounted) setUpdateSnapshot(snapshot);
      })
      .catch((error) => {
        if (mounted) {
          setSettingsError(error instanceof Error ? error.message : "更新状态读取失败");
        }
      });

    const unsubscribe = api.onUpdateStatusChanged((snapshot) => {
      setUpdateSnapshot(snapshot);
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  async function refreshDiagnostics() {
    setIsRefreshingDiagnostics(true);
    setDiagnosticError("");

    try {
      const [config, manifest, log] = await Promise.all([
        api.getConfig(),
        api.getManifestStatus(),
        api.getActionLog()
      ]);
      setDiagnosticDataDir(config.data.data_dir);
      setDiagnosticManifestVersion(manifest.version);
      setAiSettings(config.ai);
      setWriteActionsEnabled(config.features.write_actions_enabled);
      setActionLog(log);
    } catch (error) {
      setDiagnosticError(error instanceof Error ? error.message : "状态诊断失败");
    } finally {
      setIsRefreshingDiagnostics(false);
    }
  }

  function handleAiSettingsSaved() {
    input.onConfigChanged();
    void refreshDiagnostics();
  }

  async function copyActionDiagnostic(entry: ActionLogEntry) {
    try {
      await navigator.clipboard.writeText(buildActionDiagnosticText(entry));
      setSettingsMessage("已复制操作诊断");
    } catch {
      setSettingsError("复制失败，请检查系统剪贴板权限");
    }
  }

  async function copyDiagnosticsExport() {
    setSettingsMessage("");
    setSettingsError("");
    try {
      await navigator.clipboard.writeText(await api.exportDiagnostics());
      setSettingsMessage("已复制脱敏诊断导出");
    } catch (error) {
      setSettingsError(error instanceof Error ? error.message : "诊断导出失败");
    }
  }

  async function saveWriteActionsEnabled(enabled: boolean) {
    setSettingsMessage("");
    setSettingsError("");

    try {
      const config = await api.getConfig();
      const nextConfig: D2Config = {
        ...config,
        features: {
          ...config.features,
          write_actions_enabled: enabled
        }
      };
      const saved = await api.saveConfig(nextConfig);
      setWriteActionsEnabled(saved.features.write_actions_enabled);
      setSettingsMessage(enabled
        ? "写操作已开启。执行前仍会再次确认。"
        : "写操作已关闭。");
      input.onConfigChanged();
    } catch (error) {
      setSettingsError(error instanceof Error ? error.message : "写操作设置保存失败");
    }
  }

  async function loadActionLog() {
    try {
      setActionLog(await api.getActionLog());
    } catch (error) {
      setSettingsError(error instanceof Error ? error.message : "操作日志读取失败");
    }
  }

  async function checkForUpdates() {
    setSettingsMessage("");
    setSettingsError("");
    try {
      setUpdateSnapshot(await api.checkForUpdates());
    } catch (error) {
      setSettingsError(error instanceof Error ? error.message : "更新检查失败");
    }
  }

  async function downloadUpdate() {
    setSettingsMessage("");
    setSettingsError("");
    try {
      setUpdateSnapshot(await api.downloadUpdate());
    } catch (error) {
      setSettingsError(error instanceof Error ? error.message : "更新下载失败");
    }
  }

  async function quitAndInstallUpdate() {
    setSettingsMessage("");
    setSettingsError("");
    try {
      await api.quitAndInstallUpdate();
    } catch (error) {
      setSettingsError(error instanceof Error ? error.message : "重启安装失败");
    }
  }

  return {
    actionLog,
    actionLogResultFilter,
    actionLogTypeFilter,
    aiSettings,
    checkForUpdates,
    copyActionDiagnostic,
    copyDiagnosticsExport,
    diagnosticDataDir,
    diagnosticError,
    diagnosticManifestVersion,
    downloadUpdate,
    handleAiSettingsSaved,
    isRefreshingDiagnostics,
    loadActionLog,
    quitAndInstallUpdate,
    refreshDiagnostics,
    saveWriteActionsEnabled,
    setActionLogResultFilter,
    setActionLogTypeFilter,
    setWriteActionsEnabled,
    settingsError,
    settingsMessage,
    updateSnapshot,
    writeActionsEnabled
  };
}

function buildActionDiagnosticText(entry: ActionLogEntry): string {
  return [
    "d2-tools 写操作诊断",
    `时间：${entry.created_at}`,
    `操作：${entry.action}`,
    `结果：${entry.ok ? "成功" : "失败"}`,
    `物品：${entry.item_name ?? "-"}`,
    `物品实例：${entry.item_instance_id ?? "-"}`,
    `角色：${entry.character_id ?? "-"}`,
    `信息：${entry.message ?? "-"}`,
    "",
    "说明：这段诊断不会包含 token、client secret 或 API Key。"
  ].join("\n");
}
