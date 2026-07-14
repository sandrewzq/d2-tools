import { useEffect, useState } from "react";
import { api } from "../../api/client";
import type { AppUpdateSnapshot } from "../../api/types";

export function useAppUpdateFlow() {
  const [appUpdateSnapshot, setAppUpdateSnapshot] = useState<AppUpdateSnapshot | null>(null);
  const [settingsMessage, setSettingsMessage] = useState("");
  const [settingsError, setSettingsError] = useState("");

  useEffect(() => {
    let mounted = true;
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
  }, []);

  async function checkAppUpdate() {
    setSettingsMessage("");
    setSettingsError("");
    try {
      setAppUpdateSnapshot(await api.checkForUpdates());
    } catch (error) {
      setSettingsError(error instanceof Error ? error.message : "更新检查失败");
    }
  }

  async function downloadAppUpdate() {
    setSettingsMessage("");
    setSettingsError("");
    try {
      setAppUpdateSnapshot(await api.downloadUpdate());
    } catch (error) {
      setSettingsError(error instanceof Error ? error.message : "更新下载失败");
    }
  }

  async function quitAndInstallAppUpdate() {
    setSettingsMessage("");
    setSettingsError("");
    try {
      await api.quitAndInstallUpdate();
    } catch (error) {
      setSettingsError(error instanceof Error ? error.message : "重启安装失败");
    }
  }

  async function openAppUpdateDownloadPage() {
    setSettingsMessage("");
    setSettingsError("");
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
