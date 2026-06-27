import type {
  AccountItemSummary,
  AccountSummary,
  LoadoutTemplate
} from "../../api/client";
import {
  createAccountPageWorkspace,
  formatAccountItemMeta,
  getAccountPageItemKey,
  type AccountSlotComparisonRow
} from "@d2-tools/app";
import {
  matchesLoadoutTemplateItem,
  type LoadoutTemplateLookup
} from "../../shared/domain/loadouts/loadoutLookup";

type AccountItemSource = "equipped" | "inventory";
export function AccountPage(props: {
  accountSummary: AccountSummary | null;
  selectedCharacterId: string;
  isLoadingAccount: boolean;
  accountError: string;
  itemDetailError: string;
  itemDetailLoadingKey: string;
  writeActionsEnabled: boolean;
  loadoutMessage: string;
  itemActionMessage: string;
  isRunningItemAction: boolean;
  activeLoadoutLookup: LoadoutTemplateLookup | null;
  activeLoadoutTemplate: LoadoutTemplate | null;
  onLoadAccount: () => void;
  onSelectCharacter: (characterId: string) => void;
  onSaveCharacterLoadout: (character: AccountSummary["characters"][number]) => void;
  onEquipHighestPowerItems: (character: AccountSummary["characters"][number]) => void;
  onOpenItem: (
    item: AccountItemSummary,
    options: {
      source_character_id: string;
      source_kind?: AccountItemSource;
      is_postmaster_item?: boolean;
    }
  ) => void;
}) {
  const { accountSummary } = props;
  const accountWorkspace = createAccountPageWorkspace({
    account: accountSummary,
    selectedCharacterId: props.selectedCharacterId,
    openingItemKey: props.itemDetailLoadingKey,
    isLoadoutMatch: (item) => matchesLoadoutTemplateItem(item, props.activeLoadoutLookup)
  });
  const selectedCharacter = accountWorkspace.selectedCharacter;

  return (
    <section className="tool-panel account-dashboard-panel account-page">
      <div className="section-heading">
        <div>
          <h2>账号摘要</h2>
          <p>读取当前 Bungie 账号、角色装备、背包、材料和邮政官。</p>
        </div>
        <button type="button" disabled={props.isLoadingAccount} onClick={props.onLoadAccount}>
          {props.isLoadingAccount ? "读取中..." : "读取账号数据"}
        </button>
      </div>
      {props.accountError ? <p className="status-message status-error">{props.accountError}</p> : null}
      {props.itemDetailError ? <p className="status-message status-error">{props.itemDetailError}</p> : null}
      {accountSummary && selectedCharacter ? (
        <div className="account-summary">
          <div className="account-profile-strip">
            <div>
              <h3>{accountSummary.account_name}</h3>
              <p>{accountWorkspace.accountProfileLine}</p>
              <p>{accountWorkspace.accountInventoryLine}</p>
            </div>
            <div className="character-tabs" role="tablist" aria-label="角色切换">
              {accountWorkspace.characterTabs.map((tab) => (
                <button
                  type="button"
                  role="tab"
                  aria-selected={tab.isSelected}
                  className={tab.isSelected ? "character-tab active" : "character-tab"}
                  key={tab.key}
                  onClick={() => props.onSelectCharacter(tab.character.character_id)}
                >
                  {tab.emblemUrl ? <img alt="" src={tab.emblemUrl} /> : null}
                  <span>{tab.className}</span>
                  <strong>{tab.lightLabel}</strong>
                </button>
              ))}
            </div>
          </div>

          <div className="account-primary-workbench">
            <article className="character-card character-card-focused account-character-summary">
              <div className="character-title">
                {selectedCharacter.emblem_url ? <img alt="" src={selectedCharacter.emblem_url} /> : null}
                <div>
                  <h3>{selectedCharacter.class_name}</h3>
                  <p>{accountWorkspace.selectedCharacterSummary}</p>
                </div>
                <div className="character-actions">
                  <button type="button" className="inline-action" onClick={() => props.onSaveCharacterLoadout(selectedCharacter)}>
                    保存当前装备为模板
                  </button>
                  <button
                    type="button"
                    className="inline-action"
                    disabled={props.isRunningItemAction}
                    aria-describedby="highest-power-feedback"
                    onClick={() => props.onEquipHighestPowerItems(selectedCharacter)}
                  >
                    {props.isRunningItemAction ? "执行中..." : "装备最高光等"}
                  </button>
                </div>
                {(!props.writeActionsEnabled || props.loadoutMessage || props.itemActionMessage) ? (
                  <div
                    id="highest-power-feedback"
                    className="character-action-feedback"
                    role="status"
                    aria-live="polite"
                  >
                    {!props.writeActionsEnabled ? (
                      <p className="status-message status-warning">d2-tools 本地写操作开关未开启，请先到设置页开启。</p>
                    ) : null}
                    {props.loadoutMessage ? <p className="status-message status-ready">{props.loadoutMessage}</p> : null}
                    {props.itemActionMessage ? <p className={props.itemActionMessage.includes("失败") ? "status-message status-error" : "status-message status-ready"}>{props.itemActionMessage}</p> : null}
                  </div>
                ) : null}
              </div>
            </article>

            <section className="character-card account-slot-comparison">
              <div className="equipment-section-heading">
                <h4>当前角色装备与背包</h4>
                <span>
                  装备 {selectedCharacter.equipped_items.length} 件 / 背包 {selectedCharacter.inventory_items.length} 件
                  {props.activeLoadoutTemplate ? ` / 方案命中 ${accountWorkspace.selectedCharacterLoadoutMatchCount}` : ""}
                </span>
              </div>
              <AccountSlotComparison
                rows={accountWorkspace.slotComparisonRows}
                highlightedTemplate={props.activeLoadoutLookup}
                openingItemKey={props.itemDetailLoadingKey}
                onOpenEquippedItem={(item) => props.onOpenItem(item, {
                    source_character_id: selectedCharacter.character_id,
                    source_kind: "equipped"
                  })}
                onOpenInventoryItem={(item) => props.onOpenItem(item, {
                    source_character_id: selectedCharacter.character_id,
                    source_kind: "inventory"
                  })}
              />
            </section>
          </div>

          <div className="account-secondary-workbench">
            <section className="vault-preview">
              <div className="section-heading compact-heading">
                <div>
                  <h3>材料与消耗品</h3>
                  <p>副本、日常和商人交互常用资源，按账号维度读取。</p>
                </div>
              </div>
              {accountWorkspace.materialRows.length ? (
                <div className="material-grid">
                  {accountWorkspace.materialRows.map((row) => (
                    <div className="material-item" key={row.key}>
                      {row.material.icon ? <img alt="" src={row.material.icon} /> : <div className="item-icon-placeholder" />}
                      <div>
                        <strong>{row.material.name}</strong>
                        <span>{row.meta}</span>
                      </div>
                      <b>{row.material.quantity}</b>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="status-message status-neutral">没有读取到账号材料或货币。</p>
              )}
            </section>

            <section className="vault-preview">
              <div className="section-heading compact-heading">
                <div>
                  <h3>邮政官</h3>
                  <p>只读显示角色邮政官里的待领取物品，先帮助你发现堆积。</p>
                </div>
              </div>
              {accountWorkspace.postmasterPreviewItems.length ? (
                <div className="equipment-grid">
                  {accountWorkspace.postmasterPreviewItems.map((entry) => {
                    return (
                      <button
                        type="button"
                        className={[
                          "equipment-item",
                          "inventory",
                          entry.isPending ? "pending" : "",
                          entry.isLoadoutMatch ? "loadout-highlight" : ""
                        ].filter(Boolean).join(" ")}
                        key={entry.key}
                        aria-busy={entry.isPending}
                        onClick={() => props.onOpenItem(entry.item, {
                          source_character_id: selectedCharacter.character_id,
                          is_postmaster_item: true
                        })}
                      >
                        {entry.item.icon ? <img alt="" src={entry.item.icon} /> : <div className="item-icon-placeholder" />}
                        <div>
                          <strong>{entry.item.name}</strong>
                          {entry.isLoadoutMatch ? <small className="loadout-template-badge">方案命中</small> : null}
                          <span>{entry.meta}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="status-message status-neutral">当前角色邮政官为空。</p>
              )}
            </section>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function AccountSlotComparison(props: {
  rows: AccountSlotComparisonRow[];
  highlightedTemplate?: LoadoutTemplateLookup | null;
  openingItemKey: string;
  onOpenEquippedItem: (item: AccountItemSummary) => void;
  onOpenInventoryItem: (item: AccountItemSummary) => void;
}) {
  return (
    <div className="account-slot-comparison-list">
      {props.rows.map((row) => (
        <article className="account-slot-comparison-row" key={row.key}>
          <div className="account-slot-heading">
            <strong>{row.label}</strong>
            <span>装备 {row.equippedItems.length} / 背包 {row.inventoryItems.length}</span>
          </div>
          <div className="account-slot-comparison-columns">
            <section className="account-slot-comparison-column account-equipped-panel">
              <h5>当前角色装备</h5>
              {renderAccountItemGrid(row.equippedItems, "equipped", {
                highlightedTemplate: props.highlightedTemplate,
                openingItemKey: props.openingItemKey,
                onOpenItem: props.onOpenEquippedItem
              })}
            </section>
            <section className="account-slot-comparison-column account-inventory-panel">
              <h5>当前角色背包</h5>
              {renderAccountItemGrid(row.inventoryItems, "inventory", {
                highlightedTemplate: props.highlightedTemplate,
                openingItemKey: props.openingItemKey,
                onOpenItem: props.onOpenInventoryItem
              })}
            </section>
          </div>
        </article>
      ))}
    </div>
  );
}

function renderAccountItemGrid(
  items: AccountItemSummary[],
  source: AccountItemSource,
  props: {
    highlightedTemplate?: LoadoutTemplateLookup | null;
    openingItemKey: string;
    onOpenItem: (item: AccountItemSummary) => void;
  }
) {
  if (!items.length) {
    return <p className="muted-copy">暂无</p>;
  }

  return (
    <div className="equipment-grid">
      {items.map((item) => {
        const isPending = getAccountPageItemKey(item) === props.openingItemKey;
        const isLoadoutMatch = matchesLoadoutTemplateItem(item, props.highlightedTemplate);
        return (
          <button
            type="button"
            className={[
              "equipment-item",
              source === "equipped" ? "equipped" : "inventory",
              isPending ? "pending" : "",
              isLoadoutMatch ? "loadout-highlight" : ""
            ].filter(Boolean).join(" ")}
            key={`${source}-${item.hash}-${item.instance_id ?? item.name}`}
            aria-busy={isPending}
            onClick={() => props.onOpenItem(item)}
          >
            {item.icon ? <img alt="" src={item.icon} /> : <div className="item-icon-placeholder" />}
            <div>
              <strong>{item.name}</strong>
              {isLoadoutMatch ? <small className="loadout-template-badge">方案命中</small> : null}
              <span>{formatAccountItemMeta(item)}</span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
