import type { ReactNode } from "react";

export interface AppShellProps {
  readonly title: string;
  readonly children: ReactNode;
}

export function AppShell({ title, children }: AppShellProps) {
  return (
    <main>
      <header>
        <h1>{title}</h1>
      </header>
      <div>{children}</div>
    </main>
  );
}
