# T90：新增「工具导航」菜单

> 状态：✅ 已通过实窗验收（2026-09-20）
> 数据来源：`docs/work/references/destiny-tool-reference.md`

## 一、为什么做

`docs/work/references/destiny-tool-reference.md` 收了几十个 Destiny 2 社区工具站，每条都有用途、源码地址、在线地址和注意事项。这份东西只有翻仓库的人看得到，玩家看不到。

本轮把它做成产品里的一级入口：主菜单新增「工具导航」，进去就是全量清单，支持按用途分类筛选和关键词搜索，点开一律在系统浏览器打开。

## 二、范围收敛

用户在本轮讨论里连改三次范围，最终只做「工具导航」一个菜单：

- **来源鸣谢不搬出来**，留在设置页原来的位置不动。理由是设置里那页已经完整，再开一级菜单就是两个入口指向同一份内容。
- **愿望单列表不新开菜单，也不改动**。仓库页第二个标签「2 推荐来源」已有完整的导入与管理链路，重复开入口是维护负担。该链路已知的三处毛病（详情弹框只取前 200 条、武器名显示成 `武器 <hash>`、推荐理由只剩 `note` 而丢掉 tags / author / rating）本轮不动。
- 站点不放图标，纯文字站名。

原计划里「来源鸣谢」那一半的做法（搬 `settingsSources.ts`、改架构测试路径、清设置总览卡片）随之作废。

## 三、实现

### 数据（`packages/ui/src/directory/toolDirectory.ts`）

42 条，字段照调研文档末尾的「导航化排版建议」定：`key` / `name` / `purpose` / `category` / `access` / `level`，可选 `githubUrl` / `onlineUrl` / `mobileUrls` / `note`。

分类六项：`vault` / `weapons` / `account` / `activities` / `knowledge` / `dev`。级别四项：`recommended` 8 条、`optional` 22 条首层展示；`reference` 10 条、`archived` 2 条收进页面底部折叠区。

调研文档里有地址的站就是这 42 条，没有凑到 50 条——文档里没有的站不凭空补。

验收当天删掉了「是否需要登录」字段（`ToolLogin` 类型、`ToolEntry.login`、卡片上的标签和中英文 `loginLabels`）。这个字段是我们替第三方站下的判断，不是站点自己声明的；写不准就是标错，留着还要靠实窗抽查来兜。字段删掉后卡片的标签行只剩「使用方式」一项。

文件只存公开地址和一句话用途，不复制站点内容、图标或数据，也不写 `raw.githubusercontent.com` 地址。

### 页面（`packages/ui/src/directory/DirectoryPageContentView.tsx`）

- 顶部命令条：分类分段控件 + 搜索框 + 结果计数 + 「清空筛选」。
- 主区：按分类分组，每组一个小标题和计数，下面是卡片网格。
- 分类和搜索是与关系：先按分类过滤，再在结果里按关键词匹配 `name` / `purpose` / `note`，大小写不敏感的子串匹配，和仓库现有检索口径一致。
- 筛不到结果时给空状态和「清空筛选」按钮。
- 底部 `<details>` 折叠「开发者与历史」，展开前不占首层位置。
- 卡片用 `object-card` 面，6px 圆角。

外链一律走 `onOpenExternal` 回调，组件内不碰 `window.open`：桌面端接 `api.openExternal`，Web 端接 `adapter.openExternal`，与设置页现有那条链一致。没有 `onOpenExternal` 时退回 `<a target="_blank" rel="noreferrer">`。

分类条用 `data-ui-kind="segmented-control"`，选中态直接使用共享配方（`--selected-fg` / `--state-selected-bg`），不在菜单 CSS 里重写一遍。键盘用 `interaction/rovingFocus.ts` 的 `getRovingFocusIndex`（`orientation: "horizontal"`）。

### 样式（`packages/ui/src/styles/menus/directory/01-workspace.css`）

前缀 `.directory-*`，颜色全部走 token，响应式只用 `@container product-workspace`。

一处与初始写法的修正：卡片网格原来标了 `data-surface="list"`，那是给「父级带外框、内部只画分隔线」的行列表用的，套在卡片网格上会多出一圈外框。改成不标 surface，外框由每张 `.directory-card` 自己拥有。

### 接线

- UI 包：`ShellPageKey` 加 `"directory"`、`navItemKeys` 加一项（在 `vendors` 与 `settings` 之间）、`ShellNavIcon` 加一个罗盘图标、`productPageHeaderMeta` 加一条、`shell.navigation` 中英各加一条、`index.ts` 导出、`styles.css` 注册 `@import`。
- `packages/app`：`HomePageKey` 加 `"directory"`，`homePageMetaMap` / `homePageLabels` / `homePageFocus` 各加一条。
- 桌面壳：新增 `features/directory/DirectoryPage.tsx` 与 `pages/providers/DirectoryMenuProvider.tsx`，`HomePageRoutes` 加懒加载分支，`isShellPageKey` 白名单加一项。
- Web 壳：`main.tsx` 加页面分支，`useWebFixtureRuntime.ts` 的 `pageLabels` 加一项。
- 门禁脚本：`shared-ui-shell-model.test.ts` 的 `navItems` 断言、`visual-all-check.mjs` 的 `pages` 与 `pageLabels` 各加一项。

`isShellPageKey` 和 `ShellNavIcon` 是两处会静默坏掉的地方（不报错、只有肉眼能看出来）：前者漏加会让 `?page=directory` 初始页参数和页面持久化失效，后者漏加会渲染一个空图标。

## 四、不做什么

- 不动「来源鸣谢」，它留在设置页。
- 不管愿望单列表，包括那三处已知毛病。
- 不给站点做图标或抓 favicon，不引入网络请求，不内置任何站点内容副本。
- 不合并「工具导航」与「来源鸣谢」。

## 五、验证

未运行本地自动化验证，改完按仓库规则交给后续本地测试、CI 或 Release。人工体验要点：

1. 点侧栏「工具导航」，确认图标不是空的；分类筛选和搜索能组合生效；搜不到时有空状态和清空按钮。
2. 卡片点「打开」「GitHub」真的用系统浏览器打开。
3. 「开发者与历史」折叠区能展开。
4. 窗口拉窄，确认搜索框放开宽度、卡片网格收成一列，页面不横向溢出。
