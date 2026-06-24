import { useEffect, useState, type ReactNode } from "react";
import { createDataServices, type DataServices } from "@d2-tools/data";
import type { PlatformServices } from "@d2-tools/platform";
import { AppServicesContext } from "./AppServicesContext";

export interface AppProvidersProps {
  readonly platform: PlatformServices;
  readonly children: ReactNode;
}

export function AppProviders({ platform, children }: AppProvidersProps) {
  const [data, setData] = useState<DataServices | null>(null);

  useEffect(() => {
    let active = true;

    setData(null);

    void createDataServices(platform).then((services) => {
      if (active) {
        setData(services);
      }
    });

    return () => {
      active = false;
    };
  }, [platform]);

  return (
    <AppServicesContext.Provider value={{ platform, data }}>
      {children}
    </AppServicesContext.Provider>
  );
}
