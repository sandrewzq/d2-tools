# 跨端模块边界收口

> 状态：待推进
> 更新时间：2026-07-14
> 关联任务：`docs/todo.md` T4 跨端模块边界收口

## 目标

当前跨端结构已经稳定为：

```text
core -> services -> app -> ui -> Desktop / Web / Prototype
```

本任务不再包含页面视觉、人工多分辨率验收、账号数据补齐、仓库交互或装备详情打磨，只处理仍会增加跨模块耦合的三项代码边界问题。

## 已完成并移出范围

- `core` 中的本地文件、缓存和审计运行时实现已经迁出，`packages/core/src` 不再依赖 `node:fs`。
- Prototype、Web 和 Desktop 已共同消费 `packages/ui` 的产品 Host 和页面 View。
- 页面视觉与体验问题不再作为当前待办；后续只有出现明确用户问题时，按对应菜单单独记录。

## 剩余问题

### 1. `app` 只有一个大型导出入口

现状：`@d2-tools/app` 只暴露根入口，账号、仓库、配装、资料库、商人和 AI 的类型与函数全部聚合在 `src/index.ts`。`createHomeDashboardWorkspace`、`createHomeDashboardActions` 等无行为转发仍然存在。

影响：调用者容易依赖不属于自己的领域，根文件持续成为高冲突文件；Desktop、Web 和 Prototype 的依赖边界不够清楚。

处理方式：

- 增加 `./account`、`./vault`、`./loadouts`、`./library`、`./home`、`./vendors`、`./settings`、`./assistant` 分域导出。
- 按领域迁移调用者后收缩根导出。
- 删除只返回输入、没有规范化或默认行为的公开 creator。

完成标准：新调用者只从所属领域入口导入；根入口不再聚合所有页面实现。

### 2. Desktop 菜单 Provider 仍是集中转发

现状：`useDesktopProductShell.tsx` 仍集中组装全部菜单 Props，`DesktopMenuProviderContextValue` 同时保存所有菜单数据；各菜单 Provider 主要负责取值后转发。

影响：修改一个菜单经常需要触碰公共 Context 和产品壳，容易产生多人冲突并误伤其他菜单。

处理方式：

- 产品壳只保留导航、偏好、当前账号、选中角色、装备详情、全局 AI 和后台任务等跨菜单状态。
- 每个菜单 Provider 自己组合本菜单的 ViewModel、加载状态和操作回调。
- 按商人、资料库、账号、配装、仓库、首页顺序逐个迁移，首页最后处理。

完成标准：新增或修改单个菜单 Props 时，不需要同步修改所有菜单的公共 Context；`useDesktopProductShell` 不再负责生成全部菜单 Props。

### 3. Web snapshot 契约没有定型

现状：`WebPageSnapshot.payload` 仍是 `unknown`，页面 snapshot 虽有 adapter 和测试，但没有稳定的分页面 DTO。

影响：当前 fixture 可以运行，但接入真实后端时缺少编译期约束，错误数据只能在运行时暴露。

处理方式二选一：

- 接通：为每类页面定义带判别字段和版本的 payload，并让真实 Web 入口消费。
- 收缩：删除未实际使用的 page snapshot 契约，Web 保持明确的 fixture runtime。

完成标准：不存在未消费的 `unknown` 页面数据接口；保留的 snapshot 必须有明确 DTO 和真实调用者。

## 执行顺序

1. `app` 分域导出和浅层转发清理。
2. Desktop 菜单 Provider 逐个下沉。
3. Web snapshot 选择接通或删除。

三个切片独立提交，不与页面视觉、功能需求或领域规则修改混在一起。

## 总完成标准

1. `@d2-tools/app` 按领域暴露接口，根导出不再是默认大型入口。
2. Desktop 单个菜单可以独立调整，不需要修改全菜单 Context。
3. Web snapshot 有明确 DTO 和消费者，或已经删除。
4. 完成后更新 `docs/todo.md`，有效长期规则继续保留在 `docs/development.md`。
