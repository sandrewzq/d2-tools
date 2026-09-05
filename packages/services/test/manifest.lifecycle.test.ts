import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, it } from "vitest";

const harnessPath = fileURLToPath(
  new URL("./fixtures/manifest-lifecycle-harness.mjs", import.meta.url)
);

describe("SQLite manifest lifecycle", () => {
  let scenarios: Record<string, unknown>;

  beforeAll(() => {
    scenarios = runScenario("all") as Record<string, unknown>;
  });

  it("stages supplements, retains the previous activation, and finalizes its backup", () => {
    expect(scenarios["staging-finalize"]).toEqual({
      supplementCount: 16,
      missingSupplementCount: 0,
      versionBeforeActivation: "v1",
      activeVersion: "v2",
      backupVersion: "v1",
      backupExistedBeforeFinalize: true,
      backupExistsAfterFinalize: false,
      fetchCount: 32,
      activationState: "finalized"
    });
  });

  it("restores the previous activation when the new database is rolled back", () => {
    expect(scenarios.rollback).toEqual({
      restoredVersion: "v1",
      activeVersion: "v1",
      backupExists: false
    });
  });

  it("rolls back a pending activation after a restart before runtime verification", () => {
    expect(scenarios["crash-recovery"]).toEqual({
      stateBeforeRecovery: "pending",
      backupExistedBeforeRecovery: true,
      activeVersion: "v1",
      stateAfterRecovery: "finalized",
      backupExistsAfterRecovery: false
    });
  });

  it("rejects a database missing a required SQLite table and preserves the active version", () => {
    expect(scenarios["missing-table"]).toEqual({
      error: "SQLite Manifest is missing required tables: DestinySandboxPerkDefinition",
      activeVersion: "v1"
    });
  });

  it("reuses a compatible English sidecar without downloading the English database again", () => {
    expect(scenarios["english-index-reuse"]).toEqual({
      firstDownloadCount: 2,
      secondDownloadCount: 0,
      englishIndexExists: true,
      englishSearchHashes: [3],
      disabledDownloadCount: 0,
      disabledEnglishIndex: false
    });
  });
});

function runScenario(scenario: string): unknown {
  const output = execFileSync(process.execPath, [harnessPath, scenario], {
    cwd: process.cwd(),
    encoding: "utf8",
    windowsHide: true
  });
  return JSON.parse(output);
}
