import { describe, expect, it } from "vitest";
import { createBungieRequestBroker } from "../src/bungie/session.js";

describe("Bungie request broker", () => {
  it("Profile 组件超集缓存可复用于后续子集请求", async () => {
    const requested: string[] = [];
    const broker = createBungieRequestBroker({
      apiKey: "api",
      fetchJson: async <T>(path: string) => {
        requested.push(path);
        return { generation: requested.length } as T;
      }
    });
    const superset = "/Destiny2/3/Profile/destiny-1/?components=100,200,305";
    const subset = "/Destiny2/3/Profile/destiny-1/?components=200,305";

    const first = await broker.fetchJson<{ generation: number }>(superset, "access");
    const second = await broker.fetchJson<{ generation: number }>(subset, "access");

    expect(first.generation).toBe(1);
    expect(second.generation).toBe(1);
    expect(requested).toEqual([superset]);
  });

  it("Profile 子集缓存不能冒充超集响应", async () => {
    const requested: string[] = [];
    const broker = createBungieRequestBroker({
      apiKey: "api",
      fetchJson: async <T>(path: string) => {
        requested.push(path);
        return { path } as T;
      }
    });
    const subset = "/Destiny2/3/Profile/destiny-1/?components=200";
    const superset = "/Destiny2/3/Profile/destiny-1/?components=100,200";

    await broker.fetchJson(subset, "access");
    await broker.fetchJson(superset, "access");

    expect(requested).toEqual([subset, superset]);
  });

  it("显式后台检查会等待过期缓存刷新完成", async () => {
    let now = 0;
    let generation = 0;
    const broker = createBungieRequestBroker({
      apiKey: "api",
      now: () => now,
      ttlMs: 10,
      staleMs: 1_000,
      fetchJson: async <T>() => ({ generation: ++generation }) as T
    });
    const path = "/Destiny2/3/Profile/destiny-1/Character/hunter/Vendors/?components=400,401,402,600";

    await expect(broker.fetchJson<{ generation: number }>(path, "access"))
      .resolves.toEqual({ generation: 1 });
    now = 20;
    await expect(broker.fetchJson<{ generation: number }>(path, "access", { waitForRefresh: true }))
      .resolves.toEqual({ generation: 2 });
  });

  it("显式后台检查复用 Profile 超集时也会等待刷新完成", async () => {
    let now = 0;
    let generation = 0;
    const broker = createBungieRequestBroker({
      apiKey: "api",
      now: () => now,
      ttlMs: 10,
      staleMs: 1_000,
      fetchJson: async <T>() => ({ generation: ++generation }) as T
    });
    const superset = "/Destiny2/3/Profile/destiny-1/?components=100,205,305";
    const subset = "/Destiny2/3/Profile/destiny-1/?components=205,305";

    await expect(broker.fetchJson<{ generation: number }>(superset, "access"))
      .resolves.toEqual({ generation: 1 });
    now = 20;
    await expect(broker.fetchJson<{ generation: number }>(subset, "access", { waitForRefresh: true }))
      .resolves.toEqual({ generation: 2 });
  });
});
