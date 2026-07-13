import { selectVendorsPageModel, type VendorsPageWorkspace } from "@d2-tools/app";
import type { AccountSummary } from "../../api/types";
import type {
  VendorInventoryRequest,
  VendorInventorySnapshot
} from "../../api/vendorsApi";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type VendorRefreshState = {
  snapshot: VendorInventorySnapshot;
  refreshState: "idle" | "failed";
  refreshError?: string;
  statusMessage?: string;
};

export function resolveVendorRefreshState(
  cached: VendorInventorySnapshot,
  refreshed: VendorInventorySnapshot | null,
  error?: unknown
): VendorRefreshState {
  if (error || !refreshed) {
    return {
      snapshot: cached,
      refreshState: "failed",
      refreshError: error instanceof Error ? error.message : "商人数据刷新失败"
    };
  }
  const armorerChanged = Object.keys(refreshed.characterContexts).some((characterId) =>
    refreshed.characterContexts[characterId]?.armorerModHash
      !== cached.characterContexts[characterId]?.armorerModHash
  );
  return {
    snapshot: refreshed,
    refreshState: "idle",
    statusMessage: armorerChanged ? "已按当前机灵模组更新商人属性" : undefined
  };
}

export function useVendorsWorkspace(input: {
  accountSummary: AccountSummary | null;
  selectedCharacterId: string;
  active: boolean;
  loadInventory: (input: VendorInventoryRequest) => Promise<VendorInventorySnapshot>;
}) {
  const [snapshot, setSnapshot] = useState<VendorInventorySnapshot | null>(null);
  const [refreshState, setRefreshState] = useState<"idle" | "refreshing" | "failed">("idle");
  const [refreshError, setRefreshError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [selectedVendorId, setSelectedVendorId] = useState<string | undefined>("vendor-2190858386");
  const wasActiveRef = useRef(false);
  const requestContextKeyRef = useRef("");
  const requestSequenceRef = useRef(0);

  const refresh = useCallback(async (options?: { preserveCache?: boolean }) => {
    if (!input.accountSummary) return;
    const characterId = input.selectedCharacterId
      || input.accountSummary.characters[0]?.character_id;
    if (!characterId) return;
    const requestSequence = ++requestSequenceRef.current;
    const cachedSnapshot = options?.preserveCache === false ? null : snapshot;
    const request: VendorInventoryRequest = {
      membership_type: input.accountSummary.membership_type,
      membership_id: input.accountSummary.destiny_membership_id,
      character_ids: [characterId]
    };
    setRefreshState("refreshing");
    setRefreshError("");
    try {
      const next = await input.loadInventory(request);
      if (requestSequence !== requestSequenceRef.current) return;
      if (cachedSnapshot) {
        const resolved = resolveVendorRefreshState(cachedSnapshot, next);
        setSnapshot(resolved.snapshot);
        setStatusMessage(resolved.statusMessage ?? "");
      } else {
        setSnapshot(next);
      }
      setRefreshState("idle");
    } catch (error) {
      if (requestSequence !== requestSequenceRef.current) return;
      if (cachedSnapshot) {
        const resolved = resolveVendorRefreshState(cachedSnapshot, null, error);
        setSnapshot(resolved.snapshot);
        setRefreshState(resolved.refreshState);
        setRefreshError(resolved.refreshError ?? "");
      } else {
        setRefreshState("failed");
        setRefreshError(error instanceof Error ? error.message : "商人数据读取失败");
      }
    }
  }, [input.accountSummary, input.loadInventory, input.selectedCharacterId, snapshot]);

  useEffect(() => {
    const accountKey = input.accountSummary
      ? `${input.accountSummary.membership_type}:${input.accountSummary.destiny_membership_id}`
      : "";
    const characterId = input.selectedCharacterId
      || input.accountSummary?.characters[0]?.character_id
      || "";
    const requestContextKey = accountKey && characterId
      ? `${accountKey}:${characterId}`
      : accountKey;
    const enteredPage = input.active && !wasActiveRef.current;
    const requestContextChanged = requestContextKey !== requestContextKeyRef.current;
    wasActiveRef.current = input.active;
    requestContextKeyRef.current = requestContextKey;

    if (requestContextChanged) {
      requestSequenceRef.current += 1;
      setSnapshot(null);
      setRefreshState("idle");
      setRefreshError("");
      setStatusMessage("");
    }
    if (!input.active || !input.accountSummary || !characterId || (!enteredPage && !requestContextChanged)) return;
    void refresh({ preserveCache: !requestContextChanged });
  }, [input.active, input.accountSummary, refresh]);

  const model: VendorsPageWorkspace = useMemo(() => selectVendorsPageModel({
    snapshot,
    account: input.accountSummary,
    scope: input.selectedCharacterId
      ? { kind: "character", characterId: input.selectedCharacterId }
      : { kind: "account" },
    selectedVendorId,
    refreshState,
    refreshError,
    statusMessage
  }), [input.accountSummary, input.selectedCharacterId, refreshError, refreshState, selectedVendorId, snapshot, statusMessage]);

  return {
    model,
    refresh,
    isRefreshing: refreshState === "refreshing",
    statusMessage,
    selectVendor: setSelectedVendorId
  };
}
