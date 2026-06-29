import { useEffect, useState } from "react";
import { api, type ManifestStatus } from "../../api/client";

export function useManifestStatus() {
  const [manifestStatus, setManifestStatus] = useState<ManifestStatus | null>(null);
  const [manifestStatusError, setManifestStatusError] = useState("");
  const [isLoadingManifestStatus, setIsLoadingManifestStatus] = useState(false);
  const [isInitializingManifest, setIsInitializingManifest] = useState(false);

  useEffect(() => {
    void refreshManifestStatus();
  }, []);

  async function refreshManifestStatus() {
    setIsLoadingManifestStatus(true);
    setManifestStatusError("");
    try {
      setManifestStatus(await api.getManifestStatus());
    } catch (error) {
      setManifestStatusError(error instanceof Error ? error.message : "资料库状态读取失败");
    } finally {
      setIsLoadingManifestStatus(false);
    }
  }

  async function initializeManifest() {
    setIsInitializingManifest(true);
    setManifestStatusError("");
    try {
      setManifestStatus(await api.initializeManifest());
    } catch (error) {
      setManifestStatusError(error instanceof Error ? error.message : "资料库更新启动失败");
    } finally {
      setIsInitializingManifest(false);
      void refreshManifestStatus();
    }
  }

  return {
    initializeManifest,
    isInitializingManifest,
    isLoadingManifestStatus,
    manifestStatus,
    manifestStatusError,
    refreshManifestStatus
  };
}
