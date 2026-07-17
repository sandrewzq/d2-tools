import type { DefinitionComponentName } from "@d2-tools/core/manifest/definitions";
import {
  loadDefinitionComponent,
  loadDefinitionComponentByLanguage
} from "../manifest/definitions.js";
import type { DefinitionReader } from "./definitionReader.js";
import { toUnsignedHash } from "./definitionReader.js";

export type JsonDefinitionReaderOptions = {
  getDataDir: () => string;
  language?: string;
};

export function createJsonDefinitionReader(
  options: JsonDefinitionReaderOptions
): DefinitionReader {
  const load = (component: DefinitionComponentName) => options.language
    ? loadDefinitionComponentByLanguage(options.getDataDir(), component, options.language)
    : loadDefinitionComponent(options.getDataDir(), component);

  return {
    hasComponent(component) {
      return Boolean(load(component));
    },

    get(component, hash) {
      return load(component)?.[String(toUnsignedHash(hash))] ?? null;
    },

    getMany(component, hashes) {
      const source = load(component);
      if (!source) {
        return {};
      }
      const definitions: typeof source = {};
      for (const hash of new Set([...hashes].map(toUnsignedHash))) {
        const definition = source[String(hash)];
        if (definition) {
          definitions[String(hash)] = definition;
        }
      }
      return definitions;
    },

    close() {}
  };
}
