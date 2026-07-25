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

## 导航与章节

详情章节导航是页内锚点导航，不使用 `role="tablist"`，点击后滚动到同页章节并保留所有章节正文。当前章节使用 `aria-current="location"`。目标来源选择才是互斥内容切换，必须使用完整 Tab 模式并连接对应 `tabpanel`。

## 领域可变区

- 武器：配置、完整 Perk 池、目标匹配、升级与锻造。
- 护甲：配置、属性条件、套装/异域能力、升级状态、目标匹配。

领域区可增加自己的 `data-contract-id`，但不得改变详情壳、章节导航、实例栏和状态层的语义角色。
