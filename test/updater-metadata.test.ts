import { describe, expect, it } from "vitest";

import { validateUpdaterMetadata } from "../scripts/verify-updater-metadata.mjs";

describe("validateUpdaterMetadata", () => {
  it("accepts a signed Windows x64 updater metadata file", () => {
    const result = validateUpdaterMetadata({
      version: "v0.0.7",
      notes: "发布更新",
      pub_date: "2026-06-24T12:00:00Z",
      platforms: {
        "windows-x86_64": {
          signature: "signed-update-payload",
          url: "https://github.com/sandrew/d2-tools/releases/download/v0.0.7/d2-tools_0.0.7_x64-setup.exe"
        }
      }
    });

    expect(result).toEqual({
      version: "v0.0.7",
      target: "windows-x86_64",
      url: "https://github.com/sandrew/d2-tools/releases/download/v0.0.7/d2-tools_0.0.7_x64-setup.exe"
    });
  });

  it("rejects metadata without a Windows x64 platform entry", () => {
    expect(() =>
      validateUpdaterMetadata({
        version: "0.0.7",
        platforms: {}
      })
    ).toThrow("latest.json must include platforms.windows-x86_64");
  });

  it("rejects metadata with a signature URL instead of signature content", () => {
    expect(() =>
      validateUpdaterMetadata({
        version: "0.0.7",
        platforms: {
          "windows-x86_64": {
            signature: "https://example.test/update.sig",
            url: "https://github.com/sandrew/d2-tools/releases/download/v0.0.7/d2-tools_0.0.7_x64-setup.exe"
          }
        }
      })
    ).toThrow("platforms.windows-x86_64.signature must be signature content, not a URL");
  });
});
