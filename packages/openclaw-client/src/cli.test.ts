import assert from "node:assert/strict";
import test from "node:test";

import { isMainModule, runCli } from "./cli.js";

test("detects direct CLI execution on a matching module path", () => {
  assert.equal(
    isMainModule("file:///C:/Users/shine/Desktop/agent%20game/.worktrees/codex-initial/packages/openclaw-client/dist/cli.js", "C:\\Users\\shine\\Desktop\\agent game\\.worktrees\\codex-initial\\packages\\openclaw-client\\dist\\cli.js"),
    true,
  );
});

test("home command prints the combined snapshot", async () => {
  const lines: string[] = [];
  const exitCode = await runCli(
    ["home", "--base-url", "http://localhost:3001", "--token", "session-1"],
    {
      fetch: async () =>
        new Response(
          JSON.stringify({
            player: { walletAddress: "0xabc", budget: 1000, profitPool: 0 },
            events: [],
            xActions: [],
            availableCommands: ["earn"],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      stdout: {
        write(chunk: string) {
          lines.push(chunk);
        },
      },
      stderr: {
        write(chunk: string) {
          lines.push(chunk);
        },
      },
    },
  );

  assert.equal(exitCode, 0);
  assert.match(lines.join(""), /0xabc/);
});

test("economy and ledger commands print canned economy snapshots", async () => {
  const lines: string[] = [];
  const payloads = [
    {
      currencyCode: "CANS",
      currencyName: "罐头",
      treasuryBalance: 900,
      profitPool: 95,
      platformTreasury: 5,
      openBounties: 1,
      openDuels: 0,
      openServiceOrders: 0,
      ledgerEntries: 2,
    },
    [{ id: "ledger-1", sourceType: "tip", amount: 100 }],
  ];

  const fetch = async () =>
    new Response(JSON.stringify(payloads.shift()), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  const economyExit = await runCli(
    ["economy", "--base-url", "http://localhost:3001", "--token", "session-1"],
    {
      fetch,
      stdout: { write(chunk: string) { lines.push(chunk); } },
      stderr: { write(chunk: string) { lines.push(chunk); } },
    },
  );
  const ledgerExit = await runCli(
    ["ledger", "--base-url", "http://localhost:3001", "--token", "session-1"],
    {
      fetch,
      stdout: { write(chunk: string) { lines.push(chunk); } },
      stderr: { write(chunk: string) { lines.push(chunk); } },
    },
  );

  assert.equal(economyExit, 0);
  assert.equal(ledgerExit, 0);
  assert.match(lines.join(""), /"currencyCode": "CANS"/);
  assert.match(lines.join(""), /"sourceType": "tip"/);
});

test("challenge command prints the auth challenge payload", async () => {
  const lines: string[] = [];
  const exitCode = await runCli(
    ["challenge", "--base-url", "http://localhost:3001", "--token", "session-1", "--wallet", "0xabc"],
    {
      fetch: async () =>
        new Response(
          JSON.stringify({
            walletAddress: "0xabc",
            nonce: "nonce-1",
            challenge: "Sign this wallet challenge: nonce-1",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      stdout: {
        write(chunk: string) {
          lines.push(chunk);
        },
      },
      stderr: {
        write(chunk: string) {
          lines.push(chunk);
        },
      },
    },
  );

  assert.equal(exitCode, 0);
  assert.match(lines.join(""), /nonce-1/);
});

test("onchain commands print tx intents", async () => {
  const lines: string[] = [];
  const payloads = [
    {
      to: "0xregistry",
      data: "0xregister",
      value: "0x0",
      chainId: 1952,
      chainNamespaceId: "eip155:1952",
    },
    {
      to: "0xregistry",
      data: "0xcreatepet",
      value: "0x0",
      chainId: 1952,
      chainNamespaceId: "eip155:1952",
    },
    {
      to: "0xvault",
      data: "0xsetbudget",
      value: "0x0",
      chainId: 1952,
      chainNamespaceId: "eip155:1952",
    },
  ];

  const fetch = async () =>
    new Response(JSON.stringify(payloads.shift()), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  const registerExit = await runCli(
    ["chain-register", "--base-url", "http://localhost:3001", "--token", "session-1"],
    {
      fetch,
      stdout: { write(chunk: string) { lines.push(chunk); } },
      stderr: { write(chunk: string) { lines.push(chunk); } },
    },
  );
  const createPetExit = await runCli(
    ["chain-create-pet", "--base-url", "http://localhost:3001", "--token", "session-1", "--pet-id", "starter-pet"],
    {
      fetch,
      stdout: { write(chunk: string) { lines.push(chunk); } },
      stderr: { write(chunk: string) { lines.push(chunk); } },
    },
  );
  const setBudgetExit = await runCli(
    ["chain-set-budget", "--base-url", "http://localhost:3001", "--token", "session-1", "--pet-id", "starter-pet"],
    {
      fetch,
      stdout: { write(chunk: string) { lines.push(chunk); } },
      stderr: { write(chunk: string) { lines.push(chunk); } },
    },
  );

  assert.equal(registerExit, 0);
  assert.equal(createPetExit, 0);
  assert.equal(setBudgetExit, 0);
  assert.match(lines.join(""), /"chainNamespaceId": "eip155:1952"/);
  assert.match(lines.join(""), /"to": "0xvault"/);
});

test("claim commands print claim snapshots and tx intents", async () => {
  const lines: string[] = [];
  const payloads = [
    {
      walletAddress: "0xabc",
      claimableBalance: 320,
      status: "ready",
      claimId: "claim-1",
      txHash: null,
      claimableAt: "2026-03-25T00:00:00.000Z",
      confirmedAt: null,
      canceledAt: null,
    },
    {
      to: "0xclaim-vault",
      data: "0xclaim",
      value: "0x0",
      chainId: 196,
      chainNamespaceId: "eip155:196",
    },
    {
      walletAddress: "0xabc",
      claimableBalance: 0,
      status: "confirmed",
      claimId: "claim-1",
      txHash: "0xclaimtx",
      claimableAt: "2026-03-25T00:00:00.000Z",
      confirmedAt: "2026-03-25T00:05:00.000Z",
      canceledAt: null,
    },
    {
      walletAddress: "0xabc",
      claimableBalance: 320,
      status: "canceled",
      claimId: "claim-1",
      txHash: null,
      claimableAt: "2026-03-25T00:00:00.000Z",
      confirmedAt: null,
      canceledAt: "2026-03-25T00:10:00.000Z",
    },
  ];

  const fetch = async () =>
    new Response(JSON.stringify(payloads.shift()), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  const snapshotExit = await runCli(
    ["claim-snapshot", "--base-url", "http://localhost:3001", "--token", "session-1"],
    {
      fetch,
      stdout: { write(chunk: string) { lines.push(chunk); } },
      stderr: { write(chunk: string) { lines.push(chunk); } },
    },
  );
  const prepareExit = await runCli(
    ["claim-prepare", "--base-url", "http://localhost:3001", "--token", "session-1"],
    {
      fetch,
      stdout: { write(chunk: string) { lines.push(chunk); } },
      stderr: { write(chunk: string) { lines.push(chunk); } },
    },
  );
  const confirmExit = await runCli(
    ["claim-confirm", "--base-url", "http://localhost:3001", "--token", "session-1", "--tx-hash", "0xclaimtx"],
    {
      fetch,
      stdout: { write(chunk: string) { lines.push(chunk); } },
      stderr: { write(chunk: string) { lines.push(chunk); } },
    },
  );
  const cancelExit = await runCli(
    ["claim-cancel", "--base-url", "http://localhost:3001", "--token", "session-1"],
    {
      fetch,
      stdout: { write(chunk: string) { lines.push(chunk); } },
      stderr: { write(chunk: string) { lines.push(chunk); } },
    },
  );

  assert.equal(snapshotExit, 0);
  assert.equal(prepareExit, 0);
  assert.equal(confirmExit, 0);
  assert.equal(cancelExit, 0);
  assert.match(lines.join(""), /"claimableBalance": 320/);
  assert.match(lines.join(""), /"chainNamespaceId": "eip155:196"/);
  assert.match(lines.join(""), /"status": "confirmed"/);
  assert.match(lines.join(""), /"status": "canceled"/);
});

test("auth failures print typed error details", async () => {
  const lines: string[] = [];
  const exitCode = await runCli(
    ["verify", "--base-url", "http://localhost:3001", "--token", "session-1", "--wallet", "0xabc", "--signature", "bad"],
    {
      fetch: async (input) => {
        const url = String(input);
        if (url.endsWith("/api/auth/verify")) {
          return new Response(JSON.stringify({ error: "invalid signature" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }

        throw new Error(`Unexpected request: ${url}`);
      },
      stdout: { write(chunk: string) { lines.push(chunk); } },
      stderr: { write(chunk: string) { lines.push(chunk); } },
    },
  );

  assert.equal(exitCode, 1);
  assert.match(lines.join(""), /OpenClawAuthError/);
  assert.match(lines.join(""), /401/);
  assert.match(lines.join(""), /invalid signature/);
});

test("tip command posts the expected economy payload", async () => {
  let body = "";
  const lines: string[] = [];

  const exitCode = await runCli(
    [
      "tip",
      "--base-url", "http://localhost:3001",
      "--token", "session-1",
      "--from-pet-id", "starter-pet",
      "--target-wallet", "0xdef",
      "--to-pet-id", "starter-pet",
      "--amount", "100",
    ],
    {
      fetch: async (_input, init) => {
        body = String(init?.body ?? "");
        return new Response(JSON.stringify({ tip: { id: "tip-1", netAmount: 95 } }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      },
      stdout: { write(chunk: string) { lines.push(chunk); } },
      stderr: { write(chunk: string) { lines.push(chunk); } },
    },
  );

  assert.equal(exitCode, 0);
  assert.equal(body, JSON.stringify({
    fromPetId: "starter-pet",
    targetWalletAddress: "0xdef",
    toPetId: "starter-pet",
    amount: 100,
  }));
  assert.match(lines.join(""), /tip-1/);
});
