import { useState } from "react";
import { parseDimWishlist, type DimWishlist } from "@d2-tools/core/analysis/wishlistImport";
import {
  parseLocalCommunityRecommendations,
  type LocalCommunityRecommendationTable
} from "@d2-tools/core/community-perks/localCommunityImport";

export type VaultRecommendationImportActions = {
  localCommunityTable?: LocalCommunityRecommendationTable | null;
  onSaveWishlist?: (wishlist: DimWishlist) => Promise<DimWishlist> | DimWishlist;
  onClearWishlist?: () => Promise<void> | void;
  onSaveLocalCommunity?: (table: LocalCommunityRecommendationTable) => Promise<LocalCommunityRecommendationTable> | LocalCommunityRecommendationTable;
  onClearLocalCommunity?: () => Promise<void> | void;
};

export function VaultRecommendationImportPanel(props: {
  wishlist?: DimWishlist | null;
  actions?: VaultRecommendationImportActions;
}) {
  const [wishlistImportDraft, setWishlistImportDraft] = useState("");
  const [wishlistImportMessage, setWishlistImportMessage] = useState("");
  const [localCommunityImportDraft, setLocalCommunityImportDraft] = useState("");
  const [localCommunityImportMessage, setLocalCommunityImportMessage] = useState("");
  const [localCommunityTable, setLocalCommunityTable] = useState<LocalCommunityRecommendationTable | null>(
    props.actions?.localCommunityTable ?? null
  );

  function importWishlistDraft() {
    const wishlist = parseDimWishlist(wishlistImportDraft);
    setWishlistImportMessage(wishlist.rules.length
      ? `已识别 ${wishlist.rules.length} 条 DIM 愿望单规则：${wishlist.title}`
      : "没有识别到 DIM 愿望单规则。");
  }

  async function saveImportedWishlist() {
    const wishlist = parseDimWishlist(wishlistImportDraft);
    if (!wishlist.rules.length) {
      setWishlistImportMessage("没有识别到 DIM 愿望单规则。");
      return;
    }

    try {
      const saved = props.actions?.onSaveWishlist
        ? await props.actions.onSaveWishlist(wishlist)
        : wishlist;
      setWishlistImportMessage(`已导入 ${saved.rules.length} 条 DIM 愿望单规则：${saved.title}`);
    } catch (error) {
      setWishlistImportMessage(error instanceof Error ? error.message : "DIM 愿望单保存失败");
    }
  }

  async function clearImportedWishlist() {
    try {
      await props.actions?.onClearWishlist?.();
      setWishlistImportMessage("已清空 DIM 愿望单。");
    } catch (error) {
      setWishlistImportMessage(error instanceof Error ? error.message : "DIM 愿望单清空失败");
    }
  }

  function importLocalCommunityDraft() {
    try {
      const table = parseLocalCommunityRecommendations(localCommunityImportDraft);
      setLocalCommunityImportMessage(table.rules.length
        ? `已识别 ${table.rules.length} 条本地社区推荐：${table.title}`
        : "没有识别到本地社区推荐规则。");
    } catch (error) {
      setLocalCommunityImportMessage(error instanceof Error ? error.message : "本地社区推荐表解析失败");
    }
  }

  async function saveLocalCommunityDraft() {
    let table: LocalCommunityRecommendationTable;
    try {
      table = parseLocalCommunityRecommendations(localCommunityImportDraft);
    } catch (error) {
      setLocalCommunityImportMessage(error instanceof Error ? error.message : "本地社区推荐表解析失败");
      return;
    }

    if (!table.rules.length) {
      setLocalCommunityImportMessage("没有识别到本地社区推荐规则。");
      return;
    }

    try {
      const saved = props.actions?.onSaveLocalCommunity
        ? await props.actions.onSaveLocalCommunity(table)
        : table;
      setLocalCommunityTable(saved);
      setLocalCommunityImportMessage(`已导入 ${saved.rules.length} 条本地社区推荐：${saved.title}`);
    } catch (error) {
      setLocalCommunityImportMessage(error instanceof Error ? error.message : "本地社区推荐表保存失败");
    }
  }

  async function clearLocalCommunityDraft() {
    try {
      await props.actions?.onClearLocalCommunity?.();
      setLocalCommunityTable(null);
      setLocalCommunityImportMessage("已清空本地社区推荐表。");
    } catch (error) {
      setLocalCommunityImportMessage(error instanceof Error ? error.message : "本地社区推荐表清空失败");
    }
  }

  return (
    <section className="vault-dashboard-panel vault-preview wishlist-import-panel">
      <div className="vault-source-list">
        <details className="vault-source-row">
          <summary><span><strong>DIM Wishlist</strong><small>{props.wishlist ? `${props.wishlist.title} / ${props.wishlist.rules.length} 条规则` : "当前未导入规则"}</small></span><b>管理</b></summary>
          <div className="vault-source-editor">
            <textarea id="dim-wishlist-import" value={wishlistImportDraft} onChange={(event) => setWishlistImportDraft(event.target.value)} placeholder="粘贴 DIM wishlist 文本，例如 dimwishlist:item=123&perks=11,22#notes:PVE" rows={4} />
            <div className="button-row">
              <button type="button" data-ui-kind="button" data-control-variant="secondary" onClick={importWishlistDraft}>解析愿望单</button>
              <button type="button" data-ui-kind="button" data-control-variant="secondary" disabled={!wishlistImportDraft.trim()} onClick={() => void saveImportedWishlist()}>导入并启用</button>
              <button type="button" data-ui-kind="button" data-control-variant="secondary" disabled={!props.wishlist} onClick={() => void clearImportedWishlist()}>清空愿望单</button>
              {wishlistImportMessage ? <span className={formatImportStatusClass(wishlistImportMessage)}>{wishlistImportMessage}</span> : null}
            </div>
          </div>
        </details>
        <details className="vault-source-row">
          <summary><span><strong>社区推荐</strong><small>{localCommunityTable ? `${localCommunityTable.title} / ${localCommunityTable.rules.length} 条规则` : "当前未导入本地推荐表"}</small></span><b>管理</b></summary>
          <div className="vault-source-editor">
            <textarea id="local-community-import" value={localCommunityImportDraft} onChange={(event) => setLocalCommunityImportDraft(event.target.value)} placeholder="粘贴本地社区推荐 JSON 或 CSV" rows={4} />
            <div className="button-row">
              <button type="button" data-ui-kind="button" data-control-variant="secondary" onClick={importLocalCommunityDraft}>解析推荐表</button>
              <button type="button" data-ui-kind="button" data-control-variant="secondary" disabled={!localCommunityImportDraft.trim()} onClick={() => void saveLocalCommunityDraft()}>导入并启用</button>
              <button type="button" data-ui-kind="button" data-control-variant="secondary" disabled={!localCommunityTable} onClick={() => void clearLocalCommunityDraft()}>清空推荐表</button>
              {localCommunityImportMessage ? <span className={formatImportStatusClass(localCommunityImportMessage)}>{localCommunityImportMessage}</span> : null}
            </div>
          </div>
        </details>
      </div>
    </section>
  );
}

function formatImportStatusClass(message: string): string {
  return message.includes("失败") || message.includes("没有识别")
    ? "status-message status-error"
    : "status-message status-ready";
}
