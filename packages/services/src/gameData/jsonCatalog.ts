import { searchPerkDefinitions } from "@d2-tools/core/items/perkSearch";
import { getItemSearchResultByHash, searchItemDefinitions } from "@d2-tools/core/items/search";
import type { DefinitionComponentName } from "@d2-tools/core/manifest/definitions";
import { loadDefinitionComponent } from "../manifest/definitions.js";
import type { GameDataCatalog } from "./catalog.js";

export type JsonGameDataCatalogOptions = {
  getDataDir: () => string;
};

export function createJsonGameDataCatalog(options: JsonGameDataCatalogOptions): GameDataCatalog {
  const load = (component: DefinitionComponentName) => (
    loadDefinitionComponent(options.getDataDir(), component)
  );

  return {
    async searchItems(input) {
      const definitions = load("DestinyInventoryItemDefinition");
      if (!definitions) {
        throw new Error("请先初始化资料库");
      }

      return searchItemDefinitions(definitions, input.query, {
        limit: input.limit ?? 20,
        plugSetDefinitions: load("DestinyPlugSetDefinition") ?? undefined,
        statDefinitions: load("DestinyStatDefinition") ?? undefined,
        collectibleDefinitions: load("DestinyCollectibleDefinition") ?? undefined,
        breakerTypeDefinitions: load("DestinyBreakerTypeDefinition") ?? undefined,
        damageTypeDefinitions: load("DestinyDamageTypeDefinition") ?? undefined,
        aliases: input.aliases
      });
    },

    async searchPerks(input) {
      const perkDefinitions = load("DestinySandboxPerkDefinition");
      if (!perkDefinitions) {
        throw new Error("请先初始化资料库");
      }

      return searchPerkDefinitions(perkDefinitions, input.query, {
        limit: input.limit ?? 20,
        itemDefinitions: load("DestinyInventoryItemDefinition") ?? undefined,
        plugSetDefinitions: load("DestinyPlugSetDefinition") ?? undefined,
        aliases: input.aliases
      });
    },

    async getItemDetail(input) {
      const definitions = load("DestinyInventoryItemDefinition");
      if (!definitions) {
        throw new Error("请先初始化资料库");
      }

      return getItemSearchResultByHash(definitions, Number(input.hash), {
        plugSetDefinitions: load("DestinyPlugSetDefinition") ?? undefined,
        statDefinitions: load("DestinyStatDefinition") ?? undefined,
        collectibleDefinitions: load("DestinyCollectibleDefinition") ?? undefined,
        breakerTypeDefinitions: load("DestinyBreakerTypeDefinition") ?? undefined,
        damageTypeDefinitions: load("DestinyDamageTypeDefinition") ?? undefined,
        includeAllPerks: true
      });
    }
  };
}
