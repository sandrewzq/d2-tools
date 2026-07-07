import { AccountPageContentView, type InterfaceLocale } from "@d2-tools/ui";
import type {
  AccountItemSummary,
  AccountSummary,
  ActivityHistorySummary,
  LoadoutTemplate,
  StartupState
} from "../../api/types";
import {
  selectAccountPageModel,
  type AccountOpenItemPayload
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
  const isBungieConfigured = props.startupState.cards.bungieConfig.status === "ready";
  const isAccountLoggedIn = props.startupState.cards.account.status === "ready";
  const viewModel = selectAccountPageModel({
    cache: {
      accountSummary: props.accountSummary,
      activitySummary: props.activitySummary
    },
    pageState: {
      selectedCharacterId: props.selectedCharacterId,
      openingItemKey: props.itemDetailLoadingKey,
      isLoadoutMatch: (item) => matchesLoadoutTemplateItem(item, props.activeLoadoutLookup),
      isBungieConfigured,
      isAccountLoggedIn,
      isLoadingAccount: props.isLoadingAccount,
      writeActionsEnabled: props.writeActionsEnabled,
      accountStatusLabel: props.startupState.cards.account.label,
      accountError: props.accountError,
      itemDetailError: props.itemDetailError,
      activityMessage: props.activityMessage,
      activityError: props.activityError,
      loadoutMessage: props.loadoutMessage,
      itemActionMessage: props.itemActionMessage,
      isRunningItemAction: props.isRunningItemAction,
      activeLoadoutTemplateName: props.activeLoadoutTemplate?.name
    }
  });

  function findCharacter(characterId: string): AccountSummary["characters"][number] | null {
    return props.accountSummary?.characters.find((character) => character.character_id === characterId) ?? null;
  }

  function openItem(payload: AccountOpenItemPayload): void {
    props.onOpenItem(payload.item, {
      source_character_id: payload.source_character_id,
      source_kind: payload.source_kind,
      is_postmaster_item: payload.is_postmaster_item
    });
  }

  return (
    <AccountPageContentView
      interfaceLocale={props.interfaceLocale}
      viewModel={viewModel}
      actions={{
        configureBungie: props.onConfigureBungie,
        loginBungie: props.onLoginBungie,
        refreshAccount: props.onLoadAccount,
        refreshActivity: props.onRefreshActivity,
        selectCharacter: props.onSelectCharacter,
        saveCurrentLoadout: (characterId) => {
          const character = findCharacter(characterId);
          if (character) props.onSaveCharacterLoadout(character);
        },
        equipHighestPower: (characterId) => {
          const character = findCharacter(characterId);
          if (character) props.onEquipHighestPowerItems(character);
        },
        openItem
      }}
    />
  );
}
