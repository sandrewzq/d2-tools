import { matchBuildGuideToAccount } from "@d2-tools/core/assistant/guideMatching";
import type { BuildGuideMatchResult, BuildGuideRequirement } from "@d2-tools/core/assistant/guideSchema";
import type { D2Services, GuideContext } from "@d2-tools/services";
import { runQuery, type QueryState } from "../queryState.js";

export type GuideWorkspace = GuideContext;

export function loadGuideWorkspace(
  services: Pick<D2Services, "guide">
): Promise<QueryState<GuideWorkspace>> {
  return runQuery(() => services.guide.getContext());
}

export function matchBuildGuide(
  services: Pick<D2Services, "guide">,
  requirement: BuildGuideRequirement,
  options: { characterId?: string } = {}
): Promise<QueryState<BuildGuideMatchResult>> {
  return runQuery(async () => {
    const context = await services.guide.getContext();
    return matchBuildGuideToAccount({
      requirement,
      targetCharacterId: options.characterId ?? context.account.characters[0]?.character_id,
      items: context.items
    });
  });
}
