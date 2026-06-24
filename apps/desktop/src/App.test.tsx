import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { createMockPlatformServices } from "@d2-tools/platform";

import { App } from "./App";

describe("desktop app", () => {
  it("renders the foundation dashboard", async () => {
    const platform = createMockPlatformServices({ dataDir: "D:/data/d2-tools" });
    const html = renderToStaticMarkup(<App platform={platform} />);

    expect(html).toContain("d2-tools");
    expect(html).toContain("架构底座");
  });
});
