import { describe, expect, it } from "vitest";

import { buildReleaseNotes } from "../scripts/generate-release-notes.mjs";

describe("buildReleaseNotes", () => {
  it("describes the Tauri Windows installer and updater release shape", () => {
    const notes = buildReleaseNotes("### Added\n- 发布链路");

    expect(notes).toContain("Windows x64 NSIS 安装器");
    expect(notes).toContain("自动更新");
    expect(notes).toContain("latest.json");
    expect(notes).not.toContain("绿色包");
    expect(notes).not.toContain("7z");
    expect(notes).not.toContain("d2-service");
  });
});
