import { describe, expect, it } from "vitest";
import type { VendorInventorySnapshot } from "@d2-tools/core/vendors/inventory";
import {
  filterVendorSearchResults,
  selectVendorsPageModel
} from "../src/workspaces/vendorsPage.js";

describe("vendor snapshot workspace", () => {
  it("shows the active Ghost Armorer context and real currency affordability", () => {
    const model = selectVendorsPageModel(createInput());

    expect(model.selectedCharacterContext).toEqual({
      characterId: "hunter",
      armorerModHash: 111,
      armorerModName: "手雷护甲师",
      label: "当前机灵：手雷护甲师"
    });
    expect(model.selectedVendor?.items[0].costs).toEqual([
      expect.objectContaining({ required: 41, owned: 97, affordable: true })
    ]);
  });

  it("searches direct and service offers without changing vendor order", () => {
    const model = selectVendorsPageModel(createInput());
    const results = filterVendorSearchResults(model, {
      query: "蒙特卡洛",
      filters: model.filters
    });

    expect(results.groups[0].vendorName).toBe("仄");
    expect(results.groups[0].items[0].sourcePath).toBe("仄 → 奇异装备优惠");
  });

  it("keeps different character rolls separate in account scope", () => {
    const model = selectVendorsPageModel(createInput({ scope: { kind: "account" } }));

    expect(model.selectedCharacterContext?.label).toBe("按各角色当前机灵模组合并");
    expect(model.selectedVendor?.items.filter((item) => item.itemHash === 1001)).toHaveLength(2);
  });

  it("announces a successful Armorer-context refresh", () => {
    const model = selectVendorsPageModel({
      ...createInput(),
      statusMessage: "已按当前机灵模组更新商人属性"
    });

    expect(model.statusBanner).toEqual({
      tone: "neutral",
      message: "已按当前机灵模组更新商人属性",
      live: "polite",
      busy: false
    });
  });

  it("marks the selected vendor failed when the current character detail request fails", () => {
    const snapshot = createSnapshot();
    snapshot.failedVendorDetails = [{
      characterId: "hunter",
      vendorHash: 2190858386,
      message: "仄详情读取失败"
    }];

    const model = selectVendorsPageModel(createInput({ snapshot }));

    expect(model.selectedVendor).toMatchObject({
      detailState: "failed",
      detailFailureMessage: "仄详情读取失败",
      displayStatusLabel: "详情失败",
      railStatusLabel: "详情失败 · 2 件物品"
    });
  });

  it("marks account inventory partial when only one character detail request fails", () => {
    const snapshot = createSnapshot();
    snapshot.failedVendorDetails = [{
      characterId: "hunter",
      vendorHash: 2190858386,
      message: "猎人详情读取失败"
    }];

    const model = selectVendorsPageModel(createInput({ scope: { kind: "account" }, snapshot }));

    expect(model.selectedVendor).toMatchObject({
      detailState: "partial",
      detailFailureMessage: "1 个角色的属性与插槽详情读取失败",
      displayStatusLabel: "部分详情失败"
    });
  });

  it("announces failed character lists and vendor details without hiding cached inventory", () => {
    const snapshot = createSnapshot();
    snapshot.failedCharacterIds = ["titan"];
    snapshot.failedVendorDetails = [{
      characterId: "hunter",
      vendorHash: 2190858386,
      message: "仄详情读取失败"
    }];

    const model = selectVendorsPageModel(createInput({ snapshot }));

    expect(model.statusBanner).toEqual({
      tone: "error",
      message: "1 个角色商人列表读取失败；1 个商人详情读取失败",
      live: "polite",
      busy: false
    });
    expect(model.selectedVendor?.items).toHaveLength(1);
  });
});

function createInput(overrides: {
  scope?: { kind: "account" };
  snapshot?: VendorInventorySnapshot;
} = {}) {
  return {
    snapshot: overrides.snapshot ?? createSnapshot(),
    account: null,
    scope: overrides.scope ?? { kind: "character" as const, characterId: "hunter" },
    selectedVendorId: "vendor-2190858386",
    refreshState: "idle" as const
  };
}

function createSnapshot(): VendorInventorySnapshot {
  return {
    status: "ready",
    fetchedAt: "2026-07-12T12:00:00.000Z",
    failedCharacterIds: [],
    failedVendorDetails: [],
    currencyBalances: { "9001": 97 },
    characterContexts: {
      hunter: { characterId: "hunter", armorerModHash: 111, armorerModName: "手雷护甲师" },
      titan: { characterId: "titan", armorerModHash: 222, armorerModName: "近战护甲师" }
    },
    vendors: [
      {
        id: "vendor-2190858386",
        vendorHash: 2190858386,
        name: "仄",
        description: "九之代理人",
        nextRefreshAt: "2026-07-17T17:00:00.000Z",
        characterIds: ["hunter", "titan"],
        offers: [
          createOffer("hunter-roll", ["hunter"], 18),
          createOffer("titan-roll", ["titan"], 19)
        ],
        services: [
          {
            id: "xur-service",
            name: "奇异装备优惠",
            description: "每周优惠",
            categoryIndex: 1,
            offers: [
              {
                ...createOffer("service-roll", ["hunter", "titan"], 20),
                vendorItemIndex: 3,
                itemHash: 1004,
                name: "蒙特卡洛",
                serviceId: "xur-service"
              }
            ]
          }
        ]
      }
    ]
  };
}

function createOffer(id: string, characterIds: string[], stat: number) {
  return {
    id,
    vendorHash: 2190858386,
    vendorItemIndex: 0,
    itemHash: 1001,
    name: "鹰月",
    itemType: "手炮",
    tierType: "异域",
    characterIds,
    costs: [{ itemHash: 9001, name: "奇异硬币", quantity: 41 }],
    failureIndexes: [],
    failureMessages: [],
    saleStatus: 0,
    canPurchase: true,
    apiPurchasable: false,
    categoryIndex: 0,
    categoryName: "奇异装备",
    rollFingerprint: id,
    stats: { "2996146975": stat },
    socketPlugHashes: [7001]
  };
}
