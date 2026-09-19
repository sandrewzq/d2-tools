import type { AccountItemSummary } from "@d2-tools/core/account/summary";
import {
  buildCharacterPowerView,
  type AccountPowerAccountSource,
  type AccountPowerCharacterSource,
  type CharacterPowerView
} from "./accountPower.js";

/**
 * 角色切换器需要的最小账号结构：职业名、光等、徽标，加上算光等所需的装备列表。
 * 账号页（完整 AccountSummary）和仓库页（桌面端精简快照）都满足这份结构，
 * 所以两边共用同一个 builder，不各自拼一份。
 */
export type AccountCharacterTabSource = {
  characters: Array<AccountPowerCharacterSource & { emblem_url?: string }>;
  vault: { items: AccountItemSummary[] };
};

export type AccountCharacterTab = {
  key: string;
  className: string;
  lightLabel: string;
  power: CharacterPowerView;
  emblemUrl?: string;
  isSelected: boolean;
};

export function buildAccountCharacterTabs(
  account: AccountCharacterTabSource,
  selectedCharacterId: string
): AccountCharacterTab[] {
  const source: AccountPowerAccountSource = account;
  return account.characters.map((character) => ({
    key: character.character_id,
    className: character.class_name,
    lightLabel: `光等 ${character.light ?? "-"}`,
    power: buildCharacterPowerView(source, character),
    emblemUrl: character.emblem_url,
    isSelected: character.character_id === selectedCharacterId
  }));
}
