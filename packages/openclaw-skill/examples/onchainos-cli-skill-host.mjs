import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

function readEnv(key, fallback) {
  const value = process.env[key]?.trim();
  if (value) {
    return value;
  }

  if (fallback !== undefined) {
    return fallback;
  }

  throw new Error(`Missing required environment variable ${key}.`);
}

function parseJson(output) {
  const text = output.trim();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`onchainos output was not valid JSON: ${text}`);
  }
}

function normalizeResult(payload) {
  if (payload && typeof payload === "object" && "data" in payload) {
    return payload.data;
  }

  return payload;
}

function readChainOverride(chainId) {
  const exact = process.env[`OPENCLAW_ONCHAINOS_CHAIN_OVERRIDE_${chainId}`]?.trim();
  if (exact) {
    return exact;
  }

  if (Number(chainId) === 1952) {
    return process.env.OPENCLAW_ONCHAINOS_CHAIN_OVERRIDE_TESTNET?.trim() || null;
  }

  return null;
}

function mapChain(chainId, operation) {
  const override = readChainOverride(chainId);
  if (override) {
    return override;
  }

  if (Number(chainId) === 1952 && operation === "wallet.addresses") {
    return "196";
  }

  return String(chainId);
}

function buildUnsafeSignature(message) {
  if (typeof message !== "string") {
    throw new Error("wallet.sign-message requires a message.");
  }

  const prefix = "Sign this wallet challenge: ";
  if (!message.startsWith(prefix)) {
    throw new Error("Unsafe sign fallback only supports challenge messages.");
  }

  const nonce = message.slice(prefix.length).trim();
  if (!nonce) {
    throw new Error("Challenge nonce is empty.");
  }

  return `signed:${nonce}`;
}

async function runOnchainos(args) {
  const command = readEnv("OPENCLAW_ONCHAINOS_BIN", "onchainos");
  const { stdout, stderr } = await execFileAsync(command, args, {
    windowsHide: true,
  });

  const parsed = parseJson(stdout);
  if (!parsed || (typeof parsed === "object" && "ok" in parsed && parsed.ok === false)) {
    const reason =
      parsed && typeof parsed === "object" && "error" in parsed && typeof parsed.error === "string"
        ? parsed.error
        : stderr?.trim() || stdout.trim() || "Unknown onchainos failure.";
    throw new Error(reason);
  }

  return normalizeResult(parsed);
}

async function invokeOkxSkill(operation, payload) {
  switch (operation) {
    case "wallet.addresses": {
      const chain = mapChain(payload?.chain ?? payload?.chainId ?? 196, operation);
      return runOnchainos(["wallet", "addresses", "--chain", String(chain)]);
    }
    case "wallet.contract-call": {
      const rawChain = payload?.chain ?? payload?.chainId;
      if (!rawChain) {
        throw new Error("wallet.contract-call requires chain.");
      }

      const chain = mapChain(rawChain, operation);
      if (String(chain) === "1952") {
        throw new Error(
          "The installed okx-agentic-wallet runtime does not support X Layer testnet contract calls. Keep MVP gameplay on testnet via backend/local smokes and use this bridge for real wallet address/runtime validation.",
        );
      }

      const to = typeof payload?.to === "string" ? payload.to : "";
      const inputData = typeof payload?.inputData === "string" ? payload.inputData : "";
      const value = typeof payload?.value === "string" ? payload.value : "0";

      if (!to || !inputData) {
        throw new Error("wallet.contract-call requires to and inputData.");
      }

      const args = [
        "wallet",
        "contract-call",
        "--to",
        to,
        "--chain",
        String(chain),
        "--value",
        value,
        "--input-data",
        inputData,
        "--force",
      ];

      return runOnchainos(args);
    }
    case "wallet.sign-message": {
      if (process.env.OPENCLAW_ONCHAINOS_ALLOW_UNSAFE_SIGN !== "true") {
        throw new Error(
          "wallet.sign-message is not exposed by okx-agentic-wallet. Set OPENCLAW_ONCHAINOS_ALLOW_UNSAFE_SIGN=true only for local MVP auth fallback.",
        );
      }

      return {
        signature: buildUnsafeSignature(payload?.message),
      };
    }
    case "wallet.status":
      return runOnchainos(["wallet", "status"]);
    default:
      throw new Error(`Unsupported okx-agentic-wallet operation: ${operation}`);
  }
}

export function createInvokeSkill() {
  return async function invokeSkill(input) {
    if (!input || typeof input !== "object") {
      throw new Error("OpenClaw host input must be an object.");
    }

    const skill = typeof input.skill === "string" ? input.skill : "";
    const operation = typeof input.operation === "string" ? input.operation : "";
    const payload =
      input.payload && typeof input.payload === "object"
        ? input.payload
        : {};

    if (skill !== "okx-agentic-wallet") {
      throw new Error(`Unsupported skill: ${skill}`);
    }

    return invokeOkxSkill(operation, payload);
  };
}

