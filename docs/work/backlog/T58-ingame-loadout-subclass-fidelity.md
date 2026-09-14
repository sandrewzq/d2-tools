# T58 游戏内配装完整子职业配置

当前 Bungie `characterLoadouts` 已返回子职业实例和 `plugItemHashes`，但旧模型只显示平铺 Plug，复制到应用配装时还会把子职业当普通装备目标。

首批修正保留原始 socket index，按 Plug 名称、类型和 category identifier 生成超能/技能、星象、碎片、其他配置分组；应用配装复制生成 `subclass_target`，DIM 导入/导出保留 `socket_overrides`。

后续验收需要使用真实账号核对不同职业、棱镜子职业、空槽位和旧版本子职业。Manifest 增加 `DestinySocketTypeDefinition` 后，应以正式 socket category 替换当前启发式分类。
