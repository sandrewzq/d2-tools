import type { BuildGuideLoadoutDraft, BuildGuideMatchResult } from "./guideSchema.js";

export function createBuildGuideLoadoutDraft(input: {
  match: BuildGuideMatchResult;
  characterId: string;
  fallbackName: string;
}): BuildGuideLoadoutDraft {
  return {
    name: input.fallbackName.trim() || firstGuideLine(input.match.requirement.raw_text),
    character_id: input.characterId,
    class_name: input.match.requirement.class_name?.value,
    items: input.match.matched_items.filter((item) => item.status === "matched"),
    missing_requirements: input.match.missing_requirements,
    notes: [
      ...input.match.requirement.notes,
      ...input.match.needs_confirmation.map((item) => `待确认：${item}`)
    ]
  };
}

function firstGuideLine(rawText: string): string {
  return rawText.split(/\r?\n/).map((line) => line.trim()).find(Boolean) ?? "攻略配装";
}
