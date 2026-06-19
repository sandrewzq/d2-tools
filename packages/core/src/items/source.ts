import type { DefinitionRecord } from "../manifest/definitions.js";

export type ItemSourceSummary = {
  status: "ready" | "missing";
  label: string;
  description: string;
};

const missingSourceDescription = "Bungie Manifest 未提供完整来源，后续再接入更细的数据源。";

export function summarizeItemSource(definition: DefinitionRecord | undefined): ItemSourceSummary {
  const sourceString = readSourceString(definition);
  if (sourceString) {
    return {
      status: "ready",
      label: "来源",
      description: sourceString
    };
  }

  return {
    status: "missing",
    label: "来源",
    description: missingSourceDescription
  };
}

function readSourceString(definition: DefinitionRecord | undefined): string {
  const sourceData = definition?.sourceData as { sourceString?: unknown } | undefined;
  return typeof sourceData?.sourceString === "string" ? sourceData.sourceString.trim() : "";
}
