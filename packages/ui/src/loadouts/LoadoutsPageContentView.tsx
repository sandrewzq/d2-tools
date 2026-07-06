import { useMemo, useState } from "react";
import { LoadoutsPageView } from "./LoadoutsPageView.js";
import { getLoadoutActionButtonLabel, type LoadoutActionFeedbackState } from "./loadoutActionFeedback.js";
import { getLocaleCopy } from "../i18n/copy.js";
import type { InterfaceLocale, LoadoutsCopy } from "../i18n/types.js";
import {
  ProductWorkspaceContentStack,
  ProductWorkspaceEmptyState,
  ProductWorkspaceSideRail,
  ProductWorkspaceSplit
} from "../workspace/ProductWorkspace.js";

export type LoadoutsPageContentViewProps = {
  interfaceLocale?: InterfaceLocale;
  accountSummary: any | null;
  templates: any[];
  loadoutEntries?: LoadoutEntry[];
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
  showInternalHeading?: boolean;
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

export type LoadoutEntry = {
  id: string;
  source: "local-template" | "in-game";
  title: string;
  subtitle: string;
  statusLabel: string;
  statusTone: "neutral" | "ready" | "warning";
  preview: string;
  templateId?: string;
  characterId?: string;
  slotIndex?: number;
};

type LoadoutEntrySourceFilter = "all" | LoadoutEntry["source"];

function loadoutsText(copy: LoadoutsCopy, key: string): string {
  return copy.inline[key] ?? key;
}

export function LoadoutsPageContentView(props: LoadoutsPageContentViewProps) {
  const copy = getLocaleCopy(props.interfaceLocale ?? "zh-CN").loadouts;
  const selectedTemplate = props.selectedTemplate;
  const compareTemplate = props.compareTemplate;
  const [entrySourceFilter, setEntrySourceFilter] = useState<LoadoutEntrySourceFilter>("all");
  const loadoutEntries = useMemo(
    () => props.loadoutEntries ?? buildFallbackLoadoutEntries(props, copy),
    [copy, props.accountSummary, props.loadoutEntries, props.missingCount, props.selectedTemplate, props.templates]
  );
  const visibleLoadoutEntries = entrySourceFilter === "all"
    ? loadoutEntries
    : loadoutEntries.filter((entry) => entry.source === entrySourceFilter);

  return (
    <LoadoutsPageView
      interfaceLocale={props.interfaceLocale}
      message={props.message}
      missingCount={props.missingCount}
      readyCount={props.readyCount}
      actionableCount={props.actionableCount}
      showInternalHeading={props.showInternalHeading}
    >
      <ProductWorkspaceSplit className="loadout-workbench-shell">
        <ProductWorkspaceSideRail element="section" className="daily-source source-ready loadout-entry-list">
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
                accountSummary={props.accountSummary}
                interfaceLocale={props.interfaceLocale}
                isSelected={entry.templateId ? selectedTemplate?.id === entry.templateId : false}
                isRunningItemAction={props.isRunningItemAction}
                onEquipSavedLoadout={props.onEquipSavedLoadout}
                onSelectTemplate={(templateId) => {
                  const template = props.templates.find((item: any) => item.id === templateId);
                  props.onSelectTemplate(templateId);
                  if (template) props.onRenameDraftChange(template.name);
                }}
                onSnapshotCurrentLoadout={props.onSnapshotCurrentLoadout}
              />
            )) : (
              <p className="status-message status-neutral">{loadoutsText(copy, "没有匹配的配装对象。")}</p>
            )}
          </div>
        </ProductWorkspaceSideRail>
        {selectedTemplate ? (
          <ProductWorkspaceContentStack element="section" className="daily-source source-ready loadout-template-detail product-workspace-panel">
            <strong>{loadoutsText(copy, "方案详情")}</strong>
            <span>
              {props.selectedAnalysis
                ? `${loadoutsText(copy, "已就位")} ${props.readyCount} / ${loadoutsText(copy, "待补齐")} ${props.missingCount}`
                : `${selectedTemplate.items.length} ${loadoutsText(copy, "件装备")}`}
            </span>
            <div className="field-grid">
              <label>
                <span>{loadoutsText(copy, "重命名")}</span>
                <input value={props.renameDraft} onChange={(event) => props.onRenameDraftChange(event.target.value)} placeholder={loadoutsText(copy, "输入方案名称")} />
              </label>
            </div>
            <div className="button-row loadout-template-actions">
              <button type="button" className="secondary-button" onClick={() => props.onRenameTemplate(selectedTemplate)}>{loadoutsText(copy, "重命名")}</button>
              <button type="button" className="secondary-button" onClick={() => props.onCreateTransferPlan(selectedTemplate)}>{loadoutsText(copy, "生成转移计划")}</button>
              <button type="button" className="secondary-button" onClick={() => props.onCopyMissingItems(selectedTemplate, props.selectedAnalysis)}>{loadoutsText(copy, "复制缺失清单")}</button>
              <button type="button" className="secondary-button" disabled={props.isRunningItemAction} onClick={() => props.onExecuteMissingTransfer(selectedTemplate, props.selectedAnalysis)}>
                {props.isRunningItemAction ? loadoutsText(copy, "执行中...") : loadoutsText(copy, "转移缺失件")}
              </button>
              <button type="button" className="secondary-button" onClick={() => props.onDeleteTemplate(selectedTemplate.id)}>{loadoutsText(copy, "删除")}</button>
            </div>
            {props.missingCount > 0 ? (
              <p className="status-message status-pending loadout-detail-callout">{loadoutsText(copy, "当前有")} {props.missingCount} {loadoutsText(copy, "件方案装备还没在目标角色就位，可用“转移缺失件”自动补齐并穿戴。")}</p>
            ) : null}
            {props.statusSummary.length ? (
              <div className="loadout-status-summary">
                {props.statusSummary.map((entry) => (
                  <span className="loadout-status-chip" key={entry.key}>
                    <b>{entry.label}</b>
                    <small>{entry.count} {loadoutsText(copy, "件")}</small>
                  </span>
                ))}
              </div>
            ) : null}
            {props.transferPlan?.blocked.length ? (
              <p className="status-message status-warning loadout-detail-callout">{loadoutsText(copy, "有")} {props.transferPlan.blocked.length} {loadoutsText(copy, "件当前无法自动补齐，下面会显示原因和处理建议。")}</p>
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
                  copy={copy}
                />
              ))}
            </ul>
            <div className="field-grid">
              <label>
                <span>{loadoutsText(copy, "对比方案")}</span>
                <select value={props.compareTemplateId} onChange={(event) => props.onSelectCompareTemplate(event.target.value)}>
                  <option value="">{loadoutsText(copy, "不对比")}</option>
                  {props.templates
                    .filter((template: any) => template.id !== selectedTemplate.id)
                    .map((template: any) => (
                      <option key={template.id} value={template.id}>{template.name}</option>
                    ))}
                </select>
              </label>
              <label className="checkbox-row">
                <input type="checkbox" checked={props.showDiffOnly} onChange={(event) => props.onShowDiffOnlyChange(event.target.checked)} />
                <span>{loadoutsText(copy, "仅看差异")}</span>
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
                      <small>{loadoutsText(copy, "框架：")}{row.left.frame}</small>
                      <small>{loadoutsText(copy, "Perk：")}{props.formatComparePerks(row.left.perks)}</small>
                    </section>
                    <section className="loadout-compare-side">
                      <strong>{compareTemplate.name}</strong>
                      <span>{row.right.name}</span>
                      <small>{loadoutsText(copy, "框架：")}{row.right.frame}</small>
                      <small>{loadoutsText(copy, "Perk：")}{props.formatComparePerks(row.right.perks)}</small>
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
          </ProductWorkspaceContentStack>
        ) : (
          <ProductWorkspaceEmptyState element="section" className="source-status-card source-status-neutral loadout-template-detail product-workspace-panel">
            <span className="source-status-badge source-status-neutral">{loadoutsText(copy, "本地方案")}</span>
            <h3>{loadoutsText(copy, "还没有保存本地方案")}</h3>
            <p>{loadoutsText(copy, "先到账号页选择角色，把当前装备保存为模板。保存后这里会集中处理补齐、对比和清单复制。")}</p>
          </ProductWorkspaceEmptyState>
        )}
      </ProductWorkspaceSplit>
    </LoadoutsPageView>
  );
}

function LoadoutEntryRow(props: {
  copy: LoadoutsCopy;
  entry: LoadoutEntry;
  accountSummary: any | null;
  interfaceLocale?: InterfaceLocale;
  isSelected: boolean;
  isRunningItemAction: boolean;
  onSelectTemplate: (id: string) => void;
  onEquipSavedLoadout: (character: any, slot: any) => void;
  onSnapshotCurrentLoadout: (character: any, slot: any) => void;
}) {
  const sourceLabel = props.entry.source === "in-game"
    ? loadoutsText(props.copy, "游戏内")
    : loadoutsText(props.copy, "本地模板");

  if (props.entry.source === "local-template" && props.entry.templateId) {
    return (
      <button
        type="button"
        className={`action-log-row loadout-entry-row ${props.isSelected ? "log-ok is-selected" : ""}`.trim()}
        onClick={() => props.onSelectTemplate(props.entry.templateId ?? "")}
      >
        <span className={`loadout-entry-source-badge source-${props.entry.source}`}>{sourceLabel}</span>
        <strong>{props.entry.title}</strong>
        <span>{localizeLoadoutEntryText(props.entry.subtitle, props.copy)}</span>
        <small>{formatLoadoutEntryPreview(props.entry.preview, props.copy, props.interfaceLocale)}</small>
        <span className={`loadout-entry-status status-${props.entry.statusTone}`}>{localizeLoadoutEntryText(props.entry.statusLabel, props.copy)}</span>
      </button>
    );
  }

  const character = props.accountSummary?.characters.find((item: any) => item.character_id === props.entry.characterId);
  const slot = character?.loadout_slots.find((item: any) => item.index === props.entry.slotIndex);

  return (
    <div className="action-log-row loadout-entry-row">
      <span className={`loadout-entry-source-badge source-${props.entry.source}`}>{sourceLabel}</span>
      <strong>{props.entry.title}</strong>
      <span>{localizeLoadoutEntryText(props.entry.subtitle, props.copy)}</span>
      <small>{localizeLoadoutEntryText(props.entry.preview, props.copy)}</small>
      <span className={`loadout-entry-status status-${props.entry.statusTone}`}>{localizeLoadoutEntryText(props.entry.statusLabel, props.copy)}</span>
      {character && slot ? (
        <div className="button-row compact">
          <button type="button" className="secondary-button" disabled={props.isRunningItemAction} onClick={() => props.onEquipSavedLoadout(character, slot)}>
            {loadoutsText(props.copy, "应用到角色")}
          </button>
          <button type="button" className="secondary-button" disabled={props.isRunningItemAction} onClick={() => props.onSnapshotCurrentLoadout(character, slot)}>
            {loadoutsText(props.copy, "用当前装备覆盖")}
          </button>
        </div>
      ) : null}
    </div>
  );
}

function buildFallbackLoadoutEntries(
  props: LoadoutsPageContentViewProps,
  copy: LoadoutsCopy
): LoadoutEntry[] {
  const localEntries = props.templates.map((template: any): LoadoutEntry => {
    const isSelected = props.selectedTemplate?.id === template.id;
      const statusLabel = isSelected
        ? props.missingCount > 0
          ? `${loadoutsText(copy, "待补齐")} ${props.missingCount} ${loadoutsText(copy, "件")}`
          : loadoutsText(copy, "可执行")
      : loadoutsText(copy, "未检查");

    return {
      id: `local-template-${template.id}`,
      source: "local-template",
      title: template.name,
      subtitle: `${template.class_name} / ${template.items.length} ${loadoutsText(copy, "件装备")}`,
      statusLabel,
      statusTone: statusLabel.includes(loadoutsText(copy, "待补齐")) ? "warning" : "ready",
      preview: `${loadoutsText(copy, "更新于")} ${new Date(template.updated_at ?? template.created_at).toLocaleString()}`,
      templateId: template.id
    };
  });

  const inGameEntries = props.accountSummary
    ? props.accountSummary.characters.flatMap((character: any) => (
      character.loadout_slots.map((slot: any): LoadoutEntry => ({
        id: `in-game-${character.character_id}-${slot.index}`,
        source: "in-game",
        title: slot.name || `${loadoutsText(copy, "配装栏")} ${slot.index + 1}`,
        subtitle: `${character.class_name} / ${loadoutsText(copy, "槽位")} ${slot.index + 1} / ${slot.item_count} ${loadoutsText(copy, "件装备")}`,
        statusLabel: loadoutsText(copy, "可应用"),
        statusTone: "neutral",
        preview: formatInGameLoadoutSlotPreview(slot, copy),
        characterId: character.character_id,
        slotIndex: slot.index
      }))
    ))
    : [];

  return [...localEntries, ...inGameEntries];
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
    .replace("当前槽位为空", loadoutsText(copy, "当前槽位为空"));
}

function formatInGameLoadoutSlotPreview(slot: any, copy: LoadoutsCopy): string {
  return slot.items.slice(0, 4).map((item: any) => item.name).join(" / ") || loadoutsText(copy, "当前槽位为空");
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
  copy: LoadoutsCopy;
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
      <small>{[status.location_label, props.item.bucket_name, props.item.weapon_frame_name, props.item.perk_names?.slice(0, 2).join(" / ")].filter(Boolean).join(" / ") || loadoutsText(props.copy, "暂无额外信息")}</small>
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
            {loadoutsText(props.copy, "查看来源")}
          </button>
        </div>
      ) : null}
    </li>
  );
}
