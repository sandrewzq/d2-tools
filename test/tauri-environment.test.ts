import { describe, expect, it } from "vitest";

import { summarizeTauriInfoOutput } from "../scripts/check-tauri-environment.mjs";

describe("summarizeTauriInfoOutput", () => {
  it("reports ready when WebView2, MSVC, Rust and Cargo are detected", () => {
    const summary = summarizeTauriInfoOutput(`
[✔] Environment
    ✔ WebView2: 149.0.4022.80
    ✔ MSVC: 19.44.35211
    ✔ rustc: 1.96.0
    ✔ cargo: 1.96.0
`);

    expect(summary.ready).toBe(true);
    expect(summary.missing).toEqual([]);
  });

  it("reports missing MSVC without treating installed Rust as failed", () => {
    const summary = summarizeTauriInfoOutput(`
[✘] Environment
    ✔ WebView2: 149.0.4022.80
    ✘ Couldn't detect any Visual Studio or VS Build Tools instance with MSVC and SDK components.
    ✔ rustc: 1.96.0
    ✔ cargo: 1.96.0
`);

    expect(summary.ready).toBe(false);
    expect(summary.missing).toEqual(["MSVC / Windows SDK"]);
    expect(summary.details).toContain("Rust/Cargo 已检测到");
  });

  it("handles ANSI colored tauri info output", () => {
    const summary = summarizeTauriInfoOutput(
      "\u001b[32m✔\u001b[0m WebView2: 149.0.4022.80\n" +
        "\u001b[31m✘\u001b[0m Couldn't detect any Visual Studio or VS Build Tools instance with MSVC and SDK components.\n" +
        "\u001b[32m✔\u001b[0m rustc: 1.96.0\n" +
        "\u001b[32m✔\u001b[0m cargo: 1.96.0\n"
    );

    expect(summary.ready).toBe(false);
    expect(summary.missing).toEqual(["MSVC / Windows SDK"]);
  });
});
