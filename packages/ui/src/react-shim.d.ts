declare module "react" {
  export type ReactNode =
    | string
    | number
    | boolean
    | null
    | undefined
    | ReactElement
    | readonly ReactNode[];

  export interface ReactElement {
    readonly type: unknown;
    readonly props: unknown;
    readonly key: string | null;
  }

  export interface ButtonHTMLAttributes<T> {
    readonly disabled?: boolean;
    readonly name?: string;
    readonly title?: string;
    readonly type?: "button" | "submit" | "reset";
    readonly value?: string | readonly string[] | number;
    readonly onClick?: (event: unknown) => void;
    readonly [attribute: `aria-${string}`]: string | boolean | undefined;
    readonly [attribute: `data-${string}`]: string | number | boolean | undefined;
  }

  const React: {
    readonly createElement: unknown;
  };

  export default React;
}

declare module "react/jsx-runtime" {
  import type { ReactElement } from "react";

  export function jsx(type: unknown, props: unknown, key?: string): ReactElement;
  export function jsxs(type: unknown, props: unknown, key?: string): ReactElement;
  export const Fragment: unique symbol;
}

declare namespace JSX {
  interface IntrinsicElements {
    readonly button: Record<string, unknown>;
    readonly dd: Record<string, unknown>;
    readonly div: Record<string, unknown>;
    readonly dl: Record<string, unknown>;
    readonly dt: Record<string, unknown>;
    readonly h1: Record<string, unknown>;
    readonly h2: Record<string, unknown>;
    readonly header: Record<string, unknown>;
    readonly li: Record<string, unknown>;
    readonly main: Record<string, unknown>;
    readonly p: Record<string, unknown>;
    readonly section: Record<string, unknown>;
    readonly span: Record<string, unknown>;
    readonly ul: Record<string, unknown>;
  }
}
