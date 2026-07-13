# 资料库异域护甲定义详情实施计划

> 状态：代码已实现，待 CI
> 更新时间：2026-07-13

**目标：** 修复异域护甲被误显示为武器定义结构的问题，并展示 Bungie Manifest 中可确认的异域固有特性。

**架构：** `packages/core` 只从 `sockets.socketEntries[].singleInitialItemHash` 提取 `plugCategoryIdentifier === "intrinsics"` 的固定特性，避免读取 reusable/randomized 模组池。结果通过 `packages/app` 和 Desktop renderer API 类型传入 `packages/ui`；资料库详情按 `group_key` 分流武器和护甲结构。

**约束：** 不展示六维 Roll、总属性、能量、已安装模组、装饰、锁定或收藏状态；本地不运行测试、类型检查、构建或视觉脚本，push 后由 CI 验证。

## 文件边界

- 新增 `packages/core/src/items/intrinsics.ts`：定义 `ItemIntrinsicTraitSummary` 和固定特性提取函数。
- 修改 `packages/core/src/items/search.ts`：给资料库搜索结果增加 `intrinsic_traits`。
- 修改 `packages/app/src/workspaces/libraryPage.ts`：同步共享页面模型类型。
- 修改 `packages/desktop/src/renderer/api/libraryApi.ts`：同步 Desktop renderer 契约。
- 修改 `packages/ui/src/library/LibraryPageContentView.tsx`：按 `group_key` 分流详情并渲染护甲固有特性。
- 修改 `packages/ui/src/styles.css`：增加资料库护甲固有特性区域样式。
- 修改 `docs/todo.md` 和设计 backlog：记录完成状态和数据边界。

## 实现任务

### 实现：提取异域固有特性

- [x] 新增 `summarizeItemIntrinsicTraits(item, itemDefinitions)`。
- [x] 只读取固定 `singleInitialItemHash`，不展开 `reusablePlugSetHash` 或 `randomizedPlugSetHash`。
- [x] 仅接受 `plug.plugCategoryIdentifier === "intrinsics"`。
- [x] 输出 `hash`、`name`、`description`、`icon`，并按 hash 去重。
- [x] 在 `ItemSearchResult` 中仅在存在可靠特性时写入 `intrinsic_traits`。

### 实现：同步资料库类型

- [x] 在 app workspace 与 Desktop renderer API 中增加相同的 `intrinsic_traits` 可选字段。
- [x] 不把实例字段加入资料库 DTO。

### 实现：分流武器与护甲详情

- [x] `group_key === "weapons"` 时继续生成现有武器 Perk 列。
- [x] `group_key === "armor"` 时不调用武器列标签函数。
- [x] 护甲有 `intrinsic_traits` 时显示“异域固有特性”区域，包括图标、官方名称与说明。
- [x] 护甲缺少可靠固有特性时显示轻量缺失提示，不回退到护甲模组池。
- [x] 其他分类只显示通用定义、来源与渠道。

### 整理：文案、样式与状态

- [x] 固有特性卡保持资料库详情现有密度和边框层级。
- [x] 不新增嵌套卡片或共享 shell 样式。
- [x] 更新设计 backlog 与 `docs/todo.md`，记录 Manifest 不提供六维定义 Roll。
- [x] 保留现有用户和其他 agent 的工作区改动，不提交或格式化无关文件。

## CI 验收

push 后由 CI 检查：

- 炎阳护腕可得到“氦气螺线”。
- 星火协议可得到“融合掌控”。
- 护甲详情不出现武器列标题或重复模组池。
- 武器详情仍展示现有武器定义结构。
- 类型检查、行为测试和质量检查通过。
