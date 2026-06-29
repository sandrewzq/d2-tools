import { parseBuildGuideFallback, parseBuildGuideFromAiJson } from "@d2-tools/core/assistant/guideParsing";
import { createBuildGuideLoadoutDraft } from "@d2-tools/core/assistant/loadoutDraft";
import type { BuildGuideTaskState } from "@d2-tools/core/assistant/guideSchema";
import type { D2Services } from "@d2-tools/services";
import { runQuery, type QueryState } from "../queryState.js";
import { matchD2SkillBuildGuide } from "./d2Skill.js";

export type KohinataBuildGuideTaskInput = {
  rawText: string;
  aiText?: string;
  characterId?: string;
};

export function createKohinataBuildGuideTask(
  services: Pick<D2Services, "d2Skill">,
  input: KohinataBuildGuideTaskInput
): Promise<QueryState<BuildGuideTaskState>> {
  return runQuery(async () => {
    const parseResult = input.aiText
      ? parseBuildGuideFromAiJson(input.rawText, input.aiText)
      : parseBuildGuideFallback(input.rawText);
    const context = await services.d2Skill.getBuildGuideContext();
    const characterId = input.characterId ?? context.account.characters[0]?.character_id ?? "";
    const matchState = await matchD2SkillBuildGuide(services, parseResult.requirement, { characterId });

    if (matchState.status !== "success") {
      throw new Error(matchState.error?.message ?? "攻略账号对照失败");
    }

    const draft = createBuildGuideLoadoutDraft({
      match: matchState.data,
      characterId,
      fallbackName: firstGuideLine(input.rawText)
    });

    return {
      raw_text: input.rawText,
      parse_result: parseResult,
      match_result: matchState.data,
      draft,
      next_actions: ["save_draft", "review_gaps"]
    };
  });
}

function firstGuideLine(rawText: string): string {
  return rawText.split(/\r?\n/).map((line) => line.trim()).find(Boolean) ?? "攻略配装";
}
