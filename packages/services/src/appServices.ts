import { createDesktopBridgeServices, type DesktopBridgeApi } from "./desktopBridge.js";
import type { D2Services } from "./contracts.js";

export function createAppServices(api: DesktopBridgeApi): D2Services {
  return createDesktopBridgeServices(api);
}
