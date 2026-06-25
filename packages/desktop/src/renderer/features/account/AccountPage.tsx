import type {
  AccountItemSummary,
  AccountSummary,
  LoadoutTemplate
} from "../../api/client";
import {
  matchesLoadoutTemplateItem,
  type LoadoutTemplateLookup
} from "../../shared/domain/loadouts/loadoutLookup";
import { groupAccountItemsBySlot, type AccountSlotCategory } from "../../utils/accountSlots";

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
  onEquipSavedLoadout: (
    character: AccountSummary["characters"][number],
    slot: AccountSummary["characters"][number]["loadout_slots"][number]
  ) => void;
  onSnapshotCurrentLoadout: (
    character: AccountSummary["characters"][number],
    slot: AccountSummary["characters"][number]["loadout_slots"][number]
  ) => void;
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
  const selectedCharacter = accountSummary?.characters.find((character) => character.character_id === props.selectedCharacterId)
    ?? accountSummary?.characters[0]
    ?? null;
  const selectedCharacterLoadoutMatchCount = selectedCharacter && props.activeLoadoutLookup
    ? getCharacterCombinedItems(selectedCharacter)
      .filter((item) => matchesLoadoutTemplateItem(item, props.activeLoadoutLookup))
      .length
    : 0;

  return (
    <section className="tool-panel account-page">
      <div className="section-heading">
        <div>
          <h2>账号摘要</h2>
          <p>读取当前 Bungie 账号、角色装备、背包、材料和邮政官。</p>
        </div>
        <button type="button" disabled={props.isLoadingAccount} onClick={props.onLoadAccount}>
          {props.isLoadingAccount ? "读取中..." : "读取账号数据"}
        </button>
      </div>
      {props.accountError ? <p className="error">{props.accountError}</p> : null}
      {props.itemDetailError ? <p className="error">{props.itemDetailError}</p> : null}
      {accountSummary && selectedCharacter ? (
        <div className="account-summary">
          <div className="account-profile-strip">
            <div>
              <h3>{accountSummary.account_name}</h3>
              <p>Membership {accountSummary.membership_type} / {accountSummary.destiny_membership_id}</p>
              <p>仓库装备：{accountSummary.vault.item_count} / 材料与消耗品：{accountSummary.materials.item_count}</p>
            </div>
            <div className="character-tabs" role="tablist" aria-label="角色切换">
              {accountSummary.characters.map((character) => (
                <button
                  type="button"
                  role="tab"
                  aria-selected={selectedCharacter.character_id === character.character_id}
                  className={selectedCharacter.character_id === character.character_id ? "character-tab active" : "character-tab"}
                  key={character.character_id}
                  onClick={() => props.onSelectCharacter(character.character_id)}
                >
                  {character.emblem_url ? <img alt="" src={character.emblem_url} /> : null}
                  <span>{character.class_name}</span>
                  <strong>光等 {character.light ?? "-"}</strong>
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
                  <p>
                    光等 {selectedCharacter.light ?? "-"} / 已装备 {selectedCharacter.equipped_items.length} 件 / 背包 {selectedCharacter.inventory_items.length} 件
                  </p>
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
                      <p className="notice">d2-tools 本地写操作开关未开启，请先到设置页开启。</p>
                    ) : null}
                    {props.loadoutMessage ? <p className="notice">{props.loadoutMessage}</p> : null}
                    {props.itemActionMessage ? <p className={props.itemActionMessage.includes("失败") ? "error" : "notice"}>{props.itemActionMessage}</p> : null}
                  </div>
                ) : null}
              </div>
            </article>

            <section className="character-card account-equipped-panel">
              <div className="equipment-section-heading">
                <h4>当前角色装备</h4>
                <span>
                  {selectedCharacter.equipped_items.length} 件
                  {props.activeLoadoutTemplate ? ` / 方案命中 ${selectedCharacterLoadoutMatchCount}` : ""}
                </span>
              </div>
              <AccountSlotCategories
                categories={groupAccountItemsBySlot(selectedCharacter.equipped_items)}
                highlightedTemplate={props.activeLoadoutLookup}
                openingItemKey={props.itemDetailLoadingKey}
                source="equipped"
                onOpenItem={(item) => props.onOpenItem(item, {
                  source_character_id: selectedCharacter.character_id,
                  source_kind: "equipped"
                })}
              />
            </section>

            <section className="character-card account-inventory-panel">
              <div className="equipment-section-heading">
                <h4>当前角色背包</h4>
                <span>{selectedCharacter.inventory_items.length} 件</span>
              </div>
              <AccountSlotCategories
                categories={groupAccountItemsBySlot(selectedCharacter.inventory_items)}
                highlightedTemplate={props.activeLoadoutLookup}
                openingItemKey={props.itemDetailLoadingKey}
                source="inventory"
                onOpenItem={(item) => props.onOpenItem(item, {
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
              {accountSummary.materials.items.length ? (
                <div className="material-grid">
                  {accountSummary.materials.items.map((material) => (
                    <div className="material-item" key={material.hash}>
                      {material.icon ? <img alt="" src={material.icon} /> : <div className="item-icon-placeholder" />}
                      <div>
                        <strong>{material.name}</strong>
                        <span>{[material.tier, material.item_type].filter(Boolean).join(" / ") || "材料"}</span>
                      </div>
                      <b>{material.quantity}</b>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="notice">没有读取到账号材料或货币。</p>
              )}
            </section>

            <section className="vault-preview">
              <div className="section-heading compact-heading">
                <div>
                  <h3>游戏内配装栏</h3>
                  <p>读取 Bungie 游戏内已保存的配装槽，执行写操作前仍会再次确认。</p>
                </div>
              </div>
              {selectedCharacter.loadout_slots.length ? (
                <div className="action-log-list">
                  {selectedCharacter.loadout_slots.map((slot) => (
                    <div className="action-log-row log-ok" key={`${selectedCharacter.character_id}-loadout-${slot.index}`}>
                      <strong>{slot.name || `配装栏 ${slot.index + 1}`}</strong>
                      <span>槽位 {slot.index + 1} / {slot.item_count} 件装备</span>
                      <small>{slot.items.slice(0, 4).map((item) => item.name).join(" / ") || "当前槽位为空"}</small>
                      <div className="button-row">
                        <button
                          type="button"
                          className="secondary-button"
                          disabled={props.isRunningItemAction}
                          onClick={() => props.onEquipSavedLoadout(selectedCharacter, slot)}
                        >
                          应用到当前角色
                        </button>
                        <button
                          type="button"
                          className="secondary-button"
                          disabled={props.isRunningItemAction}
                          onClick={() => props.onSnapshotCurrentLoadout(selectedCharacter, slot)}
                        >
                          用当前装备覆盖
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="notice">当前角色还没有读取到游戏内配装栏。</p>
              )}
            </section>

            <section className="vault-preview">
              <div className="section-heading compact-heading">
                <div>
                  <h3>邮政官</h3>
                  <p>只读显示角色邮政官里的待领取物品，先帮助你发现堆积。</p>
                </div>
              </div>
              {selectedCharacter.postmaster_items.length ? (
                <div className="equipment-grid">
                  {selectedCharacter.postmaster_items.slice(0, 12).map((item) => {
                    const isPending = getItemKey(item) === props.itemDetailLoadingKey;
                    const isLoadoutMatch = matchesLoadoutTemplateItem(item, props.activeLoadoutLookup);
                    return (
                      <button
                        type="button"
                        className={[
                          "equipment-item",
                          "inventory",
                          isPending ? "pending" : "",
                          isLoadoutMatch ? "loadout-highlight" : ""
                        ].filter(Boolean).join(" ")}
                        key={`${item.hash}-${item.instance_id ?? "postmaster"}`}
                        aria-busy={isPending}
                        onClick={() => props.onOpenItem(item, {
                          source_character_id: selectedCharacter.character_id,
                          is_postmaster_item: true
                        })}
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
              ) : (
                <p className="notice">当前角色邮政官为空。</p>
              )}
            </section>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function AccountSlotCategories(props: {
  categories: AccountSlotCategory[];
  highlightedTemplate?: LoadoutTemplateLookup | null;
  openingItemKey: string;
  source: AccountItemSource;
  onOpenItem: (item: AccountItemSummary) => void;
}) {
  return (
    <div className="account-slot-categories">
      {props.categories.map((category) => (
        <section className="account-slot-category" key={category.key}>
          <div className="account-slot-category-heading">
            <h4>{category.label}</h4>
            <span>{category.count} 件</span>
          </div>
          <div className="account-slot-group-list">
            {category.groups.map((group) => (
              <div className="account-slot-group" key={group.key}>
                <div className="account-slot-heading">
                  <strong>{group.label}</strong>
                  <span>{group.items.length} 件</span>
                </div>
                {renderAccountItemGrid(group.items, props.source, props)}
              </div>
            ))}
          </div>
        </section>
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
        const isPending = getItemKey(item) === props.openingItemKey;
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

function getCharacterCombinedItems(character: AccountSummary["characters"][number]): AccountItemSummary[] {
  return [
    ...character.equipped_items,
    ...character.inventory_items
  ];
}

function getItemKey(item: AccountItemSummary): string {
  return item.instance_id ? item.instance_id : `hash:${item.hash}`;
}

function formatAccountItemMeta(item: AccountItemSummary): string {
  return [
    item.bucket_name,
    item.tier,
    item.power ? `光等 ${item.power}` : undefined,
    formatArmorStatsSummary(item),
    item.locked ? "已锁定" : undefined
  ].filter(Boolean).join(" / ");
}

function formatArmorStatsSummary(item: Pick<AccountItemSummary, "armor_stats">): string | undefined {
  if (!item.armor_stats) {
    return undefined;
  }

  return [
    `总值 ${item.armor_stats.total}`,
    `生命值 ${item.armor_stats.health}`,
    `职业 ${item.armor_stats.class}`,
    `手雷 ${item.armor_stats.grenade}`
  ].join(" / ");
}
