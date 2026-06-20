import { describe, expect, it } from "vitest";
import { resolveItemTransferCharacterId } from "./renderer/utils/itemActions";

describe("item action helpers", () => {
  it("uses the selected target character when pulling an item out of the vault", () => {
    expect(resolveItemTransferCharacterId({
      selectedCharacterId: "target-character",
      sourceCharacterId: "source-character",
      transferToVault: false
    })).toBe("target-character");
  });

  it("uses the source character when moving a character item into the vault", () => {
    expect(resolveItemTransferCharacterId({
      selectedCharacterId: "wrong-target-character",
      sourceCharacterId: "real-source-character",
      sourceKind: "inventory",
      transferToVault: true
    })).toBe("real-source-character");
  });

  it("blocks direct vault transfers for equipped items before Bungie returns a server error", () => {
    expect(() => resolveItemTransferCharacterId({
      selectedCharacterId: "target-character",
      sourceCharacterId: "real-source-character",
      sourceKind: "equipped",
      transferToVault: true
    })).toThrow("已装备的物品不能直接移入仓库");
  });

  it("fails locally when moving to vault without source character context", () => {
    expect(() => resolveItemTransferCharacterId({
      selectedCharacterId: "target-character",
      transferToVault: true
    })).toThrow("装备当前所在角色");
  });
});
