import type { DefinitionRecord } from "../manifest/definitions.js";

export type ItemReleaseSummary = {
  status: "ready";
  label: "版本";
  description: string;
};

export function summarizeItemRelease(
  definition: DefinitionRecord
): ItemReleaseSummary | undefined {
  const description = (definition.traitIds ?? [])
    .map((traitId) => releaseDescriptions[traitId])
    .find(Boolean);
  if (!description) return undefined;

  return {
    status: "ready",
    label: "版本",
    description
  };
}

// Bungie 将发布标记放在物品定义的 traitIds 内，但 Trait 定义不包含这些标记的显示文本。
const releaseDescriptions: Record<string, string> = {
  "releases.v400.annual": "遗落之族（年 2，第 4 赛季）",
  "releases.v710.season": "深渊赛季（年 6，第 21 赛季）"
};
