import { useEffect, useState, useSyncExternalStore } from "react";
import {
  createArmorPlannerWorkspace,
  type ArmorPlannerWorkspaceJob,
  type ArmorPlannerWorkspaceState
} from "@d2-tools/app/armor";
import { api } from "../../api/client.js";
import { createDesktopArmorPlannerClient } from "../../api/armorApi.js";

export type UseArmorPlannerWorkspaceResult = {
  state: ArmorPlannerWorkspaceState;
  plan: (job: ArmorPlannerWorkspaceJob) => void;
  reset: () => void;
};

export function useArmorPlannerWorkspace(): UseArmorPlannerWorkspaceResult {
  const [workspace] = useState(() => createArmorPlannerWorkspace({
    scopeId: `loadouts:${createScopeSuffix()}`,
    client: createDesktopArmorPlannerClient(api)
  }));
  const state = useSyncExternalStore(
    (listener) => workspace.subscribe(() => listener()),
    workspace.getState,
    workspace.getState
  );

  useEffect(() => () => {
    void workspace.invalidate();
  }, [workspace]);

  return {
    state,
    plan(job): void {
      void workspace.plan(job);
    },
    reset(): void {
      workspace.reset();
    }
  };
}

function createScopeSuffix(): string {
  return globalThis.crypto?.randomUUID?.()
    ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}
