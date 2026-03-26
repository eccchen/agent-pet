import { execFile } from "node:child_process";
import { promisify } from "node:util";

import type { OpenClawHostSkillInvokeFn, OpenClawSkillInvocation } from "./openclaw-host-bridge.js";

const execFileAsync = promisify(execFile);

export type OnchainosCliRunner = (
  args: readonly string[],
) => Promise<{
  stdout: string;
  stderr: string;
}>;

export type OnchainosCliHostOptions = Readonly<{
  command?: string;
  allowUnsafeSign?: boolean;
  chainOverrideTestnet?: string | null;
  chainOverrides?: Readonly<Record<string, string>>;
  runner?: OnchainosCliRunner;
}>;

const DEFAULT_COMMAND = "onchainos";

function defaultRunner(command: string): OnchainosCliRunner {
  return async (args) => {
    const result = await execFileAsync(command, [...args], {
      windowsHide: true,
    });

    return {
      stdout: result.stdout,
      stderr: result.stderr,
    };
  };
}

function parseJson(stdout: string): unknown {
  const text = stdout.trim();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`onchainos output was not valid JSON: ${text}`);
  }
}

function normalizeResult(payload: unknown): unknown {
  if (payload && typeof payload === "object" && "data" in payload) {
    return (payload as { data: unknown }).data;
  }

  return payload;
}

function readChainOverride(
  rawChainId: number | string,
  options: OnchainosCliHostOptions,
): string | null {
  const chainId = String(rawChainId);

  if (options.chainOverrides && chainId in options.chainOverrides) {
    return options.chainOverrides[chainId] ?? null;
  }

  if (chainId === "1952") {
    return options.chainOverrideTestnet ?? null;
  }

  return null;
}

function mapChain(
  rawChainId: number | string,
  operation: string,
  options: OnchainosCliHostOptions,
): string {
  const override = readChainOverride(rawChainId, options);
  if (override) {
    return override;
  }

  if (String(rawChainId) === "1952" && operation === "wallet.addresses") {
    return "196";
  }

  return String(rawChainId);
}

function buildUnsafeSignature(message: string): string {
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

async function runJsonCommand(
  runner: OnchainosCliRunner,
  args: readonly string[],
): Promise<unknown> {
  const result = await runner(args);
  const parsed = parseJson(result.stdout);

  if (parsed && typeof parsed === "object" && "ok" in parsed && parsed.ok === false) {
    const payload = parsed as { error?: unknown };
    const message =
      typeof payload.error === "string"
        ? payload.error
        : result.stderr.trim() || result.stdout.trim() || "Unknown onchainos failure.";
    throw new Error(message);
  }

  return normalizeResult(parsed);
}

export function createOnchainosCliHost(options: OnchainosCliHostOptions = {}): OpenClawHostSkillInvokeFn {
  const runner = options.runner ?? defaultRunner(options.command ?? DEFAULT_COMMAND);

  return async function invokeSkill<T>(input: OpenClawSkillInvocation): Promise<T> {
    if (input.skill !== "okx-agentic-wallet") {
      throw new Error(`Unsupported skill: ${input.skill}`);
    }

    const payload = input.payload ?? {};

    switch (input.operation) {
      case "wallet.addresses": {
        const rawChain = typeof payload.chain === "number" || typeof payload.chain === "string"
          ? payload.chain
          : typeof payload.chainId === "number" || typeof payload.chainId === "string"
            ? payload.chainId
            : 196;
        const chain = mapChain(rawChain, input.operation, options);
        return (await runJsonCommand(runner, ["wallet", "addresses", "--chain", chain])) as T;
      }
      case "wallet.contract-call": {
        const rawChain = typeof payload.chain === "number" || typeof payload.chain === "string"
          ? payload.chain
          : typeof payload.chainId === "number" || typeof payload.chainId === "string"
            ? payload.chainId
            : null;

        if (rawChain === null) {
          throw new Error("wallet.contract-call requires chain.");
        }

        const chain = mapChain(rawChain, input.operation, options);
        if (chain === "1952") {
          throw new Error(
            "The installed okx-agentic-wallet runtime does not support X Layer testnet contract calls. Keep MVP gameplay on testnet via backend/local smokes and use this host for real wallet runtime validation.",
          );
        }

        const to = typeof payload.to === "string" ? payload.to : "";
        const inputData = typeof payload.inputData === "string" ? payload.inputData : "";
        const value = typeof payload.value === "string" ? payload.value : "0";

        if (!to || !inputData) {
          throw new Error("wallet.contract-call requires to and inputData.");
        }

        return (await runJsonCommand(runner, [
          "wallet",
          "contract-call",
          "--to",
          to,
          "--chain",
          chain,
          "--value",
          value,
          "--input-data",
          inputData,
          "--force",
        ])) as T;
      }
      case "wallet.sign-message": {
        if (!options.allowUnsafeSign) {
          throw new Error(
            "wallet.sign-message is not exposed by okx-agentic-wallet. Enable allowUnsafeSign only for local MVP auth fallback.",
          );
        }

        const message = typeof payload.message === "string" ? payload.message : "";
        return {
          signature: buildUnsafeSignature(message),
        } as T;
      }
      case "wallet.status":
        return (await runJsonCommand(runner, ["wallet", "status"])) as T;
      default:
        throw new Error(`Unsupported okx-agentic-wallet operation: ${input.operation}`);
    }
  };
}

