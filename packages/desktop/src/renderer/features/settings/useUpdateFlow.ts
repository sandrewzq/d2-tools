import { useEffect, useState } from "react";
import { api, type UpdateSnapshot } from "../../api/client";

export function useUpdateFlow() {
  const [updateSnapshot, setUpdateSnapshot] = useState<UpdateSnapshot | null>(null);
  const [settingsMessage, setSettingsMessage] = useState("");
  const [settingsError, setSettingsError] = useState("");

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

  async function openUpdateDownloadPage() {
    setSettingsMessage("");
    setSettingsError("");
    try {
      await api.openUpdateDownloadPage();
    } catch (error) {
      setSettingsError(error instanceof Error ? error.message : "打开下载页失败");
    }
  }

  async function copyUpdateDiagnostic() {
    setSettingsMessage("");
    setSettingsError("");
    try {
      await navigator.clipboard.writeText(buildUpdateDiagnosticText(updateSnapshot));
      setSettingsMessage("更新诊断已复制。");
    } catch (error) {
      setSettingsError(error instanceof Error ? error.message : "复制更新诊断失败");
    }
  }

  return {
    updateSnapshot,
    settingsMessage,
    settingsError,
    setSettingsMessage,
    setSettingsError,
    checkForUpdates,
    downloadUpdate,
    quitAndInstallUpdate,
    openUpdateDownloadPage,
    copyUpdateDiagnostic
  };
}

function buildUpdateDiagnosticText(snapshot: UpdateSnapshot | null): string {
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
