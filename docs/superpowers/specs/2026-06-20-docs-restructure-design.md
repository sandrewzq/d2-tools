# d2-tools 文档重构设计

日期：2026-06-20

## 背景

当前仓库已经有较完整的文档集合，但入口较多，内容存在重复，正式文档和历史设计/计划文档混在一起。对于普通玩家来说，理解成本偏高；对于开发者来说，也不容易快速判断哪份文档才是当前有效版本。

这次重构目标不是补更多文档，而是减少正式文档数量、重组结构、统一口径，让项目看起来更像一个成熟的公开分发项目。

## 目标

1. 把正式文档压缩到 8 个以内。
2. 让普通玩家先看 `README` 就能找到下载、快速开始和后续文档入口。
3. 让玩家使用说明、Bungie 配置、FAQ、安全说明各自职责清晰。
4. 让“当前状态”和“未来路线图”分开，不再互相重复。
5. 把历史设计稿和阶段计划迁到归档区，不再充当当前项目主文档。
6. 统一 `d2-tools` 命名，清理旧 `d2-service` 残留引用。
7. 在参考方向中补充 `D2Checkpoint`，明确它对应 checkpoint 获取与保存流程参考。

## 非目标

1. 不重写历史归档文档的内部技术内容，只调整位置和入口关系。
2. 不在这次重构里新增产品功能说明之外的营销内容。
3. 不为了文档重构去修改现有产品实现逻辑。
4. 不保留多份表达同一信息的正式文档。

## 目标结构

正式文档最终保留：

```text
README.md
CHANGELOG.md
docs/
  user-guide.md
  bungie-setup.md
  faq.md
  security.md
  project-status.md
  roadmap.md
  development.md
  archive/
    README.md
    design/
    plans/
```

其中：

- `README.md`：项目首页入口
- `CHANGELOG.md`：版本变更记录
- `docs/user-guide.md`：玩家主使用手册
- `docs/bungie-setup.md`：Bungie Application 配置说明
- `docs/faq.md`：常见问题与排障
- `docs/security.md`：安全边界与本地数据说明
- `docs/project-status.md`：产品定位、当前能力状态、边界和参考方向
- `docs/roadmap.md`：未来路线图
- `docs/development.md`：开发、测试、打包、发布和结构说明
- `docs/archive/`：历史材料

## 迁移策略

### 保留并重写

- `README.md`
- `CHANGELOG.md`

### 改名并重写

- `docs/USER_GUIDE.md` -> `docs/user-guide.md`
- `docs/BUNGIE_SETUP.md` -> `docs/bungie-setup.md`
- `docs/TROUBLESHOOTING.md` -> `docs/faq.md`
- `docs/FEATURES.md` -> `docs/project-status.md`

### 合并后删除原文件

- `docs/REQUIREMENTS.md`：并入 `docs/project-status.md`
- `docs/ARCHITECTURE.md`：并入 `docs/development.md`
- `docs/ROADMAP.md`：重写为 `docs/roadmap.md`
- `docs/DEVELOPMENT.md`：重写为 `docs/development.md`
- `docs/SECURITY.md`：重写为 `docs/security.md`

### 迁入归档区

- `docs/design/d2-tools-design.md` -> `docs/archive/design/d2-tools-design.md`
- `docs/superpowers/plans/*` -> `docs/archive/plans/*`

### 新增

- `docs/archive/README.md`

## 各文档职责

### README.md

只承担入口作用，包含：

- 项目简介
- 适用对象
- 下载和运行方式
- 3 分钟快速开始
- 核心功能概览
- 文档导航
- 参考方向
- 开发者入口

不放详细 Bungie 字段说明、不放完整功能矩阵、不放大段路线图。

### docs/user-guide.md

按真实使用顺序组织：

1. 安装与启动
2. 数据目录与升级
3. 首次启动引导
4. 登录 Bungie
5. 初始化资料库
6. 账号页使用
7. 仓库页使用
8. 资料库使用
9. AI 助手使用
10. 设置页使用
11. 写操作边界
12. 常见日常流程示例

### docs/bungie-setup.md

只做 Bungie Application 创建与配置映射，重点是字段怎么填、回调地址怎么填、软件里对应填哪里、常见报错怎么处理。

### docs/faq.md

按玩家问题组织，而不是按技术模块组织。重点覆盖：

- 空白页
- 登录失败
- 资料库搜索不到
- AI 无法使用
- 写操作不可点
- 数据迁移与覆盖更新
- 游戏里看不到本地标记
- 今日/本周数据为空

### docs/security.md

只写玩家关心的安全边界：

- 本地保存什么
- 不会上传什么
- AI 会读取什么
- AI 不会读取什么
- 覆盖安装是否会删数据
- 写操作能做什么和不能做什么
- 为什么不能直接分解装备

### docs/project-status.md

定位为“项目现状和边界文档”，结构固定为：

- 项目定位
- 当前版本状态
- 已支持
- 部分支持
- 未支持
- 明确不做
- 参考方向

这里补充：

- `D2Checkpoint`：checkpoint 获取、保存流程和入口体验参考

### docs/roadmap.md

只写未来，不重复当前状态。按主线组织：

- 仓库整理体验
- 今日/本周信息
- AI 助手
- 活动与复盘
- 桌面体验
- 高级接口方向

### docs/development.md

给开发者一站式说明：

- 仓库结构
- 核心模块边界
- 本地开发
- 测试
- 打包
- Release 流程
- 文档结构
- 归档说明

## 写作原则

1. 玩家优先，开发者其次。
2. 一份文档只负责一件事。
3. 同一信息只保留一个权威位置。
4. 少概念说明，多具体操作。
5. 中文自然、简洁、少工程黑话。
6. 不夸大，不猜测，不把参考项目写成照抄关系。
7. 正式文档只保留当前有效信息，历史材料全部下沉到归档区。

## 链接与命名规则

1. 统一使用 `d2-tools` 名称。
2. 清理 `d2-service` 的正式文档入口引用。
3. README 和正式文档中的链接都指向新结构。
4. 归档文档不从 README 主入口直接展开，只在需要时通过归档说明进入。

## 错误处理与兼容性

1. 如果旧文档路径被删除，README 和正式文档内必须更新到新路径。
2. 归档区保留原材料，避免丢失历史上下文。
3. 对于仍然有价值但不适合做主入口的内容，迁入归档而不是直接删除。

## 测试与验收

### 人工验收

1. 新用户打开 `README`，能在 3 分钟内找到下载、快速开始和下一步文档。
2. 普通玩家只看 `README`、`user-guide`、`bungie-setup`、`faq` 就能完成安装、登录和基础使用。
3. 想判断项目做到哪了，只需要看 `docs/project-status.md`。
4. 想看后续计划，只需要看 `docs/roadmap.md`。
5. 开发者只需要看 `docs/development.md` 就能找到开发和打包命令。

### 一致性检查

1. 正式文档数量不超过 8 个。
2. 所有正式文档链接可达。
3. 没有 README / 状态文档 / 路线图三份重复解释同一件事的大段内容。
4. 参考方向中已补充 `D2Checkpoint`。
5. 没有明显保留旧项目名 `d2-service` 的对外表述。

## 实施顺序

1. 新建目标目录和归档目录。
2. 迁移历史设计稿和阶段计划到归档区。
3. 重写 `README.md`。
4. 重写玩家向文档：`user-guide`、`bungie-setup`、`faq`、`security`。
5. 重写项目向文档：`project-status`、`roadmap`。
6. 重写 `development.md`。
7. 重写 `CHANGELOG.md` 的近期版本描述，使其与当前项目命名一致。
8. 最后统一检查链接、命名和重复内容。
