export const defaultLocale = "zh-CN" as const;

export const copyRules = {
  defaultLocale,
  visibleLanguage: "用户可见文案默认使用中文",
  migration: "新增或调整界面文案时，优先沉淀到当前领域的 copy 对象；暂不提供语言切换入口。",
  naming: "代码标识符、API 名称、文件路径、命令和上游协议名称保留原文。"
} as const;

export const commonCopy = {
  actions: {
    close: "关闭",
    cancel: "取消",
    confirm: "确认",
    save: "保存",
    retry: "重试"
  },
  status: {
    loading: "正在加载...",
    empty: "暂无数据",
    failed: "读取失败",
    ready: "已就绪"
  }
} as const;
