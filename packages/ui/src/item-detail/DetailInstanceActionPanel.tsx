import type { ReactNode } from "react";

export type DetailInstanceAction = {
  key: string;
  label: string;
  disabled?: boolean;
  primary?: boolean;
  onClick: () => void;
};

export type DetailInstanceTagAction = {
  key: string;
  label: string;
  pressed: boolean;
  disabled?: boolean;
  onClick: () => void;
};

export type DetailInstanceActionPanelProps = {
  title: string;
  subtitle: string;
  statusLabels: string[];
  targetLabel?: string;
  targetValue?: string;
  targetOptions?: Array<{ value: string; label: string }>;
  disabled?: boolean;
  actions: DetailInstanceAction[];
  tags: DetailInstanceTagAction[];
  note: string;
  onTargetChange?: (value: string) => void;
  onNoteChange: (value: string) => void;
  noteActions: DetailInstanceAction[];
  feedback?: ReactNode;
  messages?: string[];
};

export function DetailInstanceActionPanel(props: DetailInstanceActionPanelProps) {
  return (
    <div className="detail-instance-actions">
      <div className="detail-instance-current">
        <div>
          <span>当前实例</span>
          <h3>{props.title}</h3>
          <p>{props.subtitle}</p>
        </div>
        <strong>正在查看</strong>
      </div>

      {props.statusLabels.length ? (
        <div className="detail-instance-status-list" aria-label="实例状态">
          {props.statusLabels.map((label) => <span key={label}>{label}</span>)}
        </div>
      ) : null}

      {props.targetOptions?.length && props.targetValue && props.onTargetChange ? (
        <label className="detail-instance-target">
          <span>{props.targetLabel ?? "目标角色"}</span>
          <select
            disabled={props.disabled}
            value={props.targetValue}
            onChange={(event) => props.onTargetChange?.(event.target.value)}
          >
            {props.targetOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
      ) : null}

      {props.actions.length ? (
        <div className="detail-instance-primary-actions">
          {props.actions.map((action) => (
            <button
              key={action.key}
              type="button"
              className={action.primary ? "is-primary" : undefined}
              data-ui-kind="button"
              data-control-variant={action.primary ? "primary" : "secondary"}
              disabled={props.disabled || action.disabled}
              onClick={action.onClick}
            >
              {action.label}
            </button>
          ))}
        </div>
      ) : null}

      <div className="detail-instance-tag-group">
        <span>本地标记</span>
        <div>
          {props.tags.map((tag) => (
            <button
              key={tag.key}
              type="button"
              data-ui-kind="button"
              data-control-variant="secondary"
              aria-pressed={tag.pressed}
              disabled={tag.disabled}
              onClick={tag.onClick}
            >
              {tag.label}
            </button>
          ))}
        </div>
      </div>

      <details className="detail-instance-more">
        <summary>备注与复用</summary>
        <div>
          <textarea
            aria-label="实例备注"
            placeholder="记录用途、搭配或后续处理计划"
            value={props.note}
            onChange={(event) => props.onNoteChange(event.target.value)}
          />
          <div className="detail-instance-note-actions">
            {props.noteActions.map((action) => (
              <button
                key={action.key}
                type="button"
                className={action.primary ? "is-primary" : undefined}
                data-ui-kind="button"
                data-control-variant={action.primary ? "primary" : "secondary"}
                disabled={action.disabled}
                onClick={action.onClick}
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>
      </details>

      {props.feedback}
      {props.messages?.filter(Boolean).map((message, index) => (
        <p key={`${index}:${message}`} className="detail-instance-message" role="status">{message}</p>
      ))}
    </div>
  );
}
