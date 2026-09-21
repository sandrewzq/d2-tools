// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AccountItemDetail, AccountItemSummary, AccountSummary } from "../src/renderer/api/types.js";
import { matchLocalLoadoutPlan } from "@d2-tools/core/loadouts/plans";
import {
  collectPlanInstanceIds,
  hydratePlanAccount,
  mergeAccountItemDetails
} from "../src/renderer/shared/loadouts/hydratePlanAccount.js";

const apiMocks = vi.hoisted(() => ({
  getAccountItemDetail: vi.fn()
}));

vi.mock("../src/renderer/api/client.js", () => ({
  api: apiMocks
}));

// Bug #103：穿戴路径拿的是账号快照，快照按设计不含 `sockets` / `armor_energy`，
// 于是 `hasVerifiedPlug` 只对已经装着的 Plug 成立，真正要写的那一类永远判不可用。
// 这里锁住补全前后的差异。
//
// 每个用例用不同的实例 ID：`loadAccountItemDetailCached` 是进程级缓存，跨用例复用会让 mock 失真。
describe("loadout plan account hydration", () => {
  beforeEach(() => {
    apiMocks.getAccountItemDetail.mockReset();
    vi.restoreAllMocks();
  });

  it("collects bound instances, armor plan members and hash-only target matches", () => {
    const account = buildAccount("collect");
    const ids = collectPlanInstanceIds({
      item_targets: [
        { slot: "能量武器", item_hash: weaponHash, selected_instance_id: "weapon-collect", plug_hashes: [] },
        { slot: "头盔", item_hash: armorHash, plug_hashes: [] }
      ],
      armor_plan: armorPlan(["armor-a-collect"], ["armor-b-collect"])
    }, account);

    expect(new Set(ids)).toEqual(new Set([
      "weapon-collect",
      "armor-a-collect",
      "armor-b-collect",
      "armor-c-collect",
      "armor-d-collect"
    ]));
  });

  it("keeps the original account reference when nothing matches or there is no detail", () => {
    const account = buildAccount("empty");
    expect(mergeAccountItemDetails(account, [])).toBe(account);
    expect(mergeAccountItemDetails(account, [itemDetail("unknown-instance")])).toBe(account);
  });

  it("replaces only the matched instance and keeps the rest of the snapshot intact", () => {
    const account = buildAccount("merge");
    const merged = mergeAccountItemDetails(account, [itemDetail("weapon-merge")]);
    const character = merged.characters[0]!;
    const weapon = character.equipped_items.find((item) => item.instance_id === "weapon-merge")!;

    expect(weapon.sockets).toHaveLength(1);
    expect(character.inventory_items[0]!.sockets).toBeUndefined();
    expect(merged.vault.items).toBe(account.vault.items);
  });

  it("turns a plug-unavailable target into a wearable one after hydration", async () => {
    const account = buildAccount("wear");
    const plan = {
      item_targets: [
        { slot: "能量武器", item_hash: weaponHash, selected_instance_id: "weapon-wear", plug_hashes: [targetPlugHash] }
      ]
    };
    apiMocks.getAccountItemDetail.mockImplementation((instanceId: string) => (
      Promise.resolve(itemDetail(instanceId, weaponHash))
    ));

    expect(matchLocalLoadoutPlan(plan, account).plug_unavailable_count).toBe(1);

    const hydrated = await hydratePlanAccount(account, plan);
    const match = matchLocalLoadoutPlan(plan, hydrated);

    expect(match.plug_unavailable_count).toBe(0);
    expect(match.selected_count).toBe(plan.item_targets.length);
  });

  it("keeps the snapshot state for an instance whose detail fails to load", async () => {
    const account = buildAccount("failed");
    const plan = {
      item_targets: [
        { slot: "能量武器", item_hash: weaponHash, selected_instance_id: "weapon-failed", plug_hashes: [targetPlugHash] }
      ],
      armor_plan: armorPlan(["armor-a-failed"], [])
    };
    apiMocks.getAccountItemDetail.mockImplementation((instanceId: string) => (
      instanceId === "weapon-failed"
        ? Promise.reject(new Error("detail unavailable"))
        : Promise.resolve(itemDetail(instanceId, armorHash))
    ));

    const hydrated = await hydratePlanAccount(account, plan);
    const character = hydrated.characters[0]!;

    expect(character.equipped_items.find((item) => item.instance_id === "weapon-failed")!.sockets).toBeUndefined();
    expect(character.inventory_items.find((item) => item.instance_id === "armor-a-failed")!.sockets).toHaveLength(1);
    expect(matchLocalLoadoutPlan(plan, hydrated).plug_unavailable_count).toBe(1);
  });

  it("leaves the account untouched when the plan touches more instances than the cap", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const account = buildAccount("cap");
    const plan = {
      item_targets: [
        { slot: "能量武器", item_hash: weaponHash, selected_instance_id: "weapon-cap", plug_hashes: [] },
        { slot: "头盔", item_hash: armorHash, plug_hashes: [] }
      ],
      armor_plan: armorPlan(["armor-a-cap"], ["armor-b-cap"])
    };

    const hydrated = await hydratePlanAccount(account, plan, { maxItems: 2 });

    expect(hydrated).toBe(account);
    expect(apiMocks.getAccountItemDetail).not.toHaveBeenCalled();
  });
});

const weaponHash = 1001;
const armorHash = 2002;
const targetPlugHash = 3003;

function buildAccount(suffix: string): AccountSummary {
  const item = (hash: number, instanceId: string, groupKey: string): AccountItemSummary => ({
    hash,
    instance_id: instanceId,
    name: "测试装备",
    group_key: groupKey,
    socket_plugs: []
  });
  const armor = (key: string) => item(armorHash, `armor-${key}-${suffix}`, "armor");

  return {
    account_name: "测试账号",
    destiny_membership_id: "membership-1",
    membership_type: 3,
    characters: [{
      character_id: "character-1",
      class_name: "泰坦",
      equipped_items: [item(weaponHash, `weapon-${suffix}`, "weapons")],
      inventory_items: [armor("a"), armor("c"), armor("d")],
      postmaster_items: [armor("b")]
    }],
    vault: { item_count: 0, items: [] },
    materials: { item_count: 0, items: [] }
  } as unknown as AccountSummary;
}

function armorPlan(selectedInstanceIds: string[], plannedInstanceIds: string[]) {
  return {
    result_id: "result-1",
    candidate_id: "candidate-1",
    mode: "owned" as const,
    ruleset_id: "armor-3.0" as const,
    ruleset_version: 1,
    source_revisions: { ruleset: "1" },
    selected_instance_ids: selectedInstanceIds,
    planned_armor_plugs: plannedInstanceIds.map((instanceId) => ({
      instance_id: instanceId,
      energy_capacity: 10
    }))
  };
}

function itemDetail(instanceId: string, hash = weaponHash): AccountItemDetail {
  return {
    hash,
    instance_id: instanceId,
    name: "测试装备",
    group_key: "weapons",
    socket_plugs: [],
    sockets: [{
      socket_index: 1,
      is_visible: true,
      is_enabled: true,
      enable_fail_indexes: [],
      reusable_plugs: [{
        hash: targetPlugHash,
        name: "测试 Perk",
        can_insert: true,
        enabled: true,
        insert_fail_indexes: [],
        enable_fail_indexes: [],
        sources: []
      }]
    }]
  } as unknown as AccountItemDetail;
}
