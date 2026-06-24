import type { UpdateSnapshot as SharedUpdateSnapshot, UpdateStatus as SharedUpdateStatus } from "../../shared/updateTypes";

export type UpdateStatus = SharedUpdateStatus;

export type UpdateSnapshot = SharedUpdateSnapshot & {
  install_path: string;
};

export type UpdateApi = {
  getUpdateStatus(): Promise<UpdateSnapshot>;
  checkForUpdates(): Promise<UpdateSnapshot>;
  downloadUpdate(): Promise<UpdateSnapshot>;
  quitAndInstallUpdate(): Promise<void>;
  onUpdateStatusChanged(callback: (snapshot: UpdateSnapshot) => void): () => void;
};
