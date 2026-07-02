import { LoadoutsPageView } from "./LoadoutsPageView.js";
import { getLoadoutActionButtonLabel, type LoadoutActionFeedbackState } from "./loadoutActionFeedback.js";

export type LoadoutsPageContentViewProps = {
  accountSummary: any | null;
  templates: any[];
  selectedTemplate: any | null;
  compareTemplate: any | null;
  selectedAnalysis: any | null;
  transferPlan: any | null;
  statusSummary: Array<{ key: string; label: string; count: number }>;
  visibleCompareRows: any[];
  missingCount: number;
  readyCount: number;
  actionableCount: number;
  compareTemplateId: string;
  renameDraft: string;
  showDiffOnly: boolean;
  message: string;
  isRunningItemAction: boolean;
  actionFeedback: Record<string, LoadoutActionFeedbackState>;
  getItemStatus: (item: any, template: any, selectedAnalysis: any, transferPlan: any, accountSummary: any | null) => any;
  getBlockedDetails: (item: any, transferPlan: any) => { label: string; hint: string } | null;
  getSourceItem: (item: any, accountSummary: any | null, templateCharacterId?: string) => any | null;
  getActionFeedbackKey: (templateId: string, item: any, action: "transfer" | "equip") => string;
  formatComparePerks: (perks: string[]) => string;
  onSelectTemplate: (id: string) => void;
  onSelectCompareTemplate: (id: string) => void;
  onRenameDraftChange: (value: string) => void;
  onShowDiffOnlyChange: (value: boolean) => void;
  onRenameTemplate: (template: any) => void;
  onDeleteTemplate: (id: string) => void;
  onCreateTransferPlan: (template: any) => void;
  onCopyMissingItems: (template: any, analysis: any | null) => void;
  onExecuteMissingTransfer: (template: any, analysis: any | null) => void;
  onExecuteSingleItemTransfer: (template: any, item: any) => void;
  onEquipSingleItem: (template: any, item: any) => void;
  onEquipSavedLoadout: (character: any, slot: any) => void;
  onSnapshotCurrentLoadout: (character: any, slot: any) => void;
  onOpenTemplateSourceItem: (item: any, templateCharacterId?: string) => void;
};

export function LoadoutsPageContentView(props: LoadoutsPageContentViewProps) {
  const selectedTemplate = props.selectedTemplate;
  const compareTemplate = props.compareTemplate;

  return (
    <LoadoutsPageView
      message={props.message}
      missingCount={props.missingCount}
      readyCount={props.readyCount}
      actionableCount={props.actionableCount}
    >
      <section className="daily-source source-ready in-game-loadout-slots">
        <strong>游戏内配装栏</strong>
        <span>读取 Bungie 游戏内已保存的配装槽，执行写操作前仍会再次确认。</span>
        {props.accountSummary ? (
          props.accountSummary.characters.some((character: any) => character.loadout_slots.length) ? (
            <div className="action-log-list">
              {props.accountSummary.characters.map((character: any) => (
                character.loadout_slots.map((slot: any) => (
                  <div className="ui-list-row action-log-row log-ok" key={`${character.character_id}-loadout-${slot.index}`}>
                    <strong>{slot.name || `配装栏 ${slot.index + 1}`}</strong>
                    <span>{character.class_name} / 槽位 {slot.index + 1} / {slot.item_count} 件装备</span>
                    <small>{formatInGameLoadoutSlotPreview(slot)}</small>
                    <div className="button-row compact">
                      <button type="button" className="secondary-button" disabled={props.isRunningItemAction} onClick={() => props.onEquipSavedLoadout(character, slot)}>
                        应用到角色
                      </button>
                      <button type="button" className="secondary-button" disabled={props.isRunningItemAction} onClick={() => props.onSnapshotCurrentLoadout(character, slot)}>
                        用当前装备覆盖
                      </button>
                    </div>
                  </div>
                ))
              ))}
            </div>
          ) : (
            <p className="status-message status-neutral">当前账号还没有读取到游戏内配装栏。</p>
          )
        ) : (
          <p className="status-message status-neutral">读取账号数据后，这里会显示每个角色的游戏内配装槽。</p>
        )}
      </section>
      {selectedTemplate ? (
        <div className="loadouts-workbench">
          <section className="daily-source source-ready loadout-template-list">
            <strong>方案列表</strong>
            <span>{props.templates.length} 个本地方案</span>
            <div className="action-log-list">
              {props.templates.slice(0, 12).map((template: any) => (
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
              {props.selectedAnalysis
                ? `已就位 ${props.readyCount} / 待补齐 ${props.missingCount}`
                : `${selectedTemplate.items.length} 件装备`}
            </span>
            <div className="field-grid">
              <label>
                <span>重命名</span>
                <input value={props.renameDraft} onChange={(event) => props.onRenameDraftChange(event.target.value)} placeholder="输入方案名称" />
              </label>
            </div>
            <div className="button-row">
              <button type="button" className="secondary-button" onClick={() => props.onRenameTemplate(selectedTemplate)}>重命名</button>
              <button type="button" className="secondary-button" onClick={() => props.onCreateTransferPlan(selectedTemplate)}>生成转移计划</button>
              <button type="button" className="secondary-button" onClick={() => props.onCopyMissingItems(selectedTemplate, props.selectedAnalysis)}>复制缺失清单</button>
              <button type="button" className="secondary-button" disabled={props.isRunningItemAction} onClick={() => props.onExecuteMissingTransfer(selectedTemplate, props.selectedAnalysis)}>
                {props.isRunningItemAction ? "执行中..." : "转移缺失件"}
              </button>
              <button type="button" className="secondary-button" onClick={() => props.onDeleteTemplate(selectedTemplate.id)}>删除</button>
            </div>
            {props.missingCount > 0 ? (
              <p className="status-message status-pending">当前有 {props.missingCount} 件方案装备还没在目标角色就位，可用“转移缺失件”自动补齐并穿戴。</p>
            ) : null}
            {props.statusSummary.length ? (
              <div className="loadout-status-summary">
                {props.statusSummary.map((entry) => (
                  <span className="loadout-status-chip" key={entry.key}>
                    <b>{entry.label}</b>
                    <small>{entry.count} 件</small>
                  </span>
                ))}
              </div>
            ) : null}
            {props.transferPlan?.blocked.length ? (
              <p className="status-message status-warning">有 {props.transferPlan.blocked.length} 件当前无法自动补齐，下面会显示原因和处理建议。</p>
            ) : null}
            <ul className="daily-source-items">
              {selectedTemplate.items.slice(0, 10).map((item: any, index: number) => (
                <LoadoutItemRow
                  key={`${selectedTemplate.id}-${item.instance_id ?? item.hash}-${index}`}
                  accountSummary={props.accountSummary}
                  actionFeedback={props.actionFeedback}
                  getActionFeedbackKey={props.getActionFeedbackKey}
                  getBlockedDetails={props.getBlockedDetails}
                  getItemStatus={props.getItemStatus}
                  getSourceItem={props.getSourceItem}
                  isRunningItemAction={props.isRunningItemAction}
                  item={item}
                  selectedAnalysis={props.selectedAnalysis}
                  template={selectedTemplate}
                  transferPlan={props.transferPlan}
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
                    .filter((template: any) => template.id !== selectedTemplate.id)
                    .map((template: any) => (
                      <option key={template.id} value={template.id}>{template.name}</option>
                    ))}
                </select>
              </label>
              <label className="checkbox-row">
                <input type="checkbox" checked={props.showDiffOnly} onChange={(event) => props.onShowDiffOnlyChange(event.target.checked)} />
                <span>仅看差异</span>
              </label>
            </div>
            {compareTemplate ? (
              <div className="loadout-compare-grid">
                {props.visibleCompareRows.length ? props.visibleCompareRows.map((row: any) => (
                  <article className={row.changed ? "loadout-compare-row changed" : "loadout-compare-row"} key={`${selectedTemplate.id}-${compareTemplate.id}-${row.slot}`}>
                    <b>{row.slot}</b>
                    <section className="loadout-compare-side">
                      <strong>{selectedTemplate.name}</strong>
                      <span>{row.left.name}</span>
                      <small>框架：{row.left.frame}</small>
                      <small>Perk：{props.formatComparePerks(row.left.perks)}</small>
                    </section>
                    <section className="loadout-compare-side">
                      <strong>{compareTemplate.name}</strong>
                      <span>{row.right.name}</span>
                      <small>框架：{row.right.frame}</small>
                      <small>Perk：{props.formatComparePerks(row.right.perks)}</small>
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
    </LoadoutsPageView>
  );
}

function formatInGameLoadoutSlotPreview(slot: any): string {
  return slot.items.slice(0, 4).map((item: any) => item.name).join(" / ") || "当前槽位为空";
}

function LoadoutItemRow(props: {
  accountSummary: any | null;
  actionFeedback: Record<string, LoadoutActionFeedbackState>;
  getActionFeedbackKey: (templateId: string, item: any, action: "transfer" | "equip") => string;
  getBlockedDetails: (item: any, transferPlan: any) => { label: string; hint: string } | null;
  getItemStatus: (item: any, template: any, selectedAnalysis: any, transferPlan: any, accountSummary: any | null) => any;
  getSourceItem: (item: any, accountSummary: any | null, templateCharacterId?: string) => any | null;
  isRunningItemAction: boolean;
  item: any;
  selectedAnalysis: any | null;
  template: any;
  transferPlan: any | null;
  onExecuteSingleItemTransfer: (template: any, item: any) => void;
  onEquipSingleItem: (template: any, item: any) => void;
  onOpenTemplateSourceItem: (item: any, templateCharacterId?: string) => void;
}) {
  const blockedDetails = props.getBlockedDetails(props.item, props.transferPlan);
  const sourceItem = props.getSourceItem(props.item, props.accountSummary, props.template.character_id);
  const status = props.getItemStatus(props.item, props.template, props.selectedAnalysis, props.transferPlan, props.accountSummary);
  const transferFeedbackKey = props.getActionFeedbackKey(props.template.id, props.item, "transfer");
  const equipFeedbackKey = props.getActionFeedbackKey(props.template.id, props.item, "equip");
  const transferFeedbackState = props.actionFeedback[transferFeedbackKey] ?? "idle";
  const equipFeedbackState = props.actionFeedback[equipFeedbackKey] ?? "idle";

  return (
    <li className={`loadout-item status-${status.badge_tone}`}>
      <b>{props.item.name}</b>
      <span className={`loadout-status-badge ${status.badge_tone}`}>{status.badge_label}</span>
      <small>{[status.location_label, props.item.bucket_name, props.item.weapon_frame_name, props.item.perk_names?.slice(0, 2).join(" / ")].filter(Boolean).join(" / ") || "暂无额外信息"}</small>
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
      {status.key !== "equipped" ? (
        <div className="button-row compact">
          {!blockedDetails && status.key !== "current-inventory" && sourceItem?.instance_id ? (
            <button type="button" className={`secondary-button inline-action ${transferFeedbackState === "pending" ? "is-pending" : ""} ${transferFeedbackState === "success" ? "is-success" : ""}`.trim()} aria-busy={transferFeedbackState === "pending"} disabled={props.isRunningItemAction} onClick={() => props.onExecuteSingleItemTransfer(props.template, props.item)}>
              {getLoadoutActionButtonLabel("transfer", transferFeedbackState)}
            </button>
          ) : null}
          {!blockedDetails && status.key === "current-inventory" ? (
            <button type="button" className={`secondary-button inline-action ${equipFeedbackState === "pending" ? "is-pending" : ""} ${equipFeedbackState === "success" ? "is-success" : ""}`.trim()} aria-busy={equipFeedbackState === "pending"} disabled={props.isRunningItemAction} onClick={() => props.onEquipSingleItem(props.template, props.item)}>
              {getLoadoutActionButtonLabel("equip", equipFeedbackState)}
            </button>
          ) : null}
          <button type="button" className="secondary-button" onClick={() => props.onOpenTemplateSourceItem(props.item, props.template.character_id)}>
            查看来源
          </button>
        </div>
      ) : null}
    </li>
  );
}
