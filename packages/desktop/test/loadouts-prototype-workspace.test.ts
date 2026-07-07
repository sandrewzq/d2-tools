import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();

function read(path: string): string {
  return readFileSync(join(repoRoot, path), "utf8");
}

describe("prototype loadouts workspace wiring", () => {
  it("uses the shared loadouts page model selector instead of hand-written derived state", () => {
    const prototypeMain = read("packages/prototype/src/main.tsx");
    const prototypeFixture = read("packages/prototype/src/fixtures/usePrototypeFixtureRuntime.ts");

    expect(prototypeMain).toContain("fixture.createLoadoutsPageModel");
    expect(prototypeMain).not.toContain("selectLoadoutsPageModel");
    expect(prototypeFixture).toContain("selectLoadoutsPageModel");
    expect(prototypeMain).toContain("const loadoutsModel = useMemo");
    expect(prototypeMain).toContain("selectedEntryId: selectedLoadoutEntryId");
    expect(prototypeMain).toContain("model={loadoutsModel}");
    expect(prototypeMain).toContain("actions={{");
    expect(prototypeMain).not.toContain("getLoadoutItemStatus");
    expect(prototypeMain).not.toContain("getLoadoutItemBlockedDetails");
    expect(prototypeMain).not.toContain("findBestTemplateSourceItem");

    expect(prototypeMain).not.toContain("prototypeSelectedAnalysis");
    expect(prototypeMain).not.toContain("prototypeTransferPlan");
    expect(prototypeMain).not.toContain("prototypeLoadoutStatusSummary");
    expect(prototypeMain).not.toContain("prototypeCompareRows");
    expect(prototypeMain).not.toContain("function getPrototypeLoadoutItemStatus");
    expect(prototypeMain).not.toContain("function getPrototypeSourceItem");
    expect(prototypeMain).not.toContain("missingCount={2}");
    expect(prototypeMain).not.toContain("readyCount={3}");
    expect(prototypeMain).not.toContain("actionableCount={2}");
  });
});
