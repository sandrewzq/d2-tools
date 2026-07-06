import { LibraryPage } from "../../features/library/LibraryPage";
import { useDesktopMenuProviderContext } from "./DesktopMenuProviderContext";

export function LibraryMenuProvider() {
  const { library } = useDesktopMenuProviderContext();
  return <LibraryPage {...library} />;
}
