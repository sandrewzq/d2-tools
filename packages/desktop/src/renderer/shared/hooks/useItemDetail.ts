import { useRef, useState } from "react";
import {
  api } from "../../api/client";
import type { AccountItemSummary, ItemDefinitionDetail, ItemSearchResult, LibraryHistory } from "../../api/types";
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

export function useItemDetail(options: {
  onOpenStart?: (context: ItemOpenContext) => void;
  onRecentHistoryChanged?: (history: LibraryHistory) => void;
} = {}) {
  const [selectedItem, setSelectedItem] = useState<SelectedItemDetail | null>(null);
  const [itemDetailLoadingKey, setItemDetailLoadingKey] = useState("");
  const [itemDetailError, setItemDetailError] = useState("");
  const itemDetailCacheRef = useRef(new Map<number, ItemDefinitionDetail>());
  const itemDetailRequestKeyRef = useRef("");

  async function openItemDetail(item: AccountItemSummary | ItemSearchResult, source: SelectedItemSource = {}) {
    setItemDetailError("");
    const itemKey = getItemKey(item);
    itemDetailRequestKeyRef.current = itemKey;
    setItemDetailLoadingKey(itemKey);
    setSelectedItem(createSelectedItemPreview(item, source));

    options.onOpenStart?.({
      item,
      source,
      itemKey,
      isCurrent: () => itemDetailRequestKeyRef.current === itemKey
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
    if (cachedDetail) {
      setSelectedItem((current) => {
        if (!current || current.item_key !== itemKey) {
          return current;
        }
        return mergeSelectedItemDetail(current, cachedDetail);
      });
      setItemDetailLoadingKey((current) => current === itemKey ? "" : current);
      return;
    }

    try {
      const detail = await api.getItemDetail(item.hash);
      itemDetailCacheRef.current.set(item.hash, detail);
      evictOldestItemDetailCacheEntry(itemDetailCacheRef);
      if (itemDetailRequestKeyRef.current !== itemKey) {
        return;
      }
      setSelectedItem((current) => {
        if (!current || current.item_key !== itemKey) {
          return current;
        }
        return mergeSelectedItemDetail(current, detail);
      });
      setItemDetailLoadingKey((current) => current === itemKey ? "" : current);
    } catch (error) {
      setItemDetailError(error instanceof Error ? error.message : "物品详情读取失败");
    }
  }

  function closeSelectedItemDetail() {
    itemDetailRequestKeyRef.current = "";
    setItemDetailLoadingKey("");
    setSelectedItem(null);
    setItemDetailError("");
  }

  return {
    selectedItem,
    setSelectedItem,
    itemDetailLoadingKey,
    itemDetailError,
    openItemDetail,
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

function evictOldestItemDetailCacheEntry(
  itemDetailCacheRef: { current: Map<number, ItemDefinitionDetail> }
): void {
  while (itemDetailCacheRef.current.size > ITEM_DETAIL_CACHE_LIMIT) {
    const oldestKey = itemDetailCacheRef.current.keys().next().value;
    if (oldestKey === undefined) return;
    itemDetailCacheRef.current.delete(oldestKey);
  }
}
