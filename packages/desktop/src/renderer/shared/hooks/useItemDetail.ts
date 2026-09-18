import { useEffect, useRef, useState } from "react";
import { api } from "../../api/client";
import type { AccountItemDetail, AccountItemSummary, ItemDefinitionDetail, ItemSearchResult, LibraryHistory } from "../../api/types";
import {
  applyAcceptedSocketPlugs as buildAcceptedSocketPlugPatch,
  type AcceptedSocketPlugChange
} from "@d2-tools/core/account/summary";
import {
  recordAcceptedSocketPlugs,
  settleAcceptedSocketPlugsFromServer,
  withAcceptedSocketPlugs
} from "../stores/acceptedSocketPlugs";
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
const sharedAccountDetailCache = new Map<string, AccountItemDetail>();
const sharedAccountDetailRequests = new Map<string, Promise<AccountItemDetail>>();
const sharedAccountDetailVersions = new Map<string, number>();
const SHARED_ACCOUNT_DETAIL_CACHE_LIMIT = 120;

/**
 * 读一件装备的完整实例详情。
 *
 * 出口处会叠加「已受理但服务器还没读回来」的换 Perk 结果（见 `shared/stores/acceptedSocketPlugs`）——
 * 这就是「读取不得覆盖受理状态」那条不变量的落点，所以叠加必须在这一层做，调用方不必各写一遍。
 *
 * `serverTruth: true` 给后台探针用：服务器原样、不叠加，只顺带让已对上的受理状态提前退休。
 */
export function loadAccountItemDetailCached(
  instanceId: string,
  options: { scopeKey?: string; rollFingerprint?: string; force?: boolean; serverTruth?: boolean } = {}
): Promise<AccountItemDetail> {
  const read = readAccountItemDetail(instanceId, options);
  if (options.serverTruth) {
    return read.then((detail) => {
      settleAcceptedSocketPlugsFromServer(instanceId, detail);
      return detail;
    });
  }
  // 只在出口叠加：缓存与 in-flight 去重里存的仍是服务器原样，受理状态永远是从当下重新叠的。
  return read.then((detail) => withAcceptedSocketPlugs(instanceId, detail));
}

function readAccountItemDetail(
  instanceId: string,
  options: { scopeKey?: string; rollFingerprint?: string; force?: boolean } = {}
): Promise<AccountItemDetail> {
  const key = accountDetailCacheKey(options.scopeKey ?? "default", instanceId, options.rollFingerprint);
  const instanceScopeKey = accountDetailInstanceScopeKey(options.scopeKey ?? "default", instanceId);
  if (!options.force) {
    const cached = sharedAccountDetailCache.get(key);
    if (cached) {
      sharedAccountDetailCache.delete(key);
      sharedAccountDetailCache.set(key, cached);
      return Promise.resolve(cached);
    }
    const pending = sharedAccountDetailRequests.get(key);
    if (pending) return pending;
  }

  const requestVersion = (sharedAccountDetailVersions.get(instanceScopeKey) ?? 0) + 1;
  sharedAccountDetailVersions.set(instanceScopeKey, requestVersion);
  let request: Promise<AccountItemDetail>;
  request = api.getAccountItemDetail(instanceId, options.force ? { force: true } : undefined)
    .then((detail) => {
      if (sharedAccountDetailRequests.get(key) !== request
        || sharedAccountDetailVersions.get(instanceScopeKey) !== requestVersion) return detail;
      sharedAccountDetailRequests.delete(key);
      const resolvedKey = accountDetailCacheKey(
        options.scopeKey ?? "default",
        instanceId,
        detail.weapon_roll?.fingerprint ?? options.rollFingerprint
      );
      sharedAccountDetailCache.delete(resolvedKey);
      sharedAccountDetailCache.set(resolvedKey, detail);
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
  const prefix = `${scopeKey}:${instanceId}:`;
  const instanceScopeKey = accountDetailInstanceScopeKey(scopeKey, instanceId);
  sharedAccountDetailVersions.set(instanceScopeKey, (sharedAccountDetailVersions.get(instanceScopeKey) ?? 0) + 1);
  for (const key of sharedAccountDetailCache.keys()) {
    if (key.startsWith(prefix)) sharedAccountDetailCache.delete(key);
  }
  for (const key of sharedAccountDetailRequests.keys()) {
    if (key.startsWith(prefix)) sharedAccountDetailRequests.delete(key);
  }
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
  const definitionRequestsRef = useRef(new Map<string, Promise<boolean>>());

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
    const accountCacheKey = instanceId
      ? accountDetailCacheKey(requestScopeKey, instanceId, preview.weapon_roll?.fingerprint)
      : "";
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
      ? touchAccountItemDetailCache(accountItemDetailCacheRef.current, accountCacheKey)
      : null;
    const needsDefinitionDetail = !cachedDetail;
    const shouldAutoLoadDefinition = needsDefinitionDetail
      && (!instanceId || preview.group_key === "armor");
    const hasPendingCriticalDetail = shouldAutoLoadDefinition;
    const initialLoadingState = {
      definition: shouldAutoLoadDefinition,
      instance: false
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
    if (shouldAutoLoadDefinition) {
      pendingRequests.push(api.getItemDetail(item.hash)
        .then((detail) => {
          if (!isCurrent()) return;
          itemDetailCacheRef.current.set(item.hash, detail);
          evictOldestCacheEntry(itemDetailCacheRef.current, ITEM_DETAIL_CACHE_LIMIT);
          setSelectedItem((current) => {
            if (current && current.item_key !== itemKey) return current;
            const withDefinition = mergeSelectedItemDetail(current ?? preview, detail);
            const latestAccountDetail = instanceId
              ? accountItemDetailCacheRef.current.get(accountCacheKey)
              : null;
            const merged = latestAccountDetail
              ? mergeAccountItemDetail(withDefinition, latestAccountDetail)
              : withDefinition;
            return withDetailLoadingState(merged, {
              definition: false,
              instance: false
            });
          });
        })
        .catch((error) => {
          if (!isCurrent()) return;
          setSelectedItem((current) => current?.item_key === itemKey
            ? withDetailLoadingState(current, {
                definition: false,
                instance: false
              })
            : current);
          appendItemDetailError(
            setItemDetailError,
            errorMessage(error, "物品定义详情读取失败")
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

  async function loadSelectedItemFullDetail(): Promise<void> {
    const current = selectedItem;
    if (!current) return;
    const itemKey = current.item_key;
    const instanceId = current.instance_id;
    const requestScopeKey = cacheScopeKeyRef.current;
    const requestSequence = requestSequenceRef.current;
    const isCurrent = () => requestSequenceRef.current === requestSequence
      && cacheScopeKeyRef.current === requestScopeKey;
    const cachedDefinition = touchItemDetailCache(itemDetailCacheRef.current, current.hash);
    const cachedInstance = instanceId
      ? touchAccountItemDetailCache(
          accountItemDetailCacheRef.current,
          accountDetailCacheKey(requestScopeKey, instanceId, current.weapon_roll?.fingerprint)
        )
      : null;
    const needsDefinition = !cachedDefinition;
    const needsInstance = Boolean(instanceId && !cachedInstance);
    if (!needsDefinition && !needsInstance) {
      setSelectedItem((value) => value?.item_key === itemKey
        ? withDetailLoadingState(
            cachedInstance
              ? mergeAccountItemDetail(cachedDefinition ? mergeSelectedItemDetail(value, cachedDefinition) : value, cachedInstance)
              : cachedDefinition ? mergeSelectedItemDetail(value, cachedDefinition) : value,
            { definition: false, instance: false }
          )
        : value);
      return;
    }

    setItemDetailError("");
    setItemDetailLoadingKey(itemKey);
    setSelectedItem((value) => value?.item_key === itemKey
      ? withDetailLoadingState(value, { definition: needsDefinition, instance: needsInstance })
      : value);
    const requests: Promise<void>[] = [];
    if (needsDefinition) {
      requests.push(api.getItemDetail(current.hash).then((detail) => {
        if (!isCurrent()) return;
        itemDetailCacheRef.current.set(current.hash, detail);
        evictOldestCacheEntry(itemDetailCacheRef.current, ITEM_DETAIL_CACHE_LIMIT);
        setSelectedItem((value) => value?.item_key === itemKey
          ? withDetailLoadingState(mergeSelectedItemDetail(value, detail), {
              definition: false,
              instance: value.detail_loading?.instance ?? needsInstance
            })
          : value);
      }).catch((error) => {
        if (!isCurrent()) return;
        appendItemDetailError(setItemDetailError, errorMessage(error, "物品定义详情读取失败"));
      }));
    }
    if (instanceId && needsInstance) {
      requests.push(loadAccountItemDetailCached(instanceId, {
        scopeKey: requestScopeKey,
        rollFingerprint: current.weapon_roll?.fingerprint
      }).then((detail) => {
        if (!isCurrent()) return;
        accountItemDetailCacheRef.current.set(
          accountDetailCacheKey(
            requestScopeKey,
            instanceId,
            detail.weapon_roll?.fingerprint ?? current.weapon_roll?.fingerprint
          ),
          detail
        );
        evictOldestCacheEntry(accountItemDetailCacheRef.current, ACCOUNT_ITEM_DETAIL_CACHE_LIMIT);
        setSelectedItem((value) => value?.item_key === itemKey
          ? withDetailLoadingState(mergeAccountItemDetail(value, detail), {
              definition: value.detail_loading?.definition ?? needsDefinition,
              instance: false
            })
          : value);
      }).catch((error) => {
        if (!isCurrent()) return;
        appendItemDetailError(setItemDetailError, errorMessage(error, "完整实例 Roll 读取失败"));
      }));
    }
    await Promise.allSettled(requests);
    if (!isCurrent()) return;
    setSelectedItem((value) => value?.item_key === itemKey
      ? withDetailLoadingState(value, { definition: false, instance: false })
      : value);
    setItemDetailLoadingKey((value) => value === itemKey ? "" : value);
  }

  /**
   * 只补读物品定义的后台读取：给「固有能力」这类只能来自定义、而首屏按规格不自动读定义的内容用。
   *
   * 与 `loadSelectedItemFullDetail` 的差别是刻意的（用户口径：打开详情不读完整掉落，完整 Roll 等点按钮再请求）：
   *
   * - 不读完整实例 Roll；
   * - **不置** `detail_loading` / `is_detail_loading` / `itemDetailLoadingKey`：置了宿主会把整份详情退回全屏
   *   骨架（首屏白屏），而骨架一挂载又会重新触发本函数，读取失败时就是一直在闪；
   * - 失败只追加一次错误文案，**不自动重试**；重试入口是详情里的显式按钮（走 `loadSelectedItemFullDetail`）。
   *
   * 同一件物品单飞：并发调用共享同一个 Promise。返回值表示「定义现在可用」。
   */
  async function loadSelectedItemDefinition(): Promise<boolean> {
    const current = selectedItem;
    if (!current) return false;
    const itemKey = current.item_key;
    const pendingRequest = definitionRequestsRef.current.get(itemKey);
    if (pendingRequest) return pendingRequest;
    const definitionHash = current.hash;
    const requestScopeKey = cacheScopeKeyRef.current;
    const requestSequence = requestSequenceRef.current;
    const isCurrent = () => requestSequenceRef.current === requestSequence
      && cacheScopeKeyRef.current === requestScopeKey;
    const cached = touchItemDetailCache(itemDetailCacheRef.current, definitionHash);
    if (cached) {
      setSelectedItem((value) => value?.item_key === itemKey
        ? mergeDefinitionWithoutLoadingState(value, cached)
        : value);
      return true;
    }
    const request = api.getItemDetail(definitionHash).then((detail) => {
      if (!isCurrent()) return false;
      itemDetailCacheRef.current.set(definitionHash, detail);
      evictOldestCacheEntry(itemDetailCacheRef.current, ITEM_DETAIL_CACHE_LIMIT);
      setSelectedItem((value) => value?.item_key === itemKey
        ? mergeDefinitionWithoutLoadingState(value, detail)
        : value);
      return true;
    }).catch((error) => {
      if (!isCurrent()) return false;
      appendItemDetailError(setItemDetailError, errorMessage(error, "物品定义详情读取失败"));
      return false;
    }).finally(() => {
      if (definitionRequestsRef.current.get(itemKey) === request) {
        definitionRequestsRef.current.delete(itemKey);
      }
    });
    definitionRequestsRef.current.set(itemKey, request);
    return request;
  }

  /**
   * 写后读回的两种跑法。
   *
   * - `interactive`（默认）：用户主动要的读取（手动「重新读取配置」）。照常显示加载态。
   * - `probe`：后台静默校对。照常走网络、照常写缓存，但**不置加载态、不合并进 `selectedItem`、
   *   不写错误文案** —— 后台探针只负责「看上有没有」，没有资格改写用户正在看的界面。
   *   置加载态会让 `.weapon-detail-config-loading-note` 反复挂载/卸载，六列网格跟着上下跳。
   */
  async function refreshSelectedItemDetail(
    options: { mode?: "interactive" | "probe" } = {}
  ): Promise<AccountItemDetail | null> {
    const silent = options.mode === "probe";
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
    deleteAccountItemDetailCacheEntries(accountItemDetailCacheRef.current, requestScopeKey, instanceId);
    invalidateCachedAccountItemDetail(instanceId, requestScopeKey);
    if (!silent) {
      setItemDetailError("");
      setItemDetailLoadingKey(itemKey);
      setSelectedItem((value) => value?.item_key === itemKey
        ? withDetailLoadingState(value, { definition: false, instance: true })
        : value);
    }
    try {
      const detail = await loadAccountItemDetailCached(instanceId, {
        scopeKey: requestScopeKey,
        rollFingerprint: current.weapon_roll?.fingerprint,
        force: true,
        // 探针要的是服务器原样：读到叠了自己乐观值的详情，每轮都会「对上」，永远校不出结果。
        serverTruth: silent
      });
      if (!isCurrent()) return null;
      accountItemDetailCacheRef.current.set(
        accountDetailCacheKey(
          requestScopeKey,
          instanceId,
          detail.weapon_roll?.fingerprint ?? current.weapon_roll?.fingerprint
        ),
        detail
      );
      evictOldestCacheEntry(accountItemDetailCacheRef.current, ACCOUNT_ITEM_DETAIL_CACHE_LIMIT);
      if (!silent) {
        setSelectedItem((value) => value?.item_key === itemKey
          ? withDetailLoadingState(mergeAccountItemDetail(value, detail), { definition: false, instance: false })
          : value);
      }
      return detail;
    } catch (error) {
      if (!isCurrent()) return null;
      if (!silent) {
        setSelectedItem((value) => value?.item_key === itemKey
          ? withDetailLoadingState(value, { definition: false, instance: false })
          : value);
        setItemDetailError(errorMessage(error, "账号实例详情刷新失败"));
      }
      throw error;
    } finally {
      if (isCurrent() && !silent) {
        setItemDetailLoadingKey((value) => value === itemKey ? "" : value);
      }
    }
  }

  /**
   * 把 Bungie 已受理的换 Perk 结果落到本件详情上。
   *
   * 受理即权威：不等服务器读回（实测传播延迟可达数分钟，见 T77）。插槽状态在详情上有四份
   * 并行表示，交给 core 的 `applyAcceptedSocketPlugs` 同源更新。
   *
   * 这里做两件事，缺一不可：登记到模块级的受理状态（活得比弹框久，关掉再打开还认得），
   * 以及就地更新当前这份详情（立刻见效）。只做后者就是 T78 之前那两个 bug。
   */
  function applyAcceptedSocketPlugs(
    instanceId: string,
    changes: readonly AcceptedSocketPlugChange[]
  ): void {
    if (!instanceId || !changes.length) return;
    recordAcceptedSocketPlugs(instanceId, changes);
    setSelectedItem((value) => {
      if (!value || value.instance_id !== instanceId) return value;
      const patch = buildAcceptedSocketPlugPatch(value, changes);
      return patch ? { ...value, ...patch } : value;
    });
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
    loadSelectedItemFullDetail,
    loadSelectedItemDefinition,
    refreshSelectedItemDetail,
    applyAcceptedSocketPlugs,
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
  key: string
): AccountItemDetail | null {
  const detail = cache.get(key);
  if (!detail) return null;

  cache.delete(key);
  cache.set(key, detail);
  return detail;
}

function deleteAccountItemDetailCacheEntries(
  cache: Map<string, AccountItemDetail>,
  scopeKey: string,
  instanceId: string
): void {
  const prefix = `${scopeKey}:${instanceId}:`;
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) cache.delete(key);
  }
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
    power: current.power ?? detail.power,
    locked: current.locked ?? detail.locked,
    armor_stats: detail.armor_stats,
    armor_stat_breakdown: detail.armor_stat_breakdown,
    armor_energy: detail.armor_energy,
    weapon_stats: detail.weapon_stats ?? current.weapon_stats,
    instance: detail.instance || current.instance
      ? { ...detail.instance, ...current.instance }
      : undefined,
    item_objectives: detail.item_objectives,
    catalyst: detail.catalyst,
    sockets: detail.sockets,
    weapon_roll: detail.weapon_roll ?? current.weapon_roll,
    socket_plugs: detail.socket_plugs,
    group_key: detail.group_key,
    bucket_hash: detail.bucket_hash,
    bucket_name: detail.bucket_name,
    weapon_frame: detail.weapon_frame ?? current.weapon_frame,
    detail_loaded: {
      definition: current.detail_loaded?.definition ?? false,
      instance: true
    }
  };
}

function accountDetailCacheKey(scopeKey: string, instanceId: string, rollFingerprint?: string): string {
  return `${scopeKey}:${instanceId}:${rollFingerprint?.trim() || "unknown-roll"}`;
}

function accountDetailInstanceScopeKey(scopeKey: string, instanceId: string): string {
  return `${scopeKey}:${instanceId}`;
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

/**
 * 合并定义事实、但**不动**加载态字段。
 *
 * `mergeSelectedItemDetail` 会把 `is_detail_loading` 置假、`detail_loaded.definition` 置真——那是「正片读取」
 * 的语义。后台只补定义时不能这么算：整份详情的加载态只由「正片读取」（打开详情、点完整掉落池、刷新）决定，
 * 否则一次后台补定义就会把宿主上的 `is_detail_loading` 抹掉，看起来像读完了。
 */
function mergeDefinitionWithoutLoadingState(
  item: SelectedItemDetail,
  detail: ItemDefinitionDetail
): SelectedItemDetail {
  return {
    ...mergeSelectedItemDetail(item, detail),
    detail_loading: item.detail_loading,
    is_detail_loading: item.is_detail_loading
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
