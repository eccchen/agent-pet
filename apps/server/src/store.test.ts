import test, { mock } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import type { ChainSyncAdapter } from "./chain-sync";
import { createInMemoryGameStore, GameStateError } from "./store";

function createStore() {
  return createInMemoryGameStore({
    now: () => new Date("2026-03-24T00:00:00.000Z"),
    nonce: () => "nonce-store",
    sessionToken: () => "session-store",
  });
}

test("bootstrapPlayer is idempotent for the same wallet and carries chain sync metadata", () => {
  const store = createStore();

  const first = store.bootstrapPlayer("0xabc");
  const second = store.bootstrapPlayer("0xabc");

  assert.deepEqual(second, first);
  assert.equal(second.pets.length, 1);
  assert.equal(second.chainSync.onchainId, "pending:player:0xabc");
  assert.equal(second.pets[0]?.chainSync.onchainId, "pending:pet:0xabc:starter-pet");
  assert.equal(second.pets[0]?.strategyMode, "balanced");
  assert.equal(second.pets[0]?.autonomyLevel, 50);
  assert.equal(second.pets[0]?.recentOutcomes.length, 0);
});

test("verifyChallenge consumes a stored nonce and creates a session", () => {
  const store = createStore();

  const challenge = store.createChallenge("0xabc");
  const session = store.verifyChallenge("0xabc", `signed:${challenge.nonce}`);

  assert.ok(session);
  assert.equal(session.walletAddress, "0xabc");
  assert.equal(session.token, "session-store");
  assert.equal(store.getSession("session-store")?.walletAddress, "0xabc");
  assert.equal(store.verifyChallenge("0xabc", `signed:${challenge.nonce}`), null);
});

test("updatePetBudget stores spendable and limit configuration for a pet", () => {
  const store = createStore();
  store.bootstrapPlayer("0xabc");

  const updatedPet = store.updatePetBudget("0xabc", "starter-pet", {
    spendableBudget: 250,
    singleTxLimit: 75,
    dailyLimit: 300,
  });

  assert.equal(updatedPet?.budget.spendableBudget, 250);
  assert.equal(updatedPet?.budget.singleTxLimit, 75);
  assert.equal(updatedPet?.budget.dailyLimit, 300);
  assert.equal(updatedPet?.chainSync.onchainId, "pending:pet:0xabc:starter-pet");
});

test("updatePetBudget preserves the existing onchain pet id after pet sync", async () => {
  const fakeChainSync: ChainSyncAdapter = {
    syncPlayer(walletAddress) {
      return {
        syncStatus: "local",
        onchainId: `pending:player:${walletAddress}`,
        lastSyncedAt: "2026-03-24T00:00:00.000Z",
      };
    },
    syncPet(walletAddress, petId) {
      return {
        syncStatus: "local",
        onchainId: `pending:pet:${walletAddress}:${petId}`,
        lastSyncedAt: "2026-03-24T00:00:00.000Z",
      };
    },
    syncPetBudget(walletAddress, petId) {
      return {
        syncStatus: "local",
        onchainId: `pending:pet:${walletAddress}:${petId}`,
        lastSyncedAt: "2026-03-24T00:00:00.000Z",
      };
    },
    buildRegisterPlayerIntent() {
      return {
        chainId: 1952,
        chainNamespaceId: "eip155:1952",
        to: "0xregistry",
        data: "0xregister",
        value: "0x0",
      };
    },
    buildCreatePetIntent() {
      return {
        chainId: 1952,
        chainNamespaceId: "eip155:1952",
        to: "0xregistry",
        data: "0xcreatepet",
        value: "0x0",
      };
    },
    buildSetPetBudgetIntent() {
      return {
        chainId: 1952,
        chainNamespaceId: "eip155:1952",
        to: "0xvault",
        data: "0xsetbudget",
        value: "0x0",
      };
    },
    buildClaimIntent() {
      return {
        chainId: 1952,
        chainNamespaceId: "eip155:1952",
        to: "0xclaim",
        data: "0xclaim",
        value: "0x0",
      };
    },
    async confirmPlayerOnchain() {
      return {
        syncStatus: "synced",
        onchainId: "0xabc",
        lastSyncedAt: "2026-03-24T00:00:00.000Z",
      };
    },
    async confirmPetOnchain() {
      return {
        syncStatus: "synced",
        onchainId: "7",
        lastSyncedAt: "2026-03-24T00:00:00.000Z",
      };
    },
    async confirmPetBudgetOnchain() {
      return {
        syncStatus: "synced",
        onchainId: "7",
        lastSyncedAt: "2026-03-24T00:00:00.000Z",
      };
    },
    async confirmClaimOnchain() {
      return;
    },
  };

  const store = createInMemoryGameStore({
    now: () => new Date("2026-03-24T00:00:00.000Z"),
    nonce: () => "nonce-store",
    sessionToken: () => "session-store",
    chainSync: fakeChainSync,
  });

  store.bootstrapPlayer("0xabc");
  store.preparePetOnchain("0xabc", "starter-pet");
  await store.confirmPetOnchain("0xabc", "starter-pet", `0x${"22".repeat(32)}`);

  const updatedPet = store.updatePetBudget("0xabc", "starter-pet", {
    spendableBudget: 250,
    singleTxLimit: 75,
    dailyLimit: 300,
  });

  assert.equal(updatedPet?.chainSync.onchainId, "7");
});

test("commands and profit actions append event history and move balances", () => {
  const store = createStore();
  store.bootstrapPlayer("0xabc");

  const commandResult = store.issueCommand("0xabc", "starter-pet", "earn");
  assert.ok(commandResult);
  assert.equal(commandResult.player.profitPool, 120);

  const reinvestResult = store.reinvestProfit("0xabc", "starter-pet", 40);
  assert.ok(reinvestResult);
  assert.equal(reinvestResult.player.profitPool, 80);
  assert.equal(reinvestResult.pet.budget.spendableBudget, 340);

  const withdrawResult = store.withdrawProfit("0xabc", 50);
  assert.ok(withdrawResult);
  assert.equal(withdrawResult.player.profitPool, 30);
  assert.equal(withdrawResult.player.budget, 1000);
  assert.equal(withdrawResult.player.claimableBalance, 50);
  const personality = store.getPetPersonality("0xabc", "starter-pet");
  assert.equal(personality?.recentOutcomes[0]?.sourceType, "withdraw");
  assert.equal((personality?.recentOutcomes.length ?? 0) >= 3, true);
  assert.equal((personality?.ambition ?? 0) > 50, true);

  const events = store.listEvents("0xabc");
  const feed = store.listFeed("0xabc");
  assert.equal(events.length >= 4, true);
  assert.equal(events[0]?.type, "profit_withdrawn");
  assert.equal(feed[0]?.eventType, "profit_withdrawn");
  assert.equal(store.getMessageCenterSummary("0xabc").totalItems >= 4, true);
});

test("strategy and autonomy updates change the personality snapshot and recommendations", () => {
  const store = createStore();
  store.bootstrapPlayer("0xabc");

  const updatedStrategy = store.updatePetStrategy("0xabc", "starter-pet", {
    strategyMode: "pressure",
    targetPreference: "conflict",
  });
  assert.equal(updatedStrategy?.strategyMode, "pressure");
  assert.equal(updatedStrategy?.targetPreference, "conflict");

  const updatedAutonomy = store.updatePetAutonomy("0xabc", "starter-pet", 80);
  assert.equal(updatedAutonomy?.autonomyLevel, 80);

  const personalitySnapshot = store.getPetPersonality("0xabc", "starter-pet");
  const recommendations = store.getPetRecommendations("0xabc", "starter-pet");
  assert.equal(personalitySnapshot?.strategyMode, "pressure");
  assert.equal(personalitySnapshot?.targetPreference, "conflict");
  assert.equal(personalitySnapshot?.autonomyLevel, 80);
  assert.equal((recommendations?.length ?? 0) >= 1, true);
});

test("bootstrapSystemAgents seeds a stable roster of autonomous system players", () => {
  const store = createStore();

  const first = store.bootstrapSystemAgents();
  const second = store.bootstrapSystemAgents();

  assert.equal(first.length, 6);
  assert.deepEqual(
    second.map((player) => player.walletAddress),
    first.map((player) => player.walletAddress),
  );
  assert.equal(
    first.every(
      (player) =>
        player.walletAddress.startsWith("system-agent-") &&
        player.pets[0] &&
        player.pets[0].autonomyLevel >= 55 &&
        player.pets[0].strategyMode !== "balanced",
    ),
    true,
  );
});

test("tickSystemAgents creates live plaza activity and economy opportunities", () => {
  const store = createStore();
  store.bootstrapPlayer("0xuser");
  store.bootstrapSystemAgents();

  const beforeHighlights = store.getPlazaSummary("0xuser").highlights.length;
  const summary = store.tickSystemAgents();
  const afterPlaza = store.getPlazaSummary("0xuser");
  const opportunityBoard = store.getOpportunityBoard("0xuser");

  assert.equal(summary.executedActions >= 4, true);
  assert.equal(summary.economyMoves >= 2, true);
  assert.equal(summary.actedWallets.length >= 4, true);
  assert.equal(afterPlaza.highlights.length > beforeHighlights, true);
  assert.equal((opportunityBoard?.featuredOpponents.length ?? 0) >= 3, true);
  assert.equal(
    (opportunityBoard?.openBounties.length ?? 0) +
      (opportunityBoard?.openDuels.length ?? 0) +
      (opportunityBoard?.openServiceOrders.length ?? 0) >=
      1,
    true,
  );
});

test("command outcome is influenced by strategy mode", () => {
  const balancedStore = createStore();
  balancedStore.bootstrapPlayer("0xabc");
  const balanced = balancedStore.issueCommand("0xabc", "starter-pet", "taunt");
  assert.ok(balanced);

  const pressureStore = createStore();
  pressureStore.bootstrapPlayer("0xabc");
  pressureStore.updatePetStrategy("0xabc", "starter-pet", {
    strategyMode: "pressure",
    targetPreference: "conflict",
  });
  const pressured = pressureStore.issueCommand("0xabc", "starter-pet", "taunt");
  assert.ok(pressured);

  assert.equal(pressured.player.profitPool > balanced.player.profitPool, true);
});

test("economy summary, tips, bounty, duel, and service orders move canned balances and ledger", () => {
  const store = createStore();
  store.bootstrapPlayer("0xabc");
  store.bootstrapPlayer("0xdef");

  const tipResult = store.createTip("0xabc", {
    fromPetId: "starter-pet",
    targetWalletAddress: "0xdef",
    toPetId: "starter-pet",
    amount: 100,
  });
  assert.ok(tipResult);
  assert.equal(store.getEconomySummary("0xabc")?.treasuryBalance, 900);
  assert.equal(store.getPlayer("0xdef")?.profitPool, 95);
  assert.equal(store.listLedger("0xabc")[0]?.sourceType, "tip");

  const bountyResult = store.createBounty("0xabc", {
    creatorPetId: "starter-pet",
    targetWalletAddress: "0xdef",
    targetPetId: "starter-pet",
    title: "Callout",
    detail: "Force a reply",
    amount: 200,
  });
  assert.ok(bountyResult);
  const claimedBounty = store.claimBounty("0xdef", {
    bountyId: bountyResult.bounty.id,
    claimerPetId: "starter-pet",
  });
  assert.ok(claimedBounty);
  assert.equal(claimedBounty.bounty.status, "claimed");
  assert.equal((store.getPetPersonality("0xdef", "starter-pet")?.ambition ?? 0) >= 54, true);

  const duel = store.createDuel("0xabc", {
    challengerPetId: "starter-pet",
    targetWalletAddress: "0xdef",
    targetPetId: "starter-pet",
    stakeAmount: 100,
  });
  assert.ok(duel);
  const acceptedDuel = store.acceptDuel("0xdef", {
    duelId: duel.duel.id,
    targetPetId: "starter-pet",
  });
  assert.ok(acceptedDuel);
  const resolvedDuel = store.resolveDuel("0xabc", {
    duelId: duel.duel.id,
    winnerPetId: "starter-pet",
  });
  assert.ok(resolvedDuel);
  assert.equal(resolvedDuel.duel.status, "resolved");

  const order = store.createServiceOrder("0xabc", {
    clientPetId: "starter-pet",
    serviceType: "taunt",
    title: "Need noise",
    detail: "Generate heat",
    amount: 120,
  });
  assert.ok(order);
  const acceptedOrder = store.acceptServiceOrder("0xdef", {
    orderId: order.order.id,
    providerPetId: "starter-pet",
  });
  assert.ok(acceptedOrder);
  const completedOrder = store.completeServiceOrder("0xabc", order.order.id);
  assert.ok(completedOrder);
  assert.equal(completedOrder.order.status, "completed");
  assert.equal(store.getPetPersonality("0xdef", "starter-pet")?.recentOutcomes[0]?.sourceType, "service");

  assert.equal(store.getEconomySummary("0xabc")?.platformTreasury! > 0, true);
  assert.equal(store.getEconomySummary("0xabc")?.claimableBalance, 0);
  assert.equal(store.listBounties("0xabc").length >= 1, true);
  assert.equal(store.listDuels("0xabc").length >= 1, true);
  assert.equal(store.listServiceOrders("0xabc").length >= 1, true);
});

test("profit can be moved into claimable balance and claimed through intent, confirm, and cancel flows", async () => {
  const fakeChainSync: ChainSyncAdapter = {
    syncPlayer(walletAddress) {
      return {
        syncStatus: "local",
        onchainId: `pending:player:${walletAddress}`,
        lastSyncedAt: "2026-03-24T00:00:00.000Z",
      };
    },
    syncPet(walletAddress, petId) {
      return {
        syncStatus: "local",
        onchainId: `pending:pet:${walletAddress}:${petId}`,
        lastSyncedAt: "2026-03-24T00:00:00.000Z",
      };
    },
    syncPetBudget(walletAddress, petId) {
      return {
        syncStatus: "local",
        onchainId: `pending:pet:${walletAddress}:${petId}`,
        lastSyncedAt: "2026-03-24T00:00:00.000Z",
      };
    },
    buildRegisterPlayerIntent() {
      return {
        chainId: 196,
        chainNamespaceId: "eip155:196",
        to: "0xregistry",
        data: "0xregister",
        value: "0x0",
      };
    },
    buildCreatePetIntent() {
      return {
        chainId: 196,
        chainNamespaceId: "eip155:196",
        to: "0xregistry",
        data: "0xcreatepet",
        value: "0x0",
      };
    },
    buildSetPetBudgetIntent() {
      return {
        chainId: 196,
        chainNamespaceId: "eip155:196",
        to: "0xvault",
        data: "0xsetbudget",
        value: "0x0",
      };
    },
    buildClaimIntent() {
      return {
        chainId: 196,
        chainNamespaceId: "eip155:196",
        to: "0xclaim",
        data: "0xclaim",
        value: "0x0",
      };
    },
    async confirmPlayerOnchain() {
      return {
        syncStatus: "synced",
        onchainId: "0xabc",
        lastSyncedAt: "2026-03-24T00:00:00.000Z",
      };
    },
    async confirmPetOnchain() {
      return {
        syncStatus: "synced",
        onchainId: "7",
        lastSyncedAt: "2026-03-24T00:00:00.000Z",
      };
    },
    async confirmPetBudgetOnchain() {
      return {
        syncStatus: "synced",
        onchainId: "7",
        lastSyncedAt: "2026-03-24T00:00:00.000Z",
      };
    },
    async confirmClaimOnchain() {
      return;
    },
  };

  const store = createInMemoryGameStore({
    now: () => new Date("2026-03-24T00:00:00.000Z"),
    nonce: () => "nonce-store",
    sessionToken: () => "session-store",
    chainSync: fakeChainSync,
  });

  store.bootstrapPlayer("0xabc");
  store.issueCommand("0xabc", "starter-pet", "earn");
  store.withdrawProfit("0xabc", 100);

  assert.equal(store.getEconomySummary("0xabc")?.claimableBalance, 100);

  const preparedClaim = store.prepareClaim("0xabc", 60);
  assert.ok(preparedClaim);
  assert.equal(preparedClaim.claim.status, "pending");
  assert.equal(store.getEconomySummary("0xabc")?.claimableBalance, 40);
  assert.equal(store.getEconomySummary("0xabc")?.openClaims, 1);

  const confirmedClaim = await store.confirmClaim("0xabc", preparedClaim.claim.id, `0x${"33".repeat(32)}`);
  assert.ok(confirmedClaim);
  assert.equal(confirmedClaim.claim.status, "confirmed");
  assert.equal(store.getEconomySummary("0xabc")?.openClaims, 0);

  const secondPreparedClaim = store.prepareClaim("0xabc", 20);
  assert.ok(secondPreparedClaim);
  const cancelledClaim = store.cancelClaim("0xabc", secondPreparedClaim.claim.id);
  assert.ok(cancelledClaim);
  assert.equal(cancelledClaim.claim.status, "cancelled");
  assert.equal(store.getEconomySummary("0xabc")?.claimableBalance, 40);
});

test("resolveDuel ignores caller-selected winner and stores the server-selected winner wallet", () => {
  let currentDate = new Date("2026-03-24T00:00:00.000Z");
  const store = createInMemoryGameStore({
    now: () => currentDate,
    nonce: () => "nonce-store",
    sessionToken: () => "session-store",
  });

  store.bootstrapPlayer("0xabc");
  store.bootstrapPlayer("0xdef");

  const duel = store.createDuel("0xabc", {
    challengerPetId: "starter-pet",
    targetWalletAddress: "0xdef",
    targetPetId: "starter-pet",
    stakeAmount: 100,
  });
  assert.ok(duel);

  currentDate = new Date("2026-03-24T00:05:00.000Z");
  const accepted = store.acceptDuel("0xdef", {
    duelId: duel.duel.id,
    targetPetId: "starter-pet",
  });
  assert.ok(accepted);

  const resolved = store.resolveDuel("0xdef", {
    duelId: duel.duel.id,
    winnerPetId: "starter-pet",
  });
  assert.ok(resolved);
  assert.equal(resolved.duel.status, "resolved");
  assert.equal(
    resolved.duel.winnerWalletAddress === "0xabc" || resolved.duel.winnerWalletAddress === "0xdef",
    true,
  );
  assert.equal(resolved.winner.walletAddress, resolved.duel.winnerWalletAddress);
});

test("accepted service orders can be cancelled after timeout by either participant", () => {
  let currentDate = new Date("2026-03-24T00:00:00.000Z");
  const store = createInMemoryGameStore({
    now: () => currentDate,
    nonce: () => "nonce-store",
    sessionToken: () => "session-store",
  });

  store.bootstrapPlayer("0xabc");
  store.bootstrapPlayer("0xdef");

  const order = store.createServiceOrder("0xabc", {
    clientPetId: "starter-pet",
    serviceType: "taunt",
    title: "Need noise",
    detail: "Generate heat",
    amount: 120,
  });
  assert.ok(order);

  const accepted = store.acceptServiceOrder("0xdef", {
    orderId: order.order.id,
    providerPetId: "starter-pet",
  });
  assert.ok(accepted);

  assert.throws(
    () => store.cancelServiceOrder("0xdef", order.order.id),
    (error) => error instanceof GameStateError && error.statusCode === 409,
  );

  currentDate = new Date("2026-03-25T06:30:00.000Z");
  const cancelled = store.cancelServiceOrder("0xdef", order.order.id);
  assert.ok(cancelled);
  assert.equal(cancelled.order.status, "cancelled");
  assert.equal(cancelled.player.walletAddress, "0xabc");
  assert.equal(cancelled.player.budget > 880, true);
});

test("x adapter defaults to disabled and does not allow uploads", () => {
  const store = createStore();
  store.bootstrapPlayer("0xabc");

  assert.deepEqual(store.getXAdapterStatus(), {
    mode: "disabled",
    enabled: false,
    canUpload: false,
    reason: "x integration is deferred; internal feed is the primary social surface",
  });

  assert.throws(
    () =>
      store.uploadXAction("0xabc", {
        petId: "starter-pet",
        xAccountId: "ChaosPet_A",
        actionType: "post",
        tweetId: "tweet-1",
        content: "hello timeline",
        localProof: "openclaw-run-1",
      }),
    (error) => error instanceof GameStateError && error.statusCode === 503,
  );
});

test("uploadXAction binds the wallet to one X account and rejects duplicate tweet ids when local upload mode is enabled", () => {
  const store = createInMemoryGameStore({
    now: () => new Date("2026-03-24T00:00:00.000Z"),
    nonce: () => "nonce-store",
    sessionToken: () => "session-store",
    xIntegrationMode: "local_upload",
  });
  store.bootstrapPlayer("0xabc");

  const first = store.uploadXAction("0xabc", {
    petId: "starter-pet",
    xAccountId: "ChaosPet_A",
    actionType: "post",
    tweetId: "tweet-1",
    content: "hello timeline",
    localProof: "openclaw-run-1",
  });

  assert.equal(first?.action.status, "confirmed");
  assert.equal(store.getPlayer("0xabc")?.xBinding, true);

  assert.throws(
    () =>
      store.uploadXAction("0xabc", {
        petId: "starter-pet",
        xAccountId: "ChaosPet_A",
        actionType: "post",
        tweetId: "tweet-1",
        content: "hello timeline",
        localProof: "openclaw-run-2",
      }),
    (error) => error instanceof GameStateError && error.statusCode === 409,
  );

  assert.throws(
    () =>
      store.uploadXAction("0xabc", {
        petId: "starter-pet",
        xAccountId: "ChaosPet_B",
        actionType: "post",
        tweetId: "tweet-2",
        content: "different account",
        localProof: "openclaw-run-3",
      }),
    (error) => error instanceof GameStateError && error.statusCode === 409,
  );
});

test("explicit onchain sync methods update stored chain metadata", async () => {
  const fakeChainSync: ChainSyncAdapter = {
    syncPlayer(walletAddress) {
      return {
        syncStatus: "local",
        onchainId: `pending:player:${walletAddress}`,
        lastSyncedAt: "2026-03-24T00:00:00.000Z",
      };
    },
    syncPet(walletAddress, petId) {
      return {
        syncStatus: "local",
        onchainId: `pending:pet:${walletAddress}:${petId}`,
        lastSyncedAt: "2026-03-24T00:00:00.000Z",
      };
    },
    syncPetBudget(walletAddress, petId) {
      return {
        syncStatus: "local",
        onchainId: `pending:pet:${walletAddress}:${petId}`,
        lastSyncedAt: "2026-03-24T00:00:00.000Z",
      };
    },
    buildRegisterPlayerIntent() {
      return {
        chainId: 1952,
        chainNamespaceId: "eip155:1952",
        to: "0xregistry",
        data: "0xregister",
        value: "0x0",
      };
    },
    buildCreatePetIntent() {
      return {
        chainId: 1952,
        chainNamespaceId: "eip155:1952",
        to: "0xregistry",
        data: "0xcreatepet",
        value: "0x0",
      };
    },
    buildSetPetBudgetIntent() {
      return {
        chainId: 1952,
        chainNamespaceId: "eip155:1952",
        to: "0xvault",
        data: "0xsetbudget",
        value: "0x0",
      };
    },
    buildClaimIntent() {
      return {
        chainId: 1952,
        chainNamespaceId: "eip155:1952",
        to: "0xclaim",
        data: "0xclaim",
        value: "0x0",
      };
    },
    async confirmPlayerOnchain() {
      return {
        syncStatus: "synced",
        onchainId: "0xabc",
        lastSyncedAt: "2026-03-24T00:00:00.000Z",
      };
    },
    async confirmPetOnchain() {
      return {
        syncStatus: "synced",
        onchainId: "1",
        lastSyncedAt: "2026-03-24T00:00:00.000Z",
      };
    },
    async confirmPetBudgetOnchain(_input) {
      return {
        syncStatus: "synced",
        onchainId: "1",
        lastSyncedAt: "2026-03-24T00:00:00.000Z",
      };
    },
    async confirmClaimOnchain() {
      return;
    },
  };

  const store = createInMemoryGameStore({
    now: () => new Date("2026-03-24T00:00:00.000Z"),
    chainSync: fakeChainSync,
  });
  store.bootstrapPlayer("0xabc");

  const registerIntent = store.preparePlayerOnchain("0xabc");
  const createPetIntent = store.preparePetOnchain("0xabc", "starter-pet");
  const player = await store.confirmPlayerOnchain("0xabc", "0xtx-player");
  const pet = await store.confirmPetOnchain("0xabc", "starter-pet", "0xtx-pet");
  const budgetIntent = store.preparePetBudgetOnchain("0xabc", "starter-pet");
  const budget = await store.confirmPetBudgetOnchain("0xabc", "starter-pet", "0xtx-budget");

  assert.equal(registerIntent?.to, "0xregistry");
  assert.equal(createPetIntent?.data, "0xcreatepet");
  assert.equal(budgetIntent?.to, "0xvault");
  assert.equal(player?.chainSync.syncStatus, "synced");
  assert.equal(pet?.chainSync.onchainId, "1");
  assert.equal(budget?.chainSync.syncStatus, "synced");
});

test("onchain confirm operations require a pending intent and reject duplicate tx hashes", async () => {
  const fakeChainSync: ChainSyncAdapter = {
    syncPlayer(walletAddress) {
      return {
        syncStatus: "local",
        onchainId: `pending:player:${walletAddress}`,
        lastSyncedAt: "2026-03-24T00:00:00.000Z",
      };
    },
    syncPet(walletAddress, petId) {
      return {
        syncStatus: "local",
        onchainId: `pending:pet:${walletAddress}:${petId}`,
        lastSyncedAt: "2026-03-24T00:00:00.000Z",
      };
    },
    syncPetBudget(walletAddress, petId) {
      return {
        syncStatus: "local",
        onchainId: `pending:pet:${walletAddress}:${petId}`,
        lastSyncedAt: "2026-03-24T00:00:00.000Z",
      };
    },
    buildRegisterPlayerIntent() {
      return {
        chainId: 1952,
        chainNamespaceId: "eip155:1952",
        to: "0xregistry",
        data: "0xregister",
        value: "0x0",
      };
    },
    buildCreatePetIntent() {
      return {
        chainId: 1952,
        chainNamespaceId: "eip155:1952",
        to: "0xregistry",
        data: "0xcreatepet",
        value: "0x0",
      };
    },
    buildSetPetBudgetIntent() {
      return {
        chainId: 1952,
        chainNamespaceId: "eip155:1952",
        to: "0xvault",
        data: "0xsetbudget",
        value: "0x0",
      };
    },
    buildClaimIntent() {
      return {
        chainId: 1952,
        chainNamespaceId: "eip155:1952",
        to: "0xclaim",
        data: "0xclaim",
        value: "0x0",
      };
    },
    async confirmPlayerOnchain() {
      return {
        syncStatus: "synced",
        onchainId: "0xabc",
        lastSyncedAt: "2026-03-24T00:00:00.000Z",
      };
    },
    async confirmPetOnchain() {
      return {
        syncStatus: "synced",
        onchainId: "1",
        lastSyncedAt: "2026-03-24T00:00:00.000Z",
      };
    },
    async confirmPetBudgetOnchain() {
      return {
        syncStatus: "synced",
        onchainId: "1",
        lastSyncedAt: "2026-03-24T00:00:00.000Z",
      };
    },
    async confirmClaimOnchain() {
      return;
    },
  };

  const store = createInMemoryGameStore({
    now: () => new Date("2026-03-24T00:00:00.000Z"),
    chainSync: fakeChainSync,
  });
  store.bootstrapPlayer("0xabc");

  await assert.rejects(
    store.confirmPlayerOnchain("0xabc", "0xtx-player"),
    (error) => error instanceof GameStateError && error.statusCode === 409,
  );

  store.preparePlayerOnchain("0xabc");
  const player = await store.confirmPlayerOnchain("0xabc", "0xtx-player");
  assert.equal(player?.chainSync.syncStatus, "synced");

  await assert.rejects(
    store.confirmPlayerOnchain("0xabc", "0xtx-player"),
    (error) => error instanceof GameStateError && error.statusCode === 409,
  );

  store.preparePetOnchain("0xabc", "starter-pet");
  await store.confirmPetOnchain("0xabc", "starter-pet", "0xtx-pet");

  store.preparePetBudgetOnchain("0xabc", "starter-pet");
  await store.confirmPetBudgetOnchain("0xabc", "starter-pet", "0xtx-budget");

  await assert.rejects(
    store.confirmPetBudgetOnchain("0xabc", "starter-pet", "0xtx-budget"),
    (error) => error instanceof GameStateError && error.statusCode === 409,
  );
});

test("file-backed store persists players, sessions, budgets, and events", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "agent-game-store-"));
  const statePath = path.join(tempDir, "state.json");

  const writer = createInMemoryGameStore({
    now: () => new Date("2026-03-24T00:00:00.000Z"),
    nonce: () => "nonce-persist",
    sessionToken: () => "session-persist",
    persistencePath: statePath,
    xIntegrationMode: "local_upload",
  });

  const challenge = writer.createChallenge("0xabc");
  writer.verifyChallenge("0xabc", `signed:${challenge.nonce}`);
  writer.bootstrapPlayer("0xabc");
  writer.updatePetBudget("0xabc", "starter-pet", {
    spendableBudget: 333,
    singleTxLimit: 44,
    dailyLimit: 555,
  });
  writer.issueCommand("0xabc", "starter-pet", "taunt");
  writer.uploadXAction("0xabc", {
    petId: "starter-pet",
    xAccountId: "ChaosPet_A",
    actionType: "reply",
    tweetId: "tweet-2",
    replyToTweetId: "tweet-1",
    content: "reply payload",
  });

  const reader = createInMemoryGameStore({
    now: () => new Date("2026-03-24T00:05:00.000Z"),
    persistencePath: statePath,
  });

  const restoredPlayer = reader.getPlayer("0xabc");
  const restoredSession = reader.getSession("session-persist");
  const restoredEvents = reader.listEvents("0xabc");
  const restoredFeed = reader.listFeed("0xabc");
  const restoredXActions = reader.listXActions("0xabc");
  const restoredPersonality = reader.getPetPersonality("0xabc", "starter-pet");

  assert.equal(restoredPlayer?.walletAddress, "0xabc");
  assert.equal(restoredPlayer?.pets[0]?.budget.spendableBudget, 333);
  assert.equal(restoredPlayer?.chainSync.onchainId, "pending:player:0xabc");
  assert.equal(restoredPlayer?.pets[0]?.chainSync.onchainId, "pending:pet:0xabc:starter-pet");
  assert.equal(restoredPersonality?.strategyMode, "balanced");
  assert.equal(restoredPersonality?.recentOutcomes.length >= 1, true);
  assert.equal(restoredSession?.walletAddress, "0xabc");
  assert.equal(restoredEvents.length >= 2, true);
  assert.equal(restoredFeed.length >= 2, true);
  assert.equal(restoredXActions[0]?.tweetId, "tweet-2");
});

test("file-backed store warns and falls back to empty state when persisted JSON is invalid", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "agent-game-store-"));
  const statePath = path.join(tempDir, "state.json");
  fs.writeFileSync(statePath, "{not valid json", "utf8");

  const warn = mock.method(console, "warn", () => {});

  try {
    const store = createInMemoryGameStore({
      now: () => new Date("2026-03-24T00:05:00.000Z"),
      persistencePath: statePath,
    });

    assert.equal(store.getPlayer("0xabc"), null);
    assert.equal(warn.mock.calls.length >= 1, true);
  } finally {
    warn.mock.restore();
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test("file-backed store persists through an atomic rename", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "agent-game-store-"));
  const statePath = path.join(tempDir, "state.json");
  const renameSync = fs.renameSync;
  const renames: Array<readonly [string, string]> = [];
  const rename = mock.method(fs, "renameSync", (from: fs.PathLike, to: fs.PathLike) => {
    renames.push([String(from), String(to)]);
    return renameSync(from, to);
  });

  try {
    const store = createInMemoryGameStore({
      now: () => new Date("2026-03-24T00:00:00.000Z"),
      persistencePath: statePath,
    });

    store.bootstrapPlayer("0xabc");

    assert.equal(renames.length >= 1, true);
    assert.equal(fs.existsSync(statePath), true);
    assert.match(fs.readFileSync(statePath, "utf8"), /"players"/);
  } finally {
    rename.mock.restore();
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});
