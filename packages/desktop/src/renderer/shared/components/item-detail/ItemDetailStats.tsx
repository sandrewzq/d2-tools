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
          <div className="item-detail-stat-list">
            <ArmorStatRow label="生命值" value={selectedItem.armor_stats.health} />
            <ArmorStatRow label="近战" value={selectedItem.armor_stats.melee} />
            <ArmorStatRow label="手雷" value={selectedItem.armor_stats.grenade} />
            <ArmorStatRow label="超能" value={selectedItem.armor_stats.super} />
            <ArmorStatRow label="职业" value={selectedItem.armor_stats.class} />
            <ArmorStatRow label="武器" value={selectedItem.armor_stats.weapon} />
          </div>
          <div className="item-detail-total-row">
            <span>总计</span>
            <strong>{selectedItem.armor_stats.total}</strong>
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

function ArmorStatRow(props: { label: string; value: number }) {
  return <StatRow label={props.label} value={props.value} max={30} />;
}

function WeaponStatRow(props: { label: string; value?: number }) {
  if (props.value === undefined) {
    return null;
  }

  return <StatRow label={props.label} value={props.value} max={100} />;
}

function StatRow(props: { label: string; value: number; max: number }) {
  const width = Math.max(0, Math.min(100, Math.round((props.value / props.max) * 100)));

  return (
    <div className="item-detail-stat-row">
      <b>{props.label}</b>
      <span>{props.value}</span>
      <div className="item-detail-stat-bar" aria-hidden="true">
        <i style={{ width: `${width}%` }} />
      </div>
      <em aria-hidden="true" />
    </div>
  );
}
