# 数据来源、参考项目与鸣谢

本文说明 d2-tools 使用的官方数据来源、社区资料来源，以及已经参考过的项目和功能。来源关系必须区分：参考项目不等于运行时依赖，社区推荐不等于 Bungie 官方结论。

## 官方数据来源

| 来源 | 提供内容 | 使用位置 | 关系 |
| --- | --- | --- | --- |
| Bungie API | 账号、角色、装备、活动、商人和实时轮换状态 | 首页、账号、仓库、资料库、商人 | 官方事实来源 |
| Destiny 2 Manifest | 装备、Perk、活动、来源和版本定义 | 资料库、仓库、配装、首页 | 官方事实来源 |

- Bungie API 文档：<https://bungie-net.github.io/>
- Destiny 2 Manifest：<https://www.bungie.net/7/en/Manifest>

账号事实和实时轮换只通过本应用直接请求 Bungie 官方接口获取，不通过 DIM 或其他第三方工具中转。

## 社区资料来源

### DIM Wish List Sources

- GitHub：<https://github.com/48klocs/dim-wish-list-sources>
- 上游文件：该仓库提供多份愿望单文本；d2-tools **不固定引用任何一份**，文本由玩家给出链接或选择本地文件导入，链接随来源记下，之后可手动再次同步。
- 提供内容：社区武器推荐 Roll、作者块、标签和 Wishlist 规则格式。
- 使用位置：仓库推荐、武器详情。
- 限制：只反映愿望单作者的偏好，不等于 Bungie 官方结论；单条规则的展开行不能解释为投票数。
- 许可：MIT（2026-09-20 核对仓库 LICENSE）。

## 参考项目与功能

以下项目用于参考产品流程、交互组织、数据格式或算法表达。除明确注明外，均不是 d2-tools 的运行时依赖，也不代表这些项目为 d2-tools 背书。

### Destiny Item Manager（DIM）

- GitHub：<https://github.com/DestinyItemManager/DIM>
- 在线访问：<https://app.destinyitemmanager.com/>
- 参考内容：仓库筛选、配装流程、愿望单表达、清理建议、装备转移和写操作确认。
- 数据使用：突袭 / 地牢掉落表（`packages/services/src/community/activityLoot.ts`）从 Bungie Collectible 的 `sourceString` / `sourceHash` 推导，DIM 的 MIT 来源索引只用来交叉核对，不是这份数据的来源。
- 当前关系：功能与交互参考，不读取 d2-tools 账号，也不代替 Bungie API。
- 许可：MIT（2026-09-20 核对仓库 LICENSE.md）；d2-tools 未复制其页面代码。

### D2ArmorPicker

- GitHub：<https://github.com/Mijago/D2ArmorPicker>
- 在线访问：<https://d2armorpicker.com/>
- 参考内容：属性目标、异域限制、多方案比较和护甲求解流程。
- 当前关系：配装流程参考，不是运行时依赖。
- 许可：AGPL-3.0（2026-09-20 核对仓库 LICENSE）。d2-tools 只参考流程、未复制其代码，也不把它作为运行时依赖。

### d2-armor-solver

- GitHub：<https://github.com/MIGO-OvO/d2-armor-solver>
- 在线访问：<https://migo-ovo.github.io/d2-armor-solver/>
- 参考内容：Armor 3.0 的 `+5 / +10` 模组目标、可达性、缺口和方案表达。
- 当前关系：算法和交互表达参考，不是运行时依赖。
- 许可：MIT（2026-09-20 核对仓库 LICENSE）；d2-tools 未复制其实现。

### Roll Report

- GitHub：<https://github.com/cecilbowen/roll-report>
- 在线访问：<https://roll.report/>
- 参考内容：Roll 差异和独特 Perk 组合的识别思路。
- 当前关系：算法思路参考，不直接调用其线上接口。
- 许可：MIT（2026-09-20 核对仓库 LICENSE.md）。

### d2-additional-info

- GitHub：<https://github.com/DestinyItemManager/d2-additional-info>
- 参考内容：赛季、活动、来源、催化剂和模组关系的 Manifest 补充流程。
- 当前关系：数据生成流程参考，不是玩家账号数据来源，也不能替代 Bungie Manifest。
- 许可：MIT（2026-09-20 核对仓库 LICENSE.md）。

### Starside · Destiny 2 中文资料台

- 在线访问：<https://starside.work/>
- 数据源与鸣谢：<https://starside.work/sources/index.html>
- 参考内容：中文资料、武器与护甲信息、机制说明、伤害资料和攻略的组织方式。
- 当前关系：内容与信息组织参考，不是运行时数据来源。
- 限制：静态资料页面不能证明实时轮换；当前轮换仍以登录 Bungie 后读取的实时数据为准。
- 许可：以原站声明为准，不复制未明确授权的内容。

## 鸣谢与边界

- 感谢 Bungie API 和 Destiny 2 Manifest 提供公开游戏资料接口与定义数据。
- 感谢 DIM、DIM Wish List Sources、D2ArmorPicker、d2-armor-solver、Roll Report、d2-additional-info 及 Destiny 2 社区维护者提供公开项目、数据格式和产品思路参考。
- d2-tools 的账号令牌、Client Secret、API Key 和私人库存不会发送给上述社区项目。
- 本地用户导入的愿望单、自定义推荐、攻略和个人笔记属于用户内容，暂不列入本页公开来源清单。
- Destiny 2 及相关名称、标识为 Bungie, Inc. 的商标。d2-tools 是非官方社区工具，与 Bungie, Inc. 无从属关系。
- 按 Bungie Game Content Usage Rules 要求附上的声明：

  > © Bungie, Inc. All rights reserved. Destiny, the Destiny Logo, Bungie and the Bungie logo are among the trademarks of Bungie, Inc.

## 代码同源核对

2026-09-20 对 `packages/*/src` 与参考项目做了一次 token 级 10-gram 重合度检查，目的是确认没有抄上游代码。方法：把文件切成标识符和符号 token，取连续 10 个 token 为一组，比较本仓每个源文件与上游源文件的重合比例（分母是本仓那个文件的 10-gram 总数，所以文件越小、比例越容易被少量样板抬高）。

| 对照项目 | 最高一对 | 重合内容 |
| --- | --- | --- |
| roll-report | 2.3%（12 个 10-gram） | `.sort((a,b)=>a.name.localeCompare(b)`、`value===null||value===undefined`、`new Promise((resolve,reject)=>` 这类语言样板 |
| D2ArmorPicker（AGPL-3.0） | 9.1%（3 个 10-gram） | 本仓一个 2 行的类型再导出文件，与上游共用的只是 `{ hash: number; name: string; icon?: string }` 这个 Manifest 字段形状 |
| d2-skill | 16.2%（23 个 10-gram） | `packages/core/src/oauth/login.ts` 与上游的 token 响应类型，重合的是 `access_token` / `token_type` / `expires_in` / `refresh_token` / `refresh_expires_in` 这条 Bungie 协议字段链 |

三个对照都没有整文件或成段复制的痕迹，重合停留在语言样板、Manifest 字段形状和协议字段名上。d2-skill 仓库没有 LICENSE 文件，d2-tools 没有采用它的代码。

## 维护规则

- 官方实时事实优先于社区资料和本地派生结果。
- 社区资料必须保留原始链接、作者或维护者、用途和限制说明。
- 参考项目必须标明“功能参考 / 算法参考 / 数据格式参考”以及是否为运行时依赖。
- 未确认再分发许可的资料不随公开安装包发布，只能作为受控的本地数据输入。
- 来源内容发生变化时，更新本文、应用内来源登记和对应的变更记录。
