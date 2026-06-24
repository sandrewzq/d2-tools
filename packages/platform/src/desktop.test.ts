import { beforeEach, describe, expect, it, vi } from "vitest";

const { invoke } = vi.hoisted(() => ({
  invoke: vi.fn()
}));

vi.mock("@tauri-apps/api/core", () => ({ invoke }));

import { createDesktopPlatformServices } from "./desktop";

describe("desktop platform services", () => {
  beforeEach(() => {
    invoke.mockReset();
  });

  it("maps platform service calls to Tauri commands", async () => {
    const platform = createDesktopPlatformServices();

    invoke
      .mockResolvedValueOnce({ name: "d2-tools", version: "0.0.0", platform: "desktop" })
      .mockResolvedValueOnce("D:/data/d2-tools")
      .mockResolvedValueOnce("refresh-token")
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce("file-content")
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce("info:boot")
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({ available: false, version: null })
      .mockResolvedValueOnce(undefined);

    await platform.app.getInfo();
    await platform.paths.getDataDir();
    await platform.secureStore.get("token");
    await platform.secureStore.set("token", "refresh-token");
    await platform.secureStore.delete("token");
    await platform.files.readText("settings/app.json");
    await platform.files.writeText("settings/app.json", "file-content");
    await platform.logs.write("info", "boot");
    await platform.logs.export();
    await platform.external.openExternal("https://example.test");
    await platform.updates.check();
    await platform.updates.install();

    expect(invoke.mock.calls).toEqual([
      ["app_get_info"],
      ["path_get_data_dir"],
      ["secure_get", { key: "token" }],
      ["secure_set", { key: "token", value: "refresh-token" }],
      ["secure_delete", { key: "token" }],
      ["fs_read_app_file", { path: "settings/app.json" }],
      ["fs_write_app_file", { path: "settings/app.json", content: "file-content" }],
      ["log_write", { level: "info", message: "boot" }],
      ["log_export"],
      ["open_external", { url: "https://example.test" }],
      ["updates_check"],
      ["updates_install"]
    ]);
  });
});
