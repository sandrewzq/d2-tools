# 商人菜单仄纵向切片实施计划

> 执行规则覆盖：本文保留的测试、`Red / Green / Tidy / Verify` 和 `verify:*` 命令仅是历史计划记录，不是当前 agent 执行要求。实际开发不得据此机械新增或运行测试；统一遵守仓库根目录 `AGENTS.md`。

> **给执行 agent：** 若当前环境提供 `subagent-driven-development` 或 `executing-plans`，优先使用；没有对应 skill 时，直接按仓库规定的 Red / Green / Tidy / Verify 短循环逐项执行。仓库规则优先于技能默认路径；本计划保存在 `docs/work/backlog/`。

**目标：** 以仄为首个完整纵向切片，交付共享商人目录、真实角色库存、当前机灵 Armorer 模组影响后的装备属性、全商人搜索、服务内二级兑换库存、账号购买判断，以及与资料库共用的装备详情浮层。

**架构：** 新增专用 `VendorInventorySnapshot`，不再用面向首页摘要且会截断数据的 `DailySummaryItem[]` 驱动商人页。`packages/core` 定义并纯函数归一商人库存，`packages/services` 同时读取当前角色已装备机灵的 Armorer 模组和 Bungie 角色商人 item components，`packages/app` 生成角色范围、机灵上下文、搜索、筛选、推荐与合并 ViewModel，`packages/ui` 渲染共享内容层；Prototype 注入 mock snapshot，Desktop 通过独立 IPC 和现有账号、详情 workspace 接真实能力。

**技术栈：** TypeScript、React、Electron IPC、Bungie Destiny 2 Vendor API、Vitest、Testing Library、jsdom。

## 全局约束

- 默认只重设计商人菜单内容层；不修改 `ProductShellHost`、`ProductWorkspace`、全局 token 或无 `.vendor-*` 前缀的产品样式。
- 左侧保留分组商人目录；使用小型单色符号辅助识别，缺少可靠符号时只显示名称，不生成头像或字母占位块。
- 右侧只展示当前商人详情；宽窗口双栏，窄窗口把商人目录收进抽屉。
- 主库存与服务/兑换分开；服务放在主库存之后，以手风琴原地展开二级兑换库存。
- 主库存使用舒展的 3–4 列卡片；二级兑换库存使用共享紧凑物品格。
- 商人详情沿用 Bungie 返回的分类和顺序；推荐项在各分区内前置，其他条目不重新排序。
- 搜索与筛选作用于当前角色范围内的全部商人，并覆盖服务内部库存；结果按左侧目录顺序按商人分组。
- 账号全部模式只合并物品、roll、费用和购买资格完全一致的售卖实例。
- 商人装备属性以 Bungie 针对“当前角色 + 当前已装备机灵 Armorer 模组”返回的 Vendor item components 为真相；不得只用 Manifest 基础属性，也不得离线猜测其他模组下的精确 roll。
- 机灵模组按角色读取。角色模式显示当前角色模组；账号全部模式保留每个角色各自的模组和 roll，只有最终属性、socket、费用和购买资格完全一致时才合并。
- Bungie 没有装备变化推送。进入商人页和用户点击刷新时重新读取机灵上下文；后台刷新发现 `armorerModHash` 变化时丢弃该角色旧 Vendor 缓存并重新请求，不承诺瞬时更新。
- 推荐必须有可靠依据；卡片只显示一个最高优先级结论，优先级为“优于已有副本 > 未收藏 > 高质量售卖实例 > 通用推荐”。
- 账号不可用时只保留非个性化推荐，不伪造拥有状态或账号对比。
- 正常目录条目显示真实主库存数量；加载失败显示“加载失败”，不得显示为 `0 件`。
- 首次加载可先显示缓存；后台刷新失败时保留缓存、显示缓存时间和明确错误；从未成功加载时显示完整错误态。
- 点击普通物品或二级兑换物品都打开与资料库共用的装备详情浮层；商人售价等信息作为可选上下文条传入，不复制详情主体。
- 退出菜单只保留角色范围和选中商人；搜索、筛选、结果模式、折叠状态与滚动位置重置。
- 窄窗口目录抽屉必须有可访问名称、Esc 关闭、焦点锁定、关闭后焦点恢复和 `overscroll-behavior: contain`；分区与服务折叠按钮必须暴露 `aria-expanded` / `aria-controls`。
- 搜索框使用 `type="search"`、可见或可访问 label、稳定 `name` 和 `autocomplete="off"`；刷新、搜索结果和错误更新使用 `aria-live="polite"`，刷新容器暴露 `aria-busy`。
- 商人、物品和费用图片必须提供明确 `width` / `height`，装饰图片使用空 `alt`；首屏外图片使用 `loading="lazy"`。所有按钮都要有 hover 和 `:focus-visible` 状态。
- 不修改或整理当前无关脏文件 `packages/core/src/items/search.ts`、`packages/core/test/item.search.test.ts`。
- 新测试断言真实函数输出、role、label、回调和 ViewModel；不得新增读取生产源码匹配文案、class、变量名或 import 顺序的测试。

---

## 文件结构

- 新建 `packages/core/src/vendors/inventory.ts`：商人快照、售卖项、服务容器、费用和角色来源的领域契约与纯归一函数。
- 新建 `packages/core/test/vendors.inventory.test.ts`：仄主库存、服务库存、角色差异、机灵模组上下文和完全相同实例合并的行为测试。
- 修改 `packages/core/package.json`：导出 `@d2-tools/core/vendors/inventory`。
- 新建 `packages/services/src/vendors/liveInventory.ts`：读取公共/角色 Vendor API 和 Manifest definition，返回未截断快照。
- 新建 `packages/services/test/vendors.liveInventory.test.ts`：使用 fake fetch 验证已装备机灵模组读取、角色请求、模组变化、失败聚合和原始顺序。
- 修改 `packages/services/package.json`：导出 `@d2-tools/services/vendors/liveInventory`。
- 重写 `packages/app/src/workspaces/vendorsPage.ts`：从专用快照生成目录、角色范围、筛选结果、推荐结论和服务展开模型。
- 新建 `packages/app/test/vendorsPage.test.ts`：覆盖搜索、筛选、排序、账号合并和错误/缓存状态。
- 修改 `packages/app/src/index.ts`：导出新的商人 workspace 类型和选择器。
- 拆分 `packages/ui/src/vendors/VendorsPageContentView.tsx`：只保留页面编排和本地交互状态。
- 新建 `packages/ui/src/vendors/VendorRail.tsx`：分组目录、错误标签、窄窗口抽屉。
- 新建 `packages/ui/src/vendors/VendorToolbar.tsx`：角色范围、刷新状态、搜索框和筛选面板。
- 新建 `packages/ui/src/vendors/VendorInventorySections.tsx`：Bungie 原始分区、折叠和舒展卡片。
- 新建 `packages/ui/src/vendors/VendorServices.tsx`：服务手风琴和紧凑二级库存。
- 新建 `packages/ui/src/item-detail/SharedItemDetailDialog.tsx`：资料库和商人共同消费的详情呈现壳及可选商人上下文条。
- 修改 `packages/ui/src/index.ts`、`packages/ui/src/styles.css`、`packages/ui/src/i18n/copy.ts`：导出组件并增加 `.vendor-*`、`.shared-item-detail-*` 文案和样式。
- 新建 `packages/ui/test/vendors-page.test.tsx`：按 role/label/callback 测试目录、筛选、服务展开和详情动作。
- 新建 `packages/ui/test/shared-item-detail.test.tsx`：测试商人上下文条存在/缺省时的共享详情行为。
- 修改根 `package.json`、`pnpm-lock.yaml`、`vitest.config.ts`，新建 `packages/ui/test/setup.ts`：增加 `@testing-library/react`、`@testing-library/user-event`、`@testing-library/jest-dom`、`jsdom`，为 `packages/ui/test/**/*.test.tsx` 配置 DOM 测试环境和 matcher setup。
- 修改 `packages/prototype/src/mock/scenarios.ts`、`packages/prototype/src/fixtures/usePrototypeFixtureRuntime.ts`：提供仄正常、刷新失败、首次失败、无账号和多角色 mock。
- 新建 `packages/desktop/src/renderer/api/vendorsApi.ts`：renderer 侧专用 Vendor API 契约。
- 新建 `packages/desktop/src/main/ipc/vendors.ts`：注册 `vendors:inventory` handler。
- 修改 `packages/desktop/src/main/ipc.ts`、`packages/desktop/src/preload/preload.ts`、`packages/desktop/src/renderer/api/types.ts`：只做聚合注册和 runtime 暴露。
- 修改 `packages/desktop/src/renderer/pages/useDesktopProductShell.tsx`：加载快照、后台刷新、缓存错误、角色范围和共享详情动作接线。
- 修改 `packages/desktop/src/renderer/shared/components/ItemDetailModal.tsx`、`packages/desktop/src/renderer/pages/HomePageItemDetailModal.tsx`：改用共享详情呈现并接收可选售卖上下文。
- 重写 `packages/desktop/test/vendors-page-ui.test.tsx`：删除现有源码字符串测试，改为新模型和交互的行为测试。
- 修改 `docs/todo.md`：记录 T3 下一步为仄纵向切片。

## 接口约定

```ts
export type VendorCharacterScope =
  | { kind: "character"; characterId: string }
  | { kind: "account" };

export type VendorCharacterContext = {
  characterId: string;
  armorerModHash: number | null;
  armorerModName: string | null;
};

export type VendorDetailFailure = {
  characterId: string;
  vendorHash: number;
  message: string;
};

export type VendorCost = {
  itemHash: number;
  name: string;
  quantity: number;
  iconUrl?: string;
};

export type VendorOffer = {
  id: string;
  vendorHash: number;
  vendorItemIndex: number;
  itemHash: number;
  name: string;
  itemType: string;
  tierType: string;
  iconUrl?: string;
  characterIds: string[];
  costs: VendorCost[];
  failureIndexes: number[];
  failureMessages: string[];
  saleStatus: number;
  canPurchase: boolean;
  apiPurchasable: boolean | null;
  categoryIndex: number;
  categoryName: string;
  serviceId?: string;
  rollFingerprint: string;
};

export type VendorService = {
  id: string;
  name: string;
  description: string;
  categoryIndex: number;
  offers: VendorOffer[];
};

export type VendorInventory = {
  id: string;
  vendorHash: number;
  name: string;
  description: string;
  location?: string;
  nextRefreshAt?: string;
  characterIds: string[];
  offers: VendorOffer[];
  services: VendorService[];
};

export type VendorInventorySnapshot = {
  status: "ready" | "stale" | "error";
  fetchedAt: string;
  cachedAt?: string;
  errorMessage?: string;
  failedCharacterIds: string[];
  failedVendorDetails: VendorDetailFailure[];
  currencyBalances: Record<string, number>;
  characterContexts: Record<string, VendorCharacterContext>;
  vendors: VendorInventory[];
};
```

`apiPurchasable` 只表达 Bungie 是否允许通过 API 发起购买，不得作为游戏内购买资格或可负担状态。`canPurchase` 由 live sale 的 `saleStatus`、`failureIndexes` 和商人级 `canPurchase` 归一；`failureMessages` 使用 `DestinyVendorDefinition.failureStrings` 解析，无法解析时保留通用原因。

`rollFingerprint` 必须包含 `itemHash`、费用、`saleStatus`、购买资格以及实际读取到的 socket plug / 属性摘要。角色模式 Offer ID 为 `${vendorHash}:${vendorItemIndex}:${characterId}`；账号全部模式按 fingerprint 合并后，Offer ID 为 `${vendorHash}:${vendorItemIndex}:account:${fingerprintHash}`，避免同一售卖位置存在不同 roll 时碰撞。

`armorerModHash` 只表示请求 Vendor 数据时该角色当前装备的 Armorer 模组上下文，不直接参与 `rollFingerprint`。缓存上下文键使用 `${characterId}:${armorerModHash ?? "none"}`；模组不同但 Bungie 返回的实际 roll 完全相同时仍允许账号模式合并，模组相同但 stats / sockets 不同时不得合并。

机制依据：Bungie 当前 Armor 3.0 说明确认 Ghost Armorer 模组会改变所选护甲 archetype 的出现概率；Vendor API 的 item components 又是角色上下文数据。因此本切片只承诺显示当前模组上下文下 API 实际返回的属性，不承诺在未切换游戏内模组时预测所有可能结果：

- `https://www.bungie.net/7/en/News/Article/dev_insights_abilities_armor_preview`
- `https://github.com/Bungie-net/api/blob/master/openapi.json`
- `https://github.com/DestinyItemManager/DIM/blob/master/src/app/bungie-api/destiny2-api.ts`

服务/二级库存不得从 `DestinyVendorDefinition.services` 推断；该字段只是服务说明文本。首个仄 fixture 必须锁定 live `VendorCategories.categories[].itemIndexes`、`DestinyVendorDefinition.itemList[].displayCategoryIndex` 与 `redirectToSaleIndexes` 的真实关系，再由这组结构识别服务入口和其目标售卖项。

---

### Task 1: Red: 商人领域契约测试

**文件：**
- 新建：`packages/core/test/vendors.inventory.test.ts`

**接口：**
- 消费：上方 `VendorInventorySnapshot` 契约草案。
- 产出：锁定主库存/服务拆分、角色来源、机灵模组上下文保留和完全相同实例合并行为。

- [ ] **Step 1: 写仄主库存和服务拆分失败测试**

```ts
it("separates direct Xur offers from redirect-backed exchange services", () => {
  const snapshot = buildVendorInventorySnapshot(createXurVendorFixture());
  const xur = snapshot.vendors.find((vendor) => vendor.vendorHash === 2190858386)!;

  expect(xur.offers.map((offer) => offer.name)).toEqual(["鹰月", "炎阳护腕"]);
  expect(xur.services).toEqual([
    expect.objectContaining({
      name: "奇异装备优惠",
      offers: [expect.objectContaining({ name: "蒙特卡洛" })]
    })
  ]);
});
```

- [ ] **Step 2: 写角色合并失败测试**

```ts
it("merges only offers with identical roll, cost, and eligibility", () => {
  const snapshot = buildVendorInventorySnapshot(createMultiCharacterXurFixture());
  const offers = snapshot.vendors[0].offers.filter((offer) => offer.itemHash === 123);

  expect(offers).toHaveLength(2);
  expect(offers[0].characterIds).toEqual(["hunter", "warlock"]);
  expect(offers[1].characterIds).toEqual(["titan"]);
  expect(new Set(offers.map((offer) => offer.id)).size).toBe(2);
});
```

fixture 必须保留仄真实响应中的 `VendorCategories.categories[].itemIndexes`、definition `displayCategoryIndex` 和 `redirectToSaleIndexes`，测试不得先把服务关系预加工成 `serviceId` 后再喂给归一函数。

- [ ] **Step 3: 写机灵模组导致角色 roll 分叉测试**

```ts
it("keeps Ghost Armorer context and does not merge changed vendor rolls", () => {
  const snapshot = buildVendorInventorySnapshot(createArmorerModVariantFixture());
  const offers = snapshot.vendors[0].offers.filter((offer) => offer.itemHash === 123);

  expect(snapshot.characterContexts.hunter.armorerModName).toBe("手雷护甲师");
  expect(snapshot.characterContexts.titan.armorerModName).toBe("近战护甲师");
  expect(offers).toHaveLength(2);
  expect(new Set(offers.map((offer) => offer.rollFingerprint)).size).toBe(2);
});
```

fixture 使用同一 `vendorHash`、`vendorItemIndex` 和 `itemHash`，但提供不同的当前 Armorer 模组及 Bungie 返回的 `statSummary` / socket plugs，证明角色合并由实际 roll 决定，不由装备名称或模组名称决定。

- [ ] **Step 4: 运行测试并确认失败**

运行：`npx pnpm@9.15.0 vitest --run packages/core/test/vendors.inventory.test.ts`

预期：FAIL，提示 `buildVendorInventorySnapshot` 或模块不存在。

- [ ] **Step 5: 提交 Red**

```powershell
git add packages/core/test/vendors.inventory.test.ts
git commit -m "test: define vendor inventory domain boundary"
```

### Task 2: Green: 商人领域契约最小实现

**文件：**
- 新建：`packages/core/src/vendors/inventory.ts`
- 修改：`packages/core/package.json`

**接口：**
- 消费：Task 1 fixtures 表达的 Bungie vendor 原始输入。
- 产出：`buildVendorInventorySnapshot(input): VendorInventorySnapshot` 与上方领域类型。

- [ ] **Step 1: 定义领域类型和稳定 fingerprint**

```ts
export function createVendorOfferFingerprint(input: {
  itemHash: number;
  costs: VendorCost[];
  failureIndexes: number[];
  saleStatus: number;
  canPurchase: boolean;
  socketPlugHashes: number[];
  statSummary: Array<[number, number]>;
}): string {
  return JSON.stringify({
    itemHash: input.itemHash,
    costs: input.costs.map((cost) => [cost.itemHash, cost.quantity]).sort(([left], [right]) => left - right),
    failureIndexes: [...input.failureIndexes].sort((a, b) => a - b),
    saleStatus: input.saleStatus,
    canPurchase: input.canPurchase,
    socketPlugHashes: [...input.socketPlugHashes],
    statSummary: [...input.statSummary].sort(([left], [right]) => left - right)
  });
}
```

- [ ] **Step 2: 实现归一、服务拆分和完全相同实例合并**

实现必须保持 live `VendorCategories` 的渲染顺序和 `vendorItemIndex` 顺序，并把输入中的 `VendorCharacterContext` 原样保留到 snapshot。服务入口只通过真实 fixture 验证过的 `redirectToSaleIndexes` 及其目标 item indexes 建立；普通分区通过 `displayCategoryIndex` 映射。不得使用 `DestinyVendorDefinition.services` 或中文名称关键词猜测。

- [ ] **Step 3: 增加 core 子路径导出**

在 `packages/core/package.json` 的 `exports` 中加入：

```json
"./vendors/inventory": {
  "types": "./dist/vendors/inventory.d.ts",
  "import": "./dist/vendors/inventory.js"
}
```

- [ ] **Step 4: 运行定向测试**

运行：`npx pnpm@9.15.0 vitest --run packages/core/test/vendors.inventory.test.ts`

预期：PASS。

- [ ] **Step 5: 提交 Green**

```powershell
git add packages/core/src/vendors/inventory.ts packages/core/package.json packages/core/test/vendors.inventory.test.ts
git commit -m "feat: add vendor inventory domain model"
```

### Task 3: Red: Vendor API 服务测试

**文件：**
- 新建：`packages/services/test/vendors.liveInventory.test.ts`

**接口：**
- 消费：`fetchVendorInventorySnapshot(options)`。
- 产出：锁定已装备机灵模组识别、角色请求、模组变化、部分失败和未截断库存行为。

- [ ] **Step 1: 写全部角色请求失败测试**

```ts
it("requests vendor inventory for every account character", async () => {
  const requests: string[] = [];
  await fetchVendorInventorySnapshot(createOptions({
    characterIds: ["hunter", "titan", "warlock"],
    fetchImpl: async (url) => {
      requests.push(String(url));
      return jsonResponse(createVendorApiResponse());
    }
  }));

  expect(requests.filter((url) => /\/Vendors\/\?/.test(url))).toHaveLength(3);
  expect(requests.filter((url) => url.includes("/Vendors/2190858386/"))).toHaveLength(3);
});
```

- [ ] **Step 2: 写部分失败和完整库存失败测试**

```ts
it("returns successful character inventories and exposes failed character ids", async () => {
  const snapshot = await fetchVendorInventorySnapshot(createOptionsWithTitanFailure());

  expect(snapshot.status).toBe("ready");
  expect(snapshot.failedCharacterIds).toContain("titan");
  expect(snapshot.vendors[0].offers).toHaveLength(18);
});

it("keeps the vendor directory when Xur item components fail", async () => {
  const snapshot = await fetchVendorInventorySnapshot(createOptionsWithXurDetailFailure());

  expect(snapshot.vendors.find((vendor) => vendor.vendorHash === 2190858386)).toBeTruthy();
  expect(snapshot.failedCharacterIds).toEqual([]);
  expect(snapshot.failedVendorDetails).toEqual([
    expect.objectContaining({ characterId: "hunter", vendorHash: 2190858386 })
  ]);
});
```

同时断言列表请求包含 `CurrencyLookups`，仄详情请求单独获取 stats / sockets，并且都不包含默认无用的大组件：

```ts
const listRequest = requests.find((url) => /\/Vendors\/\?/.test(url))!;
const xurDetailRequest = requests.find((url) => url.includes("/Vendors/2190858386/"))!;

expect(listRequest).toContain("components=400,401,402,600");
expect(xurDetailRequest).toContain("components=304,305");
expect(`${listRequest},${xurDetailRequest}`).not.toMatch(
  /(?:^|,)(?:306|307|308|309|310)(?:,|$)/
);
```

- [ ] **Step 3: 写已装备机灵模组和缓存上下文测试**

fake profile 返回 `CharacterEquipment` 中已装备的 Ghost 及其 `ItemSockets`。Armorer 模组通过真实 fixture 锁定的 plug category / trait 识别，不允许匹配本地化名称。

```ts
it("reloads character vendor data when the equipped Armorer mod changes", async () => {
  const first = await fetchVendorInventorySnapshot(createOptionsWithArmorerMod("hunter", 111));
  const second = await fetchVendorInventorySnapshot(createOptionsWithArmorerMod("hunter", 222));

  expect(first.characterContexts.hunter.armorerModHash).toBe(111);
  expect(second.characterContexts.hunter.armorerModHash).toBe(222);
  expect(createVendorCacheContextKey(first.characterContexts.hunter)).not.toBe(
    createVendorCacheContextKey(second.characterContexts.hunter)
  );
  expect(second.vendors[0].offers[0].rollFingerprint).not.toBe(
    first.vendors[0].offers[0].rollFingerprint
  );
});
```

- [ ] **Step 4: 运行测试并确认失败**

运行：`npx pnpm@9.15.0 vitest --run packages/services/test/vendors.liveInventory.test.ts`

预期：FAIL，模块不存在。

- [ ] **Step 5: 提交 Red**

```powershell
git add packages/services/test/vendors.liveInventory.test.ts
git commit -m "test: define live vendor inventory service"
```

### Task 4: Green: Vendor API 服务最小实现

**文件：**
- 新建：`packages/services/src/vendors/liveInventory.ts`
- 修改：`packages/services/package.json`

**接口：**
- 消费：配置、OAuth token、角色 ID、Vendor/Item/Destination definitions 和 `fetchImpl`。
- 产出：`fetchVendorInventorySnapshot(options): Promise<VendorInventorySnapshot>`；部分失败直接写入 `failedCharacterIds`，不额外拼接临时返回类型。

- [ ] **Step 1: 实现每角色 Vendor API 请求**

```ts
const profileComponents = "205,305";
const vendorListComponents = "400,401,402,600";
const vendorDetailComponents = "304,305";
const profilePath = `/Destiny2/${membershipType}/Profile/${membershipId}/?components=${profileComponents}`;
const listPath = `/Destiny2/${membershipType}/Profile/${membershipId}/Character/${characterId}/Vendors/?components=${vendorListComponents}`;
const detailPath = `/Destiny2/${membershipType}/Profile/${membershipId}/Character/${characterId}/Vendors/${vendorHash}/?components=${vendorDetailComponents}`;
```

先从 `205 CharacterEquipment` 找到每个角色当前装备的 Ghost，再从 `305 ItemSockets` 读取已插入 plugs，并通过 Manifest 中真实 plug category / trait 判断 Armorer 模组；无法识别时输出 `armorerModHash: null`，不得用英文或中文名称猜测。随后按角色请求 Vendor 数据。

请求采用两阶段：先调用角色级 `GetVendors` 获取完整目录、分类、sales 和货币；再对仄及其真实 service / subvendor 关系涉及的 vendor hash 调用单商人 `GetVendor`，补齐 `itemComponents.stats` 与 `itemComponents.sockets`。不得假设 All Vendors 响应会返回 item components，也不得为了仄切片默认对所有商人发起详情请求。

请求失败使用 `Promise.allSettled` 聚合；至少一个角色的列表成功时返回 `ready` 并填充 `failedCharacterIds`，仄详情失败时保留目录和 sale 基础信息，但将该角色仄详情标记为失败，不得用 Manifest 基础属性冒充当前机灵上下文 roll。不得截断 vendor 或 sale item。`600 CurrencyLookups` 归一到 `currencyBalances`；单商人 `304/305` 用于实际属性与 socket fingerprint。只有真实 fixture 证明仍缺少稳定字段时，才逐项追加 `300` 或 `302`，不得默认请求 `306–310`。

- [ ] **Step 2: 调用 core 纯归一函数**

```ts
return {
  ...buildVendorInventorySnapshot({
    fetchedAt: now().toISOString(),
    characterResponses,
    characterContexts,
    definitions
  }),
  failedCharacterIds
};
```

- [ ] **Step 3: 增加 services 子路径导出**

```json
"./vendors/liveInventory": {
  "types": "./dist/vendors/liveInventory.d.ts",
  "import": "./dist/vendors/liveInventory.js"
}
```

- [ ] **Step 4: 运行定向测试**

运行：`npx pnpm@9.15.0 vitest --run packages/services/test/vendors.liveInventory.test.ts`

预期：PASS。

- [ ] **Step 5: 提交 Green**

```powershell
git add packages/services/src/vendors/liveInventory.ts packages/services/package.json packages/services/test/vendors.liveInventory.test.ts
git commit -m "feat: load complete character vendor inventories"
```

### Task 5: Red: 仄工作区边界测试

**文件：**
- 新建：`packages/app/test/vendorsPage.test.ts`

**接口：**
- 消费：`selectVendorsPageModel(input)`、`filterVendorSearchResults(model, query)`。
- 产出：锁定目录状态、角色范围、推荐、费用判断、搜索与服务定位行为。

- [ ] **Step 1: 写目录和加载失败行为测试**

```ts
it("uses item counts for ready vendors and an explicit error label for failures", () => {
  const model = selectVendorsPageModel(createVendorWorkspaceInput());

  expect(model.railSections[0].vendors[0].railMeta).toBe("12 件");
  expect(model.railSections[0].vendors[1].railMeta).toBe("加载失败");
});
```

- [ ] **Step 2: 写全商人搜索和服务路径测试**

```ts
it("searches direct and nested service offers without changing rail order", () => {
  const results = filterVendorSearchResults(selectVendorsPageModel(createVendorWorkspaceInput()), {
    query: "蒙特卡洛",
    filters: defaultVendorFilters
  });

  expect(results.groups[0].vendorName).toBe("仄");
  expect(results.groups[0].items[0].sourcePath).toBe("仄 → 奇异装备优惠");
});
```

- [ ] **Step 3: 写推荐优先级与账号降级测试**

```ts
it("shows only the highest-priority explainable recommendation", () => {
  const item = selectXurOffer(createInputWithOwnedAndUpgradeCandidate());
  expect(item.decisionLabel).toBe("优于已有副本");
});

it("removes account-only conclusions when account data is unavailable", () => {
  const item = selectXurOffer(createInputWithoutAccount());
  expect(item.decisionLabel).not.toMatch(/未收藏|已有|副本/);
});
```

- [ ] **Step 4: 写当前机灵模组上下文测试**

```ts
it("shows the active Ghost Armorer context for the selected character", () => {
  const model = selectVendorsPageModel(createInputWithArmorerContexts());

  expect(model.selectedCharacterContext).toEqual({
    characterId: "hunter",
    armorerModHash: 111,
    armorerModName: "手雷护甲师",
    label: "当前机灵：手雷护甲师"
  });
});

it("keeps per-character Armorer context in account scope", () => {
  const model = selectVendorsPageModel(createAccountScopeWithDifferentArmorerMods());

  expect(model.scopeOptions.find((option) => option.kind === "account")?.description)
    .toBe("按各角色当前机灵模组合并");
  expect(model.selectedVendor.offers).toHaveLength(2);
});
```

- [ ] **Step 5: 运行测试并确认失败**

运行：`npx pnpm@9.15.0 vitest --run packages/app/test/vendorsPage.test.ts`

预期：FAIL，现有 workspace 不接受专用快照和账号上下文。

- [ ] **Step 6: 提交 Red**

```powershell
git add packages/app/test/vendorsPage.test.ts
git commit -m "test: define Xur workspace behavior"
```

### Task 6: Green: 仄工作区最小实现

**文件：**
- 重写：`packages/app/src/workspaces/vendorsPage.ts`
- 修改：`packages/app/src/index.ts`

**接口：**
- 消费：`VendorInventorySnapshot`、`AccountSummary | null`、`VendorCharacterScope`、缓存/刷新状态。可负担判断使用 snapshot 的 `currencyBalances`；账号摘要只用于收藏、已有副本和装备比较。
- 产出：`VendorsPageWorkspace`、`selectVendorsPageModel`、`filterVendorSearchResults`。

- [ ] **Step 1: 定义页面输入和可序列化 ViewModel**

```ts
export type VendorsPageInput = {
  snapshot: VendorInventorySnapshot | null;
  account: AccountSummary | null;
  scope: VendorCharacterScope;
  selectedVendorId?: string;
  refreshState: "idle" | "refreshing" | "failed";
  refreshError?: string;
};
```

ViewModel 必须包含 `railSections`、`selectedVendor`、`scopeOptions`、`selectedCharacterContext`、`search`、`filters`、`statusBanner`；UI 不得自行解释 `0`、推荐优先级、机灵上下文或角色合并。`selectedCharacterContext` 在角色模式下输出当前 Armorer 模组名称；账号模式下输出“按各角色当前机灵模组合并”，不伪造单一账号级模组。刷新状态统一输出：

```ts
type VendorStatusBanner = {
  tone: "neutral" | "error";
  message: string;
  live: "polite";
  busy: boolean;
} | null;
```

- [ ] **Step 2: 实现账号持有量和可负担状态**

使用 `snapshot.currencyBalances[String(cost.itemHash)]` 求持有量；不得假设 `account.materials.items` 覆盖所有商人货币。每项输出：

```ts
type VendorCostView = {
  label: string;
  required: number;
  owned: number | null;
  affordable: boolean | null;
};
```

- [ ] **Step 3: 实现搜索、筛选和稳定排序**

搜索覆盖 `vendor.offers` 与 `vendor.services[].offers`；商人分组顺序来自 `railSections`，分组内先按 `decisionRank`，相同 rank 保持原 `vendorItemIndex`。

- [ ] **Step 4: 实现机灵上下文展示和角色合并规则**

角色模式从 `snapshot.characterContexts[scope.characterId]` 生成 `selectedCharacterContext`。账号模式不选定单个 `armorerModHash`，只按每个 offer 的实际 `rollFingerprint` 合并；同一售卖位置因机灵上下文返回不同 stats / sockets 时输出多条角色分支，并标明适用角色。

- [ ] **Step 5: 实现选择状态恢复规则**

workspace 只接收和返回 `selectedVendorId`、`scope`；query、filters、折叠和滚动不进入持久状态。

- [ ] **Step 6: 运行定向测试**

运行：`npx pnpm@9.15.0 vitest --run packages/app/test/vendorsPage.test.ts`

预期：PASS。

- [ ] **Step 7: 提交 Green**

```powershell
git add packages/app/src/workspaces/vendorsPage.ts packages/app/src/index.ts packages/app/test/vendorsPage.test.ts
git commit -m "feat: build Xur vendor workspace"
```

### Task 7: Red: 商人共享 UI 边界测试

**文件：**
- 修改：根 `package.json`、`pnpm-lock.yaml`、`vitest.config.ts`
- 新建：`packages/ui/test/setup.ts`
- 新建：`packages/ui/test/vendors-page.test.tsx`

**接口：**
- 消费：`VendorsPageContentView` 与 `VendorsPageActions`。
- 产出：锁定目录、搜索模式、折叠分区、服务手风琴、窄窗口入口和物品动作。

- [ ] **Step 1: 配置 DOM 行为测试环境**

增加 `@testing-library/react`、`@testing-library/user-event`、`@testing-library/jest-dom`、`jsdom`。`packages/ui/test/setup.ts` 只导入 `@testing-library/jest-dom/vitest`；Vitest 2.1.8 配置使用：

```ts
test: {
  environmentMatchGlobs: [["packages/ui/test/**/*.test.tsx", "jsdom"]],
  setupFiles: ["packages/ui/test/setup.ts"]
}
```

`setupFiles` 只注册 matcher，不创建 DOM；只有匹配 `packages/ui/test/**/*.test.tsx` 的测试切换到 jsdom。不得把全仓 Vitest 默认环境改成 jsdom。

- [ ] **Step 2: 写目录和详情工具栏行为测试**

使用 Testing Library 渲染后按 role 查询：

```ts
expect(screen.getByRole("navigation", { name: "商人列表" })).toBeTruthy();
expect(screen.getByRole("button", { name: /仄.*12 件/ })).toBeTruthy();
expect(screen.getByRole("button", { name: "刷新商人数据" })).toBeTruthy();
expect(screen.getByRole("status", { name: "商人刷新状态" })).toHaveAttribute("aria-live", "polite");
expect(screen.getByText("当前机灵：手雷护甲师")).toBeTruthy();
```

- [ ] **Step 3: 写全局搜索和服务手风琴测试**

```ts
await user.type(screen.getByRole("searchbox", { name: "搜索全部商人库存" }), "蒙特卡洛");
expect(screen.getByRole("heading", { name: "全部商人结果" })).toBeTruthy();
expect(screen.getByText("仄 → 奇异装备优惠")).toBeTruthy();

await user.click(screen.getByRole("button", { name: "展开奇异装备优惠" }));
expect(screen.getByRole("button", { name: "收起奇异装备优惠" })).toHaveAttribute("aria-expanded", "true");
expect(screen.getByRole("list", { name: "奇异装备优惠兑换库存" })).toBeTruthy();
```

- [ ] **Step 4: 写窄窗口抽屉和物品详情动作测试**

通过可注入的窄窗口状态或 `matchMedia` fixture 打开目录抽屉，断言它具有 dialog 可访问名称、Esc 可关闭、关闭后焦点返回触发按钮。不要通过读取 CSS 或 class 判断抽屉状态。

```ts
await user.click(screen.getByRole("button", { name: /查看鹰月详情/ }));
expect(actions.onOpenItem).toHaveBeenCalledWith(
  expect.objectContaining({ itemHash: expect.any(Number) }),
  expect.objectContaining({ vendorName: "仄" })
);
```

- [ ] **Step 5: 运行测试并确认失败**

运行：`npx pnpm@9.15.0 vitest --run packages/ui/test/vendors-page.test.tsx`

预期：FAIL，现有 UI 没有新角色、搜索、服务和动作边界。

- [ ] **Step 6: 提交 Red**

```powershell
git add package.json pnpm-lock.yaml vitest.config.ts packages/ui/test/setup.ts packages/ui/test/vendors-page.test.tsx
git commit -m "test: define vendor menu interactions"
```

### Task 8: Green: 商人共享 UI 最小实现

**文件：**
- 修改：`packages/ui/src/vendors/VendorsPageContentView.tsx`
- 新建：`packages/ui/src/vendors/VendorRail.tsx`
- 新建：`packages/ui/src/vendors/VendorToolbar.tsx`
- 新建：`packages/ui/src/vendors/VendorInventorySections.tsx`
- 新建：`packages/ui/src/vendors/VendorServices.tsx`
- 修改：`packages/ui/src/index.ts`
- 修改：`packages/ui/src/i18n/copy.ts`
- 修改：`packages/ui/src/styles.css`

**接口：**
- 消费：Task 6 的 `VendorsPageWorkspace`。
- 产出：共享商人内容层与 `onOpenItem(item, vendorContext)` 动作。

- [ ] **Step 1: 拆分左侧目录和窄窗口抽屉**

移除 `VendorAvatar`、`createVendorIconUrl` 和字母 SVG fallback。可靠 `symbolUrl` 存在时渲染 14–16px 单色符号，否则只渲染名称。抽屉使用语义 dialog、明确关闭按钮、Esc 关闭、焦点锁定和关闭后焦点恢复；背景内容在抽屉打开时不可交互。

- [ ] **Step 2: 实现吸顶紧凑工具栏和筛选面板**

工具栏固定包含商人名称、位置、刷新倒计时、数据时间、角色范围、当前机灵 Armorer 模组和刷新按钮。角色模式显示“当前机灵：{模组名}”，无法识别时显示“当前机灵：未检测到护甲师模组”；账号模式显示“按各角色当前机灵模组合并”。该信息只在工具栏显示，不在每张物品卡重复。

搜索框常驻，使用 `type="search"`、label、稳定 `name` 与 `autocomplete="off"`。其他筛选通过面板控制，生效条件渲染可关闭标签。刷新状态容器使用 `role="status"` / `aria-live="polite"` 和 `aria-busy`，刷新按钮只在请求开始后禁用并显示进行中状态。刷新后检测到 `armorerModHash` 变化时，通过同一 status 区域播报“已按当前机灵模组更新商人属性”。

- [ ] **Step 3: 实现主库存分区和舒展卡片**

每个 Bungie 原始分区默认展开且可独立折叠；折叠触发器使用 `<button>`、`aria-expanded` 和 `aria-controls`，内容区域使用稳定 id 与触发器关联。CSS 使用：

```css
.vendor-inventory-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 12px;
}
```

卡片只显示一个 `decisionLabel`；费用区域显示 `required / owned` 和可负担状态，不重复数据来源。

- [ ] **Step 4: 实现服务手风琴和紧凑物品格**

同一时间只展开一个服务。服务触发器使用 `<button>`、`aria-expanded` / `aria-controls`；紧凑格复用统一 `VendorOfferButton` 的 `density="compact"` 变体，不复制点击和费用逻辑。

- [ ] **Step 5: 实现搜索结果模式**

搜索生效后右侧替换为按商人分组的结果；结果数量和空状态通过 `aria-live="polite"` 更新，左侧不变。点击左侧商人调用 `onSelectVendor` 并清空 query/filters；点击服务内结果调用 `onLocateOffer`，恢复商人详情并展开对应服务。

物品、商人符号和费用图标提供显式 `width` / `height`；装饰图片使用 `alt=""`，首屏外库存图片使用 `loading="lazy"`。所有交互元素必须有 hover、active 和 `:focus-visible` 状态，长名称使用 `min-width: 0` 与两行截断防止状态 chip 错位。

- [ ] **Step 6: 运行定向测试**

运行：`npx pnpm@9.15.0 vitest --run packages/ui/test/vendors-page.test.tsx`

预期：PASS。

- [ ] **Step 7: 提交 Green**

```powershell
git add packages/ui/src/vendors packages/ui/src/index.ts packages/ui/src/i18n/copy.ts packages/ui/src/styles.css packages/ui/test/vendors-page.test.tsx
git commit -m "feat: redesign shared vendor menu"
```

### Task 9: Red: 共用装备详情测试

**文件：**
- 新建：`packages/ui/test/shared-item-detail.test.tsx`

**接口：**
- 消费：`SharedItemDetailDialog`、`VendorOfferContext`。
- 产出：锁定纯资料库详情和带商人上下文详情共用同一主体。

- [ ] **Step 1: 写无商人上下文测试**

```ts
const trigger = document.createElement("button");
trigger.textContent = "打开装备详情";
document.body.append(trigger);
trigger.focus();

render(
  <SharedItemDetailDialog
    detail={detail}
    closeLabel="关闭装备详情"
    returnFocusRef={{ current: trigger }}
    onClose={onClose}
    sections={sections}
  />
);
expect(screen.getByRole("dialog", { name: detail.name })).toBeTruthy();
expect(screen.getByRole("button", { name: "关闭装备详情" })).toBeTruthy();
expect(screen.queryByRole("region", { name: "商人售卖信息" })).toBeNull();
expect(screen.getByRole("heading", { name: detail.name })).toBeTruthy();
```

- [ ] **Step 2: 写商人上下文条测试**

```ts
render(
  <SharedItemDetailDialog
    detail={detail}
    vendorContext={{
      vendorName: "仄",
      costLabel: "41 / 97 奇异硬币",
      affordabilityLabel: "可购买",
      characterLabel: "猎人",
      refreshLabel: "距离刷新 10 小时"
    }}
    closeLabel="关闭装备详情"
    onClose={onClose}
    sections={sections}
  />
);
expect(screen.getByRole("region", { name: "商人售卖信息" })).toHaveTextContent("仄");
```

- [ ] **Step 3: 写关闭与焦点管理测试**

打开 dialog 后断言焦点进入关闭按钮；使用 Tab / Shift+Tab 时焦点保持在 dialog 内；按 Esc 后调用 `onClose`，rerender 为关闭状态后焦点回到 `returnFocusRef.current`。不得通过 class、CSS 或源码字符串判断 dialog 状态。

```ts
expect(screen.getByRole("button", { name: "关闭装备详情" })).toHaveFocus();
await user.keyboard("{Shift>}{Tab}{/Shift}");
expect(screen.getByRole("dialog", { name: detail.name })).toContainElement(document.activeElement);
await user.keyboard("{Escape}");
expect(onClose).toHaveBeenCalledOnce();
unmount();
expect(trigger).toHaveFocus();
```

- [ ] **Step 4: 运行测试并确认失败**

运行：`npx pnpm@9.15.0 vitest --run packages/ui/test/shared-item-detail.test.tsx`

预期：FAIL，共享详情呈现组件不存在。

- [ ] **Step 5: 提交 Red**

```powershell
git add packages/ui/test/shared-item-detail.test.tsx
git commit -m "test: define shared item detail presentation"
```

### Task 10: Green: 共用装备详情最小实现

**文件：**
- 新建：`packages/ui/src/item-detail/SharedItemDetailDialog.tsx`
- 修改：`packages/ui/src/index.ts`
- 修改：`packages/ui/src/styles.css`
- 修改：`packages/desktop/src/renderer/shared/components/ItemDetailModal.tsx`
- 修改：`packages/desktop/src/renderer/pages/HomePageItemDetailModal.tsx`

**接口：**
- 消费：现有 `SelectedItemDetail` 映射后的展示 props、可选 `VendorOfferContext`。
- 产出：资料库、仓库、账号、配装和商人共同使用的详情呈现。

- [ ] **Step 1: 定义与平台无关的展示 props**

```ts
export type VendorOfferContext = {
  vendorName: string;
  costLabel: string;
  affordabilityLabel: string;
  characterLabel: string;
  refreshLabel: string;
};

export type SharedItemDetailDialogProps = {
  detail: SharedItemDetailView;
  vendorContext?: VendorOfferContext;
  closeLabel: string;
  returnFocusRef?: RefObject<HTMLElement | null>;
  onClose: () => void;
  sections: ReactNode;
};
```

组件内部使用 `useId()` 生成稳定标题 id，dialog 通过 `aria-labelledby` 指向装备名称标题；打开后将焦点放到关闭按钮，Tab / Shift+Tab 不得离开 dialog，Esc 调用 `onClose`，卸载时把焦点恢复到 `returnFocusRef.current`。关闭按钮必须使用调用方提供的 `closeLabel` 作为可访问名称。

- [ ] **Step 2: 抽取详情 chrome 和商人上下文插槽**

Desktop 保留数据 hook、写操作和复杂 section 组装，只把标题、关闭、布局、焦点恢复目标和可选上下文条交给 `SharedItemDetailDialog`。不得让 `packages/ui` import Electron API 或 Desktop 类型。dialog 内容容器增加 `overscroll-behavior: contain`，避免滚动传播到底层页面。

这是共享高冲突改动。执行前先运行 `tools\git-preflight.cmd`，确认没有其他 agent 正在修改 `packages/desktop/src/renderer/shared/components/ItemDetailModal.tsx` 或 `packages/desktop/src/renderer/pages/HomePageItemDetailModal.tsx`；存在并行修改时暂停本 Task，不要自行覆盖或合并对方工作。

- [ ] **Step 3: 保持现有资料库详情行为**

`vendorContext` 缺省时现有业务行为和 section 顺序保持不变；允许为 dialog 语义、关闭按钮名称、焦点锁定、Esc 关闭和焦点恢复调整必要 DOM。商人入口只增加顶部上下文条，不改变资料库、仓库、账号和配装的详情内容。

- [ ] **Step 4: 运行定向测试**

运行：`npx pnpm@9.15.0 vitest --run packages/ui/test/shared-item-detail.test.tsx packages/desktop/test/wishlist-detail-ui.test.ts`

预期：PASS。

- [ ] **Step 5: 提交 Green**

```powershell
git add packages/ui/src/item-detail packages/ui/src/index.ts packages/ui/src/styles.css packages/ui/test/shared-item-detail.test.tsx packages/desktop/src/renderer/shared/components/ItemDetailModal.tsx packages/desktop/src/renderer/pages/HomePageItemDetailModal.tsx
git commit -m "feat: share item detail presentation with vendors"
```

### Task 11: Red: Prototype 与 Desktop 接线测试

**文件：**
- 修改：`packages/desktop/test/vendors-page-ui.test.tsx`
- 新建：`packages/desktop/test/vendors-ipc.test.ts`

**接口：**
- 消费：`VendorsApi.getVendorInventory()`、Prototype fixture、Desktop vendors menu props。
- 产出：锁定真实快照加载、缓存失败、刷新不重置状态和物品详情上下文。

- [ ] **Step 1: 删除旧商人源码字符串断言**

删除 `readFileSync` 检查商人组件 class、中文文案和源码片段的测试；保留或迁移为真实渲染、ViewModel 输出和 callback 断言。

- [ ] **Step 2: 写 IPC 返回完整仄库存测试**

```ts
it("returns the complete Xur snapshot without the daily-summary 12-item cap", async () => {
  const snapshot = await invokeRegisteredHandler("vendors:inventory");
  const xur = snapshot.vendors.find((vendor) => vendor.vendorHash === 2190858386)!;
  expect(xur.offers.length + xur.services.flatMap((service) => service.offers).length).toBeGreaterThan(12);
  expect(snapshot.failedCharacterIds).toEqual(expect.any(Array));
  expect(snapshot.failedVendorDetails).toEqual(expect.any(Array));
  expect(snapshot.currencyBalances).toEqual(expect.any(Object));
  expect(snapshot.characterContexts.hunter.armorerModHash).toBe(111);
});
```

测试 fixture 至少包含一个失败角色、一个商人详情失败、一种货币余额和一个已装备 Armorer 模组，断言 IPC 返回值保留原始 `failedCharacterIds`、`failedVendorDetails`、`currencyBalances` 与 `characterContexts`，不得在 main / preload / renderer 边界改名、截断或重建为不完整 DTO。

- [ ] **Step 3: 写刷新失败保留缓存测试**

```ts
it("keeps cached inventory visible when background refresh fails", async () => {
  const state = await runVendorRefreshCycle({ cached: readySnapshot, refresh: Promise.reject(new Error("网络失败")) });
  expect(state.snapshot).toBe(readySnapshot);
  expect(state.refreshState).toBe("failed");
  expect(state.refreshError).toBe("网络失败");
});
```

同时调用 `selectVendorsPageModel`，锁定 workspace 状态：

```ts
expect(workspace.statusBanner).toEqual({
  tone: "error",
  message: "网络失败",
  live: "polite",
  busy: false
});
```

再在 `vendors-page-ui.test.tsx` 使用该 workspace 渲染页面，断言缓存库存仍可见，刷新失败提示位于 `role="status"`、具有 `aria-live="polite"`，并且刷新结束后 `aria-busy="false"`。

- [ ] **Step 4: 写机灵模组变化使缓存失效测试**

```ts
it("replaces the cached character roll after the Armorer mod changes", async () => {
  const state = await runVendorRefreshCycle({
    cached: snapshotWithArmorerMod(111),
    refresh: Promise.resolve(snapshotWithArmorerMod(222))
  });

  expect(state.snapshot.characterContexts.hunter.armorerModHash).toBe(222);
  expect(state.snapshot.vendors[0].offers[0].rollFingerprint).toBe("roll-for-mod-222");
  expect(state.statusMessage).toBe("已按当前机灵模组更新商人属性");
});
```

- [ ] **Step 5: 运行测试并确认失败**

运行：`npx pnpm@9.15.0 vitest --run packages/desktop/test/vendors-page-ui.test.tsx packages/desktop/test/vendors-ipc.test.ts`

预期：FAIL，专用 API 和新 props 尚未接线。

- [ ] **Step 6: 提交 Red**

```powershell
git add packages/desktop/test/vendors-page-ui.test.tsx packages/desktop/test/vendors-ipc.test.ts
git commit -m "test: define vendor platform wiring"
```

### Task 12: Green: Prototype 与 Desktop 接线最小实现

**文件：**
- 修改：`packages/prototype/src/mock/scenarios.ts`
- 修改：`packages/prototype/src/fixtures/usePrototypeFixtureRuntime.ts`
- 新建：`packages/desktop/src/renderer/api/vendorsApi.ts`
- 新建：`packages/desktop/src/main/ipc/vendors.ts`
- 修改：`packages/desktop/src/main/ipc.ts`
- 修改：`packages/desktop/src/preload/preload.ts`
- 修改：`packages/desktop/src/renderer/api/types.ts`
- 修改：`packages/desktop/src/renderer/features/vendors/VendorsPage.tsx`
- 修改：`packages/desktop/src/renderer/pages/useDesktopProductShell.tsx`
- 修改：`packages/desktop/test/vendors-page-ui.test.tsx`
- 修改：`packages/desktop/test/vendors-ipc.test.ts`

**接口：**
- 消费：Task 4 live service、Task 6 workspace、Task 8 UI、Task 10 共用详情。
- 产出：Prototype 状态矩阵和 Desktop 真实仄纵向切片。

- [ ] **Step 1: 新增 renderer Vendor API 契约**

```ts
export type VendorsApi = {
  getVendorInventory(): Promise<VendorInventorySnapshot>;
};
```

只在 `api/types.ts` 聚合 `VendorsApi`；`api/client.ts` 不增加 DTO。main IPC、preload 与 renderer 必须原样传递完整 `VendorInventorySnapshot`，包括 `failedCharacterIds`、`failedVendorDetails`、`currencyBalances`、`characterContexts`、offer 的 `failureMessages`、`saleStatus`、`canPurchase` 和 `apiPurchasable`。

- [ ] **Step 2: 注册独立 IPC handler**

`registerVendorIpcHandlers()` 加载配置、token、角色、当前装备与 definitions，调用 `fetchVendorInventorySnapshot`。`ipc.ts` 只 import 并注册，不包含业务逻辑。

- [ ] **Step 3: 接入 Desktop 缓存优先刷新状态**

新增菜单私有 hook `packages/desktop/src/renderer/features/vendors/useVendorsWorkspace.ts`，负责：进入页面时请求、手动刷新、保留最后成功 snapshot、后台刷新、错误状态、选中商人和角色范围。缓存按 `${characterId}:${armorerModHash ?? "none"}` 隔离；新 snapshot 的上下文键变化时不得继续复用该角色旧 offers。`useDesktopProductShell.tsx` 只组合 hook 输出，避免继续膨胀。

不增加高频轮询。页面不可见时不刷新；重新进入商人页或用户点击刷新时必须重新读取 profile equipment 和 Vendor 数据。现有后台刷新触发时同样先比较机灵上下文，再决定是否复用缓存。

- [ ] **Step 4: 接入全局详情动作**

`VendorsPageActions.onOpenItem` 调用现有 `itemDetail.openItemDetail`，并把 `VendorOfferContext` 保存到 item detail workspace；关闭浮层时只清空详情上下文，不改商人、服务展开和滚动状态。

- [ ] **Step 5: 增加 Prototype 场景**

至少提供：正常仄库存、后台刷新失败保留缓存、首次加载失败、无账号推荐降级、多角色存在差异、同一角色从 Armorer 模组 A 切换到 B 后 Vendor 属性改变。Prototype 使用与 Desktop 相同 `VendorsPageContentView`，不得复制页面结构。

- [ ] **Step 6: 运行定向测试**

运行：`npx pnpm@9.15.0 vitest --run packages/desktop/test/vendors-page-ui.test.tsx packages/desktop/test/vendors-ipc.test.ts`

预期：PASS。

- [ ] **Step 7: 提交 Green**

```powershell
git add packages/prototype/src packages/desktop/src/main/ipc/vendors.ts packages/desktop/src/main/ipc.ts packages/desktop/src/preload/preload.ts packages/desktop/src/renderer/api/vendorsApi.ts packages/desktop/src/renderer/api/types.ts packages/desktop/src/renderer/features/vendors packages/desktop/src/renderer/pages/useDesktopProductShell.tsx packages/desktop/test/vendors-page-ui.test.tsx packages/desktop/test/vendors-ipc.test.ts
git commit -m "feat: connect Xur vendor slice across platforms"
```

### Task 13: Tidy: 商人切片整理

**文件：**
- 修改：本计划涉及的商人、详情和接线文件。
- 修改：`docs/todo.md`

**接口：**
- 消费：前述全部已通过行为测试的实现。
- 产出：无重复 DTO、无旧头像 fallback、无读取状态语义、无机械 diff 问题。

- [ ] **Step 1: 删除旧模型和旧 UI 残留**

移除 `VendorInventoryStatus = "owned" | "recommended" | "unknown"`、`not_read`、`库存已读取`、`VendorAvatar`、`createVendorIconUrl`、重复 evidence panel 和每张卡片的 source 文案。

- [ ] **Step 2: 收口类型导出**

确认领域 DTO 只从 `@d2-tools/core/vendors/inventory` 导出；app 只导出 ViewModel；renderer API 不复制 core DTO 定义。整理时不得删除或折叠 `failureMessages`、`saleStatus`、`canPurchase`、`apiPurchasable`、`failedCharacterIds`、`failedVendorDetails`、`currencyBalances`、`characterContexts`，这些字段分别承载购买状态、角色列表失败、商人详情失败、真实货币余额和当前机灵模组语义。

- [ ] **Step 3: 更新 todo 状态**

仄切片完成后把 T3 下一步改为人工视觉复核和推广到其他商人；未完成时只记录当前真实进度，不提前标记完成。

- [ ] **Step 4: 运行机械检查**

运行：`git diff --check`

预期：无输出，退出码 0。

- [ ] **Step 5: 提交 Tidy**

```powershell
git add packages/core packages/services packages/app packages/ui packages/prototype packages/desktop docs/todo.md
git commit -m "refactor: tidy vendor menu boundaries"
```

提交前必须先运行 `tools\git-preflight.cmd`；若仍存在无关 lane，禁止使用上面的宽路径 `git add`，改为逐文件暂存本切片文件。

### Task 14: Verify: 商人切片验证

**文件：**
- 不修改实现文件。

**接口：**
- 消费：完成的仄纵向切片。
- 产出：共享 UI、Desktop 接线和视觉验收证据。

- [ ] **Step 1: 运行商人领域定向测试**

```powershell
npx pnpm@9.15.0 vitest --run packages/core/test/vendors.inventory.test.ts packages/services/test/vendors.liveInventory.test.ts packages/app/test/vendorsPage.test.ts packages/ui/test/vendors-page.test.tsx packages/ui/test/shared-item-detail.test.tsx packages/desktop/test/vendors-page-ui.test.tsx packages/desktop/test/vendors-ipc.test.ts
```

预期：全部 PASS。

- [ ] **Step 2: 运行唯一主 UI 门禁**

运行：`npx pnpm@9.15.0 verify:ui`

预期：`typecheck:ui` 与 `test:ui` PASS。若同一代码状态之前已运行 `verify:vibe:ui`，改跑 `npx pnpm@9.15.0 verify:finish:ui`。

- [ ] **Step 3: 运行 Desktop 门禁**

由于新增 IPC、preload 和 renderer API，运行：`npx pnpm@9.15.0 verify:desktop`

预期：Desktop 快速类型检查与 wiring 测试 PASS。只有 UI 与 Desktop 属于两个独立边界，因此本切片允许各运行一个范围门禁。

- [ ] **Step 4: 运行商人视觉检查**

当前仓库没有独立 `visual:vendors` alias，直接复用单页视觉脚本，并固定检查宽、窄两个视口：

```powershell
$env:D2_VISUAL_CAPTURE_VIEWPORT="1280x720"
node scripts/visual-home-check.mjs --page vendors
$env:D2_VISUAL_CAPTURE_VIEWPORT="760x900"
node scripts/visual-home-check.mjs --page vendors
Remove-Item Env:D2_VISUAL_CAPTURE_VIEWPORT
```

人工检查 Prototype / Web / Desktop：宽窗口双栏、窄窗口抽屉、吸顶工具栏、3–4 列主库存、服务手风琴、紧凑二级库存、搜索结果模式、当前机灵模组标签、详情上下文条和刷新失败缓存提示。额外确认长商人名、长装备名、费用与状态 chip 不重叠；目录抽屉打开后焦点不逃逸且关闭后回到触发按钮；服务展开后没有水平溢出；中文长文案不被截断成不可理解内容；部分角色失败和后台刷新失败均可见但不遮挡缓存库存。

- [ ] **Step 5: 完成真实机灵模组 A/B 验收**

使用同一角色、同一商人和同一件受 Armorer 模组影响的护甲：

1. 在游戏内装备 Armorer 模组 A，进入 Desktop 商人页并点击刷新，记录工具栏模组名称、装备 archetype、六项属性和总属性。
2. 在游戏内改为 Armorer 模组 B，等待 Bungie Profile 可读后再次点击刷新；不重启 Desktop。
3. 确认工具栏切换为模组 B；如果 Bungie Vendor item components 的 stats / sockets 发生变化，页面必须同步变化，账号模式不得把 A/B 两个不同 roll 合并。
4. 切回模组 A 并刷新，确认不会继续显示模组 B 的缓存结果。

Bungie 的 Armorer 规则包含概率因素，因此两次 API 可能返回相同 roll。API 返回相同时应用必须保持相同属性，不得为了制造视觉差异自行改数值。只有实际 API payload 改变但 UI 未改变，才判定验收失败。

- [ ] **Step 6: 记录未运行的发布门禁**

日常切片默认不运行 `pnpm test` / `pnpm typecheck`。只有准备发布、用户明确要求或触到底层全仓依赖时再追加，并在最终回答中明确说明。

## 完成标准

1. 左侧完整展示商人目录，正常显示主库存数量，失败显示“加载失败”，不再出现 `0 件` 假状态、阅读状态或头像占位块。
2. 仄右侧使用紧凑工具栏、Bungie 原始库存分区、舒展主库存卡和位于末尾的服务手风琴。
3. 角色范围支持当前角色与账号全部；账号全部只合并完全相同的售卖实例。
4. 搜索和筛选覆盖所有商人及服务内部库存，结果按目录顺序分组，点击服务结果可定位并展开来源。
5. 费用显示售价、持有量和可负担状态；不提供购买写操作。
6. 推荐只显示一个可解释结论；账号不可用时不出现个性化判断。
7. 普通库存和服务库存中的装备都打开与资料库共用的详情主体，并显示可选商人售卖上下文条。
8. Prototype 覆盖正常、缓存刷新失败、首次失败、无账号和多角色场景；Desktop 使用真实 Vendor API。
9. 商人页不再依赖被截断的 `DailySummaryItem[]` 作为完整库存真相；首页摘要继续使用 DailySummary，不受本切片影响。
10. 部分角色请求失败时保留成功角色库存，并明确显示失败角色；单商人详情失败时保留目录并显示详情失败；IPC / preload / renderer 不丢失 `failedCharacterIds`、`failedVendorDetails` 和 `currencyBalances`。
11. `saleStatus`、`canPurchase`、`apiPurchasable` 和可负担状态语义分离；可负担只由真实货币余额判断，页面不暗示支持 API 购买或游戏内必然可购买。
12. 目录抽屉和共享详情满足可访问名称、Esc 关闭、焦点锁定、焦点恢复、`aria-live`、`aria-expanded` / `aria-controls` 与 `:focus-visible` 验收。
13. `1280x720` 与 `760x900` 两个视口的自动截图和人工检查通过，不出现标题、状态 chip、服务内容或长文案错位和溢出。
14. 角色模式显示当前已装备 Armorer 模组；更换模组并刷新后重新读取 Vendor item components、使旧上下文缓存失效，并严格展示 Bungie 返回的实际属性。
15. 账号模式保留各角色自己的机灵模组上下文；不同 stats / sockets 的售卖实例不得合并，也不提供未在游戏内切换模组时的全模组精确预测。
16. All Vendors 只负责目录和 sale 基础数据；仄属性来自单商人 GetVendor item components。仄详情失败时保留目录并显示详情失败，不使用 Manifest 基础属性冒充当前 roll。

## 非目标

- 不提供实际购买、聚焦或兑换写操作。
- 不在首个切片中重设计其他菜单或共享 workspace chrome。
- 不复制 DIM 视觉；只借鉴其目录、原始分类和服务展开信息架构。
- 不一次性为所有商人编写定制分类或推荐规则；仄验证通过后再推广通用模型。
- 不把 AI 作为推荐事实来源。
