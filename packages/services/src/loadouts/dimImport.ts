import {
  createDimLoadoutImportPreview,
  parseDimShareLink,
  type DimLoadoutImportPreview
} from "@d2-tools/core/loadouts/dimImport";

const dimShareApi = "https://api.destinyitemmanager.com/loadout_share";

export async function previewDimLoadoutImport(url: string): Promise<DimLoadoutImportPreview> {
  const link = parseDimShareLink(url);
  if (link.kind === "url-loadout") {
    return createDimLoadoutImportPreview({
      source_url: link.source_url,
      payload: link.inline_loadout
    });
  }

  const requestUrl = new URL(dimShareApi);
  requestUrl.searchParams.set("shareId", link.share_id ?? "");
  let response: Response;
  try {
    response = await fetch(requestUrl, {
      headers: { "User-Agent": "d2-tools-loadout-import" },
      signal: AbortSignal.timeout(15_000)
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`无法读取 DIM 分享链接：${message}。请稍后重试，或改用 DIM 的 /loadouts?loadout=... 导出链接。`);
  }
  if (!response.ok) {
    throw new Error(`DIM 分享链接读取失败（HTTP ${response.status}）。链接可能已失效或不再公开。`);
  }
  let payload: unknown;
  try {
    payload = await response.json() as unknown;
  } catch {
    throw new Error("DIM 返回的分享数据不是有效 JSON。请确认链接仍有效后重试。");
  }
  return createDimLoadoutImportPreview({
    source_url: link.source_url,
    share_id: link.share_id,
    payload
  });
}
