# 商人菜单仄纵向切片实施计划

> **给执行 agent：** 实施时必须使用 `subagent-driven-development`（推荐）或 `executing-plans`，逐项执行带复选框的任务。仓库规则优先于技能默认路径；本计划保存在 `docs/work/backlog/`。

**目标：** 以仄为首个完整纵向切片，交付共享商人目录、真实角色库存、全商人搜索、服务内二级兑换库存、账号购买判断，以及与资料库共用的装备详情浮层。

**架构：** 新增专用 `VendorInventorySnapshot`，不再用面向首页摘要且会截断数据的 `DailySummaryItem[]` 驱动商人页。`packages/core` 定义并纯函数归一商人库存，`packages/services` 获取 Bungie 角色商人数据，`packages/app` 生成角色范围、搜索、筛选、推荐与合并 ViewModel，`packages/ui` 渲染共享内容层；Prototype 注入 mock snapshot，Desktop 通过独立 IPC 和现有账号、详情 workspace 接真实能力。

**技术栈：** TypeScript、React、Electron IPC、Bungie Destiny 2 Vendor API、Vitest、React DOM Server。

## 全局约束

- 默认只重设计商人菜单内容层；不修改 `ProductShellHost`、`ProductWorkspace`、全局 token 或无 `.vendor-*` 前缀的产品样式。
- 左侧保留分组商人目录；使用小型单色符号辅助识别，缺少可靠符号时只显示名称，不生成头像或字母占位块。
- 右侧只展示当前商人详情；宽窗口双栏，窄窗口把商人目录收进抽屉。
- 主库存与服务/兑换分开；服务放在主库存之后，以手风琴原地展开二级兑换库存。
- 主库存使用舒展的 3–4 列卡片；二级兑换库存使用共享紧凑物品格。
- 商人详情沿用 Bungie 返回的分类和顺序；推荐项在各分区内前置，其他条目不重新排序。
- 搜索与筛选作用于当前角色范围内的全部商人，并覆盖服务内部库存；结果按左侧目录顺序按商人分组。
- 账号全部模式只合并物品、roll、费用和购买资格完全一致的售卖实例。
- 推荐必须有可靠依据；卡片只显示一个最高优先级结论，优先级为“优于已有副本 > 未收藏 > 高质量售卖实例 > 通用推荐”。
- 账号不可用时只保留非个性化推荐，不伪造拥有状态或账号对比。
- 正常目录条目显示真实主库存数量；加载失败显示“加载失败”，不得显示为 `0 件`。
- 首次加载可先显示缓存；后台刷新失败时保留缓存、显示缓存时间和明确错误；从未成功加载时显示完整错误态。
- 点击普通物品或二级兑换物品都打开与资料库共用的装备详情浮层；商人售价等信息作为可选上下文条传入，不复制详情主体。
- 退出菜单只保留角色范围和选中商人；搜索、筛选、结果模式、折叠状态与滚动位置重置。
- 不修改或整理当前无关脏文件 `packages/core/src/items/search.ts`、`packages/core/test/item.search.test.ts`。
- 新测试断言真实函数输出、role、label、回调和 ViewModel；不得新增读取生产源码匹配文案、class、变量名或 import 顺序的测试。

---

## 文件结构

- 新建 `packages/core/src/vendors/inventory.ts`：商人快照、售卖项、服务容器、费用和角色来源的领域契约与纯归一函数。
- 新建 `packages/core/test/vendors.inventory.test.ts`：仄主库存、服务库存、角色差异、完全相同实例合并的行为测试。
- 修改 `packages/core/package.json`：导出 `@d2-tools/core/vendors/inventory`。
- 新建 `packages/services/src/vendors/liveInventory.ts`：读取公共/角色 Vendor API 和 Manifest definition，返回未截断快照。
- 新建 `packages/services/test/vendors.liveInventory.test.ts`：使用 fake fetch 验证角色请求、失败聚合和原始顺序。
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
  apiPurchasable: boolean;
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
  vendors: VendorInventory[];
};
```

`VendorOffer.id` 必须稳定为 `${vendorHash}:${vendorItemIndex}:${characterScopeKey}`。`rollFingerprint` 必须包含 `itemHash`、费用、购买资格以及可读取的实例 perk/属性摘要；账号全部模式只在 fingerprint 完全一致时合并角色。

---

### Task 1: Red: 商人领域契约测试

**文件：**
- 新建：`packages/core/test/vendors.inventory.test.ts`

**接口：**
- 消费：上方 `VendorInventorySnapshot` 契约草案。
- 产出：锁定主库存/服务拆分、角色来源保留和完全相同实例合并行为。

- [ ] **Step 1: 写仄主库存和服务拆分失败测试**

```ts
it("separates direct Xur offers from nested exchange services", () => {
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
});
```

- [ ] **Step 3: 运行测试并确认失败**

运行：`npx pnpm@9.15.0 vitest --run packages/core/test/vendors.inventory.test.ts`

预期：FAIL，提示 `buildVendorInventorySnapshot` 或模块不存在。

- [ ] **Step 4: 提交 Red**

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
  apiPurchasable: boolean;
  instanceSummary?: string;
}): string {
  return JSON.stringify({
    itemHash: input.itemHash,
    costs: input.costs.map((cost) => [cost.itemHash, cost.quantity]),
    failureIndexes: [...input.failureIndexes].sort((a, b) => a - b),
    apiPurchasable: input.apiPurchasable,
    instanceSummary: input.instanceSummary ?? ""
  });
}
```

- [ ] **Step 2: 实现归一、服务拆分和完全相同实例合并**

实现必须保持 Bungie `displayCategoryIndex` 和 `vendorItemIndex` 顺序；服务容器通过 Vendor definition 的 category/service 关系归入 `services`，不得用中文名称关键词猜测。

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
- 产出：锁定角色请求、部分失败和未截断库存行为。

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

  expect(requests.filter((url) => url.includes("/Vendors/"))).toHaveLength(3);
});
```

- [ ] **Step 2: 写部分失败和完整库存失败测试**

```ts
it("returns successful character inventories and exposes failed character ids", async () => {
  const snapshot = await fetchVendorInventorySnapshot(createOptionsWithTitanFailure());

  expect(snapshot.status).toBe("ready");
  expect(snapshot.warnings).toContain("titan");
  expect(snapshot.vendors[0].offers).toHaveLength(18);
});
```

- [ ] **Step 3: 运行测试并确认失败**

运行：`npx pnpm@9.15.0 vitest --run packages/services/test/vendors.liveInventory.test.ts`

预期：FAIL，模块不存在。

- [ ] **Step 4: 提交 Red**

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
- 产出：`fetchVendorInventorySnapshot(options): Promise<VendorInventorySnapshot & { warnings: string[] }>`。

- [ ] **Step 1: 实现每角色 Vendor API 请求**

```ts
const components = "400,401,402,304,305,306,307,308,309,310";
const path = `/Destiny2/${membershipType}/Profile/${membershipId}/Character/${characterId}/Vendors/?components=${components}`;
```

请求失败使用 `Promise.allSettled` 聚合；至少一个角色成功时返回 `ready` 加 warnings，全部失败时抛出包含用户可读原因的错误。不得截断 vendor 或 sale item。

- [ ] **Step 2: 调用 core 纯归一函数**

```ts
return {
  ...buildVendorInventorySnapshot({
    fetchedAt: now().toISOString(),
    characterResponses,
    definitions
  }),
  warnings: failedCharacterIds
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

- [ ] **Step 4: 运行测试并确认失败**

运行：`npx pnpm@9.15.0 vitest --run packages/app/test/vendorsPage.test.ts`

预期：FAIL，现有 workspace 不接受专用快照和账号上下文。

- [ ] **Step 5: 提交 Red**

```powershell
git add packages/app/test/vendorsPage.test.ts
git commit -m "test: define Xur workspace behavior"
```

### Task 6: Green: 仄工作区最小实现

**文件：**
- 重写：`packages/app/src/workspaces/vendorsPage.ts`
- 修改：`packages/app/src/index.ts`

**接口：**
- 消费：`VendorInventorySnapshot`、`AccountSummary | null`、`VendorCharacterScope`、缓存/刷新状态。
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

ViewModel 必须包含 `railSections`、`selectedVendor`、`scopeOptions`、`search`、`filters`、`statusBanner`；UI 不得自行解释 `0`、推荐优先级或角色合并。

- [ ] **Step 2: 实现账号持有量和可负担状态**

使用 `account.materials.items` 按 `VendorCost.itemHash` 求持有量。每项输出：

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

- [ ] **Step 4: 实现选择状态恢复规则**

workspace 只接收和返回 `selectedVendorId`、`scope`；query、filters、折叠和滚动不进入持久状态。

- [ ] **Step 5: 运行定向测试**

运行：`npx pnpm@9.15.0 vitest --run packages/app/test/vendorsPage.test.ts`

预期：PASS。

- [ ] **Step 6: 提交 Green**

```powershell
git add packages/app/src/workspaces/vendorsPage.ts packages/app/src/index.ts packages/app/test/vendorsPage.test.ts
git commit -m "feat: build Xur vendor workspace"
```

### Task 7: Red: 商人共享 UI 边界测试

**文件：**
- 新建：`packages/ui/test/vendors-page.test.tsx`

**接口：**
- 消费：`VendorsPageContentView` 与 `VendorsPageActions`。
- 产出：锁定目录、搜索模式、折叠分区、服务手风琴、窄窗口入口和物品动作。

- [ ] **Step 1: 写目录和详情工具栏行为测试**

使用测试 renderer 或 Testing Library 渲染后按 role 查询：

```ts
expect(screen.getByRole("navigation", { name: "商人列表" })).toBeTruthy();
expect(screen.getByRole("button", { name: /仄.*12 件/ })).toBeTruthy();
expect(screen.getByRole("button", { name: "刷新商人数据" })).toBeTruthy();
```

- [ ] **Step 2: 写全局搜索和服务手风琴测试**

```ts
await user.type(screen.getByRole("searchbox", { name: "搜索全部商人库存" }), "蒙特卡洛");
expect(screen.getByRole("heading", { name: "全部商人结果" })).toBeTruthy();
expect(screen.getByText("仄 → 奇异装备优惠")).toBeTruthy();

await user.click(screen.getByRole("button", { name: "展开奇异装备优惠" }));
expect(screen.getByRole("list", { name: "奇异装备优惠兑换库存" })).toBeTruthy();
```

- [ ] **Step 3: 写物品详情动作测试**

```ts
await user.click(screen.getByRole("button", { name: /查看鹰月详情/ }));
expect(actions.onOpenItem).toHaveBeenCalledWith(
  expect.objectContaining({ itemHash: expect.any(Number) }),
  expect.objectContaining({ vendorName: "仄" })
);
```

- [ ] **Step 4: 运行测试并确认失败**

运行：`npx pnpm@9.15.0 vitest --run packages/ui/test/vendors-page.test.tsx`

预期：FAIL，现有 UI 没有新角色、搜索、服务和动作边界。

- [ ] **Step 5: 提交 Red**

```powershell
git add packages/ui/test/vendors-page.test.tsx
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

移除 `VendorAvatar`、`createVendorIconUrl` 和字母 SVG fallback。可靠 `symbolUrl` 存在时渲染 14–16px 单色符号，否则只渲染名称。

- [ ] **Step 2: 实现吸顶紧凑工具栏和筛选面板**

工具栏固定包含商人名称、位置、刷新倒计时、数据时间、角色范围和刷新按钮；搜索框常驻，其他筛选通过面板控制，生效条件渲染可关闭标签。

- [ ] **Step 3: 实现主库存分区和舒展卡片**

每个 Bungie 原始分区默认展开且可独立折叠；CSS 使用：

```css
.vendor-inventory-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 12px;
}
```

卡片只显示一个 `decisionLabel`；费用区域显示 `required / owned` 和可负担状态，不重复数据来源。

- [ ] **Step 4: 实现服务手风琴和紧凑物品格**

同一时间只展开一个服务。紧凑格复用统一 `VendorOfferButton` 的 `density="compact"` 变体，不复制点击和费用逻辑。

- [ ] **Step 5: 实现搜索结果模式**

搜索生效后右侧替换为按商人分组的结果；左侧不变。点击左侧商人调用 `onSelectVendor` 并清空 query/filters；点击服务内结果调用 `onLocateOffer`，恢复商人详情并展开对应服务。

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
render(<SharedItemDetailDialog detail={detail} onClose={onClose} />);
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
    onClose={onClose}
  />
);
expect(screen.getByRole("region", { name: "商人售卖信息" })).toHaveTextContent("仄");
```

- [ ] **Step 3: 运行测试并确认失败**

运行：`npx pnpm@9.15.0 vitest --run packages/ui/test/shared-item-detail.test.tsx`

预期：FAIL，共享详情呈现组件不存在。

- [ ] **Step 4: 提交 Red**

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
  onClose: () => void;
  sections: ReactNode;
};
```

- [ ] **Step 2: 抽取详情 chrome 和商人上下文插槽**

Desktop 保留数据 hook、写操作和复杂 section 组装，只把标题、关闭、布局和可选上下文条交给 `SharedItemDetailDialog`。不得让 `packages/ui` import Electron API 或 Desktop 类型。

- [ ] **Step 3: 保持现有资料库详情行为**

`vendorContext` 缺省时 DOM、关闭行为和现有 section 顺序保持不变；商人入口只增加顶部上下文条。

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
});
```

- [ ] **Step 3: 写刷新失败保留缓存测试**

```ts
it("keeps cached inventory visible when background refresh fails", async () => {
  const state = await runVendorRefreshCycle({ cached: readySnapshot, refresh: Promise.reject(new Error("网络失败")) });
  expect(state.snapshot).toBe(readySnapshot);
  expect(state.refreshState).toBe("failed");
});
```

- [ ] **Step 4: 运行测试并确认失败**

运行：`npx pnpm@9.15.0 vitest --run packages/desktop/test/vendors-page-ui.test.tsx packages/desktop/test/vendors-ipc.test.ts`

预期：FAIL，专用 API 和新 props 尚未接线。

- [ ] **Step 5: 提交 Red**

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

只在 `api/types.ts` 聚合 `VendorsApi`；`api/client.ts` 不增加 DTO。

- [ ] **Step 2: 注册独立 IPC handler**

`registerVendorIpcHandlers()` 加载配置、token、角色和 definitions，调用 `fetchVendorInventorySnapshot`。`ipc.ts` 只 import 并注册，不包含业务逻辑。

- [ ] **Step 3: 接入 Desktop 缓存优先刷新状态**

新增菜单私有 hook `packages/desktop/src/renderer/features/vendors/useVendorsWorkspace.ts`，负责：初次请求、保留最后成功 snapshot、后台刷新、错误状态、选中商人和角色范围。`useDesktopProductShell.tsx` 只组合 hook 输出，避免继续膨胀。

- [ ] **Step 4: 接入全局详情动作**

`VendorsPageActions.onOpenItem` 调用现有 `itemDetail.openItemDetail`，并把 `VendorOfferContext` 保存到 item detail workspace；关闭浮层时只清空详情上下文，不改商人、服务展开和滚动状态。

- [ ] **Step 5: 增加 Prototype 场景**

至少提供：正常仄库存、后台刷新失败保留缓存、首次加载失败、无账号推荐降级、多角色存在差异。Prototype 使用与 Desktop 相同 `VendorsPageContentView`，不得复制页面结构。

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

确认领域 DTO 只从 `@d2-tools/core/vendors/inventory` 导出；app 只导出 ViewModel；renderer API 不复制 core DTO 定义。

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

当前仓库没有独立 `visual:vendors` alias，直接复用单页视觉脚本：

```powershell
node scripts/visual-home-check.mjs --page vendors
```

人工检查 Prototype / Web / Desktop：宽窗口双栏、窄窗口抽屉、吸顶工具栏、3–4 列主库存、服务手风琴、紧凑二级库存、搜索结果模式、详情上下文条和刷新失败缓存提示。

- [ ] **Step 5: 记录未运行的发布门禁**

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

## 非目标

- 不提供实际购买、聚焦或兑换写操作。
- 不在首个切片中重设计其他菜单或共享 workspace chrome。
- 不复制 DIM 视觉；只借鉴其目录、原始分类和服务展开信息架构。
- 不一次性为所有商人编写定制分类或推荐规则；仄验证通过后再推广通用模型。
- 不把 AI 作为推荐事实来源。
