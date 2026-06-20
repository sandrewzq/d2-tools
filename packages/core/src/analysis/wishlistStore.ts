import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { DimWishlist } from "./wishlistImport.js";

const wishlistFileName = "dim-wishlist.json";

export function loadDimWishlist(dataDir: string): DimWishlist | null {
  const file = wishlistPath(dataDir);
  if (!existsSync(file)) {
    return null;
  }

  const parsed = JSON.parse(readFileSync(file, "utf8")) as Partial<DimWishlist>;
  if (!parsed.rules?.length) {
    return null;
  }

  return {
    title: parsed.title?.trim() || "DIM Wishlist",
    rules: parsed.rules.map((rule) => ({
      item_hash: Number(rule.item_hash),
      perk_hashes: Array.isArray(rule.perk_hashes) ? rule.perk_hashes.map(Number).filter(Number.isFinite) : [],
      mode: rule.mode === "pve" || rule.mode === "pvp" ? rule.mode : "general",
      note: typeof rule.note === "string" ? rule.note : ""
    }))
  };
}

export function saveDimWishlist(dataDir: string, wishlist: DimWishlist): DimWishlist {
  const rules = wishlist.rules
    .map((rule) => ({
      item_hash: Number(rule.item_hash),
      perk_hashes: rule.perk_hashes.map(Number).filter(Number.isFinite),
      mode: rule.mode,
      note: rule.note.trim()
    }))
    .filter((rule) => Number.isFinite(rule.item_hash) && rule.perk_hashes.length);

  if (!rules.length) {
    throw new Error("DIM wishlist requires at least one valid rule");
  }

  const next: DimWishlist = {
    title: wishlist.title.trim() || "DIM Wishlist",
    rules
  };

  mkdirSync(dataDir, { recursive: true });
  writeFileSync(wishlistPath(dataDir), `${JSON.stringify(next, null, 2)}\n`, "utf8");
  return next;
}

export function clearDimWishlist(dataDir: string): void {
  rmSync(wishlistPath(dataDir), { force: true });
}

function wishlistPath(dataDir: string): string {
  return join(dataDir, wishlistFileName);
}
