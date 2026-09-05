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
  import_mode: "merge" | "replace";
  recommendation_count: number;
  importable_recommendation_count: number;
  weapon_count: number;
  source_count: number;
  source_labels: string[];
  blocking_issue_count: number;
  skipped_row_count: number;
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

export type VaultRecommendationManagedSource = {
  source_key: string;
  label: string;
  kind: "curated" | "dim";
  state: "active" | "disabled" | "removed";
  configured: boolean;
  rule_count: number;
  weapon_count: number;
  revision: string;
  imported_at: string;
  affected_instance_count?: number;
};

export type VaultRecommendationManagedRule = {
  source_key: string;
  source_label: string;
  rule_stable_id: string;
  weapon_hashes: number[];
  weapon_name: string;
  purposes: Array<"pve" | "pvp" | "general">;
  requirements: Array<{ slot: string; names: string[] }>;
  note: string;
  state: "active" | "removed";
  review_required: boolean;
  source_revision: string;
  reason: string;
  affected_instance_count?: number;
};

export type VaultRecommendationManagementSnapshot = {
  curated_revision: string;
  dim_revision: string;
  sources: VaultRecommendationManagedSource[];
  removed_rules: VaultRecommendationManagedRule[];
  affected_weapon_hashes?: number[];
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
  exportKnowledgeCsv?(): Promise<{ canceled: boolean; message: string; file_path?: string }>;
  selectKnowledgeCsv?(): Promise<VaultWeaponKnowledgeImportPreview | null>;
  confirmKnowledgeImport?(token: string): Promise<{
    recommendation_count: number;
    weapon_count: number;
    source_count: number;
    skipped_row_count: number;
    imported_row_count: number;
    import_mode: "merge" | "replace";
  }>;
  getRecommendationManagement?(): Promise<VaultRecommendationManagementSnapshot>;
  listRecommendationRules?(sourceKey: string, query?: string): Promise<VaultRecommendationManagedRule[]>;
  setRecommendationSourceState?(sourceKey: string, state: "active" | "disabled" | "removed"): Promise<VaultRecommendationManagementSnapshot>;
  setRecommendationRuleState?(input: {
    source_key: string;
    rule_stable_id: string;
    state: "active" | "removed";
    reason?: string;
    source_revision?: string;
  }): Promise<VaultRecommendationManagementSnapshot>;
  clearCuratedRecommendationDataset?(): Promise<VaultRecommendationManagementSnapshot>;
};

type ImportFeedback = {
  tone: "success" | "error" | "neutral";
  message: string;
} | null;

type ManagementConfirmation = {
  kind: "source" | "rule" | "curated";
  title: string;
  description: string;
  confirmLabel: string;
  source?: VaultRecommendationManagedSource;
  sourceState?: "disabled" | "removed";
  rule?: VaultRecommendationManagedRule;
};

export function VaultWishlistManager(props: {
  wishlist?: DimWishlist | null;
  actions: VaultWishlistActions;
  managementLocked?: boolean;
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
  const [managementSnapshot, setManagementSnapshot] = useState<VaultRecommendationManagementSnapshot | null>(null);
  const [managementLoadState, setManagementLoadState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [selectedSourceKey, setSelectedSourceKey] = useState("");
  const [managedRules, setManagedRules] = useState<VaultRecommendationManagedRule[]>([]);
  const [ruleQuery, setRuleQuery] = useState("");
  const [ruleLoadState, setRuleLoadState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [pendingManagementAction, setPendingManagementAction] = useState<ManagementConfirmation | null>(null);
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
  const supportsRecommendationManagement = Boolean(
    props.actions.getRecommendationManagement
    && props.actions.listRecommendationRules
    && props.actions.setRecommendationSourceState
    && props.actions.setRecommendationRuleState
    && props.actions.clearCuratedRecommendationDataset
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

  useEffect(() => {
    if (!supportsRecommendationManagement || !props.actions.getRecommendationManagement) return;
    let active = true;
    setManagementLoadState("loading");
    void props.actions.getRecommendationManagement().then(
      (snapshot) => {
        if (!active) return;
        setManagementSnapshot(snapshot);
        // 来源列表默认只展示汇总；规则明细必须由玩家显式展开。
        setSelectedSourceKey("");
        setManagedRules([]);
        setRuleLoadState("idle");
        setManagementLoadState("ready");
      },
      (error) => {
        if (!active) return;
        setManagementLoadState("error");
        setFeedback({ tone: "error", message: errorMessage(error, "推荐来源状态读取失败。") });
      }
    );
    return () => {
      active = false;
    };
  }, [props.actions, supportsRecommendationManagement]);

  useEffect(() => {
    if (!selectedSourceKey || !props.actions.listRecommendationRules) {
      setManagedRules([]);
      setRuleLoadState("idle");
      return;
    }
    let active = true;
    setRuleLoadState("loading");
    void props.actions.listRecommendationRules(selectedSourceKey).then(
      (rules) => {
        if (!active) return;
        setManagedRules(rules);
        setRuleLoadState("ready");
      },
      (error) => {
        if (!active) return;
        setManagedRules([]);
        setRuleLoadState("error");
        setFeedback({ tone: "error", message: errorMessage(error, "推荐规则读取失败。") });
      }
    );
    return () => {
      active = false;
    };
  }, [props.actions, selectedSourceKey]);

  async function refreshDimOnlineStatus() {
    if (!props.actions.getDimOnlineStatus) return;
    try {
      setDimOnlineStatus(await props.actions.getDimOnlineStatus());
    } catch {
      // 本地状态刷新失败不改变已经完成的导入或清理结果。
    }
  }

  async function refreshManagementSnapshot() {
    if (!props.actions.getRecommendationManagement) return;
    try {
      setManagementSnapshot(await props.actions.getRecommendationManagement());
      setManagementLoadState("ready");
    } catch {
      setManagementLoadState("error");
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
      setFeedback({ tone: "success", message: `已识别 ${preview.rule_count} 条 DIM 规则，确认后才会${props.wishlist ? "替换当前" : "写入本机"} Wishlist。${dimRemovedNotice(managementSnapshot)}` });
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
      ? { tone: "success", message: `${sourceName} · 已识别 ${parsed.rules.length} 条规则，确认后才会${props.wishlist ? "替换当前" : "写入本机"} Wishlist。${dimRemovedNotice(managementSnapshot)}` }
      : { tone: "error", message: "没有识别到 DIM Wishlist 规则。" });
  }

  async function confirmDimImport() {
    if (!dimFilePreview || !props.actions.confirmDimImport) return;
    setBusyAction("dim-confirm");
    try {
      const saved = await props.actions.confirmDimImport(dimFilePreview.token);
      resetDimInput();
      await refreshDimOnlineStatus();
      finishApplied(dimAppliedMessage(managementSnapshot, `DIM Wishlist 已写入 · ${saved.rules.length} 条规则。`));
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
      finishApplied(dimAppliedMessage(managementSnapshot, `DIM 社区推荐已更新 · ${result.status.weapon_count} 把武器、${result.status.rule_count} 条规则。`));
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
      finishApplied(dimAppliedMessage(managementSnapshot, `DIM Wishlist 已写入 · ${saved.rules.length} 条规则。`));
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

  async function exportKnowledgeCsv() {
    if (!props.actions.exportKnowledgeCsv) return;
    setBusyAction("knowledge-export");
    try {
      const result = await props.actions.exportKnowledgeCsv();
      setFeedback({ tone: result.canceled ? "neutral" : "success", message: result.message });
    } catch (error) {
      setFeedback({ tone: "error", message: errorMessage(error, "可编辑推荐导出失败。") });
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
      setFeedback(preview.skipped_row_count > 0
        ? { tone: "neutral", message: `发现 ${preview.skipped_row_count} 行异常，将单独忽略；其余 ${preview.importable_recommendation_count} 条记录可以导入，已有正确数据不会被删除。` }
        : preview.import_mode === "merge"
          ? { tone: "success", message: "玩家简表已通过校验；确认后只新增或更新对应规则，不会删除其他已有推荐。" }
          : { tone: "success", message: "T20 完整数据包已通过校验；确认后会完整替换当前人工推荐数据。" });
    } catch (error) {
      setFeedback({ tone: "error", message: errorMessage(error, "知识库 CSV 校验失败。") });
    } finally {
      setBusyAction("");
    }
  }

  async function confirmKnowledgeImport() {
    if (!knowledgePreview?.token || knowledgePreview.importable_recommendation_count === 0 || !props.actions.confirmKnowledgeImport) return;
    setBusyAction("knowledge-confirm");
    try {
      const result = await props.actions.confirmKnowledgeImport(knowledgePreview.token);
      setKnowledgePreview(null);
      finishApplied(`武器推荐数据已${result.import_mode === "merge" ? "合并更新" : "完整替换"} · 导入 ${result.imported_row_count} 条${result.skipped_row_count > 0 ? `，忽略 ${result.skipped_row_count} 行异常` : ""}。当前库共 ${result.weapon_count} 把武器。`);
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
      await refreshManagementSnapshot();
      setFeedback({ tone: "success", message: "DIM Wishlist 已移除。" });
    } catch (error) {
      setFeedback({ tone: "error", message: errorMessage(error, "DIM Wishlist 移除失败。") });
    } finally {
      setBusyAction("");
    }
  }

  async function searchManagedRules() {
    if (!selectedSourceKey || !props.actions.listRecommendationRules) return;
    setRuleLoadState("loading");
    try {
      setManagedRules(await props.actions.listRecommendationRules(selectedSourceKey, ruleQuery));
      setRuleLoadState("ready");
    } catch (error) {
      setRuleLoadState("error");
      setFeedback({ tone: "error", message: errorMessage(error, "推荐规则搜索失败。") });
    }
  }

  async function activateManagedSource(source: VaultRecommendationManagedSource) {
    if (!props.actions.setRecommendationSourceState || props.managementLocked) return;
    setBusyAction(`source-active:${source.source_key}`);
    try {
      const snapshot = await props.actions.setRecommendationSourceState(source.source_key, "active");
      setManagementSnapshot(snapshot);
      setFeedback({ tone: "success", message: `${source.label}已启用，推荐结果已按当前规则重新核对。` });
      await selectOrReloadManagedSource(source.source_key);
    } catch (error) {
      setFeedback({ tone: "error", message: errorMessage(error, "推荐来源启用失败。") });
    } finally {
      setBusyAction("");
    }
  }

  async function restoreManagedRule(rule: VaultRecommendationManagedRule) {
    if (!props.actions.setRecommendationRuleState || props.managementLocked) return;
    setBusyAction(`rule-active:${rule.rule_stable_id}`);
    try {
      const snapshot = await props.actions.setRecommendationRuleState({
        source_key: rule.source_key,
        rule_stable_id: rule.rule_stable_id,
        state: "active",
        source_revision: rule.source_revision
      });
      setManagementSnapshot(snapshot);
      setFeedback({ tone: "success", message: `${rule.source_label} · ${rule.weapon_name} 的规则已恢复。` });
      await selectOrReloadManagedSource(rule.source_key);
    } catch (error) {
      setFeedback({ tone: "error", message: errorMessage(error, "推荐规则恢复失败。") });
    } finally {
      setBusyAction("");
    }
  }

  async function confirmManagementAction() {
    const pending = pendingManagementAction;
    if (!pending || props.managementLocked) return;
    setBusyAction(`management-${pending.kind}`);
    try {
      if (pending.kind === "source" && pending.source && pending.sourceState && props.actions.setRecommendationSourceState) {
        const snapshot = await props.actions.setRecommendationSourceState(pending.source.source_key, pending.sourceState);
        setManagementSnapshot(snapshot);
        setFeedback({
          tone: "success",
          message: pending.sourceState === "removed"
            ? `${pending.source.label}已按来源移除；其他来源和玩家本地标记未改变。`
            : `${pending.source.label}已停用；本地数据仍保留，可随时恢复。`
        });
        await selectOrReloadManagedSource(pending.source.source_key);
      } else if (pending.kind === "rule" && pending.rule && props.actions.setRecommendationRuleState) {
        const snapshot = await props.actions.setRecommendationRuleState({
          source_key: pending.rule.source_key,
          rule_stable_id: pending.rule.rule_stable_id,
          state: "removed",
          source_revision: pending.rule.source_revision
        });
        setManagementSnapshot(snapshot);
        setFeedback({ tone: "success", message: `${pending.rule.source_label} · ${pending.rule.weapon_name} 的规则已移除，可在已移除规则中恢复。` });
        await selectOrReloadManagedSource(pending.rule.source_key);
      } else if (pending.kind === "curated" && props.actions.clearCuratedRecommendationDataset) {
        const snapshot = await props.actions.clearCuratedRecommendationDataset();
        setManagementSnapshot(snapshot);
        setManagedRules([]);
        setFeedback({ tone: "success", message: "当前中文武器推荐数据已删除；DIM、玩家标签、备注、锁定和配装均未改变。" });
      }
      setPendingManagementAction(null);
    } catch (error) {
      setFeedback({ tone: "error", message: errorMessage(error, "推荐数据操作失败。") });
    } finally {
      setBusyAction("");
    }
  }

  async function reloadSelectedManagedRules(sourceKey = selectedSourceKey) {
    if (!sourceKey || !props.actions.listRecommendationRules) return;
    try {
      setManagedRules(await props.actions.listRecommendationRules(sourceKey, ruleQuery));
      setRuleLoadState("ready");
    } catch {
      setRuleLoadState("error");
    }
  }

  async function selectOrReloadManagedSource(sourceKey: string) {
    if (sourceKey !== selectedSourceKey) {
      setRuleQuery("");
      setSelectedSourceKey(sourceKey);
      return;
    }
    await reloadSelectedManagedRules(sourceKey);
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
  const selectedManagedSource = managementSnapshot?.sources.find((source) => source.source_key === selectedSourceKey);
  const dimManagedSource = managementSnapshot?.sources.find((source) => source.source_key === "dim_wishlist");

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

      {supportsRecommendationManagement ? (
        <section className="vault-import-section vault-recommendation-management" aria-label="推荐来源与规则管理">
          <div className="vault-import-section-head">
            <span><strong>来源与纠错</strong><small>先选择来源；可临时停用、按来源移除，或只移除某一条错误规则。</small></span>
          </div>
          {props.managementLocked ? (
            <p className="vault-management-lock" data-ui-kind="callout" data-status="warning">同名整理还有待应用状态。请先应用或撤销这些状态，再修改推荐来源和规则。</p>
          ) : null}
          {managementLoadState === "loading" ? <p className="vault-management-state">正在读取推荐来源…</p> : null}
          {managementLoadState === "error" ? <p className="vault-management-state" role="alert">推荐来源暂时无法读取，导入与更新入口仍可使用。</p> : null}
          {managementSnapshot ? (
            <>
              <div className="vault-managed-source-list" data-surface="list">
                {managementSnapshot.sources.map((source) => (
                  <article className="vault-managed-source" data-surface="row" data-source-state={source.state} key={source.source_key}>
                    <div className="vault-managed-source-select">
                      <span><strong>{source.label}</strong><small>{managedSourceStateLabel(source)}</small></span>
                      <span><b>{source.rule_count} 条规则</b><small>{source.weapon_count} 把武器 · 当前账号影响 {source.affected_instance_count ?? 0} 件</small></span>
                    </div>
                    <div className="vault-managed-source-actions">
                      <ControlButton size="compact" variant="secondary" disabled={isBusy} onClick={() => { setSelectedSourceKey((current) => current === source.source_key ? "" : source.source_key); setRuleQuery(""); }}>{selectedSourceKey === source.source_key ? "收起规则" : "管理规则"}</ControlButton>
                      {source.state === "active" ? <ControlButton size="compact" variant="quiet" disabled={isBusy || props.managementLocked} onClick={() => setPendingManagementAction(sourceConfirmation(source, "disabled"))}>停用</ControlButton> : null}
                      {source.state === "disabled" || (source.state === "removed" && source.configured) ? <ControlButton size="compact" variant="secondary" disabled={isBusy || props.managementLocked} onClick={() => void activateManagedSource(source)}>启用</ControlButton> : null}
                      {source.state !== "removed" && source.configured ? <ControlButton size="compact" variant="danger" disabled={isBusy || props.managementLocked} onClick={() => setPendingManagementAction(sourceConfirmation(source, "removed"))}>按来源移除</ControlButton> : null}
                    </div>
                  </article>
                ))}
              </div>

              {selectedManagedSource ? (
                <section className="vault-managed-rules" aria-label={`${selectedManagedSource.label}规则`}>
                  <div className="vault-managed-rules-head">
                    <span><strong>{selectedManagedSource.label}规则</strong><small>{selectedManagedSource.configured ? `版本 ${shortRevision(selectedManagedSource.revision)} · 最多显示 200 条` : selectedManagedSource.state === "removed" ? "来源已移除，重新导入或更新后可显式恢复" : "当前未配置"}</small></span>
                    <form onSubmit={(event) => { event.preventDefault(); void searchManagedRules(); }}>
                      <input type="search" value={ruleQuery} onChange={(event) => setRuleQuery(event.target.value)} placeholder="搜索武器或 Perk" aria-label={`搜索${selectedManagedSource.label}规则`} />
                      <ControlButton type="submit" size="compact" variant="secondary" disabled={ruleLoadState === "loading"}>搜索</ControlButton>
                    </form>
                  </div>
                  {ruleLoadState === "loading" ? <p className="vault-management-state">正在读取规则…</p> : null}
                  {ruleLoadState === "ready" && !managedRules.length ? <p className="vault-management-state">当前来源没有匹配的可用规则。</p> : null}
                  {managedRules.length ? (
                    <div className="vault-managed-rule-list" data-surface="list">
                      {managedRules.map((rule) => (
                        <article className="vault-managed-rule" data-surface="row" data-rule-state={rule.state} key={`${rule.source_key}:${rule.rule_stable_id}`}>
                          <div>
                            <span className="vault-managed-rule-title"><strong>{rule.weapon_name}</strong><small>{formatModes(rule.purposes)} · 当前账号影响 {rule.affected_instance_count ?? 0} 件</small></span>
                            <p>{formatManagedRequirements(rule)}</p>
                            {rule.note ? <small>{rule.note}</small> : null}
                            {rule.review_required ? <em>来源版本已变化，需要复核后再恢复</em> : null}
                          </div>
                          {rule.state === "removed" ? (
                            <ControlButton size="compact" variant="secondary" disabled={isBusy || props.managementLocked || rule.review_required} onClick={() => void restoreManagedRule(rule)}>恢复</ControlButton>
                          ) : (
                            <ControlButton size="compact" variant="quiet" disabled={isBusy || props.managementLocked} onClick={() => setPendingManagementAction(ruleConfirmation(rule))}>移除规则</ControlButton>
                          )}
                        </article>
                      ))}
                    </div>
                  ) : null}
                </section>
              ) : null}

              {managementSnapshot.removed_rules.length ? (
                <details className="vault-removed-rules">
                  <summary>已移除规则（{managementSnapshot.removed_rules.length}）</summary>
                  <div className="vault-managed-rule-list" data-surface="list">
                    {managementSnapshot.removed_rules.slice(0, 100).map((rule) => (
                      <article className="vault-managed-rule" data-surface="row" data-rule-state="removed" key={`removed:${rule.source_key}:${rule.rule_stable_id}`}>
                        <div><span className="vault-managed-rule-title"><strong>{rule.weapon_name}</strong><small>{rule.source_label}</small></span><p>{rule.review_required ? "原规则已变化，需要复核" : formatManagedRequirements(rule)}</p></div>
                        <ControlButton size="compact" variant="secondary" disabled={isBusy || props.managementLocked || rule.review_required} onClick={() => void restoreManagedRule(rule)}>恢复</ControlButton>
                      </article>
                    ))}
                  </div>
                </details>
              ) : null}

              {managementSnapshot.sources.some((source) => source.kind === "curated" && source.configured) ? (
                <div className="vault-curated-dataset-danger">
                  <span><strong>删除当前中文推荐数据</strong><small>只删除四个人工来源的当前数据集；DIM、玩家标签、备注、锁定和配装不会改变。</small></span>
                  <ControlButton size="compact" variant="danger" disabled={isBusy || props.managementLocked} onClick={() => setPendingManagementAction(curatedDatasetConfirmation(managementSnapshot))}>删除数据集</ControlButton>
                </div>
              ) : null}
            </>
          ) : null}
          {pendingManagementAction ? (
            <div className="vault-wishlist-confirm vault-management-confirm" data-ui-kind="callout" data-status="warning">
              <span><strong>{pendingManagementAction.title}</strong><small>{pendingManagementAction.description}</small></span>
              <div><ControlButton size="compact" variant="quiet" disabled={isBusy} onClick={() => setPendingManagementAction(null)}>取消</ControlButton><ControlButton size="compact" variant="danger" disabled={isBusy} onClick={() => void confirmManagementAction()}>{isBusy ? "处理中" : pendingManagementAction.confirmLabel}</ControlButton></div>
            </div>
          ) : null}
        </section>
      ) : null}

      {supportsKnowledgeImport ? (
        <section className="vault-import-section" aria-label="武器推荐知识库 CSV">
          <div className="vault-import-section-head">
            <span><strong>中文武器推荐数据</strong><small>支持普通玩家简表；旧版 31 列 T20 完整包仍可兼容导入。确认前只校验和预览，不会更新当前数据。</small></span>
            <div className="vault-wishlist-actions">
              <ControlButton data-knowledge-import="" size="compact" variant="primary" disabled={isBusy} onClick={() => void selectKnowledgeCsv()}>{busyAction === "knowledge-select" ? "校验中" : "选择武器推荐.csv"}</ControlButton>
            </div>
          </div>
          {knowledgePreview ? (
            <div className="vault-wishlist-preview" data-surface="frame" data-ui-kind="state-frame">
              <span><strong>{knowledgePreview.file_name}</strong><small>{knowledgePreview.source_labels.join(" / ")}</small></span>
              <span><strong>{knowledgePreview.importable_recommendation_count} 条可导入</strong><small>{knowledgePreview.recommendation_count} 条记录 · {knowledgePreview.source_count} 个来源 · {knowledgePreview.import_mode === "merge" ? "合并现有推荐" : "完整替换人工推荐"}</small></span>
              {knowledgePreview.blocking_issue_count > 0 ? (
                <div className="vault-knowledge-import-issues" role="alert">
                  <strong>{knowledgePreview.skipped_row_count} 行异常将忽略</strong>
                  {knowledgePreview.blocking_issues.map((issue) => (
                    <small key={`${issue.row_number}-${issue.field}-${issue.value}`}>
                      第 {issue.row_number} 行 · {issue.source_label} · {issue.weapon_name} · {issue.field}“{issue.value}”：{issue.message}
                    </small>
                  ))}
                  {knowledgePreview.blocking_issue_count > knowledgePreview.blocking_issues.length
                    ? <small>这里只显示前 {knowledgePreview.blocking_issues.length} 条异常，其他异常行也会被单独忽略。</small>
                    : null}
                </div>
              ) : null}
              <ControlButton size="compact" variant="primary" disabled={isBusy || !knowledgePreview.token || knowledgePreview.importable_recommendation_count === 0} onClick={() => void confirmKnowledgeImport()}>{busyAction === "knowledge-confirm" ? "导入中" : "确认导入"}</ControlButton>
            </div>
          ) : null}
          <div className="vault-import-secondary-actions">
            <p>普通玩家只需要维护推荐内容；系统字段会在导入时自动补齐。</p>
            {props.actions.exportKnowledgeTemplate ? <ControlButton size="compact" variant="quiet" disabled={isBusy} onClick={() => void exportKnowledgeTemplate()}>{busyAction === "knowledge-template" ? "导出中" : "导出玩家模板"}</ControlButton> : null}
            {props.actions.exportKnowledgeCsv ? <ControlButton size="compact" variant="quiet" disabled={isBusy} onClick={() => void exportKnowledgeCsv()}>{busyAction === "knowledge-export" ? "导出中" : "导出当前推荐"}</ControlButton> : null}
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

        {dimManagedSource && dimManagedSource.state !== "active" ? (
          <p className="vault-management-lock" data-ui-kind="callout" data-status="warning">DIM 来源当前{dimManagedSource.state === "removed" ? "已按来源移除" : "已停用"}。更新或导入只会写入数据，不会静默启用；完成后请在“来源与纠错”中显式恢复。</p>
        ) : null}

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

function dimRemovedNotice(snapshot: VaultRecommendationManagementSnapshot | null): string {
  const state = snapshot?.sources.find((source) => source.source_key === "dim_wishlist")?.state;
  if (state === "removed") return "DIM 来源仍会保持已移除，需要稍后显式恢复。";
  if (state === "disabled") return "DIM 来源仍会保持停用，需要稍后显式启用。";
  return "";
}

function dimAppliedMessage(snapshot: VaultRecommendationManagementSnapshot | null, message: string): string {
  const state = snapshot?.sources.find((source) => source.source_key === "dim_wishlist")?.state;
  if (state === "removed") return `${message} 来源仍保持已移除，尚未参与推荐。`;
  if (state === "disabled") return `${message} 来源仍保持停用，尚未参与推荐。`;
  return message;
}

function managedSourceStateLabel(source: VaultRecommendationManagedSource): string {
  if (source.state === "removed") return source.configured ? "已移除，数据已重新导入，等待恢复" : "已按来源移除";
  if (!source.configured) return "未配置";
  if (source.state === "disabled") return "已停用，本地数据仍保留";
  return source.imported_at ? `已启用 · ${formatDateTime(source.imported_at)}` : "已启用";
}

function sourceConfirmation(
  source: VaultRecommendationManagedSource,
  state: "disabled" | "removed"
): ManagementConfirmation {
  const impact = `${source.rule_count} 条规则、${source.weapon_count} 把武器，当前账号约 ${source.affected_instance_count ?? 0} 件实例受影响`;
  if (state === "disabled") {
    return {
      kind: "source",
      title: `停用 ${source.label}？`,
      description: `${impact}。规则会停止参与匹配、排序、保护和批量整理；本地数据保留，可立即重新启用。`,
      confirmLabel: "确认停用",
      source,
      sourceState: state
    };
  }
  return {
    kind: "source",
    title: `按来源移除 ${source.label}？`,
    description: `${impact}。本地规则会被删除并保留来源移除记录；重新导入或更新后仍需由你显式恢复。玩家标签、备注、游戏锁定和配装不会改变。`,
    confirmLabel: "确认按源移除",
    source,
    sourceState: state
  };
}

function ruleConfirmation(rule: VaultRecommendationManagedRule): ManagementConfirmation {
  return {
    kind: "rule",
    title: `移除 ${rule.weapon_name} 的这条规则？`,
    description: `${rule.source_label} · ${formatModes(rule.purposes)} · 当前账号影响 ${rule.affected_instance_count ?? 0} 件 · ${formatManagedRequirements(rule)}。只停止这一条规则参与结论，发布方原始数据不被改写，可在“已移除规则”中恢复。`,
    confirmLabel: "确认移除规则",
    rule
  };
}

function curatedDatasetConfirmation(snapshot: VaultRecommendationManagementSnapshot): ManagementConfirmation {
  const curated = snapshot.sources.filter((source) => source.kind === "curated" && source.configured);
  const ruleCount = curated.reduce((count, source) => count + source.rule_count, 0);
  const weaponCount = curated.reduce((count, source) => count + source.weapon_count, 0);
  const affectedInstanceCount = curated.reduce((count, source) => count + (source.affected_instance_count ?? 0), 0);
  return {
    kind: "curated",
    title: "删除当前中文武器推荐数据？",
    description: `将删除 ${curated.length} 个已配置人工来源、共 ${ruleCount} 条规则和 ${weaponCount} 条来源武器覆盖，当前账号约 ${affectedInstanceCount} 件实例受影响（数据版本 ${shortRevision(snapshot.curated_revision)}）。删除后显示未配置，需要重新导入恢复；DIM、账号装备、玩家标签、备注、游戏锁定和配装不会改变。`,
    confirmLabel: "确认删除数据集"
  };
}

function formatManagedRequirements(rule: VaultRecommendationManagedRule): string {
  if (!rule.requirements.length) return "仅推荐这把武器，没有指定 Perk 组合";
  return rule.requirements.map((requirement) => `${managedRequirementSlotLabel(requirement.slot)}：${requirement.names.join(" / ") || "未解析"}`).join(" · ");
}

function managedRequirementSlotLabel(slot: string): string {
  const labels: Record<string, string> = {
    perk1: "Perk 1",
    perk2: "Perk 2",
    barrel: "第一列",
    magazine: "第二列",
    masterwork: "大师",
    origin: "起源",
    "DIM 完整组合": "DIM 完整组合"
  };
  return labels[slot] ?? slot;
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
