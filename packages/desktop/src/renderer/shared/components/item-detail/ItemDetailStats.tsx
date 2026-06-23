import type { SelectedItemDetail } from "../../hooks/useItemDetail";
import { formatArmorStatsSummary } from "./itemDetailFormatters";

export function ItemDetailStats(props: { selectedItem: SelectedItemDetail }) {
  const selectedItem = props.selectedItem;

  if (!selectedItem.armor_stats && !selectedItem.weapon_stats) {
    return null;
  }

  return (
    <>
      {selectedItem.armor_stats ? (
        <section className="modal-perk-group armor-stat-panel">
          <h3>当前属性</h3>
          <p>{formatArmorStatsSummary(selectedItem)}</p>
          <div className="armor-stat-grid">
            <span>总值 <strong>{selectedItem.armor_stats.total}</strong></span>
            <span>敏捷 <strong>{selectedItem.armor_stats.mobility}</strong></span>
            <span>韧性 <strong>{selectedItem.armor_stats.resilience}</strong></span>
            <span>恢复 <strong>{selectedItem.armor_stats.recovery}</strong></span>
            <span>纪律 <strong>{selectedItem.armor_stats.discipline}</strong></span>
            <span>智慧 <strong>{selectedItem.armor_stats.intellect}</strong></span>
            <span>力量 <strong>{selectedItem.armor_stats.strength}</strong></span>
          </div>
        </section>
      ) : null}
      {selectedItem.weapon_stats ? (
        <section className="modal-perk-group armor-stat-panel weapon-stat-panel">
          <h3>武器属性</h3>
          <div className="armor-stat-grid">
            <WeaponStat label="伤害" value={selectedItem.weapon_stats.impact} />
            <WeaponStat label="射程" value={selectedItem.weapon_stats.range} />
            <WeaponStat label="稳定性" value={selectedItem.weapon_stats.stability} />
            <WeaponStat label="操控性" value={selectedItem.weapon_stats.handling} />
            <WeaponStat label="装填速度" value={selectedItem.weapon_stats.reload_speed} />
            <WeaponStat label="弹匣" value={selectedItem.weapon_stats.magazine} />
            <WeaponStat label="RPM" value={selectedItem.weapon_stats.rounds_per_minute} />
            <WeaponStat label="蓄力时间" value={selectedItem.weapon_stats.charge_time} />
            <WeaponStat label="拉弓时间" value={selectedItem.weapon_stats.draw_time} />
            <WeaponStat label="后坐方向" value={selectedItem.weapon_stats.recoil_direction} />
          </div>
        </section>
      ) : null}
    </>
  );
}

function WeaponStat(props: { label: string; value?: number }) {
  if (props.value === undefined) {
    return null;
  }

  return <span>{props.label} <strong>{props.value}</strong></span>;
}
