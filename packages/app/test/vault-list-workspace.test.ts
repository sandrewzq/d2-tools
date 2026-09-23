import { describe, expect, it } from "vitest";
import { createVaultListWorkspace } from "../src/workspaces/vaultList";
import type { AccountItemSummary } from "@d2-tools/core/account/summary";
import type { LocalTargetRules } from "@d2-tools/core/analysis/targets";
import type { VaultTags } from "@d2-tools/core/vault/tags";

function item(input: Partial<AccountItemSummary> & Pick<AccountItemSummary, "hash" | "name" | "group_key" | "item_type" | "tier">): AccountItemSummary {
  return {
    bucket_name: "未识别物品",
    ...input
  };
}

describe("vault list workspace", () => {
  it("builds filtered vault results, summaries, and assistant facts in app layer", () => {
    const items = [
      item({
        hash: 100,
        instance_id: "weapon-1",
        name: "夜色手炮",
        group_key: "weapons",
        item_type: "Hand Cannon",
        tier: "Legendary",
        bucket_name: "能量武器",
        ammo_type: "primary",
        socket_plugs: [{ hash: 2001, name: "快速命中" }]
      }),
      item({
        hash: 101,
        instance_id: "armor-1",
        name: "高韧胸甲",
        group_key: "armor",
        item_type: "Chest Armor",
        tier: "Legendary",
        bucket_name: "胸甲",
        armor_stats: {
          health: 10,
          melee: 8,
          grenade: 12,
          super: 7,
          class: 6,
          weapon: 5,
          total: 48
        }
      }),
      item({
        hash: 102,
        instance_id: "ship-1",
        name: "旧飞船",
        group_key: "equipment",
        item_type: "Ship",
        tier: "Legendary",
        bucket_name: "飞船"
      })
    ];
    const tags: VaultTags = {
      items: {
        "weapon-1": { tag: "keep", note: "PVE" },
        "ship-1": { tag: "junk" }
      }
    };
    const targetRules: LocalTargetRules = {
      action_policy: "notify_only",
      armor: [{
        id: "rule-1",
        name: "高生命胸甲",
        conditions: [{ stat: "health", min: 10 }]
      }],
      weapons: []
    };

    const workspace = createVaultListWorkspace({
      items,
      filter: {
        group: "all",
        query: "tag:keep hand",
        tag: "all",
        lock: "all",
        slot: "all",
        ammo: "all",
        armorStatRules: [],
        frames: []
      },
      sortKey: "name",
      tags,
      localTargetRules: targetRules
    });

    expect(workspace.filteredItems.map((entry) => entry.name)).toEqual(["夜色手炮"]);
    expect(workspace.sections[0]?.label).toBe("能量武器");
    expect(workspace.groups.find((group) => group.key === "weapons")?.count).toBe(1);
    expect(workspace.slotFilters.some((slot) => slot.label === "能量武器")).toBe(true);
    expect(workspace.localTargetMatchCount).toBe(1);
    expect(workspace.contextFacts).toEqual([
      { kind: "group", group: "all" },
      { kind: "query_tag", tag: "keep", group: "all" },
      { kind: "query_text", text: "hand" }
    ]);
  });

  it("keeps frame candidates constrained by the active slot filter", () => {
    const items = [
      item({
        hash: 200,
        instance_id: "kinetic-weapon",
        name: "动能斥候",
        group_key: "weapons",
        item_type: "Scout Rifle",
        tier: "Legendary",
        equipment_bucket_hash: 1498876634,
        bucket_name: "动能武器",
        weapon_frame: { key: "precision", name: "精准框架" }
      }),
      item({
        hash: 201,
        instance_id: "energy-weapon",
        name: "能量手炮",
        group_key: "weapons",
        item_type: "Hand Cannon",
        tier: "Legendary",
        equipment_bucket_hash: 2465295065,
        bucket_name: "能量武器",
        weapon_frame: { key: "adaptive", name: "适配框架" }
      })
    ];

    const workspace = createVaultListWorkspace({
      items,
      filter: {
        group: "weapons",
        query: "",
        tag: "all",
        lock: "all",
        slot: "energy",
        ammo: "all",
        armorStatRules: [],
        frames: []
      },
      sortKey: "name",
      tags: { items: {} },
      localTargetRules: null
    });

    expect(workspace.availableFrameFilters.map((frame) => frame.key)).toEqual(["adaptive"]);
  });

  it("includes inline query directives in assistant facts", () => {
    const items = [
      item({
        hash: 300,
        instance_id: "locked-armor",
        name: "保留胸甲",
        group_key: "armor",
        item_type: "Chest Armor",
        tier: "Legendary",
        bucket_name: "胸甲",
        locked: true
      })
    ];

    const workspace = createVaultListWorkspace({
      items,
      filter: {
        group: "all",
        query: "tag:keep locked:true type:armor",
        tag: "all",
        lock: "all",
        slot: "all",
        ammo: "all",
        armorStatRules: [],
        frames: []
      },
      sortKey: "name",
      tags: {
        items: {
          "locked-armor": { tag: "keep" }
        }
      },
      localTargetRules: null
    });

    expect(workspace.filteredItems.map((entry) => entry.name)).toEqual(["保留胸甲"]);
    expect(workspace.contextFacts).toEqual([
      { kind: "group", group: "all" },
      { kind: "query_tag", tag: "keep", group: "all" },
      { kind: "query_locked", locked: true },
      { kind: "query_type", group: "armor" }
    ]);
  });
});
