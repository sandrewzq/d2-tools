import { describe, expect, it, vi } from "vitest";

const { createDesktopPlatformServices } = vi.hoisted(() => ({
  createDesktopPlatformServices: vi.fn(() => ({ marker: "desktop-platform" }))
}));

vi.mock("@d2-tools/platform", () => ({ createDesktopPlatformServices }));

import { createDesktopPlatform } from "./createDesktopPlatform";

describe("createDesktopPlatform", () => {
  it("creates desktop platform services from the platform package", () => {
    expect(createDesktopPlatform()).toEqual({ marker: "desktop-platform" });
    expect(createDesktopPlatformServices).toHaveBeenCalledOnce();
  });
});
