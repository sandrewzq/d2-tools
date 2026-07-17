import { afterEach, describe, expect, it, vi } from "vitest";
import type {
  AccountSnapshot,
  DestinyProfileResponse,
  UserMembershipData
} from "@d2-tools/core/account/summary";
import { createAccountSession } from "../src/account/session.js";
import { createBungieRequestBroker } from "../src/bungie/session.js";

const memberships: UserMembershipData = {
  bungieNetUser: { displayName: "Guardian" },
  primaryMembershipId: "destiny-1",
  destinyMemberships: [{ membershipId: "destiny-1", membershipType: 3 }]
};

afterEach(() => {
  vi.useRealTimers();
});

describe("account session", () => {
  it("立即返回持久化快照，不等待 access token 或后台刷新", async () => {
    let resolveToken!: (value: string) => void;
    const token = new Promise<string>((resolve) => {
      resolveToken = resolve;
    });
    const initialSnapshot = snapshotWithItem(false);
    const session = createAccountSession({
      apiKey: "api-key",
      initialSnapshot,
      getAccessToken: () => token,
      fetchJson: async () => {
        throw new Error("background refresh should remain pending");
      }
    });

    await expect(session.getSnapshot({ freshness: "cached" })).resolves.toBe(initialSnapshot);
    resolveToken("access-token");
  });

  it("强制刷新会绕过共享 Bungie Broker 中的旧 Profile", async () => {
    let profileGeneration = 1;
    let profileRequests = 0;
    const broker = createBungieRequestBroker({
      apiKey: "api",
      ttlMs: 60_000,
      staleMs: 60_000,
      fetchJson: async <T>(path: string) => {
        if (path === "/User/GetMembershipsForCurrentUser/") return memberships as T;
        profileRequests += 1;
        return profileWithItem(`item-${profileGeneration}`, false) as T;
      }
    });
    const session = createAccountSession({
      apiKey: "api",
      getAccessToken: () => "access",
      fetchJson: (path, accessToken, request) => broker.fetchJson(path, accessToken, request),
      definitions: itemDefinitions()
    });

    const first = await session.getSnapshot({ freshness: "refresh" });
    profileGeneration = 2;
    const refreshed = await session.getSnapshot({ freshness: "refresh" });

    expect(first.vault.items[0]?.instance_id).toBe("item-1");
    expect(refreshed.vault.items[0]?.instance_id).toBe("item-2");
    expect(profileRequests).toBe(2);
  });

  it("刷新期间发生的局部 patch 不会被旧请求结果覆盖", async () => {
    const initialSnapshot = snapshotWithItem(false);
    let resolveProfile!: (profile: DestinyProfileResponse) => void;
    let markProfileRequested!: () => void;
    const profileRequested = new Promise<void>((resolve) => {
      markProfileRequested = resolve;
    });
    const profile = new Promise<DestinyProfileResponse>((resolve) => {
      resolveProfile = resolve;
    });
    const session = createAccountSession({
      apiKey: "api",
      getAccessToken: () => "access",
      initialSnapshot,
      definitions: itemDefinitions(),
      fetchJson: async <T>(path: string) => {
        if (path === "/User/GetMembershipsForCurrentUser/") return memberships as T;
        markProfileRequested();
        return profile as T;
      }
    });

    const refresh = session.getSnapshot({ freshness: "refresh" });
    await profileRequested;
    session.patch({ kind: "lock", item_instance_id: "item-1", locked: true });
    resolveProfile(profileWithItem("item-1", false));

    const result = await refresh;
    expect(result.vault.items[0]?.locked).toBe(true);
    expect((await session.getSnapshot()).vault.items[0]?.locked).toBe(true);
  });

  it("快照只加载当前已选 plug 定义，不展开 reusable plug pool", async () => {
    let requestedItemHashes: number[] = [];
    const session = createAccountSession({
      apiKey: "api",
      getAccessToken: () => "access",
      fetchJson: async <T>(path: string) => {
        if (path === "/User/GetMembershipsForCurrentUser/") return memberships as T;
        return profileWithPlugPools() as T;
      },
      loadDefinitions: (request) => {
        requestedItemHashes = request.itemHashes;
        return itemDefinitions();
      }
    });

    await session.getSnapshot({ freshness: "refresh" });

    expect(requestedItemHashes).toEqual(expect.arrayContaining([1001, 4001]));
    expect(requestedItemHashes).not.toEqual(expect.arrayContaining([4002, 4003]));
  });

  it("连续 patch 只安排一次后台强制 revalidate", async () => {
    vi.useFakeTimers();
    let profileRequests = 0;
    const session = createAccountSession({
      apiKey: "api",
      getAccessToken: () => "access",
      initialSnapshot: snapshotWithItem(false),
      definitions: itemDefinitions(),
      patchRevalidateDelayMs: 100,
      fetchJson: async <T>(path: string) => {
        if (path === "/User/GetMembershipsForCurrentUser/") return memberships as T;
        profileRequests += 1;
        return profileWithItem("item-1", true) as T;
      }
    });

    session.patch({ kind: "lock", item_instance_id: "item-1", locked: true });
    session.patch({ kind: "lock", item_instance_id: "item-1", locked: false });
    session.patch({ kind: "lock", item_instance_id: "item-1", locked: true });
    expect(profileRequests).toBe(0);

    await vi.advanceTimersByTimeAsync(100);

    expect(profileRequests).toBe(1);
    expect((await session.getSnapshot()).vault.items[0]?.locked).toBe(true);
  });

  it("后台 revalidate 返回旧状态时保留尚未确认的乐观 patch", async () => {
    vi.useFakeTimers();
    const session = createAccountSession({
      apiKey: "api",
      getAccessToken: () => "access",
      initialSnapshot: snapshotWithItem(false),
      definitions: itemDefinitions(),
      patchRevalidateDelayMs: 50,
      fetchJson: async <T>(path: string) => {
        if (path === "/User/GetMembershipsForCurrentUser/") return memberships as T;
        return profileWithItem("item-1", false) as T;
      }
    });

    session.patch({ kind: "lock", item_instance_id: "item-1", locked: true });
    await vi.advanceTimersByTimeAsync(50);

    expect((await session.getSnapshot()).vault.items[0]?.locked).toBe(true);
  });
});

function itemDefinitions() {
  return {
    itemDefinitions: {
      "1001": {
        hash: 1001,
        displayProperties: { name: "Test Item" },
        itemTypeDisplayName: "Weapon",
        inventory: { tierTypeName: "Legendary", bucketTypeHash: 2465295065 }
      }
    }
  };
}

function profileWithItem(instanceId: string, locked: boolean): DestinyProfileResponse {
  return {
    profileInventory: {
      data: {
        items: [{ itemHash: 1001, itemInstanceId: instanceId, state: locked ? 1 : 0 }]
      }
    }
  };
}

function profileWithPlugPools(): DestinyProfileResponse {
  return {
    profileInventory: {
      data: { items: [{ itemHash: 1001, itemInstanceId: "item-1" }] }
    },
    itemComponents: {
      sockets: {
        data: { "item-1": { sockets: [{ plugHash: 4001, isVisible: true }] } }
      },
      reusablePlugs: {
        data: {
          "item-1": {
            plugs: { "0": [{ plugItemHash: 4002 }] }
          }
        }
      }
    },
    profilePlugSets: {
      data: { plugs: { "99": [{ plugItemHash: 4003 }] } }
    }
  };
}

function snapshotWithItem(locked: boolean): AccountSnapshot {
  return {
    account_name: "Guardian",
    destiny_membership_id: "destiny-1",
    membership_type: 3,
    characters: [],
    vault: {
      item_count: 1,
      items: [{
        hash: 1001,
        instance_id: "item-1",
        name: "Test Item",
        locked
      }],
      sample_items: []
    },
    materials: { item_count: 0, items: [] }
  };
}
