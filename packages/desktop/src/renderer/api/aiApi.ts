import type { AccountItemSummary, AiAdviceSections } from "./sharedTypes";
import type { VaultTags } from "./vaultApi";
import type { WeaponRecommendation } from "./sharedTypes";
import type { PersonalWeaponKnowledgeEntry } from "@d2-tools/core/community-perks/personalWeaponKnowledge";

export type AiApi = {
  generateItemAiAdvice(input: ItemAiAdviceInput): Promise<ItemAiAdviceResult>;
  sendAiChat(input: AiChatRequest): Promise<AiChatReplyResult>;
};

export type ItemAiAdviceInput = {
  item: AccountItemSummary & {
    description?: string;
    note?: string;
  };
  tags: VaultTags;
  user_knowledge?: string;
  personal_knowledge?: PersonalWeaponKnowledgeEntry[];
  builtin_knowledge?: WeaponRecommendation | null;
  allow_external_search?: boolean;
  weapon_context?: {
    object_kind: "definition" | "vendor_offer" | "account_instance";
    official_sources: string[];
    definition_stats?: Record<string, number>;
    current_stats?: Record<string, number>;
    configuration_kind?: "fixed_exotic" | "variable_exotic" | "random_roll" | "fixed";
    fixed_perks?: Array<{ socket_index: number; names: string[] }>;
    configuration_options?: Array<{ socket_index: number; names: string[] }>;
    perk_pool?: Array<{ socket_index: number; names: string[] }>;
    catalyst?: {
      name: string;
      acquired?: boolean;
      complete: boolean;
      progress?: number;
      objective?: string;
      acquisition?: string;
      effects: string[];
    };
    same_hash_instances?: Array<{ location: string; power?: number; plugs: string[] }>;
    offer?: { vendor_name: string; cost: string; affordability: string; refresh: string };
  };
};

export type ItemAiAdviceResult = {
  ai: {
    provider: string;
    model: string;
    text: string;
    sections: AiAdviceSections;
    external_search?: {
      requested: boolean;
      used: boolean;
      message: string;
      sources: Array<{ title?: string; url: string; queried_at: string }>;
    };
  } | null;
  skipped_reason?: string;
};

export type AiChatRequest = {
  question: string;
  context: string;
};

export type AiChatReplyResult = {
  provider: string;
  model: string;
  text: string;
};
