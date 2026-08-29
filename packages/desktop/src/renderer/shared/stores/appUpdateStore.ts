import { api } from "../../api/client";
import type { AppUpdateSnapshot } from "../../api/types";

type Listener = () => void;

let snapshot: AppUpdateSnapshot | null = null;
let started = false;
const listeners = new Set<Listener>();

export function getAppUpdateSnapshot(): AppUpdateSnapshot | null {
  ensureAppUpdateStoreStarted();
  return snapshot;
}

export function subscribeAppUpdate(listener: Listener): () => void {
  ensureAppUpdateStoreStarted();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function ensureAppUpdateStoreStarted(): void {
  if (started) return;
  started = true;

  void api.getUpdateStatus()
    .then((nextSnapshot) => publish(nextSnapshot))
    .catch(() => undefined);

  api.onUpdateStatusChanged((nextSnapshot) => {
    publish(nextSnapshot);
  });
}

export function publishAppUpdateSnapshot(nextSnapshot: AppUpdateSnapshot): void {
  publish(nextSnapshot);
}

function publish(nextSnapshot: AppUpdateSnapshot): void {
  snapshot = nextSnapshot;
  for (const listener of listeners) {
    listener();
  }
}
