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
  getAccountSummary(): Promise<AccountSummary>;
  getCachedAccountSnapshot(): Promise<CachedAccountSnapshot | null>;
  getAccountItemDetail(instanceId: string): Promise<AccountItemDetail>;
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
