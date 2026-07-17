import { ipcMain } from "electron";
import { matchBuildGuideToAccount } from "@d2-tools/core/assistant/guideMatching";
import { parseBuildGuideFallback, parseBuildGuideFromAiJson } from "@d2-tools/core/assistant/guideParsing";
import { createBuildGuideLoadoutDraft } from "@d2-tools/core/assistant/loadoutDraft";
import type { AccountSummary } from "@d2-tools/core/account/summary";
import type { BuildGuideMatchResult, BuildGuideRequirement } from "@d2-tools/core/assistant/guideSchema";
import { getAccountSnapshot } from "../runtime/accountSession.js";

export function registerAssistantIpcHandlers(): void {
  ipcMain.handle("assistant:guide:parse", (_event, input: { rawText: string; aiText?: string }) => {
    return input.aiText
      ? parseBuildGuideFromAiJson(input.rawText, input.aiText)
      : parseBuildGuideFallback(input.rawText);
  });

  ipcMain.handle("assistant:guide:match", async (_event, input: {
    requirement: BuildGuideRequirement;
    characterId?: string;
  }) => {
    const account = await loadAssistantAccountSummary();
    const characterId = input.characterId ?? account.characters[0]?.character_id;
    return matchBuildGuideToAccount({
      requirement: input.requirement,
      targetCharacterId: characterId,
      items: collectAssistantAccountItems(account)
    });
  });

  ipcMain.handle("assistant:guide:draft", (_event, input: {
    match: BuildGuideMatchResult;
    characterId: string;
    fallbackName: string;
  }) => createBuildGuideLoadoutDraft(input));
}

async function loadAssistantAccountSummary(): Promise<AccountSummary> {
  return getAccountSnapshot("refresh");
}

function collectAssistantAccountItems(account: AccountSummary): AccountSummary["vault"]["items"] {
  return [
    ...account.vault.items,
    ...account.characters.flatMap((character) => [
      ...character.equipped_items,
      ...character.inventory_items,
      ...character.postmaster_items
    ])
  ];
}
