# 统一装备详情骨架合同

武器和护甲详情共用稳定合同标识 `detail.dossier`。两者只可替换身份事实和领域章节，不得各自重排外壳、实例栏、遮罩或状态层。

## 固定结构

```text
data-prototype-root="detail-dossier"
  prototype-bar                         (仅原型工具)
  stage
    main.dossier[data-contract-id]
      dossier-toolbar                   (关闭详情)
      dossier-scroll[data-scroll-region="page"]
        identity
        detail-sticky
          section-nav                   (章节锚点导航)
        dossier-workspace[data-surface="split"]
          dossier-main
          instance-rail[data-surface="drawer"]
      detail-state-layer                (仅原型状态覆盖层)
  rail-scrim                            (抽屉遮罩)
```

实例栏在宽屏是工作区的上下文栏；`<=1360px` 时是右侧抽屉。抽屉必须有标题、关闭按钮、遮罩关闭、`Escape` 关闭及关闭后返回触发按钮焦点。武器与护甲使用相同的 DOM 位置、层级和交互条件。

详情状态层是 `role="status"` 的详情私有覆盖公告。`data-prototype-root="detail-dossier"` 必须自带初始 `data-state="normal"`，所有状态切换只更新此属性；正常/空映射为 `neutral`，加载/进行中为 `pending`，部分可用/禁用为 `warning`，失败为 `error`。它不能复用 `state-frame` 或其他通用表面组件，以免正常态被全局状态框样式常驻显示。详情 CSS 只能使用全局层级 token，禁止为实例抽屉、遮罩或原型控制栏写数字 `z-index`。

## 文字与颜色

详情页的最终字号与颜色由 `assets/prototype-typography.css` 的 DetailDossier 共享层决定：身份标题使用 `display`，章节标题使用 `18px` 的 `display` 章节级，实例与字段名使用 `context`，说明文字使用 `reading`，来源与辅助说明使用 `trace`。主文本、正文、元信息、操作与状态分别只使用 `--text`、`--body`、`--muted`、`--blue` 和状态 token；武器/护甲私有 CSS 不再作为最终文字颜色所有者。详情正常态由根节点 `data-state="normal"` 唯一控制，状态覆盖层默认隐藏。

## 导航与章节

详情章节导航是页内锚点导航，不使用 `role="tablist"`，点击后滚动到同页章节并保留所有章节正文。当前章节使用 `aria-current="location"`。目标来源选择才是互斥内容切换，必须使用完整 Tab 模式并连接对应 `tabpanel`。

## 领域可变区

- 武器：配置、完整 Perk 池、目标匹配、升级与锻造。
- 护甲：配置、属性条件、套装/异域能力、升级状态、目标匹配。

领域区可增加自己的 `data-contract-id`，但不得改变详情壳、章节导航、实例栏和状态层的语义角色。
