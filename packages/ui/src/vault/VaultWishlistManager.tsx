import { parseDimWishlist, type DimWishlist } from "@d2-tools/core/analysis/wishlistImport";
import { useRef, useState } from "react";
import { ControlButton } from "../control/ControlButton.js";

export type VaultWishlistActions = {
  save(wishlist: DimWishlist): Promise<DimWishlist>;
  clear(): Promise<void>;
};

type WishlistFeedback = {
  tone: "success" | "error" | "neutral";
  message: string;
} | null;

export function VaultWishlistManager(props: {
  wishlist?: DimWishlist | null;
  actions: VaultWishlistActions;
  onClose: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState("");
  const [fileName, setFileName] = useState("");
  const [preview, setPreview] = useState<DimWishlist | null>(null);
  const [isPasteOpen, setIsPasteOpen] = useState(false);
  const [isConfirmingClear, setIsConfirmingClear] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [feedback, setFeedback] = useState<WishlistFeedback>(null);

  async function readFile(file?: File) {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setFeedback({ tone: "error", message: "文件超过 2 MB，未读取。" });
      return;
    }
    try {
      const content = await file.text();
      setDraft(content);
      setFileName(file.name);
      createPreview(content, file.name);
      setIsPasteOpen(false);
      setIsConfirmingClear(false);
    } catch (error) {
      setFeedback({ tone: "error", message: error instanceof Error ? error.message : "文件读取失败。" });
    }
  }

  function createPreview(content = draft, sourceName = fileName) {
    const parsed = parseDimWishlist(content);
    setPreview(parsed.rules.length ? parsed : null);
    setFeedback(parsed.rules.length
      ? { tone: "success", message: `${sourceName ? `${sourceName} · ` : ""}已识别 ${parsed.rules.length} 条规则，确认后才会${props.wishlist ? "替换当前" : "启用"} Wishlist。` }
      : { tone: "error", message: "没有识别到 DIM Wishlist 规则。" });
  }

  async function savePreview() {
    if (!preview) return;
    setIsBusy(true);
    try {
      const saved = await props.actions.save(preview);
      resetDraft();
      setFeedback({ tone: "success", message: `DIM Wishlist 已启用 · ${saved.rules.length} 条规则。` });
    } catch (error) {
      setFeedback({ tone: "error", message: error instanceof Error ? error.message : "DIM Wishlist 保存失败。" });
    } finally {
      setIsBusy(false);
    }
  }

  async function clearWishlist() {
    setIsBusy(true);
    try {
      await props.actions.clear();
      setIsConfirmingClear(false);
      resetDraft();
      setFeedback({ tone: "success", message: "DIM Wishlist 已移除。" });
    } catch (error) {
      setFeedback({ tone: "error", message: error instanceof Error ? error.message : "DIM Wishlist 移除失败。" });
    } finally {
      setIsBusy(false);
    }
  }

  function resetDraft() {
    setDraft("");
    setFileName("");
    setPreview(null);
    setIsPasteOpen(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <div className="vault-wishlist-manager" data-surface="section" aria-label="DIM Wishlist 导入">
      <header>
        <div>
          <strong>导入 DIM Wishlist</strong>
          <span>用于匹配当前账号武器。导入前先预览，不会读取或替换攻略。</span>
        </div>
        <ControlButton size="compact" variant="quiet" onClick={props.onClose}>收起</ControlButton>
      </header>

      <div className="vault-wishlist-actions">
        <input ref={fileRef} hidden type="file" accept=".txt,.wishlist,text/plain" onChange={(event) => void readFile(event.target.files?.[0])} />
        <ControlButton size="compact" variant="secondary" disabled={isBusy} onClick={() => fileRef.current?.click()}>选择文件</ControlButton>
        <ControlButton size="compact" variant="quiet" disabled={isBusy} onClick={() => { setIsPasteOpen((current) => !current); setIsConfirmingClear(false); }}>粘贴文本</ControlButton>
        {props.wishlist ? <ControlButton size="compact" variant="quiet" disabled={isBusy} onClick={() => { setIsConfirmingClear(true); setIsPasteOpen(false); }}>移除当前 Wishlist</ControlButton> : null}
      </div>

      {isPasteOpen ? (
        <div className="vault-wishlist-paste">
          <label><span>Wishlist 文本</span><textarea rows={6} value={draft} placeholder="粘贴 DIM Wishlist 内容" onChange={(event) => { setDraft(event.target.value); setFileName(""); setPreview(null); setFeedback(null); }} /></label>
          <ControlButton size="compact" variant="secondary" disabled={!draft.trim() || isBusy} onClick={() => createPreview()}>解析预览</ControlButton>
        </div>
      ) : null}

      {preview ? (
        <div className="vault-wishlist-preview" data-surface="frame" data-ui-kind="state-frame">
          <span><strong>{preview.title}</strong><small>{fileName || "粘贴内容"}</small></span>
          <span><strong>{preview.rules.length} 条规则</strong><small>{formatModes(preview.rules.map((rule) => rule.mode))}</small></span>
          <ControlButton size="compact" variant="primary" disabled={isBusy} onClick={() => void savePreview()}>{isBusy ? "保存中" : props.wishlist ? "确认替换" : "确认启用"}</ControlButton>
        </div>
      ) : null}

      {isConfirmingClear ? (
        <div className="vault-wishlist-confirm" data-ui-kind="callout" data-status="warning">
          <span>移除后，仓库和装备详情将不再显示这份 Wishlist 的匹配结果。</span>
          <div><ControlButton size="compact" variant="quiet" disabled={isBusy} onClick={() => setIsConfirmingClear(false)}>取消</ControlButton><ControlButton size="compact" variant="danger" disabled={isBusy} onClick={() => void clearWishlist()}>{isBusy ? "移除中" : "确认移除"}</ControlButton></div>
        </div>
      ) : null}

      {feedback ? <p className="vault-wishlist-feedback" data-status={feedback.tone} role={feedback.tone === "error" ? "alert" : "status"}>{feedback.message}</p> : null}
    </div>
  );
}

function formatModes(modes: Array<"pve" | "pvp" | "general">): string {
  const labels = Array.from(new Set(modes)).map((mode) => mode === "pve" ? "PVE" : mode === "pvp" ? "PVP" : "通用");
  return labels.length ? labels.join(" / ") : "未标注模式";
}
