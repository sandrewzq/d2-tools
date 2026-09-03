import { useEffect, useRef, useState } from "react";
import { api } from "../../api/client";
import type { AccountItemDetail, AccountItemSummary, ItemDefinitionDetail, ItemSearchResult, LibraryHistory } from "../../api/types";
import {
  createSelectedItemPreview,
  getItemKey,
  mergeSelectedItemDetail,
  selectedItemToAccountItem,
  type SameNameItemSummary,
  type SelectedItemDetail,
  type SelectedItemSource,
  type SelectedItemSourceKind
} from "@d2-tools/app/items";

export {
  createSelectedItemPreview,
  getItemKey,
  mergeSelectedItemDetail,
  selectedItemToAccountItem
};
export type {
  SameNameItemSummary,
  SelectedItemDetail,
  SelectedItemSource,
  SelectedItemSourceKind
};

type ItemOpenContext = {
  item: AccountItemSummary | ItemSearchResult;
  source: SelectedItemSource;
  itemKey: string;
  isCurrent: () => boolean;
};

const ITEM_DETAIL_CACHE_LIMIT = 80;
const ACCOUNT_ITEM_DETAIL_CACHE_LIMIT = 24;

// 进程级实例详情缓存：仓库同名整理与详情弹层可能同时请求同一实例。
// 统一在这里做短生命周期的内存复用和 in-flight 去重，避免页面之间重复 IPC。
const sharedAccountDetailCache = new Map<string, { detail: AccountItemDetail; expiresAt: number }>();
const sharedAccountDetailRequests = new Map<string, Promise<AccountItemDetail>>();
const SHARED_ACCOUNT_DETAIL_CACHE_LIMIT = 120;

export function loadAccountItemDetailCached(
  instanceId: string,
  options: { scopeKey?: string; force?: boolean } = {}
): Promise<AccountItemDetail> {
  const key = `${options.scopeKey ?? "default"}:${instanceId}`;
  if (!options.force) {
    const cached = sharedAccountDetailCache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      sharedAccountDetailCache.delete(key);
      sharedAccountDetailCache.set(key, cached);
      return Promise.resolve(cached.detail);
    }
    if (cached) sharedAccountDetailCache.delete(key);
    const pending = sharedAccountDetailRequests.get(key);
    if (pending) return pending;
  }

  let request: Promise<AccountItemDetail>;
  request = api.getAccountItemDetail(instanceId, options.force ? { force: true } : undefined)
    .then((detail) => {
      if (sharedAccountDetailRequests.get(key) === request) sharedAccountDetailRequests.delete(key);
      sharedAccountDetailCache.delete(key);
      sharedAccountDetailCache.set(key, { detail, expiresAt: Date.now() + 45_000 });
      while (sharedAccountDetailCache.size > SHARED_ACCOUNT_DETAIL_CACHE_LIMIT) {
        const oldest = sharedAccountDetailCache.keys().next().value;
        if (oldest === undefined) break;
        sharedAccountDetailCache.delete(oldest);
      }
      return detail;
    })
    .catch((error) => {
      if (sharedAccountDetailRequests.get(key) === request) sharedAccountDetailRequests.delete(key);
      throw error;
    });
  sharedAccountDetailRequests.set(key, request);
  return request;
}

export function invalidateCachedAccountItemDetail(instanceId: string, scopeKey = "default"): void {
  sharedAccountDetailCache.delete(`${scopeKey}:${instanceId}`);
}

export function useItemDetail(options: {
  cacheScopeKey?: string;
  onOpenStart?: (context: ItemOpenContext) => void;
  onRecentHistoryChanged?: (history: LibraryHistory) => void;
} = {}) {
  const cacheScopeKey = options.cacheScopeKey ?? "default";
  const [selectedItem, setSelectedItem] = useState<SelectedItemDetail | null>(null);
  const [itemDetailLoadingKey, setItemDetailLoadingKey] = useState("");
  const [itemDetailError, setItemDetailError] = useState("");
  const itemDetailCacheRef = useRef(new Map<number, ItemDefinitionDetail>());
  const accountItemDetailCacheRef = useRef(new Map<string, AccountItemDetail>());
  const cacheScopeKeyRef = useRef(cacheScopeKey);
  const requestSequenceRef = useRef(0);

  useEffect(() => {
    if (cacheScopeKeyRef.current !== cacheScopeKey) {
      resetDetailState(cacheScopeKey);
    }
  }, [cacheScopeKey]);

  useEffect(() => () => {
    invalidateRequestsAndClearCaches();
  }, []);

  async function openItemDetail(item: AccountItemSummary | ItemSearchResult, source: SelectedItemSource = {}) {
    if (cacheScopeKeyRef.current !== cacheScopeKey) {
      resetDetailState(cacheScopeKey);
    }
    setItemDetailError("");
    const itemKey = getItemKey(item);
    const instanceId = "instance_id" in item ? item.instance_id : undefined;
    const requestScopeKey = cacheScopeKeyRef.current;
    const requestSequence = ++requestSequenceRef.current;
    const isCurrent = () => (
      requestSequenceRef.current === requestSequence
      && cacheScopeKeyRef.current === requestScopeKey
    );
    const preview = createSelectedItemPreview(item, source);
    const canRenderPreview = preview.group_key === "weapons" || preview.group_key === "armor";
    setItemDetailLoadingKey(itemKey);
    setSelectedItem(canRenderPreview ? preview : null);

    options.onOpenStart?.({
      item,
      source,
      itemKey,
      isCurrent
    });

    void api.addRecentItem({ hash: item.hash, name: item.name, icon: item.icon })
      .then((history) => {
        options.onRecentHistoryChanged?.(history);
      })
      .catch(() => {
        // Recent-item history is a convenience feature; item detail should still open if it cannot be saved.
      });

    const cachedDetail = itemDetailCacheRef.current.get(item.hash)
      ? touchItemDetailCache(itemDetailCacheRef.current, item.hash)
      : null;
    const cachedAccountDetail = instanceId
      ? touchAccountItemDetailCache(accountItemDetailCacheRef.current, instanceId)
      : null;
    const needsDefinitionDetail = !cachedDetail;
    const needsAccountDetail = Boolean(instanceId && !cachedAccountDetail);
    const hasPendingCriticalDetail = needsDefinitionDetail || needsAccountDetail;
    const initialLoadingState = {
      definition: needsDefinitionDetail,
      instance: needsAccountDetail
    };
    if (cachedDetail || cachedAccountDetail) {
      setSelectedItem((current) => {
        if (current && current.item_key !== itemKey) {
          return current;
        }
        const base = current ?? preview;
        const withDefinition = cachedDetail ? mergeSelectedItemDetail(base, cachedDetail) : base;
        const merged = cachedAccountDetail ? mergeAccountItemDetail(withDefinition, cachedAccountDetail) : withDefinition;
        return {
          ...merged,
          is_detail_loading: hasPendingCriticalDetail,
          detail_loading: initialLoadingState
        };
      });
    }
    if (!hasPendingCriticalDetail) {
      setItemDetailLoadingKey((current) => current === itemKey ? "" : current);
      return;
    }

    const pendingRequests: Promise<void>[] = [];
    if (!cachedDetail) {
      pendingRequests.push(api.getItemDetail(item.hash)
        .then((detail) => {
          if (!isCurrent()) return;
          itemDetailCacheRef.current.set(item.hash, detail);
          evictOldestCacheEntry(itemDetailCacheRef.current, ITEM_DETAIL_CACHE_LIMIT);
          setSelectedItem((current) => {
            if (current && current.item_key !== itemKey) return current;
            const withDefinition = mergeSelectedItemDetail(current ?? preview, detail);
            const latestAccountDetail = instanceId
              ? accountItemDetailCacheRef.current.get(instanceId)
              : null;
            const merged = latestAccountDetail
              ? mergeAccountItemDetail(withDefinition, latestAccountDetail)
              : withDefinition;
            return withDetailLoadingState(merged, {
              definition: false,
              instance: latestAccountDetail
                ? false
                : current?.detail_loading?.instance ?? needsAccountDetail
            });
          });
        })
        .catch((error) => {
          if (!isCurrent()) return;
          setSelectedItem((current) => current?.item_key === itemKey
            ? withDetailLoadingState(current, {
                definition: false,
                instance: current.detail_loading?.instance ?? needsAccountDetail
              })
            : current);
          appendItemDetailError(
            setItemDetailError,
            errorMessage(error, "物品定义详情读取失败")
          );
        }));
    }

    if (instanceId && !cachedAccountDetail) {
      pendingRequests.push(loadAccountItemDetailCached(instanceId, { scopeKey: requestScopeKey })
        .then((detail) => {
          if (!isCurrent()) return;
          accountItemDetailCacheRef.current.set(detail.instance_id, detail);
          evictOldestCacheEntry(accountItemDetailCacheRef.current, ACCOUNT_ITEM_DETAIL_CACHE_LIMIT);
          setSelectedItem((current) => {
            if (current && current.item_key !== itemKey) return current;
            return withDetailLoadingState(mergeAccountItemDetail(current ?? preview, detail), {
              definition: current?.detail_loading?.definition ?? needsDefinitionDetail,
              instance: false
            });
          });
        })
        .catch((error) => {
          if (!isCurrent()) return;
          setSelectedItem((current) => current?.item_key === itemKey
            ? withDetailLoadingState(current, {
                definition: current.detail_loading?.definition ?? needsDefinitionDetail,
                instance: false
              })
            : current);
          appendItemDetailError(
            setItemDetailError,
            errorMessage(error, "账号实例详情读取失败")
          );
        }));
    }

    await Promise.allSettled(pendingRequests);
    if (!isCurrent()) return;
    setSelectedItem((current) => {
      if (!current || current.item_key !== itemKey) return current;
      return withDetailLoadingState(current, { definition: false, instance: false });
    });
    setItemDetailLoadingKey((current) => current === itemKey ? "" : current);
  }

  async function refreshSelectedItemDetail(): Promise<AccountItemDetail | null> {
    const current = selectedItem;
    if (!current?.instance_id) return null;
    const itemKey = current.item_key;
    const instanceId = current.instance_id;
    const requestScopeKey = cacheScopeKeyRef.current;
    const requestSequence = ++requestSequenceRef.current;
    const isCurrent = () => (
      requestSequenceRef.current === requestSequence
      && cacheScopeKeyRef.current === requestScopeKey
    );
    accountItemDetailCacheRef.current.delete(instanceId);
    invalidateCachedAccountItemDetail(instanceId, requestScopeKey);
    setItemDetailError("");
    setItemDetailLoadingKey(itemKey);
    setSelectedItem((value) => value?.item_key === itemKey
      ? withDetailLoadingState(value, { definition: false, instance: true })
      : value);
    try {
      const detail = await loadAccountItemDetailCached(instanceId, { scopeKey: requestScopeKey, force: true });
      if (!isCurrent()) return null;
      accountItemDetailCacheRef.current.set(instanceId, detail);
      evictOldestCacheEntry(accountItemDetailCacheRef.current, ACCOUNT_ITEM_DETAIL_CACHE_LIMIT);
      setSelectedItem((value) => value?.item_key === itemKey
        ? withDetailLoadingState(mergeAccountItemDetail(value, detail), { definition: false, instance: false })
        : value);
      return detail;
    } catch (error) {
      if (!isCurrent()) return null;
      setSelectedItem((value) => value?.item_key === itemKey
        ? withDetailLoadingState(value, { definition: false, instance: false })
        : value);
      setItemDetailError(errorMessage(error, "账号实例详情刷新失败"));
      throw error;
    } finally {
      if (isCurrent()) {
        setItemDetailLoadingKey((value) => value === itemKey ? "" : value);
      }
    }
  }

  function closeSelectedItemDetail() {
    invalidateRequests();
    setItemDetailLoadingKey("");
    setSelectedItem(null);
    setItemDetailError("");
  }

  function resetDetailState(nextScopeKey: string): void {
    cacheScopeKeyRef.current = nextScopeKey;
    invalidateRequestsAndClearCaches();
    setItemDetailLoadingKey("");
    setSelectedItem(null);
    setItemDetailError("");
  }

  function invalidateRequestsAndClearCaches(): void {
    invalidateRequests();
    itemDetailCacheRef.current.clear();
    accountItemDetailCacheRef.current.clear();
  }

  function invalidateRequests(): void {
    requestSequenceRef.current += 1;
  }

  return {
    selectedItem,
    setSelectedItem,
    itemDetailLoadingKey,
    itemDetailError,
    openItemDetail,
    refreshSelectedItemDetail,
    closeSelectedItemDetail
  };
}

function touchItemDetailCache(
  cache: Map<number, ItemDefinitionDetail>,
  hash: number
): ItemDefinitionDetail | null {
  const detail = cache.get(hash);
  if (!detail) return null;

  cache.delete(hash);
  cache.set(hash, detail);
  return detail;
}

function touchAccountItemDetailCache(
  cache: Map<string, AccountItemDetail>,
  instanceId: string
): AccountItemDetail | null {
  const detail = cache.get(instanceId);
  if (!detail) return null;

  cache.delete(instanceId);
  cache.set(instanceId, detail);
  return detail;
}

function evictOldestCacheEntry<TKey, TValue>(cache: Map<TKey, TValue>, limit: number): void {
  while (cache.size > limit) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey === undefined) return;
    cache.delete(oldestKey);
  }
}

function mergeAccountItemDetail(
  current: SelectedItemDetail,
  detail: AccountItemDetail
): SelectedItemDetail {
  return {
    ...current,
    instance_id: detail.instance_id,
    power: detail.power,
    locked: detail.locked ?? current.locked,
    armor_stats: detail.armor_stats,
    armor_stat_breakdown: detail.armor_stat_breakdown,
    armor_energy: detail.armor_energy,
    weapon_stats: detail.weapon_stats ?? current.weapon_stats,
    instance: detail.instance,
    item_objectives: detail.item_objectives,
    catalyst: detail.catalyst,
    sockets: detail.sockets,
    weapon_roll: detail.weapon_roll ?? current.weapon_roll,
    socket_plugs: detail.socket_plugs,
    group_key: detail.group_key,
    bucket_hash: detail.bucket_hash,
    bucket_name: detail.bucket_name,
    weapon_frame: detail.weapon_frame ?? current.weapon_frame
  };
}

function withDetailLoadingState(
  item: SelectedItemDetail,
  detailLoading: NonNullable<SelectedItemDetail["detail_loading"]>
): SelectedItemDetail {
  return {
    ...item,
    detail_loading: detailLoading,
    is_detail_loading: detailLoading.definition || detailLoading.instance
  };
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

function appendItemDetailError(
  setError: (value: string | ((current: string) => string)) => void,
  message: string
): void {
  setError((current) => {
    if (!current) return message;
    return current.split("；").includes(message) ? current : `${current}；${message}`;
  });
}
