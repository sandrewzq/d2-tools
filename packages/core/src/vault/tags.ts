import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

export type VaultTagValue = "none" | "keep" | "review" | "junk";

export type VaultTagEntry = {
  tag?: Exclude<VaultTagValue, "none">;
  note?: string;
};

export type VaultTags = {
  items: Record<string, VaultTagEntry>;
};

export type SaveVaultTagInput = {
  item_key: string;
  tag: VaultTagValue;
};

export type SaveVaultNoteInput = {
  item_key: string;
  note: string;
};

const vaultTagsFileName = "vault-tags.json";

export function loadVaultTags(dataDir: string): VaultTags {
  const file = vaultTagsPath(dataDir);
  if (!existsSync(file)) {
    return { items: {} };
  }

  const parsed = JSON.parse(readFileSync(file, "utf8")) as Partial<VaultTags>;
  return {
    items: parsed.items ?? {}
  };
}

export function saveVaultTag(dataDir: string, input: SaveVaultTagInput): VaultTags {
  const itemKey = input.item_key.trim();
  if (!itemKey) {
    throw new Error("item_key is required");
  }

  const tags = loadVaultTags(dataDir);
  if (input.tag === "none") {
    const note = tags.items[itemKey]?.note;
    if (note) {
      tags.items[itemKey] = { note };
    } else {
      delete tags.items[itemKey];
    }
  } else {
    tags.items[itemKey] = {
      ...tags.items[itemKey],
      tag: input.tag
    };
  }

  return writeVaultTags(dataDir, tags);
}

export function saveVaultTagsBatch(dataDir: string, inputs: SaveVaultTagInput[]): VaultTags {
  const tags = loadVaultTags(dataDir);
  for (const input of inputs) {
    const itemKey = input.item_key.trim();
    if (!itemKey) {
      throw new Error("item_key is required");
    }

    if (input.tag === "none") {
      const note = tags.items[itemKey]?.note;
      if (note) {
        tags.items[itemKey] = { note };
      } else {
        delete tags.items[itemKey];
      }
    } else {
      tags.items[itemKey] = {
        ...tags.items[itemKey],
        tag: input.tag
      };
    }
  }

  return writeVaultTags(dataDir, tags);
}

export function saveVaultNote(dataDir: string, input: SaveVaultNoteInput): VaultTags {
  const itemKey = input.item_key.trim();
  if (!itemKey) {
    throw new Error("item_key is required");
  }

  const note = input.note.trim();
  const tags = loadVaultTags(dataDir);
  const existing = tags.items[itemKey];
  if (note) {
    tags.items[itemKey] = {
      ...existing,
      note
    };
  } else if (existing?.tag) {
    tags.items[itemKey] = {
      tag: existing.tag
    };
  } else {
    delete tags.items[itemKey];
  }

  return writeVaultTags(dataDir, tags);
}

function writeVaultTags(dataDir: string, tags: VaultTags): VaultTags {
  const file = vaultTagsPath(dataDir);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify(tags, null, 2)}\n`, "utf8");
  return tags;
}

function vaultTagsPath(dataDir: string): string {
  return join(dataDir, vaultTagsFileName);
}
