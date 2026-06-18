import { useMemo, useState } from "react";
import type { AccountItemSummary, EquipmentGroupKey, VaultTags, VaultTagValue } from "../api/client";

export type VaultGroupFilter = EquipmentGroupKey | "all";
export type VaultSortKey = "name" | "group" | "tier";
export type VaultTagFilter = Exclude<VaultTagValue, "none"> | "all" | "untagged";

export type VaultFilter = {
  group: VaultGroupFilter;
  query: string;
  tag?: VaultTagFilter;
  tags?: VaultTags;
};

export type VaultGroupSummary = {
  key: VaultGroupFilter;
  label: string;
  count: number;
};

const vaultGroupLabels: Record<VaultGroupFilter, string> = {
  all: "全部",
  weapons: "武器",
  armor: "护甲",
  equipment: "装备",
  other: "其他"
};

const vaultGroupOrder: VaultGroupFilter[] = ["all", "weapons", "armor", "equipment", "other"];
const tagLabels: Record<VaultTagFilter, string> = {
  all: "全部标记",
  keep: "保留",
  review: "关注",
  junk: "可清理",
  untagged: "未标记"
};
const sortLabels: Record<VaultSortKey, string> = {
  name: "按名称",
  group: "按分组",
  tier: "按品质"
};
const groupSortOrder: Record<EquipmentGroupKey, number> = {
  weapons: 0,
  armor: 1,
  equipment: 2,
  other: 3
};

export function filterVaultItems(items: AccountItemSummary[], filter: VaultFilter): AccountItemSummary[] {
  const query = filter.query.trim().toLocaleLowerCase();
  return items.filter((item) => {
    const matchesGroup = filter.group === "all" || item.group_key === filter.group;
    if (!matchesGroup) return false;
    if (!matchesTag(item, filter.tag ?? "all", filter.tags ?? { items: {} })) return false;
    if (!query) return true;

    return [
      item.name,
      item.item_type,
      item.tier,
      item.bucket_name,
      tierAlias(item.tier)
    ]
      .filter(Boolean)
      .some((value) => value?.toLocaleLowerCase().includes(query));
  });
}

export function getVaultItemKey(item: AccountItemSummary): string {
  return item.instance_id ?? `hash:${item.hash}`;
}

export function buildVaultGroups(items: AccountItemSummary[]): VaultGroupSummary[] {
  return vaultGroupOrder.map((key) => ({
    key,
    label: vaultGroupLabels[key],
    count: key === "all" ? items.length : items.filter((item) => item.group_key === key).length
  }));
}

export function sortVaultItems(items: AccountItemSummary[], sortKey: VaultSortKey): AccountItemSummary[] {
  return [...items].sort((left, right) => {
    if (sortKey === "group") {
      return groupSortOrder[left.group_key] - groupSortOrder[right.group_key]
        || compareText(left.name, right.name);
    }

    if (sortKey === "tier") {
      return tierRank(left.tier) - tierRank(right.tier)
        || compareText(left.name, right.name);
    }

    return compareText(left.name, right.name);
  });
}

export function VaultPanel(props: {
  items: AccountItemSummary[];
  tags: VaultTags;
  onOpenItem: (item: AccountItemSummary) => void;
  onSaveTag: (item: AccountItemSummary, tag: VaultTagValue) => void;
}) {
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState<VaultGroupFilter>("all");
  const [sortKey, setSortKey] = useState<VaultSortKey>("name");
  const [tagFilter, setTagFilter] = useState<VaultTagFilter>("all");
  const groups = useMemo(() => buildVaultGroups(props.items), [props.items]);
  const filteredItems = useMemo(
    () => sortVaultItems(filterVaultItems(props.items, { group, query, tag: tagFilter, tags: props.tags }), sortKey),
    [group, props.items, props.tags, query, sortKey, tagFilter]
  );

  return (
    <section className="tool-panel">
      <div className="section-heading">
        <div>
          <h2>仓库</h2>
          <p>查看完整仓库列表，支持按名称、类型、品质和分组筛选。</p>
        </div>
        <div className="vault-count">
          {filteredItems.length} / {props.items.length}
        </div>
      </div>
      <div className="vault-toolbar">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="搜索仓库，例如：风险管理者 / 异域 / 头盔"
        />
        <label className="compact-field">
          排序
          <select value={sortKey} onChange={(event) => setSortKey(event.target.value as VaultSortKey)}>
            {(Object.keys(sortLabels) as VaultSortKey[]).map((key) => (
              <option key={key} value={key}>{sortLabels[key]}</option>
            ))}
          </select>
        </label>
        <label className="compact-field">
          标记
          <select value={tagFilter} onChange={(event) => setTagFilter(event.target.value as VaultTagFilter)}>
            {(Object.keys(tagLabels) as VaultTagFilter[]).map((key) => (
              <option key={key} value={key}>{tagLabels[key]}</option>
            ))}
          </select>
        </label>
        <div className="segmented-control" aria-label="仓库分组">
          {groups.map((item) => (
            <button
              className={item.key === group ? "active" : ""}
              key={item.key}
              type="button"
              onClick={() => setGroup(item.key)}
            >
              {item.label} <span>{item.count}</span>
            </button>
          ))}
        </div>
      </div>
      {filteredItems.length ? (
        <div className="vault-list">
          {filteredItems.map((item) => (
            <article
              className="vault-list-item"
              key={`${item.hash}-${item.instance_id ?? ""}`}
            >
              <button type="button" className="vault-list-main" onClick={() => props.onOpenItem(item)}>
                {item.icon ? <img alt="" src={item.icon} /> : <div className="item-icon-placeholder" />}
                <div>
                  <strong>{item.name}</strong>
                  <span>{formatVaultItemMeta(item)}</span>
                  {item.socket_plugs?.length ? (
                    <small>{item.socket_plugs.slice(0, 4).map((plug) => plug.name).join(" / ")}</small>
                  ) : null}
                </div>
              </button>
              <div className="vault-tag-row" aria-label={`${item.name} 本地标记`}>
                <span>{tagLabelForItem(item, props.tags)}</span>
                <button type="button" onClick={() => props.onSaveTag(item, "keep")}>保留</button>
                <button type="button" onClick={() => props.onSaveTag(item, "review")}>关注</button>
                <button type="button" onClick={() => props.onSaveTag(item, "junk")}>可清理</button>
                <button type="button" onClick={() => props.onSaveTag(item, "none")}>清除</button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="notice">没有匹配的仓库物品。</p>
      )}
    </section>
  );
}

function matchesTag(item: AccountItemSummary, tag: VaultTagFilter, tags: VaultTags): boolean {
  if (tag === "all") {
    return true;
  }

  const itemTag = tags.items[getVaultItemKey(item)]?.tag;
  if (tag === "untagged") {
    return !itemTag;
  }

  return itemTag === tag;
}

function tagLabelForItem(item: AccountItemSummary, tags: VaultTags): string {
  const tag = tags.items[getVaultItemKey(item)]?.tag;
  return tag ? tagLabels[tag] : "未标记";
}

function formatVaultItemMeta(item: AccountItemSummary): string {
  return [
    item.bucket_name,
    item.item_type,
    item.tier,
    item.power ? `光等 ${item.power}` : undefined,
    item.locked ? "已锁定" : undefined
  ].filter(Boolean).join(" / ");
}

function tierAlias(tier: string | undefined): string | undefined {
  if (!tier) return undefined;
  if (tier.toLocaleLowerCase() === "exotic") return "异域";
  if (tier.toLocaleLowerCase() === "legendary") return "传说";
  return undefined;
}

function tierRank(tier: string | undefined): number {
  const normalized = tier?.toLocaleLowerCase();
  if (normalized === "exotic") return 0;
  if (normalized === "legendary") return 1;
  if (normalized === "rare") return 2;
  return 3;
}

function compareText(left: string | undefined, right: string | undefined): number {
  return (left ?? "").localeCompare(right ?? "", "zh-Hans-CN");
}
