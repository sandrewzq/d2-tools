export type WindowColorMode = "light" | "dark";

export type WindowApi = {
  setWindowColorMode(colorMode: WindowColorMode): Promise<void>;
  minimizeWindow(): Promise<void>;
  toggleMaximizeWindow(): Promise<void>;
  closeWindow(): Promise<void>;
  openExternal(url: string): Promise<void>;
};
