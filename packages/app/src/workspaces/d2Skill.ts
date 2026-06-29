import { matchBuildGuideToAccount } from "@d2-tools/core/assistant/guideMatching";
import type { BuildGuideMatchResult, BuildGuideRequirement } from "@d2-tools/core/assistant/guideSchema";
import type { D2SkillGuideContext, D2Services } from "@d2-tools/services";
import { runQuery, type QueryState } from "../queryState.js";

export type D2SkillWorkspace = D2SkillGuideContext;

export function loadD2SkillWorkspace(
  services: Pick<D2Services, "d2Skill">
): Promise<QueryState<D2SkillWorkspace>> {
  return runQuery(() => services.d2Skill.getBuildGuideContext());
}

export function matchD2SkillBuildGuide(
  services: Pick<D2Services, "d2Skill">,
  requirement: BuildGuideRequirement,
  options: { characterId?: string } = {}
): Promise<QueryState<BuildGuideMatchResult>> {
  return runQuery(async () => {
    const context = await services.d2Skill.getBuildGuideContext();
    return matchBuildGuideToAccount({
      requirement,
      targetCharacterId: options.characterId ?? context.account.characters[0]?.character_id,
      items: context.items
    });
  });
}
