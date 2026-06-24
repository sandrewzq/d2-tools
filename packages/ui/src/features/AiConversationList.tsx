import type { AiConversation } from "@d2-tools/core";
import { Panel } from "../primitives/Panel";

export interface AiConversationListProps {
  readonly conversations: readonly AiConversation[];
}

export function AiConversationList({ conversations }: AiConversationListProps) {
  return (
    <Panel title="AI 会话">
      {conversations.length === 0 ? (
        <p>暂无会话</p>
      ) : (
        <ul>
          {conversations.map((conversation) => (
            <li key={conversation.id}>{conversation.title}</li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
