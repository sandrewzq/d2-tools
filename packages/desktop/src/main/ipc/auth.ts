import { ipcMain, shell } from "electron";
import { randomBytes } from "node:crypto";
import { loadConfig } from "@d2-tools/services/config/store";
import { startOAuthCallbackServer } from "@d2-tools/services/oauth/callbackServer";
import {
  buildBungieAuthorizationUrl
} from "@d2-tools/core/oauth/login";
import { exchangeBungieOAuthCode } from "@d2-tools/services/oauth/client";
import { saveOAuthToken } from "@d2-tools/services/oauth/tokenStore";

type AuthLoginResult = {
  ok: true;
  message: string;
};

let authLoginPromise: Promise<AuthLoginResult> | null = null;

export function registerAuthIpcHandlers(): void {
  ipcMain.handle("auth:login", () => {
    authLoginPromise ??= runBungieLogin().finally(() => {
      authLoginPromise = null;
    });

    return authLoginPromise;
  });
}

async function runBungieLogin(): Promise<AuthLoginResult> {
  const config = loadConfig();
  const redirectUrl = new URL(config.bungie.redirect_uri);
  const port = Number(redirectUrl.port || 80);
  const protocol = redirectUrl.protocol === "https:" ? "https" : "http";
  const state = randomBytes(16).toString("hex");
  const server = await startOAuthCallbackServer({
    host: redirectUrl.hostname,
    port,
    protocol
  }).catch((error: unknown) => {
    throw normalizeAuthLoginStartupError(error, port);
  });

  try {
    const authorizationUrl = buildBungieAuthorizationUrl({
      clientId: config.bungie.client_id,
      redirectUri: config.bungie.redirect_uri,
      state
    });
    await shell.openExternal(authorizationUrl);

    const callback = await server.waitForCallback();
    if (callback.state !== state) {
      throw new Error("Bungie 登录校验失败，请重新登录");
    }

    const token = await exchangeBungieOAuthCode({
      clientId: config.bungie.client_id,
      clientSecret: config.bungie.client_secret,
      code: callback.code,
      redirectUri: config.bungie.redirect_uri
    });
    saveOAuthToken(config.data.data_dir, token);

    return {
      ok: true,
      message: "Bungie 登录成功"
    };
  } finally {
    await server.close();
  }
}

function normalizeAuthLoginStartupError(error: unknown, port: number): Error {
  const nodeError = error as NodeJS.ErrnoException | undefined;
  const message = error instanceof Error ? error.message : String(error ?? "");

  if (nodeError?.code === "EADDRINUSE" || message.includes("EADDRINUSE")) {
    return new Error(
      `Bungie 登录回调端口 ${port} 已被占用。请关闭重复打开的 d2-tools 或占用该端口的程序后重试。`
    );
  }

  return new Error(`Bungie 登录启动失败：${message || "未知错误"}`);
}
