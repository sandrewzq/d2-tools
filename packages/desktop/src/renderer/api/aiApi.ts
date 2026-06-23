import type { AccountItemSummary, AiAdviceSections } from "./sharedTypes";
import type { VaultTags } from "./vaultApi";

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
