import type { AppApi } from "./types";

declare global {
  interface Window {
    d2: AppApi;
  }
}

export const api: AppApi = window.d2;
