import type {
  AccountItemDetail,
  AccountItemSummary,
  AccountSummary
} from "@d2-tools/core/account/summary";
import type { LocalLoadoutPlan } from "@d2-tools/core/loadouts/plans";
import { loadAccountItemDetailCached } from "../hooks/useItemDetail";

/**
 * 穿戴路径的写前判据必须来自**完整实例详情**，不能来自账号快照。
 *
 * 快照按设计剪掉了 `armor_energy` / `catalyst` / `sockets`（见 `summary.ts` 的 `AccountItemSnapshot`），
 * 而 `hasVerifiedPlug`（判「这个 Plug 能不能写」）和 `validatePlannedArmorAssignments`
 * （判「这件护甲的能量和插槽够不够」）正是靠这两样。拿快照去判，真正需要写的那一类永远判不通过。
 *
 * 这里只补本次要写的那些实例，不把整个账号转 full。按需拉详情这条路径与 T77 / T80
 * 走通的武器换 Perk 一致：`loadAccountItemDetailCached` → IPC `account:item-detail` → full 模式。
 */

/** 正常配装到不了这个量；超过就当数据异常处理，宁可不补也不一次打上百个请求。 */
const DEFAULT_MAX_ITEMS = 40;
const DETAIL_FETCH_CONCURRENCY = 4;

export type HydratePlanAccountOptions = {
  maxItems?: number;
  concurrency?: number;
};

/**
 * 列出这套配装执行时会碰到的实例。
 *
 * 三类来源：
 * - `item_targets[].selected_instance_id`——已经绑定到具体实例的目标。
 * - `armor_plan.selected_instance_ids` 与 `armor_plan.planned_armor_plugs[].instance_id`——护甲方案选中的部件。
 * - 只给了 `item_hash`、还没绑定实例的目标——账号里同 Hash 的每一件都要补，
 *   否则求解出来的候选会因为「看不出能不能写」被误判成不可用。
 */
export function collectPlanInstanceIds(
  plan: Pick<LocalLoadoutPlan, "item_targets" | "armor_plan">,
  account: AccountSummary
): string[] {
  const instanceIds = new Set<string>();
  const hashOnly = new Set<number>();

  for (const target of plan.item_targets) {
    if (target.selected_instance_id) instanceIds.add(target.selected_instance_id);
    else if (typeof target.item_hash === "number") hashOnly.add(target.item_hash);
  }
  for (const instanceId of plan.armor_plan?.selected_instance_ids ?? []) {
    if (instanceId) instanceIds.add(instanceId);
  }
  for (const plug of plan.armor_plan?.planned_armor_plugs ?? []) {
    if (plug.instance_id) instanceIds.add(plug.instance_id);
  }

  if (hashOnly.size) {
    for (const item of listAccountItems(account)) {
      // 只给了 Hash 的目标靠「账号里同 Hash 的每一件」补实例。没有实例 ID 的项不是实例，
      // 补进去也拉不到详情（T91 第 12 节）。
      if (item.instance_id && hashOnly.has(item.hash)) instanceIds.add(item.instance_id);
    }
  }

  return [...instanceIds];
}

/** 账号里所有可能承载装备实例的位置。 */
function listAccountItems(account: AccountSummary): AccountItemSummary[] {
  const items: AccountItemSummary[] = [...account.vault.items];
  for (const character of account.characters) {
    items.push(
      ...character.equipped_items,
      ...character.inventory_items,
      ...character.postmaster_items
    );
  }
  return items;
}

/**
 * 把完整详情合并回账号摘要。
 *
 * `AccountItemDetail` 是 `AccountItemSummary` 的超集，所以这里是纯粹的按实例替换。
 * 没有任何一件对得上时返回**原引用**——调用方多半把它挂在 memo 依赖上，
 * 每次刷新都换一个新对象会让整页白重算一遍。
 */
export function mergeAccountItemDetails(
  account: AccountSummary,
  details: readonly AccountItemDetail[]
): AccountSummary {
  if (!details.length) return account;
  const detailsByInstanceId = new Map(details.map((detail) => [detail.instance_id, detail]));

  const mergeItems = (items: AccountItemSummary[]): AccountItemSummary[] => {
    let changed = false;
    const next = items.map((item) => {
      // 快照里的项可能没有实例 ID（例如只看 Hash 的目标）；没有就没有详情可合，保持原样。
      const detail = item.instance_id ? detailsByInstanceId.get(item.instance_id) : undefined;
      if (!detail) return item;
      changed = true;
      return detail;
    });
    return changed ? next : items;
  };

  let charactersChanged = false;
  const characters = account.characters.map((character) => {
    const equippedItems = mergeItems(character.equipped_items);
    const inventoryItems = mergeItems(character.inventory_items);
    const postmasterItems = mergeItems(character.postmaster_items);
    if (equippedItems === character.equipped_items
      && inventoryItems === character.inventory_items
      && postmasterItems === character.postmaster_items) {
      return character;
    }
    charactersChanged = true;
    return { ...character, equipped_items: equippedItems, inventory_items: inventoryItems, postmaster_items: postmasterItems };
  });

  const vaultItems = mergeItems(account.vault.items);
  const vaultChanged = vaultItems !== account.vault.items;
  if (!charactersChanged && !vaultChanged) return account;

  return {
    ...account,
    characters,
    vault: vaultChanged ? { ...account.vault, items: vaultItems } : account.vault
  };
}

/**
 * 按需拉取这套配装涉及的实例详情，合并成一份可以直接交给执行计划的账号。
 *
 * 单件拉取失败只跳过那一件：该件保持快照态，下游照旧产出
 * 「Plug 当前不可用」或「缺少能量或 Socket 数据」，天然 fail closed。
 */
export async function hydratePlanAccount(
  account: AccountSummary,
  plan: Pick<LocalLoadoutPlan, "item_targets" | "armor_plan">,
  options: HydratePlanAccountOptions = {}
): Promise<AccountSummary> {
  const instanceIds = collectPlanInstanceIds(plan, account);
  if (!instanceIds.length) return account;

  const maxItems = options.maxItems ?? DEFAULT_MAX_ITEMS;
  if (instanceIds.length > maxItems) {
    console.warn(`配装涉及的实例数 ${instanceIds.length} 超过 ${maxItems}，跳过插槽详情补全。`);
    return account;
  }

  const details = await mapWithConcurrency(
    instanceIds,
    options.concurrency ?? DETAIL_FETCH_CONCURRENCY,
    async (instanceId) => {
      try {
        return await loadAccountItemDetailCached(instanceId);
      } catch {
        return null;
      }
    }
  );

  return mergeAccountItemDetails(
    account,
    details.filter((detail): detail is AccountItemDetail => detail !== null)
  );
}

/** 有界并发；`Promise.all` 全放开会一次打出几十个请求。 */
async function mapWithConcurrency<TInput, TOutput>(
  inputs: readonly TInput[],
  concurrency: number,
  worker: (input: TInput) => Promise<TOutput>
): Promise<TOutput[]> {
  const results = new Array<TOutput>(inputs.length);
  const limit = Math.min(Math.max(1, concurrency), inputs.length);
  let cursor = 0;
  const run = async () => {
    while (cursor < inputs.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await worker(inputs[index]);
    }
  };
  await Promise.all(Array.from({ length: limit }, () => run()));
  return results;
}
