import test from "node:test";
import assert from "node:assert/strict";

import { createInMemoryGameStore } from "./store";
import { resolveRoute } from "./router";

function createStore() {
  return createInMemoryGameStore({
    now: () => new Date("2026-03-24T00:00:00.000Z"),
    nonce: () => "nonce-123",
    sessionToken: () => "session-123",
  });
}

async function authenticate(store = createStore(), walletAddress = "0xabc") {
  await resolveRoute(
    {
      method: "POST",
      path: "/api/auth/challenge",
      body: { walletAddress },
    },
    store,
  );

  await resolveRoute(
    {
      method: "POST",
      path: "/api/auth/verify",
      body: { walletAddress, signature: "signed:nonce-123" },
    },
    store,
  );

  return store;
}

test("GET /health still returns service health", async () => {
  const result = await resolveRoute({ method: "GET", path: "/health" }, createStore());
  const body = result.body as {
    ok: true;
    service: string;
    env: string;
    uptimeSeconds: number;
  };

  assert.equal(result.statusCode, 200);
  assert.deepEqual(body, {
    ok: true,
    service: "agent-game-server",
    env: "development",
    uptimeSeconds: body.uptimeSeconds,
  });
});

test("POST /api/players/bootstrap creates a starter player for the authenticated wallet", async () => {
  const store = await authenticate(createStore(), "0xdef");

  const result = await resolveRoute(
    {
      method: "POST",
      path: "/api/players/bootstrap",
      headers: { authorization: "Bearer session-123" },
    },
    store,
  );

  assert.equal(result.statusCode, 200);
  assert.equal((result.body as { chainSync: { onchainId: string } }).chainSync.onchainId, "pending:player:0xdef");
});

test("GET /api/me/pets returns pets for the authenticated session", async () => {
  const store = await authenticate();
  await resolveRoute(
    {
      method: "POST",
      path: "/api/players/bootstrap",
      headers: { authorization: "Bearer session-123" },
    },
    store,
  );

  const result = await resolveRoute(
    {
      method: "GET",
      path: "/api/me/pets",
      headers: { authorization: "Bearer session-123" },
    },
    store,
  );

  assert.equal(result.statusCode, 200);
  assert.equal(Array.isArray(result.body), true);
  assert.equal((result.body as Array<{ chainSync: { onchainId: string } }>)[0]?.chainSync.onchainId, "pending:pet:0xabc:starter-pet");
});

test("GET /api/me/home returns a combined OpenClaw-friendly home snapshot", async () => {
  const store = await authenticate();
  await resolveRoute(
    {
      method: "POST",
      path: "/api/players/bootstrap",
      headers: { authorization: "Bearer session-123" },
    },
    store,
  );

  const result = await resolveRoute(
    {
      method: "GET",
      path: "/api/me/home",
      headers: { authorization: "Bearer session-123" },
    },
    store,
  );

  assert.equal(result.statusCode, 200);
  assert.equal((result.body as { player: { walletAddress: string } }).player.walletAddress, "0xabc");
  assert.equal(Array.isArray((result.body as { availableCommands: string[] }).availableCommands), true);
  assert.equal(Array.isArray((result.body as { commandPresets: unknown[] }).commandPresets), true);
  assert.equal(Array.isArray((result.body as { feed: unknown[] }).feed), true);
  assert.equal((result.body as { personality: { petId: string } | null }).personality?.petId, "starter-pet");
  assert.equal((result.body as { strategy: { strategyMode: string } | null }).strategy?.strategyMode, "balanced");
  assert.equal(
    Array.isArray((result.body as { recommendations: unknown[] }).recommendations),
    true,
  );
  assert.equal((result.body as { messageCenter: { totalItems: number } }).messageCenter.totalItems >= 1, true);
  assert.equal((result.body as { xAdapter: { enabled: boolean } }).xAdapter.enabled, false);
  assert.equal(Array.isArray((result.body as { guidedActions: unknown[] }).guidedActions), true);
  assert.equal((result.body as { guidedActions: unknown[] }).guidedActions.length >= 1, true);
  assert.equal((result.body as { onboarding: { stage: string } }).onboarding.stage, "first_steps");
  assert.equal(Array.isArray((result.body as { onboarding: { checklist: unknown[] } }).onboarding.checklist), true);
  assert.equal(Array.isArray((result.body as { plaza: { highlights: unknown[] } }).plaza.highlights), true);
  assert.equal(
    Array.isArray(
      (result.body as { opportunityBoard: { featuredOpponents: unknown[] } }).opportunityBoard.featuredOpponents,
    ),
    true,
  );
});

test("GET /api/me includes personality and strategy summaries alongside the player snapshot", async () => {
  const store = await authenticate();
  await resolveRoute(
    {
      method: "POST",
      path: "/api/players/bootstrap",
      headers: { authorization: "Bearer session-123" },
    },
    store,
  );

  const result = await resolveRoute(
    {
      method: "GET",
      path: "/api/me",
      headers: { authorization: "Bearer session-123" },
    },
    store,
  );

  assert.equal(result.statusCode, 200);
  assert.equal((result.body as { walletAddress: string }).walletAddress, "0xabc");
  assert.equal((result.body as { personality: { petId: string } | null }).personality?.petId, "starter-pet");
  assert.equal((result.body as { strategy: { strategyMode: string } | null }).strategy?.strategyMode, "balanced");
});

test("GET /api/me/home packages discovery targets and plaza highlights from live economy activity", async () => {
  const alphaStore = await authenticate(createStore(), "0xalpha");
  await resolveRoute(
    {
      method: "POST",
      path: "/api/players/bootstrap",
      headers: { authorization: "Bearer session-123" },
    },
    alphaStore,
  );

  const bravoStore = await authenticate(alphaStore, "0xbravo");
  await resolveRoute(
    {
      method: "POST",
      path: "/api/players/bootstrap",
      headers: { authorization: "Bearer session-123" },
    },
    bravoStore,
  );

  await resolveRoute(
    {
      method: "POST",
      path: "/api/economy/bounties",
      headers: { authorization: "Bearer session-123" },
      body: {
        creatorPetId: "starter-pet",
        targetWalletAddress: "0xalpha",
        targetPetId: "starter-pet",
        title: "Pressure Sprout",
        detail: "Force a response from Sprout.",
        amount: 150,
      },
    },
    bravoStore,
  );

  await resolveRoute(
    {
      method: "POST",
      path: "/api/economy/service-orders",
      headers: { authorization: "Bearer session-123" },
      body: {
        clientPetId: "starter-pet",
        serviceType: "promo",
        title: "Promote the plaza",
        detail: "Spread a noisy promo line.",
        amount: 180,
      },
    },
    bravoStore,
  );

  const challenge = await resolveRoute(
    {
      method: "POST",
      path: "/api/auth/challenge",
      body: { walletAddress: "0xalpha" },
    },
    bravoStore,
  );
  assert.equal(challenge.statusCode, 200);

  const verify = await resolveRoute(
    {
      method: "POST",
      path: "/api/auth/verify",
      body: { walletAddress: "0xalpha", signature: "signed:nonce-123" },
    },
    bravoStore,
  );
  assert.equal(verify.statusCode, 200);

  const home = await resolveRoute(
    {
      method: "GET",
      path: "/api/me/home",
      headers: { authorization: "Bearer session-123" },
    },
    bravoStore,
  );

  assert.equal(home.statusCode, 200);
  assert.equal(
    (home.body as { opportunityBoard: { openBounties: unknown[] } }).opportunityBoard.openBounties.length >= 1,
    true,
  );
  assert.equal(
    (home.body as { opportunityBoard: { openServiceOrders: unknown[] } }).opportunityBoard.openServiceOrders.length >= 1,
    true,
  );
  assert.equal(
    (home.body as { opportunityBoard: { featuredOpponents: unknown[] } }).opportunityBoard.featuredOpponents.length >= 1,
    true,
  );
  assert.equal((home.body as { plaza: { activeWallets: unknown[] } }).plaza.activeWallets.length >= 2, true);
  assert.equal((home.body as { plaza: { headline: string } }).plaza.headline.length > 0, true);
});

test("GET /api/me/feed and /api/me/messages expose the internal social surface", async () => {
  const store = await authenticate();
  await resolveRoute(
    {
      method: "POST",
      path: "/api/players/bootstrap",
      headers: { authorization: "Bearer session-123" },
    },
    store,
  );
  await resolveRoute(
    {
      method: "POST",
      path: "/api/pets/starter-pet/commands",
      headers: { authorization: "Bearer session-123" },
      body: { commandType: "earn" },
    },
    store,
  );

  const feed = await resolveRoute(
    {
      method: "GET",
      path: "/api/me/feed",
      headers: { authorization: "Bearer session-123" },
    },
    store,
  );
  assert.equal(feed.statusCode, 200);
  assert.equal((feed.body as Array<{ eventType: string }>)[0]?.eventType, "pet_command_issued");

  const messages = await resolveRoute(
    {
      method: "GET",
      path: "/api/me/messages",
      headers: { authorization: "Bearer session-123" },
    },
    store,
  );
  assert.equal(messages.statusCode, 200);
  assert.equal((messages.body as { totalItems: number }).totalItems >= 2, true);
});

test("GET /api/me/events returns event history for the authenticated session", async () => {
  const store = await authenticate();
  await resolveRoute(
    {
      method: "POST",
      path: "/api/players/bootstrap",
      headers: { authorization: "Bearer session-123" },
    },
    store,
  );

  const result = await resolveRoute(
    {
      method: "GET",
      path: "/api/me/events",
      headers: { authorization: "Bearer session-123" },
    },
    store,
  );

  assert.equal(result.statusCode, 200);
  assert.equal(Array.isArray(result.body), true);
  assert.equal((result.body as Array<{ type: string }>)[0]?.type, "player_bootstrapped");
});

test("GET /api/public/world-summary, /api/public/plaza, /api/public/opportunities, /api/public/pets/:petId and /api/public/players/:walletAddress are anonymous-safe", async () => {
  const alphaStore = await authenticate(createStore(), "0xalpha");
  await resolveRoute(
    {
      method: "POST",
      path: "/api/players/bootstrap",
      headers: { authorization: "Bearer session-123" },
    },
    alphaStore,
  );

  await resolveRoute(
    {
      method: "POST",
      path: "/api/pets/starter-pet/commands",
      headers: { authorization: "Bearer session-123" },
      body: { commandType: "earn" },
    },
    alphaStore,
  );

  const bravoStore = await authenticate(alphaStore, "0xbravo");
  await resolveRoute(
    {
      method: "POST",
      path: "/api/players/bootstrap",
      headers: { authorization: "Bearer session-123" },
    },
    bravoStore,
  );

  const worldSummary = await resolveRoute(
    {
      method: "GET",
      path: "/api/public/world-summary",
    },
    bravoStore,
  );
  assert.equal(worldSummary.statusCode, 200);
  assert.equal((worldSummary.body as { counts: { playerCount: number } }).counts.playerCount >= 2, true);
  assert.equal((worldSummary.body as { counts: { petCount: number } }).counts.petCount >= 2, true);
  assert.equal((worldSummary.body as { counts: { feedItemCount: number } }).counts.feedItemCount >= 2, true);

  const plaza = await resolveRoute(
    {
      method: "GET",
      path: "/api/public/plaza",
    },
    bravoStore,
  );
  assert.equal(plaza.statusCode, 200);
  assert.equal((plaza.body as { activeWallets: unknown[] }).activeWallets.length >= 2, true);
  assert.equal((plaza.body as { highlights: unknown[] }).highlights.length >= 2, true);

  const opportunities = await resolveRoute(
    {
      method: "GET",
      path: "/api/public/opportunities",
    },
    bravoStore,
  );
  assert.equal(opportunities.statusCode, 200);
  assert.equal(Array.isArray((opportunities.body as { opportunities: unknown[] }).opportunities), true);
  assert.equal(Array.isArray((opportunities.body as { metrics: unknown[] }).metrics), true);

  const publicPlayer = await resolveRoute(
    {
      method: "GET",
      path: "/api/public/players/0xalpha",
    },
    bravoStore,
  );
  assert.equal(publicPlayer.statusCode, 200);
  assert.equal((publicPlayer.body as { walletAddress: string }).walletAddress, "0xalpha");
  assert.equal((publicPlayer.body as { petCount: number }).petCount, 1);
  assert.equal(Array.isArray((publicPlayer.body as { pets: unknown[] }).pets), true);

  const publicPet = await resolveRoute(
    {
      method: "GET",
      path: "/api/public/pets/starter-pet",
    },
    bravoStore,
  );
  assert.equal(publicPet.statusCode, 200);
  assert.equal((publicPet.body as { petId: string }).petId, "starter-pet");
  assert.equal((publicPet.body as { matchedWalletCount: number }).matchedWalletCount >= 2, true);
  assert.equal((publicPet.body as { ambiguous: boolean }).ambiguous, true);
  assert.equal(typeof (publicPet.body as { ownerWalletAddress: string }).ownerWalletAddress, "string");
});

test("GET /api/x/status and default X routes expose disabled placeholder behavior", async () => {
  const store = await authenticate();
  await resolveRoute(
    {
      method: "POST",
      path: "/api/players/bootstrap",
      headers: { authorization: "Bearer session-123" },
    },
    store,
  );

  const status = await resolveRoute(
    {
      method: "GET",
      path: "/api/x/status",
      headers: { authorization: "Bearer session-123" },
    },
    store,
  );
  assert.equal(status.statusCode, 200);
  assert.equal((status.body as { enabled: boolean }).enabled, false);

  const xActions = await resolveRoute(
    {
      method: "GET",
      path: "/api/me/x-actions",
      headers: { authorization: "Bearer session-123" },
    },
    store,
  );
  assert.equal(xActions.statusCode, 200);
  assert.deepEqual(xActions.body, []);

  const upload = await resolveRoute(
    {
      method: "POST",
      path: "/api/x/actions/upload",
      headers: { authorization: "Bearer session-123" },
      body: {
        petId: "starter-pet",
        xAccountId: "ChaosPet_A",
        actionType: "post",
        tweetId: "tweet-1",
        content: "hello timeline",
        localProof: "openclaw-run-1",
      },
    },
    store,
  );
  assert.equal(upload.statusCode, 503);
  assert.equal((upload.body as { code: string }).code, "x_disabled");
});

test("POST /api/x/actions/upload rejects duplicate tweet ids with a conflict when local upload mode is enabled", async () => {
  const store = createInMemoryGameStore({
    now: () => new Date("2026-03-24T00:00:00.000Z"),
    nonce: () => "nonce-123",
    sessionToken: () => "session-123",
    xIntegrationMode: "local_upload",
  });
  await authenticate(store);
  await resolveRoute(
    {
      method: "POST",
      path: "/api/players/bootstrap",
      headers: { authorization: "Bearer session-123" },
    },
    store,
  );

  await resolveRoute(
    {
      method: "POST",
      path: "/api/x/actions/upload",
      headers: { authorization: "Bearer session-123" },
      body: {
        petId: "starter-pet",
        xAccountId: "ChaosPet_A",
        actionType: "post",
        tweetId: "tweet-1",
        content: "hello timeline",
        localProof: "openclaw-run-1",
      },
    },
    store,
  );

  const duplicate = await resolveRoute(
    {
      method: "POST",
      path: "/api/x/actions/upload",
      headers: { authorization: "Bearer session-123" },
      body: {
        petId: "starter-pet",
        xAccountId: "ChaosPet_A",
        actionType: "post",
        tweetId: "tweet-1",
        content: "hello timeline",
        localProof: "openclaw-run-2",
      },
    },
    store,
  );

  assert.equal(duplicate.statusCode, 409);
  assert.match(String((duplicate.body as { error: string }).error), /duplicate/i);
});

test("POST /api/onchain/* intent and confirm endpoints work for player and pet metadata", async () => {
  const store = await authenticate();
  await resolveRoute(
    {
      method: "POST",
      path: "/api/players/bootstrap",
      headers: { authorization: "Bearer session-123" },
    },
    store,
  );

  const playerIntent = await resolveRoute(
    {
      method: "POST",
      path: "/api/onchain/register-player/intent",
      headers: { authorization: "Bearer session-123" },
    },
    store,
  );
  assert.equal(playerIntent.statusCode, 200);
  assert.equal((playerIntent.body as { to: string }).to, "pending");

  const player = await resolveRoute(
    {
      method: "POST",
      path: "/api/onchain/register-player/confirm",
      headers: { authorization: "Bearer session-123" },
      body: { txHash: "0xtx-player" },
    },
    store,
  );
  assert.equal(player.statusCode, 200);

  const duplicatePlayerConfirm = await resolveRoute(
    {
      method: "POST",
      path: "/api/onchain/register-player/confirm",
      headers: { authorization: "Bearer session-123" },
      body: { txHash: "0xtx-player" },
    },
    store,
  );
  assert.equal(duplicatePlayerConfirm.statusCode, 409);

  const petIntent = await resolveRoute(
    {
      method: "POST",
      path: "/api/onchain/create-pet/intent",
      headers: { authorization: "Bearer session-123" },
      body: { petId: "starter-pet" },
    },
    store,
  );
  assert.equal(petIntent.statusCode, 200);

  const pet = await resolveRoute(
    {
      method: "POST",
      path: "/api/onchain/create-pet/confirm",
      headers: { authorization: "Bearer session-123" },
      body: { petId: "starter-pet", txHash: "0xtx-pet" },
    },
    store,
  );
  assert.equal(pet.statusCode, 200);

  const budgetIntent = await resolveRoute(
    {
      method: "POST",
      path: "/api/onchain/set-budget/intent",
      headers: { authorization: "Bearer session-123" },
      body: { petId: "starter-pet" },
    },
    store,
  );
  assert.equal(budgetIntent.statusCode, 200);

  const budget = await resolveRoute(
    {
      method: "POST",
      path: "/api/onchain/set-budget/confirm",
      headers: { authorization: "Bearer session-123" },
      body: { petId: "starter-pet", txHash: "0xtx-budget" },
    },
    store,
  );
  assert.equal(budget.statusCode, 200);

  const duplicateBudgetConfirm = await resolveRoute(
    {
      method: "POST",
      path: "/api/onchain/set-budget/confirm",
      headers: { authorization: "Bearer session-123" },
      body: { petId: "starter-pet", txHash: "0xtx-budget" },
    },
    store,
  );
  assert.equal(duplicateBudgetConfirm.statusCode, 409);
});

test("PATCH /api/pets/:id/budget updates the pet budget for the authenticated owner", async () => {
  const store = await authenticate();
  await resolveRoute(
    {
      method: "POST",
      path: "/api/players/bootstrap",
      headers: { authorization: "Bearer session-123" },
    },
    store,
  );

  const result = await resolveRoute(
    {
      method: "PATCH",
      path: "/api/pets/starter-pet/budget",
      headers: { authorization: "Bearer session-123" },
      body: {
        spendableBudget: 250,
        singleTxLimit: 75,
        dailyLimit: 300,
      },
    },
    store,
  );

  assert.equal(result.statusCode, 200);
  assert.equal((result.body as { budget: { spendableBudget: number } }).budget.spendableBudget, 250);
});

test("GET and PATCH /api/pets/:id/personality surfaces strategy and recommendation state", async () => {
  const store = await authenticate();
  await resolveRoute(
    {
      method: "POST",
      path: "/api/players/bootstrap",
      headers: { authorization: "Bearer session-123" },
    },
    store,
  );

  const personality = await resolveRoute(
    {
      method: "GET",
      path: "/api/pets/starter-pet/personality",
      headers: { authorization: "Bearer session-123" },
    },
    store,
  );
  assert.equal(personality.statusCode, 200);
  assert.equal((personality.body as { strategyMode: string }).strategyMode, "balanced");

  const strategy = await resolveRoute(
    {
      method: "PATCH",
      path: "/api/pets/starter-pet/strategy",
      headers: { authorization: "Bearer session-123" },
      body: {
        strategyMode: "pressure",
        targetPreference: "conflict",
      },
    },
    store,
  );
  assert.equal(strategy.statusCode, 200);
  assert.equal((strategy.body as { strategyMode: string }).strategyMode, "pressure");

  const autonomy = await resolveRoute(
    {
      method: "PATCH",
      path: "/api/pets/starter-pet/autonomy",
      headers: { authorization: "Bearer session-123" },
      body: {
        autonomyLevel: 80,
      },
    },
    store,
  );
  assert.equal(autonomy.statusCode, 200);
  assert.equal((autonomy.body as { autonomyLevel: number }).autonomyLevel, 80);

  const recommendations = await resolveRoute(
    {
      method: "GET",
      path: "/api/pets/starter-pet/recommendations",
      headers: { authorization: "Bearer session-123" },
    },
    store,
  );
  assert.equal(recommendations.statusCode, 200);
  assert.equal(Array.isArray(recommendations.body), true);
});

test("POST /api/pets/:id/commands issues a command and credits the profit pool", async () => {
  const store = await authenticate();
  await resolveRoute(
    {
      method: "POST",
      path: "/api/players/bootstrap",
      headers: { authorization: "Bearer session-123" },
    },
    store,
  );

  const result = await resolveRoute(
    {
      method: "POST",
      path: "/api/pets/starter-pet/commands",
      headers: { authorization: "Bearer session-123" },
      body: { commandType: "earn" },
    },
    store,
  );

  assert.equal(result.statusCode, 200);
  assert.equal((result.body as { player: { profitPool: number } }).player.profitPool, 120);
});

test("POST /api/profit/reinvest and /api/profit/withdraw move balances", async () => {
  const store = await authenticate();
  await resolveRoute(
    {
      method: "POST",
      path: "/api/players/bootstrap",
      headers: { authorization: "Bearer session-123" },
    },
    store,
  );
  await resolveRoute(
    {
      method: "POST",
      path: "/api/pets/starter-pet/commands",
      headers: { authorization: "Bearer session-123" },
      body: { commandType: "earn" },
    },
    store,
  );

  const reinvest = await resolveRoute(
    {
      method: "POST",
      path: "/api/profit/reinvest",
      headers: { authorization: "Bearer session-123" },
      body: { petId: "starter-pet", amount: 20 },
    },
    store,
  );
  assert.equal(reinvest.statusCode, 200);
  assert.equal((reinvest.body as { player: { profitPool: number } }).player.profitPool, 100);

  const withdraw = await resolveRoute(
    {
      method: "POST",
      path: "/api/profit/withdraw",
      headers: { authorization: "Bearer session-123" },
      body: { amount: 60 },
    },
    store,
  );
  assert.equal(withdraw.statusCode, 200);
  assert.equal((withdraw.body as { player: { budget: number } }).player.budget, 1000);
  assert.equal((withdraw.body as { player: { claimableBalance: number } }).player.claimableBalance, 60);
});

test("POST /api/openclaw/execute provides a unified command surface for skill callers", async () => {
  const store = await authenticate();
  await resolveRoute(
    {
      method: "POST",
      path: "/api/players/bootstrap",
      headers: { authorization: "Bearer session-123" },
    },
    store,
  );

  const command = await resolveRoute(
    {
      method: "POST",
      path: "/api/openclaw/execute",
      headers: { authorization: "Bearer session-123" },
      body: {
        operation: "issue_command",
        petId: "starter-pet",
        commandType: "earn",
      },
    },
    store,
  );
  assert.equal(command.statusCode, 200);
  assert.equal((command.body as { player: { profitPool: number } }).player.profitPool, 120);

  const home = await resolveRoute(
    {
      method: "POST",
      path: "/api/openclaw/execute",
      headers: { authorization: "Bearer session-123" },
      body: {
        operation: "get_home",
      },
    },
    store,
  );
  assert.equal(home.statusCode, 200);
  assert.equal((home.body as { player: { walletAddress: string } }).player.walletAddress, "0xabc");
  assert.equal(Array.isArray((home.body as { feed: unknown[] }).feed), true);

  const feed = await resolveRoute(
    {
      method: "POST",
      path: "/api/openclaw/execute",
      headers: { authorization: "Bearer session-123" },
      body: {
        operation: "get_feed",
      },
    },
    store,
  );
  assert.equal(feed.statusCode, 200);
  assert.equal(Array.isArray(feed.body), true);

  const xStatus = await resolveRoute(
    {
      method: "POST",
      path: "/api/openclaw/execute",
      headers: { authorization: "Bearer session-123" },
      body: {
        operation: "get_x_adapter_status",
      },
    },
    store,
  );
  assert.equal(xStatus.statusCode, 200);

  const discovery = await resolveRoute(
    {
      method: "POST",
      path: "/api/openclaw/execute",
      headers: { authorization: "Bearer session-123" },
      body: {
        operation: "get_discovery",
      },
    },
    store,
  );
  assert.equal(discovery.statusCode, 200);
  assert.equal(
    Array.isArray((discovery.body as { guidedActions: unknown[] }).guidedActions),
    true,
  );

  const plaza = await resolveRoute(
    {
      method: "POST",
      path: "/api/openclaw/execute",
      headers: { authorization: "Bearer session-123" },
      body: {
        operation: "get_plaza",
      },
    },
    store,
  );
  assert.equal(plaza.statusCode, 200);
  assert.equal(
    Array.isArray((plaza.body as { highlights: unknown[] }).highlights),
    true,
  );

  const onchainIntent = await resolveRoute(
    {
      method: "POST",
      path: "/api/openclaw/execute",
      headers: { authorization: "Bearer session-123" },
      body: {
        operation: "prepare_register_player_onchain",
      },
    },
    store,
  );
  assert.equal(onchainIntent.statusCode, 200);
  assert.equal((onchainIntent.body as { to: string }).to, "pending");

  const onchainConfirm = await resolveRoute(
    {
      method: "POST",
      path: "/api/openclaw/execute",
      headers: { authorization: "Bearer session-123" },
      body: {
        operation: "confirm_register_player_onchain",
        txHash: "0xtx-player",
      },
    },
    store,
  );
  assert.equal(onchainConfirm.statusCode, 200);
});

test("economy routes expose summary, ledger, and tip settlement", async () => {
  const store = await authenticate();
  await resolveRoute(
    {
      method: "POST",
      path: "/api/players/bootstrap",
      headers: { authorization: "Bearer session-123" },
    },
    store,
  );
  store.bootstrapPlayer("0xdef");

  const tip = await resolveRoute(
    {
      method: "POST",
      path: "/api/economy/tips",
      headers: { authorization: "Bearer session-123" },
      body: {
        fromPetId: "starter-pet",
        targetWalletAddress: "0xdef",
        toPetId: "starter-pet",
        amount: 100,
      },
    },
    store,
  );
  assert.equal(tip.statusCode, 200);

  const summary = await resolveRoute(
    {
      method: "GET",
      path: "/api/me/economy",
      headers: { authorization: "Bearer session-123" },
    },
    store,
  );
  assert.equal(summary.statusCode, 200);
  assert.equal((summary.body as { treasuryBalance: number }).treasuryBalance, 900);
  assert.equal((summary.body as { claimableBalance: number }).claimableBalance, 0);

  const ledger = await resolveRoute(
    {
      method: "GET",
      path: "/api/me/economy/ledger",
      headers: { authorization: "Bearer session-123" },
    },
    store,
  );
  assert.equal(ledger.statusCode, 200);
  assert.equal((ledger.body as Array<{ sourceType: string }>)[0]?.sourceType, "tip");
});

test("claim routes prepare, confirm, and list user initiated wallet claims", async () => {
  const store = await authenticate();
  await resolveRoute(
    {
      method: "POST",
      path: "/api/players/bootstrap",
      headers: { authorization: "Bearer session-123" },
    },
    store,
  );
  await resolveRoute(
    {
      method: "POST",
      path: "/api/pets/starter-pet/commands",
      headers: { authorization: "Bearer session-123" },
      body: { commandType: "earn" },
    },
    store,
  );
  await resolveRoute(
    {
      method: "POST",
      path: "/api/profit/withdraw",
      headers: { authorization: "Bearer session-123" },
      body: { amount: 60 },
    },
    store,
  );

  const claimIntent = await resolveRoute(
    {
      method: "POST",
      path: "/api/claims/intent",
      headers: { authorization: "Bearer session-123" },
      body: { amount: 40 },
    },
    store,
  );
  assert.equal(claimIntent.statusCode, 200);
  assert.equal((claimIntent.body as { claim: { status: string } }).claim.status, "pending");

  const claimId = (claimIntent.body as { claim: { id: string } }).claim.id;
  const confirm = await resolveRoute(
    {
      method: "POST",
      path: `/api/claims/${claimId}/confirm`,
      headers: { authorization: "Bearer session-123" },
      body: { txHash: `0x${"44".repeat(32)}` },
    },
    store,
  );
  assert.equal(confirm.statusCode, 200);
  assert.equal((confirm.body as { claim: { status: string } }).claim.status, "confirmed");

  const list = await resolveRoute(
    {
      method: "GET",
      path: "/api/me/claims",
      headers: { authorization: "Bearer session-123" },
    },
    store,
  );
  assert.equal(list.statusCode, 200);
  assert.equal((list.body as Array<{ status: string }>)[0]?.status, "confirmed");
});

test("OPTIONS /api/players/bootstrap returns preflight headers", async () => {
  const result = await resolveRoute(
    {
      method: "OPTIONS",
      path: "/api/players/bootstrap",
    },
    createStore(),
  );

  assert.equal(result.statusCode, 204);
  assert.equal(result.headers["Access-Control-Allow-Origin"], "*");
  assert.match(result.headers["Access-Control-Allow-Methods"], /POST/);
});
