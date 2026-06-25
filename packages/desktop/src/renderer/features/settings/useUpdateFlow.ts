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

  return {
    updateSnapshot,
    settingsMessage,
    settingsError,
    setSettingsMessage,
    setSettingsError,
    checkForUpdates,
    downloadUpdate,
    quitAndInstallUpdate
  };
}
