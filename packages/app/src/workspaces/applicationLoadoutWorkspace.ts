import type {
  AccountSummary,
  CharacterLoadoutSlotItemSummary,
  CharacterLoadoutSlotSummary,
  CharacterSummary
} from "@d2-tools/core/account/summary";
import type { ArmorSlot, ArmorStatModSlotRuleMode } from "@d2-tools/core/armor";
import {
  loadoutPlanArmorStatKeys,
  matchLocalLoadoutPlan,
  normalizeLoadoutPlanArmorStatModSlotRules,
  summarizeLoadoutPlanArmorStatModRules,
  type LoadoutPlanArmorPlannerMode,
  type LoadoutPlanArmorStatKey,
  type LocalLoadoutPlan,
  type LocalLoadoutPlanItemMatch,
  type LocalLoadoutPlanItemMatchStatus,
  type LocalLoadoutPlanMatch,
  type LocalLoadoutPlanSourceKind
} from "@d2-tools/core/loadouts/plans";
import {
  normalizeCompareSlot,
  selectApplicationLoadoutInGameLink,
  type CrossSourceLink,
  type LoadoutCompareSlot
} from "./loadoutCrossSource.js";

export type ApplicationLoadoutScreen =
  | { kind: "library"; selected_plan_id?: string }
  | {
      kind: "compare";
      plan_ids: string[];
      in_game_reference_id?: string;
      show_diff_only: boolean;
      return_focus_id?: string;
    }
  | {
      kind: "editor";
      draft_id: string;
      plan_id?: string;
      return_focus_id?: string;
    }
  | { kind: "item-picker"; slot: string; return_focus_id: string }
  | { kind: "armor-planner"; return_focus_id: string }
  | { kind: "wear-review"; plan_id: string; return_focus_id: string }
  | { kind: "publish"; plan_id: string; return_focus_id: string };

export type ApplicationLoadoutScreenFrame = {
  readonly key: string;
  readonly screen: ApplicationLoadoutScreen;
};

export type ApplicationLoadoutNavigationState = {
  readonly stack: readonly [ApplicationLoadoutScreenFrame, ...ApplicationLoadoutScreenFrame[]];
  readonly focus_request_id?: string;
};

export type ApplicationLoadoutNavigationTransition = {
  state: ApplicationLoadoutNavigationState;
  focus_request_id?: string;
};

export type ApplicationLoadoutDirectoryEntryView = {
  id: string;
  title: string;
  class_name: string;
  source_label: LocalLoadoutPlanSourceKind;
  item_count: number;
  updated_at: string;
  has_subclass: boolean;
  has_armor_targets: boolean;
  status_label: ApplicationLoadoutWearLabel;
  status_tone: "neutral" | "ready" | "warning";
  /** 这套方案在游戏内槽位上的落点；账号未读时为空。见 `loadoutCrossSource`。 */
  in_game_link: CrossSourceLink | null;
  selected: boolean;
};

export type ApplicationLoadoutItemDetailView = {
  key: string;
  slot: string;
  item_hash?: number;
  selected_instance_id?: string;
  plug_hashes: number[];
  notes?: string;
  match: LocalLoadoutPlanItemMatch | null;
  status_label: ApplicationLoadoutItemStatus;
  status_tone: "neutral" | "ready" | "warning";
  candidate_count: number;
};

export type ApplicationLoadoutWearState =
  | "waiting-account"
  | "empty"
  | "needs-review"
  | "ready";

/**
 * 穿戴结论。`needs-review` 时报「N 项需要处理」，数字跟着一起走，
 * 这样方案库列表拿不到逐条原因也拼得出同一句。措辞在界面侧。
 */
export type ApplicationLoadoutWearLabel = {
  wear: ApplicationLoadoutWearState;
  block_count: number;
};

/** 单件装备目标在账号里的对位结果；`unconfigured` 也涵盖还没核对过的情况。 */
export type ApplicationLoadoutItemStatus = LocalLoadoutPlanItemMatchStatus;

/**
 * 穿戴前要处理的每一件事。分开列而不是合成一句「有 N 项待处理」——
 * 它们各自要求不同的下一步动作。
 */
export type ApplicationLoadoutWearBlockReason =
  | { kind: "no-targets" }
  | { kind: "account-required" }
  | { kind: "no-target-character" }
  | { kind: "target-character-missing" }
  | { kind: "items-unverified" }
  | { kind: "unconfigured"; count: number }
  | { kind: "available"; count: number }
  | { kind: "needs-selection"; count: number }
  | { kind: "missing"; count: number }
  | { kind: "plug-unavailable"; count: number };

/** 对比页底部的选择提示。 */
export type ApplicationLoadoutSelectionMessage =
  | { kind: "too-many"; maximum: number }
  | { kind: "ready"; count: number; has_in_game_reference: boolean }
  | { kind: "needs-more"; missing: number };

/**
 * 对比表里「没什么可报」的四种。来源不同，措辞也不同，不能合并成一条：
 * 方案侧没配和游戏内没返回是两回事，看不出差别就分不清是漏配还是没读到。
 */
export type ApplicationLoadoutCompareEmpty =
  | "unconfigured"
  | "unset"
  | "unavailable"
  | "none";

/** 「N 个 X」里的单位。 */
export type ApplicationLoadoutCountUnit =
  | "plug"
  | "returned-plug"
  | "ability"
  | "aspect"
  | "fragment"
  | "subclass-mod";

/** 子职业 Plug 明细的分组名。 */
export type ApplicationLoadoutPlugGroupKey =
  | "ability"
  | "aspect"
  | "fragment"
  | "subclass-mod"
  | "unclassified";

export type ApplicationLoadoutPlugGroup = {
  group: ApplicationLoadoutPlugGroupKey;
  hashes: number[];
};

export type ApplicationLoadoutCompareValue =
  | { kind: "text"; text: string }
  | { kind: "count"; count: number; unit: ApplicationLoadoutCountUnit }
  | { kind: "empty"; empty: ApplicationLoadoutCompareEmpty }
  | { kind: "item-ref"; hash: number }
  | { kind: "instance-ref"; suffix: string }
  | { kind: "subclass-ref"; hash: number }
  | { kind: "armor-mode"; mode: LoadoutPlanArmorPlannerMode }
  | { kind: "stat-mod"; mode: ArmorStatModSlotRuleMode; stat: LoadoutPlanArmorStatKey | null }
  | { kind: "armor-set-single"; set_hash: number; piece_count: number }
  | { kind: "armor-set-split"; first_hash: number; second_hash: number }
  | { kind: "stat-chain"; stats: LoadoutPlanArmorStatKey[] }
  | { kind: "series"; parts: ApplicationLoadoutCompareValue[] }
  | { kind: "plug-groups"; groups: ApplicationLoadoutPlugGroup[]; empty_socket_count?: number }
  | { kind: "plug-hashes"; hashes: number[] };

export type ApplicationLoadoutCompareRowLabel =
  | { kind: "class" }
  | { kind: "subclass" }
  | { kind: "subclass-config" }
  | { kind: "slot"; slot: LoadoutCompareSlot }
  | { kind: "slot-plugs"; slot: LoadoutCompareSlot }
  | { kind: "armor-minimum"; stat: LoadoutPlanArmorStatKey }
  | { kind: "armor-mod-count"; mod: "plus5" | "plus10" }
  | { kind: "armor-stat-mod"; slot: ArmorSlot }
  | { kind: "armor-mode" }
  | { kind: "armor-priority" }
  | { kind: "armor-exotic" }
  | { kind: "armor-set" }
  | { kind: "notes" };

/** 游戏内槽位名可能为空，这时由界面按语言补「游戏内槽位 N」。 */
export type ApplicationLoadoutCompareColumnTitle =
  | { kind: "plan"; name: string }
  | { kind: "in-game-slot"; name: string; index: number };

export type ApplicationLoadoutCompareColumnSubtitle =
  | { kind: "plan"; class_name: string; target_count: number }
  | { kind: "in-game"; class_name: string };

export type ApplicationLoadoutDetailView = {
  plan: LocalLoadoutPlan;
  item_rows: ApplicationLoadoutItemDetailView[];
  match_summary: LocalLoadoutPlanMatch | null;
  target_character: CharacterSummary | null;
  wear_state: ApplicationLoadoutWearState;
  wear_enabled: boolean;
  wear_label: ApplicationLoadoutWearLabel;
  wear_block_reasons: ApplicationLoadoutWearBlockReason[];
  configured_item_count: number;
  configured_plug_count: number;
  has_subclass: boolean;
  has_armor_targets: boolean;
};

export type ApplicationLoadoutLibraryInput = {
  account_summary: AccountSummary | null;
  plans: LocalLoadoutPlan[];
  selected_plan_id?: string;
};

export type ApplicationLoadoutLibraryViewModel = {
  entries: ApplicationLoadoutDirectoryEntryView[];
  selected_plan_id: string;
  selected_detail: ApplicationLoadoutDetailView | null;
  empty: boolean;
};

export type ApplicationLoadoutInGameReference = {
  character: CharacterSummary;
  slot: CharacterLoadoutSlotSummary;
};

export type ApplicationLoadoutCompareReference =
  | { kind: "application"; plan_id: string }
  | ({ kind: "in-game" } & ApplicationLoadoutInGameReference);

export type ApplicationLoadoutCompareInput = {
  plans: LocalLoadoutPlan[];
  plan_ids: string[];
  in_game_reference?: ApplicationLoadoutInGameReference | null;
  showDiffOnly?: boolean;
  show_diff_only?: boolean;
};

export type ApplicationLoadoutCompareColumn =
  | {
      id: string;
      kind: "application";
      title: ApplicationLoadoutCompareColumnTitle;
      subtitle: ApplicationLoadoutCompareColumnSubtitle;
      plan: LocalLoadoutPlan;
      completeness: "complete";
    }
  | {
      id: string;
      kind: "in-game";
      title: ApplicationLoadoutCompareColumnTitle;
      subtitle: ApplicationLoadoutCompareColumnSubtitle;
      character: CharacterSummary;
      slot: CharacterLoadoutSlotSummary;
      completeness: "partial";
    };

export type ApplicationLoadoutCompareCell = {
  column_id: string;
  state: "value" | "empty" | "unknown";
  value: ApplicationLoadoutCompareValue;
  /**
   * 计数之外的展开明细。`value` 只报数量，光看数量分不出两边选的是不是同一批星象和碎片；
   * 明细给出实际的 Plug 列表。判「有没有变」仍然只看 `fingerprint`，跟这里显示成什么样无关。
   */
  detail?: ApplicationLoadoutCompareValue;
  fingerprint: string;
};

export type ApplicationLoadoutCompareRow = {
  key: string;
  section: "identity" | "equipment" | "armor" | "notes";
  label: ApplicationLoadoutCompareRowLabel;
  changed: boolean;
  cells: ApplicationLoadoutCompareCell[];
};

export type ApplicationLoadoutCompareViewModel = {
  selected_plan_ids: string[];
  selection_count: number;
  minimum_selection_count: 2;
  maximum_selection_count: 3;
  can_compare: boolean;
  selection_message: ApplicationLoadoutSelectionMessage;
  showDiffOnly: boolean;
  in_game_reference_id?: string;
  columns: ApplicationLoadoutCompareColumn[];
  rows: ApplicationLoadoutCompareRow[];
  visible_rows: ApplicationLoadoutCompareRow[];
  difference_count: number;
};

type CompareProjection = Map<string, Omit<ApplicationLoadoutCompareRow, "changed" | "cells"> & {
  cell: Omit<ApplicationLoadoutCompareCell, "column_id">;
}>;

export function createApplicationLoadoutNavigationState(input?: {
  selected_plan_id?: string;
}): ApplicationLoadoutNavigationState {
  return {
    stack: [{
      key: createScreenKey({ kind: "library", selected_plan_id: input?.selected_plan_id }),
      screen: { kind: "library", selected_plan_id: input?.selected_plan_id }
    }]
  };
}

export function getActiveApplicationLoadoutScreen(
  state: ApplicationLoadoutNavigationState
): ApplicationLoadoutScreen {
  return state.stack[state.stack.length - 1].screen;
}

export function pushApplicationLoadoutScreen(
  state: ApplicationLoadoutNavigationState,
  screen: ApplicationLoadoutScreen
): ApplicationLoadoutNavigationTransition {
  const nextState: ApplicationLoadoutNavigationState = {
    stack: [...state.stack, {
      key: `${state.stack.length}:${createScreenKey(screen)}`,
      screen
    }] as [ApplicationLoadoutScreenFrame, ...ApplicationLoadoutScreenFrame[]]
  };
  return { state: nextState };
}

export function replaceApplicationLoadoutScreen(
  state: ApplicationLoadoutNavigationState,
  screen: ApplicationLoadoutScreen
): ApplicationLoadoutNavigationTransition {
  const stack = state.stack.slice(0, -1);
  const frame: ApplicationLoadoutScreenFrame = {
    key: `${stack.length}:${createScreenKey(screen)}`,
    screen
  };
  const nextState: ApplicationLoadoutNavigationState = {
    stack: stack.length === 0
      ? [frame]
      : [stack[0], ...stack.slice(1), frame]
  };
  return { state: nextState };
}

export function popApplicationLoadoutScreen(
  state: ApplicationLoadoutNavigationState
): ApplicationLoadoutNavigationTransition {
  if (state.stack.length === 1) {
    return { state, focus_request_id: state.focus_request_id };
  }
  const activeScreen = getActiveApplicationLoadoutScreen(state);
  const focusRequestId = getReturnFocusId(activeScreen);
  const nextState: ApplicationLoadoutNavigationState = {
    stack: state.stack.slice(0, -1) as [
      ApplicationLoadoutScreenFrame,
      ...ApplicationLoadoutScreenFrame[]
    ],
    ...(focusRequestId ? { focus_request_id: focusRequestId } : {})
  };
  return { state: nextState, ...(focusRequestId ? { focus_request_id: focusRequestId } : {}) };
}

export function consumeApplicationLoadoutFocusRequest(
  state: ApplicationLoadoutNavigationState
): ApplicationLoadoutNavigationTransition {
  if (!state.focus_request_id) return { state };
  return {
    state: {
      stack: state.stack
    },
    focus_request_id: state.focus_request_id
  };
}

export function selectApplicationLoadoutLibraryViewModel(
  input: ApplicationLoadoutLibraryInput
): ApplicationLoadoutLibraryViewModel {
  const selectedPlan = input.plans.find((plan) => plan.id === input.selected_plan_id)
    ?? input.plans[0]
    ?? null;
  return {
    entries: input.plans.map((plan) => buildApplicationLoadoutDirectoryEntry(
      plan,
      input.account_summary,
      plan.id === selectedPlan?.id
    )),
    selected_plan_id: selectedPlan?.id ?? "",
    selected_detail: selectedPlan
      ? selectApplicationLoadoutDetailView(selectedPlan, input.account_summary)
      : null,
    empty: input.plans.length === 0
  };
}

export function selectApplicationLoadoutCompareViewModel(
  input: ApplicationLoadoutCompareInput
): ApplicationLoadoutCompareViewModel {
  const showDiffOnly = input.showDiffOnly ?? input.show_diff_only ?? false;
  const planIds = [...new Set(input.plan_ids)]
    .filter((id) => input.plans.some((plan) => plan.id === id));
  const plans = planIds
    .map((id) => input.plans.find((plan) => plan.id === id))
    .filter((plan): plan is LocalLoadoutPlan => Boolean(plan));
  const applicationColumns: ApplicationLoadoutCompareColumn[] = plans.map((plan) => ({
    id: `application:${plan.id}`,
    kind: "application",
    title: { kind: "plan", name: plan.name },
    subtitle: { kind: "plan", class_name: plan.class_name, target_count: plan.item_targets.length },
    plan,
    completeness: "complete"
  }));
  const inGameColumn = input.in_game_reference
    ? createInGameCompareColumn(input.in_game_reference)
    : null;
  const columns = inGameColumn ? [...applicationColumns, inGameColumn] : applicationColumns;
  const projections = [
    ...plans.map(projectApplicationLoadout),
    ...(input.in_game_reference ? [projectInGameLoadout(input.in_game_reference)] : [])
  ];
  const rows = buildCompareRows(columns, projections);
  const canCompare = planIds.length >= 2 && planIds.length <= 3;
  return {
    selected_plan_ids: planIds,
    selection_count: planIds.length,
    minimum_selection_count: 2,
    maximum_selection_count: 3,
    can_compare: canCompare,
    selection_message: planIds.length > 3
      ? { kind: "too-many", maximum: 3 }
      : canCompare
        ? { kind: "ready", count: planIds.length, has_in_game_reference: Boolean(inGameColumn) }
        : planIds.length < 2
          ? { kind: "needs-more", missing: 2 - planIds.length }
          : { kind: "too-many", maximum: 3 },
    showDiffOnly,
    ...(inGameColumn ? { in_game_reference_id: inGameColumn.id } : {}),
    columns,
    rows,
    visible_rows: showDiffOnly ? rows.filter((row) => row.changed) : rows,
    difference_count: rows.filter((row) => row.changed).length
  };
}

export function selectApplicationLoadoutDetailView(
  plan: LocalLoadoutPlan,
  accountSummary: AccountSummary | null
): ApplicationLoadoutDetailView {
  const matchSummary = accountSummary ? matchLocalLoadoutPlan(plan, accountSummary) : null;
  const itemRows = plan.item_targets.map((target, index) => {
    const match = matchSummary?.item_matches[index] ?? null;
    const presentation = itemMatchPresentation(match?.status);
    return {
      key: `${plan.id}:${index}:${target.slot}`,
      slot: target.slot,
      item_hash: target.item_hash,
      selected_instance_id: target.selected_instance_id,
      plug_hashes: target.plug_hashes,
      notes: target.notes,
      match,
      ...presentation,
      candidate_count: match?.candidates.length ?? 0
    };
  });
  const targetCharacter = plan.target_character_id && accountSummary
    ? accountSummary.characters.find((character) => character.character_id === plan.target_character_id) ?? null
    : null;
  const wearState = getApplicationLoadoutWearState(plan, accountSummary, matchSummary, targetCharacter);
  const wearBlockReasons = buildWearBlockReasons(plan, accountSummary, matchSummary, targetCharacter);
  return {
    plan,
    item_rows: itemRows,
    match_summary: matchSummary,
    target_character: targetCharacter,
    wear_state: wearState,
    wear_enabled: wearState === "ready",
    wear_label: { wear: wearState, block_count: wearBlockReasons.length },
    wear_block_reasons: wearBlockReasons,
    configured_item_count: plan.item_targets.filter((target) => (
      Boolean(target.item_hash || target.selected_instance_id)
    )).length,
    configured_plug_count: plan.item_targets.reduce((total, target) => total + target.plug_hashes.length, 0),
    has_subclass: Boolean(plan.subclass_target),
    has_armor_targets: Boolean(plan.armor_constraints || plan.armor_plan)
  };
}

function buildApplicationLoadoutDirectoryEntry(
  plan: LocalLoadoutPlan,
  accountSummary: AccountSummary | null,
  selected: boolean
): ApplicationLoadoutDirectoryEntryView {
  const detail = selectApplicationLoadoutDetailView(plan, accountSummary);
  return {
    id: plan.id,
    title: plan.name,
    class_name: plan.class_name,
    source_label: plan.source.kind,
    item_count: plan.item_targets.length,
    updated_at: plan.updated_at ?? plan.created_at,
    has_subclass: detail.has_subclass,
    has_armor_targets: detail.has_armor_targets,
    status_label: detail.wear_label,
    status_tone: detail.wear_state === "ready"
      ? "ready"
      : detail.wear_state === "waiting-account" || detail.wear_state === "empty"
        ? "neutral"
        : "warning",
    in_game_link: selectApplicationLoadoutInGameLink(plan, accountSummary),
    selected
  };
}

function getApplicationLoadoutWearState(
  plan: LocalLoadoutPlan,
  accountSummary: AccountSummary | null,
  matchSummary: LocalLoadoutPlanMatch | null,
  targetCharacter: CharacterSummary | null
): ApplicationLoadoutWearState {
  if (!plan.item_targets.length) return "empty";
  if (!accountSummary) return "waiting-account";
  if (!plan.target_character_id || !targetCharacter) return "needs-review";
  if (!matchSummary || matchSummary.selected_count !== plan.item_targets.length) return "needs-review";
  return "ready";
}

function buildWearBlockReasons(
  plan: LocalLoadoutPlan,
  accountSummary: AccountSummary | null,
  matchSummary: LocalLoadoutPlanMatch | null,
  targetCharacter: CharacterSummary | null
): ApplicationLoadoutWearBlockReason[] {
  if (!plan.item_targets.length) return [{ kind: "no-targets" }];
  if (!accountSummary) return [{ kind: "account-required" }];
  const reasons: ApplicationLoadoutWearBlockReason[] = [];
  if (!plan.target_character_id) reasons.push({ kind: "no-target-character" });
  else if (!targetCharacter) reasons.push({ kind: "target-character-missing" });
  if (!matchSummary) return [...reasons, { kind: "items-unverified" }];
  if (matchSummary.unconfigured_count) reasons.push({ kind: "unconfigured", count: matchSummary.unconfigured_count });
  if (matchSummary.available_count) reasons.push({ kind: "available", count: matchSummary.available_count });
  if (matchSummary.needs_selection_count) reasons.push({ kind: "needs-selection", count: matchSummary.needs_selection_count });
  if (matchSummary.missing_count) reasons.push({ kind: "missing", count: matchSummary.missing_count });
  if (matchSummary.plug_unavailable_count) reasons.push({ kind: "plug-unavailable", count: matchSummary.plug_unavailable_count });
  return reasons;
}

function itemMatchPresentation(
  status: LocalLoadoutPlanItemMatchStatus | undefined
): Pick<ApplicationLoadoutItemDetailView, "status_label" | "status_tone"> {
  if (status === "selected") return { status_label: "selected", status_tone: "ready" };
  if (status === "available") return { status_label: "available", status_tone: "warning" };
  if (status === "needs-selection") return { status_label: "needs-selection", status_tone: "warning" };
  if (status === "missing") return { status_label: "missing", status_tone: "warning" };
  if (status === "plug-unavailable") return { status_label: "plug-unavailable", status_tone: "warning" };
  // 还没核对过（`match` 为空）和核对过但没配装备走的是同一条兜底，措辞一样。
  return { status_label: "unconfigured", status_tone: "neutral" };
}

function createInGameCompareColumn(
  reference: ApplicationLoadoutInGameReference
): ApplicationLoadoutCompareColumn {
  return {
    id: inGameReferenceId(reference),
    kind: "in-game",
    title: { kind: "in-game-slot", name: reference.slot.name, index: reference.slot.index },
    subtitle: { kind: "in-game", class_name: reference.character.class_name },
    character: reference.character,
    slot: reference.slot,
    completeness: "partial"
  };
}

function projectApplicationLoadout(plan: LocalLoadoutPlan): CompareProjection {
  const projection: CompareProjection = new Map();
  const subclassConfigurationCount = plan.subclass_target
    ? plan.subclass_target.ability_hashes.length
      + plan.subclass_target.aspect_hashes.length
      + plan.subclass_target.fragment_hashes.length
      + plan.subclass_target.mod_hashes.length
    : 0;
  addProjectionValue(projection, "identity:class", "identity", { kind: "class" }, { kind: "text", text: plan.class_name }, "value", plan.class_name);
  addProjectionValue(
    projection,
    "identity:subclass",
    "identity",
    { kind: "subclass" },
    plan.subclass_target?.subclass_hash
      ? { kind: "subclass-ref", hash: plan.subclass_target.subclass_hash }
      : { kind: "empty", empty: "unconfigured" },
    plan.subclass_target?.subclass_hash ? "value" : "empty",
    plan.subclass_target?.subclass_hash ? String(plan.subclass_target.subclass_hash) : "empty"
  );
  addProjectionValue(
    projection,
    "identity:subclass-config",
    "identity",
    { kind: "subclass-config" },
    subclassConfigurationCount
      ? { kind: "series", parts: applicationSubclassConfigurationCounts(plan) }
      : { kind: "empty", empty: "unconfigured" },
    subclassConfigurationCount ? "value" : "empty",
    subclassConfigurationCount && plan.subclass_target
      ? subclassConfigurationFingerprint(plan.subclass_target)
      : "empty",
    subclassConfigurationCount ? applicationSubclassConfigurationDetail(plan) : undefined
  );
  for (const target of plan.item_targets) {
    const slot = normalizeCompareSlot(target.slot);
    addProjectionValue(
      projection,
      `equipment:${slot.key}:item`,
      "equipment",
      { kind: "slot", slot: slot.slot },
      target.item_hash
        ? { kind: "item-ref", hash: target.item_hash }
        : target.selected_instance_id
          ? { kind: "instance-ref", suffix: target.selected_instance_id.slice(-6) }
          : { kind: "empty", empty: "unconfigured" },
      target.item_hash || target.selected_instance_id ? "value" : "empty",
      `${target.item_hash ?? ""}|${target.selected_instance_id ?? ""}`
    );
    addProjectionValue(
      projection,
      `equipment:${slot.key}:plugs`,
      "equipment",
      { kind: "slot-plugs", slot: slot.slot },
      target.plug_hashes.length
        ? { kind: "count", count: target.plug_hashes.length, unit: "plug" }
        : { kind: "empty", empty: "unconfigured" },
      target.plug_hashes.length ? "value" : "empty",
      target.plug_hashes.length ? sortedNumbers(target.plug_hashes) : "empty"
    );
  }
  for (const stat of loadoutPlanArmorStatKeys) {
    const value = plan.armor_constraints?.stat_minimums[stat];
    addProjectionValue(
      projection,
      `armor:minimum:${stat}`,
      "armor",
      { kind: "armor-minimum", stat },
      value === undefined ? { kind: "empty", empty: "unset" } : { kind: "text", text: String(value) },
      value === undefined ? "empty" : "value",
      value === undefined ? "unset" : String(value)
    );
  }
  const armorModSummary = summarizeLoadoutPlanArmorStatModRules(plan.armor_constraints);
  for (const mod of ["plus5", "plus10"] as const) {
    addProjectionValue(
      projection,
      `armor:${mod}`,
      "armor",
      { kind: "armor-mod-count", mod },
      plan.armor_constraints
        ? { kind: "text", text: String(armorModSummary[mod]) }
        : { kind: "empty", empty: "unset" },
      plan.armor_constraints ? "value" : "empty",
      plan.armor_constraints ? String(armorModSummary[mod]) : "empty"
    );
  }
  if (plan.armor_constraints?.armor_stat_mod_slot_rules) {
    for (const rule of normalizeLoadoutPlanArmorStatModSlotRules(plan.armor_constraints)) {
      addProjectionValue(
        projection,
        `armor:stat-mod:${rule.slot}`,
        "armor",
        { kind: "armor-stat-mod", slot: rule.slot },
        { kind: "stat-mod", mode: rule.mode, stat: rule.stat ?? null },
        "value",
        `${rule.mode}:${rule.stat ?? "auto"}`
      );
    }
  }
  addProjectionValue(
    projection,
    "armor:mode",
    "armor",
    { kind: "armor-mode" },
    plan.armor_constraints?.planner_mode
      ? { kind: "armor-mode", mode: plan.armor_constraints.planner_mode }
      : { kind: "empty", empty: "unset" },
    plan.armor_constraints?.planner_mode ? "value" : "empty",
    plan.armor_constraints?.planner_mode ?? "unset"
  );
  addProjectionValue(
    projection,
    "armor:priority",
    "armor",
    { kind: "armor-priority" },
    plan.armor_constraints?.priority_stats.length
      ? { kind: "stat-chain", stats: plan.armor_constraints.priority_stats }
      : { kind: "empty", empty: "unset" },
    plan.armor_constraints?.priority_stats.length ? "value" : "empty",
    plan.armor_constraints?.priority_stats.join(",") || "empty"
  );
  addProjectionValue(
    projection,
    "armor:exotic",
    "armor",
    { kind: "armor-exotic" },
    plan.armor_constraints?.exotic_item_hash
      ? { kind: "item-ref", hash: plan.armor_constraints.exotic_item_hash }
      : plan.armor_constraints?.exotic_instance_id
        ? { kind: "instance-ref", suffix: plan.armor_constraints.exotic_instance_id.slice(-6) }
        : { kind: "empty", empty: "unset" },
    plan.armor_constraints?.exotic_item_hash || plan.armor_constraints?.exotic_instance_id ? "value" : "empty",
    plan.armor_constraints?.exotic_item_hash || plan.armor_constraints?.exotic_instance_id
      ? `${plan.armor_constraints?.exotic_item_hash ?? ""}|${plan.armor_constraints?.exotic_instance_id ?? ""}`
      : "empty"
  );
  const setConstraint = plan.armor_constraints?.set_constraint;
  addProjectionValue(
    projection,
    "armor:set",
    "armor",
    { kind: "armor-set" },
    armorSetConstraintValue(setConstraint),
    setConstraint && setConstraint.mode !== "none" ? "value" : "empty",
    setConstraint && setConstraint.mode !== "none" ? armorSetConstraintFingerprint(setConstraint) : "empty"
  );
  addProjectionValue(
    projection,
    "notes:notes",
    "notes",
    { kind: "notes" },
    plan.notes?.trim() ? { kind: "text", text: plan.notes.trim() } : { kind: "empty", empty: "none" },
    plan.notes?.trim() ? "value" : "empty",
    plan.notes?.trim() || "none"
  );
  return projection;
}

function projectInGameLoadout(reference: ApplicationLoadoutInGameReference): CompareProjection {
  const projection: CompareProjection = new Map();
  addProjectionValue(projection, "identity:class", "identity", { kind: "class" }, { kind: "text", text: reference.character.class_name }, "value", reference.character.class_name);
  const subclass = reference.slot.items.find((item) => normalizeCompareSlot(item.bucket_name ?? "").key === "subclass");
  addProjectionValue(
    projection,
    "identity:subclass",
    "identity",
    { kind: "subclass" },
    subclass ? { kind: "text", text: subclass.name } : { kind: "empty", empty: "unavailable" },
    subclass ? "value" : "unknown",
    subclass ? String(subclass.item_hash ?? subclass.name) : "unknown"
  );
  addProjectionValue(
    projection,
    "identity:subclass-config",
    "identity",
    { kind: "subclass-config" },
    !subclass?.plug_hashes
      ? { kind: "empty", empty: "unavailable" }
      : subclass.plug_hashes.length
        ? { kind: "count", count: subclass.plug_hashes.length, unit: "returned-plug" }
        : { kind: "empty", empty: "unconfigured" },
    subclass?.plug_hashes
      ? (subclass.plug_hashes.length ? "value" : "empty")
      : "unknown",
    subclass?.plug_hashes
      ? (sortedNumbers(subclass.plug_hashes) || "empty")
      : "unknown",
    inGameSubclassConfigurationDetail(subclass)
  );
  for (const item of reference.slot.items) {
    const slot = normalizeCompareSlot(item.bucket_name ?? item.name);
    if (slot.key === "subclass") continue;
    addProjectionValue(
      projection,
      `equipment:${slot.key}:item`,
      "equipment",
      { kind: "slot", slot: slot.slot },
      { kind: "text", text: item.name },
      "value",
      `${item.item_hash ?? ""}|${item.instance_id ?? ""}`
    );
    addProjectionValue(
      projection,
      `equipment:${slot.key}:plugs`,
      "equipment",
      { kind: "slot-plugs", slot: slot.slot },
      item.plug_hashes
        ? { kind: "count", count: item.plug_hashes.length, unit: "returned-plug" }
        : { kind: "empty", empty: "unavailable" },
      item.plug_hashes ? (item.plug_hashes.length ? "value" : "empty") : "unknown",
      item.plug_hashes ? (sortedNumbers(item.plug_hashes) || "empty") : "unknown"
    );
  }
  for (const stat of loadoutPlanArmorStatKeys) {
    addProjectionValue(
      projection,
      `armor:minimum:${stat}`,
      "armor",
      { kind: "armor-minimum", stat },
      { kind: "empty", empty: "unavailable" },
      "unknown",
      "unavailable"
    );
  }
  addProjectionValue(projection, "armor:plus5", "armor", { kind: "armor-mod-count", mod: "plus5" }, { kind: "empty", empty: "unavailable" }, "unknown", "unavailable");
  addProjectionValue(projection, "armor:plus10", "armor", { kind: "armor-mod-count", mod: "plus10" }, { kind: "empty", empty: "unavailable" }, "unknown", "unavailable");
  addProjectionValue(projection, "armor:mode", "armor", { kind: "armor-mode" }, { kind: "empty", empty: "unavailable" }, "unknown", "unavailable");
  addProjectionValue(projection, "armor:priority", "armor", { kind: "armor-priority" }, { kind: "empty", empty: "unavailable" }, "unknown", "unavailable");
  addProjectionValue(projection, "armor:exotic", "armor", { kind: "armor-exotic" }, { kind: "empty", empty: "unavailable" }, "unknown", "unavailable");
  addProjectionValue(projection, "armor:set", "armor", { kind: "armor-set" }, { kind: "empty", empty: "unavailable" }, "unknown", "unavailable");
  addProjectionValue(projection, "notes:notes", "notes", { kind: "notes" }, { kind: "empty", empty: "unavailable" }, "unknown", "unavailable");
  return projection;
}

function buildCompareRows(
  columns: ApplicationLoadoutCompareColumn[],
  projections: CompareProjection[]
): ApplicationLoadoutCompareRow[] {
  const rowMetadata = new Map<string, Omit<ApplicationLoadoutCompareRow, "changed" | "cells">>();
  for (const projection of projections) {
    for (const [key, row] of projection) {
      if (!rowMetadata.has(key)) rowMetadata.set(key, { key, section: row.section, label: row.label });
    }
  }
  const rows = [...rowMetadata.values()].map((row) => {
    const cells = columns.map((column, index): ApplicationLoadoutCompareCell => {
      const projected = projections[index]?.get(row.key)?.cell;
      if (projected) return { column_id: column.id, ...projected };
      const unknown = column.kind === "in-game";
      return {
        column_id: column.id,
        state: unknown ? "unknown" : "empty",
        value: { kind: "empty", empty: unknown ? "unavailable" : "unconfigured" },
        fingerprint: unknown ? "unknown" : "empty"
      };
    });
    return {
      ...row,
      changed: new Set(cells.map((cell) => `${cell.state}:${cell.fingerprint}`)).size > 1,
      cells
    };
  });
  return rows.sort((left, right) => compareRowOrder(left.key, right.key));
}

function addProjectionValue(
  projection: CompareProjection,
  key: string,
  section: ApplicationLoadoutCompareRow["section"],
  label: ApplicationLoadoutCompareRowLabel,
  value: ApplicationLoadoutCompareValue,
  state: ApplicationLoadoutCompareCell["state"] = "value",
  fingerprint: string,
  detail?: ApplicationLoadoutCompareValue
): void {
  projection.set(key, {
    key,
    section,
    label,
    cell: { state, value, ...(detail ? { detail } : {}), fingerprint }
  });
}

/**
 * 子职业配置的计数摘要，只列非零项，顺序与旧版一致。
 *
 * `mod_hashes` 在新代码里一律为空。旧版本存下来的方案可能带着把它当模组写的 hash，
 * 这里照旧显示，不替用户把已有数据藏起来。
 */
function applicationSubclassConfigurationCounts(plan: LocalLoadoutPlan): ApplicationLoadoutCompareValue[] {
  const target = plan.subclass_target;
  if (!target) return [];
  const parts: ApplicationLoadoutCompareValue[] = [];
  if (target.ability_hashes.length) parts.push({ kind: "count", count: target.ability_hashes.length, unit: "ability" });
  if (target.aspect_hashes.length) parts.push({ kind: "count", count: target.aspect_hashes.length, unit: "aspect" });
  if (target.fragment_hashes.length) parts.push({ kind: "count", count: target.fragment_hashes.length, unit: "fragment" });
  if (target.mod_hashes.length) parts.push({ kind: "count", count: target.mod_hashes.length, unit: "subclass-mod" });
  return parts;
}

/**
 * 子职业配置的展开明细。
 *
 * 方案侧只有 hash，没有名字（这里拿不到 Manifest），所以两边都按 hash 列出来：
 * 显示成名字和显示成 hash 混在一张对比表里，反而看不出同一批 Plug 是不是对上了。
 */
function applicationSubclassConfigurationDetail(plan: LocalLoadoutPlan): ApplicationLoadoutCompareValue | undefined {
  const target = plan.subclass_target;
  if (!target) return undefined;
  // `socket_overrides` 收的是全部带索引的 Plug，里面本来就含技能、星相和碎片。
  // 直接整组当「未分类」列出来会让同一批 Plug 显示两遍，这里把已经归过类的减掉。
  const classified = new Set([
    ...target.ability_hashes,
    ...target.aspect_hashes,
    ...target.fragment_hashes,
    ...target.mod_hashes
  ]);
  const unclassified = Object.values(target.socket_overrides ?? {})
    .filter((hash) => !classified.has(hash));
  return {
    kind: "plug-groups",
    groups: [
      { group: "ability", hashes: target.ability_hashes },
      { group: "aspect", hashes: target.aspect_hashes },
      { group: "fragment", hashes: target.fragment_hashes },
      { group: "subclass-mod", hashes: target.mod_hashes },
      { group: "unclassified", hashes: unclassified }
    ]
  };
}

/**
 * 游戏内那一列的子职业明细。
 *
 * 分类结果来自账号摘要（`subclass_configuration`），拿不到时只能把所有 Plug 混在一起列，
 * 不猜哪一格是什么。空槽位计数单独带走：`plug_hashes` 里没有它们，光比 Plug 列表看不出
 * 「对面少插了一格」。
 */
function inGameSubclassConfigurationDetail(
  subclass: CharacterLoadoutSlotItemSummary | undefined
): ApplicationLoadoutCompareValue | undefined {
  const configuration = subclass?.subclass_configuration;
  // 整个子职业一个 Plug 都没插时 `plug_hashes` 是空的，但空槽位布局仍要报出来：
  // 光是「未配置」看不出对面是没插满还是压根没读回来。
  if (!configuration && !subclass?.plug_hashes?.length) return undefined;
  if (!configuration) return { kind: "plug-hashes", hashes: subclass?.plug_hashes ?? [] };
  return {
    kind: "plug-groups",
    groups: [
      { group: "ability", hashes: configuration.abilities.map((plug) => plug.hash) },
      { group: "aspect", hashes: configuration.aspects.map((plug) => plug.hash) },
      { group: "fragment", hashes: configuration.fragments.map((plug) => plug.hash) },
      { group: "unclassified", hashes: configuration.other.map((plug) => plug.hash) }
    ],
    empty_socket_count: configuration.empty_socket_indexes.length
  };
}

function subclassConfigurationFingerprint(target: NonNullable<LocalLoadoutPlan["subclass_target"]>): string {
  return sortedNumbers([
    ...Object.values(target.socket_overrides ?? {}),
    ...target.ability_hashes,
    ...target.aspect_hashes,
    ...target.fragment_hashes,
    ...target.mod_hashes
  ]) || "empty";
}

function armorSetConstraintValue(
  constraint: NonNullable<NonNullable<LocalLoadoutPlan["armor_constraints"]>["set_constraint"]> | undefined
): ApplicationLoadoutCompareValue {
  if (!constraint || constraint.mode === "none") return { kind: "empty", empty: "unset" };
  if (constraint.mode === "single") {
    return { kind: "armor-set-single", set_hash: constraint.set_hash, piece_count: constraint.piece_count };
  }
  return { kind: "armor-set-split", first_hash: constraint.first_set_hash, second_hash: constraint.second_set_hash };
}

function armorSetConstraintFingerprint(
  constraint: NonNullable<NonNullable<LocalLoadoutPlan["armor_constraints"]>["set_constraint"]>
): string {
  if (constraint.mode === "none") return "none";
  if (constraint.mode === "single") return `single:${constraint.set_hash}:${constraint.piece_count}`;
  return `split-2-2:${constraint.first_set_hash}:${constraint.second_set_hash}`;
}

function compareRowOrder(left: string, right: string): number {
  const fixedOrder = [
    "identity:class",
    "identity:subclass",
    "identity:subclass-config",
    "equipment:kinetic:item",
    "equipment:kinetic:plugs",
    "equipment:energy:item",
    "equipment:energy:plugs",
    "equipment:power:item",
    "equipment:power:plugs",
    "equipment:helmet:item",
    "equipment:helmet:plugs",
    "equipment:gauntlets:item",
    "equipment:gauntlets:plugs",
    "equipment:chest:item",
    "equipment:chest:plugs",
    "equipment:legs:item",
    "equipment:legs:plugs",
    "equipment:class-item:item",
    "equipment:class-item:plugs",
    ...loadoutPlanArmorStatKeys.map((stat) => `armor:minimum:${stat}`),
    "armor:plus5",
    "armor:plus10",
    "armor:stat-mod:helmet",
    "armor:stat-mod:arms",
    "armor:stat-mod:chest",
    "armor:stat-mod:legs",
    "armor:stat-mod:class",
    "armor:mode",
    "armor:priority",
    "armor:exotic",
    "armor:set",
    "notes:notes"
  ];
  const leftIndex = fixedOrder.indexOf(left);
  const rightIndex = fixedOrder.indexOf(right);
  if (leftIndex !== -1 || rightIndex !== -1) {
    return (leftIndex === -1 ? fixedOrder.length : leftIndex)
      - (rightIndex === -1 ? fixedOrder.length : rightIndex);
  }
  return left.localeCompare(right, "zh-CN");
}

function inGameReferenceId(reference: ApplicationLoadoutInGameReference): string {
  return `in-game:${reference.character.character_id}:${reference.slot.index}`;
}

function sortedNumbers(values: number[]): string {
  return [...values].sort((left, right) => left - right).join(",");
}

function createScreenKey(screen: ApplicationLoadoutScreen): string {
  switch (screen.kind) {
    case "library": return `library:${screen.selected_plan_id ?? "none"}`;
    case "compare": return `compare:${screen.plan_ids.join(",")}:${screen.in_game_reference_id ?? "none"}`;
    case "editor": return `editor:${screen.draft_id}`;
    case "item-picker": return `item-picker:${screen.slot}`;
    case "armor-planner": return "armor-planner";
    case "wear-review": return `wear-review:${screen.plan_id}`;
    case "publish": return `publish:${screen.plan_id}`;
  }
}

function getReturnFocusId(screen: ApplicationLoadoutScreen): string | undefined {
  return screen.kind === "library" ? undefined : screen.return_focus_id;
}
