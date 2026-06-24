import { describe, expect, it } from "vitest";

import { verifyReleasePublication } from "../scripts/verify-release-publication.mjs";

describe("verifyReleasePublication", () => {
  it("checks release assets and downloaded updater metadata together", async () => {
    const calls: string[] = [];
    const fetchImpl = async (url: string) => {
      calls.push(url);

      if (url === "https://api.github.com/repos/sandrew/d2-tools/releases/tags/v0.0.7") {
        return jsonResponse({
          tag_name: "v0.0.7",
          assets: [
            {
              name: "d2-tools_0.0.7_x64-setup.exe",
              browser_download_url:
                "https://github.com/sandrew/d2-tools/releases/download/v0.0.7/d2-tools_0.0.7_x64-setup.exe"
            },
            {
              name: "latest.json",
              browser_download_url:
                "https://github.com/sandrew/d2-tools/releases/download/v0.0.7/latest.json"
            }
          ]
        });
      }

      if (url === "https://github.com/sandrew/d2-tools/releases/download/v0.0.7/latest.json") {
        return jsonResponse({
          version: "v0.0.7",
          platforms: {
            "windows-x86_64": {
              signature: "signed-update-payload",
              url: "https://github.com/sandrew/d2-tools/releases/download/v0.0.7/d2-tools_0.0.7_x64-setup.exe"
            }
          }
        });
      }

      return jsonResponse({}, { ok: false, status: 404, statusText: "Not Found" });
    };

    await expect(
      verifyReleasePublication({
        repository: "sandrew/d2-tools",
        tagName: "v0.0.7",
        fetchImpl
      })
    ).resolves.toEqual({
      tagName: "v0.0.7",
      installer: "d2-tools_0.0.7_x64-setup.exe",
      updaterMetadata: "latest.json",
      updaterVersion: "v0.0.7",
      updaterTarget: "windows-x86_64"
    });

    expect(calls).toEqual([
      "https://api.github.com/repos/sandrew/d2-tools/releases/tags/v0.0.7",
      "https://github.com/sandrew/d2-tools/releases/download/v0.0.7/latest.json"
    ]);
  });

  it("fails when latest.json asset cannot be downloaded", async () => {
    const fetchImpl = async () =>
      jsonResponse({
        tag_name: "v0.0.7",
        assets: [
          { name: "d2-tools_0.0.7_x64-setup.exe" },
          { name: "latest.json" }
        ]
      });

    await expect(
      verifyReleasePublication({
        repository: "sandrew/d2-tools",
        tagName: "v0.0.7",
        fetchImpl
      })
    ).rejects.toThrow("Release v0.0.7 latest.json asset is missing a download URL");
  });
});

function jsonResponse(
  value: unknown,
  overrides: { ok?: boolean; status?: number; statusText?: string } = {}
) {
  return {
    ok: overrides.ok ?? true,
    status: overrides.status ?? 200,
    statusText: overrides.statusText ?? "OK",
    async json() {
      return value;
    }
  };
}
