# 桌面 UI 设计系统 v2 与 AI 抽屉滚动隔离

> 状态：已完成
> 更新时间：2026-06-30

## 背景

当前桌面 UI 已经完成全局外壳、亮色默认、明暗色持久化和多轮页面打磨，但真实使用中仍反复出现颜色不可读、局部暗色残留、按钮和选中态混乱、AI 抽屉打开后滚动异常等问题。

根因不是某几个颜色值错误，而是样式系统没有真正收口：

- `styles.css` 中仍有大量暗色硬编码，亮色模式依赖前置补丁覆盖，后写的旧规则会继续覆盖 token。
- 普通桌面 UI、状态语义、装备卡片、资料库卡片、详情弹框和 AI 抽屉没有统一组件边界。
- 当前测试更多检查 selector 和 token 是否存在，没有拦截普通 UI 继续使用暗色文本或暗色背景硬编码。
- AI 抽屉和主内容区没有被明确建模成两个独立滚动 pane，导致抽屉打开后主区域滚动受影响，两个滚动条挤在一起。

这份 backlog 的目标是把桌面 UI 从“逐页补丁”推进到“稳定设计系统”，后续页面开发不再靠临时颜色覆盖。

## 目标

1. 普通桌面 UI 在亮色模式下必须清晰、成熟、可读。
2. 暗色模式和亮色模式共用同一套语义 token，不再一页页补 selector。
3. 游戏装备详情允许保留 Destiny 风格暗色，但必须限定在明确的 `game-*` 区域。
4. AI 抽屉和主工作区互为独立滚动容器，滚动条位于各自区域右侧，不互相挤压。
5. 新增共享 UI 组件或稳定样式类，让账号、仓库、资料库、设置和详情弹框不再各自决定颜色。
6. 加防回退测试，防止普通 UI 再次出现浅底浅字、暗底暗字和全局滚动污染。

## 非目标

- 不重写业务逻辑。
- 不改变账号、仓库、资料库、AI 的数据来源。
- 不一次性重做所有页面的信息架构；本轮只解决视觉系统、滚动隔离和高频可读性问题。
- 不把游戏详情顶部彻底改成普通桌面卡片；它可以保留游戏风格，但需要边界清楚。

## 设计原则

### 1. Token 先行

新增或补齐语义 token，页面不得直接写普通 UI 颜色：

- `--field-*`：输入框、select、搜索框、textarea。
- `--chip-*`：badge、tag、状态胶囊。
- `--item-*`：装备卡、仓库卡、资料库结果卡、列表行。
- `--selection-*`：hover、active、selected、focus。
- `--drawer-*`：AI 抽屉面板、头部、消息、输入区、滚动条。
- `--game-*`：装备详情顶部、属性条、perk 区等游戏风格暗色区域。

已有 `--surface-*`、`--text-*`、`--border-*`、`--status-*` 继续保留，但不再承担所有场景。

### 2. 普通 UI 和游戏 UI 分层

普通桌面 UI：

- 亮色下使用浅背景、深文本、低饱和边框。
- 暗色下使用暗背景、浅文本，但仍通过同名 token 切换。
- 包括首页、账号页普通区域、仓库页卡片、资料库页、设置页、AI 抽屉、弹框下方工具区。

游戏详情 UI：

- 只允许在 `game-*` 或 `item-detail-game-*` 区域保留暗色视觉。
- 顶部可以使用装备稀有度色、暗色属性条、游戏化数值展示。
- 不能把 `#f3f6fc`、`#8bd3ff`、`#181d27` 等暗色规则散落到普通页面。

### 3. 组件层收口

优先建立或稳定这些共享组件 / 共享样式：

- `Panel` / `panel-subsection`
- `SectionHeader`
- `StatusBadge` / `ui-badge`
- `FilterToolbar` / `ui-filter-toolbar`
- `SelectField`
- `ItemCard` / `ui-item-card`
- `ListRow` / `ui-list-row`
- `GameDetailHeader`
- `DrawerPanel`

页面只负责业务布局和数据映射，不直接决定颜色语义。

### 4. 滚动 pane 明确化

桌面外壳必须明确划分：

- 左侧导航固定，不参与内容滚动。
- 主工作区 `.shell-content` 独立滚动，滚动条贴在主内容区右侧。
- AI 抽屉 `.global-assistant-panel` 独立滚动，滚动条贴在 AI 抽屉右侧。
- 打开 AI 抽屉后，主内容区仍能滚动。
- `body` 和 `.shell-workspace` 不应变成页面级滚动容器。
- 主内容区和 AI 抽屉之间要有边界和间距，避免两个滚动条贴在一起。

## 当前问题归类

### 亮色可读性

截图中已确认的类型：

- 首页“今日行动 / 本周周报”列表文字过浅。
- 账号页装备分组标题、计数和槽位标签仍使用暗色蓝 / 白。
- 仓库卡片名称、perk、badge、按钮局部仍混用暗色文字。
- 资料库来源补卡片内部混用暗色背景、亮色卡片和深色 chip。
- 设置页筛选 label、操作日志状态块、select 仍有局部弱对比。

### 详情弹框

当前问题：

- 顶部游戏风格暗面板和下方亮色工具区衔接生硬。
- 关闭按钮、标签页、同名对比区域视觉层级不统一。
- 弹框内部滚动和页面背景遮罩需要跟主题同步。

处理方向：

- 顶部保留 `game-*` 暗色特例。
- 下方工具区统一桌面 UI token。
- 中间增加明确分隔，避免像两个不同产品拼在一起。

### AI 抽屉

当前问题：

- 打开 AI 侧边栏后，主区域滚动条不可用或难以使用。
- 主区域滚动条和 AI 抽屉滚动条挤在一起。
- AI 抽屉的消息区、输入区、会话列表和上下文条缺少统一主题 token。

处理方向：

- AI 抽屉作为独立 drawer pane，而不是主内容的一部分。
- 抽屉内部再分 header / session list / conversation / composer。
- AI 抽屉内滚动只发生在抽屉内部，不影响主工作区。

## 实施切片

### 切片 1：设计 token 与防回退测试

产出：

- 补齐 `field`、`chip`、`item`、`selection`、`drawer`、`game` token。
- 新增测试限制普通 UI 中继续使用典型暗色硬编码。
- 明确 `game-*` 白名单。

验收：

- 普通 UI selector 中不再出现暗色模式文本硬编码，例如 `#f3f6fc`、`#8bd3ff`、`#9da9bc`。
- 普通 UI selector 中不再出现暗色背景硬编码，例如 `#181d27`、`#141924`、`#090b0f`。
- `game-*` / `item-detail-game-*` 是唯一允许保留游戏暗色的区域。

### 切片 2：基础组件与表单控件

产出：

- 稳定 `Panel`、`SectionHeader`、`StatusBadge`、`FilterToolbar`、`SelectField`、`ItemCard`、`ListRow`、`DrawerPanel`。
- select、button、input、textarea、segmented control 不再使用页面私有颜色。

验收：

- 设置页筛选区域、select、按钮在亮色 / 暗色下都清晰可读。
- hover、selected、active、disabled 状态颜色语义一致。

### 切片 3：Shell pane 与 AI 抽屉滚动隔离

产出：

- `.shell-workspace` 改为稳定 pane 布局。
- `.shell-content` 和 `.global-assistant-panel` 各自滚动。
- AI 抽屉使用 `drawer-*` token。
- 抽屉打开后主内容仍可滚动。

验收：

- 打开 AI 抽屉后，主区域滚动条仍可用。
- AI 抽屉滚动条位于抽屉内部右侧。
- 主内容区滚动条和 AI 抽屉滚动条之间有清晰分隔，不贴在一起。
- `body` 和 `.shell-workspace` 仍为固定视口，不引入全局滚动。

### 切片 4：账号页装备区迁移

产出：

- 账号页角色标题、装备分组、槽位标题、计数、已装备 / 背包候选卡片迁移到 item token。
- 材料、活动复盘、邮政官区域继续使用普通桌面 UI token。

验收：

- 亮色模式下账号页标题、计数、装备名、装备描述全部可读。
- 已装备和背包候选状态能区分，但不依赖高饱和浅字。

### 切片 5：仓库页卡片和筛选迁移

产出：

- 仓库卡片、列表行、筛选 toolbar、badge、标签按钮迁移到 item / chip / field token。
- 武器筛选和护甲筛选继续保持顶部筛选，但视觉统一。

验收：

- 仓库卡片在亮色下不再出现白字或过浅文字。
- DIM / perk / tag / mark badge 可读。
- 选中态、hover、待清理、关注、保留等状态有一致语义。

### 切片 6：资料库与设置页迁移

产出：

- 资料库搜索结果、来源补卡片、perk chip、最近查看和收藏区域迁移到共享组件。
- 设置页操作日志、诊断、select、筛选区域迁移到共享组件。

验收：

- 资料库来源补卡片内部不再出现普通 UI 和暗色 UI 混搭。
- 设置页操作日志在成功 / 失败状态下文字、按钮和背景都可读。

### 切片 7：装备详情弹框分层整理

产出：

- `GameDetailHeader` 或等价 `game-*` 区域承接顶部游戏视觉。
- 下方 tabs、来源、同名对比、操作区统一普通桌面 UI token。
- 弹框遮罩、关闭按钮、滚动条与主题同步。

验收：

- 顶部暗色游戏视觉保留，但边界明确。
- 下方工具区在亮色模式下没有暗色残留或浅字。
- 1366px 和 1920px 下弹框都不显得割裂。

### 切片 8：旧硬编码清理

产出：

- 清理 `styles.css` 中普通 UI 的旧暗色硬编码。
- 只保留 token、状态色和 `game-*` 白名单。
- 更新 `docs/development.md` 的 UI 样式系统说明。

验收：

- 防回退测试通过。
- `pnpm docs:check`、`pnpm typecheck`、`pnpm test` 通过。
- 真实桌面亮色模式下：首页、账号、仓库、资料库、设置、AI 抽屉、详情弹框无明显不可读文本。

## 代码边界

建议落点：

- 全局 token 和共享样式：`packages/desktop/src/renderer/styles.css`
- 全局外壳：`packages/desktop/src/renderer/components/ShellLayout.tsx`
- AI 抽屉：`packages/desktop/src/renderer/components/GlobalAssistantSidebar.tsx`、`AiAnalysisPanel.tsx`
- 共享组件：`packages/desktop/src/renderer/shared/components/`
- 账号页：`packages/desktop/src/renderer/features/account/`
- 仓库页：`packages/desktop/src/renderer/features/vault/`
- 资料库：`packages/desktop/src/renderer/features/library/`
- 设置页：`packages/desktop/src/renderer/features/settings/`
- 装备详情：`packages/desktop/src/renderer/shared/components/item-detail/`
- 测试：`packages/desktop/test/ui-style-system.test.ts`、必要时新增 shell / drawer 结构测试。

边界要求：

- `shared/` 不能 import `features/`。
- feature 之间不能直接 import。
- Renderer API 不因本任务新增大型 DTO。
- 修改 `HomePage.tsx`、`ShellLayout.tsx`、`ItemDetailModal.tsx`、`VaultPanel.tsx` 等公共接线文件时保持改动聚焦。

## 测试要求

必须覆盖：

- token 存在且普通 UI 使用 token。
- 普通 UI 禁止典型暗色文本 / 背景硬编码。
- `game-*` 白名单允许保留游戏详情暗色。
- AI 抽屉打开时主工作区和抽屉各自滚动。
- select、button、badge、item card、list row 在亮色模式下可读。

推荐命令：

```powershell
npx pnpm@9.15.0 vitest --run packages/desktop/test/ui-style-system.test.ts
npx pnpm@9.15.0 docs:check
npx pnpm@9.15.0 typecheck
npx pnpm@9.15.0 test
```

## 完成标准

这份 backlog 完成时，应满足：

1. 不再依赖大段 `.app-shell[data-color-mode="light"] ...` 临时补丁维持亮色可读性。
2. 普通桌面 UI 和游戏详情 UI 边界清楚。
3. 账号、仓库、资料库、设置、AI 抽屉和详情弹框在亮色模式下没有明显浅字、白字或暗底残留。
4. AI 抽屉打开后主区域仍可滚动，两个滚动条不再挤到一起。
5. 新增防回退测试能阻止后续页面继续引入普通 UI 暗色硬编码。
