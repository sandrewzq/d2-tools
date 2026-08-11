import { useEffect, useId, useRef, useState, type RefObject } from "react";
import { parseDimWishlist, type DimWishlist } from "@d2-tools/core/analysis/wishlistImport";
import {
  parseLocalCommunityRecommendations,
  type LocalCommunityRecommendationTable
} from "@d2-tools/core/community-perks/localCommunityImport";
import { SettingsButton } from "./SettingsButton.js";

type RecommendationSourceKey = "wishlist" | "custom";
type SourceFeedback = { tone: "ready" | "error" | "neutral"; message: string } | null;

export type SettingsRecommendationSourcesSnapshot = {
  wishlist: DimWishlist | null;
  customRules: LocalCommunityRecommendationTable | null;
};

export type SettingsRecommendationSourcesAdapter = {
  load(): Promise<SettingsRecommendationSourcesSnapshot>;
  saveWishlist(wishlist: DimWishlist): Promise<DimWishlist>;
  clearWishlist(): Promise<void>;
  saveCustomRules(table: LocalCommunityRecommendationTable): Promise<LocalCommunityRecommendationTable>;
  clearCustomRules(): Promise<void>;
};

export function SettingsRecommendationSourcesPanel(props: {
  adapter: SettingsRecommendationSourcesAdapter;
  text?: (value: string) => string;
}) {
  const text = props.text ?? ((value: string) => value);
  const panelId = useId();
  const wishlistFileRef = useRef<HTMLInputElement>(null);
  const customFileRef = useRef<HTMLInputElement>(null);
  const [snapshot, setSnapshot] = useState<SettingsRecommendationSourcesSnapshot>({ wishlist: null, customRules: null });
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
  const [loadError, setLoadError] = useState("");
  const [activePaste, setActivePaste] = useState<RecommendationSourceKey | null>(null);
  const [pendingClear, setPendingClear] = useState<RecommendationSourceKey | null>(null);
  const [busySource, setBusySource] = useState<RecommendationSourceKey | null>(null);
  const [wishlistDraft, setWishlistDraft] = useState("");
  const [wishlistPreview, setWishlistPreview] = useState<DimWishlist | null>(null);
  const [wishlistFileName, setWishlistFileName] = useState("");
  const [wishlistFeedback, setWishlistFeedback] = useState<SourceFeedback>(null);
  const [customDraft, setCustomDraft] = useState("");
  const [customPreview, setCustomPreview] = useState<LocalCommunityRecommendationTable | null>(null);
  const [customFileName, setCustomFileName] = useState("");
  const [customFeedback, setCustomFeedback] = useState<SourceFeedback>(null);

  useEffect(() => {
    void reload();
  }, [props.adapter]);

  async function reload() {
    setLoadState("loading");
    setLoadError("");
    try {
      setSnapshot(await props.adapter.load());
      setLoadState("ready");
    } catch (error) {
      setLoadState("error");
      setLoadError(error instanceof Error ? error.message : text("推荐来源读取失败"));
    }
  }

  function togglePaste(source: RecommendationSourceKey) {
    setActivePaste((current) => current === source ? null : source);
    setPendingClear(null);
  }

  async function importFile(source: RecommendationSourceKey, file?: File) {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setFeedback(source, { tone: "error", message: text("文件超过 2 MB，未读取。") });
      return;
    }
    try {
      const content = await file.text();
      if (source === "wishlist") {
        setWishlistDraft(content);
        setWishlistFileName(file.name);
        createWishlistPreview(content, file.name);
      } else {
        setCustomDraft(content);
        setCustomFileName(file.name);
        createCustomPreview(content, file.name);
      }
      setActivePaste(null);
      setPendingClear(null);
    } catch (error) {
      setFeedback(source, { tone: "error", message: error instanceof Error ? error.message : text("文件读取失败") });
    }
  }

  function createWishlistPreview(content = wishlistDraft, fileName = wishlistFileName) {
    const parsed = parseDimWishlist(content);
    setWishlistPreview(parsed.rules.length ? parsed : null);
    setWishlistFeedback(parsed.rules.length
      ? { tone: "ready", message: `${fileName ? `${fileName} · ` : ""}${text("已解析")} ${parsed.rules.length} ${text("条规则，确认后才会启用。")}` }
      : { tone: "error", message: text("没有识别到 DIM Wishlist 规则。") });
  }

  function createCustomPreview(content = customDraft, fileName = customFileName) {
    try {
      const parsed = parseLocalCommunityRecommendations(content);
      setCustomPreview(parsed.rules.length ? parsed : null);
      setCustomFeedback(parsed.rules.length
        ? { tone: "ready", message: `${fileName ? `${fileName} · ` : ""}${text("已解析")} ${parsed.rules.length} ${text("条规则，确认后才会启用。")}` }
        : { tone: "error", message: text("没有识别到自定义推荐规则。") });
    } catch (error) {
      setCustomPreview(null);
      setCustomFeedback({ tone: "error", message: error instanceof Error ? error.message : text("自定义推荐规则解析失败") });
    }
  }

  async function save(source: RecommendationSourceKey) {
    setBusySource(source);
    try {
      if (source === "wishlist" && wishlistPreview) {
        const saved = await props.adapter.saveWishlist(wishlistPreview);
        setSnapshot((current) => ({ ...current, wishlist: saved }));
        resetDraft("wishlist");
        setWishlistFeedback({ tone: "ready", message: `${text("DIM Wishlist 已启用")} · ${saved.rules.length} ${text("条规则")}` });
      }
      if (source === "custom" && customPreview) {
        const saved = await props.adapter.saveCustomRules(customPreview);
        setSnapshot((current) => ({ ...current, customRules: saved }));
        resetDraft("custom");
        setCustomFeedback({ tone: "ready", message: `${text("自定义推荐规则已启用")} · ${saved.rules.length} ${text("条规则")}` });
      }
    } catch (error) {
      setFeedback(source, { tone: "error", message: error instanceof Error ? error.message : text("推荐来源保存失败") });
    } finally {
      setBusySource(null);
    }
  }

  async function clear(source: RecommendationSourceKey) {
    setBusySource(source);
    try {
      if (source === "wishlist") {
        await props.adapter.clearWishlist();
        setSnapshot((current) => ({ ...current, wishlist: null }));
        setWishlistFeedback({ tone: "ready", message: text("DIM Wishlist 已移除。") });
      } else {
        await props.adapter.clearCustomRules();
        setSnapshot((current) => ({ ...current, customRules: null }));
        setCustomFeedback({ tone: "ready", message: text("自定义推荐规则已移除。") });
      }
      setPendingClear(null);
    } catch (error) {
      setFeedback(source, { tone: "error", message: error instanceof Error ? error.message : text("推荐来源移除失败") });
    } finally {
      setBusySource(null);
    }
  }

  function resetDraft(source: RecommendationSourceKey) {
    setActivePaste(null);
    if (source === "wishlist") {
      setWishlistDraft("");
      setWishlistPreview(null);
      setWishlistFileName("");
      if (wishlistFileRef.current) wishlistFileRef.current.value = "";
    } else {
      setCustomDraft("");
      setCustomPreview(null);
      setCustomFileName("");
      if (customFileRef.current) customFileRef.current.value = "";
    }
  }

  function setFeedback(source: RecommendationSourceKey, feedback: SourceFeedback) {
    if (source === "wishlist") setWishlistFeedback(feedback);
    else setCustomFeedback(feedback);
  }

  if (loadState === "loading") {
    return <div className="settings-empty" data-surface="empty" data-ui-part="state">{text("正在读取推荐来源...")}</div>;
  }

  if (loadState === "error") {
    return <div className="settings-source-error" data-ui-kind="callout" data-status="error" role="alert"><span>{loadError}</span><SettingsButton onClick={() => void reload()}>{text("重新读取")}</SettingsButton></div>;
  }

  return (
    <div className="settings-source-list" data-surface="list">
      <RecommendationSourceRow
        id={`${panelId}-wishlist`}
        title="DIM Wishlist"
        description={text("来自 DIM 的外部愿望单证据")}
        summary={formatSourceSummary(snapshot.wishlist, text("尚未配置"), text)}
        enabled={Boolean(snapshot.wishlist)}
        preview={wishlistPreview ? { title: wishlistPreview.title, rules: wishlistPreview.rules } : null}
        pasteOpen={activePaste === "wishlist"}
        pendingClear={pendingClear === "wishlist"}
        busy={busySource === "wishlist"}
        draft={wishlistDraft}
        feedback={wishlistFeedback}
        accept=".txt,.wishlist,text/plain"
        fileRef={wishlistFileRef}
        text={text}
        onFile={(file) => void importFile("wishlist", file)}
        onPasteToggle={() => togglePaste("wishlist")}
        onDraftChange={(value) => { setWishlistDraft(value); setWishlistPreview(null); setWishlistFileName(""); setWishlistFeedback(null); }}
        onPreview={() => createWishlistPreview()}
        onSave={() => void save("wishlist")}
        onRequestClear={() => { setActivePaste(null); setPendingClear("wishlist"); }}
        onClear={() => void clear("wishlist")}
        onCancelClear={() => setPendingClear(null)}
      />
      <RecommendationSourceRow
        id={`${panelId}-custom`}
        title={text("自定义推荐规则")}
        description={text("本机维护的第三方或个人规则，不联网获取")}
        summary={formatSourceSummary(snapshot.customRules, text("尚未配置"), text)}
        enabled={Boolean(snapshot.customRules)}
        preview={customPreview ? { title: customPreview.title, rules: customPreview.rules } : null}
        pasteOpen={activePaste === "custom"}
        pendingClear={pendingClear === "custom"}
        busy={busySource === "custom"}
        draft={customDraft}
        feedback={customFeedback}
        accept=".json,.csv,application/json,text/csv,text/plain"
        fileRef={customFileRef}
        text={text}
        onFile={(file) => void importFile("custom", file)}
        onPasteToggle={() => togglePaste("custom")}
        onDraftChange={(value) => { setCustomDraft(value); setCustomPreview(null); setCustomFileName(""); setCustomFeedback(null); }}
        onPreview={() => createCustomPreview()}
        onSave={() => void save("custom")}
        onRequestClear={() => { setActivePaste(null); setPendingClear("custom"); }}
        onClear={() => void clear("custom")}
        onCancelClear={() => setPendingClear(null)}
      />
    </div>
  );
}

function RecommendationSourceRow(props: {
  id: string;
  title: string;
  description: string;
  summary: string;
  enabled: boolean;
  preview: { title: string; rules: Array<{ mode: "pve" | "pvp" | "general" }> } | null;
  pasteOpen: boolean;
  pendingClear: boolean;
  busy: boolean;
  draft: string;
  feedback: SourceFeedback;
  accept: string;
  fileRef: RefObject<HTMLInputElement | null>;
  text: (value: string) => string;
  onFile: (file?: File) => void;
  onPasteToggle: () => void;
  onDraftChange: (value: string) => void;
  onPreview: () => void;
  onSave: () => void;
  onRequestClear: () => void;
  onClear: () => void;
  onCancelClear: () => void;
}) {
  return (
    <section className="settings-source-row" data-surface="row">
      <div className="settings-source-summary">
        <div className="settings-source-identity"><strong>{props.title}</strong><p>{props.description}</p></div>
        <div className="settings-source-state"><span className="settings-status-badge" data-ui-kind="status-chip" data-status={props.enabled ? "success" : "neutral"}>{props.enabled ? props.text("已启用") : props.text("未配置")}</span><span>{props.summary}</span></div>
        <div className="settings-source-actions">
          <input ref={props.fileRef} className="settings-source-file" type="file" accept={props.accept} onChange={(event) => props.onFile(event.target.files?.[0])} />
          <SettingsButton disabled={props.busy} onClick={() => props.fileRef.current?.click()}>{props.enabled ? props.text("替换文件") : props.text("选择文件")}</SettingsButton>
          <SettingsButton data-control-variant="quiet" disabled={props.busy} aria-expanded={props.pasteOpen} aria-controls={`${props.id}-paste`} onClick={props.onPasteToggle}>{props.pasteOpen ? props.text("收起粘贴") : props.text("粘贴文本")}</SettingsButton>
          {props.enabled ? <SettingsButton data-control-variant="quiet" disabled={props.busy} onClick={props.onRequestClear}>{props.text("移除")}</SettingsButton> : null}
        </div>
      </div>
      {props.pasteOpen ? <div className="settings-source-paste" id={`${props.id}-paste`}><textarea value={props.draft} rows={6} placeholder={props.text("粘贴来源文本")} onChange={(event) => props.onDraftChange(event.target.value)} /><SettingsButton disabled={!props.draft.trim() || props.busy} onClick={props.onPreview}>{props.text("生成预览")}</SettingsButton></div> : null}
      {props.preview ? <div className="settings-source-preview" data-ui-kind="state-frame" data-surface="frame"><span>{props.text("待启用预览")}</span><strong>{props.preview.title}</strong><small>{props.preview.rules.length} {props.text("条规则")} · {formatModeSummary(props.preview.rules, props.text)}</small><SettingsButton data-control-variant="primary" disabled={props.busy} aria-busy={props.busy} onClick={props.onSave}>{props.text("启用这份数据")}</SettingsButton></div> : null}
      {props.pendingClear ? <div className="settings-source-confirm" data-ui-kind="callout" data-status="warning" role="alert"><span>{props.text("移除后，仓库和装备详情将不再显示这份来源的推荐证据。")}</span><div><SettingsButton data-control-variant="danger" disabled={props.busy} onClick={props.onClear}>{props.text("确认移除")}</SettingsButton><SettingsButton data-control-variant="quiet" disabled={props.busy} onClick={props.onCancelClear}>{props.text("取消")}</SettingsButton></div></div> : null}
      {props.feedback ? <p className="settings-source-feedback" data-ui-kind="callout" data-ui-part="state" data-status={props.feedback.tone === "ready" ? "success" : props.feedback.tone} role={props.feedback.tone === "error" ? "alert" : "status"}>{props.feedback.message}</p> : null}
    </section>
  );
}

function formatSourceSummary(
  source: { title: string; rules: Array<{ mode: "pve" | "pvp" | "general" }> } | null,
  emptyLabel: string,
  text: (value: string) => string
): string {
  return source ? `${source.title} · ${source.rules.length} ${text("条规则")} · ${formatModeSummary(source.rules, text)}` : emptyLabel;
}

function formatModeSummary(
  rules: Array<{ mode: "pve" | "pvp" | "general" }>,
  text: (value: string) => string
): string {
  const counts = { pve: 0, pvp: 0, general: 0 };
  rules.forEach((rule) => { counts[rule.mode] += 1; });
  return [
    counts.pve ? `PVE ${counts.pve}` : "",
    counts.pvp ? `PVP ${counts.pvp}` : "",
    counts.general ? `${text("通用")} ${counts.general}` : ""
  ].filter(Boolean).join(" / ") || text("未标注模式");
}
