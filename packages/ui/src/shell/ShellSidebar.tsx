export function ShellSidebarAccountSummary(props: {
  accountName?: string;
  characterCount?: number;
  vaultItemCount?: number;
  vaultCapacity?: number;
}) {
  const accountName = props.accountName?.trim() || "账号未读取";
  const characterCount = props.characterCount ?? 0;
  const vaultItemCount = props.vaultItemCount ?? 0;

  return (
    <div className="shell-sidebar-account" data-ui-kind="account-summary" title={accountName} aria-label={accountName}>
      <strong data-ui-part="value" data-info-priority="context" data-text-tone="primary">{accountName}</strong>
      <span data-ui-part="detail" data-info-priority="reading" data-text-tone="body">{characterCount} 个角色 · 仓库 {vaultItemCount} 件</span>
    </div>
  );
}

export function ShellSidebarActions() {
  return (
    <div className="shell-sidebar-actions">
      <strong data-ui-part="value" data-info-priority="context" data-text-tone="primary">本地优先</strong>
      <span data-ui-part="detail" data-info-priority="reading" data-text-tone="body">账号数据与个人知识保存在本机。</span>
    </div>
  );
}
