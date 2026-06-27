import { createVaultPageWorkspace } from "@d2-tools/app";
import { lazy, useState } from "react";
import { parseDimWishlist } from "@d2-tools/core/analysis/wishlistImport";
import { parseLocalCommunityRecommendations } from "@d2-tools/core/community-perks/localCommunityImport";
import type { LoadoutTemplateLookup } from "../../shared/domain/loadouts/loadoutLookup";
import type {
  AccountItemSummary,
  AccountSummary,
  BatchItemActionResult,
  DimWishlist,
  LocalTargetRules,
  LocalCommunityRecommendationTable,
  SaveVaultTagInput,
  VaultItemMatchInfo,
  VaultTags,
  VaultTagValue
} from "../../api/client";
import { services } from "../../api/services";
import { VaultTargetRulesPanel } from "./VaultTargetRulesPanel";

const VaultPanel = lazy(() =>
  import("../../components/VaultPanel").then((m) => ({ default: m.VaultPanel }))
);

export function VaultPage(props: {
  account: AccountSummary | null;
  isLoadingAccount: boolean;
  accountError: string;
  activeLoadoutLookup: LoadoutTemplateLookup | null;
  activeLoadoutName?: string;
  selectedCharacterId: string;
  writeActionsEnabled: boolean;
  tags: VaultTags;
  openingItemKey: string;
  wishlist: DimWishlist | null;
  localTargetRules: LocalTargetRules;
  communityMatch: Map<number, VaultItemMatchInfo>;
  onContextFactsChange?: (facts: string[]) => void;
  onWishlistChanged: (wishlist: DimWishlist | null) => void;
  onLocalTargetRulesChanged: (rules: LocalTargetRules) => void;
  onLoadAccount: () => void;
  onSaveTagBatch: (inputs: SaveVaultTagInput[]) => void | Promise<void>;
  onBatchUnlock: (items: AccountItemSummary[], targetCharacterId: string) => Promise<string>;
  onBatchTransferToCharacter: (items: AccountItemSummary[], targetCharacterId: string) => Promise<BatchItemActionResult>;
  onOpenItem: (item: AccountItemSummary) => void;
  onSaveTag: (item: AccountItemSummary, tag: VaultTagValue) => void | Promise<void>;
}) {
  const [wishlistImportDraft, setWishlistImportDraft] = useState("");
  const [wishlistImportMessage, setWishlistImportMessage] = useState("");
  const [localCommunityImportDraft, setLocalCommunityImportDraft] = useState("");
  const [localCommunityImportMessage, setLocalCommunityImportMessage] = useState("");
  const [localCommunityTable, setLocalCommunityTable] = useState<LocalCommunityRecommendationTable | null>(null);

  if (!props.account) {
    return (
      <section className="tool-panel vault-dashboard-panel placeholder-panel">
        <div className="section-heading">
          <div>
            <h2>仓库</h2>
            <p>先读取账号数据，然后查看完整仓库列表。</p>
          </div>
          <button type="button" disabled={props.isLoadingAccount} onClick={props.onLoadAccount}>
            {props.isLoadingAccount ? "读取中..." : "读取账号数据"}
          </button>
        </div>
        {props.accountError ? <p className="status-message status-error">{props.accountError}</p> : null}
      </section>
    );
  }

  const workspace = createVaultPageWorkspace({
    account: props.account,
    selectedCharacterId: props.selectedCharacterId,
    activeLoadoutLookup: props.activeLoadoutLookup,
    activeLoadoutName: props.activeLoadoutName,
    tags: props.tags,
    targetRules: props.localTargetRules,
    wishlist: props.wishlist,
    communityMatch: props.communityMatch
  });

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
      const saved = await services.localData.saveDimWishlist(wishlist);
      props.onWishlistChanged(saved);
      setWishlistImportMessage(`已导入 ${saved.rules.length} 条 DIM 愿望单规则：${saved.title}`);
    } catch (error) {
      setWishlistImportMessage(error instanceof Error ? error.message : "DIM 愿望单保存失败");
    }
  }

  async function clearImportedWishlist() {
    try {
      await services.localData.clearDimWishlist();
      props.onWishlistChanged(null);
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
      const saved = await services.localData.saveLocalCommunityRecommendations(table);
      setLocalCommunityTable(saved);
      setLocalCommunityImportMessage(`已导入 ${saved.rules.length} 条本地社区推荐：${saved.title}`);
    } catch (error) {
      setLocalCommunityImportMessage(error instanceof Error ? error.message : "本地社区推荐表保存失败");
    }
  }

  async function clearLocalCommunityDraft() {
    try {
      await services.localData.clearLocalCommunityRecommendations();
      setLocalCommunityTable(null);
      setLocalCommunityImportMessage("已清空本地社区推荐表。");
    } catch (error) {
      setLocalCommunityImportMessage(error instanceof Error ? error.message : "本地社区推荐表清空失败");
    }
  }

  return (
    <>
      <VaultPanel
        items={workspace.vaultItems}
        highlightedItemKeys={workspace.activeLoadoutLookup}
        highlightedLabel={workspace.activeLoadoutName}
        tags={workspace.tags}
        openingItemKey={props.openingItemKey}
        onSaveTagBatch={props.onSaveTagBatch}
        cleanupActions={{
          characters: props.account.characters,
          currentCharacterId: workspace.currentCharacterId,
          currentCharacterLabel: workspace.currentCharacterLabel,
          writeActionsEnabled: props.writeActionsEnabled,
          onBatchUnlock: props.onBatchUnlock,
          onBatchTransferToCharacter: props.onBatchTransferToCharacter
        }}
        wishlist={workspace.wishlist}
        localTargetRules={workspace.targetRules}
        communityMatch={workspace.communityMatch}
        onContextFactsChange={props.onContextFactsChange}
        onOpenItem={props.onOpenItem}
        onSaveTag={props.onSaveTag}
      />
      <VaultTargetRulesPanel
        items={workspace.vaultItems}
        rules={props.localTargetRules}
        onRulesChanged={props.onLocalTargetRulesChanged}
      />
      <section className="vault-dashboard-panel vault-preview wishlist-import-panel">
        <div className="section-heading compact-heading">
          <div>
            <h3>推荐数据导入</h3>
            <p>导入后会影响仓库命中、装备详情和资料库标记，不默认内置未授权社区数据。</p>
          </div>
        </div>
        <label htmlFor="dim-wishlist-import">导入 DIM 愿望单</label>
        <p className="muted-copy">
          {props.wishlist
            ? `当前已启用 ${props.wishlist.title} / ${props.wishlist.rules.length} 条规则`
            : "当前未启用 DIM 愿望单。导入后，仓库评分和装备详情会一起使用这份愿望单。"}
        </p>
        <textarea
          id="dim-wishlist-import"
          value={wishlistImportDraft}
          onChange={(event) => setWishlistImportDraft(event.target.value)}
          placeholder="粘贴 DIM wishlist 文本，例如 dimwishlist:item=123&perks=11,22#notes:PVE"
          rows={4}
        />
        <div className="button-row">
          <button type="button" className="secondary-button" onClick={importWishlistDraft}>
            解析愿望单
          </button>
          <button
            type="button"
            className="secondary-button"
            disabled={!wishlistImportDraft.trim()}
            onClick={() => void saveImportedWishlist()}
          >
            导入并启用
          </button>
          <button type="button" className="secondary-button" disabled={!props.wishlist} onClick={() => void clearImportedWishlist()}>
            清空愿望单
          </button>
          {wishlistImportMessage ? <span className={formatImportStatusClass(wishlistImportMessage)}>{wishlistImportMessage}</span> : null}
        </div>
        <label htmlFor="local-community-import">导入本地社区推荐表</label>
        <p className="muted-copy">
          {localCommunityTable
            ? `当前已启用 ${localCommunityTable.title} / ${localCommunityTable.rules.length} 条规则`
            : "当前未启用本地社区推荐表。支持 JSON 或 CSV，不默认内置未授权社区数据。"}
        </p>
        <textarea
          id="local-community-import"
          value={localCommunityImportDraft}
          onChange={(event) => setLocalCommunityImportDraft(event.target.value)}
          placeholder="粘贴本地社区推荐 JSON 或 CSV"
          rows={4}
        />
        <div className="button-row">
          <button type="button" className="secondary-button" onClick={importLocalCommunityDraft}>
            解析推荐表
          </button>
          <button
            type="button"
            className="secondary-button"
            disabled={!localCommunityImportDraft.trim()}
            onClick={() => void saveLocalCommunityDraft()}
          >
            导入并启用
          </button>
          <button type="button" className="secondary-button" disabled={!localCommunityTable} onClick={() => void clearLocalCommunityDraft()}>
            清空推荐表
          </button>
          {localCommunityImportMessage ? <span className={formatImportStatusClass(localCommunityImportMessage)}>{localCommunityImportMessage}</span> : null}
        </div>
      </section>
    </>
  );
}

function formatImportStatusClass(message: string): string {
  return message.includes("失败") || message.includes("没有识别")
    ? "status-message status-error"
    : "status-message status-ready";
}
