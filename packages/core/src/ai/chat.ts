import { analyzeVault, type VaultAnalysisResult } from "../analysis/vault.js";
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
            "输出中文，分为：结论、重点复查、可执行步骤。"
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
      text
    }
  };
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
    tagged_items: local.items
  }, null, 2);
}

async function readJson(response: Response): Promise<ChatResponse> {
  try {
    return await response.json() as ChatResponse;
  } catch {
    return {};
  }
}
