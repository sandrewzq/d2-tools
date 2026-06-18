export type StatusCardProps = {
  title: string;
  status: "ready" | "missing" | "skipped";
  label: string;
  action?: string;
};

export function StatusCard(props: StatusCardProps) {
  return (
    <section className={`status-card status-${props.status}`}>
      <div>
        <h3>{props.title}</h3>
        <p>{props.label}</p>
      </div>
      {props.action ? <button type="button">{props.action}</button> : null}
    </section>
  );
}
