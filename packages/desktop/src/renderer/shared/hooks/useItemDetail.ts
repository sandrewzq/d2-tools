import { useRef, useState } from "react";
import {
  api,
  type AccountItemPlugSummary,
  type AccountItemSummary,
  type ItemDefinitionDetail,
  type ItemSearchResult,
  type ItemSourceSummary,
  type LibraryHistory
} from "../../api/client";

export type SelectedItemDetail = ItemDefinitionDetail & {
  item_key: string;
  instance_id?: string;
  power?: number;
  locked?: boolean;
  socket_plugs?: AccountItemPlugSummary[];
  armor_stats?: AccountItemSummary["armor_stats"];
  group_key?: AccountItemSummary["group_key"];
  bucket_name?: string;
  source_character_id?: string;
  source_kind?: SelectedItemSourceKind;
  is_vault_item?: boolean;
  is_postmaster_item?: boolean;
  is_detail_loading?: boolean;
};

export type SelectedItemSourceKind = "equipped" | "inventory" | "vault" | "postmaster";

export type SelectedItemSource = {
  source_character_id?: string;
  source_kind?: SelectedItemSourceKind;
  is_vault_item?: boolean;
  is_postmaster_item?: boolean;
};

export type SameNameItemSummary = AccountItemSummary & SelectedItemSource & {
  source_kind: SelectedItemSourceKind;
  source_label?: string;
};

type ItemOpenContext = {
  item: AccountItemSummary | ItemSearchResult;
  source: SelectedItemSource;
  itemKey: string;
  isCurrent: () => boolean;
};

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

    const cachedDetail = itemDetailCacheRef.current.get(item.hash);
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

export function selectedItemToAccountItem(item: SelectedItemDetail): AccountItemSummary | null {
  if (!item.group_key) return null;
  return {
    hash: item.hash,
    instance_id: item.instance_id,
    name: item.name,
    icon: item.icon,
    item_type: item.item_type,
    tier: item.tier,
    bucket_name: item.bucket_name,
    group_key: item.group_key,
    power: item.power,
    locked: item.locked,
    armor_stats: item.armor_stats,
    socket_plugs: item.socket_plugs ?? []
  };
}

export function createSelectedItemPreview(
  item: AccountItemSummary | ItemSearchResult,
  source: SelectedItemSource
): SelectedItemDetail {
  return {
    hash: item.hash,
    name: item.name,
    description: "description" in item ? item.description : "",
    icon: item.icon,
    item_type: item.item_type,
    tier: item.tier,
    source: "source" in item ? item.source : itemDetailLoadingSource,
    perks: "perks" in item ? item.perks : undefined,
    item_key: getItemKey(item),
    instance_id: "instance_id" in item ? item.instance_id : undefined,
    power: "power" in item ? item.power : undefined,
    locked: "locked" in item ? item.locked : undefined,
    armor_stats: "armor_stats" in item ? item.armor_stats : undefined,
    socket_plugs: "socket_plugs" in item ? item.socket_plugs : undefined,
    group_key: "group_key" in item ? item.group_key : undefined,
    bucket_name: "bucket_name" in item ? item.bucket_name : undefined,
    source_character_id: source.source_character_id,
    source_kind: source.source_kind,
    is_vault_item: source.is_vault_item,
    is_postmaster_item: source.is_postmaster_item,
    is_detail_loading: true
  };
}

export function mergeSelectedItemDetail(
  current: SelectedItemDetail,
  detail: ItemDefinitionDetail
): SelectedItemDetail {
  return {
    ...current,
    ...detail,
    is_detail_loading: false
  };
}

const itemDetailLoadingSource: ItemSourceSummary = {
  status: "missing",
  label: "详情",
  description: "正在读取来源、perk 和物品说明..."
};

export function getItemKey(item: AccountItemSummary | ItemSearchResult): string {
  return "instance_id" in item && item.instance_id ? item.instance_id : `hash:${item.hash}`;
}
