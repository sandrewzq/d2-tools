import { describe, expect, it } from "vitest";
import {
  buildItemDecision,
  summarizeItemDecision
} from "../src/evidence/itemDecision";

describe("item decision evidence", () => {
  it("protects locked, wishlist and local-target items from cleanup", () => {
    const decision = buildItemDecision({
      itemKey: "item-1",
      itemName: "不胜即亡",
      locked: true,
      localTag: "junk",
      wishlistMatched: true,
      localTargetMatched: true,
      duplicateCount: 4
    });

    expect(decision.decision).toBe("keep");
    expect(decision.confidence).toBe("confirmed");
    expect(decision.reasons.map((reason) => reason.source.kind)).toEqual(
      expect.arrayContaining(["account", "dim_wishlist", "local_target", "user_tag"])
    );
    expect(decision.protected).toBe(true);
    expect(summarizeItemDecision(decision)).toContain("必留");
    expect(summarizeItemDecision(decision)).toContain("DIM 愿望单");
  });

  it("marks repeated unknown items as cleanup candidates without pretending the result is confirmed", () => {
    const decision = buildItemDecision({
      itemKey: "item-2",
      itemName: "忠侍左轮",
      duplicateCount: 6,
      localTag: "none"
    });

    expect(decision.decision).toBe("cleanup_candidate");
    expect(decision.confidence).toBe("partial");
    expect(decision.protected).toBe(false);
    expect(decision.reasons.some((reason) => reason.source.kind === "heuristic")).toBe(true);
  });
});
