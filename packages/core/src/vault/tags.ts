import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

export type VaultTagValue = "none" | "keep" | "review" | "junk";

export type VaultTagEntry = {
  tag: Exclude<VaultTagValue, "none">;
};

export type VaultTags = {
  items: Record<string, VaultTagEntry>;
};

export type SaveVaultTagInput = {
  item_key: string;
  tag: VaultTagValue;
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
    delete tags.items[itemKey];
  } else {
    tags.items[itemKey] = {
      tag: input.tag
    };
  }

  const file = vaultTagsPath(dataDir);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify(tags, null, 2)}\n`, "utf8");
  return tags;
}

function vaultTagsPath(dataDir: string): string {
  return join(dataDir, vaultTagsFileName);
}
