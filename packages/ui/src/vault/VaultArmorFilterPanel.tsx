import type { ArmorStatKey } from "@d2-tools/core/loadouts/analysis";
import { armorStatLabels, type VaultArmorStatRule } from "@d2-tools/app/vault";

export function VaultArmorFilterPanel(props: {
  rules: VaultArmorStatRule[];
  onAddRule: () => void;
  onClearRules: () => void;
  onRemoveRule: (index: number) => void;
  onUpdateRule: (index: number, rule: VaultArmorStatRule) => void;
}) {
  return (
    <section className="vault-armor-filter-panel">
      <div className="vault-armor-filter-heading">
        <div>
          <h3>护甲属性条件</h3>
          <p>所有条件同时成立。总属性不作为筛选门槛，只用于排序。</p>
        </div>
        <div className="button-row">
          <button type="button" data-ui-kind="button" data-control-variant="secondary" disabled={props.rules.length >= Object.keys(armorStatLabels).length} onClick={props.onAddRule}>
            {props.rules.length >= Object.keys(armorStatLabels).length ? "六项属性均已添加" : "添加属性条件"}
          </button>
          <button type="button" data-ui-kind="button" data-control-variant="secondary" onClick={props.onClearRules} disabled={!props.rules.length}>
            清空护甲条件
          </button>
        </div>
      </div>
      {props.rules.length ? (
        <div className="vault-armor-rule-list">
          {props.rules.map((rule, index) => (
            <div className="vault-armor-rule" key={index}>
              <label className="vault-armor-rule-field">
                <span>属性</span>
                <select
                  value={rule.stat}
                  onChange={(event) => props.onUpdateRule(index, {
                    ...rule,
                    stat: event.target.value as ArmorStatKey | ""
                  })}
                >
                  <option value="">选择属性</option>
                  {(Object.keys(armorStatLabels) as ArmorStatKey[]).filter((key) => (
                    key === rule.stat || !props.rules.some((item, itemIndex) => itemIndex !== index && item.stat === key)
                  )).map((key) => (
                    <option key={key} value={key}>{armorStatLabels[key]}</option>
                  ))}
                </select>
              </label>
              <span className="vault-rule-operator" aria-hidden="true">≥</span>
              <label className="vault-armor-rule-field">
                <span>最低值</span>
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
              <button type="button" className="vault-armor-rule-remove" data-ui-kind="button" data-control-variant="secondary" aria-label={`删除${rule.stat ? armorStatLabels[rule.stat] : "护甲属性"}条件`} onClick={() => props.onRemoveRule(index)}>
                删除
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="vault-armor-rule-empty">尚未添加属性条件；可按需要组合生命、近战、手雷、超能、职业和武器。</p>
      )}
    </section>
  );
}
