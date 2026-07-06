import { HomeDashboard } from "../../features/home/HomeDashboard";
import { useDesktopMenuProviderContext } from "./DesktopMenuProviderContext";

export function HomeMenuProvider() {
  const { home } = useDesktopMenuProviderContext();
  return <HomeDashboard {...home} />;
}
