import { evaluateWishlistRoll } from "@d2-tools/core/analysis/wishlist";
import type {
  AccountSummary,
  ItemActionPlanInput,
  ItemActionResult,
  ItemAiAdviceResult,
  VaultTags,
  VaultTagValue,
  WeaponRecommendation,
  DimWishlist
} from "../../api/client";
import { api } from "../../api/client";
import {
  buildDuplicateGroupBatchTagPlan,
  buildVaultDuplicateSummary
} from "../../components/VaultPanel";
import { resolveItemTransferCharacterId } from "../../utils/itemActions";
import { buildSameNameSourceStats } from "../../utils/sameName";
import {
  getItemKey,
  selectedItemToAccountItem,
  type SameNameItemSummary,
  type SelectedItemDetail,
  type SelectedItemSource
} from "../hooks/useItemDetail";

export type ItemDetailModalProps = {
  accountSummary: AccountSummary | null;
  aiSettingsEnableLightgg: boolean;
  communityRecommendations: WeaponRecommendation | null;
  importedWishlist: DimWishlist | null;
  isCommunityRecommendationsLoading: boolean;
  isGeneratingItemAi: boolean;
  isRunningItemAction: boolean;
  itemAiError: string;
  itemAiResult: ItemAiAdviceResult | null;
  itemNoteDraft: string;
  itemNoteMessage: string;
  itemShareMessage: string;
  sameNameItems: SameNameItemSummary[];
  selectedActionCharacterId: string;
  selectedItem: SelectedItemDetail;
  vaultTags: VaultTags;
  onApplySameNameBatchTags: (
    items: SameNameItemSummary[],
    mode: Parameters<typeof buildDuplicateGroupBatchTagPlan>[1]
  ) => void;
  onApplySameNameCurrentKeepTags: (
    items: SameNameItemSummary[],
    currentItemKey: string,
    mode: "keep-current-review-rest" | "keep-current-junk-rest"
  ) => void;
  onClose: () => void;
  onCopyItemActionPlanText: (input: ItemActionPlanInput) => void;
  onCopySameNameLocator: (items: SameNameItemSummary[]) => void;
  onCopySelectedItemChatGuide: () => void;
  onCopySelectedItemSummary: () => void;
  onCopyWishlistInsight: () => void;
  onGenerateItemAiAdvice: () => void;
  onOpenBestSameNameItem: (items: SameNameItemSummary[]) => void;
  onOpenItemDetail: (item: SameNameItemSummary, source: SelectedItemSource) => void;
  onRunItemWriteAction: (label: string, action: () => Promise<ItemActionResult>) => void;
  onSaveSelectedItemNote: () => void;
  onSaveSelectedItemTag: (tag: VaultTagValue) => void;
  onSelectedActionCharacterIdChange: (id: string) => void;
  onSetItemNoteDraft: (value: string) => void;
};

export function ItemDetailModal(props: ItemDetailModalProps) {
  const selectedItem = props.selectedItem;
  const selectedAsAccountItem = selectedItemToAccountItem(selectedItem);
  const wishlist = selectedAsAccountItem ? evaluateWishlistRoll({
    ...selectedAsAccountItem,
    socket_plugs: selectedAsAccountItem.socket_plugs ?? []
  }, props.importedWishlist ?? undefined) : null;
  const wishlistModeLabels = wishlist ? formatWishlistModeLabels(wishlist.labels) : [];
  const sameNameSourceStats = buildSameNameSourceStats(props.sameNameItems);
  const sameNameDuplicateGroup = props.sameNameItems.length > 1
    ? buildVaultDuplicateSummary(props.sameNameItems, props.vaultTags).groups[0]
    : undefined;
  const sortedSameNameItems = [...props.sameNameItems].sort((left, right) => {
    const leftKey = getItemKey(left);
    const rightKey = getItemKey(right);
    const currentKey = selectedItem.item_key;

    if (leftKey === currentKey && rightKey !== currentKey) return -1;
    if (rightKey === currentKey && leftKey !== currentKey) return 1;

    return Number(Boolean(right.locked)) - Number(Boolean(left.locked))
      || left.name.localeCompare(right.name, "zh-Hans-CN");
  });

  return (
    <div className="modal-backdrop" role="presentation" onClick={props.onClose}>
      <section
        className="item-modal"
        role="dialog"
        aria-modal="true"
        aria-busy={selectedItem.is_detail_loading ? "true" : "false"}
        onClick={(event) => event.stopPropagation()}
      >
        <button className="modal-close" type="button" onClick={props.onClose}>关闭</button>
        <div className="modal-title">
          {selectedItem.icon ? <img alt="" src={selectedItem.icon} /> : null}
          <div>
            <h2>{selectedItem.name}</h2>
            <p>{[selectedItem.tier, selectedItem.item_type].filter(Boolean).join(" / ")}</p>
            {selectedItem.power ? <p>光等 {selectedItem.power}</p> : null}
            {selectedItem.locked !== undefined ? <p>{selectedItem.locked ? "已锁定" : "未锁定"}</p> : null}
          </div>
        </div>
        {selectedItem.is_detail_loading ? (
          <section className="source-status-card source-status-pending item-detail-loading" aria-live="polite">
            <span className="source-status-badge source-status-pending">详情加载</span>
            <strong>正在打开详情...</strong>
            <span>先显示基础信息，来源、perk 和详细说明会继续加载。</span>
          </section>
        ) : null}
        {selectedItem.description ? <p>{selectedItem.description}</p> : null}
        <section className={`source-status-card source-status-${getItemSourceStatusTone(selectedItem)} daily-source ${selectedItem.is_detail_loading ? "item-detail-loading" : "source-ready"}`}>
          <span className={`source-status-badge source-status-${getItemSourceStatusTone(selectedItem)}`}>
            {selectedItem.is_detail_loading ? "来源读取中" : "来源"}
          </span>
          <strong>{selectedItem.source.label}</strong>
          <span>{selectedItem.source.description}</span>
        </section>
        {selectedItem.armor_stats ? (
          <section className="modal-perk-group armor-stat-panel">
            <h3>当前属性</h3>
            <p>{formatArmorStatsSummary(selectedItem)}</p>
            <div className="armor-stat-grid">
              <span>总值 <strong>{selectedItem.armor_stats.total}</strong></span>
              <span>敏捷 <strong>{selectedItem.armor_stats.mobility}</strong></span>
              <span>韧性 <strong>{selectedItem.armor_stats.resilience}</strong></span>
              <span>恢复 <strong>{selectedItem.armor_stats.recovery}</strong></span>
              <span>纪律 <strong>{selectedItem.armor_stats.discipline}</strong></span>
              <span>智慧 <strong>{selectedItem.armor_stats.intellect}</strong></span>
              <span>力量 <strong>{selectedItem.armor_stats.strength}</strong></span>
            </div>
          </section>
        ) : null}
        {wishlist?.matched ? (
          <section className="wishlist-panel">
            <div className="wishlist-detail-header">
              <div>
                <h3>{wishlist.labels.includes("DIM Wishlist") ? "DIM 愿望单命中" : "疑似好 roll"}</h3>
                <p>{wishlistModeLabels.length ? wishlistModeLabels.join(" / ") : wishlist.labels.join(" / ")}</p>
              </div>
              <div className="wishlist-mode-badges">
                {wishlist.labels.includes("DIM Wishlist") ? <span className="wishlist-detail-badge">DIM 愿望单</span> : null}
                {wishlistModeLabels.map((label) => (
                  <span className="wishlist-detail-badge secondary" key={label}>{label}</span>
                ))}
              </div>
            </div>
            <div className="wishlist-local-tag">
              <strong>当前本地标记</strong>
              <span>{formatVaultTagLabel(props.vaultTags.items[selectedItem.item_key]?.tag ?? "none")}</span>
            </div>
            {props.sameNameItems.length > 1 ? (
              <div className="wishlist-same-name-summary">
                <strong>{"同名共 " + sameNameSourceStats.total + " 件"}</strong>
                <div className="wishlist-same-name-chips">
                  <span className="wishlist-same-name-chip">{"已装备 " + sameNameSourceStats.equipped}</span>
                  <span className="wishlist-same-name-chip">{"背包 " + sameNameSourceStats.inventory}</span>
                  <span className="wishlist-same-name-chip">{"仓库 " + sameNameSourceStats.vault}</span>
                  <span className="wishlist-same-name-chip">{"邮政官 " + sameNameSourceStats.postmaster}</span>
                </div>
              </div>
            ) : null}
            <ul>
              {wishlist.reasons.map((reason) => <li key={reason}>{reason}</li>)}
            </ul>
            <div className="button-row wishlist-quick-actions">
              <button type="button" className="secondary-button" onClick={() => props.onSaveSelectedItemTag("keep")}>
                标记保留
              </button>
              <button type="button" className="secondary-button" onClick={() => props.onSaveSelectedItemTag("review")}>
                标记关注
              </button>
              <button type="button" className="secondary-button" onClick={() => props.onSaveSelectedItemTag("none")}>
                清除标记
              </button>
              <button type="button" className="secondary-button" onClick={props.onCopyWishlistInsight}>
                复制命中结论
              </button>
              {props.sameNameItems.length > 1 ? (
                <>
                  <button type="button" className="secondary-button" onClick={() => props.onOpenBestSameNameItem(sortedSameNameItems)}>
                    打开最佳同名
                  </button>
                  <button type="button" className="secondary-button" onClick={() => props.onCopySameNameLocator(props.sameNameItems)}>
                    复制同名定位
                  </button>
                  <button type="button" className="secondary-button" onClick={() => props.onApplySameNameCurrentKeepTags(props.sameNameItems, selectedItem.item_key, "keep-current-review-rest")}>
                    当前保留，其余关注
                  </button>
                  <button type="button" className="secondary-button" onClick={() => props.onApplySameNameCurrentKeepTags(props.sameNameItems, selectedItem.item_key, "keep-current-junk-rest")}>
                    当前保留，其余可清理
                  </button>
                </>
              ) : null}
            </div>
            <small>{wishlist.disclaimer}</small>
          </section>
        ) : null}

        {selectedItem.socket_plugs?.length ? (
          <section className="modal-perk-group">
            <h3>实际 Roll</h3>
            <div className="modal-plug-grid">
              {selectedItem.socket_plugs.map((plug) => (
                <div className="modal-plug" key={plug.hash}>
                  {plug.icon ? <img alt="" src={plug.icon} /> : null}
                  <div>
                    <strong>{plug.name}</strong>
                    {plug.description ? <p>{plug.description}</p> : null}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}
        {selectedItem.perks?.length ? (
          <div className="modal-perks">
            {selectedItem.perks.map((group) => (
              <section className="modal-perk-group" key={group.socket_index}>
                <h3>插槽 {group.socket_index + 1}</h3>
                <div className="modal-plug-grid">
                  {group.plugs.map((plug) => (
                    <div className="modal-plug" key={plug.hash}>
                      {plug.icon ? <img alt="" src={plug.icon} /> : null}
                      <div>
                        <strong>{plug.name}</strong>
                        {plug.description ? <p>{plug.description}</p> : null}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : selectedItem.is_detail_loading ? (
          <section className="source-status-card source-status-pending item-detail-inline-status" aria-live="polite">
            <span className="source-status-badge source-status-pending">Perk</span>
            <p>正在读取 perk...</p>
          </section>
        ) : (
          <section className="source-status-card source-status-neutral item-detail-inline-status">
            <span className="source-status-badge source-status-neutral">Perk</span>
            <p>暂无可展示 perk。</p>
          </section>
        )}

        {props.communityRecommendations ? (
          <section className="community-recommendations-panel">
            <div className="community-recommendations-header">
              <div>
                <h3>社区推荐 Perk 组合</h3>
                <p>{props.communityRecommendations.matched_modes.map(formatCommunityMode).join(" / ") || "未标注模式"}</p>
              </div>
              <div className="community-source-badges">
                {props.communityRecommendations.source_label ? (
                  <span className="community-source-badge">{props.communityRecommendations.source_label}</span>
                ) : null}
                {props.communityRecommendations.combos[0]?.source === "dim_wishlist" ? (
                  <span className="community-source-badge">DIM Wishlist</span>
                ) : null}
                {props.communityRecommendations.combos[0]?.source === "ai_lightgg" ? (
                  <span className="community-source-badge">AI · light.gg</span>
                ) : null}
              </div>
            </div>
            {props.communityRecommendations.source_warnings?.length ? (
              <ul className="source-status-list source-status-warning">
                {props.communityRecommendations.source_warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            ) : null}
            <ul className="community-combos">
              {props.communityRecommendations.combos.map((combo, index) => (
                <li key={index} className={`community-combo mode-${combo.mode}`}>
                  <div className="community-combo-mode">
                    <strong>{formatCommunityMode(combo.mode)}</strong>
                    {combo.popularity ? <small>热度 {combo.popularity.toFixed(1)}%</small> : null}
                  </div>
                  <div className="community-combo-perks">
                    {combo.perks.map((perk) => (
                      <div className="community-perk" key={perk.hash}>
                        {perk.icon ? <img alt="" src={perk.icon} /> : null}
                        <div>
                          <strong>{perk.englishName ? `${perk.name} / ${perk.englishName}` : perk.name}</strong>
                          {perk.description ? <p>{perk.description}</p> : null}
                        </div>
                      </div>
                    ))}
                  </div>
                  {combo.note ? (
                    <small className="community-combo-note">{combo.note}</small>
                  ) : null}
                </li>
              ))}
            </ul>
            {props.communityRecommendations.ai_analysis ? (
              <section className="source-status-card source-status-neutral community-ai-analysis">
                <span className="source-status-badge source-status-neutral">AI 原始分析</span>
                <p>{props.communityRecommendations.ai_analysis}</p>
              </section>
            ) : null}
            {props.communityRecommendations.disclaimer ? (
              <small>{props.communityRecommendations.disclaimer}</small>
            ) : null}
          </section>
        ) : props.isCommunityRecommendationsLoading ? (
          <section className="source-status-card source-status-pending community-recommendations-panel loading">
            <span className="source-status-badge source-status-pending">社区推荐</span>
            <p>正在读取社区推荐...</p>
          </section>
        ) : (
          <section className="source-status-card source-status-neutral community-recommendations-panel empty">
            <span className="source-status-badge source-status-neutral">社区推荐</span>
            <h3>社区推荐</h3>
            <p>
              {props.aiSettingsEnableLightgg
                ? "暂无社区推荐。已尝试查询 light.gg 和本地 DIM wishlist，均未命中。"
                : "暂无社区推荐。导入 DIM wishlist 或在 AI 设置中开启 light.gg 实时分析以获取推荐。"}
            </p>
          </section>
        )}

        {props.sameNameItems.length > 1 ? (
          <section className="modal-perk-group">
            <h3>同名对比</h3>
            {sameNameDuplicateGroup ? (
              <div className="button-row">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => props.onOpenBestSameNameItem(sortedSameNameItems)}
                >
                  打开最高分
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => props.onApplySameNameCurrentKeepTags(props.sameNameItems, selectedItem.item_key, "keep-current-review-rest")}
                >
                  保留当前，其余关注
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => props.onApplySameNameCurrentKeepTags(props.sameNameItems, selectedItem.item_key, "keep-current-junk-rest")}
                >
                  保留当前，其余可清理
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => props.onApplySameNameBatchTags(props.sameNameItems, "keep-best-review-rest")}
                >
                  其余标记关注
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => props.onApplySameNameBatchTags(props.sameNameItems, "keep-best-junk-rest")}
                >
                  其余标记可清理
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => props.onApplySameNameBatchTags(props.sameNameItems, "clear-group-tags")}
                >
                  清除本组标记
                </button>
              </div>
            ) : null}
            <div className="same-roll-list">
              {sortedSameNameItems.map((item) => {
                const isCurrent = getItemKey(item) === selectedItem.item_key;
                return (
                  <button
                    type="button"
                    className={isCurrent ? "same-roll-row current" : "same-roll-row"}
                    key={getItemKey(item)}
                    onClick={() => props.onOpenItemDetail(item, {
                      source_character_id: item.source_character_id,
                      is_vault_item: item.is_vault_item,
                      is_postmaster_item: item.is_postmaster_item
                    })}
                  >
                    <strong>{item.name}</strong>
                    <span>{formatArmorStatsSummary(item) ?? (item.socket_plugs?.slice(0, 5).map((plug) => plug.name).join(" / ") || "暂无实际 roll")}</span>
                    <small>{formatAccountItemMeta(item)}</small>
                    <small>{item.locked ? "已锁定" : "未锁定"} / {props.vaultTags.items[getItemKey(item)]?.tag ?? "未标记"}</small>
                  </button>
                );
              })}
            </div>
          </section>
        ) : null}

        <section className="item-note-panel">
          <label htmlFor="item-note-draft">本地备注</label>
          <textarea
            id="item-note-draft"
            value={props.itemNoteDraft}
            onChange={(event) => props.onSetItemNoteDraft(event.target.value)}
            placeholder="例如：留给电猎清杂 / 等队友复查 PVP 手感 / 同名已有更好 roll"
            rows={3}
          />
          <div className="button-row">
            <button type="button" className="secondary-button" onClick={props.onSaveSelectedItemNote}>
              保存备注
            </button>
            {props.itemNoteMessage ? <span className="muted-copy">{props.itemNoteMessage}</span> : null}
          </div>
        </section>
        {selectedItem.instance_id ? (
          <section className="item-action-panel">
            <div>
              <h3>装备操作</h3>
              <p>
                默认关闭。开启后每次操作都会再次确认，并写入本地日志。
              </p>
            </div>
            {props.accountSummary?.characters.length ? (
              <label className="compact-field">
                目标角色
                <select
                  value={props.selectedActionCharacterId}
                  onChange={(event) => props.onSelectedActionCharacterIdChange(event.target.value)}
                >
                  {props.accountSummary.characters.map((character) => (
                    <option key={character.character_id} value={character.character_id}>
                      {character.class_name} / 光等 {character.light ?? "-"}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            <div className="button-row">
              <button
                type="button"
                className="secondary-button"
                disabled={props.isRunningItemAction}
                hidden={selectedItem.is_postmaster_item}
                onClick={() => props.onRunItemWriteAction(
                  selectedItem.locked ? "解锁" : "锁定",
                  () => api.setItemLockState({
                    membership_type: props.accountSummary?.membership_type ?? 0,
                    character_id: props.selectedActionCharacterId,
                    item_id: selectedItem.instance_id ?? "",
                    item_name: selectedItem.name,
                    state: !selectedItem.locked
                  })
                )}
              >
                {selectedItem.locked ? "解锁" : "锁定"}
              </button>
              {!selectedItem.is_vault_item && !selectedItem.is_postmaster_item ? (
                <button
                  type="button"
                  className="secondary-button"
                  disabled={props.isRunningItemAction}
                  onClick={() => props.onRunItemWriteAction(
                    "装备到角色",
                    () => api.equipItem({
                      membership_type: props.accountSummary?.membership_type ?? 0,
                      character_id: props.selectedActionCharacterId,
                      item_id: selectedItem.instance_id ?? "",
                      item_name: selectedItem.name
                    })
                  )}
                >
                  装备到角色
                </button>
              ) : null}
              {!selectedItem.is_postmaster_item ? (
                <>
                  <button
                    type="button"
                    className="secondary-button"
                    disabled={props.isRunningItemAction}
                    onClick={() => props.onCopyItemActionPlanText({
                      action: "transfer",
                      item_name: selectedItem.name,
                      item_instance_id: selectedItem.instance_id,
                      item_reference_hash: selectedItem.hash,
                      character_id: selectedItem.is_vault_item
                        ? props.selectedActionCharacterId
                        : selectedItem.source_character_id ?? props.selectedActionCharacterId,
                      transfer_to_vault: !selectedItem.is_vault_item
                    })}
                  >
                    复制转移计划
                  </button>
                  <button
                    type="button"
                    className="secondary-button"
                    disabled={props.isRunningItemAction}
                    onClick={() => props.onRunItemWriteAction(
                      selectedItem.is_vault_item ? "取出到角色" : "移入仓库",
                      () => api.transferItem({
                        membership_type: props.accountSummary?.membership_type ?? 0,
                        character_id: resolveItemTransferCharacterId({
                          selectedCharacterId: props.selectedActionCharacterId,
                          sourceCharacterId: selectedItem.source_character_id,
                          sourceKind: selectedItem.source_kind,
                          transferToVault: !selectedItem.is_vault_item
                        }),
                        item_id: selectedItem.instance_id ?? "",
                        item_reference_hash: selectedItem.hash,
                        item_name: selectedItem.name,
                        transfer_to_vault: !selectedItem.is_vault_item
                      })
                    )}
                  >
                    {selectedItem.is_vault_item ? "取出到角色" : "移入仓库"}
                  </button>
                </>
              ) : null}
              {selectedItem.is_postmaster_item ? (
                <button
                  type="button"
                  className="secondary-button"
                  disabled={props.isRunningItemAction}
                  onClick={() => props.onRunItemWriteAction(
                    "从邮政官取回",
                    () => api.pullFromPostmaster({
                      membership_type: props.accountSummary?.membership_type ?? 0,
                      character_id: selectedItem.source_character_id ?? props.selectedActionCharacterId,
                      item_id: selectedItem.instance_id ?? "",
                      item_reference_hash: selectedItem.hash,
                      item_name: selectedItem.name
                    })
                  )}
                >
                  取回到角色背包
                </button>
              ) : null}
            </div>
          </section>
        ) : null}
        <section className="modal-score-panel">
          <div>
            <h3>装备操作</h3>
            <div className="button-row">
              <button
                type="button"
                className="secondary-button"
                onClick={props.onCopySelectedItemSummary}
              >
                复制结论
              </button>
              <button
                type="button"
                className="secondary-button"
                onClick={props.onCopySelectedItemChatGuide}
              >
                生成群聊说明
              </button>
              <button
                type="button"
                className="secondary-button"
                disabled={props.isGeneratingItemAi}
                onClick={props.onGenerateItemAiAdvice}
              >
                {props.isGeneratingItemAi ? "AI 解读中..." : "AI 解读"}
              </button>
            </div>
          </div>
          {props.itemShareMessage ? <p className="notice">{props.itemShareMessage}</p> : null}
          {props.itemAiError ? <p className="error">{props.itemAiError}</p> : null}
          {props.itemAiResult?.skipped_reason ? (
            <section className="source-status-card source-status-warning item-ai-skipped-reason" aria-live="polite">
              <span className="source-status-badge source-status-warning">AI 跳过</span>
              <p>{props.itemAiResult.skipped_reason}</p>
            </section>
          ) : null}
          {props.itemAiResult?.ai ? (
            <section className="item-ai-panel">
              <div>
                <h3>AI 装备解读</h3>
                <p>{props.itemAiResult.ai.provider} / {props.itemAiResult.ai.model}</p>
              </div>
              <ItemAiSections sections={props.itemAiResult.ai.sections} />
            </section>
          ) : null}
        </section>
      </section>
    </div>
  );
}

function ItemAiSections(props: { sections: NonNullable<ItemAiAdviceResult["ai"]>["sections"] }) {
  const hasSections = props.sections.facts.length
    || props.sections.analysis.length
    || props.sections.suggestions.length
    || props.sections.action_reminders.length;
  if (!hasSections) {
    return <div className="ai-advice-text">{props.sections.raw}</div>;
  }
  return (
    <div className="ai-section-grid">
      <SimpleAiSection title="事实" items={props.sections.facts} />
      <SimpleAiSection title="分析" items={props.sections.analysis} />
      <SimpleAiSection title="建议" items={props.sections.suggestions} />
      <SimpleAiSection title="操作提醒" items={props.sections.action_reminders} />
    </div>
  );
}

function SimpleAiSection(props: { title: string; items: string[] }) {
  if (!props.items.length) return null;
  return (
    <section className="ai-section-card">
      <h4>{props.title}</h4>
      <ul>
        {props.items.map((item) => <li key={item}>{item}</li>)}
      </ul>
    </section>
  );
}

function formatCommunityMode(mode: "pve" | "pvp" | "general"): string {
  switch (mode) {
    case "pve": return "PvE";
    case "pvp": return "PvP";
    case "general": return "通用";
    default: return mode;
  }
}

function getItemSourceStatusTone(item: Pick<SelectedItemDetail, "is_detail_loading" | "source">): "ready" | "pending" | "warning" | "neutral" {
  if (item.is_detail_loading) {
    return "pending";
  }

  if (item.source.status === "ready") {
    return "ready";
  }

  if (item.source.status === "missing") {
    return "warning";
  }

  return "neutral";
}

function formatAccountItemMeta(item: SameNameItemSummary): string {
  return [
    "source_label" in item ? `来源：${item.source_label}` : undefined,
    item.bucket_name,
    item.tier,
    item.power ? `光等 ${item.power}` : undefined,
    formatArmorStatsSummary(item),
    item.locked ? "已锁定" : undefined
  ].filter(Boolean).join(" / ");
}

function formatArmorStatsSummary(item: Pick<SelectedItemDetail | SameNameItemSummary, "armor_stats">): string | undefined {
  if (!item.armor_stats) {
    return undefined;
  }

  return [
    `总值 ${item.armor_stats.total}`,
    `韧性 ${item.armor_stats.resilience}`,
    `恢复 ${item.armor_stats.recovery}`,
    `纪律 ${item.armor_stats.discipline}`
  ].join(" / ");
}

function formatWishlistModeLabels(labels: string[]): string[] {
  return labels.filter((label) => label !== "DIM Wishlist");
}

function formatVaultTagLabel(tag: VaultTagValue): string {
  if (tag === "keep") return "保留";
  if (tag === "review") return "关注";
  if (tag === "junk") return "可清理";
  return "未标记";
}
