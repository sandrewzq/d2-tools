import type { AccountItemSocketSummary, AccountSummary } from "../account/summary.js";
import {
  matchLocalLoadoutPlan,
  type LocalLoadoutPlan,
  type LocalLoadoutPlanMatchedItem
} from "./plans.js";

export type LocalLoadoutPlanExecutionStep = {
  id: string;
  kind: "equip-source-replacement" | "transfer-to-vault" | "transfer-from-vault" | "equip" | "insert-plug";
  item_instance_id: string;
  item_hash: number;
  item_name: string;
  character_id: string;
  source_character_id?: string;
  socket_index?: number;
  plug_hash?: number;
  label: string;
};

export type LocalLoadoutPlanExecutionPlan = {
  target_character_id: string;
  executable_steps: LocalLoadoutPlanExecutionStep[];
  gaps: string[];
  selected_item_count: number;
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

  return {
    target_character_id: input.target_character_id,
    executable_steps: dedupeSteps(steps),
    gaps: [...new Set(gaps)],
    selected_item_count: match.selected_count
  };
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
