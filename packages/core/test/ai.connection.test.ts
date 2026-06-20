import { describe, expect, it } from "vitest";
import { testAiConnection } from "../src/ai/chat.js";
import type { D2Config } from "../src/config/schema.js";

describe("AI connection test", () => {
  it("sends a minimal request to OpenAI Responses API", async () => {
    const requests: Array<{ url: string; body: string; headers: HeadersInit | undefined }> = [];

    const result = await testAiConnection({
      config: config({
        provider: "openai_responses",
        api_key: "key",
        model: "gpt-test",
        base_url: ""
      }),
      fetcher: async (url, init) => {
        requests.push({ url: String(url), body: String(init?.body), headers: init?.headers });
        return new Response(JSON.stringify({
          output_text: "OK"
        }), { status: 200 });
      }
    });

    expect(requests[0].url).toBe("https://api.openai.com/v1/responses");
    expect(requests[0].headers).toMatchObject({
      Authorization: "Bearer key",
      "Content-Type": "application/json"
    });
    expect(JSON.parse(requests[0].body)).toMatchObject({
      model: "gpt-test",
      input: expect.any(Array)
    });
    expect(result).toEqual({
      ok: true,
      provider: "openai_responses",
      model: "gpt-test",
      message: "AI 连接测试成功。"
    });
  });

  it("sends a minimal chat request to OpenAI Chat Completions", async () => {
    const requests: Array<{ url: string; body: string }> = [];

    const result = await testAiConnection({
      config: config({
        provider: "openai_chat",
        api_key: "key",
        model: "gpt-test",
        base_url: ""
      }),
      fetcher: async (url, init) => {
        requests.push({ url: String(url), body: String(init?.body) });
        return new Response(JSON.stringify({
          choices: [{ message: { content: "OK" } }]
        }), { status: 200 });
      }
    });

    expect(requests[0].url).toBe("https://api.openai.com/v1/chat/completions");
    expect(JSON.parse(requests[0].body)).toMatchObject({
      model: "gpt-test"
    });
    expect(result).toEqual({
      ok: true,
      provider: "openai_chat",
      model: "gpt-test",
      message: "AI 连接测试成功。"
    });
  });

  it("sends a minimal request to Anthropic Messages API", async () => {
    const requests: Array<{ url: string; body: string; headers: HeadersInit | undefined }> = [];

    const result = await testAiConnection({
      config: config({
        provider: "anthropic",
        api_key: "key",
        model: "claude-test",
        base_url: ""
      }),
      fetcher: async (url, init) => {
        requests.push({ url: String(url), body: String(init?.body), headers: init?.headers });
        return new Response(JSON.stringify({
          content: [{ type: "text", text: "OK" }]
        }), { status: 200 });
      }
    });

    expect(requests[0].url).toBe("https://api.anthropic.com/v1/messages");
    expect(requests[0].headers).toMatchObject({
      "x-api-key": "key",
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json"
    });
    expect(JSON.parse(requests[0].body)).toMatchObject({
      model: "claude-test",
      messages: expect.any(Array)
    });
    expect(result).toEqual({
      ok: true,
      provider: "anthropic",
      model: "claude-test",
      message: "AI 连接测试成功。"
    });
  });

  it("requires AI to be enabled before testing", async () => {
    await expect(testAiConnection({
      config: config({
        provider: "",
        api_key: "",
        model: "",
        base_url: ""
      }),
      fetcher: async () => new Response("{}")
    })).rejects.toThrow("请先启用 AI 提供方。");
  });
});

function config(ai: D2Config["ai"]): D2Config {
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
    ai
  };
}
