import {
  getVendorDetailHashes,
  selectVendorsPageModel,
  type VendorsPageWorkspace
} from "@d2-tools/app/vendors";
import { isXurActiveAt, nextXurBoundaryAt, xurVendorHash } from "@d2-tools/core/daily/xurSchedule";
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
  loadCachedInventory: (input: VendorInventoryRequest) => Promise<VendorInventorySnapshot | null>;
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
    if (!input.active || !input.accountSummary || !characterId) return;
    const requestSequence = ++requestSequenceRef.current;
    const currentSnapshot = hideInactiveXur(snapshot);
    const request = createVendorInventoryRequest(
      input.accountSummary,
      characterId,
      selectedDetailVendorHashes
    );
    setRefreshState("refreshing");
    setRefreshError("");
    try {
      const next = hideInactiveXur(await input.loadInventory(request));
      if (requestSequence !== requestSequenceRef.current || requestContextKey !== requestContextKeyRef.current) return;
      if (currentSnapshot) {
        if (hasSameVendorInventoryContent(currentSnapshot, next)) {
          setStatusMessage("已检查，商人库存无变化");
          setRefreshState("idle");
          return;
        }
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
  }, [characterId, input.accountSummary, input.active, input.loadInventory, requestContextKey, selectedDetailVendorHashes, snapshot]);

  useEffect(() => {
    if (!input.active) {
      requestSequenceRef.current += 1;
      requestContextKeyRef.current = "__inactive__";
      setRefreshState("idle");
      return;
    }
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
    const request = createVendorInventoryRequest(input.accountSummary, characterId, []);
    void (async () => {
      let availableSnapshot: VendorInventorySnapshot | null = null;
      try {
        const cached = hideInactiveXur(await input.loadCachedInventory(request));
        if (requestSequence !== requestSequenceRef.current || requestContextKey !== requestContextKeyRef.current) return;
        if (cached) {
          availableSnapshot = cached;
          setSnapshot(cached);
          setStatusMessage("正在显示上次商人库存，后台检查更新");
        }
        const next = hideInactiveXur(await input.loadInventory(request));
        if (requestSequence !== requestSequenceRef.current || requestContextKey !== requestContextKeyRef.current) return;
        if (availableSnapshot && hasSameVendorInventoryContent(availableSnapshot, next)) {
          setStatusMessage("已检查，商人库存无变化");
        } else {
          setSnapshot(next);
          setStatusMessage(availableSnapshot ? "商人库存已在后台更新" : "");
        }
        setRefreshState("idle");
      } catch (error) {
        if (requestSequence !== requestSequenceRef.current || requestContextKey !== requestContextKeyRef.current) return;
        if (availableSnapshot) setSnapshot(availableSnapshot);
        setRefreshState("failed");
        setRefreshError(error instanceof Error
          ? `${availableSnapshot ? "继续显示上次库存。" : ""}${error.message}`
          : "商人数据读取失败");
      }
    })();
  }, [characterId, input.accountSummary, input.active, input.loadCachedInventory, input.loadInventory, requestContextKey]);

  useEffect(() => {
    if (!input.active || !input.accountSummary || !characterId || !snapshot || !selectedDetailVendorHashes.length) return;
    if (
      snapshot.detailVendorHashes === undefined
      || selectedDetailVendorHashes.every((vendorHash) => snapshot.detailVendorHashes?.includes(vendorHash))
    ) return;

    const requestSequence = ++requestSequenceRef.current;
    setRefreshState("refreshing");
    setRefreshError("");
    const request = createVendorInventoryRequest(
      input.accountSummary,
      characterId,
      selectedDetailVendorHashes
    );
    void (async () => {
      let availableSnapshot = hideInactiveXur(snapshot);
      try {
        const cached = hideInactiveXur(await input.loadCachedInventory(request));
        if (requestSequence !== requestSequenceRef.current || requestContextKey !== requestContextKeyRef.current) return;
        if (cached) {
          availableSnapshot = cached;
          setSnapshot(cached);
          setStatusMessage("正在显示上次商人详情，后台检查更新");
        }
        const next = hideInactiveXur(await input.loadInventory(request));
        if (requestSequence !== requestSequenceRef.current || requestContextKey !== requestContextKeyRef.current) return;
        if (hasSameVendorInventoryContent(availableSnapshot, next)) {
          setStatusMessage("已检查，当前商人库存无变化");
        } else {
          const resolved = resolveVendorRefreshState(availableSnapshot, next);
          setSnapshot(resolved.snapshot);
          setStatusMessage(resolved.statusMessage ?? "当前商人库存已在后台更新");
        }
        setRefreshState("idle");
      } catch (error) {
        if (requestSequence !== requestSequenceRef.current || requestContextKey !== requestContextKeyRef.current) return;
        const resolved = resolveVendorRefreshState(availableSnapshot, null, error);
        setSnapshot(resolved.snapshot);
        setRefreshState(resolved.refreshState);
        setRefreshError(`继续显示上次库存。${resolved.refreshError ?? "商人详情刷新失败"}`);
      }
    })();
  }, [characterId, input.accountSummary, input.active, input.loadCachedInventory, input.loadInventory, requestContextKey, selectedDetailVendorHashes, snapshot]);

  useEffect(() => {
    if (!input.active) return;
    const delay = Math.max(1_000, nextXurBoundaryAt(new Date()).getTime() - Date.now() + 5_000);
    const id = window.setTimeout(() => {
      setSnapshot((current) => hideInactiveXur(current));
      void refresh();
    }, delay);
    return () => window.clearTimeout(id);
  }, [input.active, refresh]);

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

function hasSameVendorInventoryContent(
  left: VendorInventorySnapshot,
  right: VendorInventorySnapshot
): boolean {
  const withoutFetchTime = (key: string, value: unknown) => key === "fetchedAt" ? undefined : value;
  return JSON.stringify(left, withoutFetchTime) === JSON.stringify(right, withoutFetchTime);
}

function hideInactiveXur(snapshot: VendorInventorySnapshot | null): VendorInventorySnapshot | null {
  if (!snapshot || isXurActiveAt()) return snapshot;
  const vendors = snapshot.vendors.filter((vendor) => vendor.vendorHash !== xurVendorHash);
  return vendors.length === snapshot.vendors.length ? snapshot : { ...snapshot, vendors };
}
