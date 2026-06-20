import { useMemo, useState } from "react";
import { scoreVaultItem, type VaultItemScore, type VaultScoreGrade } from "@d2-tools/core/analysis/scoring";
import { analyzeDuplicateItems, type DuplicateAnalysisResult, type DuplicateItemGroup } from "@d2-tools/core/analysis/duplicates";
import { evaluateWishlistRoll } from "@d2-tools/core/analysis/wishlist";
import type {
  AccountItemSummary,
  AmmoTypeKey,
  DimWishlist,
  EquipmentGroupKey,
  SaveVaultTagInput,
  VaultTags,
  VaultTagValue
} from "../api/client";
import { getAccountItemSlotLabel } from "../utils/accountSlots";

export type VaultGroupFilter = EquipmentGroupKey | "all";
export type VaultSlotFilter = string | "all";
export type VaultAmmoFilter = AmmoTypeKey | "all";
export type VaultSortKey = "name" | "group" | "tier" | "score" | "power";
export type VaultTagFilter = Exclude<VaultTagValue, "none"> | "all" | "untagged" | "noted" | "wishlist";
export type VaultScoreFilter = VaultScoreGrade | "all";
export type VaultScoreRangeFilter = "all" | "80-100" | "60-79" | "40-59" | "0-39";
export type VaultLockFilter = "all" | "locked" | "unlocked";
export type VaultBatchSelectionMode = "visible" | "junk" | "review" | "untagged" | "noted";
export type VaultViewMode = "list" | "duplicates";

type VaultCleanupActions = {
  characters: Array<{ character_id: string; class_name: string; light?: number }>;
  writeActionsEnabled: boolean;
  onBatchUnlock: (items: AccountItemSummary[], targetCharacterId: string) => Promise<string>;
  onBatchTransferToCharacter: (items: AccountItemSummary[], targetCharacterId: string) => Promise<string>;
};

export type VaultFilter = {
  group: VaultGroupFilter;
  query: string;
  tag?: VaultTagFilter;
  score?: VaultScoreFilter;
  scoreRange?: VaultScoreRangeFilter;
  lock?: VaultLockFilter;
  slot?: VaultSlotFilter;
  ammo?: VaultAmmoFilter;
  tags?: VaultTags;
  wishlist?: DimWishlist | null;
};

type ParsedVaultQuery = {
  text: string;
  tag?: VaultTagFilter;
  locked?: boolean;
  type?: VaultGroupFilter;
  score?: {
    operator: ">=" | "<=" | ">" | "<" | "=";
    value: number;
  };
};

export type VaultGroupSummary = {
  key: VaultGroupFilter;
  label: string;
  count: number;
};

export type VaultSlotSummary = {
  key: VaultSlotFilter;
  label: string;
  count: number;
};

export type VaultSection = {
  key: string;
  label: string;
  count: number;
  items: AccountItemSummary[];
};

const vaultGroupLabels: Record<VaultGroupFilter, string> = {
  all: "全部",
  weapons: "武器",
  armor: "护甲",
  equipment: "装备",
  other: "其他"
};

const vaultGroupOrder: VaultGroupFilter[] = ["all", "weapons", "armor", "equipment", "other"];
const defaultVaultGroupTab: VaultGroupFilter = "weapons";
const tagLabels: Record<VaultTagFilter, string> = {
  all: "全部标记",
  keep: "保留",
  review: "关注",
  junk: "可清理",
  untagged: "未标记",
  noted: "有备注",
  wishlist: "DIM 愿望单"
};
const scoreFilterLabels: Record<VaultScoreFilter, string> = {
  all: "全部推荐",
  keep: "建议保留",
  review: "建议复查",
  junk: "可清理"
};
const scoreRangeFilterLabels: Record<VaultScoreRangeFilter, string> = {
  all: "全部评分",
  "80-100": "80-100 分",
  "60-79": "60-79 分",
  "40-59": "40-59 分",
  "0-39": "0-39 分"
};
const sortLabels: Record<VaultSortKey, string> = {
  name: "按名称",
  group: "按分组",
  tier: "按品质",
  score: "按评分",
  power: "按光等"
};
const lockFilterLabels: Record<VaultLockFilter, string> = {
  all: "全部锁定状态",
  locked: "已锁定",
  unlocked: "未锁定"
};
const ammoFilterLabels: Record<VaultAmmoFilter, string> = {
  all: "全部弹药",
  primary: "主弹",
  special: "特殊",
  heavy: "重弹"
};
const groupSortOrder: Record<EquipmentGroupKey, number> = {
  weapons: 0,
  armor: 1,
  equipment: 2,
  other: 3
};

export function filterVaultItems(items: AccountItemSummary[], filter: VaultFilter): AccountItemSummary[] {
  const parsedQuery = parseVaultQuery(filter.query);
  const query = parsedQuery.text.toLocaleLowerCase();
  return items.filter((item) => {
    const entry = (filter.tags ?? { items: {} }).items[getVaultItemKey(item)];
    const matchesGroup = filter.group === "all" || item.group_key === filter.group;
    if (!matchesGroup) return false;
    if (!matchesTag(item, filter.tag ?? "all", filter.tags ?? { items: {} }, filter.wishlist)) return false;
    if (parsedQuery.tag && !matchesTag(item, parsedQuery.tag, filter.tags ?? { items: {} }, filter.wishlist)) return false;
    if (!matchesScore(item, filter.score ?? "all", filter.tags ?? { items: {} })) return false;
    if (!matchesScoreRange(item, filter.scoreRange ?? "all", filter.tags ?? { items: {} })) return false;
    if (parsedQuery.score && !matchesScoreExpression(item, parsedQuery.score, filter.tags ?? { items: {} })) return false;
    if (!matchesLock(item, filter.lock ?? "all")) return false;
    if (!matchesSlot(item, filter.slot ?? "all")) return false;
    if (!matchesAmmo(item, filter.ammo ?? "all")) return false;
    if (parsedQuery.locked !== undefined && item.locked !== parsedQuery.locked) return false;
    if (parsedQuery.type && parsedQuery.type !== "all" && item.group_key !== parsedQuery.type) return false;
    if (!query) return true;

    return [
      item.name,
      item.item_type,
      item.tier,
      item.bucket_name,
      tierAlias(item.tier),
      entry?.note
    ]
      .filter(Boolean)
      .some((value) => value?.toLocaleLowerCase().includes(query));
  });
}

export function parseVaultQuery(query: string): ParsedVaultQuery {
  const textParts: string[] = [];
  const parsed: ParsedVaultQuery = { text: "" };
  for (const token of query.trim().split(/\s+/).filter(Boolean)) {
    const lower = token.toLocaleLowerCase();
    if (lower.startsWith("tag:")) {
      const tag = lower.slice("tag:".length);
      if (isVaultTagFilter(tag)) {
        parsed.tag = tag;
        continue;
      }
    }
    if (lower.startsWith("locked:")) {
      const value = lower.slice("locked:".length);
      if (value === "true" || value === "yes" || value === "已锁定") {
        parsed.locked = true;
        continue;
      }
      if (value === "false" || value === "no" || value === "未锁定") {
        parsed.locked = false;
        continue;
      }
    }
    if (lower.startsWith("type:")) {
      const type = typeFilterFor(lower.slice("type:".length));
      if (type) {
        parsed.type = type;
        continue;
      }
    }
    const scoreMatch = lower.match(/^score(>=|<=|>|<|=)(\d{1,3})$/);
    if (scoreMatch) {
      parsed.score = {
        operator: scoreMatch[1] as NonNullable<ParsedVaultQuery["score"]>["operator"],
        value: Number(scoreMatch[2])
      };
      continue;
    }
    textParts.push(token);
  }
  parsed.text = textParts.join(" ").trim();
  return parsed;
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

export function buildVaultSlotFilters(items: AccountItemSummary[]): VaultSlotSummary[] {
  const sections = buildVaultSections(items);
  return [
    { key: "all", label: "全部位置", count: items.length },
    ...sections.map((section) => ({
      key: section.key,
      label: section.label,
      count: section.count
    }))
  ];
}

export function buildVaultSections(items: AccountItemSummary[]): VaultSection[] {
  const sectionMap = new Map<string, VaultSection>();
  for (const item of items) {
    const label = getAccountItemSlotLabel(item);
    const key = label;
    const section = sectionMap.get(key) ?? {
      key,
      label,
      count: 0,
      items: []
    };
    section.items.push(item);
    section.count = section.items.length;
    sectionMap.set(key, section);
  }

  return [...sectionMap.values()].sort(compareVaultSections);
}

export function sortVaultItems(
  items: AccountItemSummary[],
  sortKey: VaultSortKey,
  tags: VaultTags = { items: {} }
): AccountItemSummary[] {
  return [...items].sort((left, right) => {
    if (sortKey === "score") {
      return scoreVaultItemForDisplay(right, tags).score - scoreVaultItemForDisplay(left, tags).score
        || compareText(left.name, right.name);
    }

    if (sortKey === "power") {
      return (right.power ?? 0) - (left.power ?? 0)
        || compareText(left.name, right.name);
    }

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

export function scoreVaultItemForDisplay(item: AccountItemSummary, tags: VaultTags): VaultItemScore & {
  label: string;
} {
  const score = scoreVaultItem(item, tags);
  return {
    ...score,
    label: scoreFilterLabels[score.grade]
  };
}

export function selectVaultBatchItems(
  items: AccountItemSummary[],
  mode: VaultBatchSelectionMode,
  tags: VaultTags
): AccountItemSummary[] {
  if (mode === "visible") {
    return items;
  }
  if (mode === "untagged") {
    return items.filter((item) => !tags.items[getVaultItemKey(item)]?.tag);
  }
  if (mode === "noted") {
    return items.filter((item) => Boolean(tags.items[getVaultItemKey(item)]?.note));
  }

  return items.filter((item) => scoreVaultItemForDisplay(item, tags).grade === mode);
}

export function selectMarkedCleanupItems(items: AccountItemSummary[], tags: VaultTags): AccountItemSummary[] {
  return items.filter((item) => tags.items[getVaultItemKey(item)]?.tag === "junk");
}

export function buildVaultCleanupText(items: AccountItemSummary[], tags: VaultTags): string {
  const lines = [
    "d2-tools 仓库清理清单",
    `生成时间：${new Date().toLocaleString("zh-CN")}`,
    `物品数量：${items.length}`,
    ""
  ];

  items.forEach((item, index) => {
    const score = scoreVaultItemForDisplay(item, tags);
    lines.push(`${index + 1}. ${item.name}`);
    lines.push(`   推荐：${score.label} / ${score.score} 分`);
    lines.push(`   类型：${[item.bucket_name, item.item_type, item.tier].filter(Boolean).join(" / ") || "未知"}`);
    lines.push(`   原因：${score.reasons.join("；")}`);
    if (score.warnings.length) {
      lines.push(`   提醒：${score.warnings.join("；")}`);
    }
    const note = tags.items[getVaultItemKey(item)]?.note;
    if (note) {
      lines.push(`   备注：${note}`);
    }
    lines.push("");
  });

  return lines.join("\n").trimEnd();
}

export function buildVaultCleanupLocatorText(items: AccountItemSummary[], tags: VaultTags): string {
  const duplicateNameCounts = items.reduce<Map<string, number>>((counts, item) => {
    counts.set(item.name, (counts.get(item.name) ?? 0) + 1);
    return counts;
  }, new Map());
  const lines = [
    "游戏内定位提示",
    "d2-tools 的标记只保存在本机，游戏里不会显示。建议先把候选装备转移到同一个角色背包，再按下面信息逐件核对。",
    ""
  ];

  items.forEach((item, index) => {
    const key = getVaultItemKey(item);
    const tag = tags.items[key]?.tag;
    const note = tags.items[key]?.note;
    const plugs = item.socket_plugs?.map((plug) => plug.name).filter(Boolean).slice(0, 5).join(" / ");
    const duplicateCount = duplicateNameCounts.get(item.name) ?? 0;
    lines.push(`${index + 1}. ${item.name}`);
    lines.push(`   定位：${formatVaultItemMeta(item) || "未知位置 / 未知类型"}`);
    if (item.power) lines.push(`   光等 ${item.power}`);
    lines.push(`   ${item.locked ? "已锁定" : "未锁定"}`);
    if (plugs) lines.push(`   Perk：${plugs}`);
    if (tag) lines.push(`   本地标记：${tagLabels[tag]}`);
    if (note) lines.push(`   备注：${note}`);
    if (duplicateCount > 1) lines.push(`   同名装备有 ${duplicateCount} 件，请按光等、锁定状态和 Perk 区分。`);
    lines.push("");
  });

  return lines.join("\n").trimEnd();
}

export function buildVaultDuplicateSummary(items: AccountItemSummary[], tags: VaultTags): DuplicateAnalysisResult {
  return analyzeDuplicateItems(items.map(normalizeCoreItem), tags);
}

export function countWishlistMatches(items: AccountItemSummary[], wishlist?: DimWishlist | null): number {
  if (!wishlist) {
    return 0;
  }

  return items.reduce((count, item) => (
    evaluateWishlistRoll(normalizeCoreItem(item), wishlist).matched ? count + 1 : count
  ), 0);
}

export type DuplicateGroupBatchTagMode =
  | "keep-best-review-rest"
  | "keep-best-junk-rest"
  | "clear-group-tags";

export type DuplicateGroupSelectionMode =
  | "rest"
  | "junk";

export function buildDuplicateGroupBatchTagPlan(
  group: DuplicateItemGroup,
  mode: DuplicateGroupBatchTagMode,
  keepItemKey = group.items[0]?.item_key ?? ""
): SaveVaultTagInput[] {
  if (mode === "clear-group-tags") {
    return group.items.map((item) => ({
      item_key: item.item_key,
      tag: "none"
    }));
  }

  return group.items.map((item, index) => ({
    item_key: item.item_key,
    tag: item.item_key === keepItemKey || (!keepItemKey && index === 0)
      ? "keep"
      : mode === "keep-best-review-rest"
        ? "review"
        : "junk"
  }));
}

export function selectDuplicateGroupItems(
  group: DuplicateItemGroup,
  mode: DuplicateGroupSelectionMode,
  keepItemKey = group.items[0]?.item_key ?? ""
): string[] {
  if (mode === "junk") {
    return group.items
      .filter((item) => item.item_key !== keepItemKey && item.recommendation === "junk")
      .map((item) => item.item_key);
  }

  return group.items
    .filter((item) => item.item_key !== keepItemKey)
    .map((item) => item.item_key);
}

export function VaultPanel(props: {
  items: AccountItemSummary[];
  tags: VaultTags;
  wishlist?: DimWishlist | null;
  openingItemKey?: string;
  onOpenItem: (item: AccountItemSummary) => void;
  onSaveTag: (item: AccountItemSummary, tag: VaultTagValue) => void | Promise<void>;
  onSaveTagBatch: (inputs: SaveVaultTagInput[]) => void | Promise<void>;
  cleanupActions?: VaultCleanupActions;
}) {
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState<VaultGroupFilter>(defaultVaultGroupTab);
  const [sortKey, setSortKey] = useState<VaultSortKey>("name");
  const [tagFilter, setTagFilter] = useState<VaultTagFilter>("all");
  const [scoreFilter, setScoreFilter] = useState<VaultScoreFilter>("all");
  const [scoreRangeFilter, setScoreRangeFilter] = useState<VaultScoreRangeFilter>("all");
  const [lockFilter, setLockFilter] = useState<VaultLockFilter>("all");
  const [slotFilter, setSlotFilter] = useState<VaultSlotFilter>("all");
  const [ammoFilter, setAmmoFilter] = useState<VaultAmmoFilter>("all");
  const [isOrganizing, setIsOrganizing] = useState(false);
  const [isCleanupMode, setIsCleanupMode] = useState(false);
  const [cleanupCharacterId, setCleanupCharacterId] = useState("");
  const [viewMode, setViewMode] = useState<VaultViewMode>("list");
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(() => new Set());
  const [batchMessage, setBatchMessage] = useState("");
  const [isBatchSaving, setIsBatchSaving] = useState(false);
  const [activeBatchAction, setActiveBatchAction] = useState("");
  const cleanupCharacters = props.cleanupActions?.characters ?? [];
  const cleanupTargetCharacterId = cleanupCharacterId || cleanupCharacters[0]?.character_id || "";
  const groups = useMemo(() => buildVaultGroups(props.items), [props.items]);
  const slotFilters = useMemo(
    () => buildVaultSlotFilters(filterVaultItems(props.items, {
      group,
      query: "",
      tag: tagFilter,
      score: scoreFilter,
      scoreRange: scoreRangeFilter,
      lock: lockFilter,
      ammo: ammoFilter,
      tags: props.tags,
      wishlist: props.wishlist
    })),
    [ammoFilter, group, lockFilter, props.items, props.tags, props.wishlist, scoreFilter, scoreRangeFilter, tagFilter]
  );
  const filteredItems = useMemo(
    () => sortVaultItems(
      filterVaultItems(props.items, {
        group,
        query,
        tag: tagFilter,
        score: scoreFilter,
        scoreRange: scoreRangeFilter,
        lock: lockFilter,
        slot: slotFilter,
        ammo: ammoFilter,
        tags: props.tags,
        wishlist: props.wishlist
      }),
      sortKey,
      props.tags
    ),
    [ammoFilter, group, lockFilter, props.items, props.tags, props.wishlist, query, scoreFilter, scoreRangeFilter, slotFilter, sortKey, tagFilter]
  );
  const filteredSections = useMemo(
    () => buildVaultSections(filteredItems),
    [filteredItems]
  );
  const selectedItems = useMemo(
    () => filteredItems.filter((item) => selectedKeys.has(getVaultItemKey(item))),
    [filteredItems, selectedKeys]
  );
  const markedCleanupItems = useMemo(
    () => selectMarkedCleanupItems(props.items, props.tags),
    [props.items, props.tags]
  );
  const wishlistSummaryCount = useMemo(
    () => countWishlistMatches(props.items, props.wishlist),
    [props.items, props.wishlist]
  );
  const selectedCleanupItems = useMemo(
    () => markedCleanupItems.filter((item) => selectedKeys.has(getVaultItemKey(item))),
    [markedCleanupItems, selectedKeys]
  );
  const cleanupActionItems = selectedCleanupItems.length ? selectedCleanupItems : markedCleanupItems;
  const duplicateSummary = useMemo(
    () => buildVaultDuplicateSummary(props.items, props.tags),
    [props.items, props.tags]
  );

  function setBatchSelection(mode: VaultBatchSelectionMode) {
    setSelectedKeys(new Set(selectVaultBatchItems(filteredItems, mode, props.tags).map(getVaultItemKey)));
    setBatchMessage("");
  }

  function toggleSelected(item: AccountItemSummary) {
    const itemKey = getVaultItemKey(item);
    setSelectedKeys((current) => {
      const next = new Set(current);
      if (next.has(itemKey)) {
        next.delete(itemKey);
      } else {
        next.add(itemKey);
      }
      return next;
    });
    setBatchMessage("");
  }

  function clearFilters() {
    setQuery("");
    setGroup(defaultVaultGroupTab);
    setSortKey("name");
    setTagFilter("all");
    setScoreFilter("all");
    setScoreRangeFilter("all");
    setLockFilter("all");
    setSlotFilter("all");
    setAmmoFilter("all");
    setActiveBatchAction("");
    setBatchMessage("");
  }

  function mergeSelectedKeys(keys: string[]) {
    if (!keys.length) {
      setBatchMessage("这一组没有可加入的候选。");
      return;
    }

    setSelectedKeys((current) => {
      const next = new Set(current);
      for (const key of keys) {
        next.add(key);
      }
      setBatchMessage(`已加入 ${keys.length} 件候选，当前共 ${next.size} 件。`);
      return next;
    });
    setIsOrganizing(true);
    setIsCleanupMode(false);
  }

  async function applyBatchTag(tag: VaultTagValue) {
    setIsBatchSaving(true);
    setActiveBatchAction(tag === "review" ? "批量关注" : tag === "junk" ? "批量可清理" : "批量清除");
    setBatchMessage(tag === "review" ? "正在批量标记为关注..." : tag === "junk" ? "正在批量标记为可清理..." : "正在批量清除本地标记...");

    try {
      for (const item of selectedItems) {
        await props.onSaveTag(item, tag);
      }
      setBatchMessage(`已处理 ${selectedItems.length} 件装备。`);
      setSelectedKeys(new Set());
    } catch (error) {
      setBatchMessage(error instanceof Error ? error.message : "批量标记失败");
    } finally {
      setIsBatchSaving(false);
      setActiveBatchAction("");
    }
  }

  async function copyCleanupList() {
    const cleanupItems = isCleanupMode
      ? cleanupActionItems
      : selectedItems.length
      ? selectedItems
      : selectVaultBatchItems(filteredItems, "junk", props.tags);
    const text = buildVaultCleanupText(cleanupItems, props.tags);
    try {
      await navigator.clipboard.writeText(`${text}\n\n${buildVaultCleanupLocatorText(cleanupItems, props.tags)}`);
      setBatchMessage(`已复制 ${cleanupItems.length} 件装备的清理清单。`);
    } catch {
      setBatchMessage("剪贴板不可用，请稍后重试。");
    }
  }

  async function runCleanupAction(action: "unlock" | "transfer") {
    if (!props.cleanupActions) return;
    if (!cleanupTargetCharacterId) {
      setBatchMessage("请先选择目标角色。");
      return;
    }

    setIsBatchSaving(true);
    setActiveBatchAction(action === "unlock" ? "批量解锁" : "转移到角色背包");
    setBatchMessage(action === "unlock" ? "正在批量解锁..." : "正在转移到角色背包...");

    try {
      const message = action === "unlock"
        ? await props.cleanupActions.onBatchUnlock(cleanupActionItems, cleanupTargetCharacterId)
        : await props.cleanupActions.onBatchTransferToCharacter(cleanupActionItems, cleanupTargetCharacterId);
      setBatchMessage(message);
    } catch (error) {
      setBatchMessage(error instanceof Error ? error.message : "清理操作失败");
    } finally {
      setIsBatchSaving(false);
      setActiveBatchAction("");
    }
  }

  async function applyDuplicateGroupTags(
    group: DuplicateItemGroup,
    mode: DuplicateGroupBatchTagMode,
    keepItemKey = group.items[0]?.item_key ?? ""
  ) {
    setIsBatchSaving(true);
    setActiveBatchAction(
      mode === "keep-best-review-rest"
        ? "重复组标记为关注"
        : mode === "keep-best-junk-rest"
          ? "重复组标记为可清理"
          : "清除重复组标记"
    );
    setBatchMessage(
      mode === "keep-best-review-rest"
        ? `正在处理 ${group.name}，保留选中件，其余标记为关注...`
        : mode === "keep-best-junk-rest"
          ? `正在处理 ${group.name}，保留选中件，其余标记为可清理...`
          : `正在清除 ${group.name} 这组装备的本地标记...`
    );

    try {
      await props.onSaveTagBatch(buildDuplicateGroupBatchTagPlan(group, mode, keepItemKey));
      const message = mode === "keep-best-review-rest"
        ? `已处理 ${group.name}，保留选中件，其余标记为关注`
        : mode === "keep-best-junk-rest"
          ? `已处理 ${group.name}，保留选中件，其余标记为可清理`
          : `已清除 ${group.name} 这组装备的本地标记`;
      setBatchMessage(message);
    } catch (error) {
      setBatchMessage(error instanceof Error ? error.message : "重复组批量标记失败");
    } finally {
      setIsBatchSaving(false);
      setActiveBatchAction("");
    }
  }

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
      <div className="vault-content-tabs" role="tablist" aria-label="仓库内容标签">
        {groups.map((item) => (
          <button
            className={item.key === group ? "vault-content-tab active" : "vault-content-tab"}
            key={item.key}
            role="tab"
            aria-selected={item.key === group}
            type="button"
            onClick={() => setGroup(item.key)}
          >
            <strong>{item.label}</strong>
            <span>{item.count}</span>
          </button>
        ))}
      </div>
      <div className="vault-organize-bar">
        <button
          type="button"
          className={viewMode === "duplicates" ? "secondary-button active" : "secondary-button"}
          aria-busy={false}
          onClick={() => setViewMode(viewMode === "duplicates" ? "list" : "duplicates")}
        >
          同名对比 {duplicateSummary.total_duplicate_groups}
        </button>
        <button
          type="button"
          className={isOrganizing ? "secondary-button" : ""}
          aria-busy={false}
          onClick={() => {
            setIsOrganizing(!isOrganizing);
            setIsCleanupMode(false);
            setSelectedKeys(new Set());
            setBatchMessage("");
          }}
        >
          {isOrganizing ? "退出整理" : "整理模式"}
        </button>
        <button
          type="button"
          className={isCleanupMode ? "secondary-button active" : "secondary-button"}
          aria-busy={false}
          onClick={() => {
            const nextCleanupMode = !isCleanupMode;
            setIsCleanupMode(nextCleanupMode);
            setIsOrganizing(false);
            setSelectedKeys(nextCleanupMode
              ? new Set(markedCleanupItems.map(getVaultItemKey))
              : new Set());
            setBatchMessage("");
          }}
        >
          {isCleanupMode ? "退出清理" : "清理模式"}
        </button>
        {isOrganizing ? (
          <>
            <button type="button" onClick={() => setBatchSelection("visible")}>选择当前结果</button>
            <button type="button" onClick={() => setBatchSelection("junk")}>选择可清理</button>
            <button type="button" onClick={() => setBatchSelection("review")}>选择复查</button>
            <button type="button" onClick={() => setBatchSelection("untagged")}>选择未标记</button>
            <button type="button" onClick={() => setBatchSelection("noted")}>选择有备注</button>
            <button type="button" className="secondary-button" onClick={() => setSelectedKeys(new Set())}>清空</button>
          </>
        ) : null}
      </div>
      {isOrganizing ? (
        <div className="vault-batch-panel">
          <span>{isBatchSaving && activeBatchAction ? `${activeBatchAction}...` : `已选择 ${selectedItems.length} 件`}</span>
            <button type="button" aria-busy={isBatchSaving} disabled={!selectedItems.length || isBatchSaving} onClick={() => void applyBatchTag("review")}>
            {isBatchSaving && activeBatchAction === "批量关注" ? "处理中..." : "批量关注"}
          </button>
          <button type="button" aria-busy={isBatchSaving} disabled={!selectedItems.length || isBatchSaving} onClick={() => void applyBatchTag("junk")}>
            {isBatchSaving && activeBatchAction === "批量可清理" ? "处理中..." : "批量可清理"}
          </button>
          <button type="button" aria-busy={isBatchSaving} disabled={!selectedItems.length || isBatchSaving} onClick={() => void applyBatchTag("none")}>
            {isBatchSaving && activeBatchAction === "批量清除" ? "处理中..." : "批量清除"}
          </button>
          <button type="button" aria-busy={isBatchSaving} disabled={isBatchSaving} onClick={() => void copyCleanupList()}>
            {isBatchSaving ? "处理中..." : "复制清理清单"}
          </button>
        </div>
      ) : null}
      {isCleanupMode ? (
        <div className="vault-cleanup-panel">
          <div>
            <strong>清理准备</strong>
            <p>
              已标记 {markedCleanupItems.length} 件可清理。不会分解装备，只会把装备解锁并转移到角色背包，最后仍需进游戏手动分解。
            </p>
          </div>
          {cleanupCharacters.length ? (
            <label className="compact-field">
              接收角色
              <select value={cleanupTargetCharacterId} onChange={(event) => setCleanupCharacterId(event.target.value)}>
                {cleanupCharacters.map((character) => (
                  <option key={character.character_id} value={character.character_id}>
                    {character.class_name} / 光等 {character.light ?? "-"}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <p className="notice">请先读取账号角色数据。</p>
          )}
          <div className="vault-cleanup-actions">
            <span>本次处理 {cleanupActionItems.length} 件</span>
            <button type="button" className="secondary-button" aria-busy={isBatchSaving} disabled={isBatchSaving} onClick={() => void copyCleanupList()}>
              {isBatchSaving ? "处理中..." : "复制清理清单"}
            </button>
            <button
              type="button"
              aria-busy={isBatchSaving}
              disabled={!cleanupActionItems.length || !props.cleanupActions?.writeActionsEnabled || !cleanupTargetCharacterId || isBatchSaving}
              onClick={() => void runCleanupAction("unlock")}
            >
              {isBatchSaving ? "处理中..." : "批量解锁"}
            </button>
            <button
              type="button"
              aria-busy={isBatchSaving}
              disabled={!cleanupActionItems.length || !props.cleanupActions?.writeActionsEnabled || !cleanupTargetCharacterId || isBatchSaving}
              onClick={() => void runCleanupAction("transfer")}
            >
              {isBatchSaving ? "处理中..." : "转移到角色背包"}
            </button>
          </div>
          {!props.cleanupActions?.writeActionsEnabled ? (
            <p className="notice">写操作未开启。需要到设置页开启后，才能批量解锁或转移装备。</p>
          ) : null}
          <p className="muted-copy">提示：游戏里看不到 d2-tools 的本地标记；转移到角色背包后，可以按这份清单在游戏里逐件分解。</p>
          {cleanupActionItems.length ? (
            <div className="vault-cleanup-locator">
              <strong>游戏内定位</strong>
              <p>先转移到目标角色背包，再按位置、光等、锁定状态和 Perk 核对。同名装备很多时，这些信息比只看名字更可靠。</p>
              <ul>
                {cleanupActionItems.slice(0, 8).map((item) => {
                  const key = getVaultItemKey(item);
                  const note = props.tags.items[key]?.note;
                  const plugText = item.socket_plugs?.map((plug) => plug.name).filter(Boolean).slice(0, 3).join(" / ");
                  return (
                    <li key={key}>
                      <b>{item.name}</b>
                      <small>{formatVaultItemMeta(item) || "未知位置"}{plugText ? ` / ${plugText}` : ""}</small>
                      {note ? <small>备注：{note}</small> : null}
                    </li>
                  );
                })}
              </ul>
              {cleanupActionItems.length > 8 ? <span>还有 {cleanupActionItems.length - 8} 件，复制清单可查看完整定位信息。</span> : null}
            </div>
          ) : null}
        </div>
      ) : null}
      {batchMessage ? <p className="notice">{batchMessage}</p> : null}
      {duplicateSummary.total_duplicate_groups ? (
        <div className="vault-duplicate-summary">
          <strong>重复组 {duplicateSummary.total_duplicate_groups} 组</strong>
          <span>共 {duplicateSummary.total_duplicate_items} 件同名或同 Hash 装备，可优先检查低分项。</span>
        </div>
      ) : null}
      {props.wishlist ? (
        <div className="vault-duplicate-summary">
          <strong>DIM 愿望单命中 {wishlistSummaryCount} 件</strong>
          <span>当前仓库里命中你已导入 DIM 规则的装备数量，可直接用“DIM 愿望单”筛选查看。</span>
        </div>
      ) : null}
      <div className="vault-toolbar">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="自然搜索名称、类型、perk 或备注"
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
        <label className="compact-field">
          推荐
          <select value={scoreFilter} onChange={(event) => setScoreFilter(event.target.value as VaultScoreFilter)}>
            {(Object.keys(scoreFilterLabels) as VaultScoreFilter[]).map((key) => (
              <option key={key} value={key}>{scoreFilterLabels[key]}</option>
            ))}
          </select>
        </label>
        <label className="compact-field">
          评分
          <select value={scoreRangeFilter} onChange={(event) => setScoreRangeFilter(event.target.value as VaultScoreRangeFilter)}>
            {(Object.keys(scoreRangeFilterLabels) as VaultScoreRangeFilter[]).map((key) => (
              <option key={key} value={key}>{scoreRangeFilterLabels[key]}</option>
            ))}
          </select>
        </label>
        <label className="compact-field">
          锁定
          <select value={lockFilter} onChange={(event) => setLockFilter(event.target.value as VaultLockFilter)}>
            {(Object.keys(lockFilterLabels) as VaultLockFilter[]).map((key) => (
              <option key={key} value={key}>{lockFilterLabels[key]}</option>
            ))}
          </select>
        </label>
        <label className="compact-field">
          位置
          <select value={slotFilter} onChange={(event) => setSlotFilter(event.target.value)}>
            {slotFilters.map((item) => (
              <option key={item.key} value={item.key}>{item.label} {item.count}</option>
            ))}
          </select>
        </label>
        <label className="compact-field">
          弹药
          <select value={ammoFilter} onChange={(event) => setAmmoFilter(event.target.value as VaultAmmoFilter)}>
            {(Object.keys(ammoFilterLabels) as VaultAmmoFilter[]).map((key) => (
              <option key={key} value={key}>{ammoFilterLabels[key]}</option>
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
        <button type="button" className="secondary-button" onClick={clearFilters}>
          清空筛选
        </button>
      </div>
      {viewMode === "duplicates" ? (
        duplicateSummary.groups.length ? (
          <div className="duplicate-group-list">
            {duplicateSummary.groups.map((group) => {
              const selectedGroupCount = group.items.filter((entry) => selectedKeys.has(entry.item_key)).length;
              const junkCandidateKeys = selectDuplicateGroupItems(group, "junk");
              const restCandidateKeys = selectDuplicateGroupItems(group, "rest");
              return (
                <section className="duplicate-group" key={group.group_key}>
                <div className="duplicate-group-heading">
                  <h3>{group.name}</h3>
                  <span>{group.count} 件 / 已选候选 {selectedGroupCount}</span>
                </div>
                <div className="vault-batch-panel">
                  <button
                    type="button"
                    aria-busy={isBatchSaving}
                    disabled={isBatchSaving}
                    onClick={() => {
                      const topItem = props.items.find((candidate) => getVaultItemKey(candidate) === group.items[0]?.item_key);
                      if (topItem) props.onOpenItem(topItem);
                    }}
                  >
                    打开最高分
                  </button>
                  <button
                    type="button"
                    aria-busy={isBatchSaving}
                    disabled={isBatchSaving || !restCandidateKeys.length}
                    onClick={() => mergeSelectedKeys(restCandidateKeys)}
                  >
                    选择其余候选
                  </button>
                  <button
                    type="button"
                    aria-busy={isBatchSaving}
                    disabled={isBatchSaving || !junkCandidateKeys.length}
                    onClick={() => mergeSelectedKeys(junkCandidateKeys)}
                  >
                    选择可清理候选
                  </button>
                  <button
                    type="button"
                    aria-busy={isBatchSaving}
                    disabled={isBatchSaving}
                    onClick={() => void applyDuplicateGroupTags(group, "keep-best-review-rest")}
                  >
                    其余标记关注
                  </button>
                  <button
                    type="button"
                    aria-busy={isBatchSaving}
                    disabled={isBatchSaving}
                    onClick={() => void applyDuplicateGroupTags(group, "keep-best-junk-rest")}
                  >
                    其余标记可清理
                  </button>
                  <button
                    type="button"
                    aria-busy={isBatchSaving}
                    disabled={isBatchSaving}
                    onClick={() => void applyDuplicateGroupTags(group, "clear-group-tags")}
                  >
                    清除本组标记
                  </button>
                </div>
                {group.items.map((entry) => {
                  const item = props.items.find((candidate) => getVaultItemKey(candidate) === entry.item_key);
                  const itemMeta = item ? formatVaultItemMeta(item) : "未找到实例信息";
                  const note = item ? props.tags.items[getVaultItemKey(item)]?.note : undefined;
                  const isSelected = selectedKeys.has(entry.item_key);
                  return (
                    <article
                      className={item && getVaultItemKey(item) === props.openingItemKey
                        ? `duplicate-row duplicate-${entry.recommendation} pending${isSelected ? " selected" : ""}`
                        : `duplicate-row duplicate-${entry.recommendation}${isSelected ? " selected" : ""}`}
                      key={entry.item_key}
                    >
                      <button
                        className="duplicate-row-main"
                        type="button"
                        title={itemMeta}
                        disabled={!item}
                        aria-busy={Boolean(item && getVaultItemKey(item) === props.openingItemKey)}
                        onClick={() => item && props.onOpenItem(item)}
                      >
                        <strong>{entry.score.score} 分 / {scoreFilterLabels[entry.recommendation]}</strong>
                        <span>{entry.roll_text || "暂无实际 roll"}</span>
                        <small className="duplicate-row-meta">{itemMeta}</small>
                        <small>{entry.locked ? "已锁定" : "未锁定"} / {entry.tag ?? "未标记"}{isSelected ? " / 已选候选" : ""}</small>
                        {note ? <small className="duplicate-row-note">备注：{note}</small> : null}
                      </button>
                      <div className="duplicate-row-actions">
                        <button
                          type="button"
                          className="secondary-button"
                          aria-busy={isBatchSaving}
                          disabled={isBatchSaving || !item}
                          onClick={() => item && void applyDuplicateGroupTags(group, "keep-best-review-rest", entry.item_key)}
                        >
                          保留这件，其余关注
                        </button>
                        <button
                          type="button"
                          className="secondary-button"
                          aria-busy={isBatchSaving}
                          disabled={isBatchSaving || !item}
                          onClick={() => item && void applyDuplicateGroupTags(group, "keep-best-junk-rest", entry.item_key)}
                        >
                          保留这件，其余可清理
                        </button>
                      </div>
                    </article>
                  );
                })}
                </section>
              );
            })}
          </div>
        ) : (
          <p className="notice">当前仓库没有发现同名重复装备。</p>
        )
      ) : filteredItems.length ? (
        <div className="vault-section-list">
          {filteredSections.map((section) => (
            <section className="vault-slot-section" key={section.key}>
              <div className="vault-slot-heading">
                <h3>{section.label}</h3>
                <span>{section.count} 件</span>
              </div>
              <div className="vault-list">
                {section.items.map((item) => (
                  <VaultListItem
                    item={item}
                    key={`${item.hash}-${item.instance_id ?? ""}`}
                    tags={props.tags}
                    wishlist={props.wishlist}
                    isOrganizing={isOrganizing}
                    isSelected={selectedKeys.has(getVaultItemKey(item))}
                    openingItemKey={props.openingItemKey}
                    onOpenItem={props.onOpenItem}
                    onSaveTag={props.onSaveTag}
                    onToggleSelected={toggleSelected}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <p className="notice">没有匹配的仓库物品。</p>
      )}
    </section>
  );
}

function VaultListItem(props: {
  item: AccountItemSummary;
  tags: VaultTags;
  wishlist?: DimWishlist | null;
  isOrganizing: boolean;
  isSelected: boolean;
  openingItemKey?: string;
  onOpenItem: (item: AccountItemSummary) => void;
  onSaveTag: (item: AccountItemSummary, tag: VaultTagValue) => void | Promise<void>;
  onToggleSelected: (item: AccountItemSummary) => void;
}) {
  const score = scoreVaultItemForDisplay(props.item, props.tags);
  const note = props.tags.items[getVaultItemKey(props.item)]?.note;
  const wishlist = evaluateWishlistRoll(normalizeCoreItem(props.item), props.wishlist ?? undefined);
  const isPending = getVaultItemKey(props.item) === props.openingItemKey;

  return (
    <article className="vault-list-item">
      {props.isOrganizing ? (
        <label className="vault-select-row">
          <input
            checked={props.isSelected}
            type="checkbox"
            onChange={() => props.onToggleSelected(props.item)}
          />
          选择
        </label>
      ) : null}
      <button
        type="button"
        className={isPending ? "vault-list-main pending" : "vault-list-main"}
        aria-busy={isPending}
        onClick={() => props.onOpenItem(props.item)}
      >
        {props.item.icon ? <img alt="" src={props.item.icon} /> : <div className="item-icon-placeholder" />}
        <div>
          <div className="vault-title-row">
            <strong>{props.item.name}</strong>
            <span className={`vault-score-badge score-${score.grade}`}>{score.score}</span>
          </div>
          <span>{formatVaultItemMeta(props.item)}</span>
          <small className="vault-score-reason">{score.label}：{score.reasons.slice(0, 2).join(" / ")}</small>
          {wishlist.matched ? (
            <small className="wishlist-hit">
              <span className="wishlist-hit-badge">DIM 愿望单</span>
              <span>{formatWishlistHint(wishlist.labels)}</span>
            </small>
          ) : null}
          {props.item.socket_plugs?.length ? (
            <small>{props.item.socket_plugs.slice(0, 4).map((plug) => plug.name).join(" / ")}</small>
          ) : null}
          {note ? <small className="vault-note-snippet">备注：{note}</small> : null}
        </div>
      </button>
      <div className="vault-tag-row" aria-label={`${props.item.name} 本地标记`}>
        <span className={`vault-tag-current tag-${tagValueForItem(props.item, props.tags)}`}>
          {tagLabelForItem(props.item, props.tags)}
        </span>
        <div className="vault-tag-actions">
          <button type="button" onClick={() => props.onSaveTag(props.item, "keep")}>保留</button>
          <button type="button" onClick={() => props.onSaveTag(props.item, "review")}>关注</button>
          <button type="button" onClick={() => props.onSaveTag(props.item, "junk")}>可清理</button>
          <button type="button" onClick={() => props.onSaveTag(props.item, "none")}>清除</button>
        </div>
      </div>
    </article>
  );
}

function matchesTag(
  item: AccountItemSummary,
  tag: VaultTagFilter,
  tags: VaultTags,
  wishlist?: DimWishlist | null
): boolean {
  if (tag === "all") {
    return true;
  }

  const itemTag = tags.items[getVaultItemKey(item)]?.tag;
  if (tag === "wishlist") {
    return evaluateWishlistRoll(normalizeCoreItem(item), wishlist ?? undefined).matched;
  }
  if (tag === "untagged") {
    return !itemTag;
  }
  if (tag === "noted") {
    return Boolean(tags.items[getVaultItemKey(item)]?.note);
  }

  return itemTag === tag;
}

function matchesScore(item: AccountItemSummary, score: VaultScoreFilter, tags: VaultTags): boolean {
  if (score === "all") {
    return true;
  }

  return scoreVaultItemForDisplay(item, tags).grade === score;
}

function matchesScoreRange(item: AccountItemSummary, range: VaultScoreRangeFilter, tags: VaultTags): boolean {
  if (range === "all") {
    return true;
  }

  const score = scoreVaultItemForDisplay(item, tags).score;
  if (range === "80-100") return score >= 80 && score <= 100;
  if (range === "60-79") return score >= 60 && score <= 79;
  if (range === "40-59") return score >= 40 && score <= 59;
  return score >= 0 && score <= 39;
}

function matchesScoreExpression(
  item: AccountItemSummary,
  expression: NonNullable<ParsedVaultQuery["score"]>,
  tags: VaultTags
): boolean {
  const score = scoreVaultItemForDisplay(item, tags).score;
  switch (expression.operator) {
    case ">=":
      return score >= expression.value;
    case "<=":
      return score <= expression.value;
    case ">":
      return score > expression.value;
    case "<":
      return score < expression.value;
    case "=":
      return score === expression.value;
  }
}

function isVaultTagFilter(value: string): value is VaultTagFilter {
  return value === "all" || value === "keep" || value === "review" || value === "junk"
    || value === "untagged" || value === "noted" || value === "wishlist";
}

function typeFilterFor(value: string): VaultGroupFilter | undefined {
  if (value === "weapon" || value === "weapons" || value === "武器") return "weapons";
  if (value === "armor" || value === "护甲") return "armor";
  if (value === "equipment" || value === "装备") return "equipment";
  if (value === "other" || value === "其他") return "other";
  if (value === "all" || value === "全部") return "all";
  return undefined;
}

function matchesLock(item: AccountItemSummary, lock: VaultLockFilter): boolean {
  if (lock === "all") {
    return true;
  }
  if (lock === "locked") {
    return item.locked === true;
  }

  return item.locked === false;
}

function matchesSlot(item: AccountItemSummary, slot: VaultSlotFilter): boolean {
  return slot === "all" || getAccountItemSlotLabel(item) === slot;
}

function matchesAmmo(item: AccountItemSummary, ammo: VaultAmmoFilter): boolean {
  return ammo === "all" || item.ammo_type === ammo;
}

function formatWishlistHint(labels: string[]): string {
  const detailLabels = labels.filter((label) => label !== "DIM Wishlist");
  return detailLabels.length ? detailLabels.join(" / ") : "已命中";
}

function tagLabelForItem(item: AccountItemSummary, tags: VaultTags): string {
  const tag = tagValueForItem(item, tags);
  return tag === "none" ? "未标记" : tagLabels[tag];
}

function tagValueForItem(item: AccountItemSummary, tags: VaultTags): VaultTagValue {
  const tag = tags.items[getVaultItemKey(item)]?.tag;
  return tag ?? "none";
}

function formatVaultItemMeta(item: AccountItemSummary): string {
  return [
    item.bucket_name,
    item.item_type,
    item.ammo_type ? ammoFilterLabels[item.ammo_type] : undefined,
    item.tier,
    item.power ? `光等 ${item.power}` : undefined,
    item.locked ? "已锁定" : undefined
  ].filter(Boolean).join(" / ");
}

function compareVaultSections(left: VaultSection, right: VaultSection): number {
  return slotRank(left.label) - slotRank(right.label)
    || left.label.localeCompare(right.label, "zh-Hans-CN");
}

function slotRank(label: string): number {
  const order = [
    "动能武器",
    "能量武器",
    "威能武器",
    "头盔",
    "臂铠",
    "胸甲",
    "腿甲",
    "职业物品",
    "职业分支",
    "机灵",
    "飞船",
    "载具",
    "徽标",
    "公会战旗",
    "终结技",
    "动作",
    "记忆水晶",
    "任务与追踪",
    "材料与货币",
    "消耗品",
    "模组与外观",
    "收藏与纪念",
    "未识别物品"
  ];
  const index = order.indexOf(label);
  return index === -1 ? 999 : index;
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

function normalizeCoreItem(item: AccountItemSummary): AccountItemSummary & { socket_plugs: NonNullable<AccountItemSummary["socket_plugs"]> } {
  return {
    ...item,
    socket_plugs: item.socket_plugs ?? []
  };
}
