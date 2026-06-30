import { api, type ActionLogEntry, type D2Config } from "../../api/client";

export type DiagnosticsBridge = {
  refreshDiagnostics: () => Promise<void>;
};

export function createDiagnosticsSettingsState() {
  return {
    diagnosticDataDir: "",
    diagnosticManifestVersion: undefined as string | undefined,
    diagnosticError: "",
    isRefreshingDiagnostics: false,
    aiSettings: {
      protocol: "",
      provider: "",
      api_key: "",
      model: "",
      base_url: "",
      enable_lightgg: false,
      force_lightgg: false
    } as D2Config["ai"],
    writeActionsEnabled: false,
    colorMode: "light" as D2Config["features"]["color_mode"],
    actionLog: [] as ActionLogEntry[],
    actionLogResultFilter: "all" as "all" | "success" | "failed",
    actionLogTypeFilter: "all" as ActionLogEntry["action"] | "all"
  };
}

export function createDiagnosticsSettingsModel(input: {
  onConfigChanged: () => void;
  setDiagnosticDataDir: (value: string) => void;
  setDiagnosticManifestVersion: (value: string | undefined) => void;
  setDiagnosticError: (value: string) => void;
  setIsRefreshingDiagnostics: (value: boolean) => void;
  setAiSettings: (value: D2Config["ai"]) => void;
  setWriteActionsEnabled: (value: boolean) => void;
  setColorMode: (value: D2Config["features"]["color_mode"]) => void;
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
      input.setColorMode(config.features.color_mode);
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

  async function saveColorMode(mode: D2Config["features"]["color_mode"]) {
    input.setSettingsError("");
    input.setColorMode(mode);

    try {
      const config = await api.getConfig();
      const nextConfig: D2Config = {
        ...config,
        features: {
          ...config.features,
          color_mode: mode
        }
      };
      const saved = await api.saveConfig(nextConfig);
      input.setColorMode(saved.features.color_mode);
      input.onConfigChanged();
    } catch (error) {
      input.setSettingsError(error instanceof Error ? error.message : "颜色模式保存失败");
      void refreshDiagnostics();
    }
  }

  return {
    refreshDiagnostics,
    handleAiSettingsSaved,
    saveWriteActionsEnabled,
    saveColorMode
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

export async function copyDataBackupGuide(
  dataDir: string,
  setSettingsMessage: (value: string) => void,
  setSettingsError: (value: string) => void
) {
  setSettingsMessage("");
  setSettingsError("");
  try {
    await navigator.clipboard.writeText(buildDataBackupGuide(dataDir));
    setSettingsMessage("已复制备份/迁移说明");
  } catch {
    setSettingsError("复制失败，请检查系统剪贴板权限");
  }
}

export function buildDataBackupGuide(dataDir: string): string {
  const normalizedDataDir = dataDir || "当前未读取到数据目录，请先刷新诊断状态";
  return [
    "d2-tools 数据备份与迁移",
    "",
    `数据目录：${normalizedDataDir}`,
    "",
    "备份：",
    "1. 关闭 d2-tools 后复制整个数据目录。",
    "2. 把复制出来的目录保存到安全位置，例如外置硬盘、网盘或版本归档目录。",
    "3. 备份后再安装新版或迁移电脑。",
    "",
    "恢复 / 迁移：",
    "1. 在目标电脑安装并首次启动 d2-tools，让程序创建数据目录。",
    "2. 关闭 d2-tools。",
    "3. 用备份目录覆盖目标电脑的数据目录。",
    "4. 重新启动 d2-tools，检查 Bungie 配置、Manifest、愿望单、本地标签、目标规则和操作日志。",
    "",
    "诊断：",
    "设置页的脱敏诊断导出不包含 token、client secret 或 API Key，排查问题时可一并复制。"
  ].join("\n");
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
