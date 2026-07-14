import {
  createWebSnapshotProvider,
  type WebHomeSnapshot,
  type WebSnapshotSource
} from "./webAdapter";

export type WebApiSnapshotProvider = {
  loadHomeSnapshot?: () => Promise<WebHomeSnapshot>;
};

export type WebApiRouter = {
  handle: (request: Request) => Promise<Response | null>;
};

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

      return null;
    }
  };
}

function toSnapshotSource(provider: WebApiSnapshotProvider): WebSnapshotSource | undefined {
  if (!provider.loadHomeSnapshot) return undefined;

  return {
    getHomeSnapshot: async () => provider.loadHomeSnapshot ? provider.loadHomeSnapshot() : null
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
