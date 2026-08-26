// Vite 注入正式版本；Vitest 等非 Vite 运行时没有该变量时使用明确的开发版本。
export const webAppVersion = import.meta.env.VITE_APP_VERSION ?? "dev";
