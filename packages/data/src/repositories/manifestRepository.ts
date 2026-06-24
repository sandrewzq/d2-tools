import type { ManifestStatus } from "@d2-tools/core";

export interface ManifestRepository {
  getStatus(): Promise<ManifestStatus>;
  refresh(): Promise<ManifestStatus>;
}

export function createManifestRepository(): ManifestRepository {
  let status: ManifestStatus = {
    state: "missing",
    version: null,
    updatedAt: null,
    errorMessage: null
  };

  return {
    async getStatus() {
      return status;
    },
    async refresh() {
      status = {
        state: "ready",
        version: "mock-manifest",
        updatedAt: new Date().toISOString(),
        errorMessage: null
      };
      return status;
    }
  };
}
