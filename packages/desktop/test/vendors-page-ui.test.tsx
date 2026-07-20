// @vitest-environment jsdom

import React from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AccountSummary } from "../src/renderer/api/types.js";
import { useVendorDefinitionDetail } from "../src/renderer/features/vendors/useVendorDefinitionDetail.js";
import { useVendorsWorkspace } from "../src/renderer/features/vendors/useVendorsWorkspace.js";

vi.mock("../src/renderer/api/client.js", () => ({
  api: {
    addRecentItem: vi.fn().mockResolvedValue({ items: [] }),
    getItemDetail: vi.fn().mockResolvedValue({
      hash: 2002,
      name: "鹰月",
      description: "资料库规范化的异域手炮定义",
      group_key: "weapons",
      intrinsic_traits: [],
      source: { status: "ready", label: "资料库来源", description: "规范定义" }
    }),
    getLiveItemAvailability: vi.fn().mockResolvedValue({ items: {} }),
    matchCommunityVaultItems: vi.fn().mockResolvedValue([]),
    getCommunityPerkRecommendations: vi.fn().mockResolvedValue(null),
    getPersonalWeaponKnowledge: vi.fn().mockResolvedValue({ entries: [] }),
    searchItems: vi.fn().mockResolvedValue([{
      hash: 2002,
      name: "鹰月",
      description: "资料库规范化的异域手炮定义",
      group_key: "weapons",
      intrinsic_traits: [],
      source: { status: "ready", label: "资料库来源", description: "规范定义" }
    }])
  }
}));

vi.mock("../src/renderer/api/services.js", () => ({
  services: {
    localData: {}
  }
}));

describe("vendor item detail wiring", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("opens a vendor offer as a library definition with its sale context", async () => {
    const { result } = renderHook(() => useVendorDefinitionDetail());

    await act(async () => {
      await result.current.open({
        id: "xur-hawkmoon",
        itemHash: 1001,
        name: "鹰月",
        itemType: "手炮，异域",
        summary: "当前角色商人库存",
        cost: "23 奇异硬币",
        iconLabel: "鹰",
        iconUrl: "https://www.bungie.net/hawkmoon.jpg",
        tone: "exotic",
        status: "unknown"
      }, {
        vendorName: "仄",
        costLabel: "23 奇异硬币",
        affordabilityLabel: "可兑换",
        characterLabel: "猎人",
        refreshLabel: "刚刚刷新"
      });
    });

    expect(result.current.state?.item).toMatchObject({
      hash: 2002,
      name: "鹰月",
      description: "资料库规范化的异域手炮定义",
      group_key: "weapons"
    });
    expect(result.current.state?.context).toEqual({
      vendorName: "仄",
      costLabel: "23 奇异硬币",
      affordabilityLabel: "可兑换",
      characterLabel: "猎人",
      refreshLabel: "刚刚刷新"
    });
  });

  it("clears the vendor definition detail when it closes", async () => {
    const { result } = renderHook(() => useVendorDefinitionDetail());

    await act(async () => {
      await result.current.open({
        id: "xur-hawkmoon",
        itemHash: 1001,
        name: "鹰月",
        itemType: "手炮，异域",
        summary: "当前角色商人库存",
        iconLabel: "鹰",
        tone: "exotic",
        status: "unknown"
      }, {
        vendorName: "仄",
        costLabel: "23 奇异硬币",
        affordabilityLabel: "可兑换",
        characterLabel: "猎人",
        refreshLabel: "刚刚刷新"
      });
    });

    act(() => result.current.close());

    expect(result.current.state).toBeNull();
  });
});

describe("vendor workspace loading", () => {
  it("defers live inventory until entry and does not reload on menu re-entry", async () => {
    const loadInventory = vi.fn().mockResolvedValue(createVendorSnapshot());
    const { rerender } = renderHook(
      ({ active }) => useVendorsWorkspace({
        accountSummary: createAccountSummary("membership-a"),
        selectedCharacterId: "hunter",
        active,
        loadInventory
      }),
      { initialProps: { active: false } }
    );

    expect(loadInventory).not.toHaveBeenCalled();
    rerender({ active: false });
    expect(loadInventory).not.toHaveBeenCalled();
    rerender({ active: true });

    await waitFor(() => expect(loadInventory).toHaveBeenCalledTimes(1));
    expect(loadInventory.mock.calls[0]?.[0].detail_vendor_hashes).toEqual([]);
  });

  it("retries the base inventory when re-entering before the first request completes", async () => {
    const firstRequest = createDeferred<ReturnType<typeof createVendorSnapshot>>();
    const loadInventory = vi.fn()
      .mockImplementationOnce(() => firstRequest.promise)
      .mockResolvedValueOnce(createVendorSnapshot("2026-07-12T13:00:00.000Z"));
    const { result, rerender } = renderHook(
      ({ active }) => useVendorsWorkspace({
        accountSummary: createAccountSummary("membership-a"),
        selectedCharacterId: "hunter",
        active,
        loadInventory
      }),
      { initialProps: { active: true } }
    );

    await waitFor(() => expect(loadInventory).toHaveBeenCalledTimes(1));
    rerender({ active: false });
    rerender({ active: true });

    await waitFor(() => expect(loadInventory).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(result.current.model.updatedLabel).toBe("更新：2026-07-12T13:00:00.000Z"));

    await act(async () => firstRequest.resolve(createVendorSnapshot("2026-07-12T11:00:00.000Z")));
    expect(result.current.model.updatedLabel).toBe("更新：2026-07-12T13:00:00.000Z");
  });

  it("loads only the selected vendor detail after the base inventory arrives", async () => {
    const baseSnapshot = {
      ...createVendorSnapshot(),
      detailVendorHashes: [],
      vendors: [{
        id: "vendor-2190858386",
        vendorHash: 2190858386,
        name: "仄",
        description: "九之代理人",
        characterIds: ["hunter"],
        offers: [],
        services: []
      }]
    };
    const loadInventory = vi.fn()
      .mockResolvedValueOnce(baseSnapshot)
      .mockResolvedValueOnce({ ...baseSnapshot, detailVendorHashes: [2190858386] });

    renderHook(() => useVendorsWorkspace({
      accountSummary: createAccountSummary("membership-a"),
      selectedCharacterId: "hunter",
      active: true,
      loadInventory
    }));

    await waitFor(() => expect(loadInventory).toHaveBeenCalledTimes(2));
    expect(loadInventory.mock.calls[0]?.[0].detail_vendor_hashes).toEqual([]);
    expect(loadInventory.mock.calls[1]?.[0].detail_vendor_hashes).toEqual([2190858386]);
  });

  it("requests only the selected character and reloads when the selection changes", async () => {
    const loadInventory = vi.fn().mockResolvedValue(createVendorSnapshot());
    const account = {
      ...createAccountSummary("membership-a"),
      characters: [
        { character_id: "warlock", class_name: "术士" },
        { character_id: "titan", class_name: "泰坦" }
      ]
    } as AccountSummary;
    const { rerender } = renderHook(
      ({ selectedCharacterId }) => useVendorsWorkspace({
        accountSummary: account,
        selectedCharacterId,
        active: true,
        loadInventory
      }),
      { initialProps: { selectedCharacterId: "warlock" } }
    );

    await waitFor(() => expect(loadInventory).toHaveBeenCalledTimes(1));
    expect(loadInventory.mock.calls[0]?.[0].character_ids).toEqual(["warlock"]);

    rerender({ selectedCharacterId: "titan" });

    await waitFor(() => expect(loadInventory).toHaveBeenCalledTimes(2));
    expect(loadInventory.mock.calls[1]?.[0].character_ids).toEqual(["titan"]);
  });

  it("reloads and replaces cache when the active Bungie account changes", async () => {
    const loadInventory = vi.fn().mockResolvedValue(createVendorSnapshot());
    const { rerender } = renderHook(
      ({ account }) => useVendorsWorkspace({
        accountSummary: account,
        selectedCharacterId: "hunter",
        active: true,
        loadInventory
      }),
      { initialProps: { account: createAccountSummary("membership-a") } }
    );

    await waitFor(() => expect(loadInventory).toHaveBeenCalledTimes(1));
    rerender({ account: createAccountSummary("membership-b") });

    await waitFor(() => expect(loadInventory).toHaveBeenCalledTimes(2));
    expect(loadInventory.mock.calls[1]?.[0].membership_id).toBe("membership-b");
  });

  it("does not restore the previous account snapshot when the new account load fails", async () => {
    const loadInventory = vi.fn()
      .mockResolvedValueOnce(createVendorSnapshot("2026-07-12T12:00:00.000Z"))
      .mockRejectedValueOnce(new Error("新账号商人数据读取失败"));
    const { result, rerender } = renderHook(
      ({ account }) => useVendorsWorkspace({
        accountSummary: account,
        selectedCharacterId: "hunter",
        active: true,
        loadInventory
      }),
      { initialProps: { account: createAccountSummary("membership-a") } }
    );

    await waitFor(() => expect(result.current.model.updatedLabel).toBe("更新：2026-07-12T12:00:00.000Z"));
    rerender({ account: createAccountSummary("membership-b") });

    await waitFor(() => expect(result.current.model.statusBanner?.message).toBe("新账号商人数据读取失败"));
    expect(result.current.model.updatedLabel).toBe("等待商人数据");
    expect(result.current.model.selectedCharacterContext).toBeNull();
  });

  it("ignores a previous account response that arrives after the current account", async () => {
    const accountARequest = createDeferred<ReturnType<typeof createVendorSnapshot>>();
    const accountBRequest = createDeferred<ReturnType<typeof createVendorSnapshot>>();
    const loadInventory = vi.fn()
      .mockImplementationOnce(() => accountARequest.promise)
      .mockImplementationOnce(() => accountBRequest.promise);
    const { result, rerender } = renderHook(
      ({ account }) => useVendorsWorkspace({
        accountSummary: account,
        selectedCharacterId: "hunter",
        active: true,
        loadInventory
      }),
      { initialProps: { account: createAccountSummary("membership-a") } }
    );

    await waitFor(() => expect(loadInventory).toHaveBeenCalledTimes(1));
    rerender({ account: createAccountSummary("membership-b") });
    await waitFor(() => expect(loadInventory).toHaveBeenCalledTimes(2));

    await act(async () => accountBRequest.resolve(createVendorSnapshot("2026-07-12T13:00:00.000Z")));
    await waitFor(() => expect(result.current.model.updatedLabel).toBe("更新：2026-07-12T13:00:00.000Z"));

    await act(async () => accountARequest.resolve(createVendorSnapshot("2026-07-12T11:00:00.000Z")));
    expect(result.current.model.updatedLabel).toBe("更新：2026-07-12T13:00:00.000Z");
  });

  it("clears inventory and ignores pending responses when the account is removed", async () => {
    const pendingRequest = createDeferred<ReturnType<typeof createVendorSnapshot>>();
    const loadInventory = vi.fn(() => pendingRequest.promise);
    const { result, rerender } = renderHook(
      ({ account }: { account: AccountSummary | null }) => useVendorsWorkspace({
        accountSummary: account,
        selectedCharacterId: "hunter",
        active: true,
        loadInventory
      }),
      { initialProps: { account: createAccountSummary("membership-a") as AccountSummary | null } }
    );

    await waitFor(() => expect(loadInventory).toHaveBeenCalledTimes(1));
    rerender({ account: null });
    await act(async () => pendingRequest.resolve(createVendorSnapshot()));

    expect(result.current.model.updatedLabel).toBe("等待商人数据");
    expect(result.current.model.selectedCharacterContext).toBeNull();
  });
});

function createAccountSummary(membershipId: string): AccountSummary {
  return {
    account_name: membershipId,
    destiny_membership_id: membershipId,
    membership_type: 3,
    characters: [{ character_id: "hunter", class_name: "猎人" }],
    vault: { item_count: 0, items: [], sample_items: [] },
    materials: { item_count: 0, items: [] }
  } as AccountSummary;
}

function createVendorSnapshot(fetchedAt = "2026-07-12T12:00:00.000Z") {
  return {
    status: "ready" as const,
    fetchedAt,
    failedCharacterIds: [],
    failedVendorDetails: [],
    currencyBalances: {},
    characterContexts: {
      hunter: { characterId: "hunter", armorerModHash: 111, armorerModName: "机动护甲模组" }
    },
    vendors: []
  };
}

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}
