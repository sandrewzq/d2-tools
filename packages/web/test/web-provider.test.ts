import { describe, expect, it } from "vitest";
import {
  createWebSnapshotProvider,
  unavailableHomeSnapshot,
  type WebHomeSnapshot
} from "../src/webAdapter";

describe("web home snapshot provider", () => {
  it("loads the home snapshot from a real source contract", async () => {
    const homeSnapshot: WebHomeSnapshot = {
      ...unavailableHomeSnapshot,
      shellStatus: [{ label: "Bungie", value: "已接入", tone: "ready" }]
    };
    const provider = createWebSnapshotProvider({
      source: {
        getHomeSnapshot: async () => homeSnapshot
      }
    });

    await expect(provider.loadHomeSnapshot()).resolves.toEqual(homeSnapshot);
  });

  it("returns an explicit unavailable state when the web source is unavailable", async () => {
    const provider = createWebSnapshotProvider({
      source: {
        getHomeSnapshot: async () => {
          throw new Error("service unavailable");
        }
      }
    });

    await expect(provider.loadHomeSnapshot()).resolves.toEqual(unavailableHomeSnapshot);
  });
});
