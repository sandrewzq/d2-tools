import type { AccountItemSummary, AccountSummary } from "../api/client";

/**
 * Collect all items from an account: vault + every character's
 * equipped, inventory, and postmaster items.
 */
export function collectAccountItems(account: AccountSummary | null): AccountItemSummary[] {
  if (!account) return [];
  return [
    ...account.vault.items,
    ...account.characters.flatMap((character) => [
      ...character.equipped_items,
      ...character.inventory_items,
      ...character.postmaster_items,
    ]),
  ];
}
