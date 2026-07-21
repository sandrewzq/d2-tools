import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { join } from "node:path";
import type { AccountItemSummary } from "@d2-tools/core/account/summary";
import type { CreateLoadoutTemplateInput, LoadoutTemplate, LoadoutTemplateItem } from "@d2-tools/core/loadouts/templates";

export type { CreateLoadoutTemplateInput, LoadoutTemplate, LoadoutTemplateItem } from "@d2-tools/core/loadouts/templates";

type LegacyLoadoutTemplateItem = {
  hash: number;
  instance_id?: string;
  name: string;
  bucket_name?: string;
  weapon_frame_name?: string;
  perk_names?: string[];
};

type LegacyLoadoutTemplate = {
  id: string;
  name: string;
  character_id: string;
  class_name: string;
  created_at: string;
  updated_at?: string;
  items: LoadoutTemplateItem[];
};

type LegacyCreateLoadoutTemplateInput = {
  name: string;
  character_id: string;
  class_name: string;
  equipped_items: AccountItemSummary[];
};

const templatesFileName = "loadout-templates.json";

export function listLoadoutTemplates(dataDir: string): LoadoutTemplate[] {
  const path = templatesPath(dataDir);
  if (!existsSync(path)) {
    return [];
  }

  const raw = JSON.parse(readFileSync(path, "utf8")) as unknown;
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw.flatMap((template) => normalizeTemplate(template));
}

export function createLoadoutTemplate(
  dataDir: string,
  input: CreateLoadoutTemplateInput,
  now = new Date()
): LoadoutTemplate {
  const name = input.name.trim();
  if (!name) {
    throw new Error("loadout template name is required");
  }

  const template: LoadoutTemplate = {
    id: randomUUID(),
    name,
    character_id: input.character_id,
    class_name: input.class_name,
    created_at: now.toISOString(),
    items: input.equipped_items.map((item) => ({
      hash: item.hash,
      instance_id: item.instance_id,
      name: item.name,
      bucket_name: item.bucket_name,
      weapon_frame_name: item.weapon_frame?.name,
      perk_names: item.socket_plugs
        .map((plug) => plug.name.trim())
        .filter(Boolean)
    }))
  };
  writeTemplates(dataDir, [template, ...listLoadoutTemplates(dataDir)].slice(0, 50));
  return template;
}

export function renameLoadoutTemplate(
  dataDir: string,
  id: string,
  name: string,
  now = new Date()
): LoadoutTemplate {
  const nextName = name.trim();
  if (!nextName) {
    throw new Error("loadout template name is required");
  }

  const templates = listLoadoutTemplates(dataDir);
  const target = templates.find((template) => template.id === id);
  if (!target) {
    throw new Error("loadout template was not found");
  }

  const renamed: LoadoutTemplate = {
    ...target,
    name: nextName,
    updated_at: now.toISOString()
  };
  const next = templates.map((template) => template.id === id ? renamed : template);
  writeTemplates(dataDir, next);
  return renamed;
}

export function deleteLoadoutTemplate(dataDir: string, id: string): LoadoutTemplate[] {
  const next = listLoadoutTemplates(dataDir).filter((template) => template.id !== id);
  writeTemplates(dataDir, next);
  return next;
}

function normalizeTemplate(value: unknown): LoadoutTemplate[] {
  if (!value || typeof value !== "object") {
    return [];
  }

  const template = value as Partial<LoadoutTemplate> & { items?: unknown };
  if (
    typeof template.id !== "string"
    || typeof template.name !== "string"
    || typeof template.character_id !== "string"
    || typeof template.class_name !== "string"
    || typeof template.created_at !== "string"
    || !Array.isArray(template.items)
  ) {
    return [];
  }

  return [{
    id: template.id,
    name: template.name,
    character_id: template.character_id,
    class_name: template.class_name,
    created_at: template.created_at,
    updated_at: typeof template.updated_at === "string" ? template.updated_at : undefined,
    items: template.items.flatMap((item) => normalizeTemplateItem(item))
  }];
}

function normalizeTemplateItem(value: unknown): LoadoutTemplateItem[] {
  if (!value || typeof value !== "object") {
    return [];
  }

  const item = value as Partial<LoadoutTemplateItem>;
  if (typeof item.hash !== "number" || typeof item.name !== "string") {
    return [];
  }

  return [{
    hash: item.hash,
    instance_id: typeof item.instance_id === "string" ? item.instance_id : undefined,
    name: item.name,
    bucket_name: typeof item.bucket_name === "string" ? item.bucket_name : undefined,
    weapon_frame_name: typeof item.weapon_frame_name === "string" ? item.weapon_frame_name : undefined,
    perk_names: Array.isArray(item.perk_names)
      ? item.perk_names.filter((perk): perk is string => typeof perk === "string" && perk.trim().length > 0)
      : undefined
  }];
}

function writeTemplates(dataDir: string, templates: LoadoutTemplate[]): void {
  mkdirSync(dataDir, { recursive: true });
  writeFileSync(templatesPath(dataDir), `${JSON.stringify(templates, null, 2)}\n`, "utf8");
}

function templatesPath(dataDir: string): string {
  return join(dataDir, templatesFileName);
}
