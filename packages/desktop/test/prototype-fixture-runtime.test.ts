import { readFileSync } from "node:fs";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();

function read(path: string): string {
  return readFileSync(join(repoRoot, path), "utf8");
}

describe("prototype fixture runtime", () => {
  it("keeps large prototype fixture data out of the app entry", () => {
    const main = read("packages/prototype/src/main.tsx");
    const runtimePath = join(repoRoot, "packages", "prototype", "src", "fixtures", "usePrototypeFixtureRuntime.ts");

    expect(existsSync(runtimePath)).toBe(true);
    expect(main).toContain("usePrototypeFixtureRuntime");
    expect(main).not.toContain("const prototypeAccountSummary");
    expect(main).not.toContain("const prototypeLoadoutTemplates");
    expect(main).not.toContain("const prototypeLibraryItems");
    expect(main).not.toContain("const prototypeLibraryPerks");
    expect(main).not.toContain("function prototypeAccountItem");
  });
});

describe("web fixture runtime", () => {
  it("keeps large web fixture data out of the web app entry", () => {
    const main = read("packages/web/src/main.tsx");
    const runtimePath = join(repoRoot, "packages", "web", "src", "fixtures", "useWebFixtureRuntime.ts");

    expect(existsSync(runtimePath)).toBe(true);
    expect(main).toContain("useWebFixtureRuntime");
    expect(main).not.toContain("const webAccountSummary");
    expect(main).not.toContain("const webLoadoutTemplates");
    expect(main).not.toContain("const webLibraryItems");
    expect(main).not.toContain("const webLibraryPerks");
  });
});
