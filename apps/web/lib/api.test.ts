import assert from "node:assert/strict";
import test from "node:test";
import { createApiClient } from "./api.js";

test("createChallenge posts wallet address and returns the challenge payload", async () => {
  let calledUrl = "";
  let calledBody = "";

  const api = createApiClient({
    baseUrl: "http://localhost:3001",
    fetch: async (input, init) => {
      calledUrl = String(input);
      calledBody = String(init?.body ?? "");

      return new Response(
        JSON.stringify({
          walletAddress: "0xabc",
          nonce: "nonce-1",
          challenge: "Sign this wallet challenge: nonce-1",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    },
  });

  const result = await api.createChallenge("0xabc");

  assert.equal(calledUrl, "http://localhost:3001/api/auth/challenge");
  assert.equal(calledBody, JSON.stringify({ walletAddress: "0xabc" }));
  assert.equal(result.nonce, "nonce-1");
});

test("verifyChallenge posts wallet signature and returns a session token", async () => {
  let calledAuthUrl = "";
  let calledAuthBody = "";

  const api = createApiClient({
    baseUrl: "http://localhost:3001",
    fetch: async (input, init) => {
      calledAuthUrl = String(input);
      calledAuthBody = String(init?.body ?? "");

      return new Response(
        JSON.stringify({
          walletAddress: "0xabc",
          token: "session-1",
          authenticated: true,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    },
  });

  const result = await api.verifyChallenge("0xabc", "signed:nonce-1");

  assert.equal(calledAuthUrl, "http://localhost:3001/api/auth/verify");
  assert.equal(
    calledAuthBody,
    JSON.stringify({ walletAddress: "0xabc", signature: "signed:nonce-1" }),
  );
  assert.equal(result.token, "session-1");
});

test("bootstrapPlayer sends bearer auth and returns the starter player snapshot", async () => {
  let authorizationHeader = "";

  const api = createApiClient({
    baseUrl: "http://localhost:3001",
    fetch: async (_input, init) => {
      authorizationHeader = String((init?.headers as Record<string, string>).Authorization);

      return new Response(
        JSON.stringify({
          walletAddress: "0xabc",
          xBinding: false,
          budget: 1000,
          profitPool: 0,
          chainSync: {
            syncStatus: "local",
            onchainId: "pending:player:0xabc",
            lastSyncedAt: "2026-03-24T00:00:00.000Z",
          },
          pets: [
            {
              id: "starter-pet",
              name: "Sprout",
              species: "starter-cat",
              level: 1,
              starter: true,
              budget: {
                spendableBudget: 1000,
                singleTxLimit: 50,
                dailyLimit: 200,
              },
              chainSync: {
                syncStatus: "local",
                onchainId: "pending:pet:0xabc:starter-pet",
                lastSyncedAt: "2026-03-24T00:00:00.000Z",
              },
            },
          ],
          createdAt: "2026-03-24T00:00:00.000Z",
          updatedAt: "2026-03-24T00:00:00.000Z",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    },
  });

  const result = await api.bootstrapPlayer("session-1");

  assert.equal(authorizationHeader, "Bearer session-1");
  assert.equal(result.walletAddress, "0xabc");
  assert.equal(result.pets[0]?.budget.dailyLimit, 200);
});

test("listEvents sends bearer auth and parses player events", async () => {
  let authorizationHeader = "";

  const api = createApiClient({
    baseUrl: "http://localhost:3001",
    fetch: async (_input, init) => {
      authorizationHeader = String((init?.headers as Record<string, string>).Authorization);

      return new Response(
        JSON.stringify([
          {
            id: "evt-1",
            type: "pet_command_issued",
            title: "Pet ran an earning loop",
            detail: "The pet completed a safe earning action and added profit to the pool.",
            createdAt: "2026-03-24T00:00:00.000Z",
            petId: "starter-pet",
            commandType: "earn",
            amount: 120,
          },
        ]),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    },
  });

  const result = await api.listEvents("session-1");

  assert.equal(authorizationHeader, "Bearer session-1");
  assert.equal(result[0]?.type, "pet_command_issued");
});

test("updatePetBudget and profit actions send the expected payloads", async () => {
  const calls: Array<{ url: string; method: string; body: string }> = [];

  const api = createApiClient({
    baseUrl: "http://localhost:3001",
    fetch: async (input, init) => {
      calls.push({
        url: String(input),
        method: String(init?.method),
        body: String(init?.body ?? ""),
      });

      return new Response(
        JSON.stringify({
          player: {
            walletAddress: "0xabc",
            xBinding: false,
            budget: 1060,
            profitPool: 60,
            chainSync: {
              syncStatus: "local",
              onchainId: "pending:player:0xabc",
              lastSyncedAt: "2026-03-24T00:00:00.000Z",
            },
            pets: [],
            createdAt: "2026-03-24T00:00:00.000Z",
            updatedAt: "2026-03-24T00:00:00.000Z",
          },
          pet: {
            id: "starter-pet",
            name: "Sprout",
            species: "starter-cat",
            level: 1,
            starter: true,
            budget: {
              spendableBudget: 1040,
              singleTxLimit: 50,
              dailyLimit: 200,
            },
            chainSync: {
              syncStatus: "local",
              onchainId: "pending:pet:0xabc:starter-pet",
              lastSyncedAt: "2026-03-24T00:00:00.000Z",
            },
          },
          event: {
            id: "evt-2",
            type: "profit_reinvested",
            title: "Profit reinvested into pet budget",
            detail: "Moved 40 from the profit pool.",
            createdAt: "2026-03-24T00:00:00.000Z",
            petId: "starter-pet",
            amount: 40,
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    },
  });

  await api.updatePetBudget("session-1", "starter-pet", {
    spendableBudget: 250,
    singleTxLimit: 75,
    dailyLimit: 300,
  });
  await api.reinvestProfit("session-1", "starter-pet", 40);
  await api.withdrawProfit("session-1", 60);

  assert.equal(calls[0]?.url, "http://localhost:3001/api/pets/starter-pet/budget");
  assert.equal(calls[0]?.method, "PATCH");
  assert.equal(calls[1]?.url, "http://localhost:3001/api/profit/reinvest");
  assert.equal(calls[1]?.body, JSON.stringify({ petId: "starter-pet", amount: 40 }));
  assert.equal(calls[2]?.url, "http://localhost:3001/api/profit/withdraw");
  assert.equal(calls[2]?.body, JSON.stringify({ amount: 60 }));
});

test("getMe sends bearer auth and throws for non-ok responses", async () => {
  let authorizationHeader = "";

  const api = createApiClient({
    baseUrl: "http://localhost:3001",
    fetch: async (_input, init) => {
      authorizationHeader = String((init?.headers as Record<string, string>).Authorization);

      return new Response(JSON.stringify({ error: "player not found" }), {
        status: 404,
        headers: {
          "Content-Type": "application/json",
        },
      });
    },
  });

  await assert.rejects(() => api.getMe("session-1"), /player not found/);
  assert.equal(authorizationHeader, "Bearer session-1");
});
