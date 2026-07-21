export function canonicalVendorHash(vendorHash: number): number {
  if (vendorHash === 3500617033) return 350061650;
  if (vendorHash === 3902439767) return 765357505;
  return vendorHash;
}

export function vendorMatchKey(value: string): string {
  if (/xur|仄|老九/i.test(value)) return "xur";
  if (/banshee|枪匠|班西/i.test(value)) return "banshee";
  if (/ada|艾达/i.test(value)) return "ada";
  if (/saint|试炼|圣-?14|圣人/i.test(value)) return "saint";
  if (/zavala|萨瓦拉|先锋/i.test(value)) return "zavala";
  if (/shaxx|沙克斯|熔炉/i.test(value)) return "shaxx";
  if (/drifter|浪客|智谋/i.test(value)) return "drifter";
  if (/rahool|拉乎尔|密码学家/i.test(value)) return "rahool";
  if (/tess|苔丝|eververse|永恒之诗/i.test(value)) return "tess";
  return "";
}

export function normalizeBungieIconUrl(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith("data:")) return trimmed;
  return trimmed.startsWith("/") ? `https://www.bungie.net${trimmed}` : trimmed;
}

export function slugify(value: string): string {
  return Array.from(value.trim())
    .map((char) => /^[a-z0-9]$/i.test(char) ? char.toLowerCase() : char.codePointAt(0)?.toString(36) ?? "")
    .filter(Boolean)
    .join("-");
}
