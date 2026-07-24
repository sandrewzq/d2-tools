export function ShellSidebarAccountSummary(props: {
  accountName?: string;
  characterCount?: number;
  vaultItemCount?: number;
  vaultCapacity?: number;
}) {
  const accountName = props.accountName?.trim() || "账号未读取";
  const characterCount = props.characterCount ?? 0;
  const vaultItemCount = props.vaultItemCount ?? 0;
  const vaultCapacity = props.vaultCapacity;
  const hasVaultCapacity = typeof vaultCapacity === "number" && vaultCapacity > 0;
  const capacityPercent = hasVaultCapacity
    ? Math.min(100, (vaultItemCount / vaultCapacity) * 100)
    : 0;

  return (
    <div className="shell-sidebar-account">
      <strong>{accountName}</strong>
      <span>{characterCount} 个角色 · 仓库 {vaultItemCount}{hasVaultCapacity ? ` / ${vaultCapacity}` : " 件"}</span>
      {hasVaultCapacity ? (
        <div
          className="shell-sidebar-capacity"
          role="progressbar"
          aria-label={`仓库 ${vaultItemCount} / ${vaultCapacity}`}
          aria-valuemin={0}
          aria-valuemax={vaultCapacity}
          aria-valuenow={Math.min(vaultCapacity, vaultItemCount)}
        >
          <i style={{ width: `${capacityPercent}%` }} />
        </div>
      ) : null}
    </div>
  );
}

export function ShellSidebarActions(props: {
  onOpenAi: () => void;
}) {
  return (
    <div className="shell-sidebar-actions">
      <strong>本地优先</strong>
      <span>账号数据与个人知识保存在本机。</span>
      <button type="button" onClick={props.onOpenAi}>打开 AI 助手</button>
    </div>
  );
}
