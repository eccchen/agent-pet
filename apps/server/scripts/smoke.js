const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const { createInMemoryGameStore } = require("../dist/store.js");
const { resolveRoute } = require("../dist/router.js");

async function main() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "agent-game-server-"));
  const statePath = path.join(tempDir, "state.json");

  const store = createInMemoryGameStore({
    now: () => new Date("2026-03-24T00:00:00.000Z"),
    nonce: () => "nonce-smoke",
    sessionToken: () => "session-smoke",
    persistencePath: statePath,
    xIntegrationMode: "local_upload",
  });

  const challenge = await resolveRoute(
    { method: "POST", path: "/api/auth/challenge", body: { walletAddress: "0xabc" } },
    store,
  );
  assert.equal(challenge.statusCode, 200);

  const verify = await resolveRoute(
    {
      method: "POST",
      path: "/api/auth/verify",
      body: { walletAddress: "0xabc", signature: "signed:nonce-smoke" },
    },
    store,
  );
  assert.equal(verify.statusCode, 200);

  const token = verify.body.token;

  const bootstrap = await resolveRoute(
    {
      method: "POST",
      path: "/api/players/bootstrap",
      headers: { authorization: `Bearer ${token}` },
    },
    store,
  );
  assert.equal(bootstrap.statusCode, 200);
  assert.equal(bootstrap.body.chainSync.onchainId, "pending:player:0xabc");
  assert.equal(bootstrap.body.pets[0].chainSync.onchainId, "pending:pet:0xabc:starter-pet");

  const pets = await resolveRoute(
    {
      method: "GET",
      path: "/api/me/pets",
      headers: { authorization: `Bearer ${token}` },
    },
    store,
  );
  assert.equal(pets.statusCode, 200);
  assert.equal(Array.isArray(pets.body), true);

  const home = await resolveRoute(
    {
      method: "GET",
      path: "/api/me/home",
      headers: { authorization: `Bearer ${token}` },
    },
    store,
  );
  assert.equal(home.statusCode, 200);
  assert.equal(home.body.player.walletAddress, "0xabc");

  const budget = await resolveRoute(
    {
      method: "PATCH",
      path: "/api/pets/starter-pet/budget",
      headers: { authorization: `Bearer ${token}` },
      body: { spendableBudget: 250, singleTxLimit: 75, dailyLimit: 300 },
    },
    store,
  );
  assert.equal(budget.statusCode, 200);
  assert.equal(budget.body.chainSync.onchainId, "pending:pet:0xabc:starter-pet");

  const command = await resolveRoute(
    {
      method: "POST",
      path: "/api/pets/starter-pet/commands",
      headers: { authorization: `Bearer ${token}` },
      body: { commandType: "earn" },
    },
    store,
  );
  assert.equal(command.statusCode, 200);
  assert.equal(command.body.player.profitPool, 120);

  const reinvest = await resolveRoute(
    {
      method: "POST",
      path: "/api/profit/reinvest",
      headers: { authorization: `Bearer ${token}` },
      body: { petId: "starter-pet", amount: 20 },
    },
    store,
  );
  assert.equal(reinvest.statusCode, 200);
  assert.equal(reinvest.body.player.profitPool, 100);

  const withdraw = await resolveRoute(
    {
      method: "POST",
      path: "/api/profit/withdraw",
      headers: { authorization: `Bearer ${token}` },
      body: { amount: 60 },
    },
    store,
  );
  assert.equal(withdraw.statusCode, 200);
  assert.equal(withdraw.body.player.budget, 1000);
  assert.equal(withdraw.body.player.claimableBalance, 60);

  const events = await resolveRoute(
    {
      method: "GET",
      path: "/api/me/events",
      headers: { authorization: `Bearer ${token}` },
    },
    store,
  );
  assert.equal(events.statusCode, 200);
  assert.equal(Array.isArray(events.body), true);
  assert.equal(events.body[0].type, "profit_withdrawn");

  const xUpload = await resolveRoute(
    {
      method: "POST",
      path: "/api/x/actions/upload",
      headers: { authorization: `Bearer ${token}` },
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
  assert.equal(xUpload.statusCode, 200);
  assert.equal(xUpload.body.action.status, "confirmed");

  const xFeed = await resolveRoute(
    {
      method: "GET",
      path: "/api/me/x-actions",
      headers: { authorization: `Bearer ${token}` },
    },
    store,
  );
  assert.equal(xFeed.statusCode, 200);
  assert.equal(xFeed.body[0].tweetId, "tweet-1");

  const onchainPlayerIntent = await resolveRoute(
    {
      method: "POST",
      path: "/api/onchain/register-player/intent",
      headers: { authorization: `Bearer ${token}` },
    },
    store,
  );
  assert.equal(onchainPlayerIntent.statusCode, 200);
  assert.equal(onchainPlayerIntent.body.to, "pending");

  const onchainPlayer = await resolveRoute(
    {
      method: "POST",
      path: "/api/onchain/register-player/confirm",
      headers: { authorization: `Bearer ${token}` },
      body: { txHash: "0xtx-player" },
    },
    store,
  );
  assert.equal(onchainPlayer.statusCode, 200);

  const onchainPetIntent = await resolveRoute(
    {
      method: "POST",
      path: "/api/onchain/create-pet/intent",
      headers: { authorization: `Bearer ${token}` },
      body: { petId: "starter-pet" },
    },
    store,
  );
  assert.equal(onchainPetIntent.statusCode, 200);

  const onchainPet = await resolveRoute(
    {
      method: "POST",
      path: "/api/onchain/create-pet/confirm",
      headers: { authorization: `Bearer ${token}` },
      body: { petId: "starter-pet", txHash: "0xtx-pet" },
    },
    store,
  );
  assert.equal(onchainPet.statusCode, 200);

  const onchainBudgetIntent = await resolveRoute(
    {
      method: "POST",
      path: "/api/onchain/set-budget/intent",
      headers: { authorization: `Bearer ${token}` },
      body: { petId: "starter-pet" },
    },
    store,
  );
  assert.equal(onchainBudgetIntent.statusCode, 200);

  const onchainBudget = await resolveRoute(
    {
      method: "POST",
      path: "/api/onchain/set-budget/confirm",
      headers: { authorization: `Bearer ${token}` },
      body: { petId: "starter-pet", txHash: "0xtx-budget" },
    },
    store,
  );
  assert.equal(onchainBudget.statusCode, 200);

  const restored = createInMemoryGameStore({ persistencePath: statePath });
  const restoredPlayer = restored.getPlayer("0xabc");
  const restoredXActions = restored.listXActions("0xabc");
  assert.equal(restoredPlayer.pets[0].budget.dailyLimit, 300);
  assert.equal(restoredPlayer.chainSync.onchainId, "pending:player:0xabc");
  assert.equal(restoredXActions[0].tweetId, "tweet-1");

  console.log("Server smoke OK");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
