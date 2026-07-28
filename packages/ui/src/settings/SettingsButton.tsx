import { ControlButton, type ControlButtonProps, type ControlButtonVariant } from "../control/ControlButton.js";

type SettingsButtonProps = Omit<ControlButtonProps, "variant" | "size" | "width"> & {
  "data-control-variant"?: ControlButtonVariant;
};

export function SettingsButton({ "data-control-variant": variant = "secondary", ...props }: SettingsButtonProps) {
  return (
    <ControlButton
      {...props}
      variant={variant}
      size="standard"
      width="uniform"
    />
  );
}
