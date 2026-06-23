import { analyzeLoadoutTemplate } from "@d2-tools/core/loadouts/analysis";
import type { AccountSummary, LoadoutTemplate } from "../../api/client";
import { buildLoadoutActionFeedbackKey, getLoadoutActionButtonLabel, type LoadoutActionFeedbackState } from "../../utils/loadoutActionFeedback";
import { buildLoadoutItemStatus, summarizeLoadoutItemStatuses } from "../../utils/loadoutItemStatus";
import { buildMissingLoadoutTransferPlan, describeMissingLoadoutBlockedReason } from "../../utils/loadoutTransfer";
import {
  buildLoadoutCompareRows,
  formatLoadoutComparePerks,
  getMissingLoadoutActionableCount,
  isMatchingTemplateItem,
  isTemplateItemReady,
  isTemplateItemReadyFromPlan
} from "./loadoutViewModel";
import {
  findBestTemplateSourceItem,
  getAllKnownAccountItemsWithSource
} from "../../shared/domain/loadouts/loadoutSources";

export type LoadoutsPageProps = {
  accountSummary: AccountSummary | null;
  templates: LoadoutTemplate[];
  selectedTemplateId: string;
  compareTemplateId: string;
  renameDraft: string;
  showDiffOnly: boolean;
  message: string;
  isRunningItemAction: boolean;
  actionFeedback: Record<string, LoadoutActionFeedbackState>;
  onSelectTemplate: (id: string) => void;
  onSelectCompareTemplate: (id: string) => void;
  onRenameDraftChange: (value: string) => void;
  onShowDiffOnlyChange: (value: boolean) => void;
  onRenameTemplate: (template: LoadoutTemplate) => void;
  onDeleteTemplate: (id: string) => void;
  onCreateTransferPlan: (template: LoadoutTemplate) => void;
  onCopyMissingItems: (
    template: LoadoutTemplate,
    analysis: ReturnType<typeof analyzeLoadoutTemplate> | null
  ) => void;
  onExecuteMissingTransfer: (
    template: LoadoutTemplate,
    analysis: ReturnType<typeof analyzeLoadoutTemplate> | null
  ) => void;
  onExecuteSingleItemTransfer: (
    template: LoadoutTemplate,
    item: LoadoutTemplate["items"][number]
  ) => void;
  onEquipSingleItem: (
    template: LoadoutTemplate,
    item: LoadoutTemplate["items"][number]
  ) => void;
  onOpenTemplateSourceItem: (
    item: LoadoutTemplate["items"][number],
    templateCharacterId?: string
  ) => void;
};

export function LoadoutsPage(props: LoadoutsPageProps) {
  const selectedTemplate = props.templates.find((template) => template.id === props.selectedTemplateId)
    ?? props.templates[0]
    ?? null;
  const compareTemplate = props.templates.find((template) => template.id === props.compareTemplateId)
    ?? null;
  const availableItems = props.accountSummary
    ? normalizeAccountItemsForCore(getAllKnownAccountItemsWithSource(props.accountSummary))
    : [];
  const selectedAnalysis = selectedTemplate
    ? analyzeLoadoutTemplate(selectedTemplate, availableItems)
    : null;
  const transferPlan = selectedTemplate && props.accountSummary
    ? buildMissingLoadoutTransferPlan({
      template: selectedTemplate,
      missingItems: selectedTemplate.items,
      accountSummary: props.accountSummary
    })
    : null;
  const actionableCount = transferPlan ? getMissingLoadoutActionableCount(transferPlan) : 0;
  const readyCount = selectedTemplate && transferPlan
    ? Math.max(selectedTemplate.items.length - actionableCount - transferPlan.blocked.length, 0)
    : selectedAnalysis?.equipped.length ?? 0;
  const missingCount = selectedTemplate && transferPlan
    ? actionableCount + transferPlan.blocked.length
    : selectedAnalysis?.missing.length ?? 0;
  const statuses = selectedTemplate
    ? selectedTemplate.items.map((item) => {
      const isReady = transferPlan
        ? isTemplateItemReadyFromPlan(item, transferPlan)
        : isTemplateItemReady(item, selectedAnalysis);
      const sourceItem = !isReady
        ? findBestTemplateSourceItem(item, props.accountSummary, selectedTemplate.character_id)
        : null;
      return buildLoadoutItemStatus({
        isReady,
        sourceItem,
        targetCharacterId: selectedTemplate.character_id,
        accountSummary: props.accountSummary
      });
    })
    : [];
  const statusSummary = summarizeLoadoutItemStatuses(statuses);
  const compareRows = selectedTemplate && compareTemplate
    ? buildLoadoutCompareRows(selectedTemplate, compareTemplate)
    : [];
  const visibleCompareRows = props.showDiffOnly ? compareRows.filter((row) => row.changed) : compareRows;

  return (
    <section className="tool-panel loadouts-page">
      <div className="section-heading">
        <div>
          <h2>本地方案库</h2>
          <p>按方案查看角色装备快照，补齐缺失装备，并和其他本地方案对比。</p>
        </div>
      </div>
      {props.message ? <p className={props.message.includes("失败") ? "error" : "notice"}>{props.message}</p> : null}
      {selectedTemplate ? (
        <div className="loadouts-workbench">
          <section className="daily-source source-ready loadout-template-list">
            <strong>方案列表</strong>
            <span>{props.templates.length} 个本地方案</span>
            <div className="action-log-list">
              {props.templates.slice(0, 12).map((template) => (
                <button
                  type="button"
                  key={template.id}
                  className={selectedTemplate.id === template.id ? "action-log-row log-ok" : "action-log-row"}
                  onClick={() => {
                    props.onSelectTemplate(template.id);
                    props.onRenameDraftChange(template.name);
                  }}
                >
                  <strong>{template.name}</strong>
                  <span>{template.class_name} / {template.items.length} 件装备</span>
                  <small>{new Date(template.updated_at ?? template.created_at).toLocaleString("zh-CN")}</small>
                </button>
              ))}
            </div>
          </section>
          <section className="daily-source source-ready loadout-template-detail">
            <strong>方案详情</strong>
            <span>
              {selectedAnalysis
                ? `已就位 ${readyCount} / 待补齐 ${missingCount}`
                : `${selectedTemplate.items.length} 件装备`}
            </span>
            <div className="field-grid">
              <label>
                <span>重命名</span>
                <input
                  value={props.renameDraft}
                  onChange={(event) => props.onRenameDraftChange(event.target.value)}
                  placeholder="输入方案名称"
                />
              </label>
            </div>
            <div className="button-row">
              <button type="button" className="secondary-button" onClick={() => props.onRenameTemplate(selectedTemplate)}>
                重命名
              </button>
              <button type="button" className="secondary-button" onClick={() => props.onCreateTransferPlan(selectedTemplate)}>
                生成转移计划
              </button>
              <button type="button" className="secondary-button" onClick={() => props.onCopyMissingItems(selectedTemplate, selectedAnalysis)}>
                复制缺失清单
              </button>
              <button
                type="button"
                className="secondary-button"
                disabled={props.isRunningItemAction}
                onClick={() => props.onExecuteMissingTransfer(selectedTemplate, selectedAnalysis)}
              >
                {props.isRunningItemAction ? "执行中..." : "转移缺失件"}
              </button>
              <button type="button" className="secondary-button" onClick={() => props.onDeleteTemplate(selectedTemplate.id)}>
                删除
              </button>
            </div>
            {missingCount > 0 ? (
              <p className="notice">
                当前有 {missingCount} 件方案装备还没在目标角色就位，可用“转移缺失件”自动补齐并穿戴。
              </p>
            ) : null}
            {statusSummary.length ? (
              <div className="loadout-status-summary">
                {statusSummary.map((entry) => (
                  <span className="loadout-status-chip" key={entry.key}>
                    <b>{entry.label}</b>
                    <small>{entry.count} 件</small>
                  </span>
                ))}
              </div>
            ) : null}
            {transferPlan?.blocked.length ? (
              <p className="notice">
                有 {transferPlan.blocked.length} 件当前无法自动补齐，下面会显示原因和处理建议。
              </p>
            ) : null}
            <ul className="daily-source-items">
              {selectedTemplate.items.slice(0, 10).map((item, index) => (
                <LoadoutItemRow
                  key={`${selectedTemplate.id}-${item.instance_id ?? item.hash}-${index}`}
                  accountSummary={props.accountSummary}
                  actionFeedback={props.actionFeedback}
                  isRunningItemAction={props.isRunningItemAction}
                  item={item}
                  selectedAnalysis={selectedAnalysis}
                  template={selectedTemplate}
                  transferPlan={transferPlan}
                  onEquipSingleItem={props.onEquipSingleItem}
                  onExecuteSingleItemTransfer={props.onExecuteSingleItemTransfer}
                  onOpenTemplateSourceItem={props.onOpenTemplateSourceItem}
                />
              ))}
            </ul>
            <div className="field-grid">
              <label>
                <span>对比方案</span>
                <select value={props.compareTemplateId} onChange={(event) => props.onSelectCompareTemplate(event.target.value)}>
                  <option value="">不对比</option>
                  {props.templates
                    .filter((template) => template.id !== selectedTemplate.id)
                    .map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.name}
                      </option>
                    ))}
                </select>
              </label>
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={props.showDiffOnly}
                  onChange={(event) => props.onShowDiffOnlyChange(event.target.checked)}
                />
                <span>仅看差异</span>
              </label>
            </div>
            {compareTemplate ? (
              <div className="loadout-compare-grid">
                {visibleCompareRows.length ? visibleCompareRows.map((row) => (
                  <article
                    className={row.changed ? "loadout-compare-row changed" : "loadout-compare-row"}
                    key={`${selectedTemplate.id}-${compareTemplate.id}-${row.slot}`}
                  >
                    <b>{row.slot}</b>
                    <section className="loadout-compare-side">
                      <strong>{selectedTemplate.name}</strong>
                      <span>{row.left.name}</span>
                      <small>框架：{row.left.frame}</small>
                      <small>Perk：{formatLoadoutComparePerks(row.left.perks)}</small>
                    </section>
                    <section className="loadout-compare-side">
                      <strong>{compareTemplate.name}</strong>
                      <span>{row.right.name}</span>
                      <small>框架：{row.right.frame}</small>
                      <small>Perk：{formatLoadoutComparePerks(row.right.perks)}</small>
                    </section>
                  </article>
                )) : (
                  <article className="loadout-compare-row">
                    <b>差异预览</b>
                    <section className="loadout-compare-side">
                      <span>两个方案当前没有可展示差异。</span>
                    </section>
                  </article>
                )}
              </div>
            ) : null}
          </section>
        </div>
      ) : (
        <section className="source-status-card source-status-neutral">
          <span className="source-status-badge source-status-neutral">本地方案</span>
          <h3>还没有保存本地方案</h3>
          <p>先到账号页选择角色，把当前装备保存为模板。保存后这里会集中处理补齐、对比和清单复制。</p>
        </section>
      )}
    </section>
  );
}

function LoadoutItemRow(props: {
  accountSummary: AccountSummary | null;
  actionFeedback: Record<string, LoadoutActionFeedbackState>;
  isRunningItemAction: boolean;
  item: LoadoutTemplate["items"][number];
  selectedAnalysis: ReturnType<typeof analyzeLoadoutTemplate> | null;
  template: LoadoutTemplate;
  transferPlan: ReturnType<typeof buildMissingLoadoutTransferPlan> | null;
  onExecuteSingleItemTransfer: (
    template: LoadoutTemplate,
    item: LoadoutTemplate["items"][number]
  ) => void;
  onEquipSingleItem: (
    template: LoadoutTemplate,
    item: LoadoutTemplate["items"][number]
  ) => void;
  onOpenTemplateSourceItem: (
    item: LoadoutTemplate["items"][number],
    templateCharacterId?: string
  ) => void;
}) {
  const isReady = props.transferPlan
    ? isTemplateItemReadyFromPlan(props.item, props.transferPlan)
    : isTemplateItemReady(props.item, props.selectedAnalysis);
  const blockedEntry = !isReady
    ? props.transferPlan?.blocked.find((entry) => isMatchingTemplateItem(props.item, entry.item)) ?? null
    : null;
  const blockedDetails = blockedEntry ? describeMissingLoadoutBlockedReason(blockedEntry.reason) : null;
  const sourceItem = !isReady
    ? findBestTemplateSourceItem(props.item, props.accountSummary, props.template.character_id)
    : null;
  const status = buildLoadoutItemStatus({
    isReady,
    sourceItem,
    targetCharacterId: props.template.character_id,
    accountSummary: props.accountSummary
  });
  const transferFeedbackKey = buildLoadoutActionFeedbackKey(props.template.id, props.item, "transfer");
  const equipFeedbackKey = buildLoadoutActionFeedbackKey(props.template.id, props.item, "equip");
  const transferFeedbackState = props.actionFeedback[transferFeedbackKey] ?? "idle";
  const equipFeedbackState = props.actionFeedback[equipFeedbackKey] ?? "idle";

  return (
    <li className={`loadout-item status-${status.badge_tone}`}>
      <b>{props.item.name}</b>
      <span className={`loadout-status-badge ${status.badge_tone}`}>
        {status.badge_label}
      </span>
      <small>
        {[
          status.location_label,
          props.item.bucket_name,
          props.item.weapon_frame_name,
          props.item.perk_names?.slice(0, 2).join(" / ")
        ].filter(Boolean).join(" / ") || "暂无额外信息"}
      </small>
      {status.guidance_label && !blockedDetails ? (
        <>
          <small className="loadout-blocked-reason">{status.guidance_label}</small>
          {status.guidance_hint ? <small className="loadout-blocked-hint">{status.guidance_hint}</small> : null}
        </>
      ) : null}
      {blockedDetails ? (
        <>
          <small className="loadout-blocked-reason">无法自动补齐：{blockedDetails.label}</small>
          <small className="loadout-blocked-hint">{blockedDetails.hint}</small>
        </>
      ) : null}
      {!isReady ? (
        <div className="button-row compact">
          {!blockedDetails && status.key !== "current-inventory" && sourceItem?.instance_id ? (
            <button
              type="button"
              className={`secondary-button inline-action ${transferFeedbackState === "pending" ? "is-pending" : ""} ${transferFeedbackState === "success" ? "is-success" : ""}`.trim()}
              aria-busy={transferFeedbackState === "pending"}
              disabled={props.isRunningItemAction}
              onClick={() => props.onExecuteSingleItemTransfer(props.template, props.item)}
            >
              {getLoadoutActionButtonLabel("transfer", transferFeedbackState)}
            </button>
          ) : null}
          {!blockedDetails && status.key === "current-inventory" ? (
            <button
              type="button"
              className={`secondary-button inline-action ${equipFeedbackState === "pending" ? "is-pending" : ""} ${equipFeedbackState === "success" ? "is-success" : ""}`.trim()}
              aria-busy={equipFeedbackState === "pending"}
              disabled={props.isRunningItemAction}
              onClick={() => props.onEquipSingleItem(props.template, props.item)}
            >
              {getLoadoutActionButtonLabel("equip", equipFeedbackState)}
            </button>
          ) : null}
          <button
            type="button"
            className="secondary-button"
            onClick={() => props.onOpenTemplateSourceItem(props.item, props.template.character_id)}
          >
            查看来源
          </button>
        </div>
      ) : null}
    </li>
  );
}

function normalizeAccountItemsForCore(
  items: AccountSummary["vault"]["items"]
): Array<AccountSummary["vault"]["items"][number] & { socket_plugs: NonNullable<AccountSummary["vault"]["items"][number]["socket_plugs"]> }> {
  return items.map((item) => ({
    ...item,
    socket_plugs: item.socket_plugs ?? []
  }));
}
