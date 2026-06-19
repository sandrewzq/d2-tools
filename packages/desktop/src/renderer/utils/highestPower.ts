import type { AccountItemSummary, CharacterSummary } from "../api/client";

export type HighestPowerItemSource = "equipped" | "inventory" | "vault";

export type HighestPowerEquipPlanItem = {
  slot_label: string;
  item: AccountItemSummary;
  source: HighestPowerItemSource;
  already_equipped: boolean;
  needs_transfer: boolean;
  needs_equip: boolean;
};

export type HighestPowerEquipPlan = {
  summary: string;
  items: HighestPowerEquipPlanItem[];
  executable_items: HighestPowerEquipPlanItem[];
};

type Candidate = {
  item: AccountItemSummary;
  source: HighestPowerItemSource;
};

const powerSlotLabels = [
  "动能武器",
  "能量武器",
  "威能武器",
  "头盔",
  "臂铠",
  "胸甲",
  "腿甲",
  "职业物品"
] as const;

const bucketHashToSlot = new Map<number, string>([
  [1498876634, "动能武器"],
  [2465295065, "能量武器"],
  [953998645, "威能武器"],
  [3448274439, "头盔"],
  [3551918588, "臂铠"],
  [14239492, "胸甲"],
  [20886954, "腿甲"],
  [1585787867, "职业物品"]
]);

const bucketNameToSlot = new Map<string, string>([
  ["动能武器", "动能武器"],
  ["能量武器", "能量武器"],
  ["威能武器", "威能武器"],
  ["头盔", "头盔"],
  ["臂铠", "臂铠"],
  ["胸甲", "胸甲"],
  ["腿甲", "腿甲"],
  ["职业物品", "职业物品"],
  ["Kinetic Weapons", "动能武器"],
  ["Energy Weapons", "能量武器"],
  ["Power Weapons", "威能武器"],
  ["Helmet", "头盔"],
  ["Gauntlets", "臂铠"],
  ["Chest Armor", "胸甲"],
  ["Leg Armor", "腿甲"],
  ["Class Armor", "职业物品"]
]);

export function createHighestPowerEquipPlan(input: {
  character: CharacterSummary;
  vaultItems: AccountItemSummary[];
}): HighestPowerEquipPlan {
  const candidates: Candidate[] = [
    ...input.character.equipped_items.map((item) => ({ item, source: "equipped" as const })),
    ...input.character.inventory_items.map((item) => ({ item, source: "inventory" as const })),
    ...input.vaultItems.map((item) => ({ item, source: "vault" as const }))
  ].filter((candidate) => candidate.item.instance_id && typeof candidate.item.power === "number");

  const bestBySlot = new Map<string, Candidate>();

  for (const candidate of candidates) {
    const slotLabel = powerSlotLabel(candidate.item);
    if (!slotLabel) continue;

    const current = bestBySlot.get(slotLabel);
    if (!current || compareCandidates(candidate, current) < 0) {
      bestBySlot.set(slotLabel, candidate);
    }
  }

  const items: HighestPowerEquipPlanItem[] = [];
  for (const slotLabel of powerSlotLabels) {
    const candidate = bestBySlot.get(slotLabel);
    if (!candidate) continue;

    const alreadyEquipped = candidate.source === "equipped";
    items.push({
      slot_label: slotLabel,
      item: candidate.item,
      source: candidate.source,
      already_equipped: alreadyEquipped,
      needs_transfer: candidate.source === "vault",
      needs_equip: !alreadyEquipped
    });
  }

  const executableItems = items.filter((entry) => entry.needs_transfer || entry.needs_equip);
  return {
    summary: executableItems.length
      ? `准备装备 ${executableItems.length} 件最高光等装备，涉及 ${items.length} 个位置。`
      : "当前已是最高光等组合。",
    items,
    executable_items: executableItems
  };
}

function powerSlotLabel(item: AccountItemSummary): string | undefined {
  if (item.bucket_hash && bucketHashToSlot.has(item.bucket_hash)) {
    return bucketHashToSlot.get(item.bucket_hash);
  }
  const bucketName = item.bucket_name?.trim();
  return bucketName ? bucketNameToSlot.get(bucketName) : undefined;
}

function compareCandidates(left: Candidate, right: Candidate): number {
  return (right.item.power ?? 0) - (left.item.power ?? 0)
    || sourceRank(left.source) - sourceRank(right.source)
    || left.item.name.localeCompare(right.item.name, "zh-Hans-CN")
    || (left.item.instance_id ?? "").localeCompare(right.item.instance_id ?? "");
}

function sourceRank(source: HighestPowerItemSource): number {
  const ranks: Record<HighestPowerItemSource, number> = {
    equipped: 0,
    inventory: 1,
    vault: 2
  };
  return ranks[source];
}
