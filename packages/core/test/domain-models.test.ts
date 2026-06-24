import { describe, expect, it } from "vitest";

import {
  createDefaultSettings,
  summarizeVaultItems,
  type VaultItemSummary
} from "../src/index";

describe("core domain models", () => {
  it("creates default settings without secrets", () => {
    const settings = createDefaultSettings("D:/data/d2-tools");

    expect(settings.dataDir).toBe("D:/data/d2-tools");
    expect(settings.bungie.apiKeyConfigured).toBe(false);
    expect(settings.ai.providerConfigured).toBe(false);
    expect(JSON.stringify(settings)).not.toContain("token");
    expect(JSON.stringify(settings)).not.toContain("secret");
  });

  it("summarizes vault items by type", () => {
    const items: VaultItemSummary[] = [
      { instanceId: "1", itemHash: 10, name: "武器 A", type: "weapon", power: 1990 },
      { instanceId: "2", itemHash: 20, name: "护甲 A", type: "armor", power: 1980 }
    ];

    expect(summarizeVaultItems(items)).toEqual({
      total: 2,
      weapons: 1,
      armor: 1,
      other: 0
    });
  });
});
