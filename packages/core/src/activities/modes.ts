export const ACTIVITY_MODE_ALL_PVP = 5;
export const ACTIVITY_MODE_ALL_PVE = 7;
export const ACTIVITY_HISTORY_SUMMARY_MODES = [ACTIVITY_MODE_ALL_PVE, ACTIVITY_MODE_ALL_PVP] as const;

export type ActivityModeSource = {
  activityDetails?: {
    mode?: number;
    modes?: number[];
  };
};

const PVP_ACTIVITY_MODES = new Set([
  ACTIVITY_MODE_ALL_PVP,
  10, // Control
  12, // Clash
  15, // Crimson Doubles
  19, // Iron Banner
  25, // Mayhem
  31, // Supremacy
  32, // Private Matches All
  37, // Survival
  38, // Countdown
  39, // Trials of the Nine
  41, // Trials Countdown
  42, // Trials Survival
  43, // Iron Banner Control
  44, // Iron Banner Clash
  45, // Iron Banner Supremacy
  48, // Rumble
  49, // All Doubles
  50, // Doubles
  51, // Private Matches Clash
  52, // Private Matches Control
  53, // Private Matches Supremacy
  54, // Private Matches Countdown
  55, // Private Matches Survival
  56, // Private Matches Mayhem
  57, // Private Matches Rumble
  59, // Showdown
  60, // Lockdown
  61, // Scorched
  62, // Scorched Team
  65, // Breakthrough
  67, // Salvage
  68, // Iron Banner Salvage
  69, // Competitive
  70, // Quickplay
  71, // Clash Quickplay
  72, // Clash Competitive
  73, // Control Quickplay
  74, // Control Competitive
  80, // Elimination
  81, // Momentum
  84, // Trials of Osiris
  88, // Rift
  89, // Zone Control
  90, // Iron Banner Rift
  91, // Iron Banner Zone Control
  92 // Relic
]);

const IRON_BANNER_ACTIVITY_MODES = new Set([
  19, // Iron Banner
  43, // Iron Banner Control
  44, // Iron Banner Clash
  45, // Iron Banner Supremacy
  68, // Iron Banner Salvage
  90, // Iron Banner Rift
  91 // Iron Banner Zone Control
]);

const PVE_ACTIVITY_MODES = new Set([
  ACTIVITY_MODE_ALL_PVE,
  2, // Story
  3, // Strike
  4, // Raid
  6, // Patrol
  16, // Nightfall
  17, // Heroic Nightfall
  18, // All Strikes
  46, // All Strikes
  47, // Scored Heroic Nightfall
  58, // Heroic Adventure
  64, // All PvE Competitive
  66, // Black Armory Run
  76, // Reckoning
  77, // Menagerie
  78, // Vex Offensive
  79, // Nightmare Hunt
  82, // Dungeon
  83, // Sundial
  85, // Dares
  86, // Offensive
  87 // Lost Sector
]);

export function activityModeValues(activity: ActivityModeSource): number[] {
  const values = [
    activity.activityDetails?.mode,
    ...(activity.activityDetails?.modes ?? [])
  ].filter((value): value is number => typeof value === "number");

  return [...new Set(values)];
}

export function isPvpActivityMode(mode: number): boolean {
  return PVP_ACTIVITY_MODES.has(mode);
}

export function isIronBannerActivityMode(mode: number): boolean {
  return IRON_BANNER_ACTIVITY_MODES.has(mode);
}

export function isPveActivityMode(mode: number): boolean {
  return PVE_ACTIVITY_MODES.has(mode);
}
