import { createContext, useContext } from "react";
import type { DataServices } from "@d2-tools/data";
import type { PlatformServices } from "@d2-tools/platform";

export interface AppServices {
  readonly platform: PlatformServices;
  readonly data: DataServices | null;
}

export const AppServicesContext = createContext<AppServices | null>(null);

export function useAppServices(): AppServices {
  const services = useContext(AppServicesContext);
  if (services === null) {
    throw new Error("AppServicesContext is not available");
  }

  return services;
}
