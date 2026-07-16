import type { AccountItemSummary, AiAdviceSections } from "./sharedTypes";
import type { VaultTags } from "./vaultApi";
import type { WeaponRecommendation } from "./sharedTypes";
import type { PersonalWeaponKnowledgeEntry } from "@d2-tools/core/community-perks/personalWeaponKnowledge";

export type AiApi = {
  generateItemAiAdvice(input: ItemAiAdviceInput): Promise<ItemAiAdviceResult>;
  sendAiChat(input: AiChatRequest): Promise<AiChatReplyResult>;
};

export type ItemAiAdviceInput = {
  item: AccountItemSummary & {
    description?: string;
    note?: string;
  };
  tags: VaultTags;
  user_knowledge?: string;
  personal_knowledge?: PersonalWeaponKnowledgeEntry[];
  builtin_knowledge?: WeaponRecommendation | null;
};

export type ItemAiAdviceResult = {
  ai: {
    provider: string;
    model: string;
    text: string;
    sections: AiAdviceSections;
  } | null;
  skipped_reason?: string;
};

export type AiChatRequest = {
  question: string;
  context: string;
};

export type AiChatReplyResult = {
  provider: string;
  model: string;
  text: string;
};
