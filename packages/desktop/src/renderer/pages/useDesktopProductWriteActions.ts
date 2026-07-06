import { useState } from "react";
import type {
  AccountSummary,
  DimWishlist,
  LibraryHistory,
  LoadoutTemplate,
  LocalTargetRules,
  VaultTags
} from "../api/types";
import { useLoadoutActionFeedback } from "../features/loadouts/useLoadoutActionFeedback";
import { useLoadoutTemplateActions } from "../features/loadouts/useLoadoutTemplateActions";
import { useLoadoutWriteActions } from "../features/loadouts/useLoadoutWriteActions";
import { useVaultWriteActions } from "../features/vault/useVaultWriteActions";
import { useItemDetailWorkspace } from "../shared/hooks/useItemDetailWorkspace";

type DiagnosticsBridge = {
  aiSettings: { enable_lightgg: boolean };
  setWriteActionsEnabled: (enabled: boolean) => void;
  loadActionLog: () => Promise<void>;
};

type LoadoutLibraryBridge = {
  reloadTemplates: () => Promise<void>;
  renameTemplate: (template: LoadoutTemplate) => Promise<LoadoutTemplate>;
  deleteTemplate: (id: string) => Promise<LoadoutTemplate[]>;
};

export function useDesktopProductWriteActions(input: {
  accountSummary: AccountSummary | null;
  diagnostics: DiagnosticsBridge;
  importedWishlist: DimWishlist | null;
  loadAccountSummary: () => Promise<void>;
  loadoutLibrary: LoadoutLibraryBridge;
  localTargetRules: LocalTargetRules;
  onRecentHistoryChanged: (history: LibraryHistory) => void;
  setAccountError: (message: string) => void;
  setVaultTags: (tags: VaultTags) => void;
  vaultTags: VaultTags;
}) {
  const [loadoutMessage, setLoadoutMessage] = useState("");
  const [isRunningItemAction, setIsRunningItemAction] = useState(false);
  const [itemActionMessage, setItemActionMessage] = useState("");
  const loadoutActionFeedback = useLoadoutActionFeedback();

  const itemDetail = useItemDetailWorkspace({
    accountSummary: input.accountSummary,
    vaultTags: input.vaultTags,
    setVaultTags: input.setVaultTags,
    importedWishlist: input.importedWishlist,
    localTargetRules: input.localTargetRules,
    diagnostics: input.diagnostics,
    setAccountError: input.setAccountError,
    setIsRunningItemAction,
    setItemActionMessage,
    loadAccountSummary: input.loadAccountSummary,
    onRecentHistoryChanged: input.onRecentHistoryChanged
  });

  const loadoutTemplateActions = useLoadoutTemplateActions({
    accountSummary: input.accountSummary,
    setLoadoutMessage
  });

  const loadoutWriteActions = useLoadoutWriteActions({
    accountSummary: input.accountSummary,
    loadoutLibrary: input.loadoutLibrary,
    diagnostics: input.diagnostics,
    loadoutActionFeedback,
    setLoadoutMessage,
    setItemActionMessage,
    setIsRunningItemAction,
    loadAccountSummary: input.loadAccountSummary,
    openItemDetail: itemDetail.openItemDetail
  });

  const vaultWriteActions = useVaultWriteActions({
    accountSummary: input.accountSummary,
    diagnostics: input.diagnostics,
    setVaultTags: input.setVaultTags,
    setAccountError: input.setAccountError,
    setIsRunningItemAction,
    setItemActionMessage,
    loadAccountSummary: input.loadAccountSummary
  });

  return {
    itemActionMessage,
    itemDetail,
    isRunningItemAction,
    loadoutActionFeedback,
    loadoutMessage,
    loadoutTemplateActions,
    loadoutWriteActions,
    vaultWriteActions
  };
}
