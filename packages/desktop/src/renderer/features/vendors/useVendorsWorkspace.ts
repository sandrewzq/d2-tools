import {
  getVendorDetailHashes,
  selectVendorsPageModel,
  type VendorsPageWorkspace
} from "@d2-tools/app/vendors";
import { isXurActiveAt, nextXurBoundaryAt, xurVendorHash } from "@d2-tools/core/daily/xurSchedule";
import type { VendorCharacterScope } from "@d2-tools/core/vendors/inventory";
import type { AccountSummary } from "../../api/types";
import type {
  VendorInventoryRequest,
  VendorInventorySnapshot
} from "../../../contracts/vendors.js";
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
  now?: Date;
  loadCachedInventory?: (input: VendorInventoryRequest) => Promise<VendorInventorySnapshot | null>;
  loadInventory: (input: VendorInventoryRequest) => Promise<VendorInventorySnapshot>;
}) {
  const [snapshot, setSnapshot] = useState<VendorInventorySnapshot | null>(null);
  const [refreshState, setRefreshState] = useState<"idle" | "refreshing" | "failed">("idle");
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [selectedVendorId, setSelectedVendorId] = useState<string | undefined>("vendor-2190858386");
  const [scope, setScope] = useState<VendorCharacterScope>(() => ({ kind: "character", characterId: input.selectedCharacterId }));
  const previousSelectedCharacterIdRef = useRef(input.selectedCharacterId);
  const requestContextKeyRef = useRef("__initial__");
  const requestSequenceRef = useRef(0);
  const manualRequestSequenceRef = useRef<number | null>(null);

  const fallbackCharacterId = input.selectedCharacterId
    || input.accountSummary?.characters[0]?.character_id
    || "";
  const requestCharacterIds = useMemo(() => {
    if (scope.kind === "account") return input.accountSummary?.characters.map((character) => character.character_id) ?? [];
    return [scope.characterId || fallbackCharacterId].filter(Boolean);
  }, [fallbackCharacterId, input.accountSummary, scope]);

  useEffect(() => {
    if (scope.kind !== "character" || !fallbackCharacterId) return;
    const validCharacter = input.accountSummary?.characters.some((character) => character.character_id === scope.characterId);
    if (!scope.characterId || (input.accountSummary && !validCharacter)) {
      setScope({ kind: "character", characterId: fallbackCharacterId });
    }
  }, [fallbackCharacterId, input.accountSummary, scope]);

  useEffect(() => {
    const previousSelectedCharacterId = previousSelectedCharacterIdRef.current;
    previousSelectedCharacterIdRef.current = input.selectedCharacterId;
    if (
      scope.kind !== "character"
      || !input.selectedCharacterId
      || !previousSelectedCharacterId
      || scope.characterId !== previousSelectedCharacterId
      || scope.characterId === input.selectedCharacterId
    ) return;
    setScope({ kind: "character", characterId: input.selectedCharacterId });
  }, [input.selectedCharacterId, scope]);
  const requestContextKey = input.accountSummary && requestCharacterIds.length
    ? `${input.accountSummary.membership_type}:${input.accountSummary.destiny_membership_id}:${scope.kind}:${requestCharacterIds.join(",")}`
    : "";
  const selectedVendorHash = selectVendorHash(snapshot, selectedVendorId);
  const selectedDetailVendorHashes = useMemo(
    () => expandVendorDetailHashes(selectedVendorHash, snapshot),
    [selectedVendorHash, snapshot]
  );

  const runRefresh = useCallback(async (source: "manual" | "background") => {
    if (!input.active || !input.accountSummary || !requestCharacterIds.length) return;
    const requestSequence = ++requestSequenceRef.current;
    if (source === "manual") {
      manualRequestSequenceRef.current = requestSequence;
      setIsManualRefreshing(true);
    } else {
      manualRequestSequenceRef.current = null;
      setIsManualRefreshing(false);
    }
    const currentSnapshot = hideInactiveXur(snapshot, input.now);
    const request = createVendorInventoryRequest(
      input.accountSummary,
      requestCharacterIds,
      selectedDetailVendorHashes
    );
    setRefreshState("refreshing");
    setRefreshError("");
    try {
      const next = hideInactiveXur(await input.loadInventory(request), input.now);
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
    } finally {
      if (manualRequestSequenceRef.current === requestSequence) {
        manualRequestSequenceRef.current = null;
        setIsManualRefreshing(false);
      }
    }
  }, [input.accountSummary, input.active, input.loadInventory, input.now, requestCharacterIds, requestContextKey, selectedDetailVendorHashes, snapshot]);

  const refresh = useCallback(() => runRefresh("manual"), [runRefresh]);

  useEffect(() => {
    if (!input.active) {
      requestSequenceRef.current += 1;
      requestContextKeyRef.current = "__inactive__";
      manualRequestSequenceRef.current = null;
      setRefreshState("idle");
      setIsManualRefreshing(false);
      return;
    }
    if (requestContextKey === requestContextKeyRef.current) return;
    requestContextKeyRef.current = requestContextKey;
    const requestSequence = ++requestSequenceRef.current;
    manualRequestSequenceRef.current = null;
    setIsManualRefreshing(false);
    setSnapshot(null);
    setRefreshError("");
    setStatusMessage("");

    if (!input.accountSummary || !requestCharacterIds.length) {
      setRefreshState("idle");
      return;
    }

    setRefreshState("refreshing");
    const request = createVendorInventoryRequest(input.accountSummary, requestCharacterIds, []);
    void (async () => {
      let availableSnapshot: VendorInventorySnapshot | null = null;
      try {
        const cached = hideInactiveXur(await (input.loadCachedInventory?.(request) ?? Promise.resolve(null)), input.now);
        if (requestSequence !== requestSequenceRef.current || requestContextKey !== requestContextKeyRef.current) return;
        if (cached) {
          availableSnapshot = cached;
          setSnapshot(cached);
          setStatusMessage("正在显示上次商人库存，后台检查更新");
        }
        const next = hideInactiveXur(await input.loadInventory(request), input.now);
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
  }, [input.accountSummary, input.active, input.loadCachedInventory, input.loadInventory, input.now, requestCharacterIds, requestContextKey]);

  useEffect(() => {
    if (!input.active || !input.accountSummary || !requestCharacterIds.length || !snapshot || !selectedDetailVendorHashes.length) return;
    if (
      snapshot.detailVendorHashes === undefined
      || selectedDetailVendorHashes.every((vendorHash) => snapshot.detailVendorHashes?.includes(vendorHash))
    ) return;

    const requestSequence = ++requestSequenceRef.current;
    manualRequestSequenceRef.current = null;
    setIsManualRefreshing(false);
    setRefreshState("refreshing");
    setRefreshError("");
    const request = createVendorInventoryRequest(
      input.accountSummary,
      requestCharacterIds,
      selectedDetailVendorHashes
    );
    void (async () => {
      let availableSnapshot = hideInactiveXur(snapshot, input.now);
      try {
        const cached = hideInactiveXur(await (input.loadCachedInventory?.(request) ?? Promise.resolve(null)), input.now);
        if (requestSequence !== requestSequenceRef.current || requestContextKey !== requestContextKeyRef.current) return;
        if (cached) {
          availableSnapshot = cached;
          setSnapshot(cached);
          setStatusMessage("正在显示上次商人详情，后台检查更新");
        }
        const next = hideInactiveXur(await input.loadInventory(request), input.now);
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
  }, [input.accountSummary, input.active, input.loadCachedInventory, input.loadInventory, input.now, requestCharacterIds, requestContextKey, selectedDetailVendorHashes, snapshot]);

  useEffect(() => {
    if (!input.active) return;
    const currentTime = input.now ?? new Date();
    const delay = Math.max(1_000, nextXurBoundaryAt(currentTime).getTime() - currentTime.getTime() + 5_000);
    const id = window.setTimeout(() => {
      setSnapshot((current) => hideInactiveXur(current, input.now));
      void runRefresh("background");
    }, delay);
    return () => window.clearTimeout(id);
  }, [input.active, input.now, runRefresh]);

  const model: VendorsPageWorkspace = useMemo(() => selectVendorsPageModel({
    snapshot,
    account: input.accountSummary,
    scope,
    selectedVendorId,
    refreshState,
    refreshError,
    statusMessage,
    now: input.now
  }), [input.accountSummary, input.now, refreshError, refreshState, scope, selectedVendorId, snapshot, statusMessage]);

  return {
    model,
    refresh,
    isManualRefreshing,
    statusMessage,
    selectVendor: setSelectedVendorId,
    scope,
    selectScope: (nextScope: { kind: "character" | "account"; characterId?: string }) => {
      if (nextScope.kind === "account") {
        setScope({ kind: "account" });
      } else if (nextScope.characterId) {
        setScope({ kind: "character", characterId: nextScope.characterId });
      }
    }
  };
}

function createVendorInventoryRequest(
  account: AccountSummary,
  characterIds: string[],
  detailVendorHashes: number[]
): VendorInventoryRequest {
  return {
    membership_type: account.membership_type,
    membership_id: account.destiny_membership_id,
    character_ids: characterIds,
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

function hideInactiveXur(snapshot: VendorInventorySnapshot, now?: Date): VendorInventorySnapshot;
function hideInactiveXur(snapshot: null, now?: Date): null;
function hideInactiveXur(snapshot: VendorInventorySnapshot | null, now?: Date): VendorInventorySnapshot | null;
function hideInactiveXur(snapshot: VendorInventorySnapshot | null, now?: Date): VendorInventorySnapshot | null {
  if (!snapshot || isXurActiveAt(now)) return snapshot;
  const vendors = snapshot.vendors.filter((vendor) => vendor.vendorHash !== xurVendorHash);
  return vendors.length === snapshot.vendors.length ? snapshot : { ...snapshot, vendors };
}
