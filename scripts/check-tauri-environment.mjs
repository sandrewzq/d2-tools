#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

export function summarizeTauriInfoOutput(output) {
  const missing = [];
  const hasWebView2 = hasCheck(output, "WebView2");
  const hasRustc = hasCheck(output, "rustc");
  const hasCargo = hasCheck(output, "cargo");
  const hasMsvc =
    hasCheck(output, "MSVC") ||
    !/Couldn't detect any Visual Studio or VS Build Tools instance/i.test(output);

  if (!hasWebView2) {
    missing.push("WebView2");
  }

  if (!hasMsvc) {
    missing.push("MSVC / Windows SDK");
  }

  if (!hasRustc) {
    missing.push("rustc");
  }

  if (!hasCargo) {
    missing.push("cargo");
  }

  const details = [];
  details.push(hasRustc && hasCargo ? "Rust/Cargo 已检测到" : "Rust/Cargo 未完整检测到");
  details.push(hasMsvc ? "MSVC / Windows SDK 已检测到" : "MSVC / Windows SDK 未检测到");
  details.push(hasWebView2 ? "WebView2 已检测到" : "WebView2 未检测到");

  return {
    ready: missing.length === 0,
    missing,
    details
  };
}

function hasCheck(output, label) {
  const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?:✔|\\[✔\\]|\\bOK\\b).*${escapedLabel}`, "i").test(output);
}

function main() {
  const result = spawnSync(
    "npx pnpm@9.15.0 --filter @d2-tools/desktop tauri info",
    {
      encoding: "utf8",
      shell: true
    }
  );

  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
  if (result.error || output.trim() === "") {
    const message = result.error?.message ?? "tauri info did not return output";
    console.error(`Tauri 环境检查无法运行：${message}`);
    process.exit(1);
  }

  const summary = summarizeTauriInfoOutput(output);

  for (const line of summary.details) {
    console.log(line);
  }

  if (!summary.ready) {
    console.error(`Tauri 桌面环境未就绪：${summary.missing.join("、")}`);
    process.exit(1);
  }

  console.log("Tauri 桌面环境已就绪，可以继续验证 dev:desktop / package:desktop。");
}

const isMain = import.meta.url.startsWith("file:") && process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  main();
}
