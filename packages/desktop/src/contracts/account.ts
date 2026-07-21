import type {
  AccountItemDetail,
  AccountItemSummary,
  AccountMaterialSummary,
  AccountSummary as CoreAccountSummary,
  CharacterEquipmentGroup,
  CharacterLoadoutSlotSummary,
  CharacterSummary
} from "@d2-tools/core/account/summary";
import type { AuthLoginResult } from "@d2-tools/core/oauth/login";
import type { CachedAccountSnapshot } from "@d2-tools/services/account/snapshotStore";

export type AccountApi = {
  loginBungie(): Promise<AuthLoginResult>;
  getAccountSummary(options?: AccountSummaryRequestOptions): Promise<AccountSummary>;
  getCachedAccountSnapshot(): Promise<CachedAccountSnapshot | null>;
  getAccountItemDetail(instanceId: string, options?: AccountItemDetailRequestOptions): Promise<AccountItemDetail>;
};

export type AccountSummaryRequestOptions = {
  force?: boolean;
};

export type AccountItemDetailRequestOptions = {
  force?: boolean;
};

export type AccountSummary = CoreAccountSummary;

export type {
  AccountItemDetail,
  AccountItemSummary,
  AccountMaterialSummary,
  AuthLoginResult,
  CachedAccountSnapshot,
  CharacterEquipmentGroup,
  CharacterLoadoutSlotSummary,
  CharacterSummary
};
