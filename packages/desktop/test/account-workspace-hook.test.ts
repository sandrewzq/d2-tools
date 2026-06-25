import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const desktopRoot = join(process.cwd(), "packages", "desktop");

describe("account workspace hook wiring", () => {
  it("imports useState from react before creating renderer state", () => {
    const source = readFileSync(
      join(desktopRoot, "src", "renderer", "features", "account", "useAccountWorkspace.ts"),
      "utf8"
    );

    expect(source).toContain('import { useState } from "react";');
    expect(source).toContain('const [loginMessage, setLoginMessage] = useState("")');
  });
});
