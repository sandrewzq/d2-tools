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
});
