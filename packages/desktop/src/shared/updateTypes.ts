export type AppUpdateStatus =
  | "idle"
  | "checking"
  | "available"
  | "not_available"
  | "downloading"
  | "downloaded"
  | "error";

export type AppUpdateSnapshot = {
  status: AppUpdateStatus;
  current_version: string;
  install_path: string;
  release_page_url: string;
  update_source_label: string;
  available_version?: string;
  downloaded_version?: string;
  error?: string;
  user_message?: string;
  technical_error?: string;
  last_checked_at?: string;
  progress_percent?: number;
};

export type UpdateStatus = AppUpdateStatus;
export type UpdateSnapshot = AppUpdateSnapshot;
