import { SettingsPage } from "../../features/settings/SettingsPage";
import { useDesktopMenuProviderContext } from "./DesktopMenuProviderContext";

export function SettingsMenuProvider() {
  const { settings } = useDesktopMenuProviderContext();
  return <SettingsPage {...settings} />;
}
