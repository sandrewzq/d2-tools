import type { AppUpdateSnapshot as SharedAppUpdateSnapshot, AppUpdateStatus as SharedAppUpdateStatus } from "../../shared/updateTypes";

export type AppUpdateStatus = SharedAppUpdateStatus;

export type AppUpdateSnapshot = SharedAppUpdateSnapshot & {
  install_path: string;
};

export type UpdateStatus = AppUpdateStatus;
export type UpdateSnapshot = AppUpdateSnapshot;

export type UpdateApi = {
  getUpdateStatus(): Promise<AppUpdateSnapshot>;
  checkForUpdates(): Promise<AppUpdateSnapshot>;
  downloadUpdate(): Promise<AppUpdateSnapshot>;
  quitAndInstallUpdate(): Promise<void>;
  openUpdateDownloadPage(): Promise<void>;
  onUpdateStatusChanged(callback: (snapshot: AppUpdateSnapshot) => void): () => void;
};
