import { useState } from "react";
import type {
  LoadoutsPageModel,
  LoadoutEntryView,
  LoadoutTemplateItemRowView
} from "@d2-tools/app";
import type { AccountSummary } from "@d2-tools/core/account/summary";
import type { LoadoutTemplate } from "@d2-tools/core/loadouts/templates";
import type { LoadoutTemplateAnalysis } from "@d2-tools/core/loadouts/analysis";
import { getLoadoutActionButtonLabel, type LoadoutActionFeedbackState } from "./loadoutActionFeedback.js";
import { getLocaleCopy } from "../i18n/copy.js";
import type { InterfaceLocale, LoadoutsCopy } from "../i18n/types.js";
import {
  ProductWorkspaceEmptyState,
  ProductWorkspacePanel,
  ProductWorkspaceSideRail,
  ProductWorkspaceSplit
} from "../workspace/ProductWorkspace.js";

export type LoadoutsPageActions = {
  selectEntry: (entryId: string) => void;
  selectTemplate: (id: string) => void;
  selectCompareTemplate: (id: string) => void;
  renameDraftChange: (value: string) => void;
  showDiffOnlyChange: (value: boolean) => void;
  renameTemplate: (template: LoadoutTemplate) => void;
  deleteTemplate: (id: string) => void;
  createTransferPlan: (template: LoadoutTemplate) => void;
  copyMissingItems: (template: LoadoutTemplate, analysis: LoadoutTemplateAnalysis | null) => void;
  executeMissingTransfer: (template: LoadoutTemplate, analysis: LoadoutTemplateAnalysis | null) => void;
  executeSingleItemTransfer: (template: LoadoutTemplate, item: LoadoutTemplate["items"][number]) => void;
  equipSingleItem: (template: LoadoutTemplate, item: LoadoutTemplate["items"][number]) => void;
  equipSavedLoadout: (
    character: AccountSummary["characters"][number],
    slot: AccountSummary["characters"][number]["loadout_slots"][number]
  ) => void;
  snapshotCurrentLoadout: (
    character: AccountSummary["characters"][number],
    slot: AccountSummary["characters"][number]["loadout_slots"][number]
  ) => void;
  openTemplateSourceItem: (item: LoadoutTemplate["items"][number], templateCharacterId?: string) => void;
};

export type LoadoutsPageContentViewProps = {
  interfaceLocale?: InterfaceLocale;
  model: LoadoutsPageModel;
  actions: LoadoutsPageActions;
  compareTemplateId: string;
  renameDraft: string;
  showDiffOnly: boolean;
  message: string;
  isRunningItemAction: boolean;
  actionFeedback: Record<string, LoadoutActionFeedbackState>;
};

type LoadoutEntrySourceFilter = "all" | LoadoutEntryView["source"];

function loadoutsText(copy: LoadoutsCopy, key: string): string {
  return copy.inline[key] ?? key;
}

export function LoadoutsPageContentView(props: LoadoutsPageContentViewProps) {
  const copy = getLocaleCopy(props.interfaceLocale ?? "zh-CN").loadouts;
  const selectedDetail = props.model.selectedDetail;
  const selectedTemplate = selectedDetail.kind === "local-template" ? selectedDetail.template : null;
  const selectedAnalysis = selectedDetail.kind === "local-template" ? selectedDetail.analysis : null;
  const transferPlan = selectedDetail.kind === "local-template" ? selectedDetail.transferPlan : null;
  const compareTemplate = props.model.compare.compareTemplate;
  const [entrySourceFilter, setEntrySourceFilter] = useState<LoadoutEntrySourceFilter>("all");
  const loadoutEntries = props.model.entries;
  const visibleLoadoutEntries = entrySourceFilter === "all"
    ? loadoutEntries
    : loadoutEntries.filter((entry) => entry.source === entrySourceFilter);

  return (
    <>
      {props.message ? <p className={props.message.includes(copy.inline["失败"] ?? "失败") ? "status-message status-error" : "status-message status-ready"}>{props.message}</p> : null}
      <ProductWorkspacePanel className="loadout-risk-panel">
        <div className="section-heading compact-heading">
          <div>
            <h3>{copy.riskTitle}</h3>
            <p>{copy.riskSubtitle}</p>
          </div>
        </div>
        <div className="loadout-risk-grid">
          <span>{copy.missingItems} {props.model.riskSummary.missingCount} {loadoutsText(copy, "件")}</span>
          <span>{copy.readyItems} {props.model.riskSummary.readyCount} {loadoutsText(copy, "件")}</span>
          <span>{copy.actionableItems} {props.model.riskSummary.actionableCount} {loadoutsText(copy, "件")}</span>
        </div>
      </ProductWorkspacePanel>
      <ProductWorkspaceSplit className="loadout-workbench-shell">
        <ProductWorkspaceSideRail element="section" className="loadout-entry-list">
          <div className="loadout-entry-list-head">
            <strong>{loadoutsText(copy, "配装工作台")}</strong>
            <span>{loadoutEntries.length} {loadoutsText(copy, "个配装对象")}</span>
          </div>
          <div className="loadout-entry-source-filter" role="tablist" aria-label={loadoutsText(copy, "配装来源")}>
            {(["all", "local-template", "in-game"] as const).map((source) => (
              <button
                type="button"
                key={source}
                className={entrySourceFilter === source ? "active-filter" : ""}
                aria-selected={entrySourceFilter === source}
                onClick={() => setEntrySourceFilter(source)}
              >
                {getLoadoutEntryFilterLabel(source, copy)}
              </button>
            ))}
          </div>
          <div className="action-log-list">
            {visibleLoadoutEntries.length ? visibleLoadoutEntries.map((entry) => (
              <LoadoutEntryRow
                key={entry.id}
                copy={copy}
                entry={entry}
                interfaceLocale={props.interfaceLocale}
                isSelected={props.model.selectedEntryId === entry.id}
                isRunningItemAction={props.isRunningItemAction}
                actions={props.actions}
              />
            )) : (
              <p className="status-message status-neutral">{loadoutsText(copy, "没有匹配的配装对象。")}</p>
            )}
          </div>
        </ProductWorkspaceSideRail>
        {selectedDetail.kind === "in-game-slot" ? (
          <InGameLoadoutSlotDetail
            copy={copy}
            character={selectedDetail.character}
            slot={selectedDetail.slot}
            isRunningItemAction={props.isRunningItemAction}
            actions={props.actions}
          />
        ) : selectedDetail.kind === "local-template" && selectedTemplate ? (
          <ProductWorkspacePanel element="section" className="loadout-template-detail">
            <strong>{loadoutsText(copy, "方案详情")}</strong>
            <span>
              {selectedAnalysis
                ? `${loadoutsText(copy, "已就位")} ${props.model.riskSummary.readyCount} / ${loadoutsText(copy, "待补齐")} ${props.model.riskSummary.missingCount}`
                : `${selectedTemplate.items.length} ${loadoutsText(copy, "件装备")}`}
            </span>
            <div className="field-grid">
              <label>
                <span>{loadoutsText(copy, "重命名")}</span>
                <input value={props.renameDraft} onChange={(event) => props.actions.renameDraftChange(event.target.value)} placeholder={loadoutsText(copy, "输入方案名称")} />
              </label>
            </div>
            <div className="button-row loadout-template-actions">
              <button type="button" className="secondary-button" onClick={() => props.actions.renameTemplate(selectedTemplate)}>{loadoutsText(copy, "重命名")}</button>
              <button type="button" className="secondary-button" onClick={() => props.actions.createTransferPlan(selectedTemplate)}>{loadoutsText(copy, "生成转移计划")}</button>
              <button type="button" className="secondary-button" onClick={() => props.actions.copyMissingItems(selectedTemplate, selectedAnalysis)}>{loadoutsText(copy, "复制缺失清单")}</button>
              <button type="button" className="secondary-button" disabled={props.isRunningItemAction} onClick={() => props.actions.executeMissingTransfer(selectedTemplate, selectedAnalysis)}>
                {props.isRunningItemAction ? loadoutsText(copy, "执行中...") : loadoutsText(copy, "转移缺失件")}
              </button>
              <button type="button" className="secondary-button" onClick={() => props.actions.deleteTemplate(selectedTemplate.id)}>{loadoutsText(copy, "删除")}</button>
            </div>
            {props.model.riskSummary.missingCount > 0 ? (
              <p className="status-message status-pending loadout-detail-callout">{loadoutsText(copy, "当前有")} {props.model.riskSummary.missingCount} {loadoutsText(copy, "件方案装备还没在目标角色就位，可用“转移缺失件”自动补齐并穿戴。")}</p>
            ) : null}
            {selectedDetail.statusSummary.length ? (
              <div className="loadout-status-summary">
                {selectedDetail.statusSummary.map((entry) => (
                  <span className="loadout-status-chip" key={entry.key}>
                    <b>{entry.label}</b>
                    <small>{entry.count} {loadoutsText(copy, "件")}</small>
                  </span>
                ))}
              </div>
            ) : null}
            {transferPlan?.blocked.length ? (
              <p className="status-message status-warning loadout-detail-callout">{loadoutsText(copy, "有")} {transferPlan.blocked.length} {loadoutsText(copy, "件当前无法自动补齐，下面会显示原因和处理建议。")}</p>
            ) : null}
            <ul className="daily-source-items">
              {selectedDetail.itemRows.slice(0, 10).map((row, index) => (
                <LoadoutItemRow
                  key={`${selectedTemplate.id}-${row.item.instance_id ?? row.item.hash}-${index}`}
                  actionFeedback={props.actionFeedback}
                  isRunningItemAction={props.isRunningItemAction}
                  row={row}
                  template={selectedTemplate}
                  actions={props.actions}
                  copy={copy}
                />
              ))}
            </ul>
            <div className="field-grid">
              <label>
                <span>{loadoutsText(copy, "对比方案")}</span>
                <select value={props.compareTemplateId} onChange={(event) => props.actions.selectCompareTemplate(event.target.value)}>
                  <option value="">{loadoutsText(copy, "不对比")}</option>
                  {props.model.compare.options.map((template) => (
                    <option key={template.id} value={template.id}>{template.name}</option>
                  ))}
                </select>
              </label>
              <label className="checkbox-row">
                <input type="checkbox" checked={props.showDiffOnly} onChange={(event) => props.actions.showDiffOnlyChange(event.target.checked)} />
                <span>{loadoutsText(copy, "仅看差异")}</span>
              </label>
            </div>
            {compareTemplate ? (
              <div className="loadout-compare-grid">
                {props.model.compare.visibleRows.length ? props.model.compare.visibleRows.map((row) => (
                  <article className={row.changed ? "loadout-compare-row changed" : "loadout-compare-row"} key={`${selectedTemplate.id}-${compareTemplate.id}-${row.slot}`}>
                    <b>{row.slot}</b>
                    <section className="loadout-compare-side">
                      <strong>{selectedTemplate.name}</strong>
                      <span>{row.left.name}</span>
                      <small>{loadoutsText(copy, "框架：")}{row.left.frame}</small>
                      <small>{loadoutsText(copy, "Perk：")}{formatComparePerks(row.left.perks)}</small>
                    </section>
                    <section className="loadout-compare-side">
                      <strong>{compareTemplate.name}</strong>
                      <span>{row.right.name}</span>
                      <small>{loadoutsText(copy, "框架：")}{row.right.frame}</small>
                      <small>{loadoutsText(copy, "Perk：")}{formatComparePerks(row.right.perks)}</small>
                    </section>
                  </article>
                )) : (
                  <article className="loadout-compare-row">
                    <b>{loadoutsText(copy, "差异预览")}</b>
                    <section className="loadout-compare-side">
                      <span>{loadoutsText(copy, "两个方案当前没有可展示差异。")}</span>
                    </section>
                  </article>
                )}
              </div>
            ) : null}
          </ProductWorkspacePanel>
        ) : selectedDetail.kind === "empty" ? (
          <ProductWorkspaceEmptyState element="section" className="loadout-template-detail">
            <span className="source-status-badge source-status-neutral">{loadoutsText(copy, "本地方案")}</span>
            <h3>{localizeLoadoutEntryText(selectedDetail.title, copy)}</h3>
            <p>{localizeLoadoutEntryText(selectedDetail.message, copy)}</p>
          </ProductWorkspaceEmptyState>
        ) : null}
      </ProductWorkspaceSplit>
    </>
  );
}

function LoadoutEntryRow(props: {
  copy: LoadoutsCopy;
  entry: LoadoutEntryView;
  interfaceLocale?: InterfaceLocale;
  isSelected: boolean;
  isRunningItemAction: boolean;
  actions: LoadoutsPageActions;
}) {
  const sourceLabel = props.entry.source === "in-game"
    ? loadoutsText(props.copy, "游戏内")
    : loadoutsText(props.copy, "本地模板");

  if (props.entry.source === "local-template" && props.entry.templateId) {
    return (
      <button
        type="button"
        className={`action-log-row loadout-entry-row ${props.isSelected ? "log-ok is-selected" : ""}`.trim()}
        onClick={() => {
          props.actions.selectEntry(props.entry.id);
          props.actions.selectTemplate(props.entry.templateId ?? "");
          props.actions.renameDraftChange(props.entry.title);
        }}
      >
        <span className={`loadout-entry-source-badge source-${props.entry.source}`}>{sourceLabel}</span>
        <strong>{props.entry.title}</strong>
        <span>{localizeLoadoutEntryText(props.entry.subtitle, props.copy)}</span>
        <small>{formatLoadoutEntryPreview(props.entry.preview, props.copy, props.interfaceLocale)}</small>
        <span className={`loadout-entry-status status-${props.entry.statusTone}`}>{localizeLoadoutEntryText(props.entry.statusLabel, props.copy)}</span>
      </button>
    );
  }

  return (
    <div
      className={`action-log-row loadout-entry-row ${props.isSelected ? "log-ok is-selected" : ""}`.trim()}
      role="button"
      tabIndex={0}
      onClick={() => props.actions.selectEntry(props.entry.id)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          props.actions.selectEntry(props.entry.id);
        }
      }}
    >
      <span className={`loadout-entry-source-badge source-${props.entry.source}`}>{sourceLabel}</span>
      <strong>{props.entry.title}</strong>
      <span>{localizeLoadoutEntryText(props.entry.subtitle, props.copy)}</span>
      <small>{localizeLoadoutEntryText(props.entry.preview, props.copy)}</small>
      <span className={`loadout-entry-status status-${props.entry.statusTone}`}>{localizeLoadoutEntryText(props.entry.statusLabel, props.copy)}</span>
      {props.entry.character && props.entry.slot ? (
        <div className="button-row compact">
          <button type="button" className="secondary-button" disabled={props.isRunningItemAction} onClick={(event) => {
            event.stopPropagation();
            props.actions.equipSavedLoadout(props.entry.character!, props.entry.slot!);
          }}>
            {loadoutsText(props.copy, "应用到角色")}
          </button>
          <button type="button" className="secondary-button" disabled={props.isRunningItemAction} onClick={(event) => {
            event.stopPropagation();
            props.actions.snapshotCurrentLoadout(props.entry.character!, props.entry.slot!);
          }}>
            {loadoutsText(props.copy, "用当前装备覆盖")}
          </button>
        </div>
      ) : null}
    </div>
  );
}

function InGameLoadoutSlotDetail(props: {
  copy: LoadoutsCopy;
  character: AccountSummary["characters"][number];
  slot: AccountSummary["characters"][number]["loadout_slots"][number];
  isRunningItemAction: boolean;
  actions: LoadoutsPageActions;
}) {
  return (
    <ProductWorkspacePanel element="section" className="loadout-template-detail loadout-in-game-detail">
      <strong>{loadoutsText(props.copy, "游戏内配装详情")}</strong>
      <span>
        {props.character.class_name} / {loadoutsText(props.copy, "槽位")} {props.slot.index + 1} / {props.slot.item_count} {loadoutsText(props.copy, "件装备")}
      </span>
      <div className="field-grid">
        <label>
          <span>{loadoutsText(props.copy, "配装名称")}</span>
          <input value={props.slot.name || `${loadoutsText(props.copy, "配装栏")} ${props.slot.index + 1}`} readOnly />
        </label>
      </div>
      <div className="button-row loadout-template-actions">
        <button type="button" className="secondary-button" disabled={props.isRunningItemAction} onClick={() => props.actions.equipSavedLoadout(props.character, props.slot)}>
          {loadoutsText(props.copy, "应用到角色")}
        </button>
        <button type="button" className="secondary-button" disabled={props.isRunningItemAction} onClick={() => props.actions.snapshotCurrentLoadout(props.character, props.slot)}>
          {loadoutsText(props.copy, "用当前装备覆盖")}
        </button>
      </div>
      <p className="status-message status-neutral loadout-detail-callout">
        {loadoutsText(props.copy, "这是 Bungie 游戏内配装栏，当前只能应用到角色或用当前装备覆盖；重命名和删除请在游戏内完成。")}
      </p>
      {props.slot.items.length ? (
        <ul className="daily-source-items">
          {props.slot.items.map((item, index) => (
            <li className="loadout-item status-neutral" key={`${props.character.character_id}-${props.slot.index}-${item.instance_id ?? index}`}>
              <b>{item.name}</b>
              <span className="loadout-status-badge neutral">{item.bucket_name || loadoutsText(props.copy, "未知槽位")}</span>
              <small>{item.instance_id ? `${loadoutsText(props.copy, "物品")} ${item.instance_id}` : loadoutsText(props.copy, "暂无物品实例 ID")}</small>
            </li>
          ))}
        </ul>
      ) : (
        <p className="status-message status-neutral">{loadoutsText(props.copy, "当前槽位为空")}</p>
      )}
    </ProductWorkspacePanel>
  );
}

function getLoadoutEntryFilterLabel(source: LoadoutEntrySourceFilter, copy: LoadoutsCopy): string {
  if (source === "all") return loadoutsText(copy, "全部");
  if (source === "in-game") return loadoutsText(copy, "游戏内");
  return loadoutsText(copy, "本地模板");
}

function formatLoadoutEntryPreview(preview: string, copy: LoadoutsCopy, locale?: InterfaceLocale): string {
  if (!preview.startsWith("更新于 ")) return localizeLoadoutEntryText(preview, copy);
  const dateText = preview.slice("更新于 ".length);
  const timestamp = Date.parse(dateText);
  if (Number.isNaN(timestamp)) return localizeLoadoutEntryText(preview, copy);
  return `${loadoutsText(copy, "更新于")} ${new Date(timestamp).toLocaleString(locale ?? "zh-CN")}`;
}

function localizeLoadoutEntryText(value: string, copy: LoadoutsCopy): string {
  return value
    .replace("本地模板", loadoutsText(copy, "本地模板"))
    .replace("游戏内", loadoutsText(copy, "游戏内"))
    .replace("件装备", loadoutsText(copy, "件装备"))
    .replace(/(\d+) 件/g, `$1 ${loadoutsText(copy, "件")}`)
    .replace("槽位", loadoutsText(copy, "槽位"))
    .replace("待补齐", loadoutsText(copy, "待补齐"))
    .replace("可执行", loadoutsText(copy, "可执行"))
    .replace("未检查", loadoutsText(copy, "未检查"))
    .replace("可应用", loadoutsText(copy, "可应用"))
    .replace("更新于", loadoutsText(copy, "更新于"))
    .replace("当前槽位为空", loadoutsText(copy, "当前槽位为空"))
    .replace("还没有保存本地方案", loadoutsText(copy, "还没有保存本地方案"))
    .replace("先到账号页选择角色，把当前装备保存为模板。保存后这里会集中处理补齐、对比和清单复制。", loadoutsText(copy, "先到账号页选择角色，把当前装备保存为模板。保存后这里会集中处理补齐、对比和清单复制。"));
}

function formatComparePerks(perks: string[]): string {
  return perks.length ? perks.join(" / ") : "无";
}

function LoadoutItemRow(props: {
  actionFeedback: Record<string, LoadoutActionFeedbackState>;
  isRunningItemAction: boolean;
  row: LoadoutTemplateItemRowView;
  template: LoadoutTemplate;
  copy: LoadoutsCopy;
  actions: LoadoutsPageActions;
}) {
  const item = props.row.item;
  const status = props.row.status;
  const blockedDetails = props.row.blockedDetails;
  const sourceItem = props.row.sourceItem;
  const transferFeedbackState = props.actionFeedback[props.row.transferFeedbackKey] ?? "idle";
  const equipFeedbackState = props.actionFeedback[props.row.equipFeedbackKey] ?? "idle";

  return (
    <li className={`loadout-item status-${status.badge_tone}`}>
      <b>{item.name}</b>
      <span className={`loadout-status-badge ${status.badge_tone}`}>{status.badge_label}</span>
      <small>{[status.location_label, item.bucket_name, item.weapon_frame_name, item.perk_names?.slice(0, 2).join(" / ")].filter(Boolean).join(" / ") || loadoutsText(props.copy, "暂无额外信息")}</small>
      {status.guidance_label && !blockedDetails ? (
        <>
          <small className="loadout-blocked-reason">{status.guidance_label}</small>
          {status.guidance_hint ? <small className="loadout-blocked-hint">{status.guidance_hint}</small> : null}
        </>
      ) : null}
      {blockedDetails ? (
        <>
          <small className="loadout-blocked-reason">{loadoutsText(props.copy, "无法自动补齐：")}{blockedDetails.label}</small>
          <small className="loadout-blocked-hint">{blockedDetails.hint}</small>
        </>
      ) : null}
      {status.key !== "equipped" ? (
        <div className="button-row compact">
          {!blockedDetails && status.key !== "current-inventory" && sourceItem?.instance_id ? (
            <button type="button" className={`secondary-button inline-action ${transferFeedbackState === "pending" ? "is-pending" : ""} ${transferFeedbackState === "success" ? "is-success" : ""}`.trim()} aria-busy={transferFeedbackState === "pending"} disabled={props.isRunningItemAction} onClick={() => props.actions.executeSingleItemTransfer(props.template, item)}>
              {getLoadoutActionButtonLabel("transfer", transferFeedbackState)}
            </button>
          ) : null}
          {!blockedDetails && status.key === "current-inventory" ? (
            <button type="button" className={`secondary-button inline-action ${equipFeedbackState === "pending" ? "is-pending" : ""} ${equipFeedbackState === "success" ? "is-success" : ""}`.trim()} aria-busy={equipFeedbackState === "pending"} disabled={props.isRunningItemAction} onClick={() => props.actions.equipSingleItem(props.template, item)}>
              {getLoadoutActionButtonLabel("equip", equipFeedbackState)}
            </button>
          ) : null}
          <button type="button" className="secondary-button" onClick={() => props.actions.openTemplateSourceItem(item, props.template.character_id)}>
            {loadoutsText(props.copy, "查看来源")}
          </button>
        </div>
      ) : null}
    </li>
  );
}
