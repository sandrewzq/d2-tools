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
    setItemDetailLoadingKey(itemKey);
    setSelectedItem(createSelectedItemPreview(item, source));

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
    if (cachedDetail || cachedAccountDetail) {
      setSelectedItem((current) => {
        if (!current || current.item_key !== itemKey) {
          return current;
        }
        const withDefinition = cachedDetail ? mergeSelectedItemDetail(current, cachedDetail) : current;
        return cachedAccountDetail ? mergeAccountItemDetail(withDefinition, cachedAccountDetail) : withDefinition;
      });
    }
    if (cachedDetail && (!instanceId || cachedAccountDetail)) {
      setItemDetailLoadingKey((current) => current === itemKey ? "" : current);
      return;
    }

    const definitionPromise: Promise<ItemDefinitionDetail> = cachedDetail
      ? Promise.resolve(cachedDetail)
      : api.getItemDetail(item.hash);
    const accountPromise: Promise<AccountItemDetail | null> = instanceId
      ? (cachedAccountDetail ? Promise.resolve(cachedAccountDetail) : api.getAccountItemDetail(instanceId))
      : Promise.resolve(null);
    const [definitionResult, accountResult] = await Promise.allSettled([
      definitionPromise,
      accountPromise
    ] as const);
    if (!isCurrent()) {
      return;
    }
    if (definitionResult.status === "fulfilled") {
      itemDetailCacheRef.current.set(item.hash, definitionResult.value);
      evictOldestCacheEntry(itemDetailCacheRef.current, ITEM_DETAIL_CACHE_LIMIT);
    }
    if (accountResult.status === "fulfilled" && accountResult.value) {
      accountItemDetailCacheRef.current.set(accountResult.value.instance_id, accountResult.value);
      evictOldestCacheEntry(accountItemDetailCacheRef.current, ACCOUNT_ITEM_DETAIL_CACHE_LIMIT);
    }

    setSelectedItem((current) => {
      if (!current || current.item_key !== itemKey) {
        return current;
      }
      const withDefinition = definitionResult.status === "fulfilled"
        ? mergeSelectedItemDetail(current, definitionResult.value)
        : current;
      const withAccount = accountResult.status === "fulfilled" && accountResult.value
        ? mergeAccountItemDetail(withDefinition, accountResult.value)
        : withDefinition;
      return { ...withAccount, is_detail_loading: false };
    });
    setItemDetailLoadingKey((current) => current === itemKey ? "" : current);

    const errors = [
      definitionResult.status === "rejected" ? errorMessage(definitionResult.reason, "物品定义详情读取失败") : "",
      accountResult.status === "rejected" ? errorMessage(accountResult.reason, "账号实例详情读取失败") : ""
    ].filter(Boolean);
    if (errors.length) {
      setItemDetailError(errors.join("；"));
    }
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
    setItemDetailError("");
    setItemDetailLoadingKey(itemKey);
    setSelectedItem((value) => value?.item_key === itemKey
      ? { ...value, is_detail_loading: true }
      : value);
    try {
      const detail = await api.getAccountItemDetail(instanceId, { force: true });
      if (!isCurrent()) return null;
      accountItemDetailCacheRef.current.set(instanceId, detail);
      evictOldestCacheEntry(accountItemDetailCacheRef.current, ACCOUNT_ITEM_DETAIL_CACHE_LIMIT);
      setSelectedItem((value) => value?.item_key === itemKey
        ? { ...mergeAccountItemDetail(value, detail), is_detail_loading: false }
        : value);
      return detail;
    } catch (error) {
      if (!isCurrent()) return null;
      setSelectedItem((value) => value?.item_key === itemKey
        ? { ...value, is_detail_loading: false }
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
    invalidateRequestsAndClearCaches();
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
    requestSequenceRef.current += 1;
    itemDetailCacheRef.current.clear();
    accountItemDetailCacheRef.current.clear();
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
    locked: detail.locked,
    armor_stats: detail.armor_stats,
    armor_stat_breakdown: detail.armor_stat_breakdown,
    armor_energy: detail.armor_energy,
    weapon_stats: detail.weapon_stats,
    instance: detail.instance,
    item_objectives: detail.item_objectives,
    sockets: detail.sockets,
    socket_plugs: detail.socket_plugs,
    group_key: detail.group_key,
    bucket_hash: detail.bucket_hash,
    bucket_name: detail.bucket_name,
    weapon_frame: detail.weapon_frame ?? current.weapon_frame
  };
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}
