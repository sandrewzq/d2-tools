import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("git-preflight verification recommendations", () => {
  it("keeps local development validation disabled and delegates checks to CI and Release", () => {
    const source = readFileSync("scripts/git-preflight.mjs", "utf8");

    expect(source).toContain("do not run automated validation");
    expect(source).toContain("GitHub CI runs build");
    expect(source).toContain("tools\\\\git-auto-release.cmd runs the full local gate");
    expect(source).not.toContain("verify:vibe:");
  });
});
