// @vitest-environment jsdom

import React from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AccountSummary } from "../src/renderer/api/types.js";
import { useVendorsWorkspace } from "../src/renderer/features/vendors/useVendorsWorkspace.js";
import { useItemDetailWorkspace } from "../src/renderer/shared/hooks/useItemDetailWorkspace.js";

vi.mock("../src/renderer/api/client.js", () => ({
  api: {
    addRecentItem: vi.fn().mockResolvedValue({ items: [] }),
    getCommunityPerkRecommendations: vi.fn().mockResolvedValue(null),
    getItemDetail: vi.fn().mockResolvedValue({
      hash: 1001,
      name: "鹰月",
      description: "异域手炮",
      source: { status: "ready", label: "商人售卖", description: "仄" }
    })
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

  it("opens a vendor offer in shared item detail with its sale context", async () => {
    const { result } = renderHook(() => useItemDetailWorkspace(createWorkspaceInput()));

    await act(async () => {
      await result.current.openVendorItemDetail({
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

    expect(result.current.selectedItem).toMatchObject({
      hash: 1001,
      name: "鹰月",
      icon: "https://www.bungie.net/hawkmoon.jpg",
      item_type: "手炮，异域",
      tier: "异域"
    });
    expect(result.current.vendorContext).toEqual({
      vendorName: "仄",
      costLabel: "23 奇异硬币",
      affordabilityLabel: "可兑换",
      characterLabel: "猎人",
      refreshLabel: "刚刚刷新"
    });
  });

  it("clears vendor context when the shared detail closes", async () => {
    const { result } = renderHook(() => useItemDetailWorkspace(createWorkspaceInput()));

    await act(async () => {
      await result.current.openVendorItemDetail({
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

    act(() => result.current.closeSelectedItemDetail());

    expect(result.current.selectedItem).toBeNull();
    expect(result.current.vendorContext).toBeNull();
  });
});

describe("vendor workspace loading", () => {
  it("reloads live inventory whenever the vendor page is re-entered", async () => {
    const loadInventory = vi.fn().mockResolvedValue(createVendorSnapshot());
    const { rerender } = renderHook(
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

function createWorkspaceInput(): Parameters<typeof useItemDetailWorkspace>[0] {
  return {
    accountSummary: null,
    vaultTags: { items: {} },
    setVaultTags: vi.fn(),
    importedWishlist: null,
    localTargetRules: { rules: [] },
    diagnostics: {
      aiSettings: { enable_lightgg: false },
      setWriteActionsEnabled: vi.fn(),
      loadActionLog: vi.fn().mockResolvedValue(undefined)
    },
    setAccountError: vi.fn(),
    setIsRunningItemAction: vi.fn(),
    setItemActionMessage: vi.fn(),
    loadAccountSummary: vi.fn().mockResolvedValue(undefined),
    onRecentHistoryChanged: vi.fn()
  };
}

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
