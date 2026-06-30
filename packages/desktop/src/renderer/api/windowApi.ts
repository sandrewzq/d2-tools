export type WindowColorMode = "light" | "dark";

export type WindowApi = {
  setWindowColorMode(colorMode: WindowColorMode): Promise<void>;
};
