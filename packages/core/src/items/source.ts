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

const sourceLabel = "历史获取途径";
const missingSourceDescription = "Bungie 官方资料没有标注这件装备的历史获取途径。";

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
    label: sourceLabel,
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
    label: sourceLabel,
    description: describeOfficialSource(description),
    source_kind: sourceKind,
    source_hash: sourceHash,
    linked_definition_hash: linkedDefinitionHash
  };
}

function describeOfficialSource(description: string): string {
  const source = description.trim().replace(/[。；;]+$/, "");
  const sourceName = source.replace(/^[“”‘’"']+|[“”‘’"']+$/g, "");
  const isShortSourceName = sourceName.length <= 12
    && !/[，。；;：:]/.test(sourceName)
    && !/(获取|完成|掉落|奖励|购买|商人|任务|突袭|地牢|活动|试炼|竞技|锻造|解锁|战役|里程碑)/.test(sourceName);
  if (isShortSourceName) {
    return `Bungie 官方资料将这件装备标记为来自“${sourceName}”相关活动或内容。这只说明历史归属，不代表“${sourceName}”当前正在开放。`;
  }
  return `Bungie 官方资料记录的获取途径：${source}。这只说明历史来源，不代表当前仍可获得。`;
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
