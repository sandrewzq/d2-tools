import { ControlButton, type ControlButtonProps, type ControlButtonVariant, type ControlButtonWidth } from "../control/ControlButton.js";

type SettingsButtonProps = Omit<ControlButtonProps, "variant" | "size" | "width"> & {
  "data-control-variant"?: ControlButtonVariant;
  width?: ControlButtonWidth;
};

export function SettingsButton({ "data-control-variant": variant = "secondary", width = "uniform", ...props }: SettingsButtonProps) {
  return (
    <ControlButton
      {...props}
      variant={variant}
      size="standard"
      width={width}
    />
  );
}
