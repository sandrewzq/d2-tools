import { describe, expect, it } from "vitest";

import { validateReleaseAssets } from "../scripts/verify-release-assets.mjs";

describe("validateReleaseAssets", () => {
  it("accepts a Windows NSIS installer with updater metadata", () => {
    expect(
      validateReleaseAssets({
        tagName: "v0.0.7",
        assets: [
          { name: "d2-tools_0.0.7_x64-setup.exe" },
          { name: "latest.json" }
        ]
      })
    ).toEqual({
      tagName: "v0.0.7",
      installer: "d2-tools_0.0.7_x64-setup.exe",
      updaterMetadata: "latest.json"
    });
  });

  it("rejects a release without latest.json", () => {
    expect(() =>
      validateReleaseAssets({
        tagName: "v0.0.7",
        assets: [{ name: "d2-tools_0.0.7_x64-setup.exe" }]
      })
    ).toThrow("Release v0.0.7 must include latest.json");
  });

  it("rejects a release without a Windows NSIS installer", () => {
    expect(() =>
      validateReleaseAssets({
        tagName: "v0.0.7",
        assets: [{ name: "latest.json" }]
      })
    ).toThrow("Release v0.0.7 must include a Windows NSIS .exe installer");
  });

  it("rejects old green package assets", () => {
    expect(() =>
      validateReleaseAssets({
        tagName: "v0.0.7",
        assets: [
          { name: "d2-tools-win32-x64.7z" },
          { name: "latest.json" }
        ]
      })
    ).toThrow("Release v0.0.7 must not publish old .7z green packages");
  });
});
