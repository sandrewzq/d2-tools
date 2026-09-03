import { GameAssetImage } from "../media/GameAssetImage.js";

export type EquipmentDetailVersionOption = {
  hash: number;
  label: string;
};

export type EquipmentDetailContextLedgerProps = {
  entryLabel: string;
  currentViewLabel: string;
  locationLabel: string;
  locationFieldLabel?: string;
  slotLabel?: string;
  slotFieldLabel?: string;
  versionFieldLabel: string;
  versionValue: string;
  versionOptions?: EquipmentDetailVersionOption[];
  selectedVersionHash?: number;
  watermarkIcon?: string;
  versionLoading?: boolean;
  showVersionField?: boolean;
  onSelectVersion?: (hash: number) => void;
};

export function EquipmentDetailContextLedger(props: EquipmentDetailContextLedgerProps) {
  const canSelectVersion = Boolean(
    props.onSelectVersion
    && props.selectedVersionHash !== undefined
    && props.versionOptions
    && props.versionOptions.length > 1
  );

  return (
    <dl className={["equipment-detail-context-ledger", props.slotLabel && "has-slot-fact"].filter(Boolean).join(" ")}>
      <ContextFact label="入口" value={props.entryLabel} />
      <ContextFact label="当前查看" value={props.currentViewLabel} current />
      <ContextFact label={props.locationFieldLabel ?? "位置"} value={props.locationLabel} />
      {props.slotLabel ? <ContextFact label={props.slotFieldLabel ?? "装备槽位"} value={props.slotLabel} /> : null}
      {props.showVersionField !== false ? <div className="equipment-detail-version-field">
        <dt data-ui-part="label" data-text-tone="meta" data-info-priority="support">{props.versionFieldLabel}</dt>
        <dd data-ui-part="value" data-text-tone="primary" data-info-priority="context">
          <span
            className={["equipment-detail-version-control", canSelectVersion && "is-selectable"].filter(Boolean).join(" ")}
            aria-busy={props.versionLoading || undefined}
          >
            {canSelectVersion ? (
              <select
                aria-label="选择装备版本"
                value={props.selectedVersionHash}
                onChange={(event) => props.onSelectVersion?.(Number(event.target.value))}
              >
                {props.versionOptions?.map((version) => (
                  <option key={version.hash} value={version.hash}>{version.label}</option>
                ))}
              </select>
            ) : <strong>{props.versionValue}</strong>}
            {props.watermarkIcon ? (
              <span className="equipment-detail-version-watermark">
                <GameAssetImage
                  src={props.watermarkIcon}
                  alt="当前官方版本水印"
                  title="当前官方发布版本水印"
                  loading="eager"
                />
              </span>
            ) : null}
          </span>
        </dd>
      </div> : null}
    </dl>
  );
}

function ContextFact(props: { label: string; value: string; current?: boolean }) {
  return (
    <div className={props.current ? "equipment-detail-current-view" : undefined}>
      <dt data-ui-part="label" data-text-tone="meta" data-info-priority="support">{props.label}</dt>
      <dd data-ui-part="value" data-text-tone="primary" data-info-priority="context">{props.value}</dd>
    </div>
  );
}
