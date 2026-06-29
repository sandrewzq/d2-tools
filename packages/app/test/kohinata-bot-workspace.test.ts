import { describe, expect, it } from "vitest";
import type { AccountSummary } from "@d2-tools/core/account/summary";
import { createMemoryServices } from "@d2-tools/services";
import { createKohinataBuildGuideTask } from "../src/workspaces/kohinataBot.js";

describe("kohinata bot workspace", () => {
  it("runs guide parse, account match and draft creation as one task state", async () => {
    const services = createMemoryServices({ account });

    const result = await createKohinataBuildGuideTask(services, {
      rawText: "虚空术士\n反转手\n漏斗网",
      characterId: "char-1"
    });

    if (result.status !== "success") throw new Error(result.error.message);
    expect(result.status).toBe("success");
    expect(result.data.parse_result?.requirement.class_name?.value).toBe("术士");
    expect(result.data.match_result?.matched_items.map((item) => item.name)).toEqual(["反转手", "漏斗网"]);
    expect(result.data.draft?.items.map((item) => item.name)).toEqual(["反转手", "漏斗网"]);
    expect(result.data.next_actions).toEqual(["save_draft", "review_gaps"]);
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
