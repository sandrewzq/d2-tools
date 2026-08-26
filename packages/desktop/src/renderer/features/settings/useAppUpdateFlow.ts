import { useEffect, useState } from "react";
import { api } from "../../api/client";
import type { AppUpdateSnapshot, AppUpdateStatus } from "../../api/types";

type VisualAppUpdateStatus = AppUpdateStatus;

export function useAppUpdateFlow() {
  const [appUpdateSnapshot, setAppUpdateSnapshot] = useState<AppUpdateSnapshot | null>(null);
  const [settingsMessage, setSettingsMessage] = useState("");
  const [settingsError, setSettingsError] = useState("");
  const visualUpdateStatus = getVisualAppUpdateStatus();

  useEffect(() => {
    let mounted = true;
    if (visualUpdateStatus) {
      void api.getUpdateStatus()
        .then((snapshot) => {
          if (mounted) setAppUpdateSnapshot(createVisualAppUpdateSnapshot(visualUpdateStatus, snapshot));
        })
        .catch(() => {
          if (mounted) setAppUpdateSnapshot(createVisualAppUpdateSnapshot(visualUpdateStatus));
        });

      return () => {
        mounted = false;
      };
    }

    void api.getUpdateStatus()
      .then((snapshot) => {
        if (mounted) setAppUpdateSnapshot(snapshot);
      })
      .catch((error) => {
        if (mounted) {
          setSettingsError(error instanceof Error ? error.message : "更新状态读取失败");
        }
      });

    const unsubscribe = api.onUpdateStatusChanged((snapshot) => {
      setAppUpdateSnapshot(snapshot);
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [visualUpdateStatus]);

  async function checkAppUpdate() {
    setSettingsMessage("");
    setSettingsError("");
    if (visualUpdateStatus) {
      setAppUpdateSnapshot((snapshot) => createVisualAppUpdateSnapshot("available", snapshot ?? undefined));
      setSettingsMessage("已切换到“发现新版本”模拟状态。");
      return;
    }
    try {
      setAppUpdateSnapshot(await api.checkForUpdates());
    } catch (error) {
      setSettingsError(error instanceof Error ? error.message : "更新检查失败");
    }
  }

  async function downloadAppUpdate() {
    setSettingsMessage("");
    setSettingsError("");
    if (visualUpdateStatus) {
      setAppUpdateSnapshot((snapshot) => createVisualAppUpdateSnapshot("downloading", snapshot ?? undefined));
      setSettingsMessage("已切换到“下载中”模拟状态，不会下载真实安装包。");
      return;
    }
    try {
      setAppUpdateSnapshot(await api.downloadUpdate());
    } catch (error) {
      setSettingsError(error instanceof Error ? error.message : "更新下载失败");
    }
  }

  async function quitAndInstallAppUpdate() {
    setSettingsMessage("");
    setSettingsError("");
    if (visualUpdateStatus) {
      setSettingsMessage("更新模拟模式不会重启或安装应用。");
      return;
    }
    try {
      await api.quitAndInstallUpdate();
    } catch (error) {
      setSettingsError(error instanceof Error ? error.message : "重启安装失败");
    }
  }

  async function openAppUpdateDownloadPage() {
    setSettingsMessage("");
    setSettingsError("");
    if (visualUpdateStatus) {
      setSettingsMessage("更新模拟模式不会打开真实下载页。");
      return;
    }
    try {
      await api.openUpdateDownloadPage();
    } catch (error) {
      setSettingsError(error instanceof Error ? error.message : "打开下载页失败");
    }
  }

  async function copyAppUpdateDiagnostic() {
    setSettingsMessage("");
    setSettingsError("");
    try {
      await navigator.clipboard.writeText(buildAppUpdateDiagnosticText(appUpdateSnapshot));
      setSettingsMessage("更新诊断已复制。");
    } catch (error) {
      setSettingsError(error instanceof Error ? error.message : "复制更新诊断失败");
    }
  }

  return {
    appUpdateSnapshot,
    settingsMessage,
    settingsError,
    setSettingsMessage,
    setSettingsError,
    checkAppUpdate,
    downloadAppUpdate,
    quitAndInstallAppUpdate,
    openAppUpdateDownloadPage,
    copyAppUpdateDiagnostic
  };
}

function getVisualAppUpdateStatus(): VisualAppUpdateStatus | null {
  const env = (import.meta as ImportMeta & { env?: Record<string, string | boolean | undefined> }).env;
  if (String(env?.DEV) !== "true") return null;

  const status = env.VITE_D2_VISUAL_UPDATE_STATUS;
  return status === "idle"
    || status === "checking"
    || status === "available"
    || status === "not_available"
    || status === "downloading"
    || status === "downloaded"
    || status === "error"
    ? status
    : null;
}

function createVisualAppUpdateSnapshot(
  status: VisualAppUpdateStatus,
  base?: AppUpdateSnapshot
): AppUpdateSnapshot {
  const currentVersion = base?.current_version ?? "0.0.15";
  const availableVersion = base?.available_version ?? nextPatchVersion(currentVersion);
  const snapshot: AppUpdateSnapshot = {
    status,
    current_version: currentVersion,
    install_path: base?.install_path ?? "开发环境模拟路径",
    release_page_url: base?.release_page_url ?? "https://github.com/sandrewzq/d2-tools/releases",
    update_source_label: "开发环境模拟",
    last_checked_at: new Date().toISOString()
  };

  if (status === "available" || status === "downloading" || status === "downloaded") {
    snapshot.available_version = availableVersion;
  }
  if (status === "downloading") {
    snapshot.progress_percent = 42;
    snapshot.user_message = "正在模拟下载更新。";
  }
  if (status === "downloaded") {
    snapshot.downloaded_version = availableVersion;
    snapshot.progress_percent = 100;
    snapshot.user_message = "模拟更新已下载，等待重启安装。";
  }
  if (status === "available") {
    snapshot.user_message = `模拟发现新版本 ${availableVersion}。`;
  }
  if (status === "checking") {
    snapshot.user_message = "正在模拟检查更新。";
  }
  if (status === "not_available") {
    snapshot.user_message = "模拟状态：当前已是最新版本。";
  }
  if (status === "idle") {
    snapshot.last_checked_at = undefined;
    snapshot.user_message = "模拟状态：尚未检查更新。";
  }
  if (status === "error") {
    snapshot.error = "模拟更新服务连接失败。";
    snapshot.technical_error = "visual-update-status:error";
    snapshot.user_message = "模拟更新检查失败，可验证错误提示和诊断入口。";
  }

  return snapshot;
}

function nextPatchVersion(version: string): string {
  const normalized = version.replace(/^v/i, "");
  const match = normalized.match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) return "0.0.16";
  return `${match[1]}.${match[2]}.${Number(match[3]) + 1}`;
}

function buildAppUpdateDiagnosticText(snapshot: AppUpdateSnapshot | null): string {
  if (!snapshot) {
    return "d2-tools 更新诊断：尚未读取更新状态。";
  }

  return [
    "d2-tools 更新诊断",
    `状态：${snapshot.status}`,
    `当前版本：${snapshot.current_version}`,
    `可用版本：${snapshot.available_version ?? "-"}`,
    `已下载版本：${snapshot.downloaded_version ?? "-"}`,
    `更新来源：${snapshot.update_source_label}`,
    `发布页：${snapshot.release_page_url}`,
    `上次检查：${snapshot.last_checked_at ?? "-"}`,
    `用户提示：${snapshot.user_message ?? snapshot.error ?? "-"}`,
    `技术错误：${snapshot.technical_error ?? snapshot.error ?? "-"}`,
    `安装位置：${snapshot.install_path}`
  ].join("\n");
}
