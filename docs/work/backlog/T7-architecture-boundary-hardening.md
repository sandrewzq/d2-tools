# 社区推荐边界收口

> 状态：待推进
> 更新时间：2026-07-24

## 目标

完成社区推荐子域的最后一段运行时边界迁移：`packages/core` 只保留推荐规则、领域 DTO、解析和匹配；所有本地文件读写、AI / light.gg 外部调用和缓存都进入 `packages/services`。Desktop IPC 只通过 Services 访问该能力。

本任务不重开 Core、Services、App、UI、Prototype、Web 或 Desktop 的全仓架构重构。现有主分层已经稳定，本文件只跟踪仍然实际运行且违反该边界的社区推荐适配层。

## 当前基线

以下架构已经完成并作为前提保留：

- `core -> services -> app -> ui -> 平台壳` 是当前包依赖方向。
- Core 的 Bungie HTTP、OAuth、Manifest 文件读写、账号 Session、资料库 SQLite runtime、独立本地 store 和 Desktop transport 已经分别迁入 Services 或 Desktop。
- Prototype、Web、Desktop 均挂同一个 `ProductShellHost`；Prototype / Web 使用共享 typed fixture foundation，不维护平台专属产品页面。
- Desktop 的 main、preload、renderer contracts 和 Renderer feature 边界已有架构门禁。
- Services 的稳定错误码可经 Desktop contracts 和 preload 传递。逐菜单如何展示登录、重试或修复提示属于后续 UX 工作，不属于本任务完成条件。

当前剩余的实际边界问题集中在社区推荐：

- `packages/core/src/community-perks/localCommunityRecommendations.ts` 读写本地社区表并构建本地 source。
- `packages/core/src/community-perks/personalWeaponKnowledge.ts` 读写个人知识。
- `packages/core/src/community-perks/aiLightggSource.ts` 调用 AI 网页检索并读写 light.gg 缓存。
- `packages/desktop/src/main/ipc/community.ts` 直接从 Core 调用上述运行时实现；Services 仅承担部分推荐 source 的组合。

这些不是遗留死代码。仓库、装备详情、个人知识和社区推荐 IPC 当前仍会走该路径，因此必须迁移后才能关闭 T7。

## 目标边界

### Core

Core 保留：

- `CommunityPerkRecommendationService` 的纯编排规则。
- 推荐、Perk、个人知识和本地社区表的领域 DTO、校验、规范化、匹配与解析。
- 可注入的 `CommunityPerkSource` 协议。
- AI / light.gg 响应到领域推荐结果的纯解析函数。

Core 不保留：

- `node:fs`、`node:path` 或数据目录路径拼接。
- 本地 JSON 表、个人知识或 light.gg 缓存的读写。
- AI 请求、网页检索或其他外部调用。

### Services

Services 负责：

- 本地社区表、个人知识与 light.gg 缓存的存储 adapter。
- AI / light.gg source 的运行时实现、配置读取和失效策略。
- 将本地表、DIM、个人知识和可选 AI source 组合为 `CommunityPerkRecommendationService`。
- 对存储、配置和外部请求错误提供稳定 `D2ServiceError`。

### Desktop、App 与 UI

- Desktop IPC 只从 Services 导入社区推荐运行时能力；不再从 Core 导入文件存储或 AI source。
- Preload、renderer API、App 和 UI 继续引用 Core 的领域类型或 Services 的稳定契约，不感知文件路径、缓存目录或 AI 请求细节。
- Prototype 与 Web 继续使用内存 / fixture adapter，不复制社区推荐业务规则。

## 实施切片

### 实现：迁移本地社区表与个人知识存储

- 将文件读写移入 `packages/services/src/community/`。
- Core 只导出类型、输入规范化和纯校验。
- 保持现有 JSON 文件名、数据格式、导入结果和用户可见行为不变。

### 实现：迁移 AI / light.gg 运行时 source

- 将配置使用、AI 网页检索、缓存 TTL 和缓存读写移入 Services。
- Core 保留 URL / 响应解析所需的纯函数；不得在 Core 中发请求或落盘。
- 保持“外部知识最低优先级、保留原始链接和查询时间”的现有数据规则。

### 整理：收口 Desktop IPC 与公开契约

- `community.ts` 仅调用 Services facade。
- 保留已有 IPC channel、renderer API 和 UI action，避免产品功能回归。
- 将个人知识相关类型从 Core 的运行时文件路径中拆出为纯领域入口，避免浏览器侧误引入 Node adapter。

### 整理：更新架构护栏

- 删除 `multi-platform-boundaries` 中社区推荐 Core IO 的历史白名单。
- 架构门禁应直接拒绝 Core 新增或保留的文件系统、缓存和外部请求依赖；`config/defaults.ts` 的平台路径 helper 继续作为明确例外。
- 不新增源码字符串形式的普通功能测试；只保留必要的架构边界检查和既有行为覆盖。

## 验收标准

1. Core 的社区推荐生产文件不再导入 `node:fs`、`node:path`，也不执行 AI / 网络调用。
2. Desktop 社区 IPC 不再从 Core 导入本地表、个人知识或 AI/light.gg 运行时实现。
3. 本地社区表、个人知识、DIM 愿望单和可选 AI/light.gg 推荐保持现有读取、保存、清除、缓存和错误恢复行为。
4. Prototype、Web 与 Desktop 不复制社区推荐规则，继续通过共享 UI、App 和 adapter 使用能力。
5. 架构门禁不再依赖社区推荐 Core IO 白名单。
6. `docs/todo.md` 在完成时移除 T7；长期包边界规则保留在 `docs/development.md`，本 backlog 不保留为历史档案。

## 非目标

- 不迁移 JSON-only Manifest supplement。
- 不重做资料库 SQLite、账号 Session、OAuth、Desktop IPC contracts 或共享 UI Shell。
- 不因为服务边界迁移改变推荐优先级、AI 产品行为或玩家可见文案。
- 不为未来可能的 Web 后端预先增加 HTTP server、数据库或远端同步层。
