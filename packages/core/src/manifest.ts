export type ManifestStatusState = "missing" | "ready" | "refreshing" | "failed";

export interface ManifestStatus {
  readonly state: ManifestStatusState;
  readonly version: string | null;
  readonly updatedAt: string | null;
  readonly errorMessage: string | null;
}
