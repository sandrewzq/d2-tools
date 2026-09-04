import { parseDimWishlist, type DimWishlist } from "@d2-tools/core/analysis/wishlistImport";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ControlButton } from "../control/ControlButton.js";

// 在线检查不阻塞弹窗；这里仅作为异常兜底，避免 IPC 永久处于等待状态。
const dimOnlineCheckUiTimeoutMs = 210_000;

export type VaultDimWishlistImportPreview = {
  token: string;
  file_name: string;
  title: string;
  rule_count: number;
  weapon_count: number;
  mode_counts: Record<"pve" | "pvp" | "general", number>;
  authors: string[];
  tags: string[];
};

export type VaultWeaponKnowledgeImportPreview = {
  token?: string;
  file_name: string;
  recommendation_count: number;
  weapon_count: number;
  source_count: number;
  source_labels: string[];
  blocking_issue_count: number;
  blocking_issues: Array<{
    row_number: number;
    weapon_name: string;
    source_label: string;
    field: string;
    value: string;
    message: string;
  }>;
};

export type VaultDimOnlineStatus = {
  source_url: string;
  current_revision: string;
  current_fingerprint: string;
  activated_at: string;
  checked_at: string;
  latest_revision: string;
  latest_commit_at: string;
  rule_count: number;
  weapon_count: number;
};

export type VaultDimOnlinePreview = VaultDimOnlineStatus & {
  token?: string;
  update_available: boolean;
  file_name: string;
  title: string;
  preview_fingerprint: string;
  mode_counts: Record<"pve" | "pvp" | "general", number>;
  authors: string[];
  tags: string[];
};

export type VaultDimOnlineActivationResult = {
  wishlist: DimWishlist;
  status: VaultDimOnlineStatus;
};

export type VaultWishlistActions = {
  save(wishlist: DimWishlist): Promise<DimWishlist>;
  clear(): Promise<void>;
  selectDimFile?(): Promise<VaultDimWishlistImportPreview | null>;
  confirmDimImport?(token: string): Promise<DimWishlist>;
  getDimOnlineStatus?(): Promise<VaultDimOnlineStatus>;
  checkDimOnlineUpdate?(): Promise<VaultDimOnlinePreview>;
  confirmDimOnlineUpdate?(token: string): Promise<VaultDimOnlineActivationResult>;
  exportKnowledgeTemplate?(): Promise<{ canceled: boolean; message: string; file_path?: string }>;
  selectKnowledgeCsv?(): Promise<VaultWeaponKnowledgeImportPreview | null>;
  confirmKnowledgeImport?(token: string): Promise<{
    recommendation_count: number;
    weapon_count: number;
    source_count: number;
  }>;
};

type ImportFeedback = {
  tone: "success" | "error" | "neutral";
  message: string;
} | null;

export function VaultWishlistManager(props: {
  wishlist?: DimWishlist | null;
  actions: VaultWishlistActions;
  onApplied?: (message: string) => void;
  onClose: () => void;
}) {
  const titleId = useId();
  const dialogRef = useRef<HTMLElement>(null);
  const browserFileRef = useRef<HTMLInputElement>(null);
  const initialFocusRef = useRef<HTMLElement | null>(
    typeof document === "undefined" ? null : (document.activeElement as HTMLElement | null)
  );
  const [inputText, setInputText] = useState("");
  const [pastePreview, setPastePreview] = useState<DimWishlist | null>(null);
  const [dimFilePreview, setDimFilePreview] = useState<VaultDimWishlistImportPreview | null>(null);
  const [dimOnlineStatus, setDimOnlineStatus] = useState<VaultDimOnlineStatus | null>(null);
  const [dimOnlinePreview, setDimOnlinePreview] = useState<VaultDimOnlinePreview | null>(null);
  const [knowledgePreview, setKnowledgePreview] = useState<VaultWeaponKnowledgeImportPreview | null>(null);
  const [isPasteOpen, setIsPasteOpen] = useState(false);
  const [isConfirmingClear, setIsConfirmingClear] = useState(false);
  const [busyAction, setBusyAction] = useState("");
  const [isCheckingDimOnline, setIsCheckingDimOnline] = useState(false);
  const [feedback, setFeedback] = useState<ImportFeedback>(null);
  const busyActionRef = useRef(busyAction);
  const onCloseRef = useRef(props.onClose);
  const onAppliedRef = useRef(props.onApplied);
  busyActionRef.current = busyAction;
  onCloseRef.current = props.onClose;
  onAppliedRef.current = props.onApplied;
  const supportsKnowledgeImport = Boolean(
    props.actions.selectKnowledgeCsv
    && props.actions.confirmKnowledgeImport
  );
  const supportsDimOnlineUpdate = Boolean(
    props.actions.getDimOnlineStatus
    && props.actions.checkDimOnlineUpdate
    && props.actions.confirmDimOnlineUpdate
  );
  const portalHost = typeof document === "undefined"
    ? null
    : initialFocusRef.current?.closest<HTMLElement>(".app-shell")
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
    backgroundElements.forEach(({ element }) => {
      element.inert = true;
    });
    const preferredFocus = dialogRef.current?.querySelector<HTMLButtonElement>("[data-knowledge-import]")
      ?? dialogRef.current?.querySelector<HTMLButtonElement>("[data-dim-update]")
      ?? dialogRef.current?.querySelector<HTMLButtonElement>("button:not([disabled])");
    preferredFocus?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || !dialogRef.current) return;
      if (event.key === "Escape") {
        event.preventDefault();
        if (!busyActionRef.current) onCloseRef.current();
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
    }

    document.addEventListener("keydown", handleKeyDown, true);
    return () => {
      document.removeEventListener("keydown", handleKeyDown, true);
      backgroundElements.forEach(({ element, wasInert }) => {
        element.inert = wasInert;
      });
      if (initialFocusRef.current?.isConnected) initialFocusRef.current.focus();
    };
  }, [portalHost]);

  useEffect(() => {
    if (!props.actions.getDimOnlineStatus) return;
    let active = true;
    void props.actions.getDimOnlineStatus().then(
      (status) => {
        if (active) setDimOnlineStatus(status);
      },
      () => undefined
    );
    return () => {
      active = false;
    };
  }, [props.actions]);

  async function refreshDimOnlineStatus() {
    if (!props.actions.getDimOnlineStatus) return;
    try {
      setDimOnlineStatus(await props.actions.getDimOnlineStatus());
    } catch {
      // 本地状态刷新失败不改变已经完成的导入或清理结果。
    }
  }

  function finishApplied(message: string) {
    onAppliedRef.current?.(message);
    onCloseRef.current();
  }

  async function selectDimFile() {
    if (!props.actions.selectDimFile) {
      browserFileRef.current?.click();
      return;
    }
    setBusyAction("dim-select");
    try {
      const preview = await props.actions.selectDimFile();
      if (!preview) return;
      setDimFilePreview(preview);
      setDimOnlinePreview(null);
      setPastePreview(null);
      setIsPasteOpen(false);
      setIsConfirmingClear(false);
      setFeedback({ tone: "success", message: `已识别 ${preview.rule_count} 条 DIM 规则，确认后才会${props.wishlist ? "替换当前" : "启用"} Wishlist。` });
    } catch (error) {
      setFeedback({ tone: "error", message: errorMessage(error, "DIM Wishlist 文件读取失败。") });
    } finally {
      setBusyAction("");
    }
  }

  async function readBrowserFile(file?: File) {
    if (!file) return;
    if (file.size > 128 * 1024 * 1024) {
      setFeedback({ tone: "error", message: "文件超过 128 MB，未读取。" });
      return;
    }
    try {
      const content = await file.text();
      setInputText(content);
      createPastePreview(content, file.name);
      setIsPasteOpen(false);
      setIsConfirmingClear(false);
    } catch (error) {
      setFeedback({ tone: "error", message: errorMessage(error, "文件读取失败。") });
    }
  }

  function createPastePreview(content = inputText, sourceName = "粘贴内容") {
    const parsed = parseDimWishlist(content);
    setPastePreview(parsed.rules.length ? parsed : null);
    setDimFilePreview(null);
    setDimOnlinePreview(null);
    setFeedback(parsed.rules.length
      ? { tone: "success", message: `${sourceName} · 已识别 ${parsed.rules.length} 条规则，确认后才会${props.wishlist ? "替换当前" : "启用"} Wishlist。` }
      : { tone: "error", message: "没有识别到 DIM Wishlist 规则。" });
  }

  async function confirmDimImport() {
    if (!dimFilePreview || !props.actions.confirmDimImport) return;
    setBusyAction("dim-confirm");
    try {
      const saved = await props.actions.confirmDimImport(dimFilePreview.token);
      resetDimInput();
      await refreshDimOnlineStatus();
      finishApplied(`DIM Wishlist 已启用 · ${saved.rules.length} 条规则。`);
    } catch (error) {
      setDimFilePreview(null);
      setFeedback({ tone: "error", message: errorMessage(error, "DIM Wishlist 导入失败。") });
    } finally {
      setBusyAction("");
    }
  }

  async function checkDimOnlineUpdate() {
    if (!props.actions.checkDimOnlineUpdate || isCheckingDimOnline) return;
    setIsCheckingDimOnline(true);
    setFeedback({ tone: "neutral", message: "正在后台检查 DIM 社区推荐；你可以继续使用弹窗内其他入口或关闭此窗口。" });
    try {
      const preview = await withTimeout(
        props.actions.checkDimOnlineUpdate(),
        dimOnlineCheckUiTimeoutMs,
        "检查 DIM 社区推荐超时。当前数据未更改，请关闭窗口后重试，或改用本地 Wishlist 文件。"
      );
      setDimOnlineStatus(preview);
      setDimOnlinePreview(preview.update_available && preview.token ? preview : null);
      setFeedback(preview.update_available
        ? { tone: "success", message: `发现 DIM 社区推荐更新 · ${preview.weapon_count} 把武器、${preview.rule_count} 条规则，确认后才会替换当前数据。` }
        : { tone: "success", message: "DIM 社区推荐已经是最新版本。" });
    } catch (error) {
      setDimOnlinePreview(null);
      setFeedback({ tone: "error", message: errorMessage(error, "DIM 社区推荐更新检查失败。") });
    } finally {
      setIsCheckingDimOnline(false);
    }
  }

  async function confirmDimOnlineUpdate() {
    if (!dimOnlinePreview?.token || !props.actions.confirmDimOnlineUpdate) return;
    setBusyAction("dim-online-confirm");
    try {
      const result = await props.actions.confirmDimOnlineUpdate(dimOnlinePreview.token);
      setDimOnlineStatus(result.status);
      setDimOnlinePreview(null);
      resetDimInput();
      finishApplied(`DIM 社区推荐已更新 · ${result.status.weapon_count} 把武器、${result.status.rule_count} 条规则。`);
    } catch (error) {
      setDimOnlinePreview(null);
      setFeedback({ tone: "error", message: errorMessage(error, "DIM 社区推荐更新失败。") });
    } finally {
      setBusyAction("");
    }
  }

  async function savePastePreview() {
    if (!pastePreview) return;
    setBusyAction("dim-confirm");
    try {
      const saved = await props.actions.save(pastePreview);
      resetDimInput();
      await refreshDimOnlineStatus();
      finishApplied(`DIM Wishlist 已启用 · ${saved.rules.length} 条规则。`);
    } catch (error) {
      setFeedback({ tone: "error", message: errorMessage(error, "DIM Wishlist 保存失败。") });
    } finally {
      setBusyAction("");
    }
  }

  async function exportKnowledgeTemplate() {
    if (!props.actions.exportKnowledgeTemplate) return;
    setBusyAction("knowledge-template");
    try {
      const result = await props.actions.exportKnowledgeTemplate();
      setFeedback({ tone: result.canceled ? "neutral" : "success", message: result.message });
    } catch (error) {
      setFeedback({ tone: "error", message: errorMessage(error, "标准模板导出失败。") });
    } finally {
      setBusyAction("");
    }
  }

  async function selectKnowledgeCsv() {
    if (!props.actions.selectKnowledgeCsv) return;
    setBusyAction("knowledge-select");
    try {
      const preview = await props.actions.selectKnowledgeCsv();
      if (!preview) return;
      setKnowledgePreview(preview);
      setFeedback(preview.blocking_issue_count > 0
        ? { tone: "error", message: `发现 ${preview.blocking_issue_count} 条无法通过官方资料校验的内容，已阻止导入。` }
        : { tone: "success", message: "CSV 已通过格式与官方资料校验，确认后才会替换当前知识库。" });
    } catch (error) {
      setFeedback({ tone: "error", message: errorMessage(error, "知识库 CSV 校验失败。") });
    } finally {
      setBusyAction("");
    }
  }

  async function confirmKnowledgeImport() {
    if (!knowledgePreview?.token || knowledgePreview.blocking_issue_count > 0 || !props.actions.confirmKnowledgeImport) return;
    setBusyAction("knowledge-confirm");
    try {
      const result = await props.actions.confirmKnowledgeImport(knowledgePreview.token);
      setKnowledgePreview(null);
      finishApplied(`武器推荐数据已更新 · ${result.weapon_count} 把武器、${result.recommendation_count} 条来源记录。`);
    } catch (error) {
      setKnowledgePreview(null);
      setFeedback({ tone: "error", message: errorMessage(error, "知识库 CSV 导入失败。") });
    } finally {
      setBusyAction("");
    }
  }

  async function clearWishlist() {
    setBusyAction("dim-clear");
    try {
      await props.actions.clear();
      setIsConfirmingClear(false);
      resetDimInput();
      await refreshDimOnlineStatus();
      setFeedback({ tone: "success", message: "DIM Wishlist 已移除。" });
    } catch (error) {
      setFeedback({ tone: "error", message: errorMessage(error, "DIM Wishlist 移除失败。") });
    } finally {
      setBusyAction("");
    }
  }

  function resetDimInput() {
    setInputText("");
    setPastePreview(null);
    setDimFilePreview(null);
    setDimOnlinePreview(null);
    setIsPasteOpen(false);
    if (browserFileRef.current) browserFileRef.current.value = "";
  }

  const isBusy = Boolean(busyAction);
  const canClose = !isBusy;

  const dialog = (
    <div className="modal-backdrop vault-recommendation-data-backdrop" role="presentation" onClick={() => canClose && props.onClose()}>
    <section ref={dialogRef} className="vault-wishlist-manager" data-surface="dialog" role="dialog" aria-modal="true" aria-labelledby={titleId} aria-busy={isBusy ? "true" : "false"} onClick={(event) => event.stopPropagation()}>
      <header>
        <div>
          <strong id={titleId}>推荐数据</strong>
          <span>中文推荐 CSV 是主要数据；DIM 社区推荐可以从 GitHub 更新，作为额外参考。</span>
        </div>
        <ControlButton size="compact" variant="quiet" disabled={!canClose} onClick={props.onClose}>关闭</ControlButton>
      </header>

      {supportsKnowledgeImport ? (
        <section className="vault-import-section" aria-label="武器推荐知识库 CSV">
          <div className="vault-import-section-head">
            <span><strong>中文武器推荐数据</strong><small>选择发布方提供的“武器推荐.csv”；确认前只校验和预览，不会替换当前数据。</small></span>
            <div className="vault-wishlist-actions">
              <ControlButton data-knowledge-import="" size="compact" variant="primary" disabled={isBusy} onClick={() => void selectKnowledgeCsv()}>{busyAction === "knowledge-select" ? "校验中" : "选择武器推荐.csv"}</ControlButton>
            </div>
          </div>
          {knowledgePreview ? (
            <div className="vault-wishlist-preview" data-surface="frame" data-ui-kind="state-frame">
              <span><strong>{knowledgePreview.file_name}</strong><small>{knowledgePreview.source_labels.join(" / ")}</small></span>
              <span><strong>{knowledgePreview.weapon_count} 把武器</strong><small>{knowledgePreview.recommendation_count} 条记录 · {knowledgePreview.source_count} 个来源</small></span>
              {knowledgePreview.blocking_issue_count > 0 ? (
                <div className="vault-knowledge-import-issues" role="alert">
                  <strong>{knowledgePreview.blocking_issue_count} 条异常，不能导入</strong>
                  {knowledgePreview.blocking_issues.map((issue) => (
                    <small key={`${issue.row_number}-${issue.field}-${issue.value}`}>
                      第 {issue.row_number} 行 · {issue.source_label} · {issue.weapon_name} · {issue.field}“{issue.value}”：{issue.message}
                    </small>
                  ))}
                  {knowledgePreview.blocking_issue_count > knowledgePreview.blocking_issues.length
                    ? <small>这里只显示前 {knowledgePreview.blocking_issues.length} 条，请修改 CSV 后重新选择。</small>
                    : null}
                </div>
              ) : null}
              <ControlButton size="compact" variant="primary" disabled={isBusy || !knowledgePreview.token || knowledgePreview.blocking_issue_count > 0} onClick={() => void confirmKnowledgeImport()}>{busyAction === "knowledge-confirm" ? "导入中" : "确认导入"}</ControlButton>
            </div>
          ) : null}
          <div className="vault-import-secondary-actions">
            <p>制作或维护推荐数据时，可以导出应用标准模板。</p>
            {props.actions.exportKnowledgeTemplate ? <ControlButton size="compact" variant="quiet" disabled={isBusy} onClick={() => void exportKnowledgeTemplate()}>{busyAction === "knowledge-template" ? "导出中" : "导出标准模板"}</ControlButton> : null}
          </div>
        </section>
      ) : null}

      <section className="vault-import-section" aria-label="DIM 社区推荐">
        <div className="vault-import-section-head">
          <span><strong>DIM 社区推荐</strong><small>可直接从上游 GitHub 更新；本地 .txt / .wishlist 文件仍作为离线和自定义入口。</small></span>
          <div className="vault-wishlist-actions">
            <input ref={browserFileRef} hidden type="file" accept=".txt,.wishlist,text/plain" onChange={(event) => void readBrowserFile(event.target.files?.[0])} />
            {supportsDimOnlineUpdate ? <ControlButton data-dim-update="" size="compact" variant="primary" disabled={isBusy || isCheckingDimOnline} aria-busy={isCheckingDimOnline} onClick={() => void checkDimOnlineUpdate()}>{isCheckingDimOnline ? "后台检查中" : "检查社区更新"}</ControlButton> : null}
          </div>
        </div>

        {supportsDimOnlineUpdate && dimOnlineStatus ? (
          <div className="vault-dim-online-status" data-surface="frame" data-ui-kind="state-frame">
            <span>
              <strong>{formatDimInstallLabel(dimOnlineStatus, Boolean(props.wishlist))}</strong>
              <small>{dimOnlineStatus.activated_at ? `启用于 ${formatDateTime(dimOnlineStatus.activated_at)}` : "尚未从社区上游启用"}</small>
            </span>
            <span>
              <strong>{dimOnlineStatus.weapon_count} 把武器</strong>
              <small>{dimOnlineStatus.rule_count} 条规则{dimOnlineStatus.checked_at ? ` · 上次检查 ${formatDateTime(dimOnlineStatus.checked_at)}` : ""}</small>
            </span>
          </div>
        ) : null}

        {dimOnlinePreview ? (
          <div className="vault-wishlist-preview vault-dim-online-preview" data-surface="frame" data-ui-kind="state-frame">
            <span><strong>发现上游版本 {shortRevision(dimOnlinePreview.latest_revision)}</strong><small>{dimOnlinePreview.latest_commit_at ? `提交于 ${formatDateTime(dimOnlinePreview.latest_commit_at)}` : dimOnlinePreview.file_name}</small></span>
            <span><strong>{dimOnlinePreview.rule_count} 条规则</strong><small>{dimOnlinePreview.weapon_count} 把武器 · {formatModeCounts(dimOnlinePreview.mode_counts)}</small></span>
            <ControlButton size="compact" variant="primary" disabled={isBusy} onClick={() => void confirmDimOnlineUpdate()}>{busyAction === "dim-online-confirm" ? "更新中" : props.wishlist ? "确认更新" : "确认启用"}</ControlButton>
          </div>
        ) : null}

        <div className="vault-import-secondary-actions vault-dim-secondary-actions">
          <p>GitHub 不可用或需要导入自定义 Wishlist 时，再使用本地文件或粘贴文本。</p>
          <div className="vault-wishlist-actions">
            <ControlButton size="compact" variant="secondary" disabled={isBusy} onClick={() => void selectDimFile()}>{busyAction === "dim-select" ? "读取中" : "选择 DIM 文件"}</ControlButton>
            <ControlButton size="compact" variant="quiet" disabled={isBusy} onClick={() => { setIsPasteOpen((current) => !current); setIsConfirmingClear(false); }}>粘贴文本</ControlButton>
            {props.wishlist ? <ControlButton size="compact" variant="quiet" disabled={isBusy} onClick={() => { setIsConfirmingClear(true); setIsPasteOpen(false); }}>移除当前 Wishlist</ControlButton> : null}
          </div>
          {isPasteOpen ? (
            <div className="vault-wishlist-paste">
              <label><span>Wishlist 文本</span><textarea rows={6} value={inputText} placeholder="粘贴 DIM Wishlist 内容" onChange={(event) => { setInputText(event.target.value); setPastePreview(null); setDimFilePreview(null); setFeedback(null); }} /></label>
              <ControlButton size="compact" variant="secondary" disabled={!inputText.trim() || isBusy} onClick={() => createPastePreview()}>解析预览</ControlButton>
            </div>
          ) : null}
        </div>

        {dimFilePreview ? (
          <div className="vault-wishlist-preview" data-surface="frame" data-ui-kind="state-frame">
            <span><strong>{dimFilePreview.title}</strong><small>{dimFilePreview.file_name}</small></span>
            <span><strong>{dimFilePreview.rule_count} 条规则</strong><small>{dimFilePreview.weapon_count} 把武器 · {formatModeCounts(dimFilePreview.mode_counts)}</small></span>
            <ControlButton size="compact" variant="primary" disabled={isBusy} onClick={() => void confirmDimImport()}>{busyAction === "dim-confirm" ? "导入中" : props.wishlist ? "确认替换" : "确认启用"}</ControlButton>
          </div>
        ) : null}

        {pastePreview ? (
          <div className="vault-wishlist-preview" data-surface="frame" data-ui-kind="state-frame">
            <span><strong>{pastePreview.title}</strong><small>粘贴内容</small></span>
            <span><strong>{pastePreview.rules.length} 条规则</strong><small>{formatModes(pastePreview.rules.map((rule) => rule.mode))}</small></span>
            <ControlButton size="compact" variant="primary" disabled={isBusy} onClick={() => void savePastePreview()}>{busyAction === "dim-confirm" ? "保存中" : props.wishlist ? "确认替换" : "确认启用"}</ControlButton>
          </div>
        ) : null}

        {isConfirmingClear ? (
          <div className="vault-wishlist-confirm" data-ui-kind="callout" data-status="warning">
            <span>移除后，仓库和装备详情将不再显示这份 Wishlist 的匹配结果。</span>
            <div><ControlButton size="compact" variant="quiet" disabled={isBusy} onClick={() => setIsConfirmingClear(false)}>取消</ControlButton><ControlButton size="compact" variant="danger" disabled={isBusy} onClick={() => void clearWishlist()}>{busyAction === "dim-clear" ? "移除中" : "确认移除"}</ControlButton></div>
          </div>
        ) : null}
      </section>

      {feedback ? <p className="vault-wishlist-feedback" data-status={feedback.tone} role={feedback.tone === "error" ? "alert" : "status"}>{feedback.message}</p> : null}
    </section>
    </div>
  );
  return portalHost ? createPortal(dialog, portalHost) : dialog;
}

function formatModes(modes: Array<"pve" | "pvp" | "general">): string {
  const labels = Array.from(new Set(modes)).map((mode) => mode === "pve" ? "PVE" : mode === "pvp" ? "PVP" : "通用");
  return labels.length ? labels.join(" / ") : "未标注模式";
}

function formatModeCounts(counts: Record<"pve" | "pvp" | "general", number>): string {
  return [
    counts.pve ? `PVE ${counts.pve}` : "",
    counts.pvp ? `PVP ${counts.pvp}` : "",
    counts.general ? `通用 ${counts.general}` : ""
  ].filter(Boolean).join(" / ") || "未标注模式";
}

function formatDimInstallLabel(status: VaultDimOnlineStatus, hasWishlist: boolean): string {
  if (status.current_revision) return `当前版本 ${shortRevision(status.current_revision)}`;
  return hasWishlist ? "当前为本地导入版本" : "尚未安装 DIM 社区推荐";
}

function shortRevision(revision: string): string {
  return revision ? revision.slice(0, 8) : "未知";
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium", timeStyle: "short" }).format(date)
    : value;
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), timeoutMs);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}
