export type VaultTagValue = "none" | "keep" | "review" | "junk" | "farm" | "loadout";
export type VaultTagEntry = { tag?: Exclude<VaultTagValue, "none">; note?: string };
export type VaultTags = { items: Record<string, VaultTagEntry> };
export type SaveVaultTagInput = { item_key: string; tag: VaultTagValue };
export type SaveVaultNoteInput = { item_key: string; note: string };
