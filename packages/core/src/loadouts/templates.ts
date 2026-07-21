import type { AccountItemSummary } from "../account/summary.js";
export type LoadoutTemplateItem = { hash: number; instance_id?: string; name: string; bucket_name?: string; weapon_frame_name?: string; perk_names?: string[] };
export type LoadoutTemplate = { id: string; name: string; character_id: string; class_name: string; created_at: string; updated_at?: string; items: LoadoutTemplateItem[] };
export type CreateLoadoutTemplateInput = { name: string; character_id: string; class_name: string; equipped_items: AccountItemSummary[] };
