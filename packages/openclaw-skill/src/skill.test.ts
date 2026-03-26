import assert from "node:assert/strict";
import test from "node:test";

import {
  createOpenClawSkill,
  listOpenClawCommandPhrases,
  listOpenClawStrategyPhrases,
  normalizeOpenClawStrategy,
  type HomeSnapshot,
  type PetAutonomySummary,
  type PetPersonalitySnapshot,
  type PetRecommendation,
  type PetStrategySummary,
} from "./index.js";

test("login stores a session token and enables follow-up calls", async () => {
  const calls: Array<{ url: string; method: string; body?: string }> = [];

  const skill = createOpenClawSkill({
    baseUrl: "http://localhost:3001",
    fetch: async (input, init) => {
      const url = String(input);
      const method = String(init?.method);
      const body = typeof init?.body === "string" ? init.body : undefined;
      calls.push({ url, method, body });

      if (url.endsWith("/api/auth/challenge")) {
        return new Response(
          JSON.stringify({
            walletAddress: "0xabc",
            nonce: "nonce-1",
            challenge: "Sign this wallet challenge: nonce-1",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      if (url.endsWith("/api/auth/verify")) {
        return new Response(
          JSON.stringify({
            walletAddress: "0xabc",
            token: "session-1",
            authenticated: true,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      if (url.endsWith("/api/players/bootstrap")) {
        return new Response(
          JSON.stringify({
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
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      return new Response(
        JSON.stringify({
          player: {
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
          guidedActions: [{ id: "guided-1", title: "Do the thing" }],
          opportunityBoard: { title: "Opportunities", items: [] },
          plaza: { name: "The Plaza", featuredPets: [] },
          onboarding: { completed: false, steps: [] },
          events: [],
          xActions: [],
          availableCommands: ["earn"],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    },
  });

  const session = await skill.login({
    walletAddress: "0xabc",
    signChallenge: (challenge) => `signed:${challenge.nonce}`,
  });

  const player = await skill.bootstrap();
  const home = await skill.home();
  const typedHome: HomeSnapshot = home;

  assert.equal(session.token, "session-1");
  assert.equal(player.walletAddress, "0xabc");
  assert.equal(home.player.walletAddress, "0xabc");
  assert.deepEqual(typedHome.guidedActions, [{ id: "guided-1", title: "Do the thing" }]);
  assert.deepEqual(typedHome.opportunityBoard, { title: "Opportunities", items: [] });
  assert.deepEqual(typedHome.plaza, { name: "The Plaza", featuredPets: [] });
  assert.deepEqual(typedHome.onboarding, { completed: false, steps: [] });
  assert.equal(calls[0]?.url, "http://localhost:3001/api/auth/challenge");
  assert.equal(calls[1]?.url, "http://localhost:3001/api/auth/verify");
  assert.equal(calls[2]?.url, "http://localhost:3001/api/players/bootstrap");
  assert.equal(calls[3]?.url, "http://localhost:3001/api/me/home");
});

test("command, budget, and uploadX reuse the logged-in session", async () => {
  const calls: Array<{ url: string; method: string; body?: string }> = [];

  const skill = createOpenClawSkill({
    baseUrl: "http://localhost:3001",
    fetch: async (input, init) => {
      const url = String(input);
      calls.push({
        url,
        method: String(init?.method),
        body: typeof init?.body === "string" ? init.body : undefined,
      });

      if (url.endsWith("/api/auth/challenge")) {
        return new Response(
          JSON.stringify({
            walletAddress: "0xabc",
            nonce: "nonce-1",
            challenge: "Sign this wallet challenge: nonce-1",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      if (url.endsWith("/api/auth/verify")) {
        return new Response(
          JSON.stringify({
            walletAddress: "0xabc",
            token: "session-1",
            authenticated: true,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      if (url.endsWith("/api/pets/starter-pet/commands")) {
        return new Response(
          JSON.stringify({
            player: {
              walletAddress: "0xabc",
              budget: 1000,
              profitPool: 120,
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
            pet: {
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
            event: {
              id: "evt-1",
              type: "pet_command_issued",
              title: "Pet ran an earning loop",
              detail: "The pet completed a safe earning action and added profit to the pool.",
              createdAt: "2026-03-24T00:00:00.000Z",
              petId: "starter-pet",
              commandType: "earn",
              amount: 120,
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      if (url.endsWith("/api/pets/starter-pet/budget")) {
        return new Response(
          JSON.stringify({
            id: "starter-pet",
            name: "Sprout",
            species: "starter-cat",
            level: 1,
            starter: true,
            budget: {
              spendableBudget: 250,
              singleTxLimit: 75,
              dailyLimit: 300,
            },
            chainSync: {
              syncStatus: "local",
              onchainId: "pending:pet:0xabc:starter-pet",
              lastSyncedAt: "2026-03-24T00:00:00.000Z",
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      if (url.endsWith("/api/x/actions/upload")) {
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
      }

      return new Response(
        JSON.stringify({
          player: {
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
          guidedActions: [{ id: "guided-1", title: "Do the thing" }],
          opportunityBoard: { title: "Opportunities", items: [] },
          plaza: { name: "The Plaza", featuredPets: [] },
          onboarding: { completed: false, steps: [] },
          events: [],
          xActions: [],
          availableCommands: ["earn"],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    },
  });

  await skill.login({
    walletAddress: "0xabc",
    signChallenge: async (challenge) => `signed:${challenge.nonce}`,
  });

  const command = await skill.command("starter-pet", "earn");
  const budget = await skill.budget("starter-pet", {
    spendableBudget: 250,
    singleTxLimit: 75,
    dailyLimit: 300,
  });
  const xAction = await skill.uploadX({
    petId: "starter-pet",
    xAccountId: "ChaosPet_A",
    actionType: "post",
    tweetId: "tweet-1",
    content: "hello timeline",
  });

  assert.equal(command.player.profitPool, 120);
  assert.equal(budget.budget.spendableBudget, 250);
  assert.equal(xAction.action.tweetId, "tweet-1");
  assert.equal(calls[0]?.url, "http://localhost:3001/api/auth/challenge");
  assert.equal(calls[2]?.url, "http://localhost:3001/api/pets/starter-pet/commands");
  assert.equal(calls[3]?.url, "http://localhost:3001/api/pets/starter-pet/budget");
  assert.equal(calls[4]?.url, "http://localhost:3001/api/x/actions/upload");
});

test("keeps the five-command surface stable and normalizes strategy labels", async () => {
  assert.equal(listOpenClawCommandPhrases().length, 5);
  assert.equal(listOpenClawStrategyPhrases().length, 5);
  assert.equal(normalizeOpenClawStrategy("高热度挑事"), "taunt");
  assert.equal(normalizeOpenClawStrategy("稳健赚钱"), "earn");
});

test("economy helpers reuse the logged-in session", async () => {
  const calls: Array<{ url: string; method: string; body?: string }> = [];

  const skill = createOpenClawSkill({
    baseUrl: "http://localhost:3001",
    fetch: async (input, init) => {
      const url = String(input);
      calls.push({
        url,
        method: String(init?.method),
        body: typeof init?.body === "string" ? init.body : undefined,
      });

      if (url.endsWith("/api/auth/challenge")) {
        return new Response(
          JSON.stringify({
            walletAddress: "0xabc",
            nonce: "nonce-1",
            challenge: "Sign this wallet challenge: nonce-1",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      if (url.endsWith("/api/auth/verify")) {
        return new Response(
          JSON.stringify({
            walletAddress: "0xabc",
            token: "session-1",
            authenticated: true,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

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
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      if (url.endsWith("/api/me/economy/ledger")) {
        return new Response(JSON.stringify([{ id: "ledger-1", sourceType: "tip" }]), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      return new Response(
        JSON.stringify({
          tip: { id: "tip-1", grossAmount: 100, netAmount: 95, feeAmount: 5 },
          sender: { walletAddress: "0xabc" },
          recipient: { walletAddress: "0xdef" },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    },
  });

  await skill.login({
    walletAddress: "0xabc",
    signChallenge: async (challenge) => `signed:${challenge.nonce}`,
  });

  const economy = await skill.economy();
  const ledger = await skill.ledger();
  const tip = await skill.tip("starter-pet", "0xdef", "starter-pet", 100);

  assert.equal(economy.currencyCode, "CANS");
  assert.equal(ledger[0]?.sourceType, "tip");
  assert.equal(tip.tip.netAmount, 95);
  assert.equal(calls[2]?.url, "http://localhost:3001/api/me/economy");
  assert.equal(calls[4]?.body, JSON.stringify({
    fromPetId: "starter-pet",
    targetWalletAddress: "0xdef",
    toPetId: "starter-pet",
    amount: 100,
  }));
});

test("personality helpers reuse the logged-in session", async () => {
  const calls: Array<{ url: string; method: string; body?: string }> = [];

  const skill = createOpenClawSkill({
    baseUrl: "http://localhost:3001",
    fetch: async (input, init) => {
      const url = String(input);
      calls.push({
        url,
        method: String(init?.method),
        body: typeof init?.body === "string" ? init.body : undefined,
      });

      if (url.endsWith("/api/auth/challenge")) {
        return new Response(
          JSON.stringify({
            walletAddress: "0xabc",
            nonce: "nonce-1",
            challenge: "Sign this wallet challenge: nonce-1",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      if (url.endsWith("/api/auth/verify")) {
        return new Response(
          JSON.stringify({
            walletAddress: "0xabc",
            token: "session-1",
            authenticated: true,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

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

  await skill.login({
    walletAddress: "0xabc",
    signChallenge: async (challenge) => `signed:${challenge.nonce}`,
  });

  const personality = await skill.personality("starter-pet");
  const strategy = await skill.setStrategy("starter-pet", "高热度挑事");
  const autonomy = await skill.setAutonomy("starter-pet", "guided");
  const recommendations = await skill.recommendations("starter-pet");

  assert.equal(personality.loyalty, 8);
  assert.equal(strategy.label, "高热度挑事");
  assert.equal(autonomy.autonomyLevel, "guided");
  assert.equal(recommendations[0]?.title, "提高热度");
  assert.equal(calls[2]?.url, "http://localhost:3001/api/pets/starter-pet/personality");
  assert.equal(calls[3]?.url, "http://localhost:3001/api/pets/starter-pet/strategy");
  assert.equal(calls[3]?.body, JSON.stringify({ strategyMode: "taunt" }));
  assert.equal(calls[4]?.url, "http://localhost:3001/api/pets/starter-pet/autonomy");
  assert.equal(calls[4]?.body, JSON.stringify({ autonomyLevel: "guided" }));
  assert.equal(calls[5]?.url, "http://localhost:3001/api/pets/starter-pet/recommendations");
});

test("claim helpers reuse the logged-in session", async () => {
  const calls: Array<{ url: string; method: string; body?: string }> = [];
  const skill = createOpenClawSkill({
    baseUrl: "http://localhost:3001",
    fetch: async (input, init) => {
      const url = String(input);
      calls.push({
        url,
        method: String(init?.method),
        body: typeof init?.body === "string" ? init.body : undefined,
      });

      if (url.endsWith("/api/auth/challenge")) {
        return new Response(
          JSON.stringify({
            walletAddress: "0xabc",
            nonce: "nonce-1",
            challenge: "Sign this wallet challenge: nonce-1",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      if (url.endsWith("/api/auth/verify")) {
        return new Response(
          JSON.stringify({
            walletAddress: "0xabc",
            token: "session-1",
            authenticated: true,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      if (url.endsWith("/api/me/claim")) {
        return new Response(
          JSON.stringify({
            walletAddress: "0xabc",
            claimableBalance: 420,
            status: "ready",
            claimId: "claim-1",
            txHash: null,
            claimableAt: "2026-03-25T00:00:00.000Z",
            confirmedAt: null,
            canceledAt: null,
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
            claimableBalance: 420,
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

  await skill.login({
    walletAddress: "0xabc",
    signChallenge: async (challenge) => `signed:${challenge.nonce}`,
  });

  const snapshot = await skill.claimSnapshot();
  const intent = await skill.prepareClaimOnchain();
  const confirmed = await skill.confirmClaimOnchain("0xclaimtx");
  const canceled = await skill.cancelClaimOnchain();

  assert.equal(snapshot.claimableBalance, 420);
  assert.equal(intent.chainId, 196);
  assert.equal(confirmed.status, "confirmed");
  assert.equal(canceled.status, "canceled");
  assert.equal(calls[2]?.url, "http://localhost:3001/api/me/claim");
  assert.equal(calls[3]?.url, "http://localhost:3001/api/onchain/claim/intent");
  assert.equal(calls[4]?.body, JSON.stringify({ txHash: "0xclaimtx" }));
  assert.equal(calls[5]?.url, "http://localhost:3001/api/onchain/claim/cancel");
});

test("execute dispatches supported operations through one entry point", async () => {
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
      claimableBalance: 420,
      status: "ready",
      claimId: "claim-1",
      txHash: null,
      claimableAt: "2026-03-25T00:00:00.000Z",
      confirmedAt: null,
      canceledAt: null,
    },
    {
      player: {
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
      events: [],
      xActions: [],
      availableCommands: ["earn"],
    },
    {
      petId: "starter-pet",
      personaProfile: { temperament: "steady" },
      loyalty: 8,
      resentment: 2,
      ambition: 5,
      heat: 3,
      strategyMode: "earn",
      autonomyLevel: "guided",
      targetPreference: "bounties",
      recentOutcomes: [],
    },
    {
      petId: "starter-pet",
      strategyMode: "taunt",
      label: "高热度挑事",
      summary: "Push visibility and heat.",
    },
    {
      petId: "starter-pet",
      autonomyLevel: "guided",
      label: "半自动",
      summary: "Light-touch autonomy.",
    },
    [
      {
        id: "rec-1",
        title: "提高热度",
        detail: "Try a taunt cycle to raise attention.",
        strategyMode: "taunt",
      },
    ],
  ];

  const skill = createOpenClawSkill({
    baseUrl: "http://localhost:3001",
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

  await skill.execute({
    operation: "login",
    walletAddress: "0xabc",
    signChallenge: async (challenge) => `signed:${challenge.nonce}`,
  });

  const claimSnapshot = await skill.execute({ operation: "claimSnapshot" });
  const home = await skill.execute({ operation: "home" });
  const personality = await skill.execute({ operation: "get_personality", petId: "starter-pet" });
  const strategy = await skill.execute({ operation: "set_strategy", petId: "starter-pet", strategy: "高热度挑事" });
  const autonomy = await skill.execute({ operation: "set_autonomy", petId: "starter-pet", autonomyLevel: "guided" });
  const recommendations = await skill.execute({
    operation: "get_recommendations",
    petId: "starter-pet",
  });

  assert.equal("claimableBalance" in claimSnapshot, true);
  if (!("claimableBalance" in claimSnapshot)) {
    throw new Error("expected claim snapshot");
  }
  assert.equal(claimSnapshot.claimableBalance, 420);
  assert.equal("player" in home, true);
  if (!("player" in home)) {
    throw new Error("expected home snapshot");
  }

  const typedHome = home as { player: { walletAddress: string } };
  assert.equal(typedHome.player.walletAddress, "0xabc");
  const typedPersonality = personality as PetPersonalitySnapshot;
  const typedStrategy = strategy as PetStrategySummary;
  const typedAutonomy = autonomy as PetAutonomySummary;
  const typedRecommendations = recommendations as readonly PetRecommendation[];
  assert.equal(typedPersonality.strategyMode, "earn");
  assert.equal(typedStrategy.label, "高热度挑事");
  assert.equal(typedAutonomy.autonomyLevel, "guided");
  assert.equal(typedRecommendations[0]?.title, "提高热度");
  if ("guidedActions" in home) {
    const detailedHome = home as HomeSnapshot;
    assert.deepEqual(detailedHome.guidedActions, [{ id: "guided-1", title: "Do the thing" }]);
    assert.deepEqual(detailedHome.opportunityBoard, { title: "Opportunities", items: [] });
    assert.deepEqual(detailedHome.plaza, { name: "The Plaza", featuredPets: [] });
    assert.deepEqual(detailedHome.onboarding, { completed: false, steps: [] });
  }
  assert.equal(calls[2]?.url, "http://localhost:3001/api/me/claim");
  assert.equal(calls[3]?.url, "http://localhost:3001/api/me/home");
  assert.equal(calls[4]?.url, "http://localhost:3001/api/pets/starter-pet/personality");
  assert.equal(calls[5]?.url, "http://localhost:3001/api/pets/starter-pet/strategy");
  assert.equal(calls[5]?.body, JSON.stringify({ strategyMode: "taunt" }));
  assert.equal(calls[6]?.url, "http://localhost:3001/api/pets/starter-pet/autonomy");
  assert.equal(calls[6]?.body, JSON.stringify({ autonomyLevel: "guided" }));
  assert.equal(calls[7]?.url, "http://localhost:3001/api/pets/starter-pet/recommendations");
});

test("loginWithWallet uses the host wallet address and message signature", async () => {
  const seenBodies: string[] = [];

  const skill = createOpenClawSkill({
    baseUrl: "http://localhost:3001",
    fetch: async (input, init) => {
      const url = String(input);
      if (typeof init?.body === "string") {
        seenBodies.push(init.body);
      }

      if (url.endsWith("/api/auth/challenge")) {
        return new Response(
          JSON.stringify({
            walletAddress: "0xagentic",
            nonce: "nonce-wallet",
            challenge: "Sign this wallet challenge: nonce-wallet",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      if (url.endsWith("/api/auth/verify")) {
        return new Response(
          JSON.stringify({
            walletAddress: "0xagentic",
            token: "session-wallet",
            authenticated: true,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      throw new Error(`Unexpected request: ${url}`);
    },
  });

  const session = await skill.loginWithWallet({
    getAddress: async () => "0xagentic",
    signMessage: async (message) => `signature:${message}`,
    sendTransaction: async () => "0xtx-unused",
  });

  assert.equal(session.walletAddress, "0xagentic");
  assert.equal(session.token, "session-wallet");
  assert.match(seenBodies[1] ?? "", /signature:Sign this wallet challenge: nonce-wallet/);
});

test("onchain wallet helpers build, send, and confirm txs through the logged-in session", async () => {
  const calls: Array<{ url: string; method: string; body?: string }> = [];
  const sentTransactions: Array<Record<string, unknown>> = [];

  const skill = createOpenClawSkill({
    baseUrl: "http://localhost:3001",
    fetch: async (input, init) => {
      const url = String(input);
      calls.push({
        url,
        method: String(init?.method),
        body: typeof init?.body === "string" ? init.body : undefined,
      });

      if (url.endsWith("/api/auth/challenge")) {
        return new Response(
          JSON.stringify({
            walletAddress: "0xabc",
            nonce: "nonce-1",
            challenge: "Sign this wallet challenge: nonce-1",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      if (url.endsWith("/api/auth/verify")) {
        return new Response(
          JSON.stringify({
            walletAddress: "0xabc",
            token: "session-1",
            authenticated: true,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      if (url.endsWith("/api/onchain/register-player/intent")) {
        return new Response(
          JSON.stringify({
            to: "0xregistry",
            data: "0xregister",
            value: "0x0",
            chainId: 1952,
            chainNamespaceId: "eip155:1952",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
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

      if (url.endsWith("/api/onchain/create-pet/intent")) {
        return new Response(
          JSON.stringify({
            to: "0xregistry",
            data: "0xcreatepet",
            value: "0x0",
            chainId: 1952,
            chainNamespaceId: "eip155:1952",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      if (url.endsWith("/api/onchain/set-budget/intent")) {
        return new Response(
          JSON.stringify({
            to: "0xvault",
            data: "0xsetbudget",
            value: "0x0",
            chainId: 1952,
            chainNamespaceId: "eip155:1952",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      if (url.endsWith("/api/onchain/create-pet/confirm") || url.endsWith("/api/onchain/set-budget/confirm")) {
        return new Response(
          JSON.stringify({
            id: "starter-pet",
            name: "Sprout",
            species: "starter-cat",
            level: 1,
            starter: true,
            budget: {
              spendableBudget: 250,
              singleTxLimit: 75,
              dailyLimit: 300,
            },
            chainSync: {
              syncStatus: "synced",
              onchainId: "7",
              lastSyncedAt: "2026-03-24T00:00:00.000Z",
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      return new Response(
        JSON.stringify({
          id: "starter-pet",
          name: "Sprout",
          species: "starter-cat",
          level: 1,
          starter: true,
          budget: {
            spendableBudget: 250,
            singleTxLimit: 75,
            dailyLimit: 300,
          },
          chainSync: {
            syncStatus: "synced",
            onchainId: "7",
            lastSyncedAt: "2026-03-24T00:00:00.000Z",
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    },
  });

  await skill.login({
    walletAddress: "0xabc",
    signChallenge: async (challenge) => `signed:${challenge.nonce}`,
  });

  const wallet = {
    getAddress: async () => "0xabc",
    signMessage: async (message: string) => `signature:${message}`,
    sendTransaction: async (tx: Record<string, unknown>) => {
      sentTransactions.push(tx);
      return sentTransactions.length === 1 ? "0xtx-player" : sentTransactions.length === 2 ? "0xtx-pet" : "0xtx-budget";
    },
  };

  const player = await skill.registerPlayerOnchainWithWallet(wallet);
  const pet = await skill.createPetOnchainWithWallet(wallet, "starter-pet");
  const budget = await skill.execute({
    operation: "setPetBudgetOnchainWithWallet",
    petId: "starter-pet",
    wallet,
  });

  assert.equal(player.chainSync.syncStatus, "synced");
  assert.equal(pet.chainSync.onchainId, "7");
  assert.equal("chainSync" in budget, true);
  assert.equal(sentTransactions[0]?.to, "0xregistry");
  assert.equal(sentTransactions[1]?.to, "0xregistry");
  assert.equal(sentTransactions[2]?.to, "0xvault");
  assert.equal(calls[2]?.url, "http://localhost:3001/api/onchain/register-player/intent");
  assert.equal(calls[3]?.url, "http://localhost:3001/api/onchain/register-player/confirm");
  assert.equal(calls[4]?.url, "http://localhost:3001/api/onchain/create-pet/intent");
  assert.equal(calls[5]?.url, "http://localhost:3001/api/onchain/create-pet/confirm");
  assert.equal(calls[6]?.url, "http://localhost:3001/api/onchain/set-budget/intent");
  assert.equal(calls[7]?.url, "http://localhost:3001/api/onchain/set-budget/confirm");
});

test("retry-friendly skill helpers reuse confirm and upload flows", async () => {
  const calls: string[] = [];
  const skill = createOpenClawSkill({
    baseUrl: "http://localhost:3001",
    fetch: async (input, init) => {
      const url = String(input);
      calls.push(url);

      if (url.endsWith("/api/auth/challenge")) {
        return new Response(
          JSON.stringify({
            walletAddress: "0xabc",
            nonce: "nonce-1",
            challenge: "Sign this wallet challenge: nonce-1",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      if (url.endsWith("/api/auth/verify")) {
        return new Response(
          JSON.stringify({
            walletAddress: "0xabc",
            token: "session-1",
            authenticated: true,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      if (url.endsWith("/api/onchain/register-player/confirm")) {
        if (calls.filter((entry) => entry.endsWith("/api/onchain/register-player/confirm")).length === 1) {
          return new Response(JSON.stringify({ error: "retry me" }), {
            status: 503,
            headers: { "Content-Type": "application/json" },
          });
        }

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

      if (url.endsWith("/api/x/actions/upload")) {
        if (calls.filter((entry) => entry.endsWith("/api/x/actions/upload")).length === 1) {
          return new Response(JSON.stringify({ error: "retry me" }), {
            status: 503,
            headers: { "Content-Type": "application/json" },
          });
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
      }

      throw new Error(`Unexpected request: ${url}`);
    },
  });

  await skill.login({
    walletAddress: "0xabc",
    signChallenge: async (challenge) => `signed:${challenge.nonce}`,
  });

  const confirmResult = await skill.confirmRegisterPlayerOnchainWithRetry("0xtx", {
    maxAttempts: 2,
  });
  const uploadResult = await skill.uploadXWithRetry(
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
  assert.equal(calls.filter((entry) => entry.endsWith("/api/onchain/register-player/confirm")).length, 2);
  assert.equal(calls.filter((entry) => entry.endsWith("/api/x/actions/upload")).length, 2);
});
