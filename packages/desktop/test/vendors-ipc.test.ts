import { describe, expect, it } from "vitest";
import type { VendorInventorySnapshot } from "@d2-tools/core/vendors/inventory";
import { resolveVendorRefreshState } from "../src/renderer/features/vendors/useVendorsWorkspace.js";

describe("vendor desktop refresh state", () => {
  it("replaces cached rolls when the Armorer context changes", () => {
    const state = resolveVendorRefreshState(snapshot(111, "roll-a"), snapshot(222, "roll-b"));

    expect(state.snapshot.characterContexts.hunter.armorerModHash).toBe(222);
    expect(state.snapshot.vendors[0].offers[0].rollFingerprint).toBe("roll-b");
    expect(state.statusMessage).toBe("已按当前机灵模组更新商人属性");
  });

  it("keeps cached inventory when refresh fails", () => {
    const cached = snapshot(111, "roll-a");
    const state = resolveVendorRefreshState(cached, null, new Error("网络失败"));

    expect(state.snapshot).toBe(cached);
    expect(state.refreshState).toBe("failed");
    expect(state.refreshError).toBe("网络失败");
  });
});

function snapshot(armorerModHash: number, rollFingerprint: string): VendorInventorySnapshot {
  return {
    status: "ready",
    fetchedAt: "2026-07-12T12:00:00.000Z",
    failedCharacterIds: [],
    failedVendorDetails: [],
    currencyBalances: {},
    characterContexts: {
      hunter: { characterId: "hunter", armorerModHash, armorerModName: `模组 ${armorerModHash}` }
    },
    vendors: [{
      id: "vendor-2190858386",
      vendorHash: 2190858386,
      name: "仄",
      description: "",
      characterIds: ["hunter"],
      services: [],
      offers: [{
        id: rollFingerprint,
        vendorHash: 2190858386,
        vendorItemIndex: 0,
        itemHash: 1001,
        name: "鹰月",
        itemType: "手炮",
        tierType: "异域",
        characterIds: ["hunter"],
        costs: [],
        failureIndexes: [],
        failureMessages: [],
        saleStatus: 0,
        canPurchase: true,
        apiPurchasable: false,
        categoryIndex: 0,
        categoryName: "奇异装备",
        rollFingerprint,
        stats: {},
        socketPlugHashes: []
      }]
    }]
  };
}
