import type { ShellPageKey } from "@d2-tools/ui";
import {
  createWebSnapshotProvider,
  type WebHomeSnapshot,
  type WebPageSnapshot,
  type WebSnapshotSource
} from "./webAdapter";

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
  const snapshotProvider = createWebSnapshotProvider({
    source: toSnapshotSource(provider)
  });

  return {
    async handle(request) {
      const url = new URL(request.url);
      if (url.pathname === "/api/home-snapshot") {
        const snapshot = await snapshotProvider.loadHomeSnapshot();
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
        const snapshot = await snapshotProvider.loadPageSnapshot(page);
        return json(snapshot ?? { page, payload: null });
      }

      return null;
    }
  };
}

function toSnapshotSource(provider: WebApiSnapshotProvider): WebSnapshotSource | undefined {
  if (!provider.loadHomeSnapshot && !provider.loadPageSnapshot) return undefined;

  return {
    getHomeSnapshot: async () => provider.loadHomeSnapshot ? provider.loadHomeSnapshot() : null,
    getPageSnapshot: async (page) => provider.loadPageSnapshot ? provider.loadPageSnapshot(page) : null
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
