import { describe, expect, it } from "vitest";
import { scoreVaultItem, summarizeVaultScores } from "../src/analysis/scoring.js";
import type { AccountItemSummary } from "../src/account/summary.js";
import type { VaultTags } from "../src/vault/tags.js";

describe("vault scoring", () => {
  it("scores locked exotic weapons with real rolls as keep candidates", () => {
    const result = scoreVaultItem(item({
      instance_id: "weapon-1",
      name: "Riskrunner",
      group_key: "weapons",
      tier: "Exotic",
      locked: true,
      socket_plugs: [{ hash: 1, name: "Voltshot" }]
    }), tags({ "weapon-1": "keep" }));

    expect(result.grade).toBe("keep");
    expect(result.score).toBeGreaterThanOrEqual(85);
    expect(result.reasons).toContain("本地标记为保留");
    expect(result.reasons).toContain("异域装备");
    expect(result.reasons).toContain("已锁定");
    expect(result.reasons).toContain("已读取实际 roll");
  });

  it("keeps untagged legendary rolled weapons in review instead of junk", () => {
    const result = scoreVaultItem(item({
      instance_id: "weapon-2",
      name: "Legendary Pulse",
      group_key: "weapons",
      tier: "Legendary",
      socket_plugs: [{ hash: 2, name: "Kill Clip" }]
    }), tags({}));

    expect(result.grade).toBe("review");
    expect(result.reasons).toContain("传说武器");
    expect(result.warnings).toContain("未做本地标记，建议人工复查");
  });

  it("allows user junk tags to drive low-value items into junk", () => {
    const result = scoreVaultItem(item({
      instance_id: "ship-1",
      name: "Old Ship",
      group_key: "equipment",
      tier: "Legendary",
      socket_plugs: []
    }), tags({ "ship-1": "junk" }));

    expect(result.grade).toBe("junk");
    expect(result.score).toBeLessThan(40);
    expect(result.reasons).toContain("本地标记为可清理");
  });

  it("summarizes scored vault counts and top review items", () => {
    const summary = summarizeVaultScores([
      item({ instance_id: "a", name: "A", group_key: "weapons", tier: "Exotic", locked: true }),
      item({ instance_id: "b", name: "B", group_key: "armor", tier: "Legendary" }),
      item({ instance_id: "c", name: "C", group_key: "equipment", tier: "Legendary" })
    ], tags({ c: "junk" }));

    expect(summary.counts).toEqual({ keep: 1, review: 1, junk: 1 });
    expect(summary.top_review.map((entry) => entry.name)).toEqual(["B"]);
  });
});

function item(overrides: Partial<AccountItemSummary>): AccountItemSummary {
  return {
    hash: 1,
    name: "Item",
    group_key: "other",
    socket_plugs: [],
    ...overrides
  };
}

function tags(entries: Record<string, "keep" | "review" | "junk">): VaultTags {
  return {
    items: Object.fromEntries(
      Object.entries(entries).map(([key, tag]) => [key, { tag }])
    )
  };
}
