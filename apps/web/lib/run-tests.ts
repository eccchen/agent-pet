import assert from "node:assert/strict";
import { createApiClient } from "./api.js";
import {
  appShellReducer,
  createAppShellState,
  readPersistedSession,
  SESSION_STORAGE_KEY,
  writePersistedSession,
} from "./app-shell.js";
import { createWorldLoader } from "./world.js";

function createMemoryStorage(initial: Record<string, string> = {}) {
  const store = new Map(Object.entries(initial));

  return {
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null;
    },
    setItem(key: string, value: string) {
      store.set(key, value);
    },
    removeItem(key: string) {
      store.delete(key);
    },
    snapshot() {
      return Object.fromEntries(store.entries());
    },
  };
}

async function testApiClient() {
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
}

async function testAppShell() {
  const challenge = {
    walletAddress: "0xabc",
    nonce: "nonce-1",
    challenge: "Sign this wallet challenge: nonce-1",
  };
  const session = {
    walletAddress: "0xabc",
    token: "session-1",
    authenticated: true as const,
  };
  const player = {
    walletAddress: "0xabc",
    displayId: null,
    xBinding: false as const,
    budget: 1000,
    profitPool: 0,
    chainSync: {
      syncStatus: "local" as const,
      onchainId: "pending:player:0xabc",
      lastSyncedAt: "2026-03-24T00:00:00.000Z",
    },
    pets: [
      {
        id: "starter-pet",
        name: "Sprout",
        species: "starter-cat",
        level: 1,
        starter: true as const,
        budget: {
          spendableBudget: 1000,
          singleTxLimit: 50,
          dailyLimit: 200,
        },
        chainSync: {
          syncStatus: "local" as const,
          onchainId: "pending:pet:0xabc:starter-pet",
          lastSyncedAt: "2026-03-24T00:00:00.000Z",
        },
      },
    ],
    createdAt: "2026-03-24T00:00:00.000Z",
    updatedAt: "2026-03-24T00:00:00.000Z",
  };

  const storage = createMemoryStorage();
  const initial = createAppShellState("0xdef");
  const challenged = appShellReducer(initial, {
    type: "challenge-issued",
    challenge,
  });
  const authenticated = appShellReducer(challenged, {
    type: "session-authenticated",
    session,
  });
  const bootstrapped = appShellReducer(authenticated, {
    type: "player-loaded",
    player,
  });

  assert.equal(initial.status, "disconnected");
  assert.equal(challenged.status, "challenged");
  assert.equal(challenged.walletAddress, "0xabc");
  assert.equal(challenged.challenge?.nonce, "nonce-1");
  assert.equal(authenticated.status, "authenticated");
  assert.equal(authenticated.session?.token, "session-1");
  assert.equal(bootstrapped.status, "bootstrapped");
  assert.equal(bootstrapped.player?.pets[0]?.name, "Sprout");

  writePersistedSession(storage, session);
  assert.equal(storage.snapshot()[SESSION_STORAGE_KEY], JSON.stringify(session));
  assert.equal(readPersistedSession(storage)?.token, "session-1");
}

async function testWorldLoader() {
  const fallbackLoader = createWorldLoader({
    baseUrl: "http://localhost:3001",
    fetch: async () => {
      throw new Error("network unavailable");
    },
  });
  const fallbackHome = await fallbackLoader.loadHomeView();

  assert.equal(fallbackHome.source.mode, "fallback");
  assert.equal(fallbackHome.headline, "宠物 Agent 社交博弈游戏");
  assert.ok(fallbackHome.metrics.length > 0);

  const liveLoader = createWorldLoader({
    baseUrl: "http://localhost:3001",
    fetch: async (input) => {
      const url = String(input);

      if (url.endsWith("/api/public/pets/starter-pet")) {
        return new Response(
          JSON.stringify({
            id: "starter-pet",
            name: "Glint",
            species: "starter-cat",
            ownerLabel: "@moon",
            ownerWalletAddress: "0xabc",
            level: 3,
            strategyMode: "稳健赚钱",
            autonomyLevel: "低风险自动",
            targetPreference: "赚钱",
            personality: {
              loyalty: 75,
              resentment: 20,
              ambition: 63,
              heat: 48,
            },
            budget: {
              spendableBudget: 400,
              singleTxLimit: 80,
              dailyLimit: 200,
            },
            claimableBalance: 90,
            recentStories: [
              {
                id: "story-1",
                title: "Glint 刚完成一次赚钱",
                detail: "public route override",
                tag: "赚钱",
                tone: "cyan",
              },
            ],
            recommendations: ["先稳住收益池"],
          }),
          {
            status: 200,
            headers: {
              "Content-Type": "application/json",
            },
          },
        );
      }

      return new Response("", { status: 404 });
    },
  });

  const petView = await liveLoader.loadPetView("starter-pet");

  assert.equal(petView.source.mode, "public");
  assert.equal(petView.pet.name, "Glint");
  assert.equal(petView.pet.personality.loyalty, 75);
  assert.equal(petView.relatedStories[0]?.title, "Glint 刚完成一次赚钱");
}

async function main() {
  const cases = [
    ["api client", testApiClient],
    ["app shell", testAppShell],
    ["world loader", testWorldLoader],
  ] as const;

  for (const [name, run] of cases) {
    await run();
    console.log(`[ok] ${name}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
