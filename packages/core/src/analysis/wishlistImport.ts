export type DimWishlistMode = "pve" | "pvp" | "general";

export type DimWishlistRule = {
  rule_stable_id?: string;
  item_hash: number;
  perk_hashes: number[];
  mode: DimWishlistMode;
  note: string;
  tags?: string[];
  author?: string;
  source_note?: string;
  source_title?: string;
  source_description?: string;
  source_block_id?: string;
};

export type DimWishlistSourceBlock = {
  id: string;
  title?: string;
  description?: string;
  note?: string;
  tags?: string[];
  author?: string;
};

export type DimWishlist = {
  title: string;
  description?: string;
  author?: string;
  source_blocks?: DimWishlistSourceBlock[];
  rules: DimWishlistRule[];
};

export type DimWishlistImportPreview = {
  token: string;
  file_name: string;
  title: string;
  rule_count: number;
  weapon_count: number;
  mode_counts: Record<DimWishlistMode, number>;
  authors: string[];
  tags: string[];
  fingerprint: string;
};

export function parseDimWishlist(text: string): DimWishlist {
  let title = "DIM Wishlist";
  let description = "";
  let author = "";
  let hasWishlistTitle = false;
  let sourceTitle = "";
  let sourceDescription = "";
  let blockMetadata: WishlistMetadata = {};
  let currentBlockId = "";
  const sourceBlocks: DimWishlistSourceBlock[] = [];
  const rules: DimWishlistRule[] = [];

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;

    const comment = line.startsWith("//") ? line.slice(2).trim() : "";
    const declaration = comment || line;

    if (startsWithField(declaration, "title")) {
      const value = fieldValue(declaration);
      if (!hasWishlistTitle) {
        title = value || title;
        hasWishlistTitle = true;
      } else {
        sourceTitle = value;
        sourceDescription = "";
        blockMetadata = {};
        currentBlockId = "";
      }
      continue;
    }
    if (startsWithField(declaration, "description")) {
      if (sourceTitle) {
        sourceDescription = fieldValue(declaration);
        currentBlockId = "";
      }
      else description = fieldValue(declaration);
      continue;
    }
    if (startsWithField(declaration, "author")) {
      author = fieldValue(declaration);
      blockMetadata.author = author || blockMetadata.author;
      currentBlockId = "";
      continue;
    }

    if (comment) {
      const metadata = parseMetadata(comment);
      if (metadata.note || metadata.tags?.length || metadata.author) {
        blockMetadata = metadata;
        currentBlockId = "";
      }
      continue;
    }

    const match = line.match(/^dimwishlist:item=(\d+)&perks=([0-9,]+)(?:#(.*))?$/i);
    if (!match) continue;

    const inlineMetadata = parseMetadata(match[3] ?? "");
    const metadata = mergeMetadata(blockMetadata, inlineMetadata);
    const itemHash = Number(match[1]);
    const perkHashes = match[2]
      .split(",")
      .map(Number)
      .filter(isUnsignedHash);
    if (isUnsignedHash(itemHash) && perkHashes.length > 0) {
      const sourceBlockId = ensureSourceBlock({
        currentBlockId,
        sourceBlocks,
        title: sourceTitle,
        description: sourceDescription,
        metadata: blockMetadata
      });
      if (sourceBlockId) currentBlockId = sourceBlockId;
      const note = inlineMetadata.note ?? "";
      rules.push({
        item_hash: itemHash,
        perk_hashes: [...new Set(perkHashes)],
        mode: modeFromMetadata([blockMetadata.note, note].filter(Boolean).join(" | "), metadata.tags ?? []),
        note,
        ...(inlineMetadata.tags?.length ? { tags: inlineMetadata.tags } : {}),
        ...(inlineMetadata.author ? { author: inlineMetadata.author } : {}),
        ...(sourceBlockId ? { source_block_id: sourceBlockId } : {})
      });
    }
  }

  return {
    title,
    ...(description ? { description } : {}),
    ...(author ? { author } : {}),
    ...(sourceBlocks.length ? { source_blocks: sourceBlocks } : {}),
    rules
  };
}

export function resolveDimWishlistRuleMetadata(
  wishlist: DimWishlist,
  rule: DimWishlistRule
): {
  note: string;
  tags: string[];
  author?: string;
  source_title?: string;
  source_description?: string;
} {
  const block = rule.source_block_id
    ? wishlist.source_blocks?.find((entry) => entry.id === rule.source_block_id)
    : undefined;
  return {
    note: [block?.note ?? rule.source_note, rule.note].filter(Boolean).join(" | "),
    tags: [...new Set([...(block?.tags ?? []), ...(rule.tags ?? [])])],
    ...(rule.author || block?.author || wishlist.author
      ? { author: rule.author || block?.author || wishlist.author }
      : {}),
    ...(block?.title || rule.source_title ? { source_title: block?.title || rule.source_title } : {}),
    ...(block?.description || rule.source_description
      ? { source_description: block?.description || rule.source_description }
      : {})
  };
}

type WishlistMetadata = {
  note?: string;
  tags?: string[];
  author?: string;
};

function parseMetadata(value: string): WishlistMetadata {
  const metadata: WishlistMetadata = {};
  for (const segment of value.split("|")) {
    const separator = segment.indexOf(":");
    if (separator < 0) continue;
    const key = segment.slice(0, separator).trim().toLowerCase();
    const decoded = decodeValue(segment.slice(separator + 1));
    if (!decoded) continue;
    if (key === "notes" || key === "note") metadata.note = decoded;
    if (key === "author") metadata.author = decoded;
    if (key === "tags") {
      metadata.tags = decoded.split(/[\s,]+/).map((tag) => tag.trim()).filter(Boolean);
    }
  }
  return metadata;
}

function mergeMetadata(left: WishlistMetadata, right: WishlistMetadata): WishlistMetadata {
  return {
    ...(left.note || right.note ? { note: [left.note, right.note].filter(Boolean).join(" | ") } : {}),
    ...(left.author || right.author ? { author: right.author || left.author } : {}),
    ...((left.tags?.length || right.tags?.length)
      ? { tags: [...new Set([...(left.tags ?? []), ...(right.tags ?? [])])] }
      : {})
  };
}

function ensureSourceBlock(input: {
  currentBlockId: string;
  sourceBlocks: DimWishlistSourceBlock[];
  title: string;
  description: string;
  metadata: WishlistMetadata;
}): string {
  if (input.currentBlockId) return input.currentBlockId;
  if (!input.title && !input.description && !input.metadata.note && !input.metadata.tags?.length && !input.metadata.author) {
    return "";
  }
  const id = `source-${input.sourceBlocks.length + 1}`;
  input.sourceBlocks.push({
    id,
    ...(input.title ? { title: input.title } : {}),
    ...(input.description ? { description: input.description } : {}),
    ...(input.metadata.note ? { note: input.metadata.note } : {}),
    ...(input.metadata.tags?.length ? { tags: input.metadata.tags } : {}),
    ...(input.metadata.author ? { author: input.metadata.author } : {})
  });
  return id;
}

function modeFromMetadata(note: string, tags: string[]): DimWishlistMode {
  const normalized = `${note} ${tags.join(" ")}`.toLowerCase();
  if (normalized.includes("pve")) return "pve";
  if (normalized.includes("pvp")) return "pvp";
  return "general";
}

function startsWithField(value: string, field: string): boolean {
  return value.toLowerCase().startsWith(`${field}:`);
}

function fieldValue(value: string): string {
  return decodeValue(value.slice(value.indexOf(":") + 1));
}

function decodeValue(value: string): string {
  const trimmed = value.trim();
  try {
    return decodeURIComponent(trimmed).trim();
  } catch {
    return trimmed;
  }
}

function isUnsignedHash(value: number): boolean {
  return Number.isInteger(value) && value >= 0 && value <= 0xffff_ffff;
}
