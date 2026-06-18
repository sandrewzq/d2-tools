import { createServer, type Server, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import { getHealth } from "@d2-service/core";

export type HealthServer = {
  origin: string;
  close(): Promise<void>;
};

export async function startHealthServer(options: {
  host: string;
  port: number;
}): Promise<HealthServer> {
  const server: Server = createServer((request, response) => {
    const url = new URL(request.url ?? "/", `http://${formatHost(options.host)}`);

    if (request.method === "GET" && url.pathname === "/api/v1/health") {
      writeJson(response, 200, getHealth());
      return;
    }

    writeJson(response, 404, { ok: false, error_code: "NOT_FOUND" });
  });

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
    origin: `http://${formatHost(options.host)}:${address.port}`,
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

function writeJson(response: ServerResponse, statusCode: number, body: unknown): void {
  response.writeHead(statusCode, { "content-type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(body));
}

function formatHost(host: string): string {
  return host.includes(":") && !host.startsWith("[") ? `[${host}]` : host;
}
