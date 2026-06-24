import type { AiConversation } from "@d2-tools/core";

export interface AiRepository {
  listConversations(): Promise<readonly AiConversation[]>;
  saveConversation(conversation: AiConversation): Promise<AiConversation>;
}

export function createAiRepository(): AiRepository {
  const conversations = new Map<string, AiConversation>();

  return {
    async listConversations() {
      return Array.from(conversations.values()).sort((a, b) =>
        b.updatedAt.localeCompare(a.updatedAt)
      );
    },
    async saveConversation(conversation) {
      conversations.set(conversation.id, conversation);
      return conversation;
    }
  };
}
