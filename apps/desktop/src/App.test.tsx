import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";

import { App } from "./App";

describe("desktop App shell", () => {
  test("renders the Tauri foundation copy", () => {
    const html = renderToStaticMarkup(<App />);

    expect(html).toContain("d2-tools");
    expect(html).toContain("Tauri 2 架构底座");
  });
});
