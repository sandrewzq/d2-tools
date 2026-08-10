import { useId, useState } from "react";
import { parseDimWishlist, type DimWishlist } from "@d2-tools/core/analysis/wishlistImport";
import {
  parseLocalCommunityRecommendations,
  type LocalCommunityRecommendationTable
} from "@d2-tools/core/community-perks/localCommunityImport";
import { ControlButton } from "../control/ControlButton.js";

type RecommendationSource = "wishlist" | "community";
type ImportFeedback = { tone: "ready" | "error" | "neutral"; message: string } | null;

export type VaultRecommendationImportActions = {
  localCommunityTable?: LocalCommunityRecommendationTable | null;
  localCommunityLoadState?: "loading" | "ready" | "error";
  localCommunityLoadError?: string;
  onLoadLocalCommunity?: () => Promise<LocalCommunityRecommendationTable | null> | LocalCommunityRecommendationTable | null;
  onSaveWishlist?: (wishlist: DimWishlist) => Promise<DimWishlist> | DimWishlist;
  onClearWishlist?: () => Promise<void> | void;
  onSaveLocalCommunity?: (table: LocalCommunityRecommendationTable) => Promise<LocalCommunityRecommendationTable> | LocalCommunityRecommendationTable;
  onClearLocalCommunity?: () => Promise<void> | void;
};

export function VaultRecommendationImportPanel(props: {
  wishlist?: DimWishlist | null;
  actions?: VaultRecommendationImportActions;
}) {
  const panelId = useId();
  const [activeEditor, setActiveEditor] = useState<RecommendationSource | null>(null);
  const [pendingClear, setPendingClear] = useState<RecommendationSource | null>(null);
  const [busySource, setBusySource] = useState<RecommendationSource | null>(null);
  const [wishlistImportDraft, setWishlistImportDraft] = useState("");
  const [wishlistPreview, setWishlistPreview] = useState<DimWishlist | null>(null);
  const [wishlistFeedback, setWishlistFeedback] = useState<ImportFeedback>(null);
  const [localCommunityImportDraft, setLocalCommunityImportDraft] = useState("");
  const [localCommunityPreview, setLocalCommunityPreview] = useState<LocalCommunityRecommendationTable | null>(null);
  const [localCommunityFeedback, setLocalCommunityFeedback] = useState<ImportFeedback>(null);
  const localCommunityTable = props.actions?.localCommunityTable ?? null;
  const localCommunityLoadState = props.actions?.localCommunityLoadState ?? "ready";

  function toggleEditor(source: RecommendationSource) {
    setActiveEditor((current) => current === source ? null : source);
    setPendingClear(null);
  }

  function requestClear(source: RecommendationSource) {
    setActiveEditor(null);
    setPendingClear(source);
  }

  function updateWishlistDraft(value: string) {
    setWishlistImportDraft(value);
    setWishlistPreview(null);
    setWishlistFeedback(null);
  }

  function updateLocalCommunityDraft(value: string) {
    setLocalCommunityImportDraft(value);
    setLocalCommunityPreview(null);
    setLocalCommunityFeedback(null);
  }

  function previewWishlistDraft() {
    const wishlist = parseDimWishlist(wishlistImportDraft);
    setWishlistPreview(wishlist.rules.length ? wishlist : null);
    setWishlistFeedback(wishlist.rules.length
      ? { tone: "ready", message: `检查完成：识别到 ${wishlist.rules.length} 条 DIM 愿望单规则。` }
      : { tone: "error", message: "没有识别到 DIM 愿望单规则，请检查粘贴内容。" });
  }

  async function saveImportedWishlist() {
    if (!wishlistPreview || !props.actions?.onSaveWishlist) return;
    setBusySource("wishlist");
    try {
      const saved = await props.actions.onSaveWishlist(wishlistPreview);
      setWishlistImportDraft("");
      setWishlistPreview(null);
      setActiveEditor(null);
      setWishlistFeedback({ tone: "ready", message: `已启用 ${saved.rules.length} 条 DIM 愿望单规则：${saved.title}` });
    } catch (error) {
      setWishlistFeedback({ tone: "error", message: error instanceof Error ? error.message : "DIM 愿望单保存失败" });
    } finally {
      setBusySource(null);
    }
  }

  async function clearImportedWishlist() {
    if (!props.actions?.onClearWishlist) return;
    setBusySource("wishlist");
    try {
      await props.actions.onClearWishlist();
      setPendingClear(null);
      setWishlistFeedback({ tone: "ready", message: "已移除 DIM 愿望单数据源。" });
    } catch (error) {
      setWishlistFeedback({ tone: "error", message: error instanceof Error ? error.message : "DIM 愿望单移除失败" });
    } finally {
      setBusySource(null);
    }
  }

  function previewLocalCommunityDraft() {
    try {
      const table = parseLocalCommunityRecommendations(localCommunityImportDraft);
      setLocalCommunityPreview(table.rules.length ? table : null);
      setLocalCommunityFeedback(table.rules.length
        ? { tone: "ready", message: `检查完成：识别到 ${table.rules.length} 条社区推荐规则。` }
        : { tone: "error", message: "没有识别到社区推荐规则，请检查 JSON 或 CSV 内容。" });
    } catch (error) {
      setLocalCommunityPreview(null);
      setLocalCommunityFeedback({ tone: "error", message: error instanceof Error ? error.message : "社区推荐表解析失败" });
    }
  }

  async function saveLocalCommunityDraft() {
    if (!localCommunityPreview || !props.actions?.onSaveLocalCommunity) return;
    setBusySource("community");
    try {
      const saved = await props.actions.onSaveLocalCommunity(localCommunityPreview);
      setLocalCommunityImportDraft("");
      setLocalCommunityPreview(null);
      setActiveEditor(null);
      setLocalCommunityFeedback({ tone: "ready", message: `已启用 ${saved.rules.length} 条社区推荐规则：${saved.title}` });
    } catch (error) {
      setLocalCommunityFeedback({ tone: "error", message: error instanceof Error ? error.message : "社区推荐表保存失败" });
    } finally {
      setBusySource(null);
    }
  }

  async function clearLocalCommunityDraft() {
    if (!props.actions?.onClearLocalCommunity) return;
    setBusySource("community");
    try {
      await props.actions.onClearLocalCommunity();
      setPendingClear(null);
      setLocalCommunityFeedback({ tone: "ready", message: "已移除本地社区推荐数据源。" });
    } catch (error) {
      setLocalCommunityFeedback({ tone: "error", message: error instanceof Error ? error.message : "社区推荐表移除失败" });
    } finally {
      setBusySource(null);
    }
  }

  async function reloadLocalCommunity() {
    if (!props.actions?.onLoadLocalCommunity) return;
    setBusySource("community");
    try {
      await props.actions.onLoadLocalCommunity();
      setLocalCommunityFeedback({ tone: "ready", message: "社区推荐数据源状态已重新读取。" });
    } catch (error) {
      setLocalCommunityFeedback({ tone: "error", message: error instanceof Error ? error.message : "社区推荐数据源读取失败" });
    } finally {
      setBusySource(null);
    }
  }

  return (
    <section className="vault-dashboard-panel vault-preview wishlist-import-panel" aria-label="推荐数据源管理">
      <div className="vault-source-list">
        <div className={`vault-source-row${activeEditor === "wishlist" ? " is-editing" : ""}`}>
          <div className="vault-source-summary">
            <div className="vault-source-identity">
              <strong>DIM Wishlist</strong>
              <small>外部愿望单证据，不改变玩家整理状态</small>
            </div>
            <div className="vault-source-status">
              <span className={`ui-badge ${props.wishlist ? "status-ready" : "status-neutral"}`} data-ui-kind="status-chip">
                {props.wishlist ? "已启用" : "未配置"}
              </span>
              <span>{props.wishlist ? `${props.wishlist.title} · ${props.wishlist.rules.length} 条规则` : "尚未导入 DIM 愿望单"}</span>
            </div>
            <div className="vault-source-actions">
              <ControlButton size="compact" variant={activeEditor === "wishlist" ? "quiet" : "secondary"} aria-expanded={activeEditor === "wishlist"} aria-controls={`${panelId}-wishlist-editor`} onClick={() => toggleEditor("wishlist")}>
                {activeEditor === "wishlist" ? "收起" : props.wishlist ? "替换" : "导入"}
              </ControlButton>
              {props.wishlist ? <ControlButton size="compact" variant="quiet" disabled={busySource !== null} onClick={() => requestClear("wishlist")}>移除</ControlButton> : null}
            </div>
          </div>
          {pendingClear === "wishlist" ? (
            <div className="vault-source-confirm" role="alert">
              <span>移除后，仓库和装备详情将不再显示这份 DIM 愿望单证据。</span>
              <div>
                <ControlButton size="compact" variant="danger" disabled={busySource !== null} onClick={() => void clearImportedWishlist()}>确认移除</ControlButton>
                <ControlButton size="compact" variant="quiet" disabled={busySource !== null} onClick={() => setPendingClear(null)}>取消</ControlButton>
              </div>
            </div>
          ) : null}
          {activeEditor === "wishlist" ? (
            <div className="vault-source-editor" id={`${panelId}-wishlist-editor`}>
              <label htmlFor={`${panelId}-dim-wishlist-import`}><strong>粘贴 DIM Wishlist 文本</strong><span>先检查内容，再明确启用；启用后会替换当前来源。</span></label>
              <textarea id={`${panelId}-dim-wishlist-import`} value={wishlistImportDraft} onChange={(event) => updateWishlistDraft(event.target.value)} placeholder="dimwishlist:item=123&perks=11,22#notes:PVE" rows={5} />
              {wishlistPreview ? <ImportPreview title={wishlistPreview.title} ruleCount={wishlistPreview.rules.length} detail="DIM Wishlist" /> : null}
              <div className="vault-source-editor-actions">
                <ControlButton size="compact" variant="secondary" disabled={!wishlistImportDraft.trim() || busySource !== null} onClick={previewWishlistDraft}>检查内容</ControlButton>
                <ControlButton size="compact" variant="primary" disabled={!wishlistPreview || !props.actions?.onSaveWishlist || busySource !== null} aria-busy={busySource === "wishlist"} onClick={() => void saveImportedWishlist()}>启用这份数据</ControlButton>
                <ControlButton size="compact" variant="quiet" disabled={busySource !== null} onClick={() => setActiveEditor(null)}>取消</ControlButton>
              </div>
            </div>
          ) : null}
          <ImportStatus feedback={wishlistFeedback} />
        </div>

        <div className={`vault-source-row${activeEditor === "community" ? " is-editing" : ""}`}>
          <div className="vault-source-summary">
            <div className="vault-source-identity">
              <strong>社区推荐</strong>
              <small>本机导入的第三方推荐证据，不联网获取</small>
            </div>
            <div className="vault-source-status">
              <span className={`ui-badge ${localCommunityLoadState === "error" ? "status-error" : localCommunityLoadState === "loading" ? "status-pending" : localCommunityTable ? "status-ready" : "status-neutral"}`} data-ui-kind="status-chip">
                {localCommunityLoadState === "loading" ? "读取中" : localCommunityLoadState === "error" ? "读取失败" : localCommunityTable ? "已启用" : "未配置"}
              </span>
              <span>{formatCommunitySourceStatus(localCommunityTable, localCommunityLoadState, props.actions?.localCommunityLoadError)}</span>
            </div>
            <div className="vault-source-actions">
              {localCommunityLoadState === "error" ? <ControlButton size="compact" variant="secondary" disabled={busySource !== null || !props.actions?.onLoadLocalCommunity} onClick={() => void reloadLocalCommunity()}>重新读取</ControlButton> : null}
              <ControlButton size="compact" variant={activeEditor === "community" ? "quiet" : "secondary"} disabled={localCommunityLoadState === "loading"} aria-expanded={activeEditor === "community"} aria-controls={`${panelId}-community-editor`} onClick={() => toggleEditor("community")}>
                {activeEditor === "community" ? "收起" : localCommunityTable ? "替换" : "导入"}
              </ControlButton>
              {localCommunityTable ? <ControlButton size="compact" variant="quiet" disabled={busySource !== null} onClick={() => requestClear("community")}>移除</ControlButton> : null}
            </div>
          </div>
          {pendingClear === "community" ? (
            <div className="vault-source-confirm" role="alert">
              <span>移除后，仓库、同名整理和装备详情将不再显示这份社区推荐证据。</span>
              <div>
                <ControlButton size="compact" variant="danger" disabled={busySource !== null} onClick={() => void clearLocalCommunityDraft()}>确认移除</ControlButton>
                <ControlButton size="compact" variant="quiet" disabled={busySource !== null} onClick={() => setPendingClear(null)}>取消</ControlButton>
              </div>
            </div>
          ) : null}
          {activeEditor === "community" ? (
            <div className="vault-source-editor" id={`${panelId}-community-editor`}>
              <label htmlFor={`${panelId}-local-community-import`}><strong>粘贴社区推荐表</strong><span>支持 JSON 或 CSV；检查通过后才会开放启用操作。</span></label>
              <textarea id={`${panelId}-local-community-import`} value={localCommunityImportDraft} onChange={(event) => updateLocalCommunityDraft(event.target.value)} placeholder="粘贴社区推荐 JSON 或 CSV" rows={6} />
              {localCommunityPreview ? <ImportPreview title={localCommunityPreview.title} ruleCount={localCommunityPreview.rules.length} detail={formatCommunityModes(localCommunityPreview)} /> : null}
              <div className="vault-source-editor-actions">
                <ControlButton size="compact" variant="secondary" disabled={!localCommunityImportDraft.trim() || busySource !== null} onClick={previewLocalCommunityDraft}>检查内容</ControlButton>
                <ControlButton size="compact" variant="primary" disabled={!localCommunityPreview || !props.actions?.onSaveLocalCommunity || busySource !== null} aria-busy={busySource === "community"} onClick={() => void saveLocalCommunityDraft()}>启用这份数据</ControlButton>
                <ControlButton size="compact" variant="quiet" disabled={busySource !== null} onClick={() => setActiveEditor(null)}>取消</ControlButton>
              </div>
            </div>
          ) : null}
          <ImportStatus feedback={localCommunityFeedback} />
        </div>
      </div>
    </section>
  );
}

function ImportPreview(props: { title: string; ruleCount: number; detail: string }) {
  return (
    <div className="vault-source-preview" data-surface="state-frame">
      <span>待启用预览</span>
      <strong>{props.title}</strong>
      <small>{props.ruleCount} 条规则 · {props.detail}</small>
    </div>
  );
}

function ImportStatus({ feedback }: { feedback: ImportFeedback }) {
  if (!feedback) return null;
  return <p className={`vault-source-feedback status-message status-${feedback.tone}`} aria-live="polite">{feedback.message}</p>;
}

function formatCommunitySourceStatus(
  table: LocalCommunityRecommendationTable | null,
  state: "loading" | "ready" | "error",
  error?: string
): string {
  if (state === "loading") return "正在读取本机已保存的推荐表";
  if (state === "error") return error || "本机推荐表读取失败";
  if (!table) return "尚未导入本地社区推荐表";
  return `${table.title} · ${table.rules.length} 条规则 · ${formatCommunityModes(table)}`;
}

function formatCommunityModes(table: LocalCommunityRecommendationTable): string {
  const counts = { pve: 0, pvp: 0, general: 0 };
  table.rules.forEach((rule) => {
    counts[rule.mode] += 1;
  });
  return [
    counts.pve ? `PVE ${counts.pve}` : "",
    counts.pvp ? `PVP ${counts.pvp}` : "",
    counts.general ? `通用 ${counts.general}` : ""
  ].filter(Boolean).join(" / ") || "未标注模式";
}
