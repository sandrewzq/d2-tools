# T58 子职业分层原型（两版）

2026-09-20 的子职业交互记录，配套 T58。原件留在 `.local-data/tmp/t58-subclass/` 没动，这里的是副本——`.local-data/` 被 git 忽略，放那里随时会丢。

## 这是什么

和 `../T58-loadout-flow-prototype/` 一样，是可点开看的**交互记录**，不是产品页面，不参与构建，不被任何包引用。里面的数字是示例数据，不是真实账号读取结果。

两版各回答一件事：

| 文件 | 是什么 | 状态 |
|---|---|---|
| `t58.html` | v1：一页三档的对照。「A 现状」是今天界面上实际长什么样，「B 改完」是要定的那套交互，「C 真配置」拿三个子职业跑同一套面板看空槽和长尾巴撑不撑得住 | 早期对照稿，已被 v2 取代 |
| `t58-flow.html` | v2：一条连续的步骤流，走完「入口 → 目标角色 → 起点 → 逐槽位 → 子职业 → 护甲约束与求解 → 采用并保存 → 穿戴核对 → 保存到游戏内槽位」 | **待确认**，步骤顺序以完整流程原型为准 |

v2 的 8 步：

| 步 | 标题 | 干什么 |
|---|---|---|
| 01 | 选入口 | 五条入口，差别只在草稿预填了什么，选定后都进同一个草稿编辑器 |
| 02 | 定目标角色，选起点 | 草稿一建好就自动压入编辑器 |
| 03 | 逐槽位选装备 | 8 个标准槽位：3 武器 + 5 护甲；子职业单独一格，不进这 8 格 |
| 04 | 读准当前子职业（T58 ①） | 从角色当前装备读出超能、技能、星象、碎片，分组显示，空位显式画出 |
| 05 | 护甲约束与求解（T58 ②） | 碎片属性加成从步骤 04 自动求和，替掉手输的「技能与碎片属性变化」 |
| 06 | 采用方案，存进草稿 | 选一套推荐方案写回 5 条护甲目标，同时写入 `armor_plan`，然后保存 |
| 07 | 穿戴核对 + 子职业闸门（T58 ③） | 执行前刷新账号、重新生成计划，并比对配装假定的子职业配置与角色此刻的配置 |
| 08 | 保存到游戏内槽位 | 穿戴核对通过后，把整个构筑写进一个 Bungie 官方槽位 |

## 文件

| 文件 | 用途 |
|---|---|
| `t58.html` | v1 三档对照，单文件自包含，直接打开 |
| `build-t58.mjs` | 生成 `t58.html` |
| `shoot-t58.mjs` | v1 截图（`view-*.png` / `gate-blocked.png`） |
| `t58-flow.html` | v2 八步流程，单文件自包含，直接打开 |
| `build-t58-flow.mjs` | 生成 `t58-flow.html`，步骤注册表（`STEPS`）在这里 |
| `shoot-t58-flow.mjs` | v2 逐屏截图（`flow-*.png`） |
| `flow-sizes.json` | v2 上一轮出图的每步尺寸，出图脚本会重写它 |

两份 HTML 的 `src=` 都是内联的 `data:image/svg+xml`，`href=` 都是页内锚点，没有外部文件。

搬进来时只改了 `build-t58.mjs` 和 `build-t58-flow.mjs` 里指向仓库根的那一行：新位置离根四层，原来三层。改动仅限取 `packages/ui/src/styles.css` 的路径。

## 重新生成

```bash
node build-t58-flow.mjs      # 重出 t58-flow.html
node shoot-t58-flow.mjs      # 重出 flow-step-*.png + flow-all.png

node build-t58.mjs           # 重出 t58.html
node shoot-t58.mjs           # 重出 view-*.png / gate-blocked.png
```

`build` 会把 `packages/ui/src/styles.css` 整份内联进 HTML，所以重出的效果取决于当时那份 CSS，不会等于 2026-09-20 那一版。

`shoot-t58-flow.mjs` 需要 playwright。图不进仓库（`.gitignore` 已挡），`flow-all.png` 一张 5 MB。

截图还在 `.local-data/tmp/t58-subclass/`（13 MB）；那边是临时目录，丢了用上面两条命令重出。

## 相关

- T58 任务说明：`../T58-ingame-loadout-subclass-fidelity.md`
- 完整流程原型：`../T58-loadout-flow-prototype/README.md`
- UI 合同：`../../references/ui-specs/application-workspaces.md`
