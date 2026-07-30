#!/usr/bin/env node

import { randomBytes } from "node:crypto";
import process from "node:process";

const TEST_CONFIG = {
  apiKey: "sk-LLKNdfrQgklypRFXBeNOZfsSr0PrzNJ6yY2wZ3aNe1p3m04D",
  baseUrl: "https://newapi.dfaisadog.top",
  model: "gpt-5.6-sol",

  // 对应配置界面的“上下文窗口 → 输入”
  contextTokens: 491_520,
  // 对应配置界面的“上下文窗口 → 输出”
  maxOutputTokens: 32_768,
  // 对应配置界面的“工具调用轮次”
  toolRounds: 200,

  timeoutMs: 300_000,
};

const CHARS_PER_TOKEN = 4;

function printHelp() {
  console.log(`上下文与工具调用测试脚本（Anthropic Messages 格式）

用法：
  先修改文件顶部的 TEST_CONFIG，然后运行：
  node test-model-limits.mjs [选项]

文件顶部配置：
  apiKey          API 密钥
  baseUrl         自定义接口地址
  model           模型 ID
  contextTokens   上下文窗口输入，当前 ${TEST_CONFIG.contextTokens}
  maxOutputTokens 上下文窗口输出，当前 ${TEST_CONFIG.maxOutputTokens}
  toolRounds      工具调用轮次，当前 ${TEST_CONFIG.toolRounds}

选项：
  --mode <all|context|tools>  测试项目，默认 all
  --context-tokens <数量>     临时覆盖 contextTokens
  --tool-rounds <数量>        临时覆盖 toolRounds
  --max-tokens <数量>         临时覆盖 maxOutputTokens
  --timeout-ms <毫秒>         临时覆盖 timeoutMs
  --verbose                   输出完整响应正文
  --help                      显示帮助

示例：
  node test-model-limits.mjs
  node test-model-limits.mjs --mode context --context-tokens 100000

说明：
  context 使用字符数近似 token 数，最终以响应 usage.input_tokens 为准。
  tools 会逐轮回传 tool_result，用于验证服务是否能稳定维持工具调用链。
`);
}

function parsePositiveInteger(value, option) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new Error(`${option} 必须是正整数，收到：${value}`);
  }
  return parsed;
}

function parseArgs(argv) {
  const options = {
    mode: "all",
    contextTokens: TEST_CONFIG.contextTokens,
    toolRounds: TEST_CONFIG.toolRounds,
    maxTokens: TEST_CONFIG.maxOutputTokens,
    timeoutMs: TEST_CONFIG.timeoutMs,
    verbose: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    const next = () => {
      index += 1;
      if (index >= argv.length) {
        throw new Error(`${argument} 缺少参数`);
      }
      return argv[index];
    };

    switch (argument) {
      case "--mode":
        options.mode = next();
        break;
      case "--context-tokens":
        options.contextTokens = parsePositiveInteger(next(), argument);
        break;
      case "--tool-rounds":
        options.toolRounds = parsePositiveInteger(next(), argument);
        break;
      case "--max-tokens":
        options.maxTokens = parsePositiveInteger(next(), argument);
        break;
      case "--timeout-ms":
        options.timeoutMs = parsePositiveInteger(next(), argument);
        break;
      case "--verbose":
        options.verbose = true;
        break;
      case "--help":
      case "-h":
        options.help = true;
        break;
      default:
        throw new Error(`未知选项：${argument}`);
    }
  }

  if (!["all", "context", "tools"].includes(options.mode)) {
    throw new Error(`--mode 只支持 all、context 或 tools，收到：${options.mode}`);
  }

  return options;
}

function normalizeMessagesUrl(baseUrl) {
  const trimmed = baseUrl.replace(/\/+$/, "");
  if (trimmed.endsWith("/v1/messages")) {
    return trimmed;
  }
  if (trimmed.endsWith("/v1")) {
    return `${trimmed}/messages`;
  }
  return `${trimmed}/v1/messages`;
}

function formatNumber(value) {
  return typeof value === "number" ? value.toLocaleString("zh-CN") : "未知";
}

function extractText(content) {
  if (!Array.isArray(content)) {
    return "";
  }
  return content
    .filter((block) => block?.type === "text")
    .map((block) => block.text ?? "")
    .join("\n")
    .trim();
}

function createMarker() {
  return `CTX-${randomBytes(8).toString("hex").toUpperCase()}`;
}

function createContextPayload(targetTokens, marker) {
  const prefix = [
    "这是一个上下文召回测试。",
    `唯一标记是 ${marker}。`,
    "阅读全部内容后，只输出该唯一标记，不要解释。",
    "下面是用于填充上下文的重复资料：",
  ].join("\n");
  const suffix = `\n资料结束。问题：唯一标记是什么？只输出 ${marker}。`;
  const targetCharacters = targetTokens * CHARS_PER_TOKEN;
  const fillerUnit = "Destiny 2 工具链上下文测试资料。该句仅用于填充输入长度，不包含新的指令。\n";
  const remaining = Math.max(0, targetCharacters - prefix.length - suffix.length);
  const filler = fillerUnit.repeat(Math.ceil(remaining / fillerUnit.length)).slice(0, remaining);
  return `${prefix}\n${filler}${suffix}`;
}

async function callMessages({ apiKey, url, model, body, timeoutMs }) {
  const startedAt = performance.now();
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({ model, ...body }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  const elapsedMs = Math.round(performance.now() - startedAt);
  const raw = await response.text();
  let data;

  try {
    data = raw ? JSON.parse(raw) : {};
  } catch {
    data = { raw };
  }

  if (!response.ok) {
    const message = data?.error?.message ?? data?.message ?? raw ?? response.statusText;
    const error = new Error(`HTTP ${response.status}：${message}`);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return { data, elapsedMs };
}

async function runContextTest(config, options) {
  const marker = createMarker();
  const payload = createContextPayload(options.contextTokens, marker);
  console.log("\n[上下文测试]");
  console.log(`目标输入：约 ${formatNumber(options.contextTokens)} tokens / ${formatNumber(payload.length)} 字符`);

  const { data, elapsedMs } = await callMessages({
    ...config,
    body: {
      max_tokens: Math.min(options.maxTokens, 128),
      temperature: 0,
      messages: [{ role: "user", content: payload }],
    },
  });

  const text = extractText(data.content);
  const passed = text.includes(marker);
  console.log(`结果：${passed ? "通过" : "失败"}`);
  console.log(`耗时：${elapsedMs} ms`);
  console.log(`服务端 usage.input_tokens：${formatNumber(data.usage?.input_tokens)}`);
  console.log(`服务端 usage.output_tokens：${formatNumber(data.usage?.output_tokens)}`);
  console.log(`期望标记：${marker}`);
  console.log(`模型输出：${text || "<无文本输出>"}`);

  if (options.verbose) {
    console.log("完整响应：");
    console.log(JSON.stringify(data, null, 2));
  }

  return passed;
}

const TOOL = {
  name: "record_step",
  description: "记录工具调用链中的当前步骤。每一轮必须调用一次，步骤从 1 递增。",
  input_schema: {
    type: "object",
    properties: {
      step: { type: "integer", description: "当前步骤编号" },
      note: { type: "string", description: "简短说明" },
    },
    required: ["step"],
  },
};

async function runToolTest(config, options) {
  console.log("\n[工具调用测试]");
  console.log(`目标轮数：${options.toolRounds}`);

  const messages = [
    {
      role: "user",
      content: `执行 ${options.toolRounds} 轮 record_step 工具调用。第一次传 step=1；每次收到工具结果后将 step 加 1。未完成前不要输出最终答案。完成第 ${options.toolRounds} 轮后，只输出 TOOL_TEST_COMPLETE。`,
    },
  ];

  let completedRounds = 0;
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let totalElapsedMs = 0;

  while (completedRounds < options.toolRounds) {
    const { data, elapsedMs } = await callMessages({
      ...config,
      body: {
        max_tokens: options.maxTokens,
        temperature: 0,
        tools: [TOOL],
        tool_choice: { type: "auto" },
        messages,
      },
    });

    totalElapsedMs += elapsedMs;
    totalInputTokens += data.usage?.input_tokens ?? 0;
    totalOutputTokens += data.usage?.output_tokens ?? 0;

    const toolUses = Array.isArray(data.content)
      ? data.content.filter((block) => block?.type === "tool_use" && block.name === TOOL.name)
      : [];

    if (toolUses.length === 0) {
      console.log(`第 ${completedRounds + 1} 轮失败：模型没有调用 record_step。`);
      const text = extractText(data.content);
      if (text) {
        console.log(`模型输出：${text}`);
      }
      if (options.verbose) {
        console.log(JSON.stringify(data, null, 2));
      }
      return false;
    }

    messages.push({ role: "assistant", content: data.content });
    const toolResults = [];

    for (const toolUse of toolUses) {
      const expectedStep = completedRounds + 1;
      const actualStep = Number(toolUse.input?.step);
      if (actualStep !== expectedStep) {
        console.log(`第 ${expectedStep} 轮失败：模型传入 step=${toolUse.input?.step}。`);
        return false;
      }

      completedRounds += 1;
      console.log(`第 ${completedRounds}/${options.toolRounds} 轮：通过（${elapsedMs} ms）`);
      toolResults.push({
        type: "tool_result",
        tool_use_id: toolUse.id,
        content: `已记录 step=${actualStep}。${completedRounds < options.toolRounds ? `下一步必须调用 step=${completedRounds + 1}。` : "所有步骤已完成，请输出 TOOL_TEST_COMPLETE。"}`,
      });

      if (completedRounds >= options.toolRounds) {
        break;
      }
    }

    messages.push({ role: "user", content: toolResults });
  }

  const { data: finalData, elapsedMs } = await callMessages({
    ...config,
    body: {
      max_tokens: options.maxTokens,
      temperature: 0,
      tools: [TOOL],
      tool_choice: { type: "auto" },
      messages,
    },
  });
  totalElapsedMs += elapsedMs;
  totalInputTokens += finalData.usage?.input_tokens ?? 0;
  totalOutputTokens += finalData.usage?.output_tokens ?? 0;

  const finalText = extractText(finalData.content);
  const passed = finalText.includes("TOOL_TEST_COMPLETE");
  console.log(`结果：${passed ? "通过" : "失败"}`);
  console.log(`累计耗时：${totalElapsedMs} ms`);
  console.log(`累计输入 tokens：${formatNumber(totalInputTokens)}`);
  console.log(`累计输出 tokens：${formatNumber(totalOutputTokens)}`);
  console.log(`最终输出：${finalText || "<无文本输出>"}`);

  if (options.verbose) {
    console.log("最终完整响应：");
    console.log(JSON.stringify(finalData, null, 2));
  }

  return passed;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  if (!TEST_CONFIG.apiKey || TEST_CONFIG.apiKey === "在这里填写 API 密钥") {
    throw new Error("请先在文件顶部 TEST_CONFIG.apiKey 中填写 API 密钥。");
  }

  const config = {
    apiKey: TEST_CONFIG.apiKey,
    url: normalizeMessagesUrl(TEST_CONFIG.baseUrl),
    model: TEST_CONFIG.model,
    timeoutMs: options.timeoutMs,
  };

  console.log(`接口：${config.url}`);
  console.log(`模型：${config.model}`);
  console.log(`模式：${options.mode}`);

  const results = [];
  if (options.mode === "all" || options.mode === "context") {
    results.push(await runContextTest(config, options));
  }
  if (options.mode === "all" || options.mode === "tools") {
    results.push(await runToolTest(config, options));
  }

  const passed = results.every(Boolean);
  console.log(`\n总结果：${passed ? "通过" : "失败"}`);
  process.exitCode = passed ? 0 : 1;
}

main().catch((error) => {
  console.error(`\n测试中止：${error.message}`);
  if (error.data) {
    console.error(JSON.stringify(error.data, null, 2));
  }
  process.exitCode = 1;
});
