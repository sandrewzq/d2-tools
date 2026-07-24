import { useState } from "react";
import type { LoadoutsPageModel, LoadoutEntryView, LoadoutTemplateItemRowView } from "@d2-tools/app/loadouts";
import type { AccountSummary } from "@d2-tools/core/account/summary";
import type { LoadoutTemplate } from "@d2-tools/core/loadouts/templates";
import type { LoadoutTemplateAnalysis } from "@d2-tools/core/loadouts/analysis";
import { getLoadoutActionButtonLabel, type LoadoutActionFeedbackState } from "./loadoutActionFeedback.js";
import { getLocaleCopy } from "../i18n/copy.js";
import type { InterfaceLocale, LoadoutsCopy } from "../i18n/types.js";
import {
  ProductWorkspaceEmptyState,
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
  const [entrySourceFilter, setEntrySourceFilter] = useState<LoadoutEntrySourceFilter>("all");
  const visibleLoadoutEntries = entrySourceFilter === "all"
    ? props.model.entries
    : props.model.entries.filter((entry) => entry.source === entrySourceFilter);

  return <LoadoutsPageWorkspace {...props} copy={copy} entrySourceFilter={entrySourceFilter} setEntrySourceFilter={setEntrySourceFilter} visibleLoadoutEntries={visibleLoadoutEntries} />;
}
function LoadoutsPageWorkspace(props: LoadoutsPageContentViewProps & {
  copy: LoadoutsCopy;
  entrySourceFilter: LoadoutEntrySourceFilter;
  setEntrySourceFilter: (filter: LoadoutEntrySourceFilter) => void;
  visibleLoadoutEntries: LoadoutEntryView[];
}) {
  const selectedDetail = props.model.selectedDetail;
  return (
    <>
      {props.message ? <p className={`loadout-inline-feedback ${props.message.includes(props.copy.inline["失败"] ?? "失败") ? "status-message status-error" : "status-message status-ready"}`}>{props.message}</p> : null}
      <div className="loadout-risk-grid" aria-label="配装状态摘要">
        <div><span>缺失件</span><strong>{props.model.riskSummary.missingCount}</strong><small>账号内未找到或暂时受阻</small></div>
        <div><span>当前配装</span><strong>{props.model.entries.length}</strong><small>本地模板与游戏内配装栏</small></div>
        <div><span>可定位件</span><strong>{props.model.riskSummary.readyCount + props.model.riskSummary.actionableCount}</strong><small>当前账号快照可继续处理</small></div>
      </div>
      <ProductWorkspaceSplit className="loadout-workbench">
        <ProductWorkspaceSideRail element="section" className="loadout-directory">
          <div className="loadout-column-head"><h3>配装对象</h3><span>{props.model.entries.length} 个</span></div>
          <div className="loadout-tabs" role="tablist" aria-label={loadoutsText(props.copy, "配装来源")}>
            {(["all", "local-template", "in-game"] as const).map((source) => (
              <button type="button" key={source} className={props.entrySourceFilter === source ? "active" : ""} onClick={() => props.setEntrySourceFilter(source)}>
                {getLoadoutEntryFilterLabel(source, props.copy)}
              </button>
            ))}
          </div>
          <div className="loadout-entry-list">
            {props.visibleLoadoutEntries.map((entry) => (
              <LoadoutEntryRow
                key={entry.id}
                copy={props.copy}
                entry={entry}
                interfaceLocale={props.interfaceLocale}
                isSelected={props.model.selectedEntryId === entry.id}
                isRunningItemAction={props.isRunningItemAction}
                actions={props.actions}
              />
            ))}
          </div>
        </ProductWorkspaceSideRail>

        <section className="loadout-detail">
          {selectedDetail.kind === "local-template" ? (
            <>
              <div className="loadout-detail-head">
                <div><span>本地模板</span><h2>{selectedDetail.template.name}</h2><p>{selectedDetail.template.items.length} 件装备 · {selectedDetail.template.class_name || "未限定职业"}</p></div>
                <span className="app-chip status-ready">{props.model.riskSummary.missingCount ? `${props.model.riskSummary.missingCount} 件待补齐` : "可以应用"}</span>
              </div>
              <div className="loadout-toolbar">
                <input value={props.renameDraft} onChange={(event) => props.actions.renameDraftChange(event.target.value)} aria-label="配装名称" />
                <button type="button" className="secondary-button" onClick={() => props.actions.renameTemplate(selectedDetail.template)}>重命名</button>
                <button type="button" className="secondary-button" onClick={() => props.actions.createTransferPlan(selectedDetail.template)}>生成转移计划</button>
                <button type="button" className="secondary-button" onClick={() => props.actions.copyMissingItems(selectedDetail.template, selectedDetail.analysis)}>复制缺失清单</button>
                <button type="button" className="primary-button" disabled={props.isRunningItemAction} onClick={() => props.actions.executeMissingTransfer(selectedDetail.template, selectedDetail.analysis)}>转移缺失件</button>
                <button type="button" className="secondary-button" onClick={() => props.actions.deleteTemplate(selectedDetail.template.id)}>删除</button>
              </div>
              {selectedDetail.transferPlan?.blocked.length ? <p className="status-message status-warning">有 {selectedDetail.transferPlan.blocked.length} 件当前无法自动补齐，物品行会显示原因。</p> : null}
              <div className="loadout-column-head"><h3>方案装备</h3><span>{selectedDetail.itemRows.length} 件</span></div>
              <ul className="loadout-item-list">
                {selectedDetail.itemRows.map((row, index) => (
                  <LoadoutItemRow
                    key={`${selectedDetail.template.id}-${row.item.instance_id ?? row.item.hash}-${index}`}
                    actionFeedback={props.actionFeedback}
                    isRunningItemAction={props.isRunningItemAction}
                    row={row}
                    template={selectedDetail.template}
                    actions={props.actions}
                    copy={props.copy}
                  />
                ))}
              </ul>
              <div className="loadout-compare-controls">
                <label><span>对比方案</span><select value={props.compareTemplateId} onChange={(event) => props.actions.selectCompareTemplate(event.target.value)}><option value="">不对比</option>{props.model.compare.options.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}</select></label>
                <label className="checkbox-row"><input type="checkbox" checked={props.showDiffOnly} onChange={(event) => props.actions.showDiffOnlyChange(event.target.checked)} /><span>仅看差异</span></label>
              </div>
            </>
          ) : selectedDetail.kind === "in-game-slot" ? (
            <InGameLoadoutSlotDetail copy={props.copy} character={selectedDetail.character} slot={selectedDetail.slot} isRunningItemAction={props.isRunningItemAction} actions={props.actions} />
          ) : (
            <ProductWorkspaceEmptyState><h3>{selectedDetail.title}</h3><p>{selectedDetail.message}</p></ProductWorkspaceEmptyState>
          )}
        </section>

        <aside className="loadout-summary">
          <div className="loadout-column-head"><h3>当前方案摘要</h3><span>{selectedDetail.kind === "in-game-slot" ? "游戏内配装栏" : "本地模板"}</span></div>
          <div className="loadout-ledger">
            <div><strong>已装备</strong><span><b>{props.model.riskSummary.readyCount} 件</b><small>目标角色当前已经就位</small></span><em className="ready">就位</em></div>
            <div><strong>可操作</strong><span><b>{props.model.riskSummary.actionableCount} 件</b><small>背包或仓库内可继续处理</small></span><em>可操作</em></div>
            <div><strong>缺失 / 阻塞</strong><span><b>{props.model.riskSummary.missingCount} 件</b><small>账号内未找到或写操作受限</small></span><em className={props.model.riskSummary.missingCount ? "warning" : "ready"}>{props.model.riskSummary.missingCount ? "复核" : "无"}</em></div>
          </div>
          <p className="loadout-guidance">本地模板可以重命名、生成转移计划、复制缺失清单、转移缺失件和删除。每件装备可单独转移、装备或查看来源。</p>
        </aside>
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
    <>
      <div className="loadout-detail-head">
        <div>
          <span>{loadoutsText(props.copy, "游戏内配装栏")}</span>
          <h2>{props.slot.name || `${loadoutsText(props.copy, "配装栏")} ${props.slot.index + 1}`}</h2>
          <p>{props.character.class_name} / {loadoutsText(props.copy, "槽位")} {props.slot.index + 1} / {props.slot.item_count} {loadoutsText(props.copy, "件装备")}</p>
        </div>
        <span className="app-chip">游戏内</span>
      </div>
      <div className="loadout-toolbar">
        <button type="button" className="primary-button" disabled={props.isRunningItemAction} onClick={() => props.actions.equipSavedLoadout(props.character, props.slot)}>{loadoutsText(props.copy, "应用到角色")}</button>
        <button type="button" className="secondary-button" disabled={props.isRunningItemAction} onClick={() => props.actions.snapshotCurrentLoadout(props.character, props.slot)}>{loadoutsText(props.copy, "用当前装备覆盖")}</button>
      </div>
      <p className="loadout-in-game-boundary">{loadoutsText(props.copy, "这是 Bungie 游戏内配装栏，当前只能应用到角色或用当前装备覆盖；重命名和删除请在游戏内完成。")}</p>
      {props.slot.items.length ? (
        <>
          <div className="loadout-column-head"><h3>方案装备</h3><span>{props.slot.items.length} 件</span></div>
          <ul className="loadout-in-game-item-list">
          {props.slot.items.map((item, index) => (
            <li key={`${props.character.character_id}-${props.slot.index}-${item.instance_id ?? index}`}>
              <div><b>{item.name}</b><span>{item.bucket_name || loadoutsText(props.copy, "未知槽位")}</span></div>
              <small>{item.instance_id ? `${loadoutsText(props.copy, "物品")} ${item.instance_id}` : loadoutsText(props.copy, "暂无物品实例 ID")}</small>
            </li>
          ))}
          </ul>
        </>
      ) : (
        <p className="status-message status-neutral">{loadoutsText(props.copy, "当前槽位为空")}</p>
      )}
    </>
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
      <div className="loadout-item-icon">
        {sourceItem?.icon ? <img src={sourceItem.icon} alt="" /> : <div className="item-icon-placeholder" />}
      </div>
      <div className="loadout-item-copy">
        <b>{item.name}</b>
        <small>{[status.location_label, item.bucket_name, item.weapon_frame_name, item.perk_names?.slice(0, 2).join(" / ")].filter(Boolean).join(" / ") || loadoutsText(props.copy, "暂无额外信息")}</small>
        {status.guidance_label && !blockedDetails ? <small className="loadout-blocked-reason">{status.guidance_label}{status.guidance_hint ? ` · ${status.guidance_hint}` : ""}</small> : null}
        {blockedDetails ? <small className="loadout-blocked-reason">{loadoutsText(props.copy, "无法自动补齐：")}{blockedDetails.label} · {blockedDetails.hint}</small> : null}
      </div>
      <div className="loadout-item-actions">
        <span className={`loadout-status-badge ${status.badge_tone}`}>{status.badge_label}</span>
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
      </div>
    </li>
  );
}
