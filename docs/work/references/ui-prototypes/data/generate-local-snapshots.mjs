import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dataDir = path.join(process.env.APPDATA ?? "", "d2-tools");
const outputDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(outputDir, "../../../../..");

function readJson(fileName, fallback) {
  const filePath = path.join(dataDir, fileName);
  if (!fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function readManifestJson(relativePath, fallback) {
  const filePath = path.join(dataDir, "manifest", relativePath);
  if (!fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function projectItem(item, location = "") {
  const plugNames = (item.socket_plugs ?? [])
    .filter((plug) => plug.name && !plug.name.startsWith("空"))
    .map((plug) => plug.name);
  const featureNames = (item.socket_plugs ?? [])
    .filter((plug) => plug.category_identifier === "frames")
    .map((plug) => plug.name);
  const perkDetails = (item.socket_plugs ?? [])
    .filter((plug) => plug.category_identifier === "frames" && plug.name)
    .map((plug) => ({ name: plug.name, icon: plug.icon || "" }));
  const armorTotal = item.armor_stats?.total;
  const meta = featureNames.length
    ? featureNames.slice(0, 2).join(" / ")
    : armorTotal !== undefined
      ? `总属性 ${armorTotal}`
      : plugNames.slice(0, 2).join(" / ") || item.tier || "当前账号物品";

  return {
    hash: item.hash,
    instanceId: item.instance_id ?? "",
    name: item.name,
    icon: item.icon,
    type: item.item_type || item.bucket_name || "物品",
    bucket: item.bucket_name || "其他",
    tier: item.tier || "",
    power: item.power ?? 0,
    quantity: item.quantity ?? null,
    locked: Boolean(item.locked),
    equipped: Boolean(item.instance?.is_equipped),
    location,
    meta,
    perks: featureNames,
    perkDetails,
    tag: "未标记"
  };
}

function slotKey(bucketName) {
  const mapping = {
    "动能武器": "kinetic",
    "能量武器": "energy",
    "威能武器": "power",
    "头盔": "helmet",
    "臂铠": "arms",
    "胸甲": "chest",
    "腿甲": "legs",
    "职业物品": "class-item",
    "职业分支": "subclass",
    "机灵": "ghost",
    "记忆水晶": "engram"
  };
  return mapping[bucketName] ?? "other";
}

function slotLabel(key) {
  const mapping = {
    kinetic: "动能武器",
    energy: "能量武器",
    power: "威能武器",
    helmet: "头盔",
    arms: "臂铠",
    chest: "胸甲",
    legs: "腿甲",
    "class-item": "职业物品",
    subclass: "职业分支",
    ghost: "机灵",
    engram: "记忆水晶",
    other: "其他"
  };
  return mapping[key] ?? key;
}

function buildSlotCategories(equippedIndexes, inventoryIndexes, items) {
  const order = [
    ["weapons", "武器", ["kinetic", "energy", "power"]],
    ["armor", "护甲", ["helmet", "arms", "chest", "legs", "class-item"]],
    ["equipment", "装备", ["subclass", "ghost"]],
    ["other", "其他", ["engram", "other"]]
  ];

  return order.map(([key, label, slots]) => ({
    key,
    label,
    rows: slots.map((slot) => ({
      key: slot,
      label: slotLabel(slot),
      equipped: equippedIndexes.filter((index) => slotKey(items[index].bucket) === slot),
      inventory: inventoryIndexes.filter((index) => slotKey(items[index].bucket) === slot)
    })).filter((row) => row.equipped.length || row.inventory.length)
  })).filter((category) => category.rows.length);
}

function formatDateLabel(version) {
  const match = String(version ?? "").match(/\.(\d{2})\.(\d{2})\.(\d{2})\./);
  return match ? `20${match[1]}/${match[2]}/${match[3]}` : "版本日期待确认";
}

function writeWindowValue(fileName, globalName, value) {
  const body = `window.${globalName} = Object.freeze(${JSON.stringify(value, null, 2)});\n`;
  fs.writeFileSync(path.join(outputDir, fileName), body, "utf8");
}

const cache = readJson("account-snapshot-cache.json", null);
if (!cache?.snapshot) {
  throw new Error(`未找到可用账号快照：${path.join(dataDir, "account-snapshot-cache.json")}`);
}

const account = cache.snapshot;
const templates = readJson("loadout-templates.json", []);
const libraryHistory = readJson("library-history.json", { recent: [], favorites: [] });
const actionLog = readJson("action-log.json", []);
const config = readJson("config.json", {});
const manifestMetadata = readManifestJson("metadata.json", {});
const manifestVersionCheck = readManifestJson("version-check.json", {});
const catalogStatus = readManifestJson("sqlite/zh-chs/active/status.json", {});
const packageJson = JSON.parse(fs.readFileSync(path.join(repoRoot, "package.json"), "utf8"));

const items = [];
const itemIndexByInstanceId = new Map();
const itemIndexByHash = new Map();
function addItem(item, location) {
  const projected = projectItem(item, location);
  const key = projected.instanceId || `${projected.hash}:${location}:${items.length}`;
  if (projected.instanceId && itemIndexByInstanceId.has(projected.instanceId)) {
    return itemIndexByInstanceId.get(projected.instanceId);
  }
  const index = items.length;
  items.push(projected);
  if (projected.instanceId) itemIndexByInstanceId.set(projected.instanceId, index);
  if (!itemIndexByHash.has(projected.hash)) itemIndexByHash.set(projected.hash, index);
  return index;
}

const characters = account.characters.map((character) => {
  const equippedIndexes = character.equipped_items.map((item) => addItem(item, `${character.class_name}已装备`));
  const inventoryIndexes = character.inventory_items.map((item) => addItem(item, `${character.class_name}背包`));
  const postmasterIndexes = character.postmaster_items.map((item) => addItem(item, `${character.class_name}邮政官`));
  return {
    id: character.character_id,
    key: character.class_name,
    className: character.class_name,
    light: character.light,
    emblemUrl: character.emblem_url,
    equippedCount: equippedIndexes.length,
    inventoryCount: inventoryIndexes.length,
    postmasterCount: postmasterIndexes.length,
    postmasterIndexes,
    slotCategories: buildSlotCategories(equippedIndexes, inventoryIndexes, items)
  };
});

const vaultIndexes = account.vault.items.map((item) => addItem(item, "仓库"));
const materialIndexes = account.materials.items.map((item) => addItem(item, "材料"));
const validGameLoadouts = account.characters.flatMap((character) =>
  character.loadout_slots
    .filter((slot) => slot.items.some((item) => item.instance_id && item.instance_id !== "0"))
    .map((slot) => ({
      id: `game-${character.character_id}-${slot.index}`,
      name: slot.name,
      characterId: character.character_id,
      className: character.class_name,
      source: `游戏内配装栏 ${slot.index + 1}`,
      game: true,
      createdAt: cache.saved_at,
      items: slot.items
        .filter((item) => item.instance_id && item.instance_id !== "0")
        .map((item) => ({
          instanceId: item.instance_id,
          name: item.name,
          bucket: item.bucket_name || "其他",
          itemIndex: itemIndexByInstanceId.get(item.instance_id) ?? null
        }))
    }))
);

const localLoadouts = templates.map((template) => ({
  id: `local-${template.id}`,
  name: template.name,
  characterId: template.character_id,
  className: template.class_name,
  source: "本地模板",
  game: false,
  createdAt: template.created_at,
  items: template.items.map((item) => ({
    instanceId: item.instance_id,
    name: item.name,
    bucket: item.bucket_name || "其他",
    itemIndex: itemIndexByInstanceId.get(item.instance_id) ?? null
  }))
}));

const loadouts = [...localLoadouts, ...validGameLoadouts].map((loadout) => ({
  ...loadout,
  availableCount: loadout.items.filter((item) => item.itemIndex !== null).length,
  missingCount: loadout.items.filter((item) => item.itemIndex === null).length
}));

const loadoutInstanceIds = new Set(loadouts.flatMap((loadout) => loadout.items.map((item) => item.instanceId)));
const duplicateGroups = [...new Map(vaultIndexes.map((index) => [items[index].hash, []])).keys()]
  .map((hash) => ({ hash, indexes: vaultIndexes.filter((index) => items[index].hash === hash) }))
  .filter((group) => group.indexes.length > 1)
  .sort((left, right) => right.indexes.length - left.indexes.length)
  .slice(0, 4);

const perkMap = new Map();
for (const item of items) {
  for (const perk of item.perkDetails) {
    const entry = perkMap.get(perk.name) ?? { name: perk.name, icon: perk.icon, description: "当前真实账号物品的已装配武器特性。", groups: "武器特性", items: [] };
    if (!entry.items.includes(item.name)) entry.items.push(item.name);
    perkMap.set(perk.name, entry);
  }
}

const libraryItems = libraryHistory.recent.slice(0, 12).map((entry) => {
  const itemIndex = itemIndexByHash.get(entry.hash);
  const currentItem = itemIndex === undefined ? null : items[itemIndex];
  return {
    hash: entry.hash,
    name: entry.name,
    icon: entry.icon,
    type: currentItem?.type ?? "Manifest 定义",
    meta: currentItem?.meta ?? `最近查看于 ${entry.viewed_at}`,
    owned: itemIndex !== undefined,
    viewedAt: entry.viewed_at
  };
});

const workspaceSnapshot = {
  generatedAt: new Date().toISOString(),
  source: "本机 account-snapshot-cache、loadout-templates、library-history 与 Manifest 状态",
  account: {
    name: account.account_name,
    membershipId: account.destiny_membership_id,
    membershipType: account.membership_type,
    savedAt: cache.saved_at,
    characterCount: characters.length,
    vaultItemCount: account.vault.item_count,
    vaultCapacity: account.vault.capacity,
    materialCount: account.materials.item_count
  },
  characters,
  items,
  vaultIndexes,
  materialIndexes,
  loadoutMatchedIndexes: items.map((item, index) => loadoutInstanceIds.has(item.instanceId) ? index : -1).filter((index) => index >= 0),
  loadouts,
  duplicateGroups,
  perks: [...perkMap.values()].slice(0, 12).map((entry) => ({ ...entry, items: entry.items.slice(0, 4).join(" / ") })),
  library: {
    status: catalogStatus.activationState === "finalized" ? "ready" : "partial",
    statusLabel: catalogStatus.activationState === "finalized" ? "完整" : "待修复",
    language: catalogStatus.language || config.data?.manifest_language || "zh-chs",
    version: catalogStatus.manifestVersion || manifestMetadata.metadata?.version || "",
    latestVersion: manifestVersionCheck.latest_version || manifestMetadata.metadata?.version || "",
    dateLabel: formatDateLabel(catalogStatus.manifestVersion || manifestMetadata.metadata?.version),
    activatedAt: catalogStatus.activatedAt || manifestMetadata.cached_at || "",
    checkedAt: manifestVersionCheck.checked_at || "",
    itemCount: catalogStatus.itemCount ?? 0,
    perkCount: catalogStatus.perkCount ?? 0,
    relationCount: catalogStatus.relationCount ?? 0,
    missingRequiredComponents: catalogStatus.supplementComponents ?? [],
    recentItems: libraryItems,
    favoriteCount: libraryHistory.favorites.length
  }
};

const settingsSnapshot = {
  generatedAt: workspaceSnapshot.generatedAt,
  menu: [
    { key: "overview", label: "概览", hint: "状态与更新" },
    { key: "language", label: "语言与外观", hint: "界面与资料库" },
    { key: "account", label: "账号", hint: "授权与写操作" },
    { key: "library", label: "资料库", hint: "版本与完整性" },
    { key: "bungie", label: "Bungie 接口", hint: "应用级接口配置" },
    { key: "ai", label: "AI 助手", hint: "可选分析能力" },
    { key: "backup", label: "数据备份与迁移", hint: "便携备份与缓存" },
    { key: "diagnostics", label: "诊断与操作日志", hint: "日志和任务" }
  ],
  message: "",
  error: "",
  appUpdate: {
    status: "unknown",
    statusLabel: "静态快照未读取更新服务",
    summary: "当前冻结快照只记录本地版本，不伪造 GitHub Release 检查结果。",
    currentVersion: packageJson.version,
    updateSource: "GitHub Release",
    lastCheckedAt: "未包含在本地快照中",
    progressPercent: 0
  },
  account: {
    status: "ready",
    statusLabel: "已读取",
    accountName: account.account_name,
    authorized: true,
    characterCount: characters.length,
    vaultItemCount: account.vault.item_count,
    vaultCapacity: account.vault.capacity,
    lastLoadedAt: cache.saved_at,
    writeActionsEnabled: Boolean(config.features?.write_actions_enabled),
    warning: "",
    error: ""
  },
  library: {
    status: workspaceSnapshot.library.status,
    statusLabel: workspaceSnapshot.library.statusLabel,
    dateLabel: workspaceSnapshot.library.dateLabel,
    version: workspaceSnapshot.library.version,
    latestVersion: workspaceSnapshot.library.latestVersion,
    cachedAt: workspaceSnapshot.library.activatedAt,
    checkedAt: workspaceSnapshot.library.checkedAt,
    missingRequiredComponents: workspaceSnapshot.library.missingRequiredComponents
  },
  bungie: {
    status: config.bungie?.api_key && config.bungie?.client_id ? "ready" : "missing",
    statusLabel: config.bungie?.api_key && config.bungie?.client_id ? "已配置" : "未配置",
    apiKeyMasked: config.bungie?.api_key ? "已配置（快照排除密钥）" : "未配置",
    clientIdMasked: config.bungie?.client_id || "未配置",
    clientSecretMasked: config.bungie?.client_secret ? "已配置（快照排除密钥）" : "未配置",
    redirectUri: config.bungie?.redirect_uri || "",
    dataDir
  },
  ai: {
    status: config.ai?.api_key ? "ready" : "missing",
    statusLabel: config.ai?.api_key ? "已配置" : "未配置",
    protocol: config.ai?.protocol || "",
    apiKeyMasked: config.ai?.api_key ? "已配置（快照排除密钥）" : "未配置",
    baseUrl: config.ai?.base_url || "",
    model: config.ai?.model || "",
    modelOptions: config.ai?.model ? [config.ai.model] : [],
    lightggSupported: config.ai?.protocol === "openai_responses",
    lightggEnabled: Boolean(config.ai?.enable_lightgg),
    forceLightgg: Boolean(config.ai?.force_lightgg)
  },
  language: {
    interfaceLocale: config.features?.interface_locale || "zh-CN",
    bungieLocale: config.data?.manifest_language || "zh-chs",
    followInterfaceLocaleForBungie: Boolean(config.features?.manifest_language_follows_interface)
  },
  backgroundTasks: [],
  backup: { dataDir },
  actionLog: actionLog.slice(0, 20).map((entry) => ({
    id: entry.id,
    createdAt: entry.created_at,
    action: entry.action,
    title: `${entry.action} · ${entry.item_name || "未命名对象"}`,
    ok: Boolean(entry.ok),
    message: entry.message
  }))
};

writeWindowValue("account-workspace-snapshot.js", "accountWorkspaceSnapshot", workspaceSnapshot);
writeWindowValue("settings-page-snapshot.js", "settingsPageSnapshot", settingsSnapshot);

console.log(`已生成账号工作区快照：${workspaceSnapshot.account.name}，${workspaceSnapshot.account.characterCount} 个角色，仓库 ${workspaceSnapshot.account.vaultItemCount}/${workspaceSnapshot.account.vaultCapacity}`);
console.log(`已生成设置快照：Manifest ${workspaceSnapshot.library.version}`);
