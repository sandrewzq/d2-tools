import { describe, expect, it, vi } from "vitest";
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

  it("并发强制账号刷新复用同一份快照请求", async () => {
    let profileRequests = 0;
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
      definitions: itemDefinitions(),
      fetchJson: async <T>(path: string) => {
        if (path === "/User/GetMembershipsForCurrentUser/") return memberships as T;
        profileRequests += 1;
        markProfileRequested();
        return profile as T;
      }
    });

    const firstRefresh = session.getSnapshot({ freshness: "refresh" });
    await profileRequested;
    const secondRefresh = session.getSnapshot({ freshness: "refresh" });
    resolveProfile(profileWithItem("item-1", false));

    await Promise.all([firstRefresh, secondRefresh]);
    expect(profileRequests).toBe(1);
  });

  it("强制读取实例详情会绕过共享 Bungie Broker 中的旧 Item 响应", async () => {
    let itemRequests = 0;
    const broker = createBungieRequestBroker({
      apiKey: "api",
      ttlMs: 60_000,
      staleMs: 60_000,
      fetchJson: async <T>(path: string) => {
        if (path.includes("/Profile/destiny-1/") && path.includes("components=900")) {
          return { profileRecords: { data: { records: {} } } } as T;
        }
        if (path.includes("/Item/item-1/")) {
          itemRequests += 1;
          return { item: { data: { itemHash: 1001 } } } as T;
        }
        throw new Error(`Unexpected request: ${path}`);
      }
    });
    const session = createAccountSession({
      apiKey: "api",
      getAccessToken: () => "access",
      fetchJson: (path, accessToken, request) => broker.fetchJson(path, accessToken, request),
      definitions: itemDefinitions()
    });
    const query = {
      destiny_membership_id: "destiny-1",
      membership_type: 3,
      instance_id: "item-1",
      item_hash: 1001
    };

    await session.getItemDetail(query);
    await session.getItemDetail(query, { freshness: "refresh" });

    expect(itemRequests).toBe(2);
  });

  it("刷新期间发生的局部 patch 不会覆盖服务器快照", async () => {
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
    expect(result.vault.items[0]?.locked).toBe(false);
    expect((await session.getSnapshot()).vault.items[0]?.locked).toBe(false);
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

  it("连续 patch 不修改账号事实，也不启动后台账号刷新", async () => {
    let profileRequests = 0;
    const session = createAccountSession({
      apiKey: "api",
      getAccessToken: () => "access",
      initialSnapshot: snapshotWithItem(false),
      definitions: itemDefinitions(),
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
    expect((await session.getSnapshot()).vault.items[0]?.locked).toBe(false);
    expect(profileRequests).toBe(0);
  });
});

/**
 * 会话身份（Bug #88）。
 *
 * 判据是「账号有没有变」，不是「token 字符串有没有变」：access token 每小时到点轮换，
 * 把它当成换账号，正在飞行中的请求会被丢弃、全部缓存被清空，界面上就报成「登录可能已失效」。
 *
 * 夹具让**会员信息请求**先挂起，这样「换 token 时确实有请求在飞」是可控的；
 * `secondRead` 保证并发那次调用已经读到新 token，再放行其余步骤，避免用微任务时序赌。
 */
type IdentityTokenValue = string | { access_token: string; account_id?: string };

function createIdentityFixture(initialToken: IdentityTokenValue) {
  const state = { value: initialToken, reads: 0 };
  let markSecondRead!: () => void;
  const secondRead = new Promise<void>((resolve) => {
    markSecondRead = resolve;
  });
  let resolveMembership!: (value: UserMembershipData) => void;
  let markMembershipRequested!: () => void;
  const membershipRequested = new Promise<void>((resolve) => {
    markMembershipRequested = resolve;
  });
  const membership = new Promise<UserMembershipData>((resolve) => {
    resolveMembership = resolve;
  });
  let resolveProfile!: (value: DestinyProfileResponse) => void;
  const profile = new Promise<DestinyProfileResponse>((resolve) => {
    resolveProfile = resolve;
  });
  const session = createAccountSession({
    apiKey: "api",
    initialSnapshot: snapshotWithItem(false),
    getAccessToken: () => {
      state.reads += 1;
      if (state.reads === 2) markSecondRead();
      return state.value;
    },
    definitions: itemDefinitions(),
    fetchJson: async <T>(path: string) => {
      if (path === "/User/GetMembershipsForCurrentUser/") {
        markMembershipRequested();
        return membership as T;
      }
      // 任务资源那条链也读 Profile，但不是这里要考的对象。
      if (path.includes("components=100,200,202,900")) return {} as T;
      return profile as T;
    }
  });
  return {
    session,
    state,
    secondRead,
    membershipRequested,
    resolveMembership: () => resolveMembership(memberships),
    resolveProfile: () => resolveProfile(profileWithItem("item-2", false))
  };
}

/** 让账号快照请求处于飞行中，此时换掉 token 并让旁路消费者读一次。 */
async function switchTokenMidFlight(
  fixture: ReturnType<typeof createIdentityFixture>,
  nextToken: IdentityTokenValue
) {
  const refresh = fixture.session.getSnapshot({ freshness: "refresh" });
  await fixture.membershipRequested;
  fixture.state.value = nextToken;
  const concurrent = fixture.session.getPursuitSummary({ freshness: "refresh" }).catch(() => undefined);
  await fixture.secondRead;
  fixture.resolveMembership();
  fixture.resolveProfile();
  return { refresh, concurrent };
}

describe("account session identity", () => {
  it("同一账号换 access token：不打断在途请求、不清缓存", async () => {
    const fixture = createIdentityFixture({ access_token: "token-1", account_id: "destiny-1" });

    const { refresh } = await switchTokenMidFlight(fixture, { access_token: "token-2", account_id: "destiny-1" });

    // 旧实现把 token 变了当成换账号，这里会抛「session changed」。
    const result = await refresh;
    expect(result.vault.items[0]?.instance_id).toBe("item-2");
  });

  it("真的换了账号：在途结果必须丢弃", async () => {
    const fixture = createIdentityFixture({ access_token: "token-1", account_id: "destiny-1" });

    const { refresh } = await switchTokenMidFlight(fixture, { access_token: "token-2", account_id: "destiny-2" });

    await expect(refresh).rejects.toThrow("Bungie account session changed while the request was running");
  });

  it("provider 不给账号身份时退回按 token 字符串判（旧调用方行为不变）", async () => {
    const fixture = createIdentityFixture("token-1");

    const { refresh } = await switchTokenMidFlight(fixture, "token-2");

    await expect(refresh).rejects.toThrow("Bungie account session changed while the request was running");
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
        group_key: "weapons",
        socket_plugs: [],
        locked
      }],
      sample_items: []
    },
    materials: { item_count: 0, items: [] }
  };
}
