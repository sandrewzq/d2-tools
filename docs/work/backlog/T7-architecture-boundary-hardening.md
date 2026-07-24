# 架构边界收口

> 状态：第二轮迁移切片已推进，等待 CI / Release 验证并按业务触达继续迁移

## 目标

基于 `outputs/architecture-review-2026-07-17.md` 的 15 项发现，优先封闭会继续产生新债的 seam，删除重复状态真相，降低多人并行冲突。采用渐进迁移，不进行大爆炸式 package 重写。

## 本轮已完成

- core 新增 IO / HTTP 债务护栏：允许现有兼容文件，阻止新增 Node runtime 依赖和直接 Bungie HTTP 调用。
- Desktop 活动历史生产 HTTP 调用迁到 services Adapter，core 保留领域类型和汇总逻辑。
- core 活动历史模块已删除旧 HTTP 包装；action log 文件读写迁到 services，core 只保留领域类型和纯格式化逻辑。
- 新建 `packages/desktop/src/contracts/`，Account、Actions、Manifest、Vendors、Daily 由 main、preload、renderer API 共用单一 transport 契约。
- 删除 preload / main 对 renderer API 的反向类型依赖，并增加 renderer 边界护栏。
- `account:summary` 前台返回与后台任务共享同一个 operation Promise。
- 删除 Account IPC 的第二份 snapshot/index；实例详情从 AccountSession 当前 snapshot 派生。
- GameData 普通请求按操作设置超时，正常响应、发送失败、worker error/exit/close 都会清理 pending；连续两次超时会终止并惰性替换卡死 worker。
- 建立最小 Desktop IPC 错误模型，先覆盖 Account、Manifest、GameData 和写操作，保留现有 `Promise<T>` 调用界面与 `message` 兼容性。
- 首页和账号自动读取会等待资料库 ready；Home/Account 对资料库未就绪使用稳定错误 code，开发启动脚本显式使用 UTF-8 输出中文异常。
- `packages/ui/src/styles.css` 改为稳定顺序聚合入口，产品样式物理拆到 foundation、shell、workspace、components 和菜单目录。
- i18n copy 按 shell/home/account/vault/loadouts/library/vendors/settings 分域，原入口只做聚合。
- 新增 `@d2-tools/ui/fixtures` typed foundation，Prototype / Web 先共用账号和状态 fixture 基础结构，版本由各平台构建注入，平台场景继续独立。
- typed fixture foundation 继续覆盖活动摘要和资料库默认筛选，Prototype / Web 不再用宽松 `any` 重复表达这些稳定 DTO。
- Desktop 生产代码停止跨 package `/src/` 深导入；core 重复根 export 已清理；对应架构护栏用于阻止回归。
- Desktop main、preload、renderer 使用明确的独立构建 / 类型检查入口；preload 由 Vite 直接产出 CJS bundle，已删除基于 TypeScript 输出的字符串转换。
- core 不再持有真实 Bungie HTTP client；账号、日常、周常和实时来源读取通过注入的请求 seam 调用，由 services 的统一 client 负责超时、取消和错误语义。
- Account summary 定义请求、AccountSession 补丁、Manifest 文件处理、商人身份归一化、首页图标生成和资料库文本辅助已各自拆出独立模块，原入口保持兼容。
- services 错误模型已升级为可抛出的 `D2ServiceError`；Desktop IPC 只按稳定错误码和原因类别映射，不再解析中文错误文案。

## 后续工作

以下工作不应阻塞当前功能开发，按领域触达逐步完成：

- vault tags、aliases、wishlist、target rules、loadout、library history 和 audit 等独立 IO store 已迁到 services；社区推荐的读写实现仍与 core 推荐编排直接组合，后续必须连同编排模块一起迁移，避免引入循环依赖。
- 按后续真实功能触达继续细化热点模块，但本轮已完成它们最先应分离的网络、补丁、文件、身份、图标和文本职责；保留原 public interface。
- 继续收口 Prototype / Web 的 loadout、library data、community match 等宽松 fixture；共享 factory 只表达稳定 DTO，不合并平台场景状态。
- 让 renderer 对稳定错误 `code` / `causeCategory` 提供差异化登录、重试、修复和冲突提示；迁移低频 IPC 与后台任务最终失败。
- 只有新增真实 HTTP 业务 endpoint 时，才补 services composition、请求限制、取消、typed error mapping 和 observability。

## Release 门禁

以下清理必须等待 `tools\git-auto-release.cmd` 完成正式发版，并至少观察一个稳定 Release 与一次真实回滚：

- 删除 SQLite 已覆盖的旧 JSON 主链路。
- 删除旧 IPC / core HTTP / store 兼容入口。
- 收缩 UI / app / core 根入口的兼容导出。

## 验收

- 普通 CI 通过 frozen install、行为测试、架构测试和类型检查。
- Desktop dev、unpacked、NSIS clean install、覆盖安装、离线启动均可用。
- Manifest 激活中断和回滚不丢失上一版可用资料库。
- Account snapshot、GameData query、Manifest activation/rollback 具有可比较的诊断基线。
- 稳定 Release 后再更新本 backlog 与 `docs/todo.md`，执行兼容层删除。
