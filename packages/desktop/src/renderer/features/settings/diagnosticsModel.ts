import { api, type ActionLogEntry, type D2Config } from "../../api/client";

export type DiagnosticsBridge = {
  refreshDiagnostics: () => Promise<void>;
};

export function createDiagnosticsSettingsModel(input: {
  onConfigChanged: () => void;
  setDiagnosticDataDir: (value: string) => void;
  setDiagnosticManifestVersion: (value: string | undefined) => void;
  setDiagnosticError: (value: string) => void;
  setIsRefreshingDiagnostics: (value: boolean) => void;
  setAiSettings: (value: D2Config["ai"]) => void;
  setWriteActionsEnabled: (value: boolean) => void;
  setActionLog: (value: ActionLogEntry[]) => void;
  setSettingsMessage: (value: string) => void;
  setSettingsError: (value: string) => void;
}) {
  async function refreshDiagnostics() {
    input.setIsRefreshingDiagnostics(true);
    input.setDiagnosticError("");

    try {
      const [config, manifest, log] = await Promise.all([
        api.getConfig(),
        api.getManifestStatus(),
        api.getActionLog()
      ]);
      input.setDiagnosticDataDir(config.data.data_dir);
      input.setDiagnosticManifestVersion(manifest.version);
      input.setAiSettings(config.ai);
      input.setWriteActionsEnabled(config.features.write_actions_enabled);
      input.setActionLog(log);
    } catch (error) {
      input.setDiagnosticError(error instanceof Error ? error.message : "状态诊断失败");
    } finally {
      input.setIsRefreshingDiagnostics(false);
    }
  }

  function handleAiSettingsSaved() {
    input.onConfigChanged();
    void refreshDiagnostics();
  }

  async function saveWriteActionsEnabled(enabled: boolean) {
    input.setSettingsMessage("");
    input.setSettingsError("");

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
      input.setWriteActionsEnabled(saved.features.write_actions_enabled);
      input.setSettingsMessage(enabled
        ? "写操作已开启。执行前仍会再次确认。"
        : "写操作已关闭。");
      input.onConfigChanged();
    } catch (error) {
      input.setSettingsError(error instanceof Error ? error.message : "写操作设置保存失败");
    }
  }

  return {
    refreshDiagnostics,
    handleAiSettingsSaved,
    saveWriteActionsEnabled
  };
}

export async function loadActionLog(setActionLog: (entries: ActionLogEntry[]) => void, setSettingsError: (value: string) => void) {
  try {
    setActionLog(await api.getActionLog());
  } catch (error) {
    setSettingsError(error instanceof Error ? error.message : "操作日志读取失败");
  }
}

export async function copyDiagnosticsExport(setSettingsMessage: (value: string) => void, setSettingsError: (value: string) => void) {
  setSettingsMessage("");
  setSettingsError("");
  try {
    await navigator.clipboard.writeText(await api.exportDiagnostics());
    setSettingsMessage("已复制脱敏诊断导出");
  } catch (error) {
    setSettingsError(error instanceof Error ? error.message : "诊断导出失败");
  }
}

export async function copyActionDiagnostic(entry: ActionLogEntry, setSettingsMessage: (value: string) => void, setSettingsError: (value: string) => void) {
  try {
    await navigator.clipboard.writeText(buildActionDiagnosticText(entry));
    setSettingsMessage("已复制操作诊断");
  } catch {
    setSettingsError("复制失败，请检查系统剪贴板权限");
  }
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
