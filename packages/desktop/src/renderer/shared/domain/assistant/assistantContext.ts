import { homePageFocus, homePageLabels, type HomePageKey } from "@d2-tools/app";
import type { AccountSummary } from "../../../api/client";

export type AssistantPageKey = HomePageKey;

export type AssistantPageContext = {
  page_key: AssistantPageKey;
  page_label: string;
  focus: string;
  facts: string[];
};

export function buildAssistantPageContext(input: {
  activePage: AssistantPageKey;
  account: AccountSummary | null;
  selectedCharacterId?: string | null;
  activeLoadoutName?: string | null;
  libraryRecentNames?: string[];
  vaultFacts?: string[];
  loadoutFacts?: string[];
  libraryFacts?: string[];
}): AssistantPageContext {
  const selectedCharacter = input.account?.characters.find((character) => character.character_id === input.selectedCharacterId)
    ?? input.account?.characters[0]
    ?? null;
  const facts = [
    input.account
      ? `账号已读取：${input.account.characters.length} 个角色，仓库 ${input.account.vault.item_count} 件装备，材料 ${input.account.materials.item_count} 种。`
      : "账号数据未读取。",
    selectedCharacter
      ? `当前角色：${selectedCharacter.class_name}，光等 ${selectedCharacter.light}。`
      : "当前没有可用角色。",
    input.activeLoadoutName ? `当前配装方案：${input.activeLoadoutName}` : "",
    input.libraryRecentNames?.length ? `最近查看资料：${input.libraryRecentNames.slice(0, 5).join(" / ")}` : "",
    ...(input.vaultFacts ?? []),
    ...(input.loadoutFacts ?? []),
    ...(input.libraryFacts ?? [])
  ].filter(Boolean);

  return {
    page_key: input.activePage,
    page_label: homePageLabels[input.activePage],
    focus: homePageFocus[input.activePage],
    facts
  };
}
