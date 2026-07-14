import { describe, expect, it } from "vitest";
import {
  createWebSnapshotProvider,
  fallbackHomeSnapshot,
  type WebHomeSnapshot
} from "../src/webAdapter";

describe("web home snapshot provider", () => {
  it("loads the home snapshot from a real source contract", async () => {
    const homeSnapshot: WebHomeSnapshot = {
      ...fallbackHomeSnapshot,
      shellStatus: [{ label: "Bungie", value: "已接入", tone: "ready" }]
    };
    const provider = createWebSnapshotProvider({
      source: {
        getHomeSnapshot: async () => homeSnapshot
      }
    });

    await expect(provider.loadHomeSnapshot()).resolves.toEqual(homeSnapshot);
  });

  it("falls back quietly when the web source is unavailable", async () => {
    const provider = createWebSnapshotProvider({
      source: {
        getHomeSnapshot: async () => {
          throw new Error("service unavailable");
        }
      }
    });

    await expect(provider.loadHomeSnapshot()).resolves.toEqual(fallbackHomeSnapshot);
  });
});
