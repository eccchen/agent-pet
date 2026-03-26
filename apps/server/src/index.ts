import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { randomUUID } from "node:crypto";
import { createWalletChallengeVerifier } from "./auth";
import { createNoopChainSyncAdapter, createXLayerChainSyncAdapter } from "./chain-sync";
import { loadConfig } from "./config";
import { resolveRoute } from "./router";
import { createInMemoryGameStore } from "./store";

const config = loadConfig();
const chainSyncAdapter =
  config.chainSyncMode === "xlayer" &&
  config.xlayerRpcUrl &&
  config.petRegistryAddress &&
  config.budgetVaultAddress
    ? createXLayerChainSyncAdapter({
        chainId: config.xlayerChainId,
        rpcUrl: config.xlayerRpcUrl,
        registryAddress: config.petRegistryAddress,
        vaultAddress: config.budgetVaultAddress,
        claimVaultAddress: config.claimVaultAddress,
        claimSignerPrivateKey: config.claimSignerPrivateKey,
        claimIntentExpirySeconds: config.claimIntentExpirySeconds,
        now: () => new Date(),
      })
    : createNoopChainSyncAdapter({
        now: () => new Date(),
      });

const store = createInMemoryGameStore({
  persistencePath: config.statePath,
  chainSync: chainSyncAdapter,
  xIntegrationMode: config.xIntegrationMode,
  authVerifier: createWalletChallengeVerifier({
    mode: config.authMode,
    challengePrefix: config.challengePrefix,
  }),
});

if (config.systemAgentsEnabled) {
  const seededAgents = store.bootstrapSystemAgents();
  console.log(`system agents bootstrapped: ${seededAgents.length}`);

  setInterval(() => {
    try {
      const summary = store.tickSystemAgents();
      console.log(
        `system agent tick -> actions=${summary.executedActions} economyMoves=${summary.economyMoves} acted=${summary.actedWallets.length}`,
      );
    } catch (error) {
      console.error(
        `system agent tick failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }, config.systemAgentTickIntervalMs).unref();
}

function readRequestBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];

    req.on("data", (chunk: Buffer) => {
      chunks.push(chunk);
    });

    req.on("end", () => {
      if (chunks.length === 0) {
        resolve(undefined);
        return;
      }

      const rawBody = Buffer.concat(chunks).toString("utf8");
      try {
        resolve(JSON.parse(rawBody));
      } catch {
        reject(new Error("invalid JSON body"));
      }
    });

    req.on("error", reject);
  });
}

function logRequestEvent(
  level: "info" | "error",
  message: string,
  data: Readonly<Record<string, unknown>>,
): void {
  const entry = {
    ts: new Date().toISOString(),
    level,
    message,
    ...data,
  };

  const line = JSON.stringify(entry);
  if (level === "error") {
    console.error(line);
    return;
  }

  console.log(line);
}

async function handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const requestId = randomUUID();
  const startedAt = Date.now();
  const method = req.method ?? "GET";
  const path = req.url ?? "/";

  if (!req.url) {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "missing request url" }));
    return;
  }

  let body: unknown;
  try {
    body = await readRequestBody(req);
  } catch {
    if (config.requestLogging) {
      logRequestEvent("error", "request_invalid_json", {
        requestId,
        method,
        path,
      });
    }
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "invalid JSON body" }));
    return;
  }

  try {
    const result = await resolveRoute(
      {
        method: req.method,
        path: req.url,
        body,
        headers: {
          authorization:
            typeof req.headers.authorization === "string"
              ? req.headers.authorization
              : undefined,
        },
      },
      store,
      {
        serviceName: config.serviceName,
        env: config.env,
        uptimeSeconds: Math.round(process.uptime()),
      },
    );

    if (config.requestLogging) {
      logRequestEvent("info", "request_completed", {
        requestId,
        method,
        path,
        statusCode: result.statusCode,
        durationMs: Date.now() - startedAt,
      });
    }

    res.writeHead(result.statusCode, {
      ...result.headers,
      "X-Request-Id": requestId,
    });
    res.end(JSON.stringify(result.body));
  } catch (error) {
    logRequestEvent("error", "request_failed", {
      requestId,
      method,
      path,
      durationMs: Date.now() - startedAt,
      error: error instanceof Error ? error.message : String(error),
    });
    res.writeHead(500, {
      "Content-Type": "application/json",
      "X-Request-Id": requestId,
    });
    res.end(
      JSON.stringify({
        error: "internal server error",
        requestId,
      }),
    );
  }
}

const server = createServer((req, res) => {
  void handleRequest(req, res);
});

server.listen(config.port, () => {
  // Minimal startup banner for local integration.
  console.log(
    `${config.serviceName} listening on :${config.port} (${config.env}) -> state ${config.statePath}`,
  );
});
