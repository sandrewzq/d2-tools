import type { DefinitionComponentData, DefinitionRecord } from "../manifest/definitions.js";

export type ItemSourceSummary = {
  status: "ready" | "missing";
  label: string;
  description: string;
  source_kind?: "item" | "collectible" | "linked_item" | "linked_collectible";
  source_hash?: number;
  linked_definition_hash?: number;
};

export type ItemSourceOptions = {
  itemDefinitions?: DefinitionComponentData;
  collectibleDefinitions?: DefinitionComponentData;
};

const missingSourceDescription = "Bungie Manifest 未提供官方来源提示。";

export function summarizeItemSource(
  definition: DefinitionRecord | undefined,
  options: ItemSourceOptions = {}
): ItemSourceSummary {
  const sourceString = cleanSourceString(definition?.sourceData?.sourceString);
  if (sourceString) {
    return createOfficialSource(sourceString, "item");
  }

  const collectibleSource = sourceFromCollectible(definition, options.collectibleDefinitions, "collectible");
  if (collectibleSource) {
    return collectibleSource;
  }

  const linkedHash = linkedItemDefinitionHash(definition);
  const linkedDefinition = linkedHash
    ? options.itemDefinitions?.[String(linkedHash)]
    : undefined;
  if (linkedDefinition) {
    const linkedItemSource = cleanSourceString(linkedDefinition.sourceData?.sourceString);
    if (linkedItemSource) {
      return createOfficialSource(linkedItemSource, "linked_item", undefined, linkedHash);
    }
    const linkedCollectibleSource = sourceFromCollectible(
      linkedDefinition,
      options.collectibleDefinitions,
      "linked_collectible",
      linkedHash
    );
    if (linkedCollectibleSource) {
      return linkedCollectibleSource;
    }
  }

  return {
    status: "missing",
    label: "官方来源提示",
    description: missingSourceDescription
  };
}

function sourceFromCollectible(
  definition: DefinitionRecord | undefined,
  collectibles: DefinitionComponentData | undefined,
  sourceKind: Extract<ItemSourceSummary["source_kind"], "collectible" | "linked_collectible">,
  linkedDefinitionHash?: number
): ItemSourceSummary | undefined {
  const collectibleHash = Number(definition?.collectibleHash ?? 0);
  const collectible = collectibleHash ? collectibles?.[String(collectibleHash)] : undefined;
  const sourceString = cleanSourceString(collectible?.sourceString);
  if (!sourceString) return undefined;

  return createOfficialSource(
    sourceString,
    sourceKind,
    Number(collectible?.sourceHash ?? 0) || undefined,
    linkedDefinitionHash
  );
}

function createOfficialSource(
  description: string,
  sourceKind: NonNullable<ItemSourceSummary["source_kind"]>,
  sourceHash?: number,
  linkedDefinitionHash?: number
): ItemSourceSummary {
  return {
    status: "ready",
    label: "官方来源提示",
    description,
    source_kind: sourceKind,
    source_hash: sourceHash,
    linked_definition_hash: linkedDefinitionHash
  };
}

function cleanSourceString(value: unknown): string {
  if (typeof value !== "string") return "";
  const source = value.trim().replace(/^(来源|source)[:：]\s*/i, "");
  if (!source || /无法从收藏品再次获取|cannot be reacquired from collections|random perks/i.test(source)) {
    return "";
  }
  return source;
}

function linkedItemDefinitionHash(definition: DefinitionRecord | undefined): number | undefined {
  const translationBlock = definition?.translationBlock;
  const candidates = [
    translationBlock?.artArrangementHash,
    ...(translationBlock?.arrangements ?? []).map((arrangement) => arrangement.artArrangementHash)
  ];

  return candidates
    .map((hash) => Number(hash ?? 0))
    .find((hash) => hash > 0 && hash !== definition?.hash);
}
