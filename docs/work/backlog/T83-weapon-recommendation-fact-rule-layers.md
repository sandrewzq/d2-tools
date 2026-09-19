# T83：武器详情的推荐区按对象身份分事实层 / 规则层

> 状态：✅ 已通过实窗验收（2026-09-19）
> 合同：`docs/work/references/ui-specs/equipment-details.md`
> 来源：原记于 `docs/todo.md` 的 T83 行，2026-09-19 迁入本文件，细节以本文件为准。

## 一、问题

资料库定义和商人 Offer 没有「本件」，而旧的单条渲染路径靠 `requirement_state` / `instance_owned`
有没有值猜自己拿到了哪一层，于是给没有本件的东西画了「来源要求 ｜ 本件拥有」对照表：
第二列结构性为空，还写出「本件没有这个推荐项」。

## 二、改法（已改完）

1. `WeaponDetailContent` 按 `model.context.kind === "account_instance"` 分流成两个渲染器，
   账号实例保持原证据卡不动，定义 / 商人走新的规则层（一个来源一张卡，卡内一个栏位一张子卡，
   复用 `WeaponPerkEntry` 与既有等宽列模板）。
2. 两列对照组件 `RecommendationSlotComparison` 只留给账号实例，规则层连引用都没有
   （架构守卫已钉：`packages/desktop/test/architecture-maintenance.test.ts:546` 断言
   `<RecommendationSlotComparison` 在详情里只出现 1 次）。
3. 整份推荐集的免责声明从逐卡重复改成推荐区顶部说一次，来源自己写的说明逐卡显示。
4. 删掉 `WeaponRecommendation` 上没人填也没人读的候选字段
   （`match` / `match_notes` / `masterwork_names` / `mod_names` / `requirement_state` /
   `matched_*` / `instance_owned`）与随之失效的 CSS。

## 三、与拍板口径的一处偏差

`presentation: "combo"` 全仓没有生产者，因此没有单独做「一组一卡」的组合布局，
两种 `presentation` 共用逐栏子卡，由徽标显示「候选池」/「完整组合」区分。

## 四、复验要点

- 三种 `context.kind`（账号实例 / 资料库定义 / 商人 Offer）各自的推荐区形态；
- 规则层里不再出现两列对照表，也不再出现「本件没有这个推荐项」；
- 账号实例那侧的推荐区与改动前一致；
- 免责声明只在推荐区顶部出现一次。

## 五、验证记录

2026-09-19 实窗验收通过；同日 `pnpm ci:local` 跑绿。
