import { join } from "node:path";
import { homedir } from "node:os";
import type { D2Config } from "./schema.js";

export function defaultDataDir(): string {
  return process.env.APPDATA
    ? join(process.env.APPDATA, "d2-service")
    : join(homedir(), ".d2-service");
}

export function defaultConfig(dataDir = defaultDataDir()): D2Config {
  return {
    bungie: {
      api_key: "",
      client_id: "",
      client_secret: "",
      redirect_uri: "https://127.0.0.1:28780/oauth/callback"
    },
    data: {
      data_dir: dataDir,
      manifest_language: "zh-chs"
    },
    ai: {
      provider: "",
      api_key: "",
      model: ""
    }
  };
}
