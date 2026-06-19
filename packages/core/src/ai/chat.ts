import { analyzeVault, type VaultAnalysisResult } from "../analysis/vault.js";
import { scoreVaultItem, type ScorableVaultItem, type VaultItemScore } from "../analysis/scoring.js";
import type { AccountItemSummary } from "../account/summary.js";
import type { D2Config } from "../config/schema.js";
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
  error?: {
    message?: string;
  };
};

export type AiAdviceSections = {
  facts: string[];
  analysis: string[];
  suggestions: string[];
  action_reminders: string[];
  raw: string;
};

const providerBaseUrls: Record<string, string> = {
  openai: "https://api.openai.com/v1",
  deepseek: "https://api.deepseek.com"
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

  const endpoint = chatCompletionsEndpoint(settings.provider, settings.base_url);
  const response = await (input.fetcher ?? fetch)(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${settings.api_key}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: settings.model,
      temperature: 0.2,
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
      ]
    })
  });

  const body = await readJson(response);
  if (!response.ok) {
    throw new Error(`AI 接口调用失败：${body.error?.message ?? response.statusText}`);
  }

  const text = body.choices?.[0]?.message?.content?.trim();
  if (!text) {
    throw new Error("AI 接口没有返回可读取的分析内容。");
  }

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

  const endpoint = chatCompletionsEndpoint(settings.provider, settings.base_url);
  const response = await (input.fetcher ?? fetch)(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${settings.api_key}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: settings.model,
      temperature: 0.2,
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
      ]
    })
  });

  const body = await readJson(response);
  if (!response.ok) {
    throw new Error(`AI 接口调用失败：${body.error?.message ?? response.statusText}`);
  }

  const text = body.choices?.[0]?.message?.content?.trim();
  if (!text) {
    throw new Error("AI 接口没有返回可读取的分析内容。");
  }

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

  const endpoint = chatCompletionsEndpoint(settings.provider, settings.base_url);
  const response = await (input.fetcher ?? fetch)(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${settings.api_key}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: settings.model,
      temperature: 0,
      messages: [
        {
          role: "system",
          content: "你是 d2-service 的连接测试助手。"
        },
        {
          role: "user",
          content: "请只回复 OK，用于确认接口可用。"
        }
      ]
    })
  });

  const body = await readJson(response);
  if (!response.ok) {
    throw new Error(`AI 接口调用失败：${body.error?.message ?? response.statusText}`);
  }

  return {
    ok: true,
    provider: settings.provider,
    model: settings.model,
    message: "AI 连接测试成功。"
  };
}

function normalizeAiConfig(config: D2Config["ai"]): D2Config["ai"] {
  const provider = config.provider.trim();
  if (!provider || provider === "none") {
    return {
      provider: "",
      api_key: "",
      model: "",
      base_url: ""
    };
  }

  return {
    provider,
    api_key: config.api_key.trim(),
    model: config.model.trim(),
    base_url: config.base_url.trim()
  };
}

function chatCompletionsEndpoint(provider: string, baseUrl: string): string {
  const selectedBaseUrl = baseUrl || providerBaseUrls[provider];
  if (!selectedBaseUrl) {
    throw new Error("请为自定义 AI 提供方填写接口地址。");
  }

  const normalized = selectedBaseUrl.replace(/\/+$/, "");
  return normalized.endsWith("/chat/completions")
    ? normalized
    : `${normalized}/chat/completions`;
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

async function readJson(response: Response): Promise<ChatResponse> {
  try {
    return await response.json() as ChatResponse;
  } catch {
    return {};
  }
}
