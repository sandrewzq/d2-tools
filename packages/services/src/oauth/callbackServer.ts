import { createServer as createHttpServer, type RequestListener, type Server } from "node:http";
import { createServer as createHttpsServer } from "node:https";
import type { AddressInfo } from "node:net";
import { generate } from "selfsigned";

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
  protocol?: "http" | "https";
}): Promise<OAuthCallbackServer> {
  const protocol = options.protocol ?? "http";
  let resolveCallback!: (value: OAuthCallback) => void;
  const callbackPromise = new Promise<OAuthCallback>((resolve) => {
    resolveCallback = resolve;
  });

  const requestListener: RequestListener = (request, response) => {
    const url = new URL(request.url ?? "/", `${protocol}://${options.host}`);

    if (url.pathname !== "/oauth/callback") {
      response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      response.end("Not found");
      return;
    }

    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");

    if (!code) {
      response.writeHead(400, { "content-type": "text/html; charset=utf-8" });
      response.end("<h1>Missing OAuth code</h1><p>Return to d2-tools and try login again.</p>");
      return;
    }

    resolveCallback({ code, state });
    response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    response.end("<h1>Bungie login received</h1><p>You can return to d2-tools.</p>");
  };

  const server: Server = protocol === "https"
    ? createHttpsServer(await createLocalHttpsCredentials(options.host), requestListener)
    : createHttpServer(requestListener);

  await new Promise<void>((resolve, reject) => {
    const cleanup = () => {
      server.off("error", onError);
      server.off("listening", onListening);
    };
    const onError = (error: Error) => {
      cleanup();
      reject(error);
    };
    const onListening = () => {
      cleanup();
      resolve();
    };

    server.once("error", onError);
    server.once("listening", onListening);

    try {
      server.listen(options.port, options.host);
    } catch (error) {
      cleanup();
      reject(error);
    }
  });
  const address = server.address() as AddressInfo;
  let closePromise: Promise<void> | undefined;

  return {
    origin: `${protocol}://${options.host}:${address.port}`,
    waitForCallback: () => callbackPromise,
    close: () => {
      closePromise ??= new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (!error || (error as NodeJS.ErrnoException).code === "ERR_SERVER_NOT_RUNNING") {
            resolve();
            return;
          }

          reject(error);
        });
      });

      return closePromise;
    }
  };
}

async function createLocalHttpsCredentials(host: string): Promise<{ key: string; cert: string }> {
  const pems = await generate(
    [{ name: "commonName", value: host }],
    {
      algorithm: "sha256",
      notAfterDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
      extensions: [
        {
          name: "basicConstraints",
          cA: true
        },
        {
          name: "keyUsage",
          keyCertSign: true,
          digitalSignature: true,
          keyEncipherment: true
        },
        {
          name: "extKeyUsage",
          serverAuth: true
        },
        {
          name: "subjectAltName",
          altNames: host === "127.0.0.1"
            ? [{ type: 7, ip: "127.0.0.1" }]
            : [{ type: 2, value: host }]
        }
      ]
    }
  );

  return {
    key: pems.private,
    cert: pems.cert
  };
}
