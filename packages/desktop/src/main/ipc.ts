import { ipcMain, shell } from "electron";
import { randomBytes } from "node:crypto";
import {
  analyzeVault,
  buildBungieAuthorizationUrl,
  computeStartupState,
  exchangeBungieOAuthCode,
  fetchAccountSummary,
  generateVaultAiAdvice,
  getItemDefinitionDetail,
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
  loadVaultTags,
  saveConfig,
  saveOAuthToken,
  saveVaultTag,
  searchItemDefinitions,
  startOAuthCallbackServer,
  testAiConnection,
  type D2Config,
  type AccountItemSummary,
  type SaveVaultTagInput,
  type VaultTags
} from "@d2-service/core";

export function registerIpcHandlers(): void {
  ipcMain.handle("health:get", () => getHealth());

  ipcMain.handle("config:get", () => loadConfig());

  ipcMain.handle("config:save", (_event, config: D2Config) => {
    saveConfig(config);
    return loadConfig();
  });

  ipcMain.handle("ai:test", () => {
    const config = loadConfig();
    return testAiConnection({ config });
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

  ipcMain.handle("items:detail", (_event, hash: number) => {
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

    const detail = getItemDefinitionDetail(definitions, Number(hash), {
      plugSetDefinitions: plugSetDefinitions ?? undefined
    });
    if (!detail) {
      throw new Error("未找到物品详情");
    }

    return detail;
  });

  ipcMain.handle("vault:tags:get", () => {
    const config = loadConfig();
    return loadVaultTags(config.data.data_dir);
  });

  ipcMain.handle("vault:tag:save", (_event, input: SaveVaultTagInput) => {
    const config = loadConfig();
    return saveVaultTag(config.data.data_dir, input);
  });

  ipcMain.handle("analysis:vault", (_event, input: { items: AccountItemSummary[]; tags: VaultTags }) => {
    return analyzeVault(input);
  });

  ipcMain.handle("analysis:vault:ai", (_event, input: { items: AccountItemSummary[]; tags: VaultTags }) => {
    const config = loadConfig();
    return generateVaultAiAdvice({
      config,
      items: input.items,
      tags: input.tags
    });
  });
}
