import type { ButtonHTMLAttributes } from "react";

type SettingsButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  "data-control-variant"?: "secondary" | "primary" | "danger" | "ai" | "quiet";
};

export function SettingsButton({ type = "button", ...props }: SettingsButtonProps) {
  return (
    <button
      {...props}
      type={type}
      data-ui-kind="button"
      data-control-size="standard"
      data-control-width="uniform"
    />
  );
}
