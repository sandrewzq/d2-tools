import type { AccountItemSummary, CharacterSummary } from "@d2-tools/core/account/summary";

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

export type HighestPowerExecutionPlan = {
  summary: string;
  transfer_items: HighestPowerEquipPlanItem[];
  equip_items: HighestPowerEquipPlanItem[];
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
  ].filter((candidate) => (
    candidate.item.instance_id
    && typeof candidate.item.power === "number"
    && canEquipOnCharacter(candidate.item, input.character)
  ));

  const candidatesBySlot = new Map<string, Candidate[]>();

  for (const candidate of candidates) {
    const slotLabel = powerSlotLabel(candidate.item);
    if (!slotLabel) continue;
    const slotCandidates = candidatesBySlot.get(slotLabel) ?? [];
    slotCandidates.push(candidate);
    candidatesBySlot.set(slotLabel, slotCandidates);
  }

  const bestBySlot = new Map([
    ...selectBestCompatibleCandidates(powerSlotLabels.slice(0, 3), candidatesBySlot),
    ...selectBestCompatibleCandidates(powerSlotLabels.slice(3), candidatesBySlot)
  ]);

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
      : "当前已经是最高光等组合。",
    items,
    executable_items: executableItems
  };
}

export function createHighestPowerExecutionPlan(
  plan: HighestPowerEquipPlan
): HighestPowerExecutionPlan {
  const transferItems = plan.executable_items.filter((entry) => entry.needs_transfer);
  const equipItems = plan.executable_items.filter((entry) => entry.needs_equip);

  const summaryParts: string[] = [];
  if (transferItems.length) {
    summaryParts.push(`先转移 ${transferItems.length} 件`);
  }
  if (equipItems.length) {
    summaryParts.push(`再装备 ${equipItems.length} 件`);
  }

  return {
    summary: summaryParts.length ? `${summaryParts.join("，")}。` : "当前没有需要执行的最高光等操作。",
    transfer_items: transferItems,
    equip_items: equipItems
  };
}

export function formatHighestPowerSource(source: HighestPowerItemSource): string {
  if (source === "equipped") return "已装备";
  if (source === "inventory") return "角色背包";
  return "仓库";
}

export function buildHighestPowerConfirmText(input: {
  characterClassName: string;
  plan: HighestPowerEquipPlan;
  executionPlan: HighestPowerExecutionPlan;
}): string {
  const executionSummary = [input.plan.summary, input.executionPlan.summary]
    .filter(Boolean)
    .join("\n");
  const actionPreview = input.plan.executable_items
    .map((entry) => `${entry.slot_label}：${entry.item.name} / 光等 ${entry.item.power ?? "-"} / ${formatHighestPowerSource(entry.source)}`)
    .join("\n");

  return [
    `确认给 ${input.characterClassName} 装备最高光等组合？`,
    executionSummary,
    actionPreview,
    "说明：仓库里的装备会先取出到该角色，再执行装备。不会分解装备。"
  ].filter(Boolean).join("\n");
}

export function buildHighestPowerAlreadyOptimalMessage(characterClassName: string): string {
  return `${characterClassName} 当前已经是最高光等组合。`;
}

export function buildHighestPowerTransferProgressMessage(itemCount: number): string {
  return `正在从仓库取出 ${itemCount} 件最高光等装备...`;
}

export function buildHighestPowerEquipProgressMessage(itemCount: number): string {
  return `正在装备最高光等 ${itemCount} 件装备...`;
}

export function buildHighestPowerResultMessage(input: {
  characterClassName: string;
  transferSuccessCount: number;
  transferTotalCount: number;
  equipSuccessCount: number;
  equipTotalCount: number;
  failedCount: number;
  failureReason?: string;
}): string {
  if (input.failedCount > 0) {
    const reason = input.failureReason?.trim();
    const outcome = input.equipSuccessCount > 0 ? "部分成功" : "执行失败";
    return `最高光等${outcome}：转移成功 ${input.transferSuccessCount}/${input.transferTotalCount}，装备确认 ${input.equipSuccessCount}/${input.equipTotalCount}，失败步骤 ${input.failedCount}。${reason ? `首个失败原因：${reason}` : "可在设置页查看操作日志。"}`;
  }
  return `已确认给 ${input.characterClassName} 装备 ${input.equipSuccessCount} 件最高光等装备。`;
}

function powerSlotLabel(item: AccountItemSummary): string | undefined {
  if (item.bucket_hash && bucketHashToSlot.has(item.bucket_hash)) {
    return bucketHashToSlot.get(item.bucket_hash);
  }
  const bucketName = item.bucket_name?.trim();
  return bucketName ? bucketNameToSlot.get(bucketName) : undefined;
}

function canEquipOnCharacter(item: AccountItemSummary, character: CharacterSummary): boolean {
  if (item.group_key !== "armor" || item.class_type === undefined || item.class_type === 3) {
    return true;
  }
  return item.class_type === classTypeForCharacter(character.class_name);
}

function selectBestCompatibleCandidates(
  slotLabels: readonly string[],
  candidatesBySlot: ReadonlyMap<string, Candidate[]>
): Map<string, Candidate> {
  const optionsBySlot = slotLabels.map((slotLabel) => {
    const sorted = [...(candidatesBySlot.get(slotLabel) ?? [])].sort(compareCandidates);
    return {
      slotLabel,
      options: [
        sorted.find((candidate) => !isExotic(candidate.item)),
        sorted.find((candidate) => isExotic(candidate.item))
      ].filter((candidate): candidate is Candidate => Boolean(candidate))
    };
  });

  let bestSelection: Array<Candidate | undefined> | undefined;

  function visit(
    slotIndex: number,
    selection: Array<Candidate | undefined>,
    exoticCount: number
  ): void {
    if (slotIndex >= optionsBySlot.length) {
      if (!bestSelection || isBetterSelection(selection, bestSelection)) {
        bestSelection = [...selection];
      }
      return;
    }

    const options = optionsBySlot[slotIndex].options;
    let visitedOption = false;
    for (const candidate of options) {
      const nextExoticCount = exoticCount + (isExotic(candidate.item) ? 1 : 0);
      if (nextExoticCount > 1) continue;
      visitedOption = true;
      selection.push(candidate);
      visit(slotIndex + 1, selection, nextExoticCount);
      selection.pop();
    }

    if (!visitedOption) {
      selection.push(undefined);
      visit(slotIndex + 1, selection, exoticCount);
      selection.pop();
    }
  }

  visit(0, [], 0);

  const selected = new Map<string, Candidate>();
  bestSelection?.forEach((candidate, index) => {
    if (candidate) selected.set(optionsBySlot[index].slotLabel, candidate);
  });
  return selected;
}

function isBetterSelection(
  candidate: Array<Candidate | undefined>,
  current: Array<Candidate | undefined>
): boolean {
  const candidatePower = totalSelectionPower(candidate);
  const currentPower = totalSelectionPower(current);
  if (candidatePower !== currentPower) return candidatePower > currentPower;

  const candidateCount = candidate.filter(Boolean).length;
  const currentCount = current.filter(Boolean).length;
  if (candidateCount !== currentCount) return candidateCount > currentCount;

  const candidateExoticCount = candidate.filter((entry) => entry && isExotic(entry.item)).length;
  const currentExoticCount = current.filter((entry) => entry && isExotic(entry.item)).length;
  if (candidateExoticCount !== currentExoticCount) return candidateExoticCount < currentExoticCount;

  const candidateSourceRank = candidate.reduce((total, entry) => total + (entry ? sourceRank(entry.source) : 0), 0);
  const currentSourceRank = current.reduce((total, entry) => total + (entry ? sourceRank(entry.source) : 0), 0);
  return candidateSourceRank < currentSourceRank;
}

function totalSelectionPower(selection: Array<Candidate | undefined>): number {
  return selection.reduce((total, candidate) => total + (candidate?.item.power ?? 0), 0);
}

function isExotic(item: AccountItemSummary): boolean {
  return /^(?:异域|exotic)$/i.test(item.tier?.trim() ?? "");
}

function classTypeForCharacter(className: string): number | undefined {
  if (className === "泰坦" || /^titan$/i.test(className)) return 0;
  if (className === "猎人" || /^hunter$/i.test(className)) return 1;
  if (className === "术士" || /^warlock$/i.test(className)) return 2;
  return undefined;
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
