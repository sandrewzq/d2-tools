import type { AiChatReplyResult, AiChatRequest, D2Services } from "@d2-tools/services";
import { runQuery, type QueryState } from "../queryState.js";

export type AssistantWorkspaceInput = AiChatRequest;

export type AssistantWorkspace = {
  reply: AiChatReplyResult;
};

export function sendAssistantMessage(
  services: Pick<D2Services, "ai">,
  input: AssistantWorkspaceInput
): Promise<QueryState<AssistantWorkspace>> {
  return runQuery(async () => ({
    reply: await services.ai.sendChat(input)
  }));
}
