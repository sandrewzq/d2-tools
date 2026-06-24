export interface AiMessage {
  readonly id: string;
  readonly role: "user" | "assistant" | "system";
  readonly content: string;
  readonly createdAt: string;
}

export interface AiConversation {
  readonly id: string;
  readonly title: string;
  readonly messages: readonly AiMessage[];
  readonly updatedAt: string;
}
