// @vitest-environment jsdom

import React from "react";
import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { usePrototypeFixtureRuntime } from "../src/fixtures/usePrototypeFixtureRuntime.js";
import { prototypeScenarios } from "../src/mock/scenarios.js";

describe("prototype vendor scenarios", () => {
  it("provides a complete multi-character Xur inventory with stable icons", () => {
    const { result } = renderHook(() => usePrototypeFixtureRuntime());
    const model = result.current.createVendorsPageModel(prototypeScenarios.ready, "");
    const xur = model.vendors.find((vendor) => vendor.vendorHash === 2190858386);

    expect(xur).toBeDefined();
    expect((xur?.items.length ?? 0) + (xur?.services ?? []).flatMap((service) => service.items).length).toBeGreaterThan(12);
    expect(xur?.iconUrl?.startsWith("data:image/svg+xml")).toBe(true);
    expect(xur?.items.every((item) => item.iconUrl?.startsWith("data:image/svg+xml"))).toBe(true);
    expect(model.scopeOptions?.filter((option) => option.kind === "character")).toHaveLength(2);
    expect(model.vendors.map((vendor) => vendor.vendorHash)).toContain(672118013);
    expect(model.vendors.find((vendor) => vendor.vendorHash === 672118013)).toMatchObject({
      name: "枪匠",
      iconUrl: expect.stringMatching(/^data:image\/svg\+xml/),
      inventoryState: "loaded"
    });
  });

  it("keeps cached offers visible when the prototype refresh fails", () => {
    const { result } = renderHook(() => usePrototypeFixtureRuntime());
    const model = result.current.createVendorsPageModel(prototypeScenarios["account-error"], "hunter-1");

    expect(model.vendors[0]?.items.length).toBeGreaterThan(0);
    expect(model.statusBanner).toEqual({
      tone: "error",
      message: "Bungie 商人刷新失败，正在显示上次成功库存。",
      live: "polite",
      busy: false
    });
  });

  it("covers first-load failure and account-unavailable fallback", () => {
    const { result } = renderHook(() => usePrototypeFixtureRuntime());
    const failed = result.current.createVendorsPageModel(prototypeScenarios["manifest-missing-components"], "hunter-1");
    const signedOut = result.current.createVendorsPageModel(prototypeScenarios["account-missing"], "hunter-1");

    expect(failed.vendors).toEqual([]);
    expect(failed.statusBanner?.tone).toBe("error");
    expect(signedOut.vendors).toEqual([]);
    expect(signedOut.recommendationCount).toBe(0);
  });

  it("changes the displayed roll when the Armorer scenario switches from A to B", () => {
    const { result } = renderHook(() => usePrototypeFixtureRuntime());
    const modA = result.current.createVendorsPageModel(prototypeScenarios.ready, "hunter-1");
    const modB = result.current.createVendorsPageModel(prototypeScenarios["update-available"], "hunter-1");

    expect(modA.selectedCharacterContext?.armorerModHash).toBe(111);
    expect(modB.selectedCharacterContext?.armorerModHash).toBe(222);
    expect(modA.vendors[0]?.items.find((item) => item.itemHash === 1002)?.stats)
      .not.toEqual(modB.vendors[0]?.items.find((item) => item.itemHash === 1002)?.stats);
  });

  it("shows a failed vendor detail without removing its base inventory", () => {
    const { result } = renderHook(() => usePrototypeFixtureRuntime());
    const scenario = (prototypeScenarios as Record<string, typeof prototypeScenarios.ready>)["vendor-partial-failure"];

    expect(scenario).toBeDefined();
    const model = result.current.createVendorsPageModel(scenario, "hunter-1");
    const banshee = model.vendors.find((vendor) => vendor.vendorHash === 672118013);

    expect(banshee).toMatchObject({
      detailState: "partial",
      displayStatusLabel: "部分详情失败",
      inventoryState: "loaded",
      detailToolbar: {
        itemCountLabel: "2 件物品"
      }
    });
  });
});
