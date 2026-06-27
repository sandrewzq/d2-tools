# 桌面端功能拆分重构设计

> 日期：2026-06-22
> 状态：已确认方向，待进入实现计划

## 1. 背景

当前桌面端代码集中在少数几个大文件里，已经影响并行开发：

- `HomePage.tsx` 同时承载首页、账号、仓库、资料库、AI、设置、配装、诊断等多个菜单的状态、渲染和 helper。
- `VaultPanel.tsx` 内部已经有较多筛选、排序、批量选择、同名对比和清理逻辑。
- `ipc.ts` 把所有主进程 IPC handler 放在一个文件里，不同功能新增接口时容易互相冲突。
- 多个测试直接检查 `HomePage.tsx` 的字符串，导致 HomePage 成为隐形耦合点。

用户确认的目标是：菜单之间要尽量互相独立，改一个菜单里的功能，不应影响另一个菜单里的功能。

## 2. 重构目标

本次重构的目标不是简单切文件，而是建立菜单级隔离边界：

1. 每个菜单有独立 feature 目录。
2. 每个菜单优先管理自己的状态、副作用、组件和测试。
3. 菜单之间禁止直接互相 import。
4. 共享能力必须进入稳定的 `shared/` 层。
5. `HomePage.tsx` 只保留壳层、导航和菜单注册，不再承载业务状态。
6. 后续并行开发时，账号、仓库、资料库、AI、设置等功能可以分文件夹推进，降低 Git 冲突。

## 3. 推荐目录结构

```text
packages/desktop/src/renderer/
  pages/
    HomePage.tsx

  features/
    home/
      HomeDashboard.tsx
      hooks.ts
      components/
      domain.ts

    account/
      AccountPage.tsx
      hooks.ts
      components/
      domain.ts

    vault/
      VaultPage.tsx
      hooks.ts
      components/
      domain.ts

    library/
      LibraryPage.tsx
      hooks.ts
      components/
      domain.ts

    ai/
      AiPage.tsx
      hooks.ts
      components/
      domain.ts

    settings/
      SettingsPage.tsx
      hooks.ts
      components/
      domain.ts

    daily/
      DailyPage.tsx
      hooks.ts
      components/
      domain.ts

    diagnostics/
      DiagnosticsPage.tsx
      hooks.ts
      components/
      domain.ts

    loadouts/
      LoadoutsPage.tsx
      hooks.ts
      components/
      domain.ts

  shared/
    components/
    hooks/
    domain/
    api/
```

## 4. 依赖规则

### 4.1 允许的依赖方向

```text
HomePage.tsx
  -> features/*
  -> shared/*

features/<menu>/*
  -> shared/*
  -> api/client
  -> core 包公开能力

shared/*
  -> api/client
  -> core 包公开能力
```

### 4.2 禁止的依赖方向

```text
features/account -> features/vault
features/vault -> features/account
features/library -> features/loadouts
features/ai -> features/settings
任意 feature -> pages/HomePage.tsx
```

如果两个菜单都需要同一段逻辑，应先抽到 `shared/`，再由两个菜单分别使用。

## 5. `HomePage.tsx` 的最终职责

重构后，`HomePage.tsx` 只保留：

- `ShellLayout`
- 当前菜单 `activePage`
- 菜单注册表
- 必要的启动状态传递
- 少量全局导航文案

`HomePage.tsx` 不再保存这些业务状态：

- 账号摘要和角色选择
- 仓库筛选状态
- 资料库搜索状态
- AI 对话状态
- 设置表单草稿
- loadout 模板草稿
- 单个菜单内部 loading / error

## 6. 菜单状态隔离

每个菜单自己处理自己的 API 调用、loading、error 和局部交互状态：

- 账号页刷新账号数据，不影响仓库页筛选状态。
- 仓库页切换筛选，不影响账号页当前角色。
- 资料库搜索，不影响账号页和仓库页的装备详情打开状态。
- AI 页对话，不挂在 `HomePage.tsx` 上，也不挤占其他页面状态。
- 设置页保存配置后，只通过必要的全局刷新事件影响需要刷新的菜单。

## 7. 共享能力处理

### 7.1 装备详情弹窗

装备详情是跨账号、仓库、资料库都可能使用的能力，但不应由 `HomePage.tsx` 统一持有全部状态。

推荐做法：

- `shared/components/ItemDetailModal.tsx`：只负责展示，吃 props。
- `shared/hooks/useItemDetail.ts`：封装打开详情、社区推荐、AI 分析、备注和写操作。
- 每个菜单按需实例化自己的 `useItemDetail()`。

这样账号页改详情打开来源，不会影响仓库页或资料库页。

### 7.2 状态提示样式

来源、加载、降级、跳过、空状态等视觉语言已经逐步统一，应放入：

```text
shared/components/sourceStatus/
```

各菜单复用样式和组件，但不共享菜单状态。

### 7.3 账号物品纯逻辑

当前账号页和仓库页都可能需要物品归类、来源描述和槽位展示辅助逻辑。纯逻辑可放入：

```text
shared/domain/items/
```

但账号页自己的页面组织逻辑仍留在 `features/account/domain.ts`。

## 8. 分阶段实施

### 阶段 1：建立 feature 架构和菜单边界

目标：

- 创建 `features/` 和 `shared/` 目录。
- 将首页、每日、AI、设置等相对独立页面先迁入 feature。
- `HomePage.tsx` 改为菜单注册和路由壳。

验收：

- `HomePage.tsx` 不再直接包含这些菜单的大段 JSX。
- 改每日页、AI 页或设置页时，不需要改账号页和仓库页文件。
- 原有测试通过，必要时把字符串测试迁移到对应 feature 文件。

### 阶段 2：拆账号页和账号页 UI 重构

目标：

- 将账号页迁入 `features/account/`。
- 按已确认的账号页设计，实现“上方一体化主区 + 下方低频区”。
- 账号页状态和动作留在 account feature 内，不再放在 `HomePage.tsx`。

验收：

- 账号页包含当前装备、当前角色背包、材料、货币、邮政官。
- 当前装备和当前角色背包同属上方主工作区。
- 材料、货币、邮政官位于下方低频区。
- 账号页测试只读 `features/account/` 或渲染 `AccountPage`。

### 阶段 3：拆资料库、loadout 和共享装备详情

目标：

- 将资料库页迁入 `features/library/`。
- 将 loadout 相关页面和纯逻辑迁入 `features/loadouts/` 或 `shared/domain/loadouts/`。
- 抽出 `shared/components/ItemDetailModal.tsx` 和 `shared/hooks/useItemDetail.ts`。

验收：

- 账号、仓库、资料库各自控制自己的详情打开状态。
- 修改资料库搜索或收藏，不影响账号页和仓库页。
- loadout 对比和命中逻辑有独立纯函数测试。

### 阶段 4：拆仓库页和 VaultPanel 内部

目标：

- 将仓库菜单迁入 `features/vault/`。
- 保留现有 `VaultPanel` 可用性，逐步拆内部 hook。
- 后续仓库页 DIM 化改造在 `features/vault/` 内推进。

验收：

- 仓库筛选、排序、批量选择、同名对比各自有独立 hook 或 domain 测试。
- 仓库页改造不需要修改账号页文件。

### 阶段 5：拆主进程 IPC

目标：

- 将 `ipc.ts` 按功能域拆为独立注册模块。

```text
packages/desktop/src/main/ipc/
  register.ts
  account.ts
  vault.ts
  manifest.ts
  ai.ts
  loadouts.ts
  wishlist.ts
  daily.ts
  actions.ts
  diagnostics.ts
```

验收：

- `register.ts` 只做聚合注册。
- 新增某个菜单 API 时，只改对应 IPC 子模块。
- preload 和 renderer API 类型仍保持稳定。

## 9. 测试迁移原则

现有不少测试通过读取 `HomePage.tsx` 字符串确认 UI 文案或结构。重构后应迁移为：

- 账号页测试读 `features/account/` 或渲染 `AccountPage`。
- 仓库页测试读 `features/vault/` 或渲染 `VaultPage` / `VaultPanel`。
- AI 测试读 `features/ai/`。
- 每日 / 每周测试读 `features/daily/`。
- 共享组件测试读 `shared/components/`。

验收标准：

- 新增一个菜单功能时，不需要修改其他菜单测试。
- 旧的 `HomePage.tsx` 字符串测试逐步减少，只保留壳层和菜单注册相关断言。

## 10. 风险与约束

### 10.1 不引入新的巨型状态中心

不创建统一的 `useAppState.ts` 来承载所有菜单状态。它会把 `HomePage.tsx` 的耦合转移到新文件里。

允许创建少量全局上下文，但只能存放真正全局的信息，例如：

- 启动状态
- 登录状态摘要
- Manifest 状态摘要
- 全局配置摘要

### 10.2 不在重构中顺手重写业务

重构阶段优先保持行为不变。账号页 UI 重构是已确认的例外，应作为阶段 2 的明确目标推进。

### 10.3 保持 core 包边界

core 包当前结构较健康，本轮不做 core 重构。renderer feature 可以复用 core 的公开能力，但不要把桌面 UI 状态放进 core。

## 11. 成功标准

这次重构完成后，应达到：

- `HomePage.tsx` 只像壳层，不像业务页面集合。
- 每个菜单可以独立开发、独立测试。
- 菜单之间没有直接 import。
- 改账号页不会影响仓库页，改仓库页不会影响资料库，改 AI 页不会影响设置页。
- 后续并行开发时，冲突主要限制在各自 feature 目录内。
