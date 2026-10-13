// AI 助手现在的体验还不达标，先把入口全部藏起来：顶栏按钮、侧栏按钮、设置里的 AI 页、
// 状态条上的 AI 项和装备详情里的 AI 解读都不再渲染。抽屉、设置面板、IPC 和适配器都留着，
// 想恢复时把这里改回 true 即可。
export const isAiAssistantVisible = false;

// 配装还没做完，先把侧栏入口撤掉：菜单项不渲染，`VITE_D2_VISUAL_PAGE` 指定的初始页也落回首页。
// 页面、ViewModel、IPC 和 core 里的配装逻辑都留着，想恢复时改回 true。
export const isLoadoutsVisible = false;
