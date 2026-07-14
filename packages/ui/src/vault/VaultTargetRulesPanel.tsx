import { useMemo, useState } from "react";
import type { AccountItemSummary } from "@d2-tools/core/account/summary";
import type {
  LocalArmorTargetCondition,
  LocalTargetRules,
  LocalWeaponTargetCondition
} from "@d2-tools/core/analysis/targets";
import type { ArmorStatKey } from "@d2-tools/core/loadouts/analysis";
import type { PerkSearchResult } from "@d2-tools/core/items/perkSearch";
import { armorStatLabels } from "@d2-tools/app/vault";

type DraftCondition = {
  stat: ArmorStatKey | "";
  min: string;
};

type DraftWeaponCondition = {
  perkHash: string;
  perkName?: string;
};

type AvailableWeaponTarget = {
  hash: number;
  name: string;
  perks: Array<{ hash: number; name: string }>;
};

export type VaultTargetRulesActions = {
  onSaveRules?: (rules: LocalTargetRules) => Promise<LocalTargetRules> | LocalTargetRules;
  onClearRules?: () => Promise<LocalTargetRules> | LocalTargetRules;
  onSearchPerks?: (query: string) => Promise<PerkSearchResult[]> | PerkSearchResult[];
};

export function VaultTargetRulesPanel(props: {
  items: AccountItemSummary[];
  rules: LocalTargetRules;
  actions?: VaultTargetRulesActions;
}) {
  const [displayRules, setDisplayRules] = useState(props.rules);
  const [armorName, setArmorName] = useState("");
  const [conditions, setConditions] = useState<DraftCondition[]>([{ stat: "", min: "" }]);
  const [weaponName, setWeaponName] = useState("");
  const [selectedWeaponHash, setSelectedWeaponHash] = useState("");
  const [weaponConditions, setWeaponConditions] = useState<DraftWeaponCondition[]>([{ perkHash: "" }]);
  const [perkSearchQuery, setPerkSearchQuery] = useState("");
  const [perkSearchResults, setPerkSearchResults] = useState<PerkSearchResult[]>([]);
  const [perkSearchMessage, setPerkSearchMessage] = useState("");
  const [isSearchingPerks, setIsSearchingPerks] = useState(false);
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const rules = props.actions ? props.rules : displayRules;
  const availableWeaponTargets = useMemo(
    () => buildAvailableWeaponTargets(props.items),
    [props.items]
  );
  const selectedWeapon = availableWeaponTargets.find((weapon) => String(weapon.hash) === selectedWeaponHash);

  async function saveArmorDraft() {
    const parsedConditions = parseDraftConditions(conditions);
    if (!parsedConditions.length) {
      setMessage("请先添加至少一条有效属性最低值。");
      return;
    }

    const nextRules: LocalTargetRules = {
      action_policy: rules.action_policy,
      armor: [
        ...rules.armor,
        {
          id: `armor-target-${Date.now()}`,
          name: armorName.trim() || formatRuleName(parsedConditions),
          conditions: parsedConditions
        }
      ],
      weapons: rules.weapons ?? []
    };

    await saveRules(nextRules, "护甲目标规则已保存。");
    setArmorName("");
    setConditions([{ stat: "", min: "" }]);
  }

  async function saveWeaponDraft() {
    const weapon = selectedWeapon;
    const parsedConditions = parseWeaponDraftConditions(weaponConditions, weapon);
    if (!weapon || !parsedConditions.length) {
      setMessage("请先选择武器并添加至少一条 perk 条件。");
      return;
    }

    const nextRules: LocalTargetRules = {
      action_policy: rules.action_policy,
      armor: rules.armor,
      weapons: [
        ...(rules.weapons ?? []),
        {
          id: `weapon-target-${Date.now()}`,
          name: weaponName.trim() || formatWeaponRuleName(weapon.name, parsedConditions),
          item_hash: weapon.hash,
          item_name: weapon.name,
          conditions: parsedConditions
        }
      ]
    };

    await saveRules(nextRules, "武器目标规则已保存。");
    setWeaponName("");
    setSelectedWeaponHash("");
    setWeaponConditions([{ perkHash: "" }]);
  }

  async function removeArmorRule(id: string) {
    await saveRules({
      action_policy: rules.action_policy,
      armor: rules.armor.filter((rule) => rule.id !== id),
      weapons: rules.weapons ?? []
    }, "目标规则已移除。");
  }

  async function removeWeaponRule(id: string) {
    await saveRules({
      action_policy: rules.action_policy,
      armor: rules.armor,
      weapons: (rules.weapons ?? []).filter((rule) => rule.id !== id)
    }, "目标规则已移除。");
  }

  async function clearRules() {
    setIsSaving(true);
    setMessage("");
    try {
      const cleared = props.actions?.onClearRules
        ? await props.actions.onClearRules()
        : { action_policy: rules.action_policy, armor: [], weapons: [] };
      setDisplayRules(cleared);
      setMessage("已清空本地目标规则。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "本地目标规则清空失败");
    } finally {
      setIsSaving(false);
    }
  }

  async function saveRules(nextRules: LocalTargetRules, successMessage: string) {
    setIsSaving(true);
    setMessage("");
    try {
      const saved = props.actions?.onSaveRules
        ? await props.actions.onSaveRules(nextRules)
        : nextRules;
      setDisplayRules(saved);
      setMessage(successMessage);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "本地目标规则保存失败");
    } finally {
      setIsSaving(false);
    }
  }

  function addCondition() {
    setConditions((current) => [...current, { stat: "", min: "" }]);
  }

  function updateCondition(index: number, condition: DraftCondition) {
    setConditions((current) => current.map((item, itemIndex) => itemIndex === index ? condition : item));
  }

  function removeCondition(index: number) {
    setConditions((current) => current.filter((_, itemIndex) => itemIndex !== index));
  }

  function addWeaponCondition() {
    setWeaponConditions((current) => [...current, { perkHash: "" }]);
  }

  function updateWeaponCondition(index: number, condition: DraftWeaponCondition) {
    setWeaponConditions((current) => current.map((item, itemIndex) => itemIndex === index ? condition : item));
  }

  function removeWeaponCondition(index: number) {
    setWeaponConditions((current) => current.filter((_, itemIndex) => itemIndex !== index));
  }

  async function searchManifestPerks() {
    const query = perkSearchQuery.trim();
    if (!query) {
      setPerkSearchResults([]);
      setPerkSearchMessage("请输入 perk 名称或描述关键词。");
      return;
    }

    setIsSearchingPerks(true);
    setPerkSearchMessage("");
    try {
      const results = props.actions?.onSearchPerks ? await props.actions.onSearchPerks(query) : [];
      setPerkSearchResults(results);
      setPerkSearchMessage(results.length ? `找到 ${results.length} 个 perk。` : "没有找到可读 perk。");
    } catch (error) {
      setPerkSearchResults([]);
      setPerkSearchMessage(error instanceof Error ? error.message : "资料库 perk 搜索失败");
    } finally {
      setIsSearchingPerks(false);
    }
  }

  function addManifestPerkCondition(perk: PerkSearchResult) {
    setWeaponConditions((current) => {
      const nextCondition = { perkHash: String(perk.hash), perkName: perk.name };
      const emptyIndex = current.findIndex((condition) => !condition.perkHash);
      if (emptyIndex >= 0) {
        return current.map((condition, index) => index === emptyIndex ? nextCondition : condition);
      }
      return [...current, nextCondition];
    });
    setMessage(`已把 ${perk.name} 添加到武器目标。`);
  }

  return (
    <section className="vault-preview wishlist-import-panel vault-target-rules-panel">
      <div className="section-heading compact-heading">
        <div>
          <h3>本地目标规则</h3>
          <p>保存护甲属性最低值或武器 perk 组合目标，命中后会在仓库卡片和装备详情里提示。</p>
        </div>
        <button
          type="button"
          className="secondary-button"
          disabled={!(rules.armor.length || rules.weapons?.length) || isSaving}
          onClick={() => void clearRules()}
        >
          清空目标
        </button>
      </div>

      <label className="compact-field">
        命中后处理策略
        <select value={rules.action_policy} disabled>
          <option value="notify_only">只提示，不自动写入</option>
        </select>
      </label>
      <p className="muted-copy">当前只会在仓库、同名对比和装备详情里提示命中结果；不会自动收藏、加标签或改动装备。</p>

      {(rules.armor.length || rules.weapons?.length) ? (
        <div className="target-rule-list">
          {rules.armor.map((rule) => (
            <div className="target-rule-row" key={rule.id}>
              <div>
                <strong>{rule.name}</strong>
                <span>护甲：{formatRuleConditions(rule.conditions)}</span>
              </div>
              <button type="button" className="secondary-button" disabled={isSaving} onClick={() => void removeArmorRule(rule.id)}>
                移除
              </button>
            </div>
          ))}
          {(rules.weapons ?? []).map((rule) => (
            <div className="target-rule-row" key={rule.id}>
              <div>
                <strong>{rule.name}</strong>
                <span>武器：{rule.item_name} / {formatWeaponRuleConditions(rule.conditions)}</span>
              </div>
              <button type="button" className="secondary-button" disabled={isSaving} onClick={() => void removeWeaponRule(rule.id)}>
                移除
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="muted-copy">当前没有本地目标规则。</p>
      )}

      <label className="compact-field">
        护甲目标名称
        <input
          value={armorName}
          onChange={(event) => setArmorName(event.target.value)}
          placeholder="例如：高生命职业装"
        />
      </label>

      <div className="vault-armor-rule-list">
        {conditions.map((condition, index) => (
          <div className="vault-armor-rule" key={index}>
            <label className="compact-field">
              属性
              <select
                value={condition.stat}
                onChange={(event) => updateCondition(index, {
                  ...condition,
                  stat: event.target.value as ArmorStatKey | ""
                })}
              >
                <option value="">选择属性</option>
                {(Object.keys(armorStatLabels) as ArmorStatKey[]).map((key) => (
                  <option key={key} value={key}>{armorStatLabels[key]}</option>
                ))}
              </select>
            </label>
            <label className="compact-field">
              最低值
              <input
                type="number"
                min="0"
                max="100"
                value={condition.min}
                onChange={(event) => updateCondition(index, {
                  ...condition,
                  min: event.target.value
                })}
                placeholder="20"
              />
            </label>
            <button type="button" className="secondary-button" disabled={conditions.length === 1} onClick={() => removeCondition(index)}>
              移除
            </button>
          </div>
        ))}
      </div>

      <div className="button-row">
        <button type="button" className="secondary-button" onClick={addCondition}>
          添加属性条件
        </button>
        <button type="button" className="secondary-button" disabled={isSaving} onClick={() => void saveArmorDraft()}>
          保存护甲目标
        </button>
      </div>

      <div className="target-rule-subsection">
        <h4>武器 perk 目标</h4>
        <label className="compact-field">
          武器
          <select
            value={selectedWeaponHash}
            onChange={(event) => {
              setSelectedWeaponHash(event.target.value);
              setWeaponConditions([{ perkHash: "" }]);
            }}
          >
            <option value="">选择武器</option>
            {availableWeaponTargets.map((weapon) => (
              <option key={weapon.hash} value={weapon.hash}>{weapon.name}</option>
            ))}
          </select>
        </label>
        <label className="compact-field">
          武器目标名称
          <input
            value={weaponName}
            onChange={(event) => setWeaponName(event.target.value)}
            placeholder="例如：PVE 清怪手炮"
          />
        </label>
        <div className="target-perk-search">
          <label className="compact-field">
            从资料库搜索 perk
            <input
              value={perkSearchQuery}
              onChange={(event) => setPerkSearchQuery(event.target.value)}
              placeholder="例如：爆破专家 / 狂乱 / voltshot"
            />
          </label>
          <button
            type="button"
            className="secondary-button"
            disabled={isSearchingPerks}
            onClick={() => void searchManifestPerks()}
          >
            {isSearchingPerks ? "搜索中..." : "搜索 perk"}
          </button>
        </div>
        {perkSearchMessage ? <p className="muted-copy">{perkSearchMessage}</p> : null}
        {perkSearchResults.length ? (
          <div className="target-perk-search-results">
            {perkSearchResults.slice(0, 8).map((perk) => (
              <button
                type="button"
                className="target-perk-result"
                key={perk.hash}
                onClick={() => addManifestPerkCondition(perk)}
              >
                <strong>{perk.name}</strong>
                {perk.description ? <span>{perk.description}</span> : null}
                <small>添加到目标</small>
              </button>
            ))}
          </div>
        ) : null}
        <div className="vault-armor-rule-list">
          {weaponConditions.map((condition, index) => (
            <div className="vault-armor-rule" key={index}>
              <label className="compact-field">
                Perk
                <select
                  value={condition.perkHash}
                  disabled={!selectedWeapon}
                  onChange={(event) => updateWeaponCondition(index, { perkHash: event.target.value })}
                >
                  <option value="">选择 perk</option>
                  {(selectedWeapon?.perks ?? []).map((perk) => (
                    <option key={perk.hash} value={perk.hash}>{perk.name}</option>
                  ))}
                  {condition.perkHash && condition.perkName && !selectedWeapon?.perks.some((perk) => String(perk.hash) === condition.perkHash) ? (
                    <option value={condition.perkHash}>{condition.perkName}</option>
                  ) : null}
                </select>
              </label>
              <button type="button" className="secondary-button" disabled={weaponConditions.length === 1} onClick={() => removeWeaponCondition(index)}>
                移除
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="button-row">
        <button type="button" className="secondary-button" disabled={!selectedWeapon} onClick={addWeaponCondition}>
          添加 perk 条件
        </button>
        <button type="button" className="secondary-button" disabled={isSaving} onClick={() => void saveWeaponDraft()}>
          保存武器目标
        </button>
        {message ? <span className="muted-copy">{message}</span> : null}
      </div>
    </section>
  );
}

function parseDraftConditions(conditions: DraftCondition[]): LocalArmorTargetCondition[] {
  return conditions
    .map((condition) => ({ stat: condition.stat, min: Number(condition.min) }))
    .filter((condition): condition is LocalArmorTargetCondition =>
      Boolean(condition.stat) && Number.isFinite(condition.min)
    )
    .map((condition) => ({
      stat: condition.stat,
      min: Math.max(0, Math.floor(condition.min))
    }));
}

function formatRuleName(conditions: LocalArmorTargetCondition[]): string {
  return conditions.map((condition) => `${armorStatLabels[condition.stat]}${condition.min}+`).join(" / ");
}

function formatRuleConditions(conditions: LocalArmorTargetCondition[]): string {
  return conditions.map((condition) => `${armorStatLabels[condition.stat]} >= ${condition.min}`).join(" / ");
}

function parseWeaponDraftConditions(
  conditions: DraftWeaponCondition[],
  weapon: AvailableWeaponTarget | undefined
): LocalWeaponTargetCondition[] {
  const perks = new Map((weapon?.perks ?? []).map((perk) => [String(perk.hash), perk]));
  const seen = new Set<number>();
  return conditions
    .map((condition) => {
      const ownedPerk = perks.get(condition.perkHash);
      if (ownedPerk) return ownedPerk;
      const hash = Number(condition.perkHash);
      const name = condition.perkName?.trim();
      if (!Number.isFinite(hash) || !name) return undefined;
      return { hash, name };
    })
    .filter((perk): perk is { hash: number; name: string } => Boolean(perk))
    .filter((perk) => {
      if (seen.has(perk.hash)) return false;
      seen.add(perk.hash);
      return true;
    })
    .map((perk) => ({
      perk_hash: perk.hash,
      perk_name: perk.name
    }));
}

function formatWeaponRuleName(weaponName: string, conditions: LocalWeaponTargetCondition[]): string {
  return `${weaponName} / ${formatWeaponRuleConditions(conditions)}`;
}

function formatWeaponRuleConditions(conditions: LocalWeaponTargetCondition[]): string {
  return conditions.map((condition) => condition.perk_name).join(" + ");
}

function buildAvailableWeaponTargets(items: AccountItemSummary[]): AvailableWeaponTarget[] {
  const weapons = new Map<number, AvailableWeaponTarget>();
  for (const item of items) {
    if (item.group_key !== "weapons" || !item.socket_plugs?.length) continue;

    const weapon = weapons.get(item.hash) ?? {
      hash: item.hash,
      name: item.name,
      perks: []
    };
    const seenPerks = new Set(weapon.perks.map((perk) => perk.hash));
    for (const plug of item.socket_plugs) {
      if (!plug.hash || seenPerks.has(plug.hash)) continue;
      weapon.perks.push({ hash: plug.hash, name: plug.name });
      seenPerks.add(plug.hash);
    }
    weapons.set(item.hash, weapon);
  }

  return [...weapons.values()]
    .map((weapon) => ({
      ...weapon,
      perks: weapon.perks.sort((left, right) => left.name.localeCompare(right.name, "zh-Hans-CN"))
    }))
    .sort((left, right) => left.name.localeCompare(right.name, "zh-Hans-CN"));
}
