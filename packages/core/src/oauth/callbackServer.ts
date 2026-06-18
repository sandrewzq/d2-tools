import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";

export type OAuthCallback = {
  code: string;
  state: string | null;
};

export type OAuthCallbackServer = {
  origin: string;
  waitForCallback(): Promise<OAuthCallback>;
  close(): Promise<void>;
};

export async function startOAuthCallbackServer(options: {
  host: string;
  port: number;
}): Promise<OAuthCallbackServer> {
  let resolveCallback!: (value: OAuthCallback) => void;
  const callbackPromise = new Promise<OAuthCallback>((resolve) => {
    resolveCallback = resolve;
  });

  const server: Server = createServer((request, response) => {
    const url = new URL(request.url ?? "/", `http://${options.host}`);

    if (url.pathname !== "/oauth/callback") {
      response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      response.end("Not found");
      return;
    }

    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");

    if (!code) {
      response.writeHead(400, { "content-type": "text/html; charset=utf-8" });
      response.end("<h1>Missing OAuth code</h1><p>Return to d2-service and try login again.</p>");
      return;
    }

    resolveCallback({ code, state });
    response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    response.end("<h1>Bungie login received</h1><p>You can return to d2-service.</p>");
  });

  await new Promise<void>((resolve) => server.listen(options.port, options.host, resolve));
  const address = server.address() as AddressInfo;

  return {
    origin: `http://${options.host}:${address.port}`,
    waitForCallback: () => callbackPromise,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      })
  };
}
