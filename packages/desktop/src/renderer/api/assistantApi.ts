import type {
  BuildGuideLoadoutDraft,
  BuildGuideMatchResult,
  BuildGuideParseResult,
  BuildGuideRequirement
} from "./sharedTypes";

export type AssistantApi = {
  parseBuildGuide(input: { rawText: string; aiText?: string }): Promise<BuildGuideParseResult>;
  matchBuildGuide(input: { requirement: BuildGuideRequirement; characterId?: string }): Promise<BuildGuideMatchResult>;
  createGuideLoadoutDraft(input: {
    match: BuildGuideMatchResult;
    characterId: string;
    fallbackName: string;
  }): Promise<BuildGuideLoadoutDraft>;
};
