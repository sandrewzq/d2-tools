import { useEffect, useState } from "react";
import { api } from "../../api/client";
import type { ManifestStatus } from "../../api/types";

export function useManifestStatus() {
  const [manifestStatus, setManifestStatus] = useState<ManifestStatus | null>(null);
  const [manifestStatusError, setManifestStatusError] = useState("");
  const [isLoadingManifestStatus, setIsLoadingManifestStatus] = useState(false);
  const [isInitializingManifest, setIsInitializingManifest] = useState(false);

  useEffect(() => {
    void loadManifestStatus(false);
  }, []);

  async function loadManifestStatus(forceCheck: boolean) {
    setIsLoadingManifestStatus(true);
    setManifestStatusError("");
    try {
      setManifestStatus(await api.getManifestStatus({ forceCheck }));
    } catch (error) {
      setManifestStatusError(error instanceof Error ? error.message : "资料库状态读取失败");
    } finally {
      setIsLoadingManifestStatus(false);
    }
  }

  async function refreshManifestStatus() {
    return loadManifestStatus(true);
  }

  async function initializeManifest() {
    return updateManifest(false);
  }

  async function repairManifest() {
    return updateManifest(true);
  }

  async function updateManifest(repair: boolean) {
    setIsInitializingManifest(true);
    setManifestStatusError("");
    try {
      setManifestStatus(await (repair ? api.repairManifest() : api.initializeManifest()));
    } catch (error) {
      setManifestStatusError(error instanceof Error ? error.message : "资料库更新启动失败");
    } finally {
      setIsInitializingManifest(false);
      void loadManifestStatus(false);
    }
  }

  return {
    initializeManifest,
    repairManifest,
    isInitializingManifest,
    isLoadingManifestStatus,
    manifestStatus,
    manifestStatusError,
    refreshManifestStatus
  };
}
