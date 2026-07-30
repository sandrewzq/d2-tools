import type { AccountItemSummary } from "./sharedTypes";
import type { BatchTransferPlan } from "../../contracts/actions.js";

export type LoadoutApi = {
  listLoadoutTemplates(): Promise<LoadoutTemplate[]>;
  createLoadoutTemplate(input: CreateLoadoutTemplateInput): Promise<LoadoutTemplate>;
  renameLoadoutTemplate(id: string, name: string): Promise<LoadoutTemplate>;
  deleteLoadoutTemplate(id: string): Promise<LoadoutTemplate[]>;
  createLoadoutTemplateTransferPlan(input: LoadoutTemplateTransferPlanInput): Promise<BatchTransferPlan>;
};

export type LoadoutTemplate = {
  id: string;
  name: string;
  character_id: string;
  class_name: string;
  created_at: string;
  updated_at?: string;
  items: Array<{
    hash: number;
    instance_id?: string;
    name: string;
    bucket_name?: string;
    weapon_frame_name?: string;
    perk_names?: string[];
  }>;
};

export type CreateLoadoutTemplateInput = {
  name: string;
  character_id: string;
  class_name: string;
  equipped_items: AccountItemSummary[];
};

export type LoadoutTemplateTransferPlanInput = {
  template: LoadoutTemplate;
  target_character_id: string;
  available_items: AccountItemSummary[];
  equipped_items: AccountItemSummary[];
};
