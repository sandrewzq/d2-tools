# 今日可开发功能与未处理待办

> 生成时间：2026-06-21
> 当前分支：`codex/phase-0-local-gui-bootstrap`
> 当前工作区：多个未提交改动（Phase 3 AI light.gg 实现已完成）
> 目的：汇总当前可推进的功能与待办，便于后续 agent 接力开发。

---

## 一、当前项目健康度

| 检查项 | 状态 |
|---|---|
| Git 工作区 | 1 个修改文件，0 个未跟踪文件 |
| 与远程同步 | 是 |
| `packages/core` 类型检查 | 通过 |
| 相关测试 | 7/7 通过（communityPerks × 5 + extract-changelog × 2） |
| 代码 TODO | 1 处：`createFullCommunityPerkService` 中 Phase 3 `AiLightggSource` 预留 |

---

## 二、未处理待办清单

### 2.1 社区 Perk 推荐功能（高优先级，设计文档已完备）

关联文档：
- [2026-06-21-community-perk-recommendations-design.md](2026-06-21-community-perk-recommendations-design.md)
- [2026-06-21-community-perk-recommendations-plan.md](2026-06-21-community-perk-recommendations-plan.md)

当前完成度：
- ✅ Phase 0：类型定义、`DimWishlistSource`、`CommunityPerkRecommendationService`、`matchVaultItems`、IPC 句柄、单元测试
- ✅ Phase 1：武器详情弹窗「社区推荐」UI 区块（2026-06-21 已完成）
- ✅ Phase 2：仓库列表命中提示、资料库入口（2026-06-21 已完成）
- ❌ Phase 3：`AiLightggSource`、AI 工具调用基础设施、设置开关

#### Phase 1：武器详情弹窗社区推荐 UI

**目标**：在武器详情弹窗中显示「社区推荐 Perk 组合」区块。

**依赖**：`community:recommendations:get` IPC 已实现并测试通过。

**待修改文件**：
1. `packages/desktop/src/renderer/pages/HomePage.tsx`
   - 新增状态 `communityRecommendations`、`isCommunityRecommendationsLoading`
   - 在 `openItemDetail()` 中加载推荐数据
   - 在 `closeItemDetail()` 中清空状态
   - 在 DIM Wishlist 命中区块与本地备注之间插入社区推荐 UI
   - 新增 `formatCommunityMode()` 辅助函数
2. `packages/desktop/src/renderer/styles/home-page.css`
   - 新增 `.community-recommendations-panel`、`.community-combo`、`.community-perk` 等样式
3. `packages/desktop/src/renderer/pages/HomePage.tsx`
   - 从 `@d2-tools/core` 导入 `WeaponRecommendation` 类型

**验收标准**：
- `packages/desktop` 类型检查通过
- 导入 DIM wishlist 后，武器详情弹窗显示社区推荐区块
- combo 按 mode 显示不同左侧色条（PvE 蓝 / PvP 红 / 通用灰）
- 未导入 wishlist 或规则不匹配时不显示区块
- 关闭弹窗后状态清空

#### Phase 2：仓库匹配度提示 + 资料库入口

**目标**：仓库列表显示「命中社区推荐组合数量」；资料库武器卡片显示推荐数量。

**依赖**：Phase 1 完成；`community:vault:match` IPC 已实现。

**待修改文件**：
1. `packages/desktop/src/renderer/pages/HomePage.tsx`
   - 新增状态 `vaultCommunityMatch`、`isVaultCommunityMatchLoading`
   - 在仓库数据加载完成后调用 `community:vault:match`
   - 在每件武器行上渲染 `community-match-badge`
2. `packages/desktop/src/renderer/styles/home-page.css`
   - 新增 `.community-match-badge` 样式
3. 资料库组件（需先确认当前资料库页面文件位置）
   - 查询结果加载后调用 `community:vault:match`（`socket_plugs: undefined`，仅返回推荐数量）
   - 在武器卡片上显示「社区推荐 N 个组合」

**验收标准**：
- 仓库列表命中社区推荐的武器显示「社区推荐 · 命中 N（模式）」
- 资料库武器卡片显示推荐组合数量
- 切换角色/重新加载后数据正确更新
- 未命中时不显示任何标记

#### Phase 3：AI light.gg 实时分析

**目标**：通过支持工具调用的 AI provider 查询 light.gg，生成中文社区推荐分析。

**依赖**：Phase 1/2 完成；AI provider 配置支持工具调用。

**待修改文件**：
1. `packages/core/src/ai/aiToolcall.ts`（新建）
   - 定义 `AiTool`、`AiToolcallOptions`、`AiToolcallResponse` 类型
   - 实现 `callAiWithTools()`，走 OpenAI-compatible `/chat/completions`
2. `packages/core/src/communityPerks/aiLightggSource.ts`（新建）
   - 实现 `createAiLightggSource()`
   - 定义 `READ_WEB_TOOL`，构造 light.gg URL 查询
   - 解析 AI 返回 JSON 为 `WeaponRecommendation`
3. `packages/core/src/communityPerks/communityPerkRecommendationService.ts`
   - 在 `createFullCommunityPerkService()` 中注册 `AiLightggSource`
   - 替换当前 TODO 预留块为实际调用
4. `packages/core/src/config/schema.ts` / `packages/core/src/config/defaults.ts`
   - 为 `ai` 配置追加可选字段 `enable_lightgg`，默认 `false`
5. `packages/desktop/src/main/ipc.ts`
   - 将 IPC handler 中的 `createDefaultCommunityPerkService` 替换为 `createFullCommunityPerkService`，传入 AI 配置
6. `packages/desktop/src/renderer/pages/HomePage.tsx`
   - 在无社区推荐数据时显示「使用 AI 查询 light.gg 社区推荐」按钮
7. `packages/desktop/src/renderer/components/AiSettingsPanel.tsx`（或对应设置组件）
   - 增加「启用 light.gg 实时分析」开关与成本提示

**验收标准**：
- 配置 `ai.enable_lightgg = true` 且 provider 支持工具调用时可触发 AI 查询
- DIM wishlist 有数据时优先显示 wishlist 数据
- AI 查询失败时不破坏页面其他功能
- `enable_lightgg` 为 `false` 时 AI 数据源不可用但不报错

---

### 2.2 v0.0.5 Issue #1（独立大功能，设计文档已存在）

关联文档：
- [2026-06-20-issue-1-v0.0.5.md](./2026-06-20-issue-1-v0.0.5.md)
- [2026-06-20-issue-1-v0.0.5-design.md](2026-06-20-issue-1-v0.0.5-design.md)

当前状态：尚未开始实施，文档中的复选框全部未勾选。

**包含任务**：
1. Task 1：Weapon Frame Data Model
2. Task 2：Library and Vault Frame Filters
3. Task 3：Unified Bulk Move Entry
4. Task 4：Local Loadout Library Upgrade
5. Task 5：Lightweight Loadout Comparison
6. Task 6：Full Verification

**建议**：待社区 Perk 推荐功能 Phase 1/2 完成后再启动，避免两个大功能并行导致的集成冲突。

---

### 2.3 Release Notes 自动化（已完成）

关联文档：
- [2026-06-20-release-notes-automation.md](./2026-06-20-release-notes-automation.md)
- [2026-06-20-release-notes-automation-design.md](2026-06-20-release-notes-automation-design.md)

当前状态：已完成。包含：
- `scripts/extract-changelog.mjs` + 测试
- `scripts/generate-release-notes.mjs`
- `scripts/preview-release-notes.mjs`
- `.github/workflows/release.yml` 集成
- `docs/development.md` 文档

无需继续开发。

---

## 三、推荐的后续执行顺序

1. **提交 Phase 1/2 工作区改动**（包含社区推荐 UI、仓库/资料库命中提示、preload/client 桥接、tsconfig 修复、Phase 3 TODO 标记、本文档）
2. **（可选）Phase 3**：开始 `AiLightggSource` 基础设施
3. **不要启动 v0.0.5 Issue #1**，直到社区 Perk 推荐功能完整闭环

---

## 四、关键约束与注意事项

- 不要在实现代码中添加注释（项目约定）
- ESM 导入在 `src/` 内互相导入时必须带 `.js` 后缀
- IPC 返回值必须是可序列化 JSON，不能包含 `Map` / `Set` / 函数
- 类型使用 `| undefined` 而不是可选属性
- AI 模式是可选项，任何 AI 相关错误必须捕获并降级
- 所有新增 `CommunityPerkSource` 的 `getRecommendations` 必须声明为 `async`

---

## 五、快速验证命令

```powershell
# core 类型检查
npx tsc -p packages/core/tsconfig.json --noEmit

# desktop 类型检查
npx tsc -p packages/desktop/tsconfig.renderer.json --noEmit
npx tsc -p packages/desktop/tsconfig.main.json --noEmit

# 运行全部测试
npx vitest run

# release notes 预览示例
node scripts/preview-release-notes.mjs --version 0.0.4
```

---

_最后更新：2026-06-21_
