export type HomeIconTone = "exotic" | "weapon" | "armor" | "material";

export function normalizeBungieIconUrl(value: string | undefined): string | undefined {
  if (!value) return undefined;
  if (/^https?:\/\//i.test(value) || value.startsWith("data:")) return value;
  return value.startsWith("/") ? `https://www.bungie.net${value}` : value;
}

export function createXurItemIconUrl(item: { iconTone: HomeIconTone; iconLabel?: string; label: string }): string {
  const color = item.iconTone === "exotic" ? "#d7a33a" : item.iconTone === "armor" ? "#b7a1e8" : item.iconTone === "material" ? "#6fc39a" : "#8bb8e8";
  const accent = item.iconTone === "exotic" ? "#7b4f15" : item.iconTone === "armor" ? "#5d408d" : item.iconTone === "material" ? "#226246" : "#235c9d";
  const label = escapeSvgText(item.iconLabel ?? initials(item.label, "X"));
  return svgDataUrl(`<circle cx="48" cy="48" r="29" fill="#fff" opacity=".72"/><text x="48" y="86" text-anchor="middle" font-family="Arial, sans-serif" font-size="13" font-weight="800" fill="#fff" opacity=".78">${label}</text>`, color, accent);
}

export function createWeeklySupportIconUrl(label: string): string {
  return svgDataUrl(`<circle cx="48" cy="42" r="24" fill="#fff" opacity=".2"/><text x="48" y="61" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" font-weight="800" fill="#fff">${escapeSvgText(initials(label, "物"))}</text>`, "#c6922e", "#4e6f91");
}

function svgDataUrl(body: string, color: string, accent: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${color}"/><stop offset="1" stop-color="${accent}"/></linearGradient></defs><rect width="96" height="96" rx="12" fill="url(#g)"/><path d="M0 72 72 0h24v96H0V72Z" fill="#000" opacity=".14"/>${body}</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function initials(value: string, fallback: string): string {
  return Array.from(value.trim()).filter((char) => char.trim()).slice(0, 2).join("") || fallback;
}

function escapeSvgText(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}
