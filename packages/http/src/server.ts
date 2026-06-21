import { createServer, type Server, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import { findD2ToolDefinition, listD2ToolDefinitions } from "@d2-tools/core/tools/registry";
import { getHealth } from "@d2-tools/core/health";

export type HealthServer = {
  origin: string;
  close(): Promise<void>;
};

export type ToolHandler = (input: unknown) => unknown | Promise<unknown>;

export async function startHealthServer(options: {
  host: string;
  port: number;
  toolHandlers?: Record<string, ToolHandler>;
}): Promise<HealthServer> {
  const server: Server = createServer(async (request, response) => {
    const url = new URL(request.url ?? "/", `http://${formatHost(options.host)}`);

    if (request.method === "GET" && url.pathname === "/api/v1/health") {
      writeJson(response, 200, getHealth());
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/v1/tools") {
      writeJson(response, 200, { tools: listD2ToolDefinitions() });
      return;
    }

    const toolCallMatch = /^\/api\/v1\/tools\/([^/]+)\/call$/.exec(url.pathname);
    if (request.method === "POST" && toolCallMatch) {
      const toolName = decodeURIComponent(toolCallMatch[1]);
      if (!findD2ToolDefinition(toolName)) {
        writeJson(response, 404, { ok: false, error_code: "TOOL_NOT_FOUND" });
        return;
      }

      const handler = options.toolHandlers?.[toolName];
      if (!handler) {
        writeJson(response, 501, { ok: false, error_code: "TOOL_HANDLER_NOT_CONFIGURED" });
        return;
      }

      try {
        const input = await readJsonBody(request);
        const result = await handler(input);
        writeJson(response, 200, { ok: true, result });
      } catch (error) {
        writeJson(response, 400, {
          ok: false,
          error_code: "TOOL_CALL_FAILED",
          message: error instanceof Error ? error.message : "Unknown error"
        });
      }
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

async function readJsonBody(request: NodeJS.ReadableStream): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
  }

  const text = Buffer.concat(chunks).toString("utf8").trim();
  return text ? JSON.parse(text) : {};
}

function formatHost(host: string): string {
  return host.includes(":") && !host.startsWith("[") ? `[${host}]` : host;
}
