# Bug #100：导入区的「移除全部来源」按钮删除

> 状态：✅ 代码已改并自验通过，待用户复验（2026-09-17）
> 现象（用户截图，原文「这个按钮删除」）：仓库 → 推荐来源 → 导入区，「DIM 文本」那一行里
> 挨着「从链接同步」「导入文本文件」的「移除全部来源」被红框圈出。

## 一、这个按钮是什么，说得对不对

它是**清掉愿望单文本导入**的那条通道：点开确认框，确认后调用服务端按格式删除，
只删「含愿望单文本实例」的导入文档——推荐表格导入不在它管辖内。

而它的确认框写的是「会移除全部 **N** 份已导入来源」，N 取的是导入清单的总数（两种格式都算）。
于是库里有推荐表格时，它**承诺的全部与实际删掉的不一致**：说 3 份、删 1 份。
按钮自己又只在存在愿望单时才出现、位置还挤在「DIM 文本」这一行里，
看着像「清掉这一行」，说辞却是「全部」——三层都不是一回事。

**它不是唯一出口**（删掉不会让人清不掉东西）：每一份导入在下方「已导入来源」里都有一行，
行上有「删除」，那条路是超集——连规则排除与来源覆盖一起清，还带说明。
推荐表格那边另有管理区的「清空已导入的推荐规则」成批清。
**如实记录代价**：删掉之后，愿望单导入没有「一次清光」的成批入口了，只能逐份删；
这是用户明确要求的取舍。

## 二、删到哪一层：整条链，不留死通道

按 Bug #91（上一轮删同族旧删除通道）的先例，**按钮 → 动作 → 通道 → 服务函数**一次删干净，
留下来的每一环都是「又一个没人走的分支」。

| 层 | 位置 | 处置 |
|---|---|---|
| 按钮 + 确认框 + 确认状态 + 处理函数 | `ui/vault/VaultWishlistManager.tsx` | 全删（按钮、`移除全部来源？`弹框、`isConfirmingClear`、`clearWishlist()`、只被它用的忙碌档位） |
| 动作成员 | `VaultWishlistActions.clear` | 删（接口里它此前是必填项，每个调用方都得白写一个 stub） |
| 渲染层接线 | `desktop/.../vault/VaultPage.tsx`、`web/src/main.tsx` | 删 `clear` 的两份实现 |
| 通道 | `preload.ts` 的 `clearDimWishlist`、主进程 `wishlist:clear`、`communityApi.ts` | 全删（含 `sharedTypes.ts` 里的声明） |
| 服务合同 | `services/src/contracts.ts`、`desktopBridge.ts`、`memoryAdapter.ts` | 删 `clearDimWishlist` 成员与实现 |
| 服务函数 | `services/src/analysis/wishlistStore.ts` 的 `clearDimWishlist` | 删（它只是 `clearRecommendationDocuments(dir, "dim")` 的一行包装） |
| 属性链 | 面板三层的 `wishlist` 属性、`VaultPage` 的透传与建模输入、`VaultPageModel.wishlist`、`web/src/main.tsx` 的 `webRecommendationWishlist` | 删——这条属性链**只**喂那个按钮（它是唯一读它的地方）。按钮一走就再没人读：留着就是把一份没人看的数据从账号快照一路搬到界面最深处，正是「死通道」的一种 |

`VaultPage` 自己的 `wishlist` 属性**留**：它另有读处（来源行按愿望单武器 Hash 判断影响范围），
那条链不经过被删的那几层。`AccountPage` 上的 `wishlist` 属性本来就没人读，与本 Bug 无关——
已由用户拍板单独清掉，见 [Bug #101](Bug101-account-page-dead-wishlist-prop.md)。

**留**：`clearRecommendationDocuments(dataDir, kind?)`——「清空已导入的推荐规则」仍走它，
且不带格式时才是真正的全删，是另一条通道的底座，不动。

## 三、测试与文档

| 位置 | 改动 |
|---|---|
| `ui/test/vault-recommendation-sources-refresh.test.tsx` | 那条「『移除全部来源』的确认说明指向保留下来的删除入口」随按钮作废：改成断言**导入区不再有整份清空入口**，且同一场景下**逐份删除仍然可用**（不是删掉断言，是把「还有别处可删」这件事继续钉住）。夹具里那个只为让按钮出现而传的 `wishlist` 也随属性链删除 |
| 同文件 / 另两个界面测试 | 夹具里 `clear: async () => …` 随接口成员删除而删 |
| `core/test/wishlist.store.test.ts` | 「clears persisted DIM wishlist rules」用例随服务函数删除而删 |
| `app/test/account-workspace.test.ts` | 三处假服务里的 `clearDimWishlist` 桩删除 |
| `desktop/test/architecture-maintenance.test.ts` | 新增守卫：全仓不得再出现 `clearDimWishlist` / `wishlist:clear` / `actions.clear` 这三个名字（这条链回头就等于又加了一条没人走的通道），且导入区那一行不得再渲染整份清空按钮 |
| `docs/user-guide.md` | 「移除全部来源同理，都在框里确认」这句删掉（按钮没了）；确认框那段保留逐份删除的说法 |

## 四、验证

### 定向改坏表（每条改完即还原，改前改后 SHA-256 一致）

| 改坏什么 | 期望谁红 | 结果 |
|---|---|---|
| 在「导入文本文件」旁重新渲染一个 `aria-label="移除全部来源"` 的按钮 | 架构守卫的残留扫描 **和** `vault-recommendation-sources-refresh` 那条用例 | 两条都红（`keeps the deleted bulk-clear channel deleted`、`导入区不再有整份清空入口…`） |
| 往 `wishlistStore.ts` 追加 `clearDimWishlist` 这个名字 | 架构守卫的通路名扫描 | 红 |
| 往 `wishlist.ts` 追加 `ipcMain.handle("wishlist:clear", …)` | 同上 | 红 |
| 把 `updateRecommendationManagedSource` 的 `removed` 分支改成空操作 | `weaponRecommendationKnowledge` 里新写的「整份愿望单导入走逐份删除」用例 | 红 |

四处改坏各自只打死对应的那条，没有连带；还原后四份文件的哈希与改前逐字节相同。

### 闸门

`pnpm typecheck`（7 包全绿）、`pnpm test:behavior`（147 文件 / 627 用例）、
`pnpm test:architecture`（15 文件 / 81 用例）、`pnpm docs:check`、`pnpm test:quality`、
`pnpm check` 全绿。

### 残留扫描

`packages/**/src` 里搜不到 `clearDimWishlist` / `wishlist:clear` / `isConfirmingClear` / `dim-clear`；
两个名字只出现在架构守卫自己的断言里（守卫必须写下要按住的名字）。
`wishlist=` 只剩两处，都指向仍要它的组件（`VaultPage` 的愿望单 Hash 判定、`AccountPage` 的既有死属性）。
`packages/ui/dist` 里还有旧编译产物，是构建输出、不在源码扫描范围，重新打包即覆盖。

## 五、验收判据

1. 推荐来源页的「DIM 文本」那一行只剩「从链接同步」与「导入文本文件」（有链接通道时）。
2. 下方「已导入来源」里每一份导入的「删除」照常可用，删除后清单与仓库筛选同步更新。
3. 全仓搜不到那条旧通道的名字（按钮、动作、通道、服务函数都没了）。
4. `pnpm typecheck` / `pnpm test:behavior` / `pnpm test:architecture` / `pnpm docs:check` / `pnpm test:quality` 全绿。

## 六、请用户复验

重新打包后进 仓库 → 推荐来源：「DIM 文本」那一行不该再有「移除全部来源」；
要清掉某一份导入，用下方「已导入来源」里那一行的「删除」。
