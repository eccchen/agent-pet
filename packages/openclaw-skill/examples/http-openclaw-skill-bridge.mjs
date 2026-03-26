import http from "node:http";
import crypto from "node:crypto";

function requireEnv(key, fallback) {
  const value = process.env[key]?.trim();
  if (value) {
    return value;
  }

  if (fallback !== undefined) {
    return fallback;
  }

  throw new Error(`Missing required environment variable ${key}.`);
}

function readJsonBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";

    request.setEncoding("utf8");
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) {
        reject(new Error("Request body too large."));
        request.destroy();
      }
    });
    request.on("end", () => {
      if (!body) {
        resolve(null);
        return;
      }

      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(new Error("Request body must be valid JSON."));
      }
    });
    request.on("error", reject);
  });
}

function jsonResponse(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(JSON.stringify(payload, null, 2));
}

function readMockConfig() {
  const port = Number(requireEnv("OPENCLAW_SKILL_BRIDGE_PORT", "8787"));
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error("OPENCLAW_SKILL_BRIDGE_PORT must be a valid TCP port.");
  }

  return {
    host: requireEnv("OPENCLAW_SKILL_BRIDGE_HOST", "127.0.0.1"),
    port,
    token: process.env.OPENCLAW_SKILL_BRIDGE_TOKEN?.trim() || "",
    walletAddress: requireEnv("OPENCLAW_SKILL_MOCK_WALLET_ADDRESS", "0x1234567890abcdef1234567890abcdef12345678"),
    signature: requireEnv("OPENCLAW_SKILL_MOCK_SIGNATURE", "0xmock-signature"),
    signatureMode: requireEnv("OPENCLAW_SKILL_MOCK_SIGNATURE_MODE", "fixed"),
    txHash: requireEnv("OPENCLAW_SKILL_MOCK_TX_HASH", "0xmock-tx-hash"),
    txHashMode: requireEnv("OPENCLAW_SKILL_MOCK_TX_HASH_MODE", "fixed"),
  };
}

function createUnsafeChallengeSignature(message, fallbackSignature) {
  if (typeof message !== "string" || !message.trim()) {
    return fallbackSignature;
  }

  const challengeParts = message.split(":");
  const nonce = challengeParts.at(-1)?.trim();
  if (!nonce) {
    return fallbackSignature;
  }

  return `signed:${nonce}`;
}

function createRandomTxHash(fallbackTxHash) {
  const prefix = typeof fallbackTxHash === "string" && fallbackTxHash.startsWith("0x")
    ? "0x"
    : "";
  return `${prefix}${crypto.randomBytes(32).toString("hex")}`;
}

function assertAuthorized(request, token) {
  if (!token) {
    return true;
  }

  const authHeader = request.headers.authorization?.trim() || "";
  return authHeader === `Bearer ${token}`;
}

function createMockResult(config, operation, payload) {
  switch (operation) {
    case "wallet.addresses":
      return {
        accountName: "Account 1",
        xlayer: [{ address: config.walletAddress, chainIndex: "196", chainName: "okb" }],
        evm: [{ address: config.walletAddress, chainIndex: "1", chainName: "eth" }],
      };
    case "wallet.sign-message":
      {
        const message = typeof payload?.message === "string" ? payload.message : null;
        const signature =
          config.signatureMode === "unsafe-challenge"
            ? createUnsafeChallengeSignature(message, config.signature)
            : config.signature;
      return {
        signature,
        message,
      };
      }
    case "wallet.contract-call":
      {
        const txHash =
          config.txHashMode === "random"
            ? createRandomTxHash(config.txHash)
            : config.txHash;
      return {
        txHash,
      };
      }
    default:
      return {
        ok: true,
        skill: "okx-agentic-wallet",
        operation,
        payload: payload ?? null,
      };
  }
}

async function main() {
  const config = readMockConfig();

  const server = http.createServer(async (request, response) => {
    try {
      if (request.method === "GET" && request.url === "/health") {
        jsonResponse(response, 200, { ok: true });
        return;
      }

      if (request.method !== "POST") {
        jsonResponse(response, 405, { error: "Method not allowed." });
        return;
      }

      if (!request.url || request.url !== "/invoke-skill") {
        jsonResponse(response, 404, { error: "Not found." });
        return;
      }

      if (!assertAuthorized(request, config.token)) {
        jsonResponse(response, 401, { error: "Unauthorized." });
        return;
      }

      let input;
      try {
        input = await readJsonBody(request);
      } catch (error) {
        jsonResponse(response, 400, { error: error instanceof Error ? error.message : "Invalid request." });
        return;
      }

      const skill = typeof input?.skill === "string" ? input.skill : "";
      const operation = typeof input?.operation === "string" ? input.operation : "";
      const payload = input?.payload && typeof input.payload === "object" ? input.payload : {};

      if (!skill || !operation) {
        jsonResponse(response, 400, { error: "Request must include skill and operation." });
        return;
      }

      if (skill !== "okx-agentic-wallet") {
        jsonResponse(response, 200, {
          result: {
            ok: true,
            skill,
            operation,
            payload,
          },
        });
        return;
      }

      jsonResponse(response, 200, {
        result: createMockResult(config, operation, payload),
      });
    } catch (error) {
      jsonResponse(response, 500, {
        error: error instanceof Error ? error.message : "Unexpected server error.",
      });
    }
  });

  server.listen(config.port, config.host, () => {
    console.log(
      [
        `OpenClaw mock skill bridge listening on http://${config.host}:${config.port}`,
        `POST http://${config.host}:${config.port}/invoke-skill`,
        `Mock wallet address: ${config.walletAddress}`,
      ].join("\n"),
    );
  });

  const shutdown = () => {
    server.close(() => {
      process.exit(0);
    });
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : error);
  process.exit(1);
});
