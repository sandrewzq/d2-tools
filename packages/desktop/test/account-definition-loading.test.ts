import { describe, expect, it, vi } from "vitest";
import type { DefinitionComponentData } from "@d2-tools/core/manifest/definitions";
import { loadAccountDefinitions } from "../src/main/runtime/accountDefinitions";

describe("account definition loading", () => {
  it("does not expand socket plug sets for compact snapshots", async () => {
    const query = vi.fn(async (
      component: string,
      hashes: Iterable<number>,
      _options?: { projection?: "account-snapshot" | "community-match" | "display-summary" }
    ) => {
      const requested = [...hashes];
      if (component === "DestinyInventoryItemDefinition" && requested.includes(100)) {
        return {
          "100": {
            hash: 100,
            inventory: { bucketTypeHash: 500 },
            sockets: {
              socketEntries: [{
                singleInitialItemHash: 200,
                reusablePlugSetHash: 300,
                randomizedPlugSetHash: 301,
                reusablePlugItems: [{ plugItemHash: 201 }]
              }]
            }
          }
        } satisfies DefinitionComponentData;
      }
      return {};
    });

    await loadAccountDefinitions({
      itemHashes: [100],
      bucketHashes: [],
      plugSetHashes: [],
      objectiveHashes: [],
      loadoutNameHashes: [],
      expandSocketPlugSets: false
    }, query);

    const itemRequests = query.mock.calls
      .filter(([component]) => component === "DestinyInventoryItemDefinition")
      .flatMap(([, hashes]) => [...hashes]);
    const plugSetRequests = query.mock.calls
      .filter(([component]) => component === "DestinyPlugSetDefinition")
      .flatMap(([, hashes]) => [...hashes]);
    expect(itemRequests).toEqual([100]);
    expect(plugSetRequests).toEqual([]);
    expect(query.mock.calls.every(([, , options]) => (
      options?.projection === "account-snapshot"
    ))).toBe(true);
  });

  it("expands socket relations for on-demand item details", async () => {
    const query = vi.fn(async (
      component: string,
      hashes: Iterable<number>,
      _options?: { projection?: "account-snapshot" | "community-match" | "display-summary" }
    ) => {
      const requested = [...hashes];
      if (component === "DestinyInventoryItemDefinition") {
        return Object.fromEntries(requested.map((hash) => [String(hash), hash === 100
          ? {
              hash,
              sockets: { socketEntries: [{ reusablePlugSetHash: 300 }] }
            }
          : { hash }]));
      }
      if (component === "DestinyPlugSetDefinition" && requested.includes(300)) {
        return { "300": { hash: 300, reusablePlugItems: [{ plugItemHash: 200 }] } };
      }
      return {};
    });

    const definitions = await loadAccountDefinitions({
      itemHashes: [100],
      bucketHashes: [],
      plugSetHashes: [],
      objectiveHashes: [],
      loadoutNameHashes: [],
      expandSocketPlugSets: true
    }, query);

    expect(Object.keys(definitions.itemDefinitions).map(Number).sort()).toEqual([100, 200]);
    expect(definitions.plugSetDefinitions["300"]).toBeDefined();
    expect(query.mock.calls.every(([, , options]) => options === undefined)).toBe(true);
  });
});
