#!/usr/bin/env node

import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  createOpenClawClient,
  OpenClawApiError,
  type PetBudget,
  type XActionType,
} from "./client.js";

export type CliIO = Readonly<{
  stdout?: { write(text: string): void };
  stderr?: { write(text: string): void };
  fetch?: typeof fetch;
}>;

type ParsedArgs = Readonly<{
  command: string;
  flags: Record<string, string>;
}>;

function parseArgs(argv: readonly string[]): ParsedArgs {
  const [command = "help", ...rest] = argv;
  const flags: Record<string, string> = {};

  for (let index = 0; index < rest.length; index += 1) {
    const part = rest[index];
    if (!part.startsWith("--")) {
      continue;
    }

    const key = part.slice(2);
    const value = rest[index + 1];
    if (value && !value.startsWith("--")) {
      flags[key] = value;
      index += 1;
    } else {
      flags[key] = "true";
    }
  }

  return { command, flags };
}

function requireFlag(flags: Record<string, string>, name: string): string {
  const value = flags[name]?.trim();
  if (!value) {
    throw new Error(`Missing required flag --${name}`);
  }

  return value;
}

function toBudget(flags: Record<string, string>): PetBudget {
  return {
    spendableBudget: Number(requireFlag(flags, "spendable-budget")),
    singleTxLimit: Number(requireFlag(flags, "single-tx-limit")),
    dailyLimit: Number(requireFlag(flags, "daily-limit")),
  };
}

function print(io: CliIO, value: unknown): void {
  const text = `${JSON.stringify(value, null, 2)}\n`;
  (io.stdout ?? process.stdout).write(text);
}

function printError(io: CliIO, value: string): void {
  (io.stderr ?? process.stderr).write(`${value}\n`);
}

function formatError(error: unknown): string {
  if (error instanceof OpenClawApiError) {
    const parts = [
      `op=${error.operation}`,
      `kind=${error.kind}`,
    ];
    if (error.statusCode !== null) {
      parts.push(`status=${error.statusCode}`);
    }
    if (error.retryable) {
      parts.push("retryable=true");
    }
    return `${error.name}: ${error.message} (${parts.join(", ")})`;
  }

  if (error instanceof Error) {
    return `${error.name}: ${error.message}`;
  }

  return "CLI failed";
}

export async function runCli(argv: readonly string[], io: CliIO = {}): Promise<number> {
  const { command, flags } = parseArgs(argv);

  if (command === "help" || command === "--help" || command === "-h") {
    print(io, {
      commands: [
        "challenge",
        "verify",
        "bootstrap",
        "home",
        "claim-snapshot",
        "economy",
        "ledger",
        "command",
        "budget",
        "tip",
        "bounty-create",
        "bounty-claim",
        "duel-create",
        "duel-accept",
        "duel-resolve",
        "service-create",
        "service-accept",
        "service-complete",
        "safety-net",
        "claim-prepare",
        "claim-confirm",
        "claim-cancel",
        "upload-x",
        "chain-register",
        "chain-create-pet",
        "chain-set-budget",
      ],
    });
    return 0;
  }

  const baseUrl = requireFlag(flags, "base-url");
  const token = requireFlag(flags, "token");
  const client = createOpenClawClient({ baseUrl, token, fetch: io.fetch });

  try {
    switch (command) {
      case "challenge": {
        const walletAddress = requireFlag(flags, "wallet");
        const challenge = await client.createChallenge(walletAddress);
        print(io, challenge);
        return 0;
      }
      case "verify": {
        const walletAddress = requireFlag(flags, "wallet");
        const signature = requireFlag(flags, "signature");
        const session = await client.verifyChallenge(walletAddress, signature);
        print(io, session);
        return 0;
      }
      case "bootstrap": {
        const snapshot = await client.bootstrapPlayer();
        print(io, snapshot);
        return 0;
      }
      case "home": {
        const snapshot = await client.getHome();
        print(io, snapshot);
        return 0;
      }
      case "claim-snapshot": {
        const snapshot = await client.getClaimSnapshot();
        print(io, snapshot);
        return 0;
      }
      case "economy": {
        const snapshot = await client.getEconomy();
        print(io, snapshot);
        return 0;
      }
      case "ledger": {
        const snapshot = await client.getLedger();
        print(io, snapshot);
        return 0;
      }
      case "command": {
        const petId = requireFlag(flags, "pet-id");
        const commandType = requireFlag(flags, "type") as XActionType | string;
        const result = await client.issuePetCommand(petId, commandType);
        print(io, result);
        return 0;
      }
      case "budget": {
        const petId = requireFlag(flags, "pet-id");
        const result = await client.updatePetBudget(petId, toBudget(flags));
        print(io, result);
        return 0;
      }
      case "tip": {
        const fromPetId = requireFlag(flags, "from-pet-id");
        const targetWalletAddress = requireFlag(flags, "target-wallet");
        const toPetId = requireFlag(flags, "to-pet-id");
        const amount = Number(requireFlag(flags, "amount"));
        const result = await client.createTip(fromPetId, targetWalletAddress, toPetId, amount);
        print(io, result);
        return 0;
      }
      case "bounty-create": {
        const result = await client.createBounty({
          creatorPetId: requireFlag(flags, "creator-pet-id"),
          targetWalletAddress: requireFlag(flags, "target-wallet"),
          targetPetId: requireFlag(flags, "target-pet-id"),
          title: requireFlag(flags, "title"),
          detail: requireFlag(flags, "detail"),
          amount: Number(requireFlag(flags, "amount")),
        });
        print(io, result);
        return 0;
      }
      case "bounty-claim": {
        const result = await client.claimBounty(
          requireFlag(flags, "bounty-id"),
          requireFlag(flags, "claimer-pet-id"),
        );
        print(io, result);
        return 0;
      }
      case "duel-create": {
        const result = await client.createDuel({
          challengerPetId: requireFlag(flags, "challenger-pet-id"),
          targetWalletAddress: requireFlag(flags, "target-wallet"),
          targetPetId: requireFlag(flags, "target-pet-id"),
          stakeAmount: Number(requireFlag(flags, "stake-amount")),
        });
        print(io, result);
        return 0;
      }
      case "duel-accept": {
        const result = await client.acceptDuel(
          requireFlag(flags, "duel-id"),
          requireFlag(flags, "target-pet-id"),
        );
        print(io, result);
        return 0;
      }
      case "duel-resolve": {
        const result = await client.resolveDuel(
          requireFlag(flags, "duel-id"),
          requireFlag(flags, "winner-pet-id"),
        );
        print(io, result);
        return 0;
      }
      case "service-create": {
        const result = await client.createServiceOrder({
          clientPetId: requireFlag(flags, "client-pet-id"),
          serviceType: requireFlag(flags, "service-type"),
          title: requireFlag(flags, "title"),
          detail: requireFlag(flags, "detail"),
          amount: Number(requireFlag(flags, "amount")),
        });
        print(io, result);
        return 0;
      }
      case "service-accept": {
        const result = await client.acceptServiceOrder(
          requireFlag(flags, "order-id"),
          requireFlag(flags, "provider-pet-id"),
        );
        print(io, result);
        return 0;
      }
      case "service-complete": {
        const result = await client.completeServiceOrder(requireFlag(flags, "order-id"));
        print(io, result);
        return 0;
      }
      case "safety-net": {
        const result = await client.claimSafetyNet();
        print(io, result);
        return 0;
      }
      case "claim-prepare": {
        const result = await client.prepareClaimOnchain();
        print(io, result);
        return 0;
      }
      case "claim-confirm": {
        const txHash = requireFlag(flags, "tx-hash");
        const result = await client.confirmClaimOnchain(txHash);
        print(io, result);
        return 0;
      }
      case "claim-cancel": {
        const result = await client.cancelClaimOnchain();
        print(io, result);
        return 0;
      }
      case "upload-x": {
        const petId = requireFlag(flags, "pet-id");
        const xAccountId = requireFlag(flags, "x-account");
        const actionType = requireFlag(flags, "action-type") as XActionType;
        const tweetId = requireFlag(flags, "tweet-id");
        const payload = {
          petId,
          xAccountId,
          actionType,
          tweetId,
          replyToTweetId: flags["reply-to"] ?? null,
          content: flags.content ?? null,
          localProof: flags["local-proof"] ?? null,
        };
        const result = await client.uploadXAction(payload);
        print(io, result);
        return 0;
      }
      case "chain-register": {
        const result = await client.prepareRegisterPlayerOnchain();
        print(io, result);
        return 0;
      }
      case "chain-create-pet": {
        const petId = requireFlag(flags, "pet-id");
        const result = await client.prepareCreatePetOnchain(petId);
        print(io, result);
        return 0;
      }
      case "chain-set-budget": {
        const petId = requireFlag(flags, "pet-id");
        const result = await client.prepareSetPetBudgetOnchain(petId);
        print(io, result);
        return 0;
      }
      default:
        throw new Error(`Unknown command: ${command}`);
    }
  } catch (error) {
    printError(io, formatError(error));
    return 1;
  }
}

export function isMainModule(moduleUrl: string, modulePath: string): boolean {
  return path.resolve(fileURLToPath(moduleUrl)) === path.resolve(modulePath);
}

if (process.argv[1] && isMainModule(import.meta.url, process.argv[1])) {
  void runCli(process.argv.slice(2));
}
