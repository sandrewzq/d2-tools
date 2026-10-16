import { loadConfig } from "@d2-tools/services/config/store";

/** 与持久化配置 `features.interface_locale` 取值一致。 */
export type MainLocale = "zh-CN" | "en-US";

/**
 * en-US 覆盖表。
 *
 * key 就是中文原文——zh-CN 侧 key 即最终展示文本，不单独维护 zh 表；
 * en-US 侧用同一段中文原文为 key 查英文，查不到就退回 key 本身，不会渲染成空白。
 * 译法优先对齐 `packages/ui/src/i18n/copy/` 里已经出现的同义句，避免同一句话两种英文。
 */
const enUsOverrides: Record<string, string> = {
  // 原生对话框
  "导出英文武器推荐模板": "Export English weapon recommendation template",
  "导出中文武器推荐模板": "Export Chinese weapon recommendation template",
  "CSV 文件": "CSV file",
  "导出可编辑武器推荐": "Export editable weapon recommendations",
  "选择人工推荐表格": "Select manual recommendation table",
  "推荐表格": "Recommendation table",
  "选择愿望单文本文件": "Select wishlist text file",
  "愿望单文本": "Wishlist text",
  "创建 d2-tools 便携备份": "Create d2-tools portable backup",
  "d2-tools 便携备份": "d2-tools portable backup",
  "恢复 d2-tools 便携备份": "Restore d2-tools portable backup",
  "d2-tools 备份": "d2-tools backup",
  "恢复便携备份": "Restore portable backup",
  "将恢复 {count} 组用户数据和本地偏好。": "This restores user data and local preferences for {count} groups.",
  "恢复不会导入或覆盖账号令牌、Bungie/AI 密钥和当前数据目录。现有用户数据会先保存为本机回滚备份。是否继续？": "Restoring does not import or overwrite account tokens, Bungie/AI keys, or the current data folder. Existing user data is saved as a local rollback backup first. Continue?",
  "恢复": "Restore",
  "取消": "Cancel",
  "d2-tools 启动失败": "d2-tools failed to start",
  "{message}\n\n请重新启动应用；如果问题持续，请把设置页中的诊断信息提供给开发者。": "{message}\n\nRestart the app. If the problem persists, share the diagnostics from the Settings page with the developer.",

  // 后台任务（title / message / context.update message）
  "同步游戏内物品状态": "Sync in-game item state",
  "写入已完成，正在同步 {count} 项变化。": "Write finished. Syncing {count} changes.",
  "该确认任务已被同范围的新写入操作替代。": "This verification task was replaced by a newer write on the same scope.",
  "已同步 {matched}/{accepted} 项变化，另有 {failed} 项提交失败。": "Synced {matched}/{accepted} changes; {failed} submissions failed.",
  "已同步 {matched} 项变化。": "Synced {matched} changes.",
  "写入已完成，Bungie Profile 更新较慢；应用会继续同步。": "Write finished; Bungie Profile is slow to update. The app will keep syncing.",
  "写入已完成，正在同步（已匹配 {matched}/{expected}）。": "Write finished. Syncing ({matched}/{expected} matched).",
  "写入已完成，状态同步暂时不可用；应用会自动重试。{error}": "Write finished, but state sync is temporarily unavailable; the app retries automatically. {error}",
  "分析仓库推荐": "Analyze vault recommendations",
  "正在匹配内置推荐知识库、DIM Wishlist 和自定义推荐规则。": "Matching against the built-in recommendation knowledge, DIM Wishlist, and custom recommendation rules.",
  "检查应用更新": "Check app updates",
  "正在连接更新服务。": "Connecting to update service.",
  "下载应用更新": "Download app update",
  "正在下载应用更新。": "Downloading app update.",
  "更新 {version} 已下载，等待重启安装。": "Update {version} downloaded. Restart to install.",
  "刷新商人库存": "Refresh vendor stock",
  "正在读取商人库存与角色上下文。": "Reading vendor stock and character context.",
  "缓存游戏资源": "Cache game assets",
  "检查资料库版本": "Check manifest version",
  "缺少 Bungie API Key，无法检查资料库版本。": "Missing Bungie API key; cannot check the manifest version.",
  "正在检查 Bungie Manifest 最新版本。": "Checking the latest Bungie Manifest version.",
  "发现资料库新版本 {version}，已转入后台更新。": "New manifest version {version} found. Updating in the background.",
  "发现资料库内容更新，已转入后台更新。": "New manifest content found. Updating in the background.",
  "资料库已是最新版本：{version}。": "The manifest is already up to date: {version}.",
  "未知版本": "unknown version",
  "更新资料库": "Update manifest",
  "正在清理并重建 Destiny 2 资料库。": "Cleaning up and rebuilding the Destiny 2 manifest.",
  "正在后台更新 Destiny 2 资料库。": "Updating the Destiny 2 manifest in the background.",
  "缺少 Bungie API Key，无法更新资料库。": "Missing Bungie API key; cannot update the manifest.",
  "资料库已更新至 {version}，搜索和详情已恢复。": "Manifest updated to {version}. Search and details are back.",
  "读取最近活动": "Read recent activity",
  "正在同步角色最近活动。": "Syncing recent character activity.",

  // 更新快照（设置页直接渲染 user_message / update_source_label）
  "开发环境不会检查线上更新。打包安装后会使用正式更新通道。": "The development build does not check for online updates. Packaged installs use the official update channel.",
  "开发环境不会下载线上更新。打包安装后会使用正式更新通道。": "The development build does not download online updates. Packaged installs use the official update channel.",
  "正在下载更新，下载完成后可以手动重启安装。": "Downloading the update. You can restart to install manually when it finishes.",
  "发现新版本 {version}，可先下载，下载完成后再重启安装。": "New version {version} found. Download it, then restart to install.",
  "当前已是最新版本。": "The current version is up to date.",
  "更新 {version} 已下载，重启后安装。": "Update {version} downloaded. Restart to install.",
  "官方更新源连接失败，正在切换国内镜像。": "The official update source failed; switching to the mirror.",
  "国内镜像更新源": "Mirror update source",

  // IPC 返回值里会被渲染的 message
  "已取消导出推荐模板。": "Recommendation template export canceled.",
  "英文列名模板已导出。Perk、枪管、弹匣、大师和起源特性请按当前资料库语言填写官方名称；中文资料库请填中文。示例行导入时自动跳过。": "English-header template exported. Enter official names for perks, barrels, magazines, masterworks, and origin traits in the current manifest language; use Chinese for a Chinese manifest. Example rows are skipped automatically on import.",
  "中文推荐模板已导出。表头自带填写说明，表头下面那行是示例数据（导入时自动跳过）：照它把武器、Perk、评级等列改成你自己的推荐，官方身份与资料库字段由应用自动补齐。": "Chinese recommendation template exported. The header includes instructions; the row below it is example data (skipped automatically on import). Edit the weapon, perk, and rating columns into your own recommendations — the app fills in official identity and manifest fields.",
  "已取消导出可编辑武器推荐。": "Editable weapon recommendation export canceled.",
  "可编辑武器推荐已导出。系统字段未包含在文件中，重新导入时会自动补齐。": "Editable weapon recommendations exported. System fields are not included in the file and are filled in automatically on re-import.",
  "资料库尚未准备完成，暂时不能精确核对武器插槽。": "The manifest is not ready yet, so weapon sockets cannot be matched precisely right now.",
  "资料库存在新版本；更新后才能按当前官方插槽精确核对。": "A newer manifest exists; update it before matching against current official sockets.",
  "尚未导入任何推荐来源；仍会继续核对本机愿望单与自定义推荐。": "No recommendation source has been imported yet; matching continues against the local wishlist and custom recommendations.",
  "已取消创建便携备份。": "Portable backup creation canceled.",
  "便携备份已创建：{path}。备份不包含账号令牌、Bungie/AI 密钥、资料库、缓存或日志。": "Portable backup created: {path}. The backup does not include account tokens, Bungie/AI keys, manifest data, cache, or logs.",
  "已取消恢复备份。": "Backup restore canceled.",
  "已取消恢复便携备份。": "Portable backup restore canceled.",
  "便携备份已恢复：{name}。回滚备份：{path}。请重启应用；目标电脑仍需重新登录并填写所需密钥。": "Portable backup restored: {name}. Rollback backup: {path}. Restart the app; the target computer still needs to sign in again and enter the required keys.",
  "缓存已清理。账号授权、配置、资料库、本地标记和日志已保留。": "Cache cleared. Account authorization, configuration, manifest, local marks, and logs are kept.",

  // worker 进度文案（经 context.update({...progress}) 进任务快照）
  "正在读取 Bungie 资料库版本。": "Reading the Bungie manifest version.",
  "正在下载当前语言资料库。": "Downloading the manifest for the current language.",
  "正在解压当前语言资料库。": "Extracting the manifest for the current language.",
  "正在校验资料内容和完整性。": "Verifying manifest content and integrity.",
  "正在构建当前语言装备与 Perk 索引，可能需要一些时间。": "Building the item and perk index for the current language. This may take a while.",
  "正在下载英文搜索辅助数据。": "Downloading English helper data.",
  "正在构建英文搜索辅助索引，可能需要一些时间。": "Building the English helper search index. This may take a while.",
  "已复用现有资料内容，正在升级本地查询索引。": "Reusing existing manifest content; upgrading the local query index.",
  "正在关闭旧连接并切换资料库。": "Closing old connections and switching the manifest.",
  "正在下载{label}。": "Downloading {label}.",
  "英文搜索辅助数据": "English helper data",
  "英文资料库": "English manifest",
  "中文资料库": "Chinese manifest"
};

/** zh-CN 侧 key 就是展示文本；en-US 侧查表，查不到退回 key，不返回空串。 */
export function mainText(locale: MainLocale, key: string): string {
  return locale === "en-US" ? enUsOverrides[key] ?? key : key;
}

/**
 * 带占位符的句子走这里：zh-CN 侧 key 就是含 `{名字}` 占位的中文原文，
 * en-US 侧以同一段原文为 key 查英文。查不到就退回原文。
 */
export function mainTemplate(locale: MainLocale, key: string, values: Record<string, string | number>): string {
  return mainText(locale, key).replace(/\{(\w+)\}/gu, (match, name: string) =>
    name in values ? String(values[name]) : match);
}

/**
 * 读取当前界面语言。
 *
 * 注意：它每次调用都会同步读一次 config.json，不要在循环或高频路径里反复调用，
 * 能提到循环外就提出来；一个函数里多处使用时要先取一次存局部变量。
 * 调用点若已经拿到 config 对象，直接传 `config.features.interface_locale`，不要再读一遍。
 */
export function currentMainLocale(): MainLocale {
  try {
    const locale = loadConfig().features.interface_locale;
    return locale === "en-US" ? "en-US" : "zh-CN";
  } catch {
    return "zh-CN";
  }
}
