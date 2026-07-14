import { api } from "../../api/client";
import type { ActionLogEntry, D2Config } from "../../api/types";

export type DiagnosticsBridge = {
  refreshDiagnostics: () => Promise<void>;
};

export type LanguagePreferences = {
  interfaceLocale: D2Config["features"]["interface_locale"];
  bungieLocale: "zh-chs" | "en";
  followInterfaceLocaleForBungie: boolean;
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
    languagePreferences: {
      interfaceLocale: "zh-CN",
      bungieLocale: "zh-chs",
      followInterfaceLocaleForBungie: true
    } as LanguagePreferences,
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
  setLanguagePreferences: (value: LanguagePreferences) => void;
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
      input.setLanguagePreferences(languagePreferencesFromConfig(config));
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

  async function saveLanguagePreferences(preferences: LanguagePreferences) {
    input.setSettingsMessage("");
    input.setSettingsError("");
    input.setLanguagePreferences(preferences);

    try {
      const config = await api.getConfig();
      const nextConfig: D2Config = {
        ...config,
        data: {
          ...config.data,
          manifest_language: preferences.bungieLocale
        },
        features: {
          ...config.features,
          interface_locale: preferences.interfaceLocale,
          manifest_language_follows_interface: preferences.followInterfaceLocaleForBungie
        }
      };
      const saved = await api.saveConfig(nextConfig);
      input.setLanguagePreferences(languagePreferencesFromConfig(saved));
      input.setSettingsMessage("语言设置已保存，正在后台检查资料库语言数据。");
      input.onConfigChanged();
      await api.getManifestStatus();
    } catch (error) {
      input.setSettingsError(error instanceof Error ? error.message : "语言设置保存失败");
      void refreshDiagnostics();
    }
  }

  return {
    refreshDiagnostics,
    handleAiSettingsSaved,
    saveWriteActionsEnabled,
    saveColorMode,
    saveLanguagePreferences
  };
}

export function languagePreferencesFromConfig(config: D2Config): LanguagePreferences {
  const interfaceLocale = config.features.interface_locale === "en-US" ? "en-US" : "zh-CN";
  return {
    interfaceLocale,
    bungieLocale: config.data.manifest_language === "en" ? "en" : "zh-chs",
    followInterfaceLocaleForBungie: config.features.manifest_language_follows_interface
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
    "推荐备份：",
    "1. 在设置页选择“创建便携备份”。",
    "2. 便携备份包含偏好、愿望单、目标规则、本地标签和配装模板，不包含账号令牌、Bungie/AI 密钥、资料库、缓存或日志。",
    "3. 把备份文件保存到安全位置，再安装新版或迁移电脑。",
    "",
    "恢复 / 迁移：",
    "1. 在目标电脑安装并首次启动 d2-tools。",
    "2. 在设置页选择“恢复便携备份”，确认后应用会先创建本机回滚备份。",
    "3. 重启 d2-tools，重新登录 Bungie，并填写需要的 Bungie/AI 密钥。",
    "4. 检查愿望单、本地标签、目标规则和配装模板。",
    "",
    "高级完整复制：",
    "如需保留账号令牌，可在完全关闭 d2-tools 后复制整个数据目录。该目录包含账号令牌和密钥，只能保存在可信位置。",
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
