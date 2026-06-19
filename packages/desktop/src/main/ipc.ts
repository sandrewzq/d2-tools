import { ipcMain, shell } from "electron";
import { randomBytes } from "node:crypto";
import {
  analyzeVault,
  appendActionLog,
  addFavoriteItem,
  addRecentItem,
  buildDailySummary,
  fetchDailyLiveData,
  buildDiagnosticsExport,
  buildBungieAuthorizationUrl,
  computeStartupState,
  createBatchTransferPlan,
  createItemActionPlan,
  createLoadoutTemplate,
  createLoadoutTemplateTransferPlan,
  deleteLoadoutTemplate,
  equipItem as bungieEquipItem,
  exchangeBungieOAuthCode,
  fetchAccountSummary,
  fetchCharacterActivityHistory,
  generateItemAiAdvice,
  generateVaultAiAdvice,
  getItemDefinitionDetail,
  getDefinitionStatus,
  getHealth,
  getManifestStatus,
  hasOAuthToken,
  hasRequiredBungieConfig,
  initializeDefinitionComponent,
  initializeManifestMetadata,
  loadConfig,
  loadDefinitionComponent,
  loadManifestMetadataCache,
  loadOAuthToken,
  loadActionLog,
  loadToolAuditLog,
  loadItemAliases,
  loadLibraryHistory,
  listLoadoutTemplates,
  loadVaultTags,
  refreshBungieOAuthToken,
  removeFavoriteItem,
  saveConfig,
  saveItemAlias,
  saveOAuthToken,
  saveVaultNote,
  saveVaultTag,
  searchPerkDefinitions,
  searchItemDefinitions,
  setItemLockState as bungieSetItemLockState,
  startOAuthCallbackServer,
  summarizeActivityHistory,
  testAiConnection,
  transferItem as bungieTransferItem,
  type D2Config,
  type AccountItemSummary,
  type ActionLogType,
  type CreateLoadoutTemplateInput,
  type ItemActionPlanInput,
  type ItemAliasEntry,
  type ItemAiAdviceInput,
  type LibraryHistoryItem,
  type LoadoutTemplate,
  type SaveVaultNoteInput,
  type SaveVaultTagInput,
  type StartupAuthStatus,
  type VaultTags
} from "@d2-service/core";

type ItemLockActionInput = {
  membership_type: number;
  character_id: string;
  item_id: string;
  item_name?: string;
  state: boolean;
};

type ItemEquipActionInput = {
  membership_type: number;
  character_id: string;
  item_id: string;
  item_name?: string;
};

type ItemTransferActionInput = {
  membership_type: number;
  character_id: string;
  item_id: string;
  item_reference_hash: number;
  item_name?: string;
  transfer_to_vault: boolean;
};

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

  ipcMain.handle("startup:get", async () => {
    const config = loadConfig();
    const itemDefinitionStatus = getDefinitionStatus(
      config.data.data_dir,
      "DestinyInventoryItemDefinition"
    );
    const auth = await getStartupAuthStatus(config);

    return computeStartupState({
      config,
      hasToken: hasOAuthToken(config.data.data_dir),
      auth,
      hasManifest: itemDefinitionStatus.initialized
    });
  });

  ipcMain.handle("account:summary", async () => {
    const config = loadConfig();
    const token = await loadFreshOAuthToken(config);

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
      }),
      initializeDefinitionComponent({
        dataDir: config.data.data_dir,
        language: cache.language,
        metadata: cache.metadata,
        component: "DestinyActivityDefinition"
      }),
      initializeDefinitionComponent({
        dataDir: config.data.data_dir,
        language: cache.language,
        metadata: cache.metadata,
        component: "DestinyVendorDefinition"
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
      plugSetDefinitions: plugSetDefinitions ?? undefined,
      aliases: loadItemAliases(config.data.data_dir)
    });
  });

  ipcMain.handle("items:perks:search", (_event, query: string) => {
    const config = loadConfig();
    const perkDefinitions = loadDefinitionComponent(
      config.data.data_dir,
      "DestinySandboxPerkDefinition"
    );
    const itemDefinitions = loadDefinitionComponent(
      config.data.data_dir,
      "DestinyInventoryItemDefinition"
    );

    if (!perkDefinitions) {
      throw new Error("请先初始化资料库");
    }

    return searchPerkDefinitions(perkDefinitions, query, {
      limit: 20,
      itemDefinitions: itemDefinitions ?? undefined,
      aliases: loadItemAliases(config.data.data_dir)
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

  ipcMain.handle("aliases:get", () => {
    const config = loadConfig();
    return loadItemAliases(config.data.data_dir);
  });

  ipcMain.handle("aliases:save", (_event, input: ItemAliasEntry) => {
    const config = loadConfig();
    return saveItemAlias(config.data.data_dir, input);
  });

  ipcMain.handle("library:history:get", () => {
    const config = loadConfig();
    return loadLibraryHistory(config.data.data_dir);
  });

  ipcMain.handle("library:recent:add", (_event, item: Omit<LibraryHistoryItem, "viewed_at">) => {
    const config = loadConfig();
    return addRecentItem(config.data.data_dir, item);
  });

  ipcMain.handle("library:favorite:add", (_event, item: Omit<LibraryHistoryItem, "viewed_at">) => {
    const config = loadConfig();
    return addFavoriteItem(config.data.data_dir, item);
  });

  ipcMain.handle("library:favorite:remove", (_event, hash: number) => {
    const config = loadConfig();
    return removeFavoriteItem(config.data.data_dir, Number(hash));
  });

  ipcMain.handle("loadouts:list", () => {
    const config = loadConfig();
    return listLoadoutTemplates(config.data.data_dir);
  });

  ipcMain.handle("loadouts:create", (_event, input: CreateLoadoutTemplateInput) => {
    const config = loadConfig();
    return createLoadoutTemplate(config.data.data_dir, input);
  });

  ipcMain.handle("loadouts:delete", (_event, id: string) => {
    const config = loadConfig();
    return deleteLoadoutTemplate(config.data.data_dir, id);
  });

  ipcMain.handle("loadouts:transfer-plan", (_event, input: {
    template: LoadoutTemplate;
    target_character_id: string;
    available_items: AccountItemSummary[];
    equipped_items: AccountItemSummary[];
  }) => {
    return createLoadoutTemplateTransferPlan(input);
  });

  ipcMain.handle("vault:tags:get", () => {
    const config = loadConfig();
    return loadVaultTags(config.data.data_dir);
  });

  ipcMain.handle("vault:tag:save", (_event, input: SaveVaultTagInput) => {
    const config = loadConfig();
    return saveVaultTag(config.data.data_dir, input);
  });

  ipcMain.handle("vault:note:save", (_event, input: SaveVaultNoteInput) => {
    const config = loadConfig();
    return saveVaultNote(config.data.data_dir, input);
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

  ipcMain.handle("analysis:item:ai", (_event, input: Omit<ItemAiAdviceInput, "config">) => {
    const config = loadConfig();
    return generateItemAiAdvice({
      config,
      item: input.item,
      tags: input.tags
    });
  });

  ipcMain.handle("actions:item:set-lock", async (_event, input: ItemLockActionInput) => {
    return runWriteAction({
      action: "set-lock",
      itemName: input.item_name,
      itemInstanceId: input.item_id,
      characterId: input.character_id,
      successMessage: input.state ? "装备已锁定" : "装备已解锁",
      run: async ({ config, token }) => {
        await bungieSetItemLockState({
          config,
          token,
          membershipType: input.membership_type,
          characterId: input.character_id,
          itemId: input.item_id,
          state: input.state
        });
      }
    });
  });

  ipcMain.handle("actions:item:equip", async (_event, input: ItemEquipActionInput) => {
    return runWriteAction({
      action: "equip",
      itemName: input.item_name,
      itemInstanceId: input.item_id,
      characterId: input.character_id,
      successMessage: "装备成功",
      run: async ({ config, token }) => {
        await bungieEquipItem({
          config,
          token,
          membershipType: input.membership_type,
          characterId: input.character_id,
          itemId: input.item_id
        });
      }
    });
  });

  ipcMain.handle("actions:item:transfer", async (_event, input: ItemTransferActionInput) => {
    return runWriteAction({
      action: "transfer",
      itemName: input.item_name,
      itemInstanceId: input.item_id,
      characterId: input.character_id,
      successMessage: input.transfer_to_vault ? "已移入仓库" : "已取出到角色",
      run: async ({ config, token }) => {
        await bungieTransferItem({
          config,
          token,
          membershipType: input.membership_type,
          characterId: input.character_id,
          itemId: input.item_id,
          itemReferenceHash: input.item_reference_hash,
          transferToVault: input.transfer_to_vault
        });
      }
    });
  });

  ipcMain.handle("actions:log:get", () => {
    const config = loadConfig();
    return loadActionLog(config.data.data_dir, 50);
  });

  ipcMain.handle("actions:plan:item", (_event, input: ItemActionPlanInput) => {
    return createItemActionPlan(input);
  });

  ipcMain.handle("actions:plan:batch-transfer", (_event, input: {
    character_id: string;
    transfer_to_vault: boolean;
    items: AccountItemSummary[];
  }) => {
    return createBatchTransferPlan(input);
  });

  ipcMain.handle("daily:summary", async () => {
    const config = loadConfig();
    const definitions = {
      activities: loadDefinitionComponent(config.data.data_dir, "DestinyActivityDefinition") ?? undefined,
      vendors: loadDefinitionComponent(config.data.data_dir, "DestinyVendorDefinition") ?? undefined,
      items: loadDefinitionComponent(config.data.data_dir, "DestinyInventoryItemDefinition") ?? undefined
    };
    const liveData = await fetchDailyLiveData({ config, definitions });
    return buildDailySummary(new Date(), liveData);
  });

  ipcMain.handle("activities:summary", async (_event, input: {
    membership_type: number;
    membership_id: string;
    character_ids: string[];
  }) => {
    const config = loadConfig();
    const token = await loadFreshOAuthToken(config);
    const activityDefinitions = loadDefinitionComponent(
      config.data.data_dir,
      "DestinyActivityDefinition"
    ) ?? {};
    const histories = await Promise.all(input.character_ids.map((characterId) =>
      fetchCharacterActivityHistory({
        config,
        accessToken: token.access_token,
        membershipType: input.membership_type,
        membershipId: input.membership_id,
        characterId,
        count: 20
      })
    ));

    return summarizeActivityHistory(
      histories.flatMap((history) => history.activities ?? []),
      activityDefinitions
    );
  });

  ipcMain.handle("diagnostics:export", () => {
    const config = loadConfig();
    return buildDiagnosticsExport({
      app_version: "0.0.3",
      config,
      manifest: getManifestStatus(config.data.data_dir),
      action_log: loadActionLog(config.data.data_dir, 20),
      tool_audit_log: loadToolAuditLog(config.data.data_dir, 20)
    });
  });
}

async function runWriteAction(input: {
  action: ActionLogType;
  itemName?: string;
  itemInstanceId?: string;
  characterId?: string;
  successMessage: string;
  run: (context: {
    config: D2Config;
    token: NonNullable<ReturnType<typeof loadOAuthToken>>;
  }) => Promise<void>;
}): Promise<{ ok: true; message: string }> {
  const config = loadConfig();
  if (!config.features.write_actions_enabled) {
    throw new Error("写操作未开启。请先到设置页开启装备写操作。");
  }

  const token = await loadFreshOAuthToken(config);

  try {
    await input.run({ config, token });
    appendActionLog(config.data.data_dir, {
      action: input.action,
      item_name: input.itemName,
      item_instance_id: input.itemInstanceId,
      character_id: input.characterId,
      ok: true,
      message: input.successMessage
    });
    return { ok: true, message: input.successMessage };
  } catch (error) {
    const message = normalizeWriteActionError(error);
    appendActionLog(config.data.data_dir, {
      action: input.action,
      item_name: input.itemName,
      item_instance_id: input.itemInstanceId,
      character_id: input.characterId,
      ok: false,
      message
    });
    throw new Error(message);
  }
}

async function loadFreshOAuthToken(config: D2Config): Promise<NonNullable<ReturnType<typeof loadOAuthToken>>> {
  const token = loadOAuthToken(config.data.data_dir);
  if (!token) {
    throw new Error("请先登录 Bungie");
  }
  if (!isOAuthAccessTokenExpired(token)) {
    return token;
  }
  if (!token.refresh_token) {
    throw new Error("Bungie 登录已过期，请重新登录");
  }

  try {
    const refreshed = await refreshBungieOAuthToken({
      clientId: config.bungie.client_id,
      clientSecret: config.bungie.client_secret,
      refreshToken: token.refresh_token
    });
    saveOAuthToken(config.data.data_dir, refreshed);
    return refreshed;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Bungie token 刷新失败";
    throw new Error(`${message}。请重新登录 Bungie。`);
  }
}

async function getStartupAuthStatus(config: D2Config): Promise<StartupAuthStatus> {
  if (!hasRequiredBungieConfig(config) || !hasOAuthToken(config.data.data_dir)) {
    return { status: "missing" };
  }

  try {
    await loadFreshOAuthToken(config);
    return { status: "valid" };
  } catch (error) {
    return {
      status: "invalid",
      message: error instanceof Error
        ? error.message
        : "Bungie 登录已失效，请重新登录"
    };
  }
}

function isOAuthAccessTokenExpired(token: NonNullable<ReturnType<typeof loadOAuthToken>>): boolean {
  if (!token.created_at) {
    return true;
  }

  const createdAt = Date.parse(token.created_at);
  if (!Number.isFinite(createdAt)) {
    return true;
  }

  const expiresInMs = Math.max(0, token.expires_in - 60) * 1000;
  return Date.now() >= createdAt + expiresInMs;
}

function normalizeWriteActionError(error: unknown): string {
  const message = error instanceof Error ? error.message : "Bungie 写操作失败";
  if (message.includes("DestinyItemActionForbidden") || message.includes("scope")) {
    return `${message}。请确认 Bungie App 已勾选 MoveEquipDestinyItems，然后重新登录。`;
  }

  return message;
}
