import type { ArmorStatKey } from "../../api/client";
import {
  armorStatLabels,
  type VaultArmorStatRule
} from "./vaultFilters";

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
          <h3>护甲属性筛选</h3>
          <p>添加任意数量的属性最低值条件，结果会同时满足所有条件。</p>
        </div>
        <div className="button-row">
          <button type="button" className="secondary-button" onClick={props.onAddRule}>
            添加属性条件
          </button>
          <button type="button" className="secondary-button" onClick={props.onClearRules} disabled={!props.rules.length}>
            清空护甲条件
          </button>
        </div>
      </div>
      {props.rules.length ? (
        <div className="vault-armor-rule-list">
          {props.rules.map((rule, index) => (
            <div className="vault-armor-rule" key={index}>
              <label className="compact-field">
                属性
                <select
                  value={rule.stat}
                  onChange={(event) => props.onUpdateRule(index, {
                    ...rule,
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
                  value={rule.min}
                  onChange={(event) => props.onUpdateRule(index, {
                    ...rule,
                    min: event.target.valueAsNumber || 0
                  })}
                  placeholder="20"
                />
              </label>
              <button type="button" className="secondary-button" onClick={() => props.onRemoveRule(index)}>
                移除
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="muted-copy">未设置护甲属性条件。</p>
      )}
    </section>
  );
}
