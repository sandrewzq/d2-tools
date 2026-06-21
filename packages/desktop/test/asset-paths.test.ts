import { describe, expect, it } from "vitest";
import viteConfig from "../vite.config.js";

describe("desktop Vite config", () => {
  it("uses relative asset paths for packaged file loading", () => {
    expect(viteConfig).toMatchObject({
      base: "./"
    });
  });
});
