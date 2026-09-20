import { DirectoryPage } from "../../features/directory/DirectoryPage";
import { api } from "../../api/client";
import { useDesktopMenuSession } from "./DesktopMenuProviderContext";

export function DirectoryMenuProvider() {
  const session = useDesktopMenuSession();

  return (
    <DirectoryPage
      interfaceLocale={session.diagnostics.languagePreferences.interfaceLocale}
      onOpenExternal={(url) => void api.openExternal(url)}
    />
  );
}
