import { DatabaseSync } from "node:sqlite";
import {
  armorStatDefinitionHashByKey,
  buildArmorRulesetFromManifest,
  type ArmorManifestRulesetBuildResult
} from "@d2-tools/core/armor";
import type { ArmorSetCatalogEntry } from "@d2-tools/core/items/equipableItemSet";
import type {
  DefinitionComponentData,
  DefinitionRecord
} from "@d2-tools/core/manifest/definitions";

export type LoadSqliteArmorRulesetOptions = {
  databasePath: string;
  manifestVersion: string;
  manifestLanguage?: string;
  rulesetVersion?: number;
};

export type ArmorPlannerManifestData = ArmorManifestRulesetBuildResult & {
  manifest_version: string;
  manifest_language?: string;
  source_revision: string;
  armor_set_catalog: ArmorSetCatalogEntry[];
};

type DefinitionRow = {
  id: number | bigint;
  json: Uint8Array | string;
};

export function loadSqliteArmorRuleset(
  options: LoadSqliteArmorRulesetOptions
): ArmorManifestRulesetBuildResult {
  const database = new DatabaseSync(options.databasePath, {
    readOnly: true,
    timeout: 5_000
  });
  try {
    database.exec("PRAGMA query_only = ON; PRAGMA temp_store = MEMORY;");
    const itemDefinitions = definitionData(database.prepare(`
      SELECT id, json
      FROM DestinyInventoryItemDefinition
      WHERE json_extract(json, '$.plug.plugCategoryIdentifier') = 'intrinsics'
    `).all() as DefinitionRow[]);
    const statHashes = Object.values(armorStatDefinitionHashByKey);
    const statDefinitions = definitionData(database.prepare(`
      SELECT id, json
      FROM DestinyStatDefinition
      WHERE id IN (${statHashes.map(() => "?").join(",")})
    `).all(...statHashes.map(toSignedHash)) as DefinitionRow[]);
    return buildArmorRulesetFromManifest({
      manifest_version: options.manifestVersion,
      manifest_language: options.manifestLanguage,
      item_definitions: itemDefinitions,
      stat_definitions: statDefinitions,
      ruleset_version: options.rulesetVersion
    });
  } finally {
    database.close();
  }
}

export function createArmorPlannerManifestData(input: {
  manifestVersion: string;
  manifestLanguage?: string;
  rulesetBuild: ArmorManifestRulesetBuildResult;
  armorSetCatalog: readonly ArmorSetCatalogEntry[];
}): ArmorPlannerManifestData {
  return {
    ...input.rulesetBuild,
    manifest_version: input.manifestVersion,
    ...(input.manifestLanguage ? { manifest_language: input.manifestLanguage } : {}),
    source_revision: [
      input.manifestVersion,
      input.rulesetBuild.ruleset.ruleset_id,
      input.rulesetBuild.ruleset.version
    ].join(":"),
    armor_set_catalog: input.armorSetCatalog.map((entry) => ({
      ...entry,
      members: entry.members.map((member) => ({ ...member })),
      ...(entry.bonuses ? { bonuses: entry.bonuses.map((bonus) => ({ ...bonus })) } : {})
    }))
  };
}

function definitionData(rows: readonly DefinitionRow[]): DefinitionComponentData {
  const definitions: DefinitionComponentData = {};
  for (const row of rows) {
    const hash = toUnsignedHash(Number(row.id));
    const definition = parseDefinition(row, hash);
    definitions[String(hash)] = definition;
  }
  return definitions;
}

function parseDefinition(row: DefinitionRow, fallbackHash: number): DefinitionRecord {
  const json = typeof row.json === "string"
    ? row.json
    : Buffer.from(row.json).toString("utf8");
  const definition = JSON.parse(json) as DefinitionRecord;
  definition.hash = toUnsignedHash(Number(definition.hash ?? fallbackHash));
  return definition;
}

function toUnsignedHash(value: number): number {
  return Number.isFinite(value) ? value >>> 0 : 0;
}

function toSignedHash(value: number): number {
  return toUnsignedHash(value) | 0;
}
