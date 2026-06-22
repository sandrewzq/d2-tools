import { ipcMain, shell } from "electron";
import { randomBytes } from "node:crypto";
import { loadConfig } from "@d2-tools/core/config/store";
import { startOAuthCallbackServer } from "@d2-tools/core/oauth/callbackServer";
import {
  buildBungieAuthorizationUrl,
  exchangeBungieOAuthCode,
  saveOAuthToken
} from "@d2-tools/core/oauth/login";

export function registerAuthIpcHandlers(): void {
  ipcMain.handle("auth:login", async () => {
    const config = loadConfig();
    const redirectUrl = new URL(config.bungie.redirect_uri);
    const port = Number(redirectUrl.port || 80);
    const protocol = redirectUrl.protocol === "https:" ? "https" : "http";
    const state = randomBytes(16).toString("hex");
    const server = await startOAuthCallbackServer({
      host: redirectUrl.hostname,
      port,
      protocol
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
  });
}
