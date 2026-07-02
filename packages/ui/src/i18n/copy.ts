import type { InterfaceLocale, LocaleCopy } from "./types.js";

export const localeCopy: Record<InterfaceLocale, LocaleCopy> = {
  "zh-CN": {
    shell: {
      brandSubtitle: "Destiny 2 本地助手",
      statusAriaLabel: "全局状态",
      toolstripAriaLabel: "全局工具",
      navigationAriaLabel: "主导航",
      windowControlsAriaLabel: "窗口控制",
      navigation: {
        home: "首页",
        account: "账号",
        vault: "仓库",
        loadouts: "配装",
        library: "资料库",
        settings: "设置"
      },
      tools: {
        switchToDark: "切换为暗色",
        switchToLight: "切换为亮色",
        switchToChinese: "切换为中文",
        switchToEnglish: "切换为英文",
        github: "GitHub",
        settings: "设置",
        openAiAssistant: "打开 AI 助手抽屉",
        aiAssistant: "AI 助手",
        languageBadge: "中"
      }
    },
    home: {
      dataStripAriaLabel: "首页数据状态",
      sections: {
        weeklyRewards: {
          title: "本周奖励与轮换",
          subtitle: "把 DIM 类账号奖励清单、公共轮换和周末窗口放到同一个工作台",
          badge: "本周还有 9 项奖励值得刷"
        },
        today: {
          title: "今天可确认",
          subtitle: "每日重置、遗失区域和已接入活动线索"
        },
        vendors: {
          title: "商人重点",
          subtitle: "只保留需要今天看一眼的摘要"
        },
        account: {
          title: "账号提醒",
          subtitle: "账号进度只展示阻断和需要处理的信号"
        },
        pending: {
          title: "待确认数据",
          subtitle: "缺数据时保留低噪声提醒，不挤占主工作区"
        }
      },
      actions: {
        copyDaily: "复制日报",
        runDiagnostics: "运行诊断",
        diagnosing: "诊断中"
      },
      labels: {
        dailyReset: "每日重置",
        weeklyReset: "每周重置",
        manifest: "资料库",
        accountData: "账号数据",
        priority: "优先级",
        focusCount: "项关注",
        confirmed: "已确认",
        pending: "待确认",
        error: "异常",
        focus: "关注"
      },
      fallback: {
        dailyPending: "待刷新",
        dailyWaiting: "等待今日信息刷新",
        weeklyPending: "待确认",
        weeklyResetDetail: "每周三 01:00 重置",
        manifestReady: "名称、图标和来源可解析",
        manifestNeedsAttention: "异常时可去顶部状态或设置处理",
        accountFailed: "读取失败",
        accountReady: "已读取",
        accountPending: "待同步",
        weeklyFixedMeta: "账号进度待接入前，先给出本周固定关注位",
        otherRewardMeta: "公共轮换、DLC 周常和寻路者合并查看",
        waitingRefresh: "等待今日信息刷新。",
        todayLoadingTitle: "今日信息读取中",
        todayLoadingMessage: "正在读取可确认轮换数据。",
        todayActionTitle: "今日动作",
        todayQuiet: "没有可确认行动时保持安静。",
        noGuessBeforeWeekend: "周末开启前不展示猜测数据。",
        nightfallWaiting: "等待可靠来源接入。",
        vendorsWaiting: "等待公共商人数据。",
        healthFailed: "诊断读取失败",
        healthReady: "资料库可用于名称和图标解析。"
      },
      rewardGroups: {
        powerTitle: "+3 光等奖励",
        otherTitle: "其他奖励",
        powerPriority: "强力 / 巅峰奖励优先"
      },
      intel: {
        publicRotation: "本周公共轮换",
        weekendWindow: "周末窗口",
        raidDungeon: "突袭与地牢",
        activityIntel: "活动线索",
        doubleRewards: "双倍奖励",
        doubleRewardsDetail: "Bungie 公共接口未稳定确认前不猜测",
        xur: "仄 / Xur",
        trialsMap: "试炼地图",
        trialsMapDetail: "周末开启后再展示地图与奖励",
        weekendChecklist: "周末清单",
        weekendChecklistDetail: "等商人和试炼数据齐后再复制给 AI 或日报"
      },
      vendors: {
        xurDetail: "周末出现后展示异域装备摘要。",
        bansheeDetail: "武器清单接入前只提示关注。",
        adaDetail: "护甲模组和幻化相关后续接入。",
        weekendBadge: "待周末",
        waitingBadge: "待接入"
      },
      account: {
        failedTitle: "账号数据异常",
        readyTitle: "账号已就绪",
        pendingTitle: "账号待同步",
        syncing: "正在同步账号状态。",
        pendingMessage: "后续账号切换和里程碑进度会从这里收口。",
        failedBadge: "需处理",
        readyBadge: "正常",
        pendingBadge: "待同步",
        vaultTitle: "仓库容量",
        vaultReady: "仓库数量和溢出提醒后续接真实统计。",
        vaultMissing: "账号未同步时不展示容量判断。",
        vaultReadyBadge: "待统计",
        vaultMissingBadge: "缺账号",
        diagnosticWarningTitle: "健康检查有提醒",
        diagnosticReadyTitle: "健康检查正常",
        diagnosticWarning: (count) => `${count} 项需要处理。`,
        diagnosticReady: "无账号、资料库或后台阻断项。",
        diagnosticWarningBadge: "有提醒"
      }
    }
  },
  "en-US": {
    shell: {
      brandSubtitle: "Destiny 2 local companion",
      statusAriaLabel: "Global status",
      toolstripAriaLabel: "Global tools",
      navigationAriaLabel: "Primary navigation",
      windowControlsAriaLabel: "Window controls",
      navigation: {
        home: "Home",
        account: "Account",
        vault: "Vault",
        loadouts: "Loadouts",
        library: "Library",
        settings: "Settings"
      },
      tools: {
        switchToDark: "Switch to dark mode",
        switchToLight: "Switch to light mode",
        switchToChinese: "Switch to Chinese",
        switchToEnglish: "Switch to English",
        github: "GitHub",
        settings: "Settings",
        openAiAssistant: "Open AI assistant drawer",
        aiAssistant: "AI Assistant",
        languageBadge: "EN"
      }
    },
    home: {
      dataStripAriaLabel: "Home data status",
      sections: {
        weeklyRewards: {
          title: "Weekly rewards and rotations",
          subtitle: "Put DIM-style account rewards, public rotations, and weekend windows into one workspace",
          badge: "9 weekly rewards worth tracking"
        },
        today: {
          title: "Today to verify",
          subtitle: "Daily reset, lost sectors, and connected activity signals"
        },
        vendors: {
          title: "Vendor highlights",
          subtitle: "Only keep the summaries worth checking today"
        },
        account: {
          title: "Account alerts",
          subtitle: "Only blockers and signals that need action"
        },
        pending: {
          title: "Pending data",
          subtitle: "Keep missing-data reminders quiet and out of the main workspace"
        }
      },
      actions: {
        copyDaily: "Copy daily report",
        runDiagnostics: "Run diagnostics",
        diagnosing: "Diagnosing"
      },
      labels: {
        dailyReset: "Daily reset",
        weeklyReset: "Weekly reset",
        manifest: "Manifest",
        accountData: "Account data",
        priority: "Priority",
        focusCount: "tracked",
        confirmed: "Confirmed",
        pending: "Pending",
        error: "Issue",
        focus: "Watch"
      },
      fallback: {
        dailyPending: "Waiting",
        dailyWaiting: "Waiting for today's data",
        weeklyPending: "Pending",
        weeklyResetDetail: "Weekly reset at Wednesday 01:00",
        manifestReady: "Names, icons, and sources can be resolved",
        manifestNeedsAttention: "Handle issues from top status or Settings",
        accountFailed: "Read failed",
        accountReady: "Read",
        accountPending: "Pending",
        weeklyFixedMeta: "Fixed weekly focus before account progress is connected",
        otherRewardMeta: "Public rotations, DLC weeklies, and Pathfinder together",
        waitingRefresh: "Waiting for today's data.",
        todayLoadingTitle: "Reading today's data",
        todayLoadingMessage: "Reading verified rotation data.",
        todayActionTitle: "Today's action",
        todayQuiet: "Stay quiet when nothing is verified.",
        noGuessBeforeWeekend: "Do not show guesses before the weekend opens.",
        nightfallWaiting: "Waiting for a reliable source.",
        vendorsWaiting: "Waiting for public vendor data.",
        healthFailed: "Diagnostics failed",
        healthReady: "Manifest is ready for names and icons."
      },
      rewardGroups: {
        powerTitle: "+3 power rewards",
        otherTitle: "Other rewards",
        powerPriority: "Powerful / pinnacle rewards first"
      },
      intel: {
        publicRotation: "Weekly public rotation",
        weekendWindow: "Weekend window",
        raidDungeon: "Raid and dungeon",
        activityIntel: "Activity signals",
        doubleRewards: "Double rewards",
        doubleRewardsDetail: "Do not guess before Bungie public data is reliable",
        xur: "Xur",
        trialsMap: "Trials map",
        trialsMapDetail: "Show map and rewards after the weekend opens",
        weekendChecklist: "Weekend checklist",
        weekendChecklistDetail: "Copy to AI or daily report after vendor and Trials data are ready"
      },
      vendors: {
        xurDetail: "Show exotic highlights after the weekend vendor appears.",
        bansheeDetail: "Keep this as a reminder until weapon inventory is connected.",
        adaDetail: "Mods and transmog information can be connected later.",
        weekendBadge: "Weekend",
        waitingBadge: "Pending"
      },
      account: {
        failedTitle: "Account data issue",
        readyTitle: "Account ready",
        pendingTitle: "Account pending",
        syncing: "Syncing account state.",
        pendingMessage: "Account switching and milestone progress will be collected here later.",
        failedBadge: "Action needed",
        readyBadge: "OK",
        pendingBadge: "Pending",
        vaultTitle: "Vault capacity",
        vaultReady: "Show overflow and cleanup reminders after real counts are connected.",
        vaultMissing: "Do not judge capacity before account sync.",
        vaultReadyBadge: "To count",
        vaultMissingBadge: "No account",
        diagnosticWarningTitle: "Health check has alerts",
        diagnosticReadyTitle: "Health check ready",
        diagnosticWarning: (count) => `${count} items need attention.`,
        diagnosticReady: "No account, manifest, or background blockers.",
        diagnosticWarningBadge: "Alerts"
      }
    }
  }
};

export function getLocaleCopy(locale: InterfaceLocale): LocaleCopy {
  return localeCopy[locale];
}
