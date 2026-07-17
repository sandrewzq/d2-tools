import { useSyncExternalStore } from "react";
import {
  getManifestStatusSnapshot,
  initializeManifest,
  refreshManifestStatus,
  repairManifest,
  subscribeManifestStatus
} from "../stores/manifestStatusStore";

export function useManifestStatus() {
  const snapshot = useSyncExternalStore(
    subscribeManifestStatus,
    getManifestStatusSnapshot,
    getManifestStatusSnapshot
  );

  return {
    initializeManifest,
    repairManifest,
    isInitializingManifest: snapshot.isInitializingManifest,
    isLoadingManifestStatus: snapshot.isLoadingManifestStatus,
    manifestStatus: snapshot.manifestStatus,
    manifestStatusError: snapshot.manifestStatusError,
    refreshManifestStatus
  };
}
