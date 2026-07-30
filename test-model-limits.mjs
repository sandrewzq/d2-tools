#!/usr/bin/env node

import { randomBytes } from "node:crypto";
import process from "node:process";

const TEST_CONFIG = {
  // 协议可选值：
  // "anthropic" = Anthropic Messages（/v1/messages）
  // "openai"    = OpenAI Chat Completions（/v1/chat/completions）
  protocol: "anthropic",

  // 接口认证与模型
  apiKey: "sk-LLKNdfrQgklypRFXBeNOZfsSr0PrzNJ6yY2wZ3aNe1p3m04D",
  // 可填写域名、以 /v1 结尾的地址，或对应协议的完整接口地址
  baseUrl: "https://newapi.dfaisadog.top",
  model: "gpt-5.6-sol",

  // OpenAI 协议的输出 token 字段可选值："max_tokens"、"max_completion_tokens"
  // 大多数兼容中转使用 max_tokens；部分新模型要求 max_completion_tokens
  openaiMaxTokensField: "max_tokens",

  // 测试模式可选值："all"、"context"、"tools"
  mode: "all",
  // 对应配置界面的“上下文窗口 → 输入”
  contextTokens: 491_520,
  // 对应配置界面的“上下文窗口 → 输出”
  maxOutputTokens: 32_768,
  // 对应配置界面的“工具调用轮次”
  toolRounds: 200,

  // 单次 HTTP 请求超时，单位毫秒
  timeoutMs: 300_000,
  // true：输出每次接口返回的完整 JSON；false：只输出测试结果摘要
  verbose: false,
};

// 仅用于构造测试文本；真实 token 数以接口返回的 usage 为准
const CHARS_PER_TOKEN = 4;

function printHelp() {
  console.log(`上下文与工具调用测试脚本

支持协议：
  anthropic  Anthropic Messages，接口为 /v1/messages
  openai     OpenAI Chat Completions，接口为 /v1/chat/completions

用法：
  修改文件顶部 TEST_CONFIG 后运行：
  node test-model-limits.mjs

脚本会输出：
  协议、实际接口、模型、测试参数、每项测试结果、请求耗时、服务端 token usage、
  工具调用逐轮进度和最终汇总。TEST_CONFIG.verbose=true 时输出完整 JSON。

命令行也可临时覆盖：
  --mode <all|context|tools>
  --context-tokens <数量>
  --tool-rounds <数量>
  --max-tokens <数量>
  --timeout-ms <毫秒>
  --verbose
  --help
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
    mode: TEST_CONFIG.mode,
    contextTokens: TEST_CONFIG.contextTokens,
    toolRounds: TEST_CONFIG.toolRounds,
    maxTokens: TEST_CONFIG.maxOutputTokens,
    timeoutMs: TEST_CONFIG.timeoutMs,
    verbose: TEST_CONFIG.verbose,
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
    throw new Error(`mode 只支持 all、context 或 tools，收到：${options.mode}`);
  }
  return options;
}

function normalizeApiUrl(baseUrl, protocol) {
  const trimmed = baseUrl.replace(/\/+$/, "");
  const endpoint = protocol === "anthropic" ? "messages" : "chat/completions";
  if (trimmed.endsWith(`/v1/${endpoint}`)) {
    return trimmed;
  }
  if (trimmed.endsWith("/v1")) {
    return `${trimmed}/${endpoint}`;
  }
  return `${trimmed}/v1/${endpoint}`;
}

function formatNumber(value) {
  return typeof value === "number" ? value.toLocaleString("zh-CN") : "未知";
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
  const fillerUnit = "上下文测试填充资料。该句不包含新指令，仅用于增加输入长度。\n";
  const remaining = Math.max(0, targetCharacters - prefix.length - suffix.length);
  const filler = fillerUnit.repeat(Math.ceil(remaining / fillerUnit.length)).slice(0, remaining);
  return `${prefix}\n${filler}${suffix}`;
}

function createHeaders(config) {
  if (config.protocol === "anthropic") {
    return {
      "content-type": "application/json",
      "x-api-key": config.apiKey,
      "anthropic-version": "2023-06-01",
    };
  }
  return {
    "content-type": "application/json",
    authorization: `Bearer ${config.apiKey}`,
  };
}

function createTools(protocol) {
  const parameters = {
    type: "object",
    properties: {
      step: { type: "integer", description: "当前步骤编号" },
      note: { type: "string", description: "简短说明" },
    },
    required: ["step"],
  };

  if (protocol === "anthropic") {
    return [{
      name: "record_step",
      description: "记录工具调用链中的当前步骤，每轮调用一次，步骤从 1 递增。",
      input_schema: parameters,
    }];
  }

  return [{
    type: "function",
    function: {
      name: "record_step",
      description: "记录工具调用链中的当前步骤，每轮调用一次，步骤从 1 递增。",
      parameters,
    },
  }];
}

function createRequestBody(config, { messages, maxTokens, tools }) {
  if (config.protocol === "anthropic") {
    return {
      model: config.model,
      max_tokens: maxTokens,
      temperature: 0,
      messages,
      ...(tools ? { tools, tool_choice: { type: "auto" } } : {}),
    };
  }

  return {
    model: config.model,
    [config.openaiMaxTokensField]: maxTokens,
    temperature: 0,
    messages,
    ...(tools ? { tools, tool_choice: "auto" } : {}),
  };
}

async function callModel(config, request) {
  const startedAt = performance.now();
  const response = await fetch(config.url, {
    method: "POST",
    headers: createHeaders(config),
    body: JSON.stringify(createRequestBody(config, request)),
    signal: AbortSignal.timeout(config.timeoutMs),
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
    error.data = data;
    throw error;
  }

  return { data, elapsedMs };
}

function getText(data, protocol) {
  if (protocol === "anthropic") {
    return Array.isArray(data.content)
      ? data.content.filter((block) => block?.type === "text").map((block) => block.text ?? "").join("\n").trim()
      : "";
  }
  const content = data.choices?.[0]?.message?.content;
  if (typeof content === "string") {
    return content.trim();
  }
  if (Array.isArray(content)) {
    return content.map((part) => part?.text ?? "").join("\n").trim();
  }
  return "";
}

function getUsage(data, protocol) {
  return protocol === "anthropic"
    ? { input: data.usage?.input_tokens, output: data.usage?.output_tokens }
    : { input: data.usage?.prompt_tokens, output: data.usage?.completion_tokens };
}

function getToolCalls(data, protocol) {
  if (protocol === "anthropic") {
    return (Array.isArray(data.content) ? data.content : [])
      .filter((block) => block?.type === "tool_use" && block.name === "record_step")
      .map((block) => ({ id: block.id, input: block.input }));
  }

  return (data.choices?.[0]?.message?.tool_calls ?? [])
    .filter((call) => call?.type === "function" && call.function?.name === "record_step")
    .map((call) => {
      let input = {};
      try {
        input = JSON.parse(call.function.arguments || "{}");
      } catch {
        input = {};
      }
      return { id: call.id, input };
    });
}

function appendAssistantMessage(messages, data, protocol) {
  if (protocol === "anthropic") {
    messages.push({ role: "assistant", content: data.content });
  } else {
    messages.push(data.choices[0].message);
  }
}

function appendToolResults(messages, calls, completedRounds, targetRounds, protocol) {
  if (protocol === "anthropic") {
    messages.push({
      role: "user",
      content: calls.map((call, index) => {
        const step = completedRounds - calls.length + index + 1;
        return {
          type: "tool_result",
          tool_use_id: call.id,
          content: step < targetRounds
            ? `已记录 step=${step}。下一步必须调用 step=${step + 1}。`
            : "所有步骤已完成，请输出 TOOL_TEST_COMPLETE。",
        };
      }),
    });
    return;
  }

  calls.forEach((call, index) => {
    const step = completedRounds - calls.length + index + 1;
    messages.push({
      role: "tool",
      tool_call_id: call.id,
      content: step < targetRounds
        ? `已记录 step=${step}。下一步必须调用 step=${step + 1}。`
        : "所有步骤已完成，请输出 TOOL_TEST_COMPLETE。",
    });
  });
}

async function runContextTest(config, options) {
  const marker = createMarker();
  const payload = createContextPayload(options.contextTokens, marker);
  console.log("\n[上下文测试]");
  console.log(`目标输入：约 ${formatNumber(options.contextTokens)} tokens / ${formatNumber(payload.length)} 字符`);

  const { data, elapsedMs } = await callModel(config, {
    maxTokens: Math.min(options.maxTokens, 128),
    messages: [{ role: "user", content: payload }],
  });
  const text = getText(data, config.protocol);
  const usage = getUsage(data, config.protocol);
  const passed = text.includes(marker);

  console.log(`结果：${passed ? "通过" : "失败"}`);
  console.log(`耗时：${elapsedMs} ms`);
  console.log(`实际输入 tokens：${formatNumber(usage.input)}`);
  console.log(`实际输出 tokens：${formatNumber(usage.output)}`);
  console.log(`期望标记：${marker}`);
  console.log(`模型输出：${text || "<无文本输出>"}`);
  if (options.verbose) console.log(JSON.stringify(data, null, 2));

  return { name: "上下文", passed, elapsedMs, inputTokens: usage.input ?? 0, outputTokens: usage.output ?? 0 };
}

async function runToolTest(config, options) {
  console.log("\n[工具调用测试]");
  console.log(`目标轮数：${options.toolRounds}`);

  const messages = [{
    role: "user",
    content: `执行 ${options.toolRounds} 轮 record_step 工具调用。第一次传 step=1；每次收到工具结果后将 step 加 1。完成前不要输出最终答案。完成第 ${options.toolRounds} 轮后只输出 TOOL_TEST_COMPLETE。`,
  }];
  const tools = createTools(config.protocol);
  let completedRounds = 0;
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let totalElapsedMs = 0;

  while (completedRounds < options.toolRounds) {
    const { data, elapsedMs } = await callModel(config, {
      maxTokens: options.maxTokens,
      messages,
      tools,
    });
    const usage = getUsage(data, config.protocol);
    totalElapsedMs += elapsedMs;
    totalInputTokens += usage.input ?? 0;
    totalOutputTokens += usage.output ?? 0;
    if (options.verbose) console.log(JSON.stringify(data, null, 2));

    const calls = getToolCalls(data, config.protocol);
    if (calls.length === 0) {
      const text = getText(data, config.protocol);
      console.log(`第 ${completedRounds + 1} 轮失败：模型没有调用 record_step。`);
      if (text) console.log(`模型输出：${text}`);
      return { name: "工具调用", passed: false, elapsedMs: totalElapsedMs, inputTokens: totalInputTokens, outputTokens: totalOutputTokens };
    }

    appendAssistantMessage(messages, data, config.protocol);
    const acceptedCalls = [];
    for (const call of calls) {
      if (completedRounds >= options.toolRounds) break;
      const expectedStep = completedRounds + 1;
      const actualStep = Number(call.input?.step);
      if (actualStep !== expectedStep) {
        console.log(`第 ${expectedStep} 轮失败：模型传入 step=${call.input?.step}。`);
        return { name: "工具调用", passed: false, elapsedMs: totalElapsedMs, inputTokens: totalInputTokens, outputTokens: totalOutputTokens };
      }
      completedRounds += 1;
      acceptedCalls.push(call);
      console.log(`第 ${completedRounds}/${options.toolRounds} 轮：通过（本次请求 ${elapsedMs} ms）`);
    }
    appendToolResults(messages, acceptedCalls, completedRounds, options.toolRounds, config.protocol);
  }

  const { data: finalData, elapsedMs } = await callModel(config, {
    maxTokens: options.maxTokens,
    messages,
    tools,
  });
  const finalUsage = getUsage(finalData, config.protocol);
  totalElapsedMs += elapsedMs;
  totalInputTokens += finalUsage.input ?? 0;
  totalOutputTokens += finalUsage.output ?? 0;
  const finalText = getText(finalData, config.protocol);
  const passed = finalText.includes("TOOL_TEST_COMPLETE");

  console.log(`结果：${passed ? "通过" : "失败"}`);
  console.log(`累计耗时：${totalElapsedMs} ms`);
  console.log(`累计输入 tokens：${formatNumber(totalInputTokens)}`);
  console.log(`累计输出 tokens：${formatNumber(totalOutputTokens)}`);
  console.log(`最终输出：${finalText || "<无文本输出>"}`);
  if (options.verbose) console.log(JSON.stringify(finalData, null, 2));

  return { name: "工具调用", passed, elapsedMs: totalElapsedMs, inputTokens: totalInputTokens, outputTokens: totalOutputTokens };
}

function printSummary(results) {
  console.log("\n[测试汇总]");
  for (const result of results) {
    console.log(`${result.name}：${result.passed ? "通过" : "失败"}；耗时 ${result.elapsedMs} ms；输入 ${formatNumber(result.inputTokens)} tokens；输出 ${formatNumber(result.outputTokens)} tokens`);
  }
  console.log(`总结果：${results.every((result) => result.passed) ? "通过" : "失败"}`);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }
  if (!["anthropic", "openai"].includes(TEST_CONFIG.protocol)) {
    throw new Error(`protocol 只支持 anthropic 或 openai，收到：${TEST_CONFIG.protocol}`);
  }
  if (!TEST_CONFIG.apiKey || TEST_CONFIG.apiKey === "在这里填写 API 密钥") {
    throw new Error("请先在文件顶部 TEST_CONFIG.apiKey 中填写 API 密钥。");
  }
  if (!["max_tokens", "max_completion_tokens"].includes(TEST_CONFIG.openaiMaxTokensField)) {
    throw new Error(`openaiMaxTokensField 只支持 max_tokens 或 max_completion_tokens。`);
  }

  const config = {
    protocol: TEST_CONFIG.protocol,
    apiKey: TEST_CONFIG.apiKey,
    url: normalizeApiUrl(TEST_CONFIG.baseUrl, TEST_CONFIG.protocol),
    model: TEST_CONFIG.model,
    openaiMaxTokensField: TEST_CONFIG.openaiMaxTokensField,
    timeoutMs: options.timeoutMs,
  };

  console.log("[测试配置]");
  console.log(`协议：${config.protocol}`);
  console.log(`接口：${config.url}`);
  console.log(`模型：${config.model}`);
  console.log(`模式：${options.mode}`);
  console.log(`目标输入：${formatNumber(options.contextTokens)} tokens`);
  console.log(`最大输出：${formatNumber(options.maxTokens)} tokens`);
  console.log(`工具轮次：${formatNumber(options.toolRounds)}`);

  const results = [];
  if (options.mode === "all" || options.mode === "context") {
    results.push(await runContextTest(config, options));
  }
  if (options.mode === "all" || options.mode === "tools") {
    results.push(await runToolTest(config, options));
  }

  printSummary(results);
  process.exitCode = results.every((result) => result.passed) ? 0 : 1;
}

main().catch((error) => {
  console.error(`\n测试中止：${error.message}`);
  if (error.data) console.error(JSON.stringify(error.data, null, 2));
  process.exitCode = 1;
});
