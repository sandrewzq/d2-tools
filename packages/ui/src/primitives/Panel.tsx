import type { ReactNode } from "react";

export interface PanelProps {
  readonly title: string;
  readonly children: ReactNode;
}

export function Panel({ title, children }: PanelProps) {
  return (
    <section aria-label={title}>
      <h2>{title}</h2>
      {children}
    </section>
  );
}
