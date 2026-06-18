import { ipcMain, shell } from "electron";
import { randomBytes } from "node:crypto";
import {
  buildBungieAuthorizationUrl,
  computeStartupState,
  exchangeBungieOAuthCode,
  fetchAccountSummary,
  getDefinitionStatus,
  getHealth,
  getManifestStatus,
  hasOAuthToken,
  initializeDefinitionComponent,
  initializeManifestMetadata,
  loadConfig,
  loadDefinitionComponent,
  loadManifestMetadataCache,
  loadOAuthToken,
  saveConfig,
  saveOAuthToken,
  searchItemDefinitions,
  startOAuthCallbackServer,
  type D2Config
} from "@d2-service/core";

export function registerIpcHandlers(): void {
  ipcMain.handle("health:get", () => getHealth());

  ipcMain.handle("config:get", () => loadConfig());

  ipcMain.handle("config:save", (_event, config: D2Config) => {
    saveConfig(config);
    return loadConfig();
  });

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

  ipcMain.handle("startup:get", () => {
    const config = loadConfig();
    const itemDefinitionStatus = getDefinitionStatus(
      config.data.data_dir,
      "DestinyInventoryItemDefinition"
    );

    return computeStartupState({
      config,
      hasToken: hasOAuthToken(config.data.data_dir),
      hasManifest: itemDefinitionStatus.initialized
    });
  });

  ipcMain.handle("account:summary", async () => {
    const config = loadConfig();
    const token = loadOAuthToken(config.data.data_dir);
    if (!token) {
      throw new Error("请先登录 Bungie");
    }

    const itemDefinitions = loadDefinitionComponent(
      config.data.data_dir,
      "DestinyInventoryItemDefinition"
    );
    if (!itemDefinitions) {
      throw new Error("请先初始化资料库");
    }

    return fetchAccountSummary({
      config,
      token,
      itemDefinitions
    });
  });

  ipcMain.handle("manifest:status", () => {
    const config = loadConfig();
    return getManifestStatus(config.data.data_dir);
  });

  ipcMain.handle("manifest:initialize", async () => {
    const config = loadConfig();
    const status = await initializeManifestMetadata({ config });
    const cache = loadManifestMetadataCache(config.data.data_dir);
    if (!cache) {
      throw new Error("Manifest metadata cache was not created");
    }

    await Promise.all([
      initializeDefinitionComponent({
        dataDir: config.data.data_dir,
        language: cache.language,
        metadata: cache.metadata,
        component: "DestinyInventoryItemDefinition"
      }),
      initializeDefinitionComponent({
        dataDir: config.data.data_dir,
        language: cache.language,
        metadata: cache.metadata,
        component: "DestinyPlugSetDefinition"
      }),
      initializeDefinitionComponent({
        dataDir: config.data.data_dir,
        language: cache.language,
        metadata: cache.metadata,
        component: "DestinySandboxPerkDefinition"
      })
    ]);

    return status;
  });

  ipcMain.handle("items:search", (_event, query: string) => {
    const config = loadConfig();
    const definitions = loadDefinitionComponent(
      config.data.data_dir,
      "DestinyInventoryItemDefinition"
    );
    const plugSetDefinitions = loadDefinitionComponent(
      config.data.data_dir,
      "DestinyPlugSetDefinition"
    );

    if (!definitions) {
      throw new Error("请先初始化资料库");
    }

    return searchItemDefinitions(definitions, query, {
      limit: 20,
      plugSetDefinitions: plugSetDefinitions ?? undefined
    });
  });
}
