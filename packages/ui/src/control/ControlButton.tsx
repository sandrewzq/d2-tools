import type { ButtonHTMLAttributes } from "react";

export type ControlButtonVariant = "primary" | "secondary" | "danger" | "ai" | "quiet";
export type ControlButtonSize = "compact" | "standard" | "prominent";
export type ControlButtonWidth = "content" | "uniform";
export type ControlButtonShape = "text" | "icon";

export type ControlButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "data-ui-kind" | "data-control-variant" | "data-control-size" | "data-control-width" | "data-control-shape"
> & {
  variant?: ControlButtonVariant;
  size?: ControlButtonSize;
  width?: ControlButtonWidth;
  shape?: ControlButtonShape;
};

export function ControlButton({
  type = "button",
  variant = "secondary",
  size = "standard",
  width = "content",
  shape = "text",
  ...props
}: ControlButtonProps) {
  return (
    <button
      {...props}
      type={type}
      data-ui-kind="button"
      data-control-variant={variant}
      data-control-size={size}
      data-control-width={width}
      data-control-shape={shape}
    />
  );
}
