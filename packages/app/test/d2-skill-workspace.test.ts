import { describe, expect, it } from "vitest";
import type { AccountSummary } from "@d2-tools/core/account/summary";
import { createMemoryServices } from "@d2-tools/services/memoryAdapter";
import { loadGuideWorkspace, matchBuildGuide } from "../src/workspaces/guideWorkspace.js";

describe("guide workspace", () => {
  it("loads account context and matches a parsed guide deterministically", async () => {
    const services = createMemoryServices({ account });

    const workspace = await loadGuideWorkspace(services);
    if (workspace.status !== "success") throw new Error(workspace.error.message);
    expect(workspace.status).toBe("success");
    expect(workspace.data.items.map((item) => item.name)).toContain("漏斗网");

    const match = await matchBuildGuide(services, {
      raw_text: "虚空术士 反转手 漏斗网",
      class_name: { value: "术士", confidence: "high" },
      subclass: { value: "虚空", confidence: "high" },
      exotic_armor: [{ name: "反转手", confidence: "high" }],
      weapons: [{ name: "漏斗网", confidence: "high", requirement: "specific" }],
      armor_stats: [],
      mods: [],
      aspects: [],
      fragments: [],
      notes: [],
      needs_confirmation: []
    }, { characterId: "char-1" });

    if (match.status !== "success") throw new Error(match.error.message);
    expect(match.status).toBe("success");
    expect(match.data.matched_items.map((item) => item.name)).toEqual(["反转手", "漏斗网"]);
  });
});

const account: AccountSummary = {
  account_name: "tester",
  destiny_membership_id: "123",
  membership_type: 1,
  characters: [
    {
      character_id: "char-1",
      class_name: "术士",
      equipped_items: [{ hash: 1, instance_id: "a", name: "反转手", item_type: "异域护臂", group_key: "armor", socket_plugs: [] }],
      equipment_groups: [],
      inventory_items: [{ hash: 2, instance_id: "b", name: "漏斗网", item_type: "冲锋枪", group_key: "weapons", socket_plugs: [] }],
      inventory_groups: [],
      postmaster_items: [],
      loadout_slots: []
    }
  ],
  vault: { item_count: 0, items: [], sample_items: [] },
  materials: { item_count: 0, items: [] }
};
