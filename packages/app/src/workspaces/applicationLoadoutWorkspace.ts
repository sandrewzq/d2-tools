import type {
  AccountSummary,
  CharacterLoadoutSlotSummary,
  CharacterSummary
} from "@d2-tools/core/account/summary";
import {
  loadoutPlanArmorStatKeys,
  matchLocalLoadoutPlan,
  type LoadoutPlanArmorStatKey,
  type LocalLoadoutPlan,
  type LocalLoadoutPlanItemMatch,
  type LocalLoadoutPlanItemMatchStatus,
  type LocalLoadoutPlanMatch
} from "@d2-tools/core/loadouts/plans";

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
  source_label: string;
  item_count: number;
  updated_at: string;
  has_subclass: boolean;
  has_armor_targets: boolean;
  status_label: string;
  status_tone: "neutral" | "ready" | "warning";
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
  status_label: string;
  status_tone: "neutral" | "ready" | "warning";
  candidate_count: number;
};

export type ApplicationLoadoutWearState =
  | "waiting-account"
  | "empty"
  | "needs-review"
  | "ready";

export type ApplicationLoadoutDetailView = {
  plan: LocalLoadoutPlan;
  item_rows: ApplicationLoadoutItemDetailView[];
  match_summary: LocalLoadoutPlanMatch | null;
  target_character: CharacterSummary | null;
  wear_state: ApplicationLoadoutWearState;
  wear_enabled: boolean;
  wear_label: string;
  wear_block_reasons: string[];
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
      title: string;
      subtitle: string;
      plan: LocalLoadoutPlan;
      completeness: "complete";
    }
  | {
      id: string;
      kind: "in-game";
      title: string;
      subtitle: string;
      character: CharacterSummary;
      slot: CharacterLoadoutSlotSummary;
      completeness: "partial";
    };

export type ApplicationLoadoutCompareCell = {
  column_id: string;
  state: "value" | "empty" | "unknown";
  value: string;
  fingerprint: string;
};

export type ApplicationLoadoutCompareRow = {
  key: string;
  section: "identity" | "equipment" | "armor" | "notes";
  label: string;
  changed: boolean;
  cells: ApplicationLoadoutCompareCell[];
};

export type ApplicationLoadoutCompareViewModel = {
  selected_plan_ids: string[];
  selection_count: number;
  minimum_selection_count: 2;
  maximum_selection_count: 3;
  can_compare: boolean;
  selection_message: string;
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
    title: plan.name,
    subtitle: `${plan.class_name} · ${plan.item_targets.length} 个装备目标`,
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
      ? "最多选择 3 个应用配装"
      : canCompare
      ? `正在比较 ${planIds.length} 个应用配装${inGameColumn ? "，并加入 1 个游戏内只读参照" : ""}`
      : planIds.length < 2
        ? `还需选择 ${2 - planIds.length} 个应用配装`
        : "最多选择 3 个应用配装",
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
    wear_label: wearState === "ready"
      ? "可进入穿戴核对"
      : wearState === "waiting-account"
        ? "等待账号核对"
        : wearState === "empty"
          ? "尚未配置装备"
          : `${wearBlockReasons.length} 项需要处理`,
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
    source_label: applicationLoadoutSourceLabel(plan.source.kind),
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
): string[] {
  if (!plan.item_targets.length) return ["至少配置一个装备目标后才能穿戴。"];
  if (!accountSummary) return ["需要读取账号数据并在执行前刷新核对。"];
  const reasons: string[] = [];
  if (!plan.target_character_id) reasons.push("尚未选择目标角色。");
  else if (!targetCharacter) reasons.push("目标角色不在当前账号快照中。");
  if (!matchSummary) return [...reasons, "尚未核对方案中的装备实例。"];
  if (matchSummary.unconfigured_count) reasons.push(`${matchSummary.unconfigured_count} 个装备槽尚未配置。`);
  if (matchSummary.available_count) reasons.push(`${matchSummary.available_count} 个装备目标需要绑定唯一实例。`);
  if (matchSummary.needs_selection_count) reasons.push(`${matchSummary.needs_selection_count} 个装备目标存在多个候选实例。`);
  if (matchSummary.missing_count) reasons.push(`${matchSummary.missing_count} 个装备目标在账号内未找到。`);
  if (matchSummary.plug_unavailable_count) reasons.push(`${matchSummary.plug_unavailable_count} 个装备目标的 Plug 当前不可用。`);
  return reasons;
}

function itemMatchPresentation(
  status: LocalLoadoutPlanItemMatchStatus | undefined
): Pick<ApplicationLoadoutItemDetailView, "status_label" | "status_tone"> {
  if (status === "selected") return { status_label: "已绑定实例", status_tone: "ready" };
  if (status === "available") return { status_label: "需要确认实例", status_tone: "warning" };
  if (status === "needs-selection") return { status_label: "需要选择实例", status_tone: "warning" };
  if (status === "missing") return { status_label: "账号内未找到", status_tone: "warning" };
  if (status === "plug-unavailable") return { status_label: "目标 Plug 不可用", status_tone: "warning" };
  return { status_label: "尚未配置", status_tone: "neutral" };
}

function applicationLoadoutSourceLabel(source: LocalLoadoutPlan["source"]["kind"]): string {
  switch (source) {
    case "current-equipment": return "当前装备";
    case "bungie-loadout": return "游戏内配装复制";
    case "dim-link": return "DIM 创建方式";
    case "guide": return "攻略成果";
    case "armor-plan": return "自动配甲";
    case "assistant-targets": return "AI 装备目标";
    default: return "手动创建";
  }
}

function createInGameCompareColumn(
  reference: ApplicationLoadoutInGameReference
): ApplicationLoadoutCompareColumn {
  return {
    id: inGameReferenceId(reference),
    kind: "in-game",
    title: reference.slot.name || `游戏内槽位 ${reference.slot.index + 1}`,
    subtitle: `${reference.character.class_name} · 游戏内只读参照`,
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
  addProjectionValue(projection, "identity:class", "identity", "职业", plan.class_name);
  addProjectionValue(
    projection,
    "identity:subclass",
    "identity",
    "子职业",
    plan.subclass_target?.subclass_hash ? `子职业 ${plan.subclass_target.subclass_hash}` : "未配置",
    plan.subclass_target?.subclass_hash ? "value" : "empty",
    plan.subclass_target?.subclass_hash ? String(plan.subclass_target.subclass_hash) : "empty"
  );
  addProjectionValue(
    projection,
    "identity:subclass-config",
    "identity",
    "子职业配置",
    subclassConfigurationCount ? formatApplicationSubclassConfiguration(plan) : "未配置",
    subclassConfigurationCount ? "value" : "empty",
    subclassConfigurationCount && plan.subclass_target
      ? subclassConfigurationFingerprint(plan.subclass_target)
      : "empty"
  );
  for (const target of plan.item_targets) {
    const slot = normalizeCompareSlot(target.slot);
    const identity = target.item_hash
      ? `物品 ${target.item_hash}`
      : target.selected_instance_id
        ? `实例 …${target.selected_instance_id.slice(-6)}`
        : "未配置";
    addProjectionValue(
      projection,
      `equipment:${slot.key}:item`,
      "equipment",
      slot.label,
      identity,
      identity === "未配置" ? "empty" : "value",
      `${target.item_hash ?? ""}|${target.selected_instance_id ?? ""}`
    );
    addProjectionValue(
      projection,
      `equipment:${slot.key}:plugs`,
      "equipment",
      `${slot.label} Plug`,
      target.plug_hashes.length ? `${target.plug_hashes.length} 个 Plug` : "未配置",
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
      `${armorStatLabel(stat)}最低值`,
      value === undefined ? "未设置" : String(value),
      value === undefined ? "empty" : "value"
    );
  }
  addProjectionValue(
    projection,
    "armor:plus5",
    "armor",
    "+5 属性模组数量",
    plan.armor_constraints ? String(plan.armor_constraints.five_point_mod_budget) : "未设置",
    plan.armor_constraints ? "value" : "empty",
    plan.armor_constraints ? String(plan.armor_constraints.five_point_mod_budget) : "empty"
  );
  addProjectionValue(
    projection,
    "armor:plus10",
    "armor",
    "+10 属性模组数量",
    plan.armor_constraints ? String(plan.armor_constraints.ten_point_mod_budget) : "未设置",
    plan.armor_constraints ? "value" : "empty",
    plan.armor_constraints ? String(plan.armor_constraints.ten_point_mod_budget) : "empty"
  );
  addProjectionValue(
    projection,
    "armor:mode",
    "armor",
    "自动配甲模式",
    plan.armor_constraints?.planner_mode ?? "未设置",
    plan.armor_constraints?.planner_mode ? "value" : "empty"
  );
  addProjectionValue(
    projection,
    "armor:priority",
    "armor",
    "属性优先级",
    plan.armor_constraints?.priority_stats.length
      ? plan.armor_constraints.priority_stats.map(armorStatLabel).join(" → ")
      : "未设置",
    plan.armor_constraints?.priority_stats.length ? "value" : "empty",
    plan.armor_constraints?.priority_stats.join(",") || "empty"
  );
  addProjectionValue(
    projection,
    "armor:exotic",
    "armor",
    "异域护甲约束",
    plan.armor_constraints?.exotic_item_hash
      ? `物品 ${plan.armor_constraints.exotic_item_hash}`
      : plan.armor_constraints?.exotic_instance_id
        ? `实例 …${plan.armor_constraints.exotic_instance_id.slice(-6)}`
        : "未设置",
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
    "护甲套装约束",
    formatArmorSetConstraint(setConstraint),
    setConstraint && setConstraint.mode !== "none" ? "value" : "empty",
    setConstraint && setConstraint.mode !== "none" ? armorSetConstraintFingerprint(setConstraint) : "empty"
  );
  addProjectionValue(
    projection,
    "notes:notes",
    "notes",
    "备注",
    plan.notes?.trim() || "无",
    plan.notes?.trim() ? "value" : "empty"
  );
  return projection;
}

function projectInGameLoadout(reference: ApplicationLoadoutInGameReference): CompareProjection {
  const projection: CompareProjection = new Map();
  addProjectionValue(projection, "identity:class", "identity", "职业", reference.character.class_name);
  const subclass = reference.slot.items.find((item) => normalizeCompareSlot(item.bucket_name ?? "").key === "subclass");
  addProjectionValue(
    projection,
    "identity:subclass",
    "identity",
    "子职业",
    subclass?.name ?? "未返回",
    subclass ? "value" : "unknown",
    subclass ? String(subclass.item_hash ?? subclass.name) : "unknown"
  );
  addProjectionValue(
    projection,
    "identity:subclass-config",
    "identity",
    "子职业配置",
    subclass?.plug_hashes
      ? (subclass.plug_hashes.length ? `${subclass.plug_hashes.length} 个已返回 Plug` : "未配置")
      : "未返回",
    subclass?.plug_hashes
      ? (subclass.plug_hashes.length ? "value" : "empty")
      : "unknown",
    subclass?.plug_hashes
      ? (sortedNumbers(subclass.plug_hashes) || "empty")
      : "unknown"
  );
  for (const item of reference.slot.items) {
    const slot = normalizeCompareSlot(item.bucket_name ?? item.name);
    if (slot.key === "subclass") continue;
    addProjectionValue(
      projection,
      `equipment:${slot.key}:item`,
      "equipment",
      slot.label,
      item.name,
      "value",
      `${item.item_hash ?? ""}|${item.instance_id ?? ""}`
    );
    addProjectionValue(
      projection,
      `equipment:${slot.key}:plugs`,
      "equipment",
      `${slot.label} Plug`,
      item.plug_hashes ? `${item.plug_hashes.length} 个已返回 Plug` : "未返回",
      item.plug_hashes ? (item.plug_hashes.length ? "value" : "empty") : "unknown",
      item.plug_hashes ? (sortedNumbers(item.plug_hashes) || "empty") : "unknown"
    );
  }
  for (const stat of loadoutPlanArmorStatKeys) {
    addProjectionValue(
      projection,
      `armor:minimum:${stat}`,
      "armor",
      `${armorStatLabel(stat)}最低值`,
      "未返回",
      "unknown"
    );
  }
  addProjectionValue(projection, "armor:plus5", "armor", "+5 属性模组数量", "未返回", "unknown");
  addProjectionValue(projection, "armor:plus10", "armor", "+10 属性模组数量", "未返回", "unknown");
  addProjectionValue(projection, "armor:mode", "armor", "自动配甲模式", "未返回", "unknown");
  addProjectionValue(projection, "armor:priority", "armor", "属性优先级", "未返回", "unknown");
  addProjectionValue(projection, "armor:exotic", "armor", "异域护甲约束", "未返回", "unknown");
  addProjectionValue(projection, "armor:set", "armor", "护甲套装约束", "未返回", "unknown");
  addProjectionValue(projection, "notes:notes", "notes", "备注", "未返回", "unknown");
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
        value: unknown ? "未返回" : "未配置",
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
  label: string,
  value: string,
  state: ApplicationLoadoutCompareCell["state"] = "value",
  fingerprint = value
): void {
  projection.set(key, {
    key,
    section,
    label,
    cell: { state, value, fingerprint }
  });
}

function formatApplicationSubclassConfiguration(plan: LocalLoadoutPlan): string {
  const target = plan.subclass_target;
  if (!target) return "未配置";
  const parts = [
    target.ability_hashes.length ? `${target.ability_hashes.length} 个技能` : "",
    target.aspect_hashes.length ? `${target.aspect_hashes.length} 个星相` : "",
    target.fragment_hashes.length ? `${target.fragment_hashes.length} 个碎片` : "",
    target.mod_hashes.length ? `${target.mod_hashes.length} 个子职业模组` : ""
  ].filter(Boolean);
  return parts.join(" · ");
}

function subclassConfigurationFingerprint(target: NonNullable<LocalLoadoutPlan["subclass_target"]>): string {
  return sortedNumbers([
    ...target.ability_hashes,
    ...target.aspect_hashes,
    ...target.fragment_hashes,
    ...target.mod_hashes
  ]) || "empty";
}

function formatArmorSetConstraint(
  constraint: NonNullable<NonNullable<LocalLoadoutPlan["armor_constraints"]>["set_constraint"]> | undefined
): string {
  if (!constraint || constraint.mode === "none") return "未设置";
  if (constraint.mode === "single") return `套装 ${constraint.set_hash} · ${constraint.piece_count} 件`;
  return `套装 ${constraint.first_set_hash} + ${constraint.second_set_hash} · 2+2`;
}

function armorSetConstraintFingerprint(
  constraint: NonNullable<NonNullable<LocalLoadoutPlan["armor_constraints"]>["set_constraint"]>
): string {
  if (constraint.mode === "none") return "none";
  if (constraint.mode === "single") return `single:${constraint.set_hash}:${constraint.piece_count}`;
  return `split-2-2:${constraint.first_set_hash}:${constraint.second_set_hash}`;
}

function normalizeCompareSlot(rawSlot: string): { key: string; label: string } {
  const value = rawSlot.trim().toLocaleLowerCase();
  const knownSlots: Array<{ key: string; label: string; patterns: RegExp[] }> = [
    { key: "subclass", label: "子职业", patterns: [/子职业/, /subclass/] },
    { key: "kinetic", label: "动能武器", patterns: [/动能/, /kinetic/] },
    { key: "energy", label: "能量武器", patterns: [/能量武器/, /^energy/] },
    { key: "power", label: "威能武器", patterns: [/威能/, /重武器/, /power weapon/, /heavy/] },
    { key: "helmet", label: "头盔", patterns: [/头盔/, /helmet/] },
    { key: "gauntlets", label: "臂铠", patterns: [/臂铠/, /手套/, /gauntlet/] },
    { key: "chest", label: "胸甲", patterns: [/胸甲/, /chest/] },
    { key: "legs", label: "腿甲", patterns: [/腿甲/, /leg armor/, /boots/] },
    { key: "class-item", label: "职业物品", patterns: [/职业物品/, /class item/] }
  ];
  const known = knownSlots.find((slot) => slot.patterns.some((pattern) => pattern.test(value)));
  if (known) return { key: known.key, label: known.label };
  const key = value.replace(/[^\p{Letter}\p{Number}]+/gu, "-").replace(/^-|-$/g, "") || "unknown-slot";
  return { key: `custom:${key}`, label: rawSlot || "未命名槽位" };
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

function armorStatLabel(stat: LoadoutPlanArmorStatKey): string {
  switch (stat) {
    case "health": return "生命";
    case "melee": return "近战";
    case "grenade": return "手雷";
    case "super": return "超能";
    case "class": return "职业技能";
    case "weapon": return "武器";
  }
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
