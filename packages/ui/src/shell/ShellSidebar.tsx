import { isAiAssistantVisible } from "./featureVisibility.js";
import type { ShellCopy } from "../i18n/types.js";
import { shellTemplate, shellText } from "./shellCopy.js";

export function ShellSidebarAccountSummary(props: {
  copy: ShellCopy;
  accountName?: string;
  characterCount?: number;
  vaultItemCount?: number;
  vaultCapacity?: number;
}) {
  const accountName = props.accountName?.trim() || shellText(props.copy, "账号未读取");
  const characterCount = props.characterCount ?? 0;
  const vaultItemCount = props.vaultItemCount ?? 0;

  return (
    <div className="shell-sidebar-account" data-ui-kind="account-summary" title={accountName} aria-label={accountName}>
      <strong data-ui-part="value" data-info-priority="context" data-text-tone="primary">{accountName}</strong>
      <span data-ui-part="detail" data-info-priority="reading" data-text-tone="body">{shellTemplate(props.copy, "{characters} 个角色 · 仓库 {items} 件", { characters: characterCount, items: vaultItemCount })}</span>
    </div>
  );
}

export function ShellSidebarActions(props: {
  copy: ShellCopy;
  isAiOpen: boolean;
  onToggleAi: () => void;
}) {
  return (
    <div className="shell-sidebar-actions">
      <strong data-ui-part="value" data-info-priority="context" data-text-tone="primary">{shellText(props.copy, "本地优先")}</strong>
      <span data-ui-part="detail" data-info-priority="reading" data-text-tone="body">{shellText(props.copy, "账号数据保存在本机。")}</span>
      {isAiAssistantVisible ? (
        <button
          type="button"
          data-ui-kind="button"
          data-control-variant="secondary"
          aria-expanded={props.isAiOpen}
          onClick={props.onToggleAi}
        >
          {props.isAiOpen ? shellText(props.copy, "关闭 AI 助手") : props.copy.tools.openAiAssistant}
        </button>
      ) : null}
    </div>
  );
}
