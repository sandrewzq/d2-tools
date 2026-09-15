import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ControlButton } from "../control/ControlButton.js";
import {
  formatManagedRequirements,
  formatModes,
  managedSourceStateLabel,
  shortRevision,
  type VaultRecommendationManagedRule,
  type VaultRecommendationManagedSource,
  type VaultRecommendationManagementSnapshot,
  type VaultWishlistActions
} from "./VaultWishlistManager.js";

type PendingAction = {
  kind: "source" | "rule";
  title: string;
  description: string;
  source?: VaultRecommendationManagedSource;
  rule?: VaultRecommendationManagedRule;
  sourceState?: "active" | "disabled" | "removed";
};

export function VaultRecommendationSourceManager(props: {
  actions: VaultWishlistActions;
  onCopyAuditReport?: () => void | Promise<void>;
  onApplied?: (message: string) => void;
  onSourcesChange?: (sources: readonly VaultRecommendationManagedSource[]) => void;
}) {
  const [snapshot, setSnapshot] = useState<VaultRecommendationManagementSnapshot | null>(null);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
  const [selectedSourceKey, setSelectedSourceKey] = useState("");
  const [rules, setRules] = useState<VaultRecommendationManagedRule[]>([]);
  const [ruleQuery, setRuleQuery] = useState("");
  const [ruleState, setRuleState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [busy, setBusy] = useState("");
  const [detailOpen, setDetailOpen] = useState(false);

  async function refresh() {
    if (!props.actions.getRecommendationManagement) return;
    setLoadState("loading");
    try {
      const next = await props.actions.getRecommendationManagement();
      setSnapshot(next);
      props.onSourcesChange?.(next.sources);
      setLoadState("ready");
    } catch {
      setLoadState("error");
    }
  }

  useEffect(() => {
    void refresh();
  }, [props.actions.getRecommendationManagement]);

  async function openDetails(source: VaultRecommendationManagedSource) {
    setSelectedSourceKey(source.source_key);
    setRuleQuery("");
    setDetailOpen(true);
    await loadRules(source.source_key, "");
  }

  async function loadRules(sourceKey: string, query: string) {
    if (!props.actions.listRecommendationRules) return;
    setRuleState("loading");
    try {
      setRules(await props.actions.listRecommendationRules(sourceKey, query));
      setRuleState("ready");
    } catch {
      setRuleState("error");
    }
  }

  async function applyPendingAction() {
    if (!pendingAction) return;
    setBusy(pendingAction.kind);
    try {
      if (pendingAction.kind === "source" && pendingAction.source && pendingAction.sourceState && props.actions.setRecommendationSourceState) {
        const next = await props.actions.setRecommendationSourceState(pendingAction.source.source_key, pendingAction.sourceState);
        setSnapshot(next);
        props.onSourcesChange?.(next.sources);
        props.onApplied?.(`${pendingAction.source.label}已${pendingAction.sourceState === "active" ? "启用" : pendingAction.sourceState === "disabled" ? "停用" : "删除"}。`);
      } else if (pendingAction.kind === "rule" && pendingAction.rule && props.actions.setRecommendationRuleState) {
        const next = await props.actions.setRecommendationRuleState({
          source_key: pendingAction.rule.source_key,
          rule_stable_id: pendingAction.rule.rule_stable_id,
          state: "removed",
          reason: "玩家在来源详情中移除"
        });
        setSnapshot(next);
        props.onSourcesChange?.(next.sources);
        await loadRules(pendingAction.rule.source_key, ruleQuery);
        props.onApplied?.(`${pendingAction.rule.source_label} · ${pendingAction.rule.weapon_name} 的规则已移除。`);
      }
      setPendingAction(null);
    } catch (error) {
      props.onApplied?.(error instanceof Error ? error.message : "操作失败，请稍后重试。");
    } finally {
      setBusy("");
    }
  }

  async function restoreRule(rule: VaultRecommendationManagedRule) {
    if (!props.actions.setRecommendationRuleState || rule.review_required) return;
    setBusy(`restore:${rule.rule_stable_id}`);
    try {
      const next = await props.actions.setRecommendationRuleState({
        source_key: rule.source_key,
        rule_stable_id: rule.rule_stable_id,
        state: "active",
        source_revision: rule.source_revision
      });
      setSnapshot(next);
      props.onSourcesChange?.(next.sources);
      await loadRules(rule.source_key, ruleQuery);
      props.onApplied?.(`${rule.source_label} · ${rule.weapon_name} 的规则已恢复。`);
    } finally {
      setBusy("");
    }
  }

  const selectedSource = snapshot?.sources.find((source) => source.source_key === selectedSourceKey) ?? null;
  const activeSources = snapshot?.sources.filter((source) => source.state !== "removed") ?? [];

  function renderSourceRow(source: VaultRecommendationManagedSource) {
    return (
      <article className="vault-managed-source" data-surface="row" data-source-state={source.state} key={source.source_key}>
        <div className="vault-managed-source-select"><span><strong>{source.label}</strong><small>{managedSourceStateLabel(source)}</small></span><span><b>{source.rule_count} 条规则</b><small>{source.weapon_count} 把武器 · 当前账号影响 {source.affected_instance_count ?? 0} 件</small></span></div>
        <div className="vault-managed-source-actions"><ControlButton size="compact" variant="secondary" disabled={Boolean(busy)} onClick={() => void openDetails(source)}>查看详情</ControlButton>{source.state === "active" ? <ControlButton size="compact" variant="quiet" disabled={Boolean(busy)} onClick={() => setPendingAction({ kind: "source", title: `停用${source.label}`, description: "停用后该来源不会参与仓库推荐，数据仍保留。", source, sourceState: "disabled" })}>停用</ControlButton> : null}{source.state === "disabled" ? <ControlButton size="compact" variant="secondary" disabled={Boolean(busy)} onClick={() => setPendingAction({ kind: "source", title: `启用${source.label}`, description: "启用后该来源会重新参与仓库推荐。", source, sourceState: "active" })}>启用</ControlButton> : null}{source.configured ? <ControlButton size="compact" variant="danger" disabled={Boolean(busy)} onClick={() => setPendingAction({ kind: "source", title: `删除${source.label}`, description: "删除后来源数据、规则和本地覆盖状态都会永久清除，需要重新导入才能恢复。", source, sourceState: "removed" })}>删除</ControlButton> : null}</div>
      </article>
    );
  }

  return (
    <section className="vault-source-management-page" aria-label="推荐来源管理">
      {loadState === "loading" ? <p className="vault-management-state">正在读取推荐来源…</p> : null}
      {loadState === "error" ? <div className="vault-management-state" role="alert"><span>推荐来源暂时无法读取。</span><ControlButton size="compact" variant="secondary" onClick={() => void refresh()}>重新读取</ControlButton></div> : null}
      {snapshot ? (
        <>
          <header className="vault-source-management-head">
            <div>
              <h3>已导入来源</h3>
              <p>这里管理哪些来源参与推荐。规则、DIM 作者和清单分组请点击来源后的“查看详情”。</p>
            </div>
          </header>
          <div className="vault-source-management-summary" data-ui-kind="callout" data-status="neutral"><span>当前来源 {activeSources.length} 个</span><span>已启用 {activeSources.filter((source) => source.state === "active").length} 个</span></div>
          {activeSources.length ? (
            <div className="vault-managed-source-list vault-managed-source-list--page" data-surface="list">
              {activeSources.map(renderSourceRow)}
            </div>
          ) : <div className="vault-management-empty" data-surface="empty"><strong>还没有可管理的推荐来源</strong><span>使用上方导入入口添加人工 CSV 或 DIM Wishlist。</span></div>}
        </>
      ) : null}
      {pendingAction && !detailOpen ? <div className="vault-wishlist-confirm vault-management-confirm" data-ui-kind="callout" data-status="warning"><span><strong>{pendingAction.title}</strong><small>{pendingAction.description}</small></span><div><ControlButton size="compact" variant="quiet" disabled={Boolean(busy)} onClick={() => setPendingAction(null)}>取消</ControlButton><ControlButton size="compact" variant="danger" disabled={Boolean(busy)} onClick={() => void applyPendingAction()}>{busy ? "处理中" : "确认"}</ControlButton></div></div> : null}
      {detailOpen && selectedSource ? <SourceDetailDialog source={selectedSource} rules={rules} ruleQuery={ruleQuery} ruleState={ruleState} busy={busy} pendingAction={pendingAction?.kind === "rule" ? pendingAction : null} removedRules={snapshot?.removed_rules.filter((rule) => rule.source_key === selectedSource.source_key || (selectedSource.kind === "dim" && rule.source_key.startsWith(`${selectedSource.source_key}:`))) ?? []} onClose={() => setDetailOpen(false)} onQueryChange={setRuleQuery} onSearch={() => void loadRules(selectedSource.source_key, ruleQuery)} onRemoveRule={(rule) => setPendingAction({ kind: "rule", title: `移除${rule.weapon_name}规则`, description: "只移除当前来源的这一条规则，来源本身不会改变。", rule })} onRestoreRule={(rule) => void restoreRule(rule)} onCancelPending={() => setPendingAction(null)} onConfirmPending={() => void applyPendingAction()} onCopyAuditReport={props.onCopyAuditReport ? async () => {
            try {
              await props.onCopyAuditReport?.();
              props.onApplied?.("只读验收报告已复制。");
            } catch {
              props.onApplied?.("复制失败，请稍后重试。");
            }
          } : undefined} /> : null}
    </section>
  );
}

function SourceDetailDialog(props: {
  source: VaultRecommendationManagedSource;
  rules: VaultRecommendationManagedRule[];
  removedRules: VaultRecommendationManagedRule[];
  pendingAction: PendingAction | null;
  ruleQuery: string;
  ruleState: "idle" | "loading" | "ready" | "error";
  busy: string;
  onClose: () => void;
  onQueryChange: (value: string) => void;
  onSearch: () => void;
  onRemoveRule: (rule: VaultRecommendationManagedRule) => void;
  onRestoreRule: (rule: VaultRecommendationManagedRule) => void;
  onCancelPending: () => void;
  onConfirmPending: () => void;
  onCopyAuditReport?: () => void | Promise<void>;
}) {
  const titleId = useId();
  const dialogRef = useRef<HTMLElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(
    typeof document === "undefined" ? null : (document.activeElement as HTMLElement | null)
  );
  const busyRef = useRef(props.busy);
  const onCloseRef = useRef(props.onClose);
  busyRef.current = props.busy;
  onCloseRef.current = props.onClose;
  const portalHost = typeof document === "undefined"
    ? null
    : restoreFocusRef.current?.closest<HTMLElement>(".app-shell")
      ?? document.querySelector<HTMLElement>(".app-shell")
      ?? document.body;
  useEffect(() => {
    const backdrop = dialogRef.current?.parentElement;
    const backgroundElements = portalHost
      ? [...portalHost.children].flatMap((element) => (
          element instanceof HTMLElement && element !== backdrop
            ? [{ element, wasInert: element.inert }]
            : []
        ))
      : [];
    backgroundElements.forEach(({ element }) => { element.inert = true; });
    dialogRef.current?.querySelector<HTMLButtonElement>("button:not([disabled])")?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (!dialogRef.current || event.defaultPrevented) return;
      if (event.key === "Escape") {
        if (busyRef.current) return;
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = [...dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary, [href], [tabindex]:not([tabindex="-1"])'
      )].filter((element) => !element.hidden && element.getClientRects().length > 0);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable.at(-1)!;
      if (!dialogRef.current.contains(document.activeElement)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      backgroundElements.forEach(({ element, wasInert }) => { element.inert = wasInert; });
      if (restoreFocusRef.current?.isConnected) restoreFocusRef.current.focus();
    };
  }, [portalHost]);
  const canClose = !props.busy;
  const dialog = (
    <div className="modal-backdrop vault-recommendation-data-backdrop" role="presentation" onClick={() => canClose && props.onClose()}>
      <section ref={dialogRef} className="vault-wishlist-manager vault-source-detail-dialog" data-surface="dialog" role="dialog" aria-modal="true" aria-labelledby={titleId} onClick={(event) => event.stopPropagation()}>
        <header><div><strong id={titleId}>{props.source.label}</strong><span>{managedSourceStateLabel(props.source)} · {props.source.rule_count} 条规则 · {props.source.weapon_count} 把武器</span></div><ControlButton size="compact" variant="quiet" disabled={!canClose} onClick={props.onClose}>关闭</ControlButton></header>
        <div className="vault-managed-rules-head"><span><strong>规则详情</strong><small>版本 {shortRevision(props.source.revision)} · 原始作者、分组和来源说明会保留在规则中。</small></span><form onSubmit={(event) => { event.preventDefault(); props.onSearch(); }}><input type="search" value={props.ruleQuery} onChange={(event) => props.onQueryChange(event.target.value)} placeholder="搜索武器、作者或 Perk" aria-label="搜索来源规则" /><ControlButton type="submit" size="compact" variant="secondary" disabled={props.ruleState === "loading"}>搜索</ControlButton></form></div>
        {props.ruleState === "loading" ? <p className="vault-management-state">正在读取规则…</p> : null}
        {props.ruleState === "error" ? <p className="vault-management-state" role="alert">规则读取失败，请重试。</p> : null}
        {props.rules.length ? <div className="vault-managed-rule-list vault-managed-rule-list--dialog" data-surface="list">{props.rules.map((rule) => <article className="vault-managed-rule" data-surface="row" key={`${rule.source_key}:${rule.rule_stable_id}`}><div><span className="vault-managed-rule-title"><strong>{rule.weapon_name}</strong><small>{formatModes(rule.purposes)} · 当前账号影响 {rule.affected_instance_count ?? 0} 件</small></span><p>{formatManagedRequirements(rule)}</p>{rule.note ? <small>{rule.note}</small> : null}</div>{rule.state === "removed" ? <ControlButton size="compact" variant="secondary" disabled={Boolean(props.busy) || rule.review_required} onClick={() => props.onRestoreRule(rule)}>恢复</ControlButton> : <ControlButton size="compact" variant="quiet" disabled={Boolean(props.busy)} onClick={() => props.onRemoveRule(rule)}>移除规则</ControlButton>}</article>)}</div> : null}
        {props.removedRules.length ? <details className="vault-removed-rules"><summary>已移除规则（{props.removedRules.length}）</summary><div className="vault-managed-rule-list" data-surface="list">{props.removedRules.slice(0, 100).map((rule) => <article className="vault-managed-rule" data-surface="row" key={`removed:${rule.source_key}:${rule.rule_stable_id}`}><div><strong>{rule.weapon_name}</strong><small>{formatManagedRequirements(rule)}</small></div><ControlButton size="compact" variant="secondary" disabled={Boolean(props.busy) || rule.review_required} onClick={() => props.onRestoreRule(rule)}>恢复</ControlButton></article>)}</div></details> : null}
        {props.onCopyAuditReport ? <div className="vault-source-detail-diagnostic"><span><strong>验收与诊断</strong><small>复制当前账号的推荐核对结果，只读导出，不写入标签或游戏数据。</small></span><ControlButton size="compact" variant="quiet" disabled={Boolean(props.busy)} onClick={() => void props.onCopyAuditReport?.()}>复制验收报告</ControlButton></div> : null}
        {props.pendingAction ? <div className="vault-wishlist-confirm vault-management-confirm" data-ui-kind="callout" data-status="warning"><span><strong>{props.pendingAction.title}</strong><small>{props.pendingAction.description}</small></span><div><ControlButton size="compact" variant="quiet" disabled={Boolean(props.busy)} onClick={props.onCancelPending}>取消</ControlButton><ControlButton size="compact" variant="danger" disabled={Boolean(props.busy)} onClick={props.onConfirmPending}>{props.busy ? "处理中" : "确认移除"}</ControlButton></div></div> : null}
      </section>
    </div>
  );
  return portalHost ? createPortal(dialog, portalHost) : dialog;
}
