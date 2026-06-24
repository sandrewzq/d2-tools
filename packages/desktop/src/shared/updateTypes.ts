export type UpdateStatus =
  | "idle"
  | "checking"
  | "available"
  | "not_available"
  | "downloading"
  | "downloaded"
  | "error";

export type UpdateSnapshot = {
  status: UpdateStatus;
  current_version: string;
  install_path: string;
  available_version?: string;
  downloaded_version?: string;
  error?: string;
  progress_percent?: number;
};
