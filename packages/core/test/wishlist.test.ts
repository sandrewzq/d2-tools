import { describe, expect, it } from "vitest";
import { evaluateWishlistRoll } from "../src/analysis/wishlist.js";
import type { AccountItemSummary } from "../src/account/summary.js";

describe("wishlist heuristic", () => {
  it("marks useful pve perk combinations as local wishlist matches", () => {
    const result = evaluateWishlistRoll(item("手炮", ["爆破专家", "萤火虫"]));

    expect(result.matched).toBe(true);
    expect(result.labels).toContain("PvE 清怪");
    expect(result.reasons.join(" ")).toContain("爆破专家");
    expect(result.disclaimer).toContain("本地启发式");
  });

  it("does not mark armor or weak rolls as wishlist matches", () => {
    expect(evaluateWishlistRoll({
      ...item("胸甲", ["机动强化"]),
      group_key: "armor"
    }).matched).toBe(false);
    expect(evaluateWishlistRoll(item("手炮", ["滑行射击"])).matched).toBe(false);
  });
});

function item(name: string, perks: string[]): AccountItemSummary {
  return {
    hash: 1,
    instance_id: name,
    name,
    group_key: "weapons",
    tier: "Legendary",
    socket_plugs: perks.map((perk, index) => ({ hash: index + 1, name: perk }))
  };
}
