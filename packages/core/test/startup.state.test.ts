import { describe, expect, it } from "vitest";
import type { D2Config } from "../src/config/schema.js";
import { computeStartupState } from "../src/startup/startupState.js";

function config(overrides: Partial<D2Config["bungie"]> = {}): D2Config {
  return {
    bungie: {
      api_key: "",
      client_id: "",
      client_secret: "",
      redirect_uri: "http://127.0.0.1:28780/oauth/callback",
      ...overrides
    },
    data: {
      data_dir: "C:/Users/test/AppData/Roaming/d2-service",
      manifest_language: "zh-chs"
    },
    ai: {
      provider: "",
      api_key: "",
      model: ""
    }
  };
}

describe("startup state", () => {
  it("requires Bungie config when credentials are missing", () => {
    expect(computeStartupState({ config: config(), hasToken: false, hasManifest: false }).nextStep)
      .toBe("bungie-config");
  });

  it("requires login when Bungie config exists but token is absent", () => {
    expect(computeStartupState({
      config: config({ api_key: "api", client_id: "client", client_secret: "secret" }),
      hasToken: false,
      hasManifest: false
    }).nextStep).toBe("login");
  });

  it("allows degraded home when manifest is absent", () => {
    const state = computeStartupState({
      config: config({ api_key: "api", client_id: "client", client_secret: "secret" }),
      hasToken: true,
      hasManifest: false
    });

    expect(state.nextStep).toBe("home");
    expect(state.cards.manifest.status).toBe("missing");
  });
});
