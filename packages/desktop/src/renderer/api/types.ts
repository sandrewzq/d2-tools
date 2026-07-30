import type { AccountApi } from "../../contracts/account.js";
import type { ActionsApi } from "../../contracts/actions.js";
import type { ActivityApi } from "./activityApi";
import type { AiApi } from "./aiApi";
import type { AssistantApi } from "./assistantApi";
import type { BackgroundTaskApi } from "./backgroundTaskApi";
import type { CommunityApi } from "./communityApi";
import type { ConfigApi } from "./configApi";
import type { DailyApi } from "../../contracts/daily.js";
import type { DiagnosticsApi } from "./diagnosticsApi";
import type { LibraryApi } from "./libraryApi";
import type { LoadoutApi } from "./loadoutApi";
import type { ManifestApi } from "../../contracts/manifest.js";
import type { TargetApi } from "./targetApi";
import type { UpdateApi } from "./updateApi";
import type { VaultApi } from "./vaultApi";
import type { WeeklyApi } from "./weeklyApi";
import type { VendorsApi } from "../../contracts/vendors.js";
import type { WindowApi } from "./windowApi";

export type * from "../../contracts/account.js";
export type * from "../../contracts/actions.js";
export type * from "./activityApi";
export type * from "./aiApi";
export type * from "./assistantApi";
export type * from "./backgroundTaskApi";
export type * from "./communityApi";
export type * from "./configApi";
export type * from "../../contracts/daily.js";
export type * from "./diagnosticsApi";
export type * from "./libraryApi";
export type * from "./loadoutApi";
export type * from "../../contracts/manifest.js";
export type * from "./sharedTypes";
export type * from "./targetApi";
export type * from "./updateApi";
export type * from "./vaultApi";
export type * from "./weeklyApi";
export type * from "../../contracts/vendors.js";
export type * from "./windowApi";

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
  & UpdateApi
  & WeeklyApi
  & VendorsApi
  & WindowApi;
