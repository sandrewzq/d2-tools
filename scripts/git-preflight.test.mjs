import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("git-preflight verification recommendations", () => {
  it("recommends vibe commands for menu-private agent loops before heavier verification", () => {
    const source = readFileSync("scripts/git-preflight.mjs", "utf8");

    expect(source).toContain('account: "npx pnpm@9.15.0 verify:vibe:desktop:account"');
    expect(source).toContain('ai: "npx pnpm@9.15.0 verify:vibe:desktop:ai"');
    expect(source).toContain('loadouts: "npx pnpm@9.15.0 verify:vibe:desktop:loadouts"');
    expect(source).toContain('vault: "npx pnpm@9.15.0 verify:vibe:desktop:vault"');
    expect(source).toContain("run vibe verification first; escalate to");
  });
});
