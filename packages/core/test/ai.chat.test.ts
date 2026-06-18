import { describe, expect, it } from "vitest";
import { generateVaultAiAdvice } from "../src/ai/chat.js";
import type { AccountItemSummary } from "../src/account/summary.js";
import type { D2Config } from "../src/config/schema.js";
import type { VaultTags } from "../src/vault/tags.js";

const items: AccountItemSummary[] = [
  {
    hash: 1,
    instance_id: "weapon-1",
    name: "Riskrunner",
    group_key: "weapons",
    tier: "Exotic",
    item_type: "Submachine Gun",
    power: 1990,
    socket_plugs: [{ hash: 11, name: "Voltshot" }]
  }
];

const tags: VaultTags = {
  items: {
    "weapon-1": { tag: "keep" }
  }
};

describe("AI chat analysis", () => {
  it("returns local analysis without calling the network when AI is disabled", async () => {
    let called = false;

    const result = await generateVaultAiAdvice({
      config: config({ ai: { provider: "", api_key: "", model: "", base_url: "" } }),
      items,
      tags,
      fetcher: async () => {
        called = true;
        throw new Error("unexpected network call");
      }
    });

    expect(called).toBe(false);
    expect(result.local.facts[0]).toBe("仓库共 1 件物品，其中武器 1 件、护甲 0 件、其他装备 0 件、其他 0 件。");
    expect(result.ai).toBeNull();
    expect(result.skipped_reason).toBe("AI 未启用。");
  });

  it("calls an OpenAI-compatible endpoint with vault facts and tagged roll data", async () => {
    const requests: Array<{ url: string; init: RequestInit }> = [];

    const result = await generateVaultAiAdvice({
      config: config({
        ai: {
          provider: "deepseek",
          api_key: "test-key",
          model: "deepseek-chat",
          base_url: ""
        }
      }),
      items,
      tags,
      fetcher: async (url, init) => {
        requests.push({ url: String(url), init: init ?? {} });
        return jsonResponse({
          choices: [
            {
              message: {
                content: "这把 Riskrunner 建议保留，用于电弧场景。"
              }
            }
          ]
        });
      }
    });

    expect(requests).toHaveLength(1);
    expect(requests[0].url).toBe("https://api.deepseek.com/chat/completions");
    expect(requests[0].init.headers).toMatchObject({
      Authorization: "Bearer test-key",
      "Content-Type": "application/json"
    });
    expect(JSON.stringify(JSON.parse(String(requests[0].init.body)))).toContain("Riskrunner");
    expect(JSON.stringify(JSON.parse(String(requests[0].init.body)))).toContain("Voltshot");
    expect(result.ai).toEqual({
      provider: "deepseek",
      model: "deepseek-chat",
      text: "这把 Riskrunner 建议保留，用于电弧场景。"
    });
  });

  it("uses a custom base URL and reports readable API errors", async () => {
    await expect(generateVaultAiAdvice({
      config: config({
        ai: {
          provider: "custom",
          api_key: "test-key",
          model: "local-model",
          base_url: "http://127.0.0.1:11434/v1"
        }
      }),
      items,
      tags,
      fetcher: async (url) => {
        expect(String(url)).toBe("http://127.0.0.1:11434/v1/chat/completions");
        return jsonResponse({ error: { message: "bad request" } }, 400);
      }
    })).rejects.toThrow("AI 接口调用失败：bad request");
  });
});

function config(overrides: Partial<D2Config>): D2Config {
  return {
    bungie: {
      api_key: "",
      client_id: "",
      client_secret: "",
      redirect_uri: "https://127.0.0.1:28780/oauth/callback"
    },
    data: {
      data_dir: "",
      manifest_language: "zh-chs"
    },
    ai: {
      provider: "",
      api_key: "",
      model: "",
      base_url: "",
      ...overrides.ai
    }
  };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json"
    }
  });
}
