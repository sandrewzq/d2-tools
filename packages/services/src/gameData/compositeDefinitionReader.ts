import type { DefinitionComponentName } from "@d2-tools/core/manifest/definitions";
import type { DefinitionReader } from "./definitionReader.js";
import { toUnsignedHash } from "./definitionReader.js";

export function createCompositeDefinitionReader(
  primary: DefinitionReader,
  supplement: DefinitionReader
): DefinitionReader {
  return {
    hasComponent(component) {
      return primary.hasComponent(component) || supplement.hasComponent(component);
    },

    get(component, hash) {
      return primary.hasComponent(component)
        ? primary.get(component, hash)
        : supplement.get(component, hash);
    },

    getMany(component: DefinitionComponentName, hashes: Iterable<number>) {
      const requested = [...new Set([...hashes].map(toUnsignedHash))];
      if (primary.hasComponent(component)) {
        return primary.getMany(component, requested);
      }
      const primaryRecords = primary.getMany(component, requested);
      const missing = requested.filter((hash) => !primaryRecords[String(hash)]);
      if (!missing.length) {
        return primaryRecords;
      }
      return {
        ...supplement.getMany(component, missing),
        ...primaryRecords
      };
    },

    getAll(component) {
      return primary.hasComponent(component)
        ? primary.getAll(component)
        : supplement.getAll(component);
    },

    close() {
      primary.close();
      supplement.close();
    }
  };
}
