import type { ArmorStatKey } from "@d2-tools/core/loadouts/analysis";
import type { VaultArmorStatRule } from "@d2-tools/app/vault";
import type { VaultCopy } from "../i18n/types.js";
import { vaultTemplate, vaultText } from "./vaultCopy.js";

export function VaultArmorFilterPanel(props: {
  copy: VaultCopy;
  rules: VaultArmorStatRule[];
  onAddRule: () => void;
  onClearRules: () => void;
  onRemoveRule: (index: number) => void;
  onUpdateRule: (index: number, rule: VaultArmorStatRule) => void;
}) {
  const statLabels = props.copy.labels.armorStats;
  const statKeys = Object.keys(statLabels) as ArmorStatKey[];
  return (
    <section className="vault-armor-filter-panel">
      <div className="vault-armor-filter-heading">
        <div>
          <h3>{vaultText(props.copy, "护甲属性条件")}</h3>
          <p>{vaultText(props.copy, "所有条件同时成立。总属性不作为筛选门槛，只用于排序。")}</p>
        </div>
        <div className="button-row">
          <button type="button" data-ui-kind="button" data-control-variant="secondary" disabled={props.rules.length >= statKeys.length} onClick={props.onAddRule}>
            {props.rules.length >= statKeys.length ? vaultText(props.copy, "六项属性均已添加") : vaultText(props.copy, "添加属性条件")}
          </button>
          <button type="button" data-ui-kind="button" data-control-variant="secondary" onClick={props.onClearRules} disabled={!props.rules.length}>
            {vaultText(props.copy, "清空护甲条件")}
          </button>
        </div>
      </div>
      {props.rules.length ? (
        <div className="vault-armor-rule-list">
          {props.rules.map((rule, index) => (
            <div className="vault-armor-rule" key={index}>
              <label className="vault-armor-rule-field">
                <span>{vaultText(props.copy, "属性")}</span>
                <select
                  value={rule.stat}
                  onChange={(event) => props.onUpdateRule(index, {
                    ...rule,
                    stat: event.target.value as ArmorStatKey | ""
                  })}
                >
                  <option value="">{vaultText(props.copy, "选择属性")}</option>
                  {statKeys.filter((key) => (
                    key === rule.stat || !props.rules.some((item, itemIndex) => itemIndex !== index && item.stat === key)
                  )).map((key) => (
                    <option key={key} value={key}>{statLabels[key]}</option>
                  ))}
                </select>
              </label>
              <span className="vault-rule-operator" aria-hidden="true">≥</span>
              <label className="vault-armor-rule-field">
                <span>{vaultText(props.copy, "最低值")}</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={rule.min}
                  onChange={(event) => props.onUpdateRule(index, {
                    ...rule,
                    min: event.target.valueAsNumber || 0
                  })}
                  placeholder="20"
                />
              </label>
              <button type="button" className="vault-armor-rule-remove" data-ui-kind="button" data-control-variant="secondary" aria-label={vaultTemplate(props.copy, "删除{stat}条件", { stat: rule.stat ? statLabels[rule.stat] : vaultText(props.copy, "护甲属性") })} onClick={() => props.onRemoveRule(index)}>
                {vaultText(props.copy, "删除")}
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="vault-armor-rule-empty">{vaultText(props.copy, "尚未添加属性条件；可按需要组合生命、近战、手雷、超能、职业和武器。")}</p>
      )}
    </section>
  );
}
