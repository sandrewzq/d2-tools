import type {
  AccountItemSocketSummary,
  AccountSummary,
  CharacterLoadoutSlotSummary
} from "../account/summary.js";
import {
  matchLocalLoadoutPlan,
  type LocalLoadoutPlan,
  type LocalLoadoutPlanMatchedItem
} from "./plans.js";

export type LocalLoadoutPlanExecutionStep = {
  readonly id: string;
  readonly kind: "equip-source-replacement" | "transfer-to-vault" | "transfer-from-vault" | "equip" | "insert-plug";
  readonly item_instance_id: string;
  readonly item_hash: number;
  readonly item_name: string;
  readonly character_id: string;
  readonly source_character_id?: string;
  readonly socket_index?: number;
  readonly plug_hash?: number;
  readonly label: string;
};

export type LocalLoadoutPlanExecutionPlan = {
  readonly plan_id: string;
  readonly account_membership_id: string;
  readonly target_character_id: string;
  readonly executable_steps: readonly LocalLoadoutPlanExecutionStep[];
  readonly gaps: readonly string[];
  readonly selected_item_count: number;
  readonly selected_item_instance_ids: readonly string[];
};

export type LocalLoadoutPlanExecutionValidation = {
  status: "valid" | "stale";
  reasons: string[];
};

export type LocalLoadoutPlanPublishPlan = {
  readonly plan_id: string;
  readonly source_execution_plan_id: string;
  readonly account_membership_id: string;
  readonly target_character_id: string;
  readonly loadout_index: number;
  readonly loadout_name: string;
  readonly loadout_name_hash?: number;
  readonly loadout_icon_hash?: number;
  readonly loadout_color_hash?: number;
  readonly overwrites_existing_slot: boolean;
  readonly selected_item_instance_ids: readonly string[];
  readonly expected_slot_fingerprint: string;
  readonly step_id: string;
};

export type LocalLoadoutPlanPublishValidation = {
  status: "valid" | "stale";
  reasons: string[];
};

export type LocalLoadoutPlanPublishVerification = {
  status: "verified" | "mismatch" | "unavailable";
  reasons: string[];
};

export function createLocalLoadoutPlanExecutionPlan(input: {
  plan: Pick<LocalLoadoutPlan, "class_name" | "item_targets">;
  account: AccountSummary;
  target_character_id: string;
}): LocalLoadoutPlanExecutionPlan {
  const target = input.account.characters.find((character) => character.character_id === input.target_character_id);
  if (!target) throw new Error("目标角色不在当前账号快照中，请刷新账号后重试。");
  const match = matchLocalLoadoutPlan(input.plan, input.account);
  const steps: LocalLoadoutPlanExecutionStep[] = [];
  const gaps: string[] = [];

  match.item_matches.forEach((itemMatch, index) => {
    const targetLabel = itemMatch.target.slot || `装备 ${index + 1}`;
    if (itemMatch.status !== "selected") {
      gaps.push(`${targetLabel}：${gapLabel(itemMatch.status)}`);
      return;
    }
    const matched = itemMatch.candidates[0];
    const instanceId = matched.item.instance_id;
    if (!instanceId) {
      gaps.push(`${targetLabel}：缺少实例 ID，无法执行。`);
      return;
    }
    if (matched.location.key === "postmaster") {
      gaps.push(`${targetLabel}：位于邮政官，需先手动取回后再应用。`);
      return;
    }
    if (matched.location.key === "equipped" && matched.location.character_id && matched.location.character_id !== input.target_character_id) {
      const sourceCharacter = input.account.characters.find((character) => character.character_id === matched.location.character_id);
      const replacement = sourceCharacter?.inventory_items.find((item) => (
        item.instance_id && item.instance_id !== instanceId && item.bucket_hash === matched.item.bucket_hash
      ));
      if (!replacement?.instance_id) {
        gaps.push(`${targetLabel}：当前由其他角色装备，但该角色背包没有可用的同槽替换装备。`);
        return;
      }
      steps.push({
        id: `replace:${matched.location.character_id}:${replacement.instance_id}`,
        kind: "equip-source-replacement",
        item_instance_id: replacement.instance_id,
        item_hash: replacement.hash,
        item_name: replacement.name,
        character_id: matched.location.character_id,
        source_character_id: matched.location.character_id,
        label: `${replacement.name}：先装备到来源角色，释放 ${matched.item.name}`
      });
    }
    if (matched.location.character_id && matched.location.character_id !== input.target_character_id) {
      steps.push({
        id: `to-vault:${instanceId}`,
        kind: "transfer-to-vault",
        item_instance_id: instanceId,
        item_hash: matched.item.hash,
        item_name: matched.item.name,
        character_id: matched.location.character_id,
        source_character_id: matched.location.character_id,
        label: `${matched.item.name}：从其他角色移入仓库`
      });
    }
    if (matched.location.key === "vault" || (matched.location.character_id && matched.location.character_id !== input.target_character_id)) {
      steps.push({
        id: `from-vault:${instanceId}`,
        kind: "transfer-from-vault",
        item_instance_id: instanceId,
        item_hash: matched.item.hash,
        item_name: matched.item.name,
        character_id: input.target_character_id,
        source_character_id: matched.location.character_id,
        label: `${matched.item.name}：从仓库取到目标角色`
      });
    }
    if (!matched.item.instance?.is_equipped || matched.location.character_id !== input.target_character_id) {
      steps.push({
        id: `equip:${instanceId}`,
        kind: "equip",
        item_instance_id: instanceId,
        item_hash: matched.item.hash,
        item_name: matched.item.name,
        character_id: input.target_character_id,
        label: `${matched.item.name}：装备到目标角色`
      });
    }
    for (const plugHash of itemMatch.target.plug_hashes) {
      const socket = findWritableSocket(matched, plugHash);
      if (socket === "already-applied") continue;
      if (!socket) {
        gaps.push(`${targetLabel}：Plug ${plugHash} 当前没有可验证的可写 Socket。`);
        continue;
      }
      steps.push({
        id: `plug:${instanceId}:${socket.socket_index}:${plugHash}`,
        kind: "insert-plug",
        item_instance_id: instanceId,
        item_hash: matched.item.hash,
        item_name: matched.item.name,
        character_id: input.target_character_id,
        socket_index: socket.socket_index,
        plug_hash: plugHash,
        label: `${matched.item.name}：切换 Plug ${plugHash}`
      });
    }
  });

  const executableSteps = dedupeSteps(steps);
  const uniqueGaps = [...new Set(gaps)];
  const selectedItemInstanceIds = match.item_matches
    .filter((itemMatch) => itemMatch.status === "selected")
    .map((itemMatch) => itemMatch.candidates[0]?.item.instance_id)
    .filter((instanceId): instanceId is string => Boolean(instanceId));
  const planId = createExecutionPlanId({
    accountMembershipId: input.account.destiny_membership_id,
    targetCharacterId: input.target_character_id,
    steps: executableSteps,
    gaps: uniqueGaps,
    selectedItemCount: match.selected_count,
    selectedItemInstanceIds
  });
  return Object.freeze({
    plan_id: planId,
    account_membership_id: input.account.destiny_membership_id,
    target_character_id: input.target_character_id,
    executable_steps: Object.freeze(executableSteps.map((step) => Object.freeze(step))),
    gaps: Object.freeze(uniqueGaps),
    selected_item_count: match.selected_count,
    selected_item_instance_ids: Object.freeze(selectedItemInstanceIds)
  });
}

export function validateLocalLoadoutPlanExecutionPlan(
  expected: LocalLoadoutPlanExecutionPlan,
  observed: LocalLoadoutPlanExecutionPlan
): LocalLoadoutPlanExecutionValidation {
  const reasons: string[] = [];
  if (expected.account_membership_id !== observed.account_membership_id) {
    reasons.push("账号身份已变化");
  }
  if (expected.target_character_id !== observed.target_character_id) {
    reasons.push("目标角色已变化");
  }
  if (expected.selected_item_count !== observed.selected_item_count) {
    reasons.push("已确认实例数量已变化");
  }
  if (!sameStrings(expected.selected_item_instance_ids, observed.selected_item_instance_ids)) {
    reasons.push("已确认实例已变化");
  }
  if (!sameExecutionSteps(expected.executable_steps, observed.executable_steps)) {
    reasons.push("装备位置、替换步骤或可写 Plug 已变化");
  }
  if (!sameStrings(expected.gaps, observed.gaps)) {
    reasons.push("方案缺口已变化");
  }
  return {
    status: reasons.length ? "stale" : "valid",
    reasons
  };
}

export function createLocalLoadoutPlanPublishPlan(input: {
  executionPlan: LocalLoadoutPlanExecutionPlan;
  account: AccountSummary;
  loadoutIndex: number;
}): LocalLoadoutPlanPublishPlan {
  if (input.executionPlan.account_membership_id !== input.account.destiny_membership_id) {
    throw new Error("执行结果不属于当前账号，请重新应用方案后再保存槽位。");
  }
  const character = input.account.characters.find(
    (candidate) => candidate.character_id === input.executionPlan.target_character_id
  );
  if (!character) throw new Error("目标角色不在当前账号快照中，请刷新账号后重试。");
  const slot = character.loadout_slots.find((candidate) => candidate.index === input.loadoutIndex);
  if (!slot) throw new Error("目标 Bungie 配装槽位不存在，请刷新账号后重新选择。");
  const equippedInstanceIds = new Set(
    character.equipped_items
      .map((item) => item.instance_id)
      .filter((instanceId): instanceId is string => Boolean(instanceId))
  );
  const missingInstances = input.executionPlan.selected_item_instance_ids.filter(
    (instanceId) => !equippedInstanceIds.has(instanceId)
  );
  if (missingInstances.length) {
    throw new Error("已应用方案的装备状态发生变化，请重新应用并完成刷新核对。");
  }

  const expectedSlotFingerprint = createLoadoutSlotFingerprint(slot);
  const stepId = `publish-slot:${character.character_id}:${slot.index}`;
  const canonical = JSON.stringify({
    source_execution_plan_id: input.executionPlan.plan_id,
    account_membership_id: input.account.destiny_membership_id,
    target_character_id: character.character_id,
    loadout_index: slot.index,
    selected_item_instance_ids: input.executionPlan.selected_item_instance_ids,
    expected_slot_fingerprint: expectedSlotFingerprint,
    step_id: stepId
  });
  return Object.freeze({
    plan_id: `local-loadout-publish:${fnv1a32(canonical)}:${canonical.length}`,
    source_execution_plan_id: input.executionPlan.plan_id,
    account_membership_id: input.account.destiny_membership_id,
    target_character_id: character.character_id,
    loadout_index: slot.index,
    loadout_name: slot.name,
    ...(slot.name_hash !== undefined ? { loadout_name_hash: slot.name_hash } : {}),
    ...(slot.icon_hash !== undefined ? { loadout_icon_hash: slot.icon_hash } : {}),
    ...(slot.color_hash !== undefined ? { loadout_color_hash: slot.color_hash } : {}),
    overwrites_existing_slot: slot.item_count > 0,
    selected_item_instance_ids: Object.freeze([...input.executionPlan.selected_item_instance_ids]),
    expected_slot_fingerprint: expectedSlotFingerprint,
    step_id: stepId
  });
}

export function validateLocalLoadoutPlanPublishPlan(
  plan: LocalLoadoutPlanPublishPlan,
  account: AccountSummary
): LocalLoadoutPlanPublishValidation {
  const reasons: string[] = [];
  if (plan.account_membership_id !== account.destiny_membership_id) {
    reasons.push("账号身份已变化");
  }
  const character = account.characters.find((candidate) => candidate.character_id === plan.target_character_id);
  if (!character) {
    reasons.push("目标角色已不可用");
    return { status: "stale", reasons };
  }
  const equippedInstanceIds = new Set(
    character.equipped_items
      .map((item) => item.instance_id)
      .filter((instanceId): instanceId is string => Boolean(instanceId))
  );
  if (plan.selected_item_instance_ids.some((instanceId) => !equippedInstanceIds.has(instanceId))) {
    reasons.push("已应用方案的装备状态已变化");
  }
  const slot = character.loadout_slots.find((candidate) => candidate.index === plan.loadout_index);
  if (!slot) {
    reasons.push("目标 Bungie 配装槽位已不可用");
  } else if (createLoadoutSlotFingerprint(slot) !== plan.expected_slot_fingerprint) {
    reasons.push("目标 Bungie 配装槽位内容已变化");
  }
  return { status: reasons.length ? "stale" : "valid", reasons };
}

export function verifyLocalLoadoutPlanPublishPlan(
  plan: LocalLoadoutPlanPublishPlan,
  account: AccountSummary
): LocalLoadoutPlanPublishVerification {
  if (plan.account_membership_id !== account.destiny_membership_id) {
    return { status: "mismatch", reasons: ["刷新后的账号身份与发布计划不一致"] };
  }
  const character = account.characters.find((candidate) => candidate.character_id === plan.target_character_id);
  if (!character) return { status: "mismatch", reasons: ["刷新后未找到目标角色"] };
  const slot = character.loadout_slots.find((candidate) => candidate.index === plan.loadout_index);
  if (!slot) return { status: "mismatch", reasons: ["刷新后未找到目标 Bungie 配装槽位"] };
  const slotInstanceIds = slot.items
    .map((item) => item.instance_id)
    .filter((instanceId): instanceId is string => Boolean(instanceId));
  if (!slotInstanceIds.length && plan.selected_item_instance_ids.length) {
    return { status: "unavailable", reasons: ["Bungie 返回的槽位内容缺少实例 ID，无法完成精确核对"] };
  }
  const savedInstances = new Set(slotInstanceIds);
  const missingInstances = plan.selected_item_instance_ids.filter((instanceId) => !savedInstances.has(instanceId));
  return missingInstances.length
    ? { status: "mismatch", reasons: [`槽位缺少 ${missingInstances.length} 个已确认实例`] }
    : { status: "verified", reasons: [] };
}

function findWritableSocket(item: LocalLoadoutPlanMatchedItem, plugHash: number): AccountItemSocketSummary | "already-applied" | null {
  for (const socket of item.item.sockets ?? []) {
    if (socket.selected_plug?.hash === plugHash) return "already-applied";
    const reusable = socket.reusable_plugs.find((plug) => plug.hash === plugHash);
    if (reusable && reusable.can_insert !== false && reusable.enabled !== false) return socket;
  }
  return null;
}

function gapLabel(status: ReturnType<typeof matchLocalLoadoutPlan>["item_matches"][number]["status"]): string {
  if (status === "missing") return "账号内未找到指定实例";
  if (status === "needs-selection" || status === "available") return "尚未选择具体实例";
  if (status === "plug-unavailable") return "目标 Plug 不可验证";
  return "目标尚未配置";
}

function dedupeSteps(steps: LocalLoadoutPlanExecutionStep[]): LocalLoadoutPlanExecutionStep[] {
  const seen = new Set<string>();
  return steps.filter((step) => {
    if (seen.has(step.id)) return false;
    seen.add(step.id);
    return true;
  });
}

function createExecutionPlanId(input: {
  accountMembershipId: string;
  targetCharacterId: string;
  steps: readonly LocalLoadoutPlanExecutionStep[];
  gaps: readonly string[];
  selectedItemCount: number;
  selectedItemInstanceIds: readonly string[];
}): string {
  const canonical = JSON.stringify({
    account_membership_id: input.accountMembershipId,
    target_character_id: input.targetCharacterId,
    executable_steps: input.steps,
    gaps: input.gaps,
    selected_item_count: input.selectedItemCount,
    selected_item_instance_ids: input.selectedItemInstanceIds
  });
  return `local-loadout-plan:${fnv1a32(canonical)}:${canonical.length}`;
}

function createLoadoutSlotFingerprint(slot: CharacterLoadoutSlotSummary): string {
  const canonical = JSON.stringify({
    index: slot.index,
    name: slot.name,
    name_hash: slot.name_hash ?? null,
    icon_hash: slot.icon_hash ?? null,
    color_hash: slot.color_hash ?? null,
    item_count: slot.item_count,
    items: slot.items.map((item) => ({
      instance_id: item.instance_id ?? null,
      item_hash: item.item_hash ?? null,
      plug_hashes: item.plug_hashes ?? []
    }))
  });
  return `${fnv1a32(canonical)}:${canonical.length}`;
}

function sameExecutionSteps(
  expected: readonly LocalLoadoutPlanExecutionStep[],
  observed: readonly LocalLoadoutPlanExecutionStep[]
): boolean {
  if (expected.length !== observed.length) return false;
  return expected.every((step, index) => {
    const candidate = observed[index];
    return candidate !== undefined
      && step.id === candidate.id
      && step.kind === candidate.kind
      && step.item_instance_id === candidate.item_instance_id
      && step.item_hash === candidate.item_hash
      && step.character_id === candidate.character_id
      && step.source_character_id === candidate.source_character_id
      && step.socket_index === candidate.socket_index
      && step.plug_hash === candidate.plug_hash;
  });
}

function sameStrings(expected: readonly string[], observed: readonly string[]): boolean {
  return expected.length === observed.length
    && expected.every((value, index) => value === observed[index]);
}

function fnv1a32(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}
