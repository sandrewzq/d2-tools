import { analyzeVault, type VaultAnalysisResult } from "../analysis/vault.js";
import { scoreVaultItem, type ScorableVaultItem, type VaultItemScore } from "../analysis/scoring.js";
import type { AccountItemSummary } from "../account/summary.js";
import type { AccountSummary } from "../account/summary.js";
import type { ActivityHistorySummary } from "../activities/history.js";
import type { D2Config } from "../config/schema.js";
import type { DailySummary } from "../daily/summary.js";
import type { VaultTags } from "../vault/tags.js";

export type VaultAiAdviceInput = {
  config: D2Config;
  items: AccountItemSummary[];
  tags: VaultTags;
  fetcher?: typeof fetch;
};

export type VaultAiAdviceResult = {
  local: VaultAnalysisResult;
  ai: {
    provider: string;
    model: string;
    text: string;
    sections: AiAdviceSections;
  } | null;
  skipped_reason?: string;
};

export type ItemAiAdviceInput = {
  config: D2Config;
  item: ScorableVaultItem & {
    bucket_name?: string;
    item_type?: string;
    description?: string;
    note?: string;
  };
  tags: VaultTags;
  fetcher?: typeof fetch;
};

export type ItemAiAdviceResult = {
  score: VaultItemScore;
  ai: {
    provider: string;
    model: string;
    text: string;
    sections: AiAdviceSections;
  } | null;
  skipped_reason?: string;
};

export type AiChatContextInput = {
  account: AccountSummary | null;
  tags: VaultTags;
  daily: DailySummary | null;
  activity: ActivityHistorySummary | null;
};

export type AiChatReplyInput = {
  config: D2Config;
  question: string;
  context: string;
  fetcher?: typeof fetch;
};

export type AiChatReplyResult = {
  provider: string;
  model: string;
  text: string;
};

export type AiConnectionTestResult = {
  ok: true;
  provider: string;
  model: string;
  message: string;
};

type ChatResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  output_text?: string;
  output?: Array<{
    content?: Array<{
      text?: string;
    }>;
  }>;
  content?: Array<{
    type?: string;
    text?: string;
  }>;
  error?: {
    message?: string;
  };
};

type AiProvider = "openai_responses" | "openai_chat" | "openai_compatible" | "anthropic";

type NormalizedAiConfig = {
  provider: "" | AiProvider;
  api_key: string;
  model: string;
  base_url: string;
};

type AiPromptMessage = {
  role: "system" | "user";
  content: string;
};

export type AiAdviceSections = {
  facts: string[];
  analysis: string[];
  suggestions: string[];
  action_reminders: string[];
  raw: string;
};

const providerBaseUrls: Record<AiProvider, string> = {
  openai_responses: "https://api.openai.com/v1",
  openai_chat: "https://api.openai.com/v1",
  openai_compatible: "",
  anthropic: "https://api.anthropic.com"
};

export async function generateVaultAiAdvice(input: VaultAiAdviceInput): Promise<VaultAiAdviceResult> {
  const local = analyzeVault({
    items: input.items,
    tags: input.tags
  });
  const settings = normalizeAiConfig(input.config.ai);

  if (!settings.provider) {
    return {
      local,
      ai: null,
      skipped_reason: "AI 未启用。"
    };
  }

  if (!settings.api_key) {
    throw new Error("请先填写 AI API Key。");
  }
  if (!settings.model) {
    throw new Error("请先填写 AI 模型名称。");
  }

  const text = await callAiText({
    settings,
    messages: [
      {
        role: "system",
        content: [
          "你是一个命运2装备分析助手。",
          "只根据用户提供的仓库事实、实际 roll 和本地标记给建议。",
          "不要编造未提供的 perk 或外部数据库结论。",
          "输出中文，固定分为：事实、分析、建议、操作提醒。"
        ].join("\n")
      },
      {
        role: "user",
        content: buildVaultPrompt(local)
      }
    ],
    temperature: 0.2,
    fetcher: input.fetcher
  });

  return {
    local,
    ai: {
      provider: settings.provider,
      model: settings.model,
      text,
      sections: extractAiSections(text)
    }
  };
}

export async function generateItemAiAdvice(input: ItemAiAdviceInput): Promise<ItemAiAdviceResult> {
  const score = scoreVaultItem(input.item, input.tags);
  const settings = normalizeAiConfig(input.config.ai);

  if (!settings.provider) {
    return {
      score,
      ai: null,
      skipped_reason: "AI 未启用。"
    };
  }

  if (!settings.api_key) {
    throw new Error("请先填写 AI API Key。");
  }
  if (!settings.model) {
    throw new Error("请先填写 AI 模型名称。");
  }

  const text = await callAiText({
    settings,
    messages: [
      {
        role: "system",
        content: [
          "你是一个命运2单件装备分析助手。",
          "只根据用户提供的装备信息、实际 roll、本地评分和本地标签给建议。",
          "不要编造未提供的 perk、来源或外部数据库结论。",
          "输出中文，固定分为：事实、分析、建议、操作提醒。"
        ].join("\n")
      },
      {
        role: "user",
        content: buildItemPrompt(input.item, score)
      }
    ],
    temperature: 0.2,
    fetcher: input.fetcher
  });

  return {
    score,
    ai: {
      provider: settings.provider,
      model: settings.model,
      text,
      sections: extractAiSections(text)
    }
  };
}

export function buildAiChatContext(input: AiChatContextInput): string {
  const account = input.account;
  const context = {
    safety: {
      note: "AI 只能建议，不能直接执行锁定、转移、装备或分解。所有写操作都必须由用户在 GUI 中确认。",
      credential_policy: "上下文只包含游戏数据摘要，不包含任何本地密钥、授权票据或应用密钥。"
    },
    account: account ? {
      account_name: account.account_name,
      destiny_membership_id: account.destiny_membership_id,
      membership_type: account.membership_type,
      characters: account.characters.map((character) => ({
        character_id: character.character_id,
        class_name: character.class_name,
        light: character.light,
        equipped_items: summarizeChatItems(character.equipped_items),
        inventory_items: summarizeChatItems(character.inventory_items),
        postmaster_items: summarizeChatItems(character.postmaster_items),
        loadout_slots: character.loadout_slots.map((slot) => ({
          index: slot.index,
          name: slot.name,
          item_count: slot.item_count,
          items: slot.items
        }))
      })),
      vault: {
        item_count: account.vault.item_count,
        items: summarizeChatItems(account.vault.items)
      },
      materials: account.materials.items.map((material) => ({
        name: material.name,
        quantity: material.quantity,
        tier: material.tier,
        type: material.item_type
      }))
    } : null,
    tags: Object.entries(input.tags.items).map(([item_key, value]) => ({
      item_key,
      tag: value.tag,
      note: value.note
    })),
    daily: input.daily ? {
      date_label: input.daily.date_label,
      daily_reset: input.daily.daily_reset,
      weekly_reset: input.daily.weekly_reset,
      sources: input.daily.sources,
      checklist: input.daily.checklist,
      recommendations: input.daily.recommendations
    } : null,
    activity: input.activity
  };

  return JSON.stringify(context, null, 2);
}

export async function generateAiChatReply(input: AiChatReplyInput): Promise<AiChatReplyResult> {
  const settings = normalizeAiConfig(input.config.ai);

  if (!settings.provider) {
    throw new Error("请先启用 AI 提供方。");
  }
  if (!settings.api_key) {
    throw new Error("请先填写 AI API Key。");
  }
  if (!settings.model) {
    throw new Error("请先填写 AI 模型名称。");
  }

  const text = await callAiText({
    settings,
    messages: [
      {
        role: "system",
        content: [
          "你是 d2-tools 的命运2中文 GUI 助手。",
          "只根据用户提供的上下文回答，不要编造外部数据。",
          "如果数据未接入或不可确认，明确说明不可确认。",
          "AI 不能直接执行锁定、转移、装备或分解；只能给出需要用户确认的操作计划。",
          "不要要求用户使用 CLI，也不要输出英文搜索语法作为主要方案。"
        ].join("\n")
      },
      {
        role: "user",
        content: [
          "上下文：",
          input.context,
          "",
          "用户问题：",
          input.question
        ].join("\n")
      }
    ],
    temperature: 0.2,
    fetcher: input.fetcher
  });

  return {
    provider: settings.provider,
    model: settings.model,
    text
  };
}

export function extractAiSections(text: string): AiAdviceSections {
  const sections: AiAdviceSections = {
    facts: [],
    analysis: [],
    suggestions: [],
    action_reminders: [],
    raw: text
  };
  let current: keyof Omit<AiAdviceSections, "raw"> | undefined;
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }
    const heading = normalizeSectionHeading(trimmed);
    if (heading) {
      current = heading;
      continue;
    }
    if (current) {
      sections[current].push(trimmed.replace(/^[-*]\s*/, ""));
    }
  }
  return sections;
}

function normalizeSectionHeading(line: string): keyof Omit<AiAdviceSections, "raw"> | undefined {
  const normalized = line.replace(/[：:]+$/, "").trim();
  if (normalized === "事实") return "facts";
  if (normalized === "分析") return "analysis";
  if (normalized === "建议") return "suggestions";
  if (normalized === "操作提醒" || normalized === "操作") return "action_reminders";
  return undefined;
}

export async function testAiConnection(input: {
  config: D2Config;
  fetcher?: typeof fetch;
}): Promise<AiConnectionTestResult> {
  const settings = normalizeAiConfig(input.config.ai);

  if (!settings.provider) {
    throw new Error("请先启用 AI 提供方。");
  }
  if (!settings.api_key) {
    throw new Error("请先填写 AI API Key。");
  }
  if (!settings.model) {
    throw new Error("请先填写 AI 模型名称。");
  }

  await callAiText({
    settings,
    messages: [
      {
        role: "system",
        content: "你是 d2-tools 的连接测试助手。"
      },
      {
        role: "user",
        content: "请只回复 OK，用于确认接口可用。"
      }
    ],
    temperature: 0,
    fetcher: input.fetcher
  });

  return {
    ok: true,
    provider: settings.provider,
    model: settings.model,
    message: "AI 连接测试成功。"
  };
}

function normalizeAiConfig(config: D2Config["ai"]): NormalizedAiConfig {
  const provider = config.provider.trim();
  if (!provider || provider === "none") {
    return {
      provider: "",
      api_key: "",
      model: "",
      base_url: ""
    };
  }

  if (provider === "openai") {
    return {
      provider: "openai_chat",
      api_key: config.api_key.trim(),
      model: config.model.trim(),
      base_url: config.base_url.trim()
    };
  }

  if (provider === "deepseek") {
    return {
      provider: "openai_compatible",
      api_key: config.api_key.trim(),
      model: config.model.trim(),
      base_url: config.base_url.trim() || "https://api.deepseek.com"
    };
  }

  if (provider === "custom") {
    return {
      provider: "openai_compatible",
      api_key: config.api_key.trim(),
      model: config.model.trim(),
      base_url: config.base_url.trim()
    };
  }

  return {
    provider: isAiProvider(provider) ? provider : "openai_compatible",
    api_key: config.api_key.trim(),
    model: config.model.trim(),
    base_url: config.base_url.trim()
  };
}

async function callAiText(input: {
  settings: NormalizedAiConfig;
  messages: AiPromptMessage[];
  temperature: number;
  fetcher?: typeof fetch;
}): Promise<string> {
  const request = buildAiRequest(input.settings, input.messages, input.temperature);
  const response = await (input.fetcher ?? fetch)(request.url, {
    method: "POST",
    headers: request.headers,
    body: JSON.stringify(request.body)
  });

  const body = await readJson(response);
  if (!response.ok) {
    throw new Error(`AI 接口调用失败：${body.error?.message ?? response.statusText}`);
  }

  const text = extractAiText(body);
  if (!text) {
    throw new Error("AI 接口没有返回可读取的分析内容。");
  }

  return text;
}

function buildAiRequest(settings: NormalizedAiConfig, messages: AiPromptMessage[], temperature: number): {
  url: string;
  headers: Record<string, string>;
  body: unknown;
} {
  if (!settings.provider) {
    throw new Error("请先启用 AI 提供方。");
  }

  if (settings.provider === "anthropic") {
    const system = messages.find((message) => message.role === "system")?.content ?? "";
    const userMessages = messages.filter((message) => message.role !== "system");
    return {
      url: anthropicMessagesEndpoint(settings.base_url),
      headers: {
        "x-api-key": settings.api_key,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json"
      },
      body: {
        model: settings.model,
        max_tokens: 1200,
        temperature,
        system,
        messages: userMessages.map((message) => ({
          role: "user",
          content: message.content
        }))
      }
    };
  }

  if (settings.provider === "openai_responses") {
    return {
      url: openAiResponsesEndpoint(settings.base_url),
      headers: openAiHeaders(settings.api_key),
      body: {
        model: settings.model,
        temperature,
        input: messages.map((message) => ({
          role: message.role,
          content: message.content
        }))
      }
    };
  }

  return {
    url: chatCompletionsEndpoint(settings.provider, settings.base_url),
    headers: openAiHeaders(settings.api_key),
    body: {
      model: settings.model,
      temperature,
      messages
    }
  };
}

function openAiHeaders(apiKey: string): Record<string, string> {
  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json"
  };
}

function extractAiText(body: ChatResponse): string {
  return (
    body.output_text
    ?? body.output?.flatMap((item) => item.content ?? []).map((content) => content.text).find(Boolean)
    ?? body.choices?.[0]?.message?.content
    ?? body.content?.find((content) => content.type === "text" || content.text)?.text
    ?? ""
  ).trim();
}

function isAiProvider(provider: string): provider is AiProvider {
  return provider === "openai_responses"
    || provider === "openai_chat"
    || provider === "openai_compatible"
    || provider === "anthropic";
}

function openAiResponsesEndpoint(baseUrl: string): string {
  const normalized = normalizeBaseUrl(baseUrl || providerBaseUrls.openai_responses);
  return normalized.endsWith("/responses") ? normalized : `${normalized}/responses`;
}

function anthropicMessagesEndpoint(baseUrl: string): string {
  const normalized = normalizeBaseUrl(baseUrl || providerBaseUrls.anthropic);
  if (normalized.endsWith("/messages")) {
    return normalized;
  }
  return normalized.endsWith("/v1") ? `${normalized}/messages` : `${normalized}/v1/messages`;
}

function chatCompletionsEndpoint(provider: Exclude<AiProvider, "anthropic" | "openai_responses">, baseUrl: string): string {
  const selectedBaseUrl = baseUrl || providerBaseUrls[provider];
  if (!selectedBaseUrl) {
    throw new Error("请为 OpenAI 兼容接口填写接口地址。");
  }

  const normalized = normalizeBaseUrl(selectedBaseUrl);
  return normalized.endsWith("/chat/completions")
    ? normalized
    : `${normalized}/chat/completions`;
}

function normalizeBaseUrl(baseUrl: string): string {
  const normalized = baseUrl.trim().replace(/\/+$/, "");
  if (!normalized) {
    throw new Error("请填写 AI 接口地址。");
  }
  return normalized;
}

function buildVaultPrompt(local: VaultAnalysisResult): string {
  return JSON.stringify({
    facts: local.facts,
    local_analysis: local.analysis,
    local_suggestions: local.suggestions,
    tagged_items: local.items,
    score_summary: local.scoring.counts,
    score_examples: {
      keep: local.scoring.top_keep.slice(0, 5),
      review: local.scoring.top_review.slice(0, 5),
      junk: local.scoring.top_junk.slice(0, 5)
    }
  }, null, 2);
}

function buildItemPrompt(item: ItemAiAdviceInput["item"], score: VaultItemScore): string {
  return JSON.stringify({
    item: {
      name: item.name,
      tier: item.tier,
      type: item.item_type,
      bucket: item.bucket_name,
      group: item.group_key,
      locked: item.locked,
      description: item.description,
      local_note: item.note,
      plugs: (item.socket_plugs ?? []).map((plug) => typeof plug === "object" && plug && "name" in plug
        ? (plug as { name?: string }).name
        : undefined).filter(Boolean)
    },
    local_score: score
  }, null, 2);
}

function summarizeChatItems(items: AccountItemSummary[]) {
  return items.map((item) => ({
    hash: item.hash,
    instance_id: item.instance_id,
    name: item.name,
    tier: item.tier,
    type: item.item_type,
    bucket: item.bucket_name,
    group: item.group_key,
    ammo: item.ammo_type,
    power: item.power,
    locked: item.locked,
    plugs: (item.socket_plugs ?? []).map((plug) => plug.name).filter(Boolean)
  }));
}

async function readJson(response: Response): Promise<ChatResponse> {
  try {
    return await response.json() as ChatResponse;
  } catch {
    return {};
  }
}
