import assert from "node:assert/strict";
import test from "node:test";

import {
  createOpenClawClient,
  OpenClawAuthError,
  OpenClawOnchainError,
  OpenClawXUploadError,
  type HomeSnapshot,
  type PetAutonomySummary,
  type PetPersonalitySnapshot,
  type PetRecommendation,
  type PetStrategySummary,
} from "./client.js";

test("creates auth challenge, verifies session, and bootstraps the player", async () => {
  const calls: Array<{ url: string; method: string; body?: string }> = [];
  const responses = [
    {
      walletAddress: "0xabc",
      nonce: "nonce-1",
      challenge: "Sign this wallet challenge: nonce-1",
    },
    {
      walletAddress: "0xabc",
      token: "session-1",
      authenticated: true,
    },
    {
      walletAddress: "0xabc",
      budget: 1000,
      profitPool: 0,
      xBinding: false,
      pets: [],
      chainSync: {
        syncStatus: "local",
        onchainId: "pending:player:0xabc",
        lastSyncedAt: "2026-03-24T00:00:00.000Z",
      },
      createdAt: "2026-03-24T00:00:00.000Z",
      updatedAt: "2026-03-24T00:00:00.000Z",
    },
  ];

  const client = createOpenClawClient({
    baseUrl: "http://localhost:3001",
    token: "session-1",
    fetch: async (input, init) => {
      calls.push({
        url: String(input),
        method: String(init?.method),
        body: typeof init?.body === "string" ? init.body : undefined,
      });

      return new Response(JSON.stringify(responses.shift()), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    },
  });

  const challenge = await client.createChallenge("0xabc");
  const session = await client.verifyChallenge("0xabc", "signed:nonce-1");
  const player = await client.bootstrapPlayer();

  assert.equal(challenge.nonce, "nonce-1");
  assert.equal(session.token, "session-1");
  assert.equal(player.walletAddress, "0xabc");
  assert.equal(calls[0]?.url, "http://localhost:3001/api/auth/challenge");
  assert.equal(calls[1]?.url, "http://localhost:3001/api/auth/verify");
  assert.equal(calls[2]?.url, "http://localhost:3001/api/players/bootstrap");
});

test("fetches a combined home snapshot with the bearer token", async () => {
  let calledUrl = "";
  let calledMethod = "";
  let calledAuthorization = "";

  const client = createOpenClawClient({
    baseUrl: "http://localhost:3001",
    token: "session-1",
    fetch: async (input, init) => {
      calledUrl = String(input);
      calledMethod = String(init?.method);
      calledAuthorization = String((init?.headers as Record<string, string>).Authorization);

      return new Response(
        JSON.stringify({
          player: {
            walletAddress: "0xabc",
            budget: 1000,
            profitPool: 0,
          },
          claimableBalance: 250,
          claim: {
            walletAddress: "0xabc",
            claimableBalance: 250,
            status: "ready",
            claimId: "claim-1",
            txHash: null,
            claimableAt: "2026-03-25T00:00:00.000Z",
            confirmedAt: null,
            canceledAt: null,
          },
          guidedActions: [{ id: "guided-1", title: "Do the thing" }],
          opportunityBoard: { title: "Opportunities", items: [] },
          plaza: { name: "The Plaza", featuredPets: [] },
          onboarding: { completed: false, steps: [] },
          events: [],
          xActions: [],
          personality: {
            petId: "starter-pet",
            personaProfile: { temperament: "steady" },
            loyalty: 7,
            resentment: 1,
            ambition: 4,
            heat: 2,
            strategyMode: "earn",
            autonomyLevel: "guided",
            targetPreference: "bounties",
            recentOutcomes: [],
          },
          strategySummary: {
            petId: "starter-pet",
            strategyMode: "earn",
            label: "稳健赚钱",
            summary: "Keep profit growth steady.",
          },
          autonomySummary: {
            petId: "starter-pet",
            autonomyLevel: "guided",
            label: "半自动",
            summary: "Needs light approval.",
          },
          recommendations: [
            {
              id: "rec-1",
              title: "切换到稳健赚钱",
              detail: "Keep profit growth steady.",
              strategyMode: "earn",
            },
          ],
          availableCommands: ["earn"],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    },
  });

  const home = await client.getHome();
  const typedHome: HomeSnapshot = home;

  assert.equal(calledUrl, "http://localhost:3001/api/me/home");
  assert.equal(calledMethod, "GET");
  assert.equal(calledAuthorization, "Bearer session-1");
  assert.equal(home.player.walletAddress, "0xabc");
  assert.equal(typedHome.claimableBalance, 250);
  assert.equal(typedHome.claim?.claimId, "claim-1");
  assert.deepEqual(typedHome.guidedActions, [{ id: "guided-1", title: "Do the thing" }]);
  assert.deepEqual(typedHome.opportunityBoard, { title: "Opportunities", items: [] });
  assert.deepEqual(typedHome.plaza, { name: "The Plaza", featuredPets: [] });
  assert.deepEqual(typedHome.onboarding, { completed: false, steps: [] });
  assert.equal(typedHome.personality?.strategyMode, "earn");
  assert.equal(typedHome.strategySummary?.label, "稳健赚钱");
  assert.equal(typedHome.autonomySummary?.autonomyLevel, "guided");
  assert.equal(typedHome.recommendations?.[0]?.id, "rec-1");
});

test("fetches pet personality, strategy, autonomy, and recommendations", async () => {
  const calls: Array<{ url: string; method: string; body?: string }> = [];

  const client = createOpenClawClient({
    baseUrl: "http://localhost:3001",
    token: "session-1",
    fetch: async (input, init) => {
      const url = String(input);
      calls.push({
        url,
        method: String(init?.method),
        body: typeof init?.body === "string" ? init.body : undefined,
      });

      if (url.endsWith("/api/pets/starter-pet/personality")) {
        return new Response(
          JSON.stringify({
            petId: "starter-pet",
            personaProfile: { temperament: "steady" },
            loyalty: 8,
            resentment: 2,
            ambition: 5,
            heat: 3,
            strategyMode: "earn",
            autonomyLevel: "guided",
            targetPreference: "bounties",
            recentOutcomes: [{ type: "earn", delta: 12 }],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      if (url.endsWith("/api/pets/starter-pet/strategy")) {
        return new Response(
          JSON.stringify({
            petId: "starter-pet",
            strategyMode: "taunt",
            label: "高热度挑事",
            summary: "Push visibility and heat.",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      if (url.endsWith("/api/pets/starter-pet/autonomy")) {
        return new Response(
          JSON.stringify({
            petId: "starter-pet",
            autonomyLevel: "guided",
            label: "半自动",
            summary: "Light-touch autonomy.",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      if (url.endsWith("/api/pets/starter-pet/recommendations")) {
        return new Response(
          JSON.stringify([
            {
              id: "rec-1",
              title: "提高热度",
              detail: "Try a taunt cycle to raise attention.",
              strategyMode: "taunt",
            },
          ]),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      throw new Error(`Unexpected request: ${url}`);
    },
  });

  const personality = await client.getPetPersonality("starter-pet");
  const strategy = await client.setPetStrategy("starter-pet", "taunt");
  const autonomy = await client.setPetAutonomy("starter-pet", "guided");
  const recommendations = await client.getPetRecommendations("starter-pet");

  const typedPersonality: PetPersonalitySnapshot = personality;
  const typedStrategy: PetStrategySummary = strategy;
  const typedAutonomy: PetAutonomySummary = autonomy;
  const typedRecommendations: readonly PetRecommendation[] = recommendations;

  assert.equal(typedPersonality.loyalty, 8);
  assert.equal(typedStrategy.label, "高热度挑事");
  assert.equal(typedAutonomy.autonomyLevel, "guided");
  assert.equal(typedRecommendations[0]?.title, "提高热度");
  assert.equal(calls[0]?.url, "http://localhost:3001/api/pets/starter-pet/personality");
  assert.equal(calls[1]?.url, "http://localhost:3001/api/pets/starter-pet/strategy");
  assert.equal(calls[1]?.body, JSON.stringify({ strategyMode: "taunt" }));
  assert.equal(calls[2]?.url, "http://localhost:3001/api/pets/starter-pet/autonomy");
  assert.equal(calls[2]?.body, JSON.stringify({ autonomyLevel: "guided" }));
  assert.equal(calls[3]?.url, "http://localhost:3001/api/pets/starter-pet/recommendations");
});

test("issues a pet command with the expected payload", async () => {
  let calledBody = "";

  const client = createOpenClawClient({
    baseUrl: "http://localhost:3001",
    token: "session-1",
    fetch: async (_input, init) => {
      calledBody = String(init?.body ?? "");

      return new Response(
        JSON.stringify({
          player: { walletAddress: "0xabc", budget: 1000, profitPool: 120 },
          pet: { id: "starter-pet" },
          event: { type: "pet_command_issued" },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    },
  });

  await client.issuePetCommand("starter-pet", "earn");

  assert.equal(calledBody, JSON.stringify({ commandType: "earn" }));
});

test("updates pet budget and uploads X actions", async () => {
  const calls: Array<{ url: string; method: string; body: string }> = [];

  const client = createOpenClawClient({
    baseUrl: "http://localhost:3001",
    token: "session-1",
    fetch: async (input, init) => {
      calls.push({
        url: String(input),
        method: String(init?.method),
        body: String(init?.body ?? ""),
      });

      return new Response(
        JSON.stringify({
          id: "starter-pet",
          budget: { spendableBudget: 250, singleTxLimit: 75, dailyLimit: 300 },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    },
  });

  await client.updatePetBudget("starter-pet", {
    spendableBudget: 250,
    singleTxLimit: 75,
    dailyLimit: 300,
  });
  await client.uploadXAction({
    petId: "starter-pet",
    xAccountId: "ChaosPet_A",
    actionType: "post",
    tweetId: "tweet-1",
    content: "hello timeline",
  });

  assert.equal(calls[0]?.url, "http://localhost:3001/api/pets/starter-pet/budget");
  assert.equal(calls[0]?.method, "PATCH");
  assert.equal(calls[1]?.url, "http://localhost:3001/api/x/actions/upload");
  assert.equal(calls[1]?.body, JSON.stringify({
    petId: "starter-pet",
    xAccountId: "ChaosPet_A",
    actionType: "post",
    tweetId: "tweet-1",
    content: "hello timeline",
  }));
});

test("fetches economy summary and submits canned economy actions", async () => {
  const calls: Array<{ url: string; method: string; body?: string }> = [];

  const client = createOpenClawClient({
    baseUrl: "http://localhost:3001",
    token: "session-1",
    fetch: async (input, init) => {
      const url = String(input);
      calls.push({
        url,
        method: String(init?.method),
        body: typeof init?.body === "string" ? init.body : undefined,
      });

      if (url.endsWith("/api/me/economy")) {
        return new Response(
          JSON.stringify({
            currencyCode: "CANS",
            currencyName: "罐头",
            treasuryBalance: 900,
            profitPool: 95,
            platformTreasury: 5,
            openBounties: 1,
            openDuels: 0,
            openServiceOrders: 0,
            ledgerEntries: 2,
            claimableBalance: 120,
            claim: {
              walletAddress: "0xabc",
              claimableBalance: 120,
              status: "ready",
              claimId: "claim-1",
              txHash: null,
              claimableAt: "2026-03-25T00:00:00.000Z",
              confirmedAt: null,
              canceledAt: null,
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      if (url.endsWith("/api/me/economy/ledger")) {
        return new Response(
          JSON.stringify([{ id: "ledger-1", sourceType: "tip", amount: 100 }]),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      if (url.endsWith("/api/economy/tips")) {
        return new Response(
          JSON.stringify({
            tip: { id: "tip-1", grossAmount: 100, netAmount: 95, feeAmount: 5 },
            sender: { walletAddress: "0xabc" },
            recipient: { walletAddress: "0xdef" },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      return new Response(
        JSON.stringify({
          bounty: {
            id: "bounty-1",
            status: "open",
            title: "Callout",
            grossAmount: 200,
            netAmount: 184,
            targetWalletAddress: "0xdef",
            targetPetId: "starter-pet",
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    },
  });

  const economy = await client.getEconomy();
  const ledger = await client.getLedger();
  const tip = await client.createTip("starter-pet", "0xdef", "starter-pet", 100);
  const bounty = await client.createBounty({
    creatorPetId: "starter-pet",
    targetWalletAddress: "0xdef",
    targetPetId: "starter-pet",
    title: "Callout",
    detail: "Force a reply",
    amount: 200,
  });

  assert.equal(economy.currencyCode, "CANS");
  assert.equal(ledger[0]?.sourceType, "tip");
  assert.equal(tip.tip.netAmount, 95);
  assert.equal(bounty.bounty.status, "open");
  assert.equal(calls[0]?.url, "http://localhost:3001/api/me/economy");
  assert.equal(calls[2]?.body, JSON.stringify({
    fromPetId: "starter-pet",
    targetWalletAddress: "0xdef",
    toPetId: "starter-pet",
    amount: 100,
  }));
});

test("fetches claim snapshots and runs the claim lifecycle", async () => {
  const calls: Array<{ url: string; method: string; body?: string }> = [];

  const client = createOpenClawClient({
    baseUrl: "http://localhost:3001",
    token: "session-1",
    fetch: async (input, init) => {
      const url = String(input);
      calls.push({
        url,
        method: String(init?.method),
        body: typeof init?.body === "string" ? init.body : undefined,
      });

      if (url.endsWith("/api/me/claim")) {
        return new Response(
          JSON.stringify({
            walletAddress: "0xabc",
            claimableBalance: 450,
            status: "ready",
            claimId: "claim-1",
            txHash: null,
            claimableAt: "2026-03-25T00:00:00.000Z",
            confirmedAt: null,
            canceledAt: null,
            claimableCurrencyCode: "CANS",
            claimableCurrencyName: "罐头",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      if (url.endsWith("/api/onchain/claim/intent")) {
        return new Response(
          JSON.stringify({
            to: "0xclaim-vault",
            data: "0xclaim",
            value: "0x0",
            chainId: 196,
            chainNamespaceId: "eip155:196",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      if (url.endsWith("/api/onchain/claim/confirm")) {
        return new Response(
          JSON.stringify({
            walletAddress: "0xabc",
            claimableBalance: 0,
            status: "confirmed",
            claimId: "claim-1",
            txHash: "0xclaimtx",
            claimableAt: "2026-03-25T00:00:00.000Z",
            confirmedAt: "2026-03-25T00:05:00.000Z",
            canceledAt: null,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      if (url.endsWith("/api/onchain/claim/cancel")) {
        return new Response(
          JSON.stringify({
            walletAddress: "0xabc",
            claimableBalance: 450,
            status: "canceled",
            claimId: "claim-1",
            txHash: null,
            claimableAt: "2026-03-25T00:00:00.000Z",
            confirmedAt: null,
            canceledAt: "2026-03-25T00:10:00.000Z",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      throw new Error(`Unexpected request: ${url}`);
    },
  });

  const snapshot = await client.getClaimSnapshot();
  const intent = await client.prepareClaimOnchain();
  const confirmed = await client.confirmClaimOnchain("0xclaimtx");
  const canceled = await client.cancelClaimOnchain();

  assert.equal(snapshot.claimableBalance, 450);
  assert.equal(intent.chainNamespaceId, "eip155:196");
  assert.equal(confirmed.status, "confirmed");
  assert.equal(canceled.status, "canceled");
  assert.equal(calls[0]?.url, "http://localhost:3001/api/me/claim");
  assert.equal(calls[1]?.url, "http://localhost:3001/api/onchain/claim/intent");
  assert.equal(calls[2]?.body, JSON.stringify({ txHash: "0xclaimtx" }));
  assert.equal(calls[3]?.url, "http://localhost:3001/api/onchain/claim/cancel");
});

test("builds and confirms explicit onchain sync flows", async () => {
  const calls: Array<{ url: string; method: string; body?: string }> = [];

  const client = createOpenClawClient({
    baseUrl: "http://localhost:3001",
    token: "session-1",
    fetch: async (input, init) => {
      calls.push({
        url: String(input),
        method: String(init?.method),
        body: typeof init?.body === "string" ? init.body : undefined,
      });

      return new Response(
        JSON.stringify({
          to: "0xregistry",
          data: "0xabc",
          value: "0x0",
          chainId: 1952,
          chainNamespaceId: "eip155:1952",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    },
  });

  await client.prepareRegisterPlayerOnchain();
  await client.confirmRegisterPlayerOnchain("0xtx-player");
  await client.prepareCreatePetOnchain("starter-pet");
  await client.confirmCreatePetOnchain("starter-pet", "0xtx-pet");
  await client.prepareSetPetBudgetOnchain("starter-pet");
  await client.confirmSetPetBudgetOnchain("starter-pet", "0xtx-budget");

  assert.equal(calls[0]?.url, "http://localhost:3001/api/onchain/register-player/intent");
  assert.equal(calls[1]?.url, "http://localhost:3001/api/onchain/register-player/confirm");
  assert.equal(calls[1]?.body, JSON.stringify({ txHash: "0xtx-player" }));
  assert.equal(calls[2]?.url, "http://localhost:3001/api/onchain/create-pet/intent");
  assert.equal(calls[2]?.body, JSON.stringify({ petId: "starter-pet" }));
  assert.equal(calls[3]?.url, "http://localhost:3001/api/onchain/create-pet/confirm");
  assert.equal(calls[4]?.url, "http://localhost:3001/api/onchain/set-budget/intent");
  assert.equal(calls[5]?.url, "http://localhost:3001/api/onchain/set-budget/confirm");
});

test("surfaces typed failures for auth, onchain, and X upload flows", async () => {
  const client = createOpenClawClient({
    baseUrl: "http://localhost:3001",
    token: "session-1",
    fetch: async (input) => {
      const url = String(input);

      if (url.endsWith("/api/auth/verify")) {
        return new Response(JSON.stringify({ error: "invalid signature" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (url.endsWith("/api/onchain/register-player/confirm")) {
        return new Response(JSON.stringify({ error: "receipt reverted" }), {
          status: 503,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (url.endsWith("/api/x/actions/upload")) {
        return new Response(JSON.stringify({ error: "x action missing proof" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({}), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    },
  });

  await assert.rejects(
    client.verifyChallenge("0xabc", "bad-signature"),
    (error: unknown) =>
      error instanceof OpenClawAuthError &&
      error.kind === "auth" &&
      error.statusCode === 401 &&
      error.message === "invalid signature",
  );

  await assert.rejects(
    client.confirmRegisterPlayerOnchain("0xtx"),
    (error: unknown) =>
      error instanceof OpenClawOnchainError &&
      error.kind === "onchain" &&
      error.phase === "confirm" &&
      error.action === "register-player" &&
      error.statusCode === 503,
  );

  await assert.rejects(
    client.uploadXAction({
      petId: "starter-pet",
      xAccountId: "ChaosPet_A",
      actionType: "post",
      tweetId: "tweet-1",
      content: "hello timeline",
    }),
    (error: unknown) =>
      error instanceof OpenClawXUploadError &&
      error.kind === "x-upload" &&
      error.statusCode === 400,
  );
});

test("retries confirm and upload requests through the retry-friendly helpers", async () => {
  const calls: string[] = [];
  const client = createOpenClawClient({
    baseUrl: "http://localhost:3001",
    token: "session-1",
    fetch: async (input) => {
      const url = String(input);
      calls.push(url);

      if (calls.length === 1) {
        return new Response(JSON.stringify({ error: "please retry" }), {
          status: 503,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (url.endsWith("/api/onchain/register-player/confirm")) {
        return new Response(
          JSON.stringify({
            walletAddress: "0xabc",
            budget: 1000,
            profitPool: 0,
            xBinding: false,
            pets: [],
            chainSync: {
              syncStatus: "synced",
              onchainId: "0xabc",
              lastSyncedAt: "2026-03-24T00:00:00.000Z",
            },
            createdAt: "2026-03-24T00:00:00.000Z",
            updatedAt: "2026-03-24T00:00:00.000Z",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      return new Response(
        JSON.stringify({
          action: {
            id: "x-1",
            petId: "starter-pet",
            xAccountId: "ChaosPet_A",
            actionType: "post",
            tweetId: "tweet-1",
            replyToTweetId: null,
            content: "hello timeline",
            localProof: "openclaw-run-1",
            status: "confirmed",
            submittedAt: "2026-03-24T00:00:00.000Z",
            resolvedAt: "2026-03-24T00:00:00.000Z",
            failureReason: null,
            verificationNotes: "validated via local upload contract",
          },
          event: {
            id: "evt-2",
            type: "x_action_verified",
            title: "X action verified",
            detail: "Sprout uploaded a verified post action for tweet tweet-1.",
            createdAt: "2026-03-24T00:00:00.000Z",
            petId: "starter-pet",
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    },
  });

  const confirmResult = await client.confirmRegisterPlayerOnchainWithRetry("0xtx", {
    maxAttempts: 2,
  });
  const uploadResult = await client.uploadXActionWithRetry(
    {
      petId: "starter-pet",
      xAccountId: "ChaosPet_A",
      actionType: "post",
      tweetId: "tweet-1",
      content: "hello timeline",
    },
    {
      maxAttempts: 2,
    },
  );

  assert.equal(confirmResult.chainSync.syncStatus, "synced");
  assert.equal(uploadResult.action.tweetId, "tweet-1");
  assert.equal(calls.length, 3);
});
