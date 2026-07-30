import { homedir } from "node:os";
import { join } from "node:path";

export type DataDirPlatformOptions = {
  platform: NodeJS.Platform;
  env: NodeJS.ProcessEnv;
  homeDir: string;
};

export function defaultDataDir(): string {
  return defaultDataDirForPlatform({
    platform: process.platform,
    env: process.env,
    homeDir: homedir()
  });
}

export function defaultDataDirForPlatform(options: DataDirPlatformOptions): string {
  if (options.platform === "win32") {
    return join(options.env.APPDATA ?? options.homeDir, "d2-tools");
  }

  if (options.platform === "darwin") {
    return join(options.homeDir, "Library", "Application Support", "d2-tools");
  }

  return join(options.env.XDG_DATA_HOME ?? join(options.homeDir, ".local", "share"), "d2-tools");
}
