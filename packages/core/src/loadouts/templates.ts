import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { join } from "node:path";
import type { AccountItemSummary } from "../account/summary.js";

export type LoadoutTemplateItem = {
  hash: number;
  instance_id?: string;
  name: string;
  bucket_name?: string;
};

export type LoadoutTemplate = {
  id: string;
  name: string;
  character_id: string;
  class_name: string;
  created_at: string;
  items: LoadoutTemplateItem[];
};

export type CreateLoadoutTemplateInput = {
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

  return JSON.parse(readFileSync(path, "utf8")) as LoadoutTemplate[];
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
      bucket_name: item.bucket_name
    }))
  };
  writeTemplates(dataDir, [template, ...listLoadoutTemplates(dataDir)].slice(0, 50));
  return template;
}

export function deleteLoadoutTemplate(dataDir: string, id: string): LoadoutTemplate[] {
  const next = listLoadoutTemplates(dataDir).filter((template) => template.id !== id);
  writeTemplates(dataDir, next);
  return next;
}

function writeTemplates(dataDir: string, templates: LoadoutTemplate[]): void {
  mkdirSync(dataDir, { recursive: true });
  writeFileSync(templatesPath(dataDir), `${JSON.stringify(templates, null, 2)}\n`, "utf8");
}

function templatesPath(dataDir: string): string {
  return join(dataDir, templatesFileName);
}
