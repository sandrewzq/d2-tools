export type StatusCardProps = {
  title: string;
  status: "ready" | "missing" | "skipped";
  label: string;
  action?: string;
  busy?: boolean;
  disabled?: boolean;
  onAction?: () => void;
};

export function StatusCard(props: StatusCardProps) {
  return (
    <section className={`status-card status-${props.status}`}>
      <div>
        <h3>{props.title}</h3>
        <p>{props.label}</p>
      </div>
      {props.action ? (
        <button
          className="status-card-action"
          type="button"
          aria-busy={props.busy ?? false}
          disabled={props.disabled}
          onClick={props.onAction}
        >
          {props.action}
        </button>
      ) : null}
    </section>
  );
}
