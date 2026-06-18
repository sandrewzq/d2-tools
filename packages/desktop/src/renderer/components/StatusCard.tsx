export type StatusCardProps = {
  title: string;
  status: "ready" | "missing" | "skipped";
  label: string;
  action?: string;
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
        <button type="button" disabled={props.disabled} onClick={props.onAction}>
          {props.action}
        </button>
      ) : null}
    </section>
  );
}
