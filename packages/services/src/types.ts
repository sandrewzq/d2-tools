export type AiChatRequest = {
  question: string;
  context: string;
};

export type AiChatReplyResult = {
  provider: string;
  model: string;
  text: string;
};
