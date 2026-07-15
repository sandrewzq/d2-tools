import {
  getVendorDetailHashes,
  selectVendorsPageModel,
  type VendorsPageWorkspace
} from "@d2-tools/app/vendors";
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
  const requestContextKeyRef = useRef("__initial__");
  const requestSequenceRef = useRef(0);

  const characterId = input.selectedCharacterId
    || input.accountSummary?.characters[0]?.character_id
    || "";
  const requestContextKey = input.accountSummary && characterId
    ? `${input.accountSummary.membership_type}:${input.accountSummary.destiny_membership_id}:${characterId}`
    : "";
  const selectedVendorHash = selectVendorHash(snapshot, selectedVendorId);
  const selectedDetailVendorHashes = useMemo(
    () => expandVendorDetailHashes(selectedVendorHash, snapshot),
    [selectedVendorHash, snapshot]
  );

  const refresh = useCallback(async () => {
    if (!input.accountSummary || !characterId) return;
    const requestSequence = ++requestSequenceRef.current;
    const currentSnapshot = snapshot;
    const request = createVendorInventoryRequest(
      input.accountSummary,
      characterId,
      selectedDetailVendorHashes
    );
    setRefreshState("refreshing");
    setRefreshError("");
    try {
      const next = await input.loadInventory(request);
      if (requestSequence !== requestSequenceRef.current || requestContextKey !== requestContextKeyRef.current) return;
      if (currentSnapshot) {
        const resolved = resolveVendorRefreshState(currentSnapshot, next);
        setSnapshot(resolved.snapshot);
        setStatusMessage(resolved.statusMessage ?? "");
      } else {
        setSnapshot(next);
        setStatusMessage("");
      }
      setRefreshState("idle");
    } catch (error) {
      if (requestSequence !== requestSequenceRef.current || requestContextKey !== requestContextKeyRef.current) return;
      if (currentSnapshot) {
        const resolved = resolveVendorRefreshState(currentSnapshot, null, error);
        setSnapshot(resolved.snapshot);
        setRefreshState(resolved.refreshState);
        setRefreshError(resolved.refreshError ?? "");
      } else {
        setRefreshState("failed");
        setRefreshError(error instanceof Error ? error.message : "商人数据读取失败");
      }
    }
  }, [characterId, input.accountSummary, input.loadInventory, requestContextKey, selectedDetailVendorHashes, snapshot]);

  useEffect(() => {
    if (requestContextKey === requestContextKeyRef.current) return;
    requestContextKeyRef.current = requestContextKey;
    const requestSequence = ++requestSequenceRef.current;
    setSnapshot(null);
    setRefreshError("");
    setStatusMessage("");

    if (!input.accountSummary || !characterId) {
      setRefreshState("idle");
      return;
    }

    setRefreshState("refreshing");
    void input.loadInventory(createVendorInventoryRequest(input.accountSummary, characterId, []))
      .then((next) => {
        if (requestSequence !== requestSequenceRef.current || requestContextKey !== requestContextKeyRef.current) return;
        setSnapshot(next);
        setRefreshState("idle");
      })
      .catch((error) => {
        if (requestSequence !== requestSequenceRef.current || requestContextKey !== requestContextKeyRef.current) return;
        setRefreshState("failed");
        setRefreshError(error instanceof Error ? error.message : "商人数据读取失败");
      });
  }, [characterId, input.accountSummary, input.loadInventory, requestContextKey]);

  useEffect(() => {
    if (!input.accountSummary || !characterId || !snapshot || !selectedDetailVendorHashes.length) return;
    if (
      snapshot.detailVendorHashes === undefined
      || selectedDetailVendorHashes.every((vendorHash) => snapshot.detailVendorHashes?.includes(vendorHash))
    ) return;

    const requestSequence = ++requestSequenceRef.current;
    setRefreshState("refreshing");
    setRefreshError("");
    void input.loadInventory(createVendorInventoryRequest(
      input.accountSummary,
      characterId,
      selectedDetailVendorHashes
    )).then((next) => {
      if (requestSequence !== requestSequenceRef.current || requestContextKey !== requestContextKeyRef.current) return;
      const resolved = resolveVendorRefreshState(snapshot, next);
      setSnapshot(resolved.snapshot);
      setStatusMessage(resolved.statusMessage ?? "");
      setRefreshState("idle");
    }).catch((error) => {
      if (requestSequence !== requestSequenceRef.current || requestContextKey !== requestContextKeyRef.current) return;
      const resolved = resolveVendorRefreshState(snapshot, null, error);
      setSnapshot(resolved.snapshot);
      setRefreshState(resolved.refreshState);
      setRefreshError(resolved.refreshError ?? "");
    });
  }, [characterId, input.accountSummary, input.loadInventory, requestContextKey, selectedDetailVendorHashes, snapshot]);

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

function createVendorInventoryRequest(
  account: AccountSummary,
  characterId: string,
  detailVendorHashes: number[]
): VendorInventoryRequest {
  return {
    membership_type: account.membership_type,
    membership_id: account.destiny_membership_id,
    character_ids: [characterId],
    detail_vendor_hashes: detailVendorHashes
  };
}

function selectVendorHash(
  snapshot: VendorInventorySnapshot | null,
  selectedVendorId: string | undefined
): number | undefined {
  if (!snapshot) return undefined;
  return snapshot.vendors.find((vendor) => vendor.id === selectedVendorId)?.vendorHash
    ?? snapshot.vendors.find((vendor) => vendor.vendorHash === 2190858386)?.vendorHash
    ?? snapshot.vendors[0]?.vendorHash;
}

function expandVendorDetailHashes(
  vendorHash: number | undefined,
  snapshot: VendorInventorySnapshot | null
): number[] {
  if (vendorHash === undefined) return [];
  return getVendorDetailHashes(
    vendorHash,
    snapshot?.vendors ?? []
  );
}
