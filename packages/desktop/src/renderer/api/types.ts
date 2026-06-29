import type { AccountApi } from "./accountApi";
import type { ActionsApi } from "./actionsApi";
import type { ActivityApi } from "./activityApi";
import type { AiApi } from "./aiApi";
import type { AssistantApi } from "./assistantApi";
import type { BackgroundTaskApi } from "./backgroundTaskApi";
import type { CommunityApi } from "./communityApi";
import type { ConfigApi } from "./configApi";
import type { DailyApi } from "./dailyApi";
import type { DiagnosticsApi } from "./diagnosticsApi";
import type { LibraryApi } from "./libraryApi";
import type { LoadoutApi } from "./loadoutApi";
import type { ManifestApi } from "./manifestApi";
import type { TargetApi } from "./targetApi";
import type { UpdateApi } from "./updateApi";
import type { VaultApi } from "./vaultApi";

export type * from "./accountApi";
export type * from "./actionsApi";
export type * from "./activityApi";
export type * from "./aiApi";
export type * from "./assistantApi";
export type * from "./backgroundTaskApi";
export type * from "./communityApi";
export type * from "./configApi";
export type * from "./dailyApi";
export type * from "./diagnosticsApi";
export type * from "./libraryApi";
export type * from "./loadoutApi";
export type * from "./manifestApi";
export type * from "./sharedTypes";
export type * from "./targetApi";
export type * from "./updateApi";
export type * from "./vaultApi";

export type AppApi =
  & ConfigApi
  & AccountApi
  & ManifestApi
  & LibraryApi
  & LoadoutApi
  & CommunityApi
  & TargetApi
  & VaultApi
  & AiApi
  & AssistantApi
  & BackgroundTaskApi
  & ActionsApi
  & DailyApi
  & ActivityApi
  & DiagnosticsApi
  & UpdateApi;
