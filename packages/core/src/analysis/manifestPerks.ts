import type { DefinitionComponentData, DefinitionRecord } from "../manifest/definitions.js";

/**
 * Manifest-based perk selection for weapon target rules.
 *
 * Extends the target rules system to support selecting perks from the full
 * Manifest perk library, rather than being limited to perks already present
 * on owned weapons.
 */

export type ManifestPerkSummary = {
  hash: number;
  name: string;
  description?: string;
  icon?: string;
  /** Whether this perk is a "core" perk (barrels, magazines, traits, etc.). */
  is_weapon_perk: boolean;
};

export type PerkSearchResult = {
  query: string;
  items: ManifestPerkSummary[];
  total: number;
};

/**
 * Query all perks from Manifest sandbox perk definitions.
 *
 * Filters to weapon-relevant perks and supports name search.
 */
export function queryManifestPerks(
  perkDefinitions: DefinitionComponentData,
  query?: string
): ManifestPerkSummary[] {
  const all = Object.entries(perkDefinitions)
    .map(([hashStr, def]) => toPerkSummary(Number(hashStr), def))
    .filter((p): p is ManifestPerkSummary => p !== null && p.is_weapon_perk);

  if (!query || !query.trim()) {
    return all.sort((a, b) => a.name.localeCompare(b.name, "zh-Hans-CN"));
  }

  const normalized = query.trim().toLowerCase();
  return all
    .filter(
      (p) =>
        p.name.toLowerCase().includes(normalized) ||
        (p.description?.toLowerCase() ?? "").includes(normalized)
    )
    .sort((a, b) => a.name.localeCompare(b.name, "zh-Hans-CN"));
}

/**
 * Get a single perk by hash for validation / display.
 */
export function getManifestPerk(
  perkDefinitions: DefinitionComponentData,
  hash: number
): ManifestPerkSummary | null {
  const def = perkDefinitions[String(hash)];
  if (!def) return null;
  return toPerkSummary(hash, def);
}

/**
 * Build a weapon target condition from a Manifest perk hash.
 */
export function perkToTargetCondition(
  perkDefinitions: DefinitionComponentData,
  perkHash: number
): { perk_hash: number; perk_name: string } | null {
  const perk = getManifestPerk(perkDefinitions, perkHash);
  if (!perk) return null;
  return { perk_hash: perk.hash, perk_name: perk.name };
}

function toPerkSummary(hash: number, def: DefinitionRecord): ManifestPerkSummary | null {
  if (!Number.isFinite(hash)) return null;

  const name = def.displayProperties?.name?.trim();
  if (!name) return null;

  const isWeaponPerk = isWeaponRelevant(def);
  return {
    hash,
    name,
    description: def.displayProperties?.description?.trim(),
    icon: def.displayProperties?.icon,
    is_weapon_perk: isWeaponPerk,
  };
}

/**
 * Heuristic: filter out non-weapon perks (armor mods, intrinsic traits
 * that aren't selectable, etc.).
 *
 * In DestinySandboxPerkDefinition, weapon perks typically have:
 * - A `displayProperties.name` that isn't empty
 * - An `itemType` or `itemTypeDisplayName` that indicates weapon-related
 * - Not being a "hidden" perk (no display properties)
 */
function isWeaponRelevant(def: DefinitionRecord): boolean {
  const name = def.displayProperties?.name?.trim();
  if (!name) return false;

  // Filter out some known non-weapon-perk patterns
  const lower = name.toLowerCase();

  // Skip armor-specific mod names
  if (
    lower.includes("armor") &&
    !lower.includes("anti-")
  ) {
    return false;
  }

  // Skip ghost mods
  if (lower.includes("ghost")) return false;

  // Skip class item mods
  if (lower.includes("class item mod")) return false;

  return true;
}
