import assert from "node:assert/strict";
import test from "node:test";
import type { AuthChallenge, AuthSession, PlayerSnapshot } from "./api.js";
import {
  appShellReducer,
  createAppShellState,
  readPersistedSession,
  SESSION_STORAGE_KEY,
  writePersistedSession,
} from "./app-shell.js";

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

const challenge: AuthChallenge = {
  walletAddress: "0xabc",
  nonce: "nonce-1",
  challenge: "Sign this wallet challenge: nonce-1",
};

const session: AuthSession = {
  walletAddress: "0xabc",
  token: "session-1",
  authenticated: true,
};

const player: PlayerSnapshot = {
  walletAddress: "0xabc",
  displayId: null,
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
};

test("readPersistedSession returns null when storage is empty", () => {
  const storage = createMemoryStorage();

  assert.equal(readPersistedSession(storage), null);
});

test("writePersistedSession stores the session payload for reloads", () => {
  const storage = createMemoryStorage();

  writePersistedSession(storage, session);

  assert.equal(storage.snapshot()[SESSION_STORAGE_KEY], JSON.stringify(session));
});

test("appShellReducer advances through disconnected, challenged, authenticated, and bootstrapped states", () => {
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
});
