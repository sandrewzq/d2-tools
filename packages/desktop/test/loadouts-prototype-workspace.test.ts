import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();

function read(path: string): string {
  return readFileSync(join(repoRoot, path), "utf8");
}

describe("prototype loadouts workspace wiring", () => {
  it("uses the shared loadouts workspace instead of hand-written derived state", () => {
    const prototypeMain = read("packages/prototype/src/main.tsx");

    expect(prototypeMain).toContain("createLoadoutsPageWorkspace");
    expect(prototypeMain).toContain("const loadoutsWorkspace = useMemo");
    expect(prototypeMain).toContain("selectedTemplate={loadoutsWorkspace.selectedTemplate}");
    expect(prototypeMain).toContain("missingCount={loadoutsWorkspace.missingCount}");
    expect(prototypeMain).toContain("getLoadoutItemStatus");
    expect(prototypeMain).toContain("getLoadoutItemBlockedDetails");
    expect(prototypeMain).toContain("findBestTemplateSourceItem");

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
