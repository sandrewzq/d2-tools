import { type DimWishlist } from "@d2-tools/core/analysis/wishlistImport";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { ControlButton } from "../control/ControlButton.js";
import { ConfirmationDialog } from "../overlay/ConfirmationDialog.js";
import type { VaultCopy } from "../i18n/types.js";
import { vaultTemplate, vaultText } from "./vaultCopy.js";

export type VaultDimWishlistImportPreview = {
  token: string;
  file_name: string;
  /** 文件自身声明的标题，只作说明展示；来源名由用户输入。 */
  title: string;
  rule_count: number;
  weapon_count: number;
  mode_counts: Record<"pve" | "pvp" | "general", number>;
  authors: string[];
  tags: string[];
  /** 校验后仍然有效的规则数与武器数——写进去的就是这些。 */
  importable_rule_count: number;
  importable_weapon_count: number;
  skipped_row_count: number;
  affected_weapon_count: number;
  skipped_weapon_count: number;
  /** 展开写法的冗余行数：同一把枪按「每栏任选其一」摊开写时多写、内容已被该枪其他行覆盖的行。 */
  merged_row_count: number;
  merged_weapon_count: number;
  issues: Array<{
    category: string;
    line_number: number;
    weapon_name: string;
    perk_name: string;
    message: string;
    raw_line?: string;
  }>;
  issue_count: number;
  /** 从链接读来时带上链接：这份预览确认后按链接来源落库，来源行上以后可以再同步。 */
  source_url?: string;
  final_url?: string;
};

/** 从链接读取的结果：没变化时不该问用户「要不要覆盖」，那会让人以为内容真的变了。 */
export type VaultWishlistLinkReadResult = {
  unchanged: boolean;
  source_url: string;
  /** 内容没变时，告诉用户库里哪一份来源已经是这个内容。 */
  source_name: string;
  preview: VaultDimWishlistImportPreview | null;
};

// 导入身份 = 用户命名的来源名。新建与覆盖是两个显式动作，不存在默认路径。
export type VaultImportTarget = {
  name: string;
  mode: "create" | "overwrite";
};

export type VaultRecommendationDocumentSummary = {
  documentId: string;
  name: string;
  origin: "url" | "file" | "paste";
  importedAt: string;
  sourceCount: number;
  ruleCount: number;
};

export type VaultWeaponKnowledgeImportPreview = {
  token?: string;
  file_name: string;
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

export type VaultRecommendationManagedSource = {
  source_key: string;
  label: string;
  /**
   * 来源格式的面向用户说法（「推荐表格」/「愿望单文本」）。
   *
   * 由服务层按存储里的来源类型算好，界面**照原样显示**：界面不认识任何一种来源格式，
   * 也不许根据来源名、链接或来源键猜——所以这里没有「哪种格式」的判断，只有这一行文字。
   */
  format_label: string;
  state: "active" | "disabled" | "removed";
  configured: boolean;
  rule_count: number;
  weapon_count: number;
  revision: string;
  imported_at: string;
  /** 这份来源当初从哪个链接读来的；本地文件导入没有链接，也就没有「同步」。 */
  source_url?: string;
  /** 这份来源在整个账号里点到多少件（仓库 + 角色身上 + 角色背包 + 邮政官），见服务层同名字段。 */
  affected_instance_count?: number;
  /** 同一件事，只算仓库里那部分——也就是来源清单上那个数字，见服务层同名字段。 */
  vault_instance_count?: number;
  /** 这一行在事实层登记过的全部键（分组键 + 下辖实例键），见服务层同名字段。 */
  fact_keys: string[];
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
  revision: string;
  sources: VaultRecommendationManagedSource[];
  removed_rules: VaultRecommendationManagedRule[];
  /** 「清空已导入的推荐规则」这个动作的对象摘要，由服务层按存储派生。 */
  clear_rule_imports: { configured: boolean; source_count: number; rule_count: number };
  affected_weapon_hashes?: number[];
  /** 本次操作是否改动了一个由导入文档托管的来源，见服务层同名类型。 */
  stored_source_changed?: boolean;
};

export type VaultWishlistActions = {
  listRecommendationDocuments?(): Promise<VaultRecommendationDocumentSummary[]>;
  selectDimFile?(): Promise<VaultDimWishlistImportPreview | null>;
  readWishlistLink?(url: string): Promise<VaultWishlistLinkReadResult>;
  confirmDimImport?(token: string, target: VaultImportTarget): Promise<DimWishlist>;
  exportKnowledgeTemplate?(language?: "zh" | "en"): Promise<{ canceled: boolean; message: string; file_path?: string }>;
  exportKnowledgeCsv?(): Promise<{ canceled: boolean; message: string; file_path?: string }>;
  selectKnowledgeCsv?(): Promise<VaultWeaponKnowledgeImportPreview | null>;
  confirmKnowledgeImport?(token: string, target: VaultImportTarget): Promise<{
    recommendation_count: number;
    weapon_count: number;
    source_count: number;
    skipped_row_count: number;
    imported_row_count: number;
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
  clearImportedRecommendationRules?(): Promise<VaultRecommendationManagementSnapshot>;
};

type ImportFeedback = {
  tone: "success" | "error" | "neutral";
  message: string;
} | null;

/** 弹框的焦点约束：打开时聚焦指定动作，Escape 关闭，Tab 在框内循环。 */
function useModalFocusTrap(
  dialogRef: { current: HTMLElement | null },
  open: boolean,
  busy: boolean,
  initialFocusSelector: string,
  close: () => void
): void {
  // 关闭动作每次渲染都是新函数；放进依赖会让效果每渲染重跑一次，把正在打字的输入框重新聚焦。
  const closeRef = useRef(close);
  closeRef.current = close;
  useEffect(() => {
    if (!open) return;
    const dialog = dialogRef.current;
    dialog?.querySelector<HTMLButtonElement>(initialFocusSelector)?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        if (!busy) closeRef.current();
        return;
      }
      if (event.key !== "Tab" || !dialog) return;
      const focusable = [...dialog.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
      )].filter((element) => !element.hidden && element.getClientRects().length > 0);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable.at(-1)!;
      if (!dialog.contains(document.activeElement)) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown, true);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, [open, busy, initialFocusSelector, dialogRef]);
}

type ManagementConfirmation = {
  kind: "source" | "rule" | "rule-imports";
  title: string;
  description: string;
  confirmLabel: string;
  source?: VaultRecommendationManagedSource;
  sourceState?: "disabled" | "removed";
  rule?: VaultRecommendationManagedRule;
};

export function VaultRecommendationDataPanel(props: {
  copy: VaultCopy;
  actions: VaultWishlistActions;
  showManagement?: boolean;
  onApplied?: (message: string) => void;
  /** 同一页下方还有来源管理面板时用它：导入 / 覆盖 / 移除 / 清空改动了存储，那边要重读一次。 */
  onStoredSourcesChanged?: () => void;
}) {
  const copy = props.copy;
  const importDialogRef = useRef<HTMLElement>(null);
  const linkDialogRef = useRef<HTMLElement>(null);
  const fileDialogRef = useRef<HTMLElement>(null);
  const linkTitleId = useId();
  const importTitleId = useId();
  const fileTitleId = useId();
  const [knowledgeImportOpen, setKnowledgeImportOpen] = useState(false);
  // 愿望单文本的两条路（本地文件 / 用户给的链接）各有一个弹框，同一时刻只开一个：
  // 待确认的预览因此只可能出现在当前开着的那一个框里，不必再记「这份预览是哪条路读来的」。
  const [dimDialog, setDimDialog] = useState<"file" | "link" | null>(null);
  const [linkInput, setLinkInput] = useState("");
  const [dimFilePreview, setDimFilePreview] = useState<VaultDimWishlistImportPreview | null>(null);
  const [importedDocuments, setImportedDocuments] = useState<VaultRecommendationDocumentSummary[]>([]);
  // 待导入来源的名字由用户输入；同一时刻只有一个待确认导入，所以共用一个输入。
  const [importName, setImportName] = useState("");
  const [knowledgePreview, setKnowledgePreview] = useState<VaultWeaponKnowledgeImportPreview | null>(null);
  const [managementSnapshot, setManagementSnapshot] = useState<VaultRecommendationManagementSnapshot | null>(null);
  const [managementLoadState, setManagementLoadState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [selectedSourceKey, setSelectedSourceKey] = useState("");
  const [managedRules, setManagedRules] = useState<VaultRecommendationManagedRule[]>([]);
  const [ruleQuery, setRuleQuery] = useState("");
  const [ruleLoadState, setRuleLoadState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [pendingManagementAction, setPendingManagementAction] = useState<ManagementConfirmation | null>(null);
  const [busyAction, setBusyAction] = useState("");
  const [feedback, setFeedback] = useState<ImportFeedback>(null);
  const onAppliedRef = useRef(props.onApplied);
  onAppliedRef.current = props.onApplied;
  const supportsKnowledgeImport = Boolean(
    props.actions.selectKnowledgeCsv
    && props.actions.confirmKnowledgeImport
  );
  const supportsWishlistLink = Boolean(props.actions.readWishlistLink && props.actions.confirmDimImport);
  const supportsRecommendationManagement = Boolean(
    props.actions.getRecommendationManagement
    && props.actions.listRecommendationRules
    && props.actions.setRecommendationSourceState
    && props.actions.setRecommendationRuleState
    && props.actions.clearImportedRecommendationRules
  );

  // 两个愿望单弹框（本地文件 / 从链接同步）与表格弹框共用同一套焦点约束：打开时聚焦首个动作，Escape 关闭，Tab 在框内循环。
  useModalFocusTrap(importDialogRef, knowledgeImportOpen, Boolean(busyAction), "[data-knowledge-template-zh]", () => setKnowledgeImportOpen(false));
  useModalFocusTrap(linkDialogRef, dimDialog === "link", Boolean(busyAction), "[data-wishlist-link-input]", closeDimDialog);
  useModalFocusTrap(fileDialogRef, dimDialog === "file", Boolean(busyAction), "[data-dim-file-select]", closeDimDialog);

  useEffect(() => {
    if (props.showManagement === false || !supportsRecommendationManagement || !props.actions.getRecommendationManagement) return;
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
        setFeedback({ tone: "error", message: errorMessage(error, vaultText(copy, "推荐来源状态读取失败。")) });
      }
    );
    return () => {
      active = false;
    };
  }, [props.actions.getRecommendationManagement, props.showManagement, supportsRecommendationManagement]);

  useEffect(() => {
    if (props.showManagement === false || !selectedSourceKey || !props.actions.listRecommendationRules) {
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
        setFeedback({ tone: "error", message: errorMessage(error, vaultText(copy, "推荐规则读取失败。")) });
      }
    );
    return () => {
      active = false;
    };
  }, [props.actions.listRecommendationRules, props.showManagement, selectedSourceKey]);

  async function refreshManagementSnapshot() {
    if (props.showManagement === false || !props.actions.getRecommendationManagement) return;
    try {
      setManagementSnapshot(await props.actions.getRecommendationManagement());
      setManagementLoadState("ready");
    } catch {
      setManagementLoadState("error");
    }
  }

  function finishApplied(message: string) {
    onAppliedRef.current?.(message);
  }

  const loadImportedDocuments = useCallback(async () => {
    if (!props.actions.listRecommendationDocuments) return;
    try {
      setImportedDocuments(await props.actions.listRecommendationDocuments());
    } catch {
      // 名字清单只用于冲突判断与逐条移除；读取失败不阻塞导入，冲突判断退化为「无同名」。
    }
  }, [props.actions.listRecommendationDocuments]);

  useEffect(() => {
    void loadImportedDocuments();
  }, [loadImportedDocuments]);

  const existingImportNames = useMemo(
    () => new Set(importedDocuments.map((document) => document.name)),
    [importedDocuments]
  );

  // 名字清单只服务导入本身的冲突判断：按导入名核对启用状态，撞名就要显式选覆盖。
  // 不读来源的格式判别位——CSV 迁入三级模型后，来源类型不再是消费层的判据。
  // 只有本面板自己扛管理面（`showManagement` 不为 false）时才会读到来源快照，页面里这一栏交给下方来源管理。
  const blockedImportSources = useMemo(() => {
    const names = new Set(importedDocuments.map((document) => document.name));
    return (managementSnapshot?.sources ?? []).filter((source) => names.has(source.label) && source.state !== "active");
  }, [managementSnapshot, importedDocuments]);

  function managedSourceNotice(): string {
    if (blockedImportSources.some((source) => source.state === "removed")) return vaultText(copy, "来源仍会保持已移除，需要稍后显式恢复。");
    if (blockedImportSources.some((source) => source.state === "disabled")) return vaultText(copy, "来源仍会保持停用，需要稍后显式启用。");
    return "";
  }

  function appliedNotice(message: string): string {
    if (blockedImportSources.some((source) => source.state === "removed")) return vaultTemplate(copy, "{message} 来源仍保持已移除，尚未参与推荐。", { message });
    if (blockedImportSources.some((source) => source.state === "disabled")) return vaultTemplate(copy, "{message} 来源仍保持停用，尚未参与推荐。", { message });
    return message;
  }

  async function refreshAfterImportChange() {
    await loadImportedDocuments();
    await refreshManagementSnapshot();
    // 本面板只重读自己那部分；同页下方的来源管理持有独立快照，由上层转告它重读。
    props.onStoredSourcesChanged?.();
  }

  // 新建与覆盖都必须先有用户输入的名字；两个动作互斥的可点状态由名字是否撞名决定。
  function importTarget(mode: VaultImportTarget["mode"]): VaultImportTarget | null {
    const name = importName.trim();
    if (!name) {
      setFeedback({ tone: "error", message: vaultText(copy, "请先给这份来源起一个名字。") });
      return null;
    }
    return { name, mode };
  }

  function importAppliedMessage(target: VaultImportTarget, ruleCount: number): string {
    const action = target.mode === "overwrite" ? vaultText(copy, "已覆盖") : vaultText(copy, "已新建");
    return vaultTemplate(copy, "来源「{name}」{action} · {count} 条规则。", { name: target.name, action, count: ruleCount });
  }

  /** 读一份本地愿望单文件。由本地文件弹框里的「选择文件」触发——入口按钮先开框，不直接弹系统选文件对话框。 */
  async function selectDimFile() {
    if (!props.actions.selectDimFile) return;
    setBusyAction("dim-select");
    try {
      const preview = await props.actions.selectDimFile();
      if (!preview) return;
      setDimFilePreview(preview);
      // 名字预填文件名（去扩展名），用户可改；每次导入仍由用户在新建 / 覆盖里二选一。
      setImportName(suggestedImportSourceName(preview.file_name));
      const dimNotice = dimPreviewNotice(copy, preview);
      setFeedback(dimNotice
        ? { tone: preview.skipped_row_count > 0 ? "neutral" : "success", message: vaultTemplate(copy, "已识别 {count} 条可导入的愿望单规则；{notice}。确认名字后选择新建或覆盖。{managed}", { count: preview.importable_rule_count, notice: dimNotice, managed: managedSourceNotice() }) }
        : { tone: "success", message: vaultTemplate(copy, "已识别 {count} 条愿望单规则；确认名字后选择新建或覆盖。{managed}", { count: preview.rule_count, managed: managedSourceNotice() }) });
    } catch (error) {
      setFeedback({ tone: "error", message: errorMessage(error, vaultText(copy, "愿望单文件读取失败。")) });
    } finally {
      setBusyAction("");
    }
  }

  /**
   * 从链接读一份愿望单。**与本地文件同一条流水线**：预览、问题清单、命名与新建 / 覆盖完全一样，
   * 区别只在确认后按链接来源落库（来源行上以后可以再同步）。
   *
   * 返回值只说这一步的结果，不替调用方决定弹框开合：读到了预览要给用户确认（`preview`）、
   * 内容没变没什么可确认（`unchanged`）、没读成（`failed`）。
   */
  async function readWishlistLink(url: string): Promise<"preview" | "unchanged" | "failed"> {
    if (!props.actions.readWishlistLink) return "failed";
    setBusyAction("wishlist-link");
    try {
      const result = await props.actions.readWishlistLink(url);
      if (result.unchanged) {
        setDimFilePreview(null);
        setFeedback({ tone: "success", message: vaultTemplate(copy, "「{name}」已是最新，没有需要写入的内容。", { name: result.source_name || result.source_url }) });
        return "unchanged";
      }
      if (!result.preview) return "failed";
      setDimFilePreview(result.preview);
      // 名字预填：链接里最后一段文件名去掉扩展名；同名来源已存在就只剩「覆盖」可点。
      setImportName(suggestedImportSourceName(result.preview.file_name));
      const linkNotice = dimPreviewNotice(copy, result.preview);
      setFeedback(linkNotice
        ? { tone: result.preview.skipped_row_count > 0 ? "neutral" : "success", message: vaultTemplate(copy, "已从链接读取 {count} 条可导入的愿望单规则；{notice}。确认名字后选择新建或覆盖。{managed}", { count: result.preview.importable_rule_count, notice: linkNotice, managed: managedSourceNotice() }) }
        : { tone: "success", message: vaultTemplate(copy, "已从链接读取 {count} 条愿望单规则；确认名字后选择新建或覆盖。{managed}", { count: result.preview.rule_count, managed: managedSourceNotice() }) });
      return "preview";
    } catch (error) {
      setDimFilePreview(null);
      setFeedback({ tone: "error", message: errorMessage(error, vaultText(copy, "愿望单链接读取失败。")) });
      return "failed";
    } finally {
      setBusyAction("");
    }
  }

  /**
   * 开框＝开始一次新的愿望单导入：上一份还没确认的预览会被放下（它没写进任何数据，
   * 重新读一次即可）。于是「框里那张卡一定是这个框读来的」是个不变量。
   */
  function openDimDialog(which: "file" | "link") {
    setDimFilePreview(null);
    setImportName("");
    setFeedback(null);
    setDimDialog(which);
  }

  /**
   * 关掉弹框＝放弃这次导入：读到的内容不写库，框里那张还没确认的预览卡一并收掉。
   * 关闭按钮、Escape、点遮罩三条关法都走这里，免得漏掉一条、卡片又冒到页面上。
   * 这里不看忙闲——各调用点自己已经挡了（按钮禁用、遮罩与 Escape 判断在忙时不关）。
   */
  function closeDimDialog() {
    setDimDialog(null);
    setDimFilePreview(null);
    setImportName("");
  }

  async function confirmWishlistLink() {
    const url = linkInput.trim();
    if (!url) {
      setFeedback({ tone: "error", message: vaultText(copy, "请先粘贴愿望单文本的链接。") });
      return;
    }
    // 读完**不收弹框**：预览、起名与新建 / 覆盖都在这个框里确认——与表格导入弹框、来源行的「同步」同一个样子。
    // 只有「内容没变」没有可确认的东西，那时把框收掉、只说一句。
    if (await readWishlistLink(url) === "unchanged") closeDimDialog();
  }

  async function confirmDimImport(mode: VaultImportTarget["mode"]) {
    if (!dimFilePreview || !props.actions.confirmDimImport) return;
    const target = importTarget(mode);
    if (!target) return;
    setBusyAction("dim-confirm");
    try {
      const saved = await props.actions.confirmDimImport(dimFilePreview.token, target);
      resetDimInput();
      // 确认完就收框：本地文件与链接两条路都开着自己的框，收的是同一个（当前只可能开着一个）。
      setDimDialog(null);
      await refreshAfterImportChange();
      finishApplied(appliedNotice(importAppliedMessage(target, saved.rules.length)));
    } catch (error) {
      setDimFilePreview(null);
      setFeedback({ tone: "error", message: errorMessage(error, vaultText(copy, "愿望单导入失败。")) });
    } finally {
      setBusyAction("");
    }
  }

  async function exportKnowledgeTemplate(language: "zh" | "en" = "zh") {
    if (!props.actions.exportKnowledgeTemplate) return;
    setBusyAction("knowledge-template");
    try {
      const result = await props.actions.exportKnowledgeTemplate(language);
      setFeedback({ tone: result.canceled ? "neutral" : "success", message: result.message });
    } catch (error) {
      setFeedback({ tone: "error", message: errorMessage(error, vaultText(copy, "标准模板导出失败。")) });
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
      setFeedback({ tone: "error", message: errorMessage(error, vaultText(copy, "可编辑推荐导出失败。")) });
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
      // 预填默认名，用户不必先打字；改成已有来源名即走覆盖。
      setImportName(suggestedImportSourceName(preview.file_name) || preview.source_labels[0]?.trim() || "");
      setFeedback(preview.skipped_row_count > 0
        ? { tone: "neutral", message: vaultTemplate(copy, "发现 {rows} 行异常，将单独忽略；其余 {records} 条记录可以导入。", { rows: preview.skipped_row_count, records: preview.importable_recommendation_count }) }
        : { tone: "success", message: vaultText(copy, "文件已通过校验。来源名已按文件名填好，可改；再选择新建或覆盖同名来源。") });
    } catch (error) {
      setFeedback({ tone: "error", message: errorMessage(error, vaultText(copy, "知识库 CSV 校验失败。")) });
    } finally {
      setBusyAction("");
    }
  }

  async function confirmKnowledgeImport(mode: VaultImportTarget["mode"]) {
    const target = importTarget(mode);
    if (!target || !knowledgePreview?.token || knowledgePreview.importable_recommendation_count === 0 || !props.actions.confirmKnowledgeImport) return;
    setBusyAction("knowledge-confirm");
    try {
      const result = await props.actions.confirmKnowledgeImport(knowledgePreview.token, target);
      setKnowledgePreview(null);
      setImportName("");
      await refreshAfterImportChange();
      finishApplied(vaultTemplate(copy, "{applied}当前库共 {weapons} 把武器，覆盖 {sources} 个来源。", {
        applied: importAppliedMessage(target, result.imported_row_count),
        weapons: result.weapon_count,
        sources: result.source_count
      }));
    } catch (error) {
      setKnowledgePreview(null);
      setFeedback({ tone: "error", message: errorMessage(error, vaultText(copy, "推荐 CSV 导入失败。")) });
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
      setFeedback({ tone: "error", message: errorMessage(error, vaultText(copy, "推荐规则搜索失败。")) });
    }
  }

  async function activateManagedSource(source: VaultRecommendationManagedSource) {
    if (!props.actions.setRecommendationSourceState) return;
    setBusyAction(`source-active:${source.source_key}`);
    try {
      const snapshot = await props.actions.setRecommendationSourceState(source.source_key, "active");
      setManagementSnapshot(snapshot);
      setFeedback({ tone: "success", message: vaultTemplate(copy, "{label}已启用，推荐结果已按当前规则重新核对。", { label: source.label }) });
      await selectOrReloadManagedSource(source.source_key);
    } catch (error) {
      setFeedback({ tone: "error", message: errorMessage(error, vaultText(copy, "推荐来源启用失败。")) });
    } finally {
      setBusyAction("");
    }
  }

  async function restoreManagedRule(rule: VaultRecommendationManagedRule) {
    if (!props.actions.setRecommendationRuleState) return;
    setBusyAction(`rule-active:${rule.rule_stable_id}`);
    try {
      const snapshot = await props.actions.setRecommendationRuleState({
        source_key: rule.source_key,
        rule_stable_id: rule.rule_stable_id,
        state: "active",
        source_revision: rule.source_revision
      });
      setManagementSnapshot(snapshot);
      setFeedback({ tone: "success", message: vaultTemplate(copy, "{source} · {weapon} 的规则已恢复。", { source: rule.source_label, weapon: rule.weapon_name }) });
      await selectOrReloadManagedSource(rule.source_key);
    } catch (error) {
      setFeedback({ tone: "error", message: errorMessage(error, vaultText(copy, "推荐规则恢复失败。")) });
    } finally {
      setBusyAction("");
    }
  }

  async function confirmManagementAction() {
    const pending = pendingManagementAction;
    if (!pending) return;
    setBusyAction(`management-${pending.kind}`);
    try {
      if (pending.kind === "source" && pending.source && pending.sourceState && props.actions.setRecommendationSourceState) {
        const snapshot = await props.actions.setRecommendationSourceState(pending.source.source_key, pending.sourceState);
        setManagementSnapshot(snapshot);
        setFeedback({
          tone: "success",
          message: pending.sourceState === "removed"
            ? vaultTemplate(copy, "{label}已按来源移除；其他来源和玩家本地标记未改变。", { label: pending.source.label })
            : vaultTemplate(copy, "{label}已停用；本地数据仍保留，可随时恢复。", { label: pending.source.label })
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
        setFeedback({ tone: "success", message: vaultTemplate(copy, "{source} · {weapon} 的规则已移除，可在已移除规则中恢复。", { source: pending.rule.source_label, weapon: pending.rule.weapon_name }) });
        await selectOrReloadManagedSource(pending.rule.source_key);
      } else if (pending.kind === "rule-imports" && props.actions.clearImportedRecommendationRules) {
        const snapshot = await props.actions.clearImportedRecommendationRules();
        setManagementSnapshot(snapshot);
        setManagedRules([]);
        await loadImportedDocuments();
        setFeedback({ tone: "success", message: vaultText(copy, "已清空导入的推荐规则；账号装备、玩家标签、备注、锁定和配装均未改变。") });
      }
      setPendingManagementAction(null);
    } catch (error) {
      setFeedback({ tone: "error", message: errorMessage(error, vaultText(copy, "推荐数据操作失败。")) });
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
    setDimFilePreview(null);
    setImportName("");
    setLinkInput("");
  }

  const isBusy = Boolean(busyAction);
  const canClose = !isBusy;
  const selectedManagedSource = managementSnapshot?.sources.find((source) => source.source_key === selectedSourceKey);

  // 愿望单弹框（本地文件 / 链接）开着时这行小字渲染在框内：遮罩是 62% 黑又占满屏幕，
  // 页面底部那句话落在遮罩后面，用户看不见。
  // 表格导入弹框仍把它留在页面上（那是另一件事，没在这次范围内）。
  const feedbackLine = feedback ? (
    <p className="vault-wishlist-feedback" data-status={feedback.tone} role={feedback.tone === "error" ? "alert" : "status"}>{feedback.message}</p>
  ) : null;

  const panel = (
    <section className="vault-recommendation-data-panel" data-surface="section" aria-label={vaultText(copy, "推荐数据")} aria-busy={isBusy ? "true" : "false"}>
      <div className="vault-recommendation-data-head">
        <span>
          <strong>{vaultText(copy, "推荐数据")}</strong>
          <small>{vaultText(copy, "导入后来源立即出现在推荐来源页；作者、规则和证据只在来源详情中查看。")}</small>
        </span>
      </div>

      {props.showManagement !== false && supportsRecommendationManagement ? (
        <section className="vault-import-section vault-recommendation-management" aria-label={vaultText(copy, "推荐来源与规则管理")}>
          <div className="vault-import-section-head">
            <span><strong>{vaultText(copy, "来源管理")}</strong><small>{vaultText(copy, "每个导入文件是一个来源；文件内部的作者 / 清单分组只在详情中显示。")}</small></span>
          </div>
          {managementLoadState === "loading" ? <p className="vault-management-state">{vaultText(copy, "正在读取推荐来源…")}</p> : null}
          {managementLoadState === "error" ? <p className="vault-management-state" role="alert">{vaultText(copy, "推荐来源暂时无法读取，导入与更新入口仍可使用。")}</p> : null}
          {managementSnapshot ? (
            <>
              <div className="vault-managed-source-list" data-surface="list">
                {managementSnapshot.sources.map((source) => (
                  <article className="vault-managed-source" data-surface="row" data-source-state={source.state} key={source.source_key}>
                    <div className="vault-managed-source-select">
                      <span><strong>{source.label}</strong><small>{managedSourceMetaLabel(copy, source)}</small></span>
                      <span title={managedSourceCountsTitle(copy)}><b>{managedSourceRuleLabel(copy, source)}</b><small>{managedSourceWeaponLabel(copy, source)}</small><small>{managedSourceImpactLabel(copy, source)}</small></span>
                    </div>
                    <div className="vault-managed-source-actions">
                      <ControlButton size="compact" variant="secondary" disabled={isBusy} onClick={() => { setSelectedSourceKey((current) => current === source.source_key ? "" : source.source_key); setRuleQuery(""); }}>{vaultText(copy, selectedSourceKey === source.source_key ? "收起详情" : "查看详情")}</ControlButton>
                      {source.state === "active" ? <ControlButton size="compact" variant="quiet" disabled={isBusy} onClick={() => setPendingManagementAction(sourceConfirmation(copy, source, "disabled"))}>{vaultText(copy, "停用")}</ControlButton> : null}
                      {source.state === "disabled" || (source.state === "removed" && source.configured) ? <ControlButton size="compact" variant="secondary" disabled={isBusy} onClick={() => void activateManagedSource(source)}>{vaultText(copy, "启用")}</ControlButton> : null}
                      {source.state !== "removed" && source.configured ? <ControlButton size="compact" variant="danger" disabled={isBusy} onClick={() => setPendingManagementAction(sourceConfirmation(copy, source, "removed"))}>{vaultText(copy, "按来源移除")}</ControlButton> : null}
                    </div>
                  </article>
                ))}
              </div>

              {selectedManagedSource ? (
                <section className="vault-managed-rules" aria-label={vaultTemplate(copy, "{label}规则", { label: selectedManagedSource.label })}>
                  <div className="vault-managed-rules-head">
                    <span><strong>{vaultTemplate(copy, "{label}详情", { label: selectedManagedSource.label })}</strong><small>{selectedManagedSource.configured ? vaultTemplate(copy, "版本 {revision} · 最多显示 200 条规则", { revision: shortRevision(copy, selectedManagedSource.revision) }) : selectedManagedSource.state === "removed" ? vaultText(copy, "来源已移除，重新导入或更新后可显式恢复") : vaultText(copy, "当前未配置")}</small></span>
                    <form onSubmit={(event) => { event.preventDefault(); void searchManagedRules(); }}>
                      <input type="search" value={ruleQuery} onChange={(event) => setRuleQuery(event.target.value)} placeholder={vaultText(copy, "搜索武器或 Perk")} aria-label={vaultTemplate(copy, "搜索{label}规则", { label: selectedManagedSource.label })} />
                      <ControlButton type="submit" size="compact" variant="secondary" disabled={ruleLoadState === "loading"}>{vaultText(copy, "搜索")}</ControlButton>
                    </form>
                  </div>
                  {ruleLoadState === "loading" ? <p className="vault-management-state">{vaultText(copy, "正在读取规则…")}</p> : null}
                  {ruleLoadState === "ready" && !managedRules.length ? <p className="vault-management-state">{vaultText(copy, "当前来源没有匹配的可用规则。")}</p> : null}
                  {managedRules.length ? (
                    <div className="vault-managed-rule-list" data-surface="list">
                      {managedRules.map((rule) => (
                        <article className="vault-managed-rule" data-surface="row" data-rule-state={rule.state} key={`${rule.source_key}:${rule.rule_stable_id}`}>
                          <div>
                            <span className="vault-managed-rule-title"><strong>{rule.weapon_name}</strong><small>{vaultTemplate(copy, "{modes} · 当前账号影响 {count} 件", { modes: formatModes(copy, rule.purposes), count: rule.affected_instance_count ?? 0 })}</small></span>
                            <p>{formatManagedRequirements(copy, rule)}</p>
                            {rule.note ? <small>{rule.note}</small> : null}
                            {rule.review_required ? <em>{vaultText(copy, "来源版本已变化，需要复核后再恢复")}</em> : null}
                          </div>
                          {rule.state === "removed" ? (
                            <ControlButton size="compact" variant="secondary" disabled={isBusy || rule.review_required} onClick={() => void restoreManagedRule(rule)}>{vaultText(copy, "恢复")}</ControlButton>
                          ) : (
                            <ControlButton size="compact" variant="quiet" disabled={isBusy} onClick={() => setPendingManagementAction(ruleConfirmation(copy, rule))}>{vaultText(copy, "移除规则")}</ControlButton>
                          )}
                        </article>
                      ))}
                    </div>
                  ) : null}
                </section>
              ) : null}

              {managementSnapshot.removed_rules.length ? (
                <details className="vault-removed-rules">
                  <summary>{vaultTemplate(copy, "已移除规则（{count}）", { count: managementSnapshot.removed_rules.length })}</summary>
                  <div className="vault-managed-rule-list" data-surface="list">
                    {managementSnapshot.removed_rules.slice(0, 100).map((rule) => (
                      <article className="vault-managed-rule" data-surface="row" data-rule-state="removed" key={`removed:${rule.source_key}:${rule.rule_stable_id}`}>
                        <div><span className="vault-managed-rule-title"><strong>{rule.weapon_name}</strong><small>{rule.source_label}</small></span><p>{rule.review_required ? vaultText(copy, "原规则已变化，需要复核") : formatManagedRequirements(copy, rule)}</p></div>
                        <ControlButton size="compact" variant="secondary" disabled={isBusy || rule.review_required} onClick={() => void restoreManagedRule(rule)}>{vaultText(copy, "恢复")}</ControlButton>
                      </article>
                    ))}
                  </div>
                </details>
              ) : null}

              {managementSnapshot.clear_rule_imports.configured ? (
                <div className="vault-curated-dataset-danger">
                  <span><strong>{vaultText(copy, "清空已导入的推荐规则")}</strong><small>{vaultTemplate(copy, "会移除 {sources} 个导入来源、共 {rules} 条规则；账号装备、玩家标签、备注、锁定和配装不会改变。", { sources: managementSnapshot.clear_rule_imports.source_count, rules: managementSnapshot.clear_rule_imports.rule_count })}</small></span>
                  <ControlButton size="compact" variant="danger" disabled={isBusy} onClick={() => setPendingManagementAction(ruleImportsConfirmation(copy, managementSnapshot))}>{vaultText(copy, "清空规则")}</ControlButton>
                </div>
              ) : null}
            </>
          ) : null}
          {pendingManagementAction ? (
            <ConfirmationDialog
              title={pendingManagementAction.title}
              description={pendingManagementAction.description}
              confirmLabel={pendingManagementAction.confirmLabel}
              cancelLabel={vaultText(copy, "取消")}
              confirmTone="danger"
              isBusy={isBusy}
              onConfirm={() => void confirmManagementAction()}
              onCancel={() => setPendingManagementAction(null)}
            />
          ) : null}
        </section>
      ) : null}

      <div className="vault-import-action-group">
        <h4 className="vault-import-action-group-title">{vaultText(copy, "导入")}</h4>
        <div className="vault-import-action-list" role="group" aria-label={vaultText(copy, "导入推荐数据")}>
          {supportsKnowledgeImport ? (
            <div className="vault-import-action-row">
                <span>
                  <strong>{vaultText(copy, "人工推荐表格")}</strong>
                  <small>{vaultText(copy, "支持 .csv 与 .xlsx 表格文件；列名照模板写即可，上一版模板与旧版文件仍可导入。没有现成表格时可先下载模板。")}</small>
                </span>
                <div className="vault-import-action-buttons">
                  <ControlButton data-knowledge-import="" size="compact" variant="primary" aria-label={vaultText(copy, "导入人工推荐表格")} disabled={isBusy} onClick={() => setKnowledgeImportOpen(true)}>{vaultText(copy, "导入表格文件")}</ControlButton>
                </div>
            </div>
          ) : null}

          <div className="vault-import-action-row">
            <span>
              <strong>{vaultText(copy, "愿望单文本")}</strong>
              <small>{vaultText(copy, "从链接同步，或选择本地 .txt / .wishlist 文件。每次导入都要起名并显式选择新建或覆盖，不会静默写入。")}</small>
            </span>
            <div className="vault-import-action-buttons">
              {supportsWishlistLink ? <ControlButton data-dim-link="" size="compact" variant="primary" disabled={isBusy} onClick={() => openDimDialog("link")}>{vaultText(copy, "从链接同步")}</ControlButton> : null}
              {props.actions.selectDimFile ? <ControlButton data-dim-import="" size="compact" variant="secondary" aria-label={vaultText(copy, "导入愿望单文本文件")} disabled={isBusy} onClick={() => openDimDialog("file")}>{vaultText(copy, "导入文本文件")}</ControlButton> : null}
            </div>
          </div>

          {blockedImportSources.length ? (
            <p className="vault-management-lock" data-ui-kind="callout" data-status="warning">{vaultTemplate(copy, "来源{list}当前{states}。更新或导入只会写入数据，不会静默启用；完成后请在“来源管理”中显式恢复。", {
              list: blockedImportSources.map((source) => `「${source.label}」`).join("、"),
              states: [...new Set(blockedImportSources.map((source) => vaultText(copy, source.state === "removed" ? "已按来源移除" : "已停用")))].join(" / ")
            })}</p>
          ) : null}
        </div>
      </div>

      <div className="vault-import-action-group">
        <h4 className="vault-import-action-group-title">{vaultText(copy, "导出")}</h4>
        <div className="vault-import-action-list" role="group" aria-label={vaultText(copy, "导出推荐数据")}>
          <div className="vault-import-action-row">
            <span>
              <strong>{vaultText(copy, "导出当前推荐")}</strong>
              <small>{vaultText(copy, "把已导入的推荐导出成表格，改完评级、备注或 Perk 后可以再导入覆盖。")}</small>
            </span>
            <div className="vault-import-action-buttons">
              {props.actions.exportKnowledgeCsv ? <ControlButton size="compact" variant="secondary" aria-label={vaultText(copy, "导出当前推荐")} disabled={isBusy} onClick={() => void exportKnowledgeCsv()}>{vaultText(copy, busyAction === "knowledge-export" ? "导出中" : "导出为 CSV")}</ControlButton> : null}
            </div>
          </div>
        </div>
      </div>

      {knowledgeImportOpen && supportsKnowledgeImport ? (
        <div
          className="modal-backdrop vault-recommendation-data-backdrop"
          role="presentation"
          onClick={() => { if (!isBusy) setKnowledgeImportOpen(false); }}
        >
          <section
            ref={importDialogRef}
            className="vault-wishlist-manager vault-knowledge-import-dialog"
            data-surface="dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby={importTitleId}
            aria-busy={isBusy ? "true" : "false"}
            onClick={(event) => event.stopPropagation()}
          >
            <header>
              <div>
                <strong id={importTitleId}>{vaultText(copy, "导入人工推荐表格")}</strong>
                <span>{vaultText(copy, "新建推荐先下载模板填写；已有表格可以直接选择文件。确认前只校验和预览，不会更新当前数据。")}</span>
              </div>
              <ControlButton size="compact" variant="quiet" disabled={isBusy} onClick={() => setKnowledgeImportOpen(false)}>{vaultText(copy, "关闭")}</ControlButton>
            </header>

            <div className="vault-import-steps">
              <div className="vault-import-step">
                <span>
                  <strong>{vaultText(copy, "1. 下载模板（可选）")}</strong>
                  <small>{vaultText(copy, "没有现成表格时，先下载空白模板填写；中英文列名一致，Hash 等系统字段在导入时自动补齐。")}</small>
                </span>
                <div className="vault-import-action-buttons">
                  {props.actions.exportKnowledgeTemplate ? (
                    <>
                      <ControlButton data-knowledge-template-zh="" size="compact" variant="secondary" disabled={isBusy} onClick={() => void exportKnowledgeTemplate("zh")}>{vaultText(copy, busyAction === "knowledge-template" ? "导出中" : "下载中文模板")}</ControlButton>
                      <ControlButton size="compact" variant="secondary" disabled={isBusy} onClick={() => void exportKnowledgeTemplate("en")}>{vaultText(copy, busyAction === "knowledge-template" ? "导出中" : "下载英文模板")}</ControlButton>
                    </>
                  ) : null}
                </div>
              </div>

              <div className="vault-import-step">
                <span>
                  <strong>{vaultText(copy, "2. 选择填好的表格文件")}</strong>
                  <small>{vaultText(copy, "支持 .csv 与 .xlsx；当前模板 12 列，上一版 11 列与旧版 13 列、31 列文件仍可导入。")}</small>
                </span>
                <div className="vault-import-action-buttons">
                  <ControlButton size="compact" variant="primary" disabled={isBusy} onClick={() => void selectKnowledgeCsv()}>{vaultText(copy, busyAction === "knowledge-select" ? "校验中" : "选择表格文件")}</ControlButton>
                </div>
              </div>

              {knowledgePreview ? (
            <div className="vault-wishlist-preview vault-knowledge-import-preview" data-surface="frame" data-ui-kind="state-frame">
              <span><strong>{knowledgePreview.file_name}</strong><small>{knowledgePreview.source_labels.join(" / ")}</small></span>
              <span><strong>{vaultTemplate(copy, "{count} 条可导入", { count: knowledgePreview.importable_recommendation_count })}</strong><small>{vaultTemplate(copy, "{records} 条记录 · {sources} 个来源", { records: knowledgePreview.recommendation_count, sources: knowledgePreview.source_count })}</small></span>
              {knowledgePreview.blocking_issue_count > 0 ? (
                <div className="vault-knowledge-import-issues" role="alert">
                  <strong>{vaultTemplate(copy, "{count} 行异常将忽略", { count: knowledgePreview.skipped_row_count })}</strong>
                  {knowledgePreview.blocking_issues.map((issue) => (
                    <small key={`${issue.row_number}-${issue.field}-${issue.value}`}>
                      {formatKnowledgeIssue(copy, issue)}
                    </small>
                  ))}
                  {knowledgePreview.blocking_issue_count > knowledgePreview.blocking_issues.length
                    ? <small>{vaultTemplate(copy, "这里只显示前 {count} 条异常，其他异常行也会被单独忽略。", { count: knowledgePreview.blocking_issues.length })}</small>
                    : null}
                </div>
              ) : null}
              <ImportIdentityChoice
                copy={copy}
                name={importName}
                existingNames={existingImportNames}
                busyLabel={vaultText(copy, busyAction === "knowledge-confirm" ? "处理中" : "")}
                isBusy={isBusy || !knowledgePreview.token || knowledgePreview.importable_recommendation_count === 0}
                onNameChange={setImportName}
                onConfirm={(mode) => void confirmKnowledgeImport(mode)}
              />
            </div>
              ) : null}
            </div>
          </section>
        </div>
      ) : null}

      {dimDialog === "file" && props.actions.selectDimFile ? (
        <div
          className="modal-backdrop vault-recommendation-data-backdrop"
          role="presentation"
          onClick={() => { if (!isBusy) closeDimDialog(); }}
        >
          <section
            ref={fileDialogRef}
            className="vault-wishlist-manager vault-wishlist-file-dialog"
            data-surface="dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby={fileTitleId}
            aria-busy={isBusy ? "true" : "false"}
            onClick={(event) => event.stopPropagation()}
          >
            <header>
              <div>
                <strong id={fileTitleId}>{vaultText(copy, "导入愿望单文本")}</strong>
                <span>{vaultText(copy, "选择一份本地愿望单文本（DIM 导出的 .txt 或 .wishlist 文件）。读到的内容就在这个框里预览与起名，确认前不会改动当前数据。")}</span>
              </div>
              <ControlButton size="compact" variant="quiet" disabled={isBusy} onClick={closeDimDialog}>{vaultText(copy, "关闭")}</ControlButton>
            </header>

            <div className="vault-import-steps">
              <div className="vault-import-step">
                <span>
                  <strong>{vaultText(copy, "选择愿望单文本文件")}</strong>
                  <small>{vaultText(copy, "支持 DIM 导出的 .txt 与 .wishlist；每次导入都要起名并显式选择新建或覆盖，不会静默写入。")}</small>
                </span>
                <div className="vault-import-action-buttons">
                  <ControlButton data-dim-file-select="" size="compact" variant="primary" disabled={isBusy} onClick={() => void selectDimFile()}>{vaultText(copy, busyAction === "dim-select" ? "读取中" : "选择文件")}</ControlButton>
                </div>
              </div>
            </div>

            {/* 选到的内容就在框里确认：预览、问题行、起名、新建 / 覆盖——与链接弹框、表格导入弹框和来源行的「同步」同一套。 */}
            {dimFilePreview ? (
              <DimImportPreviewCard
                copy={copy}
                preview={dimFilePreview}
                importName={importName}
                existingNames={existingImportNames}
                busyLabel={vaultText(copy, busyAction === "dim-confirm" ? "处理中" : "")}
                isBusy={isBusy || dimFilePreview.importable_rule_count === 0}
                onNameChange={setImportName}
                onConfirm={(mode) => void confirmDimImport(mode)}
              />
            ) : null}
            {feedbackLine}
          </section>
        </div>
      ) : null}

      {dimDialog === "link" && supportsWishlistLink ? (
        <div
          className="modal-backdrop vault-recommendation-data-backdrop"
          role="presentation"
          onClick={() => { if (!isBusy) closeDimDialog(); }}
        >
          <section
            ref={linkDialogRef}
            className="vault-wishlist-manager vault-wishlist-link-dialog"
            data-surface="dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby={linkTitleId}
            aria-busy={isBusy ? "true" : "false"}
            onClick={(event) => event.stopPropagation()}
          >
            <header>
              <div>
                <strong id={linkTitleId}>{vaultText(copy, "从链接同步愿望单")}</strong>
                <span>{vaultText(copy, "粘贴一份愿望单文本的链接（.txt 原始文件地址）。读到的内容就在这个框里预览与起名，确认前不会改动当前数据。")}</span>
              </div>
              <ControlButton size="compact" variant="quiet" disabled={isBusy} onClick={closeDimDialog}>{vaultText(copy, "关闭")}</ControlButton>
            </header>

            <div className="vault-wishlist-link-body">
              <label>
                <span>{vaultText(copy, "愿望单文本链接")}</span>
                <input
                  data-wishlist-link-input=""
                  value={linkInput}
                  placeholder="https://…/wishlist.txt"
                  aria-label={vaultText(copy, "愿望单文本链接")}
                  disabled={isBusy}
                  onChange={(event) => setLinkInput(event.target.value)}
                  onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); void confirmWishlistLink(); } }}
                />
              </label>
              <ControlButton data-wishlist-link-read="" size="compact" variant="primary" disabled={isBusy || !linkInput.trim()} onClick={() => void confirmWishlistLink()}>{vaultText(copy, busyAction === "wishlist-link" ? "读取中" : "读取链接")}</ControlButton>
              <small>{vaultText(copy, "链接会跟着这份来源记下来：以后在「来源管理」里点「同步」，内容有变化时才让你确认覆盖。")}</small>
            </div>

            {/* 读到的内容就在框里确认：预览、起名、新建 / 覆盖——与表格导入弹框和来源行的「同步」同一套。 */}
            {dimFilePreview ? (
              <DimImportPreviewCard
                copy={copy}
                preview={dimFilePreview}
                importName={importName}
                existingNames={existingImportNames}
                busyLabel={vaultText(copy, busyAction === "dim-confirm" ? "处理中" : "")}
                isBusy={isBusy || dimFilePreview.importable_rule_count === 0}
                onNameChange={setImportName}
                onConfirm={(mode) => void confirmDimImport(mode)}
              />
            ) : null}
            {feedbackLine}
          </section>
        </div>
      ) : null}

      {dimDialog === null ? feedbackLine : null}
    </section>
  );
  return panel;
}

/**
 * 愿望单预览卡：本地文件、链接读来的内容与来源行的「同步」共用同一张卡。
 *
 * 「这条内容读了什么、会写进去多少、哪些行不写」全部由服务层算好，卡片只负责展示与命名确认。
 * 它只出现在弹框里（本地文件框 / 链接框 / 来源行同步框）——T68 之前本地文件这条路把卡片摆在
 * 页面导入区，同一个组件被工作区宽度撑到两个弹框的 3 倍宽，看着像「起名样式不一样」。
 */
export function DimImportPreviewCard(props: {
  copy: VaultCopy;
  preview: VaultDimWishlistImportPreview;
  importName: string;
  existingNames: Set<string>;
  busyLabel: string;
  isBusy: boolean;
  onNameChange(value: string): void;
  onConfirm(mode: VaultImportTarget["mode"]): void;
}) {
  const copy = props.copy;
  const preview = props.preview;
  return (
    <div className="vault-wishlist-preview" data-surface="frame" data-ui-kind="state-frame">
      <span>
        <strong>{preview.file_name}</strong>
        <small>
          {preview.source_url
            ? vaultTemplate(copy, "来自链接：{url}", { url: preview.final_url || preview.source_url })
            : preview.title ? vaultTemplate(copy, "文件内声明：{title}", { title: preview.title }) : vaultText(copy, "文件未声明标题")}
        </small>
      </span>
      <span>
        <strong>{vaultTemplate(copy, "{count} 条可导入", { count: preview.importable_rule_count })}</strong>
        <small>
          {vaultTemplate(copy, "{rules} 条规则 · {weapons} 把武器 · {modes}", { rules: preview.rule_count, weapons: preview.weapon_count, modes: formatModeCounts(copy, preview.mode_counts) })}
        </small>
      </span>
      {preview.merged_row_count > 0 ? (
        <div className="vault-wishlist-preview-merged">
          <strong>{vaultTemplate(copy, "{count} 行是展开写法的冗余", { count: preview.merged_row_count })}</strong>
          <small>
            {vaultTemplate(copy, "{count} 把武器写的是一组「每栏任选其一」，摊开写成了多行；这些行写到的 perk 已被同一把枪的其他行覆盖，不写进去也不影响结果。", { count: preview.merged_weapon_count })}
          </small>
        </div>
      ) : null}
      {preview.issue_count > 0 ? (
        <div className="vault-knowledge-import-issues" role="alert">
          <strong>
            {vaultTemplate(copy, "{count} 行有问题将忽略", { count: preview.skipped_row_count })}
            {preview.affected_weapon_count > 0 ? vaultTemplate(copy, "，涉及 {count} 把武器", { count: preview.affected_weapon_count }) : ""}
            {preview.skipped_weapon_count > 0 ? vaultTemplate(copy, "，其中 {count} 把武器的规则整体跳过", { count: preview.skipped_weapon_count }) : ""}
          </strong>
          {preview.issues.map((issue) => (
            <small key={`${issue.line_number}-${issue.category}-${issue.perk_name}`}>
              {formatDimIssue(copy, issue)}
            </small>
          ))}
          {preview.issue_count > preview.issues.length
            ? <small>{vaultTemplate(copy, "这里只显示前 {count} 条，其他问题行也会被单独忽略。", { count: preview.issues.length })}</small>
            : null}
        </div>
      ) : null}
      <ImportIdentityChoice
        copy={copy}
        name={props.importName}
        existingNames={props.existingNames}
        busyLabel={props.busyLabel}
        isBusy={props.isBusy}
        onNameChange={props.onNameChange}
        onConfirm={props.onConfirm}
      />
    </div>
  );
}

/**
 * 愿望单问题行：`第 N 行 · 武器 · Perk：原因（原文：…）`。
 *
 * 拆成「行号 + 若干可缺项的片段」再拼，是因为中英两边的冒号宽度与片段顺序不同；
 * 直接对中文整串做替换会在英文界面拼出中文标点。zh-CN 的拼接结果与迁移前逐字相同。
 */
function formatDimIssue(copy: VaultCopy, issue: VaultDimWishlistImportPreview["issues"][number]): string {
  const head = [
    vaultTemplate(copy, "第 {line} 行", { line: issue.line_number }),
    issue.weapon_name,
    issue.perk_name
  ].filter(Boolean).join(" · ");
  const body = vaultTemplate(copy, "{head}：{message}", { head, message: issue.message });
  return issue.raw_line ? vaultTemplate(copy, "{body}（原文：{raw}）", { body, raw: issue.raw_line }) : body;
}

/** 表格导入的问题行：`第 N 行 · 来源 · 武器 · 字段“值”：原因`。 */
function formatKnowledgeIssue(copy: VaultCopy, issue: VaultWeaponKnowledgeImportPreview["blocking_issues"][number]): string {
  const head = [
    vaultTemplate(copy, "第 {line} 行", { line: issue.row_number }),
    issue.source_label,
    issue.weapon_name,
    issue.field
  ].filter(Boolean).join(" · ");
  return vaultTemplate(copy, "{head}“{value}”：{message}", { head, value: issue.value, message: issue.message });
}

// 导入身份 = 用户输入的名字：新建要求名字不撞名，覆盖要求名字命中已有来源，两者互斥。
// 输入框预填一个默认名（见 suggestedImportSourceName）省去打字，名字本身始终可改。
function ImportIdentityChoice(props: {
  copy: VaultCopy;
  name: string;
  existingNames: Set<string>;
  busyLabel: string;
  isBusy: boolean;
  onNameChange(value: string): void;
  onConfirm(mode: VaultImportTarget["mode"]): void;
}) {
  const copy = props.copy;
  const trimmed = props.name.trim();
  const conflict = trimmed !== "" && props.existingNames.has(trimmed);
  return (
    <div className="vault-import-identity">
      <label>
        <span>{vaultText(copy, "来源名")}</span>
        <input
          value={props.name}
          aria-label={vaultText(copy, "推荐来源名")}
          placeholder={vaultText(copy, "给这份来源起一个名字")}
          onChange={(event) => props.onNameChange(event.target.value)}
        />
      </label>
      <div className="vault-import-identity-actions">
        <ControlButton size="compact" variant="secondary" disabled={props.isBusy || !trimmed || conflict} onClick={() => props.onConfirm("create")}>{props.busyLabel || vaultText(copy, "新建来源")}</ControlButton>
        <ControlButton size="compact" variant="primary" disabled={props.isBusy || !conflict} onClick={() => props.onConfirm("overwrite")}>{props.busyLabel || vaultText(copy, "覆盖同名来源")}</ControlButton>
      </div>
      <small className="vault-import-identity-hint">
        {!trimmed
          ? vaultText(copy, "先起一个名字：新建与覆盖都用它做身份。")
          : conflict
            ? vaultTemplate(copy, "已存在名为「{name}」的来源，只能覆盖（整份全删全增）。", { name: trimmed })
            : vaultTemplate(copy, "「{name}」还没有来源，可以新建。", { name: trimmed })}
      </small>
    </div>
  );
}

/**
 * 默认来源名：取文件名去掉扩展名，取不出东西时退回原名。
 *
 * 只是省去用户打字——名字仍由用户拍板，输入框里随时可改；
 * 改成已有的名字就走覆盖，这也是重复导入同一份表格的常见路径。
 */
export function suggestedImportSourceName(fileName: string): string {
  return fileName.replace(/\.[^.]+$/, "").trim() || fileName.trim();
}

export function managedSourceStateLabel(copy: VaultCopy, source: VaultRecommendationManagedSource): string {
  if (source.state === "removed") return source.configured ? vaultText(copy, "已移除，数据已重新导入，等待恢复") : vaultText(copy, "已按来源移除");
  if (!source.configured) return vaultText(copy, "未配置");
  if (source.state === "disabled") return vaultText(copy, "已停用，本地数据仍保留");
  return source.imported_at
    ? vaultTemplate(copy, "已启用 · {time}", { time: copy.formatDateTime(source.imported_at) })
    : vaultText(copy, "已启用");
}

/**
 * 来源行与详情标题那行小字：「来源格式 · 状态」。
 *
 * 格式名由服务层给出（`format_label`），这里只是把它排在状态前面，**不判断格式**：
 * 界面上没有「哪种格式显示成什么」的逻辑，加一种格式这里一行都不用改。
 * 服务层认不出来源类型时格式名是空串，这时只显示状态。
 */
export function managedSourceMetaLabel(copy: VaultCopy, source: VaultRecommendationManagedSource): string {
  return [source.format_label, managedSourceStateLabel(copy, source)].filter(Boolean).join(" · ");
}

/**
 * 来源行的第一句：这份来源**自己的规模**——写了多少条规则。
 */
export function managedSourceRuleLabel(copy: VaultCopy, source: VaultRecommendationManagedSource): string {
  return vaultTemplate(copy, "{count} 条规则", { count: source.rule_count });
}

/**
 * 来源行的第二句：这份来源**点名了多少把武器**。
 *
 * 「列出」是特意挑的：这一句说的是清单里有什么，**与你有几件无关**。
 * 早先这里写「422 把武器」，看的人会读成「我有 422 把」——而「有」的数量在第三句，
 * 两句并排摆着、谁也不说明自己是什么，就成了「这两个数对不上」。
 *
 * 它与第一句**分成两句**，是为了每句都短到不会折行：数字栏定宽 210px，
 * 拼成「1679 条规则 · 列出 422 把武器」时实测 198px，只剩 12px 余量，
 * 规则数一上万就把「武器」挤到下一行——那正是这一栏要修的毛病。三句各占一行，五位数也放得下。
 */
export function managedSourceWeaponLabel(copy: VaultCopy, source: VaultRecommendationManagedSource): string {
  return vaultTemplate(copy, "列出 {count} 把武器", { count: source.weapon_count });
}

/**
 * 来源行的第三句：这份来源**对你的影响**，两个范围并排写出来。
 *
 * 「仓库」是勾上这份来源后本页会筛出多少件（也就是来源清单上那个数字），
 * 「全账号」还含角色身上、背包与邮政官。两个数本来就不该相等——
 * 只写一个数，用户拿它去和仓库里的数字对、对不上时只会读成程序算错了。
 */
export function managedSourceImpactLabel(copy: VaultCopy, source: VaultRecommendationManagedSource): string {
  return vaultTemplate(copy, "仓库 {vault} 件 / 全账号 {total} 件", {
    vault: source.vault_instance_count ?? 0,
    total: source.affected_instance_count ?? 0
  });
}

/**
 * 上面前两句拼成一句，给详情弹框标题用（那儿是一行通排的文字，不设宽度，不存在折行）。
 * 由它们拼出来而不是另写一遍，措辞就只有一处，改了这里不会漏掉那里。
 */
export function managedSourceScaleLabel(copy: VaultCopy, source: VaultRecommendationManagedSource): string {
  return `${managedSourceRuleLabel(copy, source)} · ${managedSourceWeaponLabel(copy, source)}`;
}

/**
 * 上面三句里的计数各是什么，悬停时原样显示。
 *
 * 计数只在这一处解释：界面别处不必各写一句，说法不一致时用户只会更糊涂。
 */
export function managedSourceCountsTitle(copy: VaultCopy): string {
  return vaultText(copy, "列出：这份来源点名的武器（与你有几件无关）。仓库：勾上它，仓库里能筛出多少件。全账号：再加上角色身上、角色背包与邮政官。");
}

function sourceConfirmation(
  copy: VaultCopy,
  source: VaultRecommendationManagedSource,
  state: "disabled" | "removed"
): ManagementConfirmation {
  const impact = vaultTemplate(copy, "{rules} 条规则、{weapons} 把武器，当前账号约 {count} 件实例受影响", {
    rules: source.rule_count,
    weapons: source.weapon_count,
    count: source.affected_instance_count ?? 0
  });
  if (state === "disabled") {
    return {
      kind: "source",
      title: vaultTemplate(copy, "停用 {label}？", { label: source.label }),
      description: vaultTemplate(copy, "{impact}。规则会停止参与匹配、排序、保护和批量整理；本地数据保留，可立即重新启用。", { impact }),
      confirmLabel: vaultText(copy, "确认停用"),
      source,
      sourceState: state
    };
  }
  return {
    kind: "source",
    title: vaultTemplate(copy, "按来源移除 {label}？", { label: source.label }),
    description: vaultTemplate(copy, "{impact}。本地规则会被删除并保留来源移除记录；重新导入或更新后仍需由你显式恢复。玩家标签、备注、游戏锁定和配装不会改变。", { impact }),
    confirmLabel: vaultText(copy, "确认按源移除"),
    source,
    sourceState: state
  };
}

function ruleConfirmation(copy: VaultCopy, rule: VaultRecommendationManagedRule): ManagementConfirmation {
  return {
    kind: "rule",
    title: vaultTemplate(copy, "移除 {weapon} 的这条规则？", { weapon: rule.weapon_name }),
    description: vaultTemplate(copy, "{source} · {modes} · 当前账号影响 {count} 件 · {requirements}。只停止这一条规则参与结论，发布方原始数据不被改写，可在“已移除规则”中恢复。", {
      source: rule.source_label,
      modes: formatModes(copy, rule.purposes),
      count: rule.affected_instance_count ?? 0,
      requirements: formatManagedRequirements(copy, rule)
    }),
    confirmLabel: vaultText(copy, "确认移除规则"),
    rule
  };
}

function ruleImportsConfirmation(copy: VaultCopy, snapshot: VaultRecommendationManagementSnapshot): ManagementConfirmation {
  const clearance = snapshot.clear_rule_imports;
  return {
    kind: "rule-imports",
    title: vaultText(copy, "清空已导入的推荐规则？"),
    description: vaultTemplate(copy, "将删除 {sources} 个导入来源、共 {rules} 条规则（数据版本 {revision}）。清空后显示未导入，需要重新导入恢复；账号装备、玩家标签、备注、游戏锁定和配装不会改变。", {
      sources: clearance.source_count,
      rules: clearance.rule_count,
      revision: shortRevision(copy, snapshot.revision)
    }),
    confirmLabel: vaultText(copy, "确认清空规则")
  };
}

export function formatManagedRequirements(copy: VaultCopy, rule: VaultRecommendationManagedRule): string {
  if (!rule.requirements.length) return vaultText(copy, "仅推荐这把武器，没有指定 Perk 组合");
  return rule.requirements.map((requirement) => vaultTemplate(copy, "{slot}：{names}", {
    slot: managedRequirementSlotLabel(copy, requirement.slot),
    names: requirement.names.join(" / ") || vaultText(copy, "未解析")
  })).join(" · ");
}

/**
 * 事实层只给中性的槽位键，显示名一律在这里决定。
 * `perk1` / `perk2` 是 DIM 的固定列名，中英界面都照原样显示，所以不进 copy。
 */
function managedRequirementSlotLabel(copy: VaultCopy, slot: string): string {
  switch (slot) {
    case "perk1": return "Perk 1";
    case "perk2": return "Perk 2";
    case "barrel": return vaultText(copy, "第一列");
    case "magazine": return vaultText(copy, "第二列");
    case "masterwork": return vaultText(copy, "大师");
    case "origin": return vaultText(copy, "起源");
    case "combo": return vaultText(copy, "完整组合");
    default: return slot;
  }
}

export function formatModes(copy: VaultCopy, modes: Array<"pve" | "pvp" | "general">): string {
  const labels = Array.from(new Set(modes)).map((mode) => mode === "pve" ? "PVE" : mode === "pvp" ? "PVP" : vaultText(copy, "通用"));
  return labels.length ? labels.join(" / ") : vaultText(copy, "未标注模式");
}

function formatModeCounts(copy: VaultCopy, counts: Record<"pve" | "pvp" | "general", number>): string {
  return [
    counts.pve ? vaultTemplate(copy, "PVE {count}", { count: counts.pve }) : "",
    counts.pvp ? vaultTemplate(copy, "PVP {count}", { count: counts.pvp }) : "",
    counts.general ? vaultTemplate(copy, "通用 {count}", { count: counts.general }) : ""
  ].filter(Boolean).join(" / ") || vaultText(copy, "未标注模式");
}

/**
 * 导入反馈里怎么说「哪些行不写」（T64）。
 *
 * 两件事必须分开说：真笔误（跳过行数）和摊开写法的冗余（展开行数）。后者不是问题——
 * 同一把枪的合集在读取期照常成立，把它并进「有问题的行」会让一份正常文件看起来坏了一大半。
 */
export function dimPreviewNotice(copy: VaultCopy, preview: {
  skipped_row_count: number;
  merged_row_count: number;
}): string {
  return [
    preview.skipped_row_count > 0 ? vaultTemplate(copy, "{count} 行有问题将单独忽略", { count: preview.skipped_row_count }) : "",
    preview.merged_row_count > 0 ? vaultTemplate(copy, "{count} 行是展开写法的冗余，已并入同一把枪的其他行", { count: preview.merged_row_count }) : ""
  ].filter(Boolean).join("；");
}

export function shortRevision(copy: VaultCopy, revision: string): string {
  return revision ? revision.slice(0, 8) : vaultText(copy, "未知");
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}
