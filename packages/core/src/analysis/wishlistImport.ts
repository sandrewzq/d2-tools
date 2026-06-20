export type DimWishlistMode = "pve" | "pvp" | "general";

export type DimWishlistRule = {
  item_hash: number;
  perk_hashes: number[];
  mode: DimWishlistMode;
  note: string;
};

export type DimWishlist = {
  title: string;
  rules: DimWishlistRule[];
};

export function parseDimWishlist(text: string): DimWishlist {
  let title = "DIM Wishlist";
  const rules: DimWishlistRule[] = [];

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("//")) continue;

    if (line.toLowerCase().startsWith("title:")) {
      title = line.slice("title:".length).trim() || title;
      continue;
    }

    const match = line.match(/^dimwishlist:item=(\d+)&perks=([0-9,]+)(?:#notes:(.*))?$/i);
    if (!match) continue;

    const note = decodeURIComponent(match[3] ?? "").trim();
    rules.push({
      item_hash: Number(match[1]),
      perk_hashes: match[2].split(",").map(Number).filter((value) => Number.isFinite(value)),
      mode: modeFromNote(note),
      note
    });
  }

  return { title, rules };
}

function modeFromNote(note: string): DimWishlistMode {
  const normalized = note.toLowerCase();
  if (normalized.includes("pve")) return "pve";
  if (normalized.includes("pvp")) return "pvp";
  return "general";
}
