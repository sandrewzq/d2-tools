import type { SelectedItemDetail } from "../../hooks/useItemDetail";
import { formatArmorEnergySummary, formatArmorStatsSummary } from "./itemDetailFormatters";

export function ItemDetailStats(props: { selectedItem: SelectedItemDetail }) {
  const selectedItem = props.selectedItem;

  if (!selectedItem.armor_stats && !selectedItem.weapon_stats) {
    return null;
  }

  return (
    <>
      {selectedItem.armor_stats ? (
        <section className="item-detail-game-stats armor-stat-panel">
          <h3>当前属性</h3>
          <p className="item-detail-stat-summary">{formatArmorStatsSummary(selectedItem)}</p>
          {selectedItem.armor_stat_breakdown ? (
            <div className="item-detail-stat-breakdown-header" aria-hidden="true">
              <span>基础</span>
              <span>模组</span>
              <span>最终</span>
            </div>
          ) : null}
          <div className="item-detail-stat-list">
            <ArmorStatRow label="生命值" value={selectedItem.armor_stats.health} breakdown={selectedItem.armor_stat_breakdown?.health} />
            <ArmorStatRow label="近战" value={selectedItem.armor_stats.melee} breakdown={selectedItem.armor_stat_breakdown?.melee} />
            <ArmorStatRow label="手雷" value={selectedItem.armor_stats.grenade} breakdown={selectedItem.armor_stat_breakdown?.grenade} />
            <ArmorStatRow label="超能" value={selectedItem.armor_stats.super} breakdown={selectedItem.armor_stat_breakdown?.super} />
            <ArmorStatRow label="职业" value={selectedItem.armor_stats.class} breakdown={selectedItem.armor_stat_breakdown?.class} />
            <ArmorStatRow label="武器" value={selectedItem.armor_stats.weapon} breakdown={selectedItem.armor_stat_breakdown?.weapon} />
          </div>
          <div className="item-detail-total-row">
            <span>总计</span>
            <strong>{selectedItem.armor_stats.total}</strong>
            {selectedItem.armor_stat_breakdown ? (
              <div className="item-detail-stat-breakdown">
                <span>{selectedItem.armor_stat_breakdown.total.base}</span>
                <span>{formatModValue(selectedItem.armor_stat_breakdown.total.mod)}</span>
                <span>{selectedItem.armor_stat_breakdown.total.final}</span>
              </div>
            ) : null}
          </div>
          <div className="item-detail-energy-row">
            <span>能量</span>
            <strong>{formatArmorEnergySummary(selectedItem.armor_energy) ?? "未读取"}</strong>
          </div>
        </section>
      ) : null}
      {selectedItem.weapon_stats ? (
        <section className="item-detail-game-stats armor-stat-panel weapon-stat-panel">
          <h3>武器属性</h3>
          <div className="item-detail-stat-list">
            <WeaponStatRow label="伤害" value={selectedItem.weapon_stats.impact} />
            <WeaponStatRow label="射程" value={selectedItem.weapon_stats.range} />
            <WeaponStatRow label="稳定性" value={selectedItem.weapon_stats.stability} />
            <WeaponStatRow label="操控性" value={selectedItem.weapon_stats.handling} />
            <WeaponStatRow label="装填速度" value={selectedItem.weapon_stats.reload_speed} />
            <WeaponStatRow label="弹匣" value={selectedItem.weapon_stats.magazine} />
            <WeaponStatRow label="RPM" value={selectedItem.weapon_stats.rounds_per_minute} />
            <WeaponStatRow label="蓄力时间" value={selectedItem.weapon_stats.charge_time} />
            <WeaponStatRow label="拉弓时间" value={selectedItem.weapon_stats.draw_time} />
            <WeaponStatRow label="后坐方向" value={selectedItem.weapon_stats.recoil_direction} />
          </div>
        </section>
      ) : null}
    </>
  );
}

function ArmorStatRow(props: {
  label: string;
  value: number;
  breakdown?: NonNullable<SelectedItemDetail["armor_stat_breakdown"]>[keyof NonNullable<SelectedItemDetail["armor_stat_breakdown"]>];
}) {
  return <StatRow label={props.label} value={props.value} max={30} breakdown={props.breakdown} />;
}

function WeaponStatRow(props: { label: string; value?: number }) {
  if (props.value === undefined) {
    return null;
  }

  return <StatRow label={props.label} value={props.value} max={100} />;
}

function StatRow(props: {
  label: string;
  value: number;
  max: number;
  breakdown?: {
    base: number;
    mod: number;
    final: number;
  };
}) {
  const width = Math.max(0, Math.min(100, Math.round((props.value / props.max) * 100)));

  return (
    <div className="item-detail-stat-row">
      <b>{props.label}</b>
      <span>{props.value}</span>
      {props.breakdown ? (
        <div className="item-detail-stat-breakdown" aria-label={`${props.label}属性拆分`}>
          <span>{props.breakdown.base}</span>
          <span>{formatModValue(props.breakdown.mod)}</span>
          <span>{props.breakdown.final}</span>
        </div>
      ) : null}
      <div className="item-detail-stat-bar" aria-hidden="true">
        <i style={{ width: `${width}%` }} />
      </div>
      <em aria-hidden="true" />
    </div>
  );
}

function formatModValue(value: number): string {
  if (value > 0) return `+${value}`;
  return String(value);
}
