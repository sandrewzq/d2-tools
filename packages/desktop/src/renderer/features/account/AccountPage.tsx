import { AccountPageContentView, type InterfaceLocale } from "@d2-tools/ui";
import type {
  AccountItemSummary,
  AccountSummary,
  ActivityHistorySummary,
  LoadoutTemplate,
  StartupState
} from "../../api/types";
import {
  createAccountPageWorkspace,
  formatAccountItemMeta,
  getAccountPageItemKey
} from "@d2-tools/app";
import {
  matchesLoadoutTemplateItem,
  type LoadoutTemplateLookup
} from "../../shared/domain/loadouts/loadoutLookup";

type AccountItemSource = "equipped" | "inventory";

export function AccountPage(props: {
  interfaceLocale?: InterfaceLocale;
  accountSummary: AccountSummary | null;
  startupState: StartupState;
  selectedCharacterId: string;
  isLoadingAccount: boolean;
  accountError: string;
  itemDetailError: string;
  itemDetailLoadingKey: string;
  writeActionsEnabled: boolean;
  activitySummary: ActivityHistorySummary | null;
  activityMessage: string;
  activityError: string;
  loadoutMessage: string;
  itemActionMessage: string;
  isRunningItemAction: boolean;
  activeLoadoutLookup: LoadoutTemplateLookup | null;
  activeLoadoutTemplate: LoadoutTemplate | null;
  onConfigureBungie: () => void;
  onLoginBungie: () => void;
  onLoadAccount: () => void;
  onRefreshActivity: () => void;
  onSelectCharacter: (characterId: string) => void;
  onSaveCharacterLoadout: (character: AccountSummary["characters"][number]) => void;
  onEquipHighestPowerItems: (character: AccountSummary["characters"][number]) => void;
  onOpenItem: (
    item: AccountItemSummary,
    options: {
      source_character_id: string;
      source_kind?: AccountItemSource;
      is_postmaster_item?: boolean;
    }
  ) => void;
}) {
  const accountWorkspace = createAccountPageWorkspace({
    account: props.accountSummary,
    selectedCharacterId: props.selectedCharacterId,
    openingItemKey: props.itemDetailLoadingKey,
    isLoadoutMatch: (item) => matchesLoadoutTemplateItem(item, props.activeLoadoutLookup)
  });
  const isBungieConfigured = props.startupState.cards.bungieConfig.status === "ready";
  const isAccountLoggedIn = props.startupState.cards.account.status === "ready";

  return (
    <AccountPageContentView
      {...props}
      accountWorkspace={accountWorkspace}
      selectedCharacter={accountWorkspace.selectedCharacter}
      isBungieConfigured={isBungieConfigured}
      isAccountLoggedIn={isAccountLoggedIn}
      canLoadAccount={isBungieConfigured && isAccountLoggedIn}
      isLoadoutMatch={matchesLoadoutTemplateItem}
      getAccountPageItemKey={getAccountPageItemKey}
      formatAccountItemMeta={formatAccountItemMeta}
    />
  );
}
