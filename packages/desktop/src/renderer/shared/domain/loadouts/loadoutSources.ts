import type { AccountItemSummary, AccountSummary, LoadoutTemplate } from "../../../api/client";

export type LoadoutSourceItem = AccountItemSummary & {
  source_character_id?: string;
  source_kind: "equipped" | "inventory" | "vault" | "postmaster";
  source_label?: string;
  is_vault_item?: boolean;
  is_postmaster_item?: boolean;
};

export function findBestTemplateSourceItem(
  item: LoadoutTemplate["items"][number],
  summary: AccountSummary | null,
  templateCharacterId?: string
): LoadoutSourceItem | null {
  if (!summary) {
    return null;
  }

  const candidates = getAllKnownAccountItemsWithSource(summary)
    .filter((candidate) => isTemplateSourceMatch(item, candidate))
    .sort((left, right) => scoreTemplateSourceCandidate(right, item, templateCharacterId)
      - scoreTemplateSourceCandidate(left, item, templateCharacterId));

  return candidates[0] ?? null;
}

export function getAllKnownAccountItemsWithSource(summary: AccountSummary): LoadoutSourceItem[] {
  const characterItems = summary.characters.flatMap((character) => [
    ...character.equipped_items.map((item) => ({
      ...item,
      source_character_id: character.character_id,
      source_kind: "equipped" as const,
      source_label: "已装备"
    })),
    ...character.inventory_items.map((item) => ({
      ...item,
      source_character_id: character.character_id,
      source_kind: "inventory" as const,
      source_label: "背包"
    })),
    ...character.postmaster_items.map((item) => ({
      ...item,
      source_character_id: character.character_id,
      is_postmaster_item: true,
      source_kind: "postmaster" as const,
      source_label: "邮政官"
    }))
  ]);

  return [
    ...summary.vault.items.map((item) => ({
      ...item,
      is_vault_item: true,
      source_kind: "vault" as const,
      source_label: "仓库"
    })),
    ...characterItems
  ];
}

function isTemplateSourceMatch(
  item: LoadoutTemplate["items"][number],
  candidate: LoadoutSourceItem
): boolean {
  if (item.instance_id && candidate.instance_id) {
    return item.instance_id === candidate.instance_id;
  }

  return candidate.hash === item.hash
    && (!item.bucket_name || candidate.bucket_name === item.bucket_name);
}

function scoreTemplateSourceCandidate(
  candidate: LoadoutSourceItem,
  item: LoadoutTemplate["items"][number],
  templateCharacterId?: string
): number {
  let score = 0;

  if (item.instance_id && candidate.instance_id && item.instance_id === candidate.instance_id) {
    score += 100;
  } else if (candidate.hash === item.hash && candidate.bucket_name === item.bucket_name) {
    score += 20;
  } else if (candidate.hash === item.hash) {
    score += 10;
  }

  if (templateCharacterId && candidate.source_character_id === templateCharacterId) {
    score += 8;
  }

  const sourceScores: Record<LoadoutSourceItem["source_kind"], number> = {
    equipped: 4,
    inventory: 3,
    vault: 2,
    postmaster: 1
  };

  return score + sourceScores[candidate.source_kind];
}
