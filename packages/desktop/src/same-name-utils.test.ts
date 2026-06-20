import { describe, expect, it } from "vitest";
import { buildSameNameSourceStats } from "./renderer/utils/sameName";

describe("same-name source stats", () => {
  it("counts equipped, inventory, vault, and postmaster copies separately", () => {
    expect(buildSameNameSourceStats([
      { source_kind: "equipped" },
      { source_kind: "equipped" },
      { source_kind: "inventory" },
      { source_kind: "vault" },
      { source_kind: "postmaster" }
    ])).toEqual({
      total: 5,
      equipped: 2,
      inventory: 1,
      vault: 1,
      postmaster: 1
    });
  });
});
