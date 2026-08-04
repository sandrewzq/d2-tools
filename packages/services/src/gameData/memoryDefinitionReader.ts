import type {
  DefinitionComponentData,
  DefinitionComponentName
} from "@d2-tools/core/manifest/definitions";
import type { DefinitionReader } from "./definitionReader.js";
import { toUnsignedHash } from "./definitionReader.js";

export type MemoryDefinitionReaderSeed = Partial<
  Record<DefinitionComponentName, DefinitionComponentData>
>;

export function createMemoryDefinitionReader(
  seed: MemoryDefinitionReaderSeed = {}
): DefinitionReader {
  return {
    hasComponent(component) {
      return Boolean(seed[component]);
    },

    get(component, hash) {
      return seed[component]?.[String(toUnsignedHash(hash))] ?? null;
    },

    getMany(component, hashes) {
      const source = seed[component];
      if (!source) {
        return {};
      }
      const definitions: DefinitionComponentData = {};
      for (const hash of new Set([...hashes].map(toUnsignedHash))) {
        const definition = source[String(hash)];
        if (definition) {
          definitions[String(hash)] = definition;
        }
      }
      return definitions;
    },

    getAll(component) {
      return seed[component] ?? {};
    },

    close() {}
  };
}
