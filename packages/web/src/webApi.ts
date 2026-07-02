import type { ShellPageKey } from "@d2-tools/ui";
import { fallbackHomeSnapshot, type WebHomeSnapshot, type WebPageSnapshot } from "./webAdapter";

export type WebApiSnapshotProvider = {
  loadHomeSnapshot?: () => Promise<WebHomeSnapshot>;
  loadPageSnapshot?: (page: ShellPageKey) => Promise<WebPageSnapshot | null>;
};

export type WebApiRouter = {
  handle: (request: Request) => Promise<Response | null>;
};

const pageKeys: ShellPageKey[] = ["home", "account", "vault", "loadouts", "library", "settings"];
const pageSnapshotPrefix = "/api/pages/";

export function createWebApiRouter(provider: WebApiSnapshotProvider = {}): WebApiRouter {
  return {
    async handle(request) {
      const url = new URL(request.url);
      if (url.pathname === "/api/home-snapshot") {
        const snapshot = provider.loadHomeSnapshot ? await provider.loadHomeSnapshot() : fallbackHomeSnapshot;
        return json(snapshot);
      }

      const match = url.pathname.startsWith(pageSnapshotPrefix)
        ? url.pathname.match(/^\/api\/pages\/([^/]+)\/snapshot$/)
        : null;
      if (match) {
        const page = match[1] as ShellPageKey;
        if (!pageKeys.includes(page)) {
          return json({ error: "Unknown page" }, 404);
        }
        const snapshot = provider.loadPageSnapshot ? await provider.loadPageSnapshot(page) : null;
        return json(snapshot ?? { page, payload: null });
      }

      return null;
    }
  };
}

function json(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8"
    }
  });
}
