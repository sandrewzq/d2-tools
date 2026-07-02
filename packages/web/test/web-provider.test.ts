import { describe, expect, it } from "vitest";
import type { ShellPageKey } from "@d2-tools/ui";
import {
  createWebSnapshotProvider,
  fallbackHomeSnapshot,
  type WebHomeSnapshot,
  type WebPageSnapshot
} from "../src/webAdapter";

describe("web snapshot provider", () => {
  it("loads home and page snapshots from a real source contract", async () => {
    const homeSnapshot: WebHomeSnapshot = {
      ...fallbackHomeSnapshot,
      shellStatus: [{ label: "Bungie", value: "已接入", tone: "ready" }]
    };
    const pageSnapshot: WebPageSnapshot = {
      page: "account",
      payload: { status: "ready" },
      updatedAt: "2026-07-02T10:00:00.000Z"
    };
    const provider = createWebSnapshotProvider({
      source: {
        getHomeSnapshot: async () => homeSnapshot,
        getPageSnapshot: async (page: ShellPageKey) => page === "account" ? pageSnapshot : null
      }
    });

    await expect(provider.loadHomeSnapshot()).resolves.toEqual(homeSnapshot);
    await expect(provider.loadPageSnapshot("account")).resolves.toEqual(pageSnapshot);
    await expect(provider.loadPageSnapshot("vault")).resolves.toBeNull();
  });

  it("falls back quietly when the web source is unavailable", async () => {
    const provider = createWebSnapshotProvider({
      source: {
        getHomeSnapshot: async () => {
          throw new Error("service unavailable");
        },
        getPageSnapshot: async () => {
          throw new Error("service unavailable");
        }
      }
    });

    await expect(provider.loadHomeSnapshot()).resolves.toEqual(fallbackHomeSnapshot);
    await expect(provider.loadPageSnapshot("home")).resolves.toBeNull();
  });
});
