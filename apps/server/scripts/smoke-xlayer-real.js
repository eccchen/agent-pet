const path = require("node:path");
const os = require("node:os");
const fs = require("node:fs");

const { Wallet, providers, Contract } = require("ethers");

const { createInMemoryGameStore } = require("../dist/store.js");
const { resolveRoute } = require("../dist/router.js");
const { createXLayerChainSyncAdapter } = require("../dist/chain-sync.js");
const { createWalletChallengeVerifier } = require("../dist/auth.js");

function requireEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable ${name}`);
  }

  return value;
}

function readEnvNumber(name, fallback) {
  const raw = process.env[name]?.trim();
  if (!raw) {
    return fallback;
  }

  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`Invalid numeric environment variable ${name}`);
  }

  return parsed;
}

async function waitFor(predicate, { attempts = 20, delayMs = 3000, label = "condition" } = {}) {
  for (let index = 0; index < attempts; index += 1) {
    const value = await predicate();
    if (value) {
      return value;
    }

    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  throw new Error(`Timed out waiting for ${label}`);
}

async function main() {
  const rpcUrl = requireEnv("XLAYER_RPC_URL");
  const registryAddress = requireEnv("PET_REGISTRY_ADDRESS");
  const vaultAddress = requireEnv("BUDGET_VAULT_ADDRESS");
  const fundingPrivateKey = requireEnv("FUNDING_PRIVATE_KEY");
  const challengePrefix = process.env.CHALLENGE_PREFIX?.trim() || "Sign this wallet challenge";
  const petId = process.env.AGENT_GAME_PET_ID?.trim() || "starter-pet";
  const fundAmount = process.env.FUND_AMOUNT_WEI?.trim() || "10000000000000000";
  const spendableBudget = readEnvNumber("AGENT_GAME_SPENDABLE_BUDGET", 250);
  const singleTxLimit = readEnvNumber("AGENT_GAME_SINGLE_TX_LIMIT", 75);
  const dailyLimit = readEnvNumber("AGENT_GAME_DAILY_LIMIT", 300);
  const depositAmount = process.env.AGENT_GAME_DEPOSIT_WEI?.trim() || String(dailyLimit);

  const provider = new providers.JsonRpcProvider(rpcUrl);
  const fundingWallet = new Wallet(fundingPrivateKey, provider);
  const wallet = Wallet.createRandom().connect(provider);

  const fundTx = await fundingWallet.sendTransaction({
    to: wallet.address,
    value: fundAmount,
  });
  await fundTx.wait();

  await waitFor(
    async () => {
      const balance = await provider.getBalance(wallet.address);
      return balance.gt(0) ? balance.toString() : null;
    },
    { label: "funded wallet balance" },
  );

  const chainSync = createXLayerChainSyncAdapter({
    rpcUrl,
    registryAddress,
    vaultAddress,
    now: () => new Date(),
  });

  const statePath = path.join(
    fs.mkdtempSync(path.join(os.tmpdir(), "agent-game-real-")),
    "state.json",
  );

  const store = createInMemoryGameStore({
    persistencePath: statePath,
    chainSync,
    authVerifier: createWalletChallengeVerifier({
      mode: "eip191",
      challengePrefix,
    }),
  });

  const challenge = await resolveRoute(
    {
      method: "POST",
      path: "/api/auth/challenge",
      body: { walletAddress: wallet.address },
    },
    store,
  );
  if (challenge.statusCode !== 200) {
    throw new Error(`challenge failed ${challenge.statusCode}`);
  }

  const signature = await wallet.signMessage(challenge.body.challenge);

  const verify = await resolveRoute(
    {
      method: "POST",
      path: "/api/auth/verify",
      body: {
        walletAddress: wallet.address,
        signature,
      },
    },
    store,
  );
  if (verify.statusCode !== 200) {
    throw new Error(`verify failed ${verify.statusCode} ${JSON.stringify(verify.body)}`);
  }

  const token = verify.body.token;
  const authHeaders = { authorization: `Bearer ${token}` };

  const bootstrap = await resolveRoute(
    {
      method: "POST",
      path: "/api/players/bootstrap",
      headers: authHeaders,
    },
    store,
  );
  if (bootstrap.statusCode !== 200) {
    throw new Error(`bootstrap failed ${bootstrap.statusCode}`);
  }

  const registerPlayerIntent = await resolveRoute(
    {
      method: "POST",
      path: "/api/onchain/register-player/intent",
      headers: authHeaders,
    },
    store,
  );
  if (registerPlayerIntent.statusCode !== 200) {
    throw new Error(`register-player intent failed ${registerPlayerIntent.statusCode}`);
  }

  const registerPlayerTx = await wallet.sendTransaction({
    to: registerPlayerIntent.body.to,
    data: registerPlayerIntent.body.data,
    value: registerPlayerIntent.body.value,
  });
  await registerPlayerTx.wait();

  const registerPlayerConfirm = await resolveRoute(
    {
      method: "POST",
      path: "/api/onchain/register-player/confirm",
      headers: authHeaders,
      body: { txHash: registerPlayerTx.hash },
    },
    store,
  );
  if (registerPlayerConfirm.statusCode !== 200) {
    throw new Error(
      `register-player confirm failed ${registerPlayerConfirm.statusCode} ${JSON.stringify(registerPlayerConfirm.body)}`,
    );
  }

  const createPetIntent = await resolveRoute(
    {
      method: "POST",
      path: "/api/onchain/create-pet/intent",
      headers: authHeaders,
      body: { petId },
    },
    store,
  );
  if (createPetIntent.statusCode !== 200) {
    throw new Error(`create-pet intent failed ${createPetIntent.statusCode}`);
  }

  const createPetTx = await wallet.sendTransaction({
    to: createPetIntent.body.to,
    data: createPetIntent.body.data,
    value: createPetIntent.body.value,
  });
  await createPetTx.wait();

  const createPetConfirm = await resolveRoute(
    {
      method: "POST",
      path: "/api/onchain/create-pet/confirm",
      headers: authHeaders,
      body: { petId, txHash: createPetTx.hash },
    },
    store,
  );
  if (createPetConfirm.statusCode !== 200) {
    throw new Error(
      `create-pet confirm failed ${createPetConfirm.statusCode} ${JSON.stringify(createPetConfirm.body)}`,
    );
  }

  const onchainPetId = createPetConfirm.body.chainSync.onchainId;

  const updateBudget = await resolveRoute(
    {
      method: "PATCH",
      path: `/api/pets/${petId}/budget`,
      headers: authHeaders,
      body: {
        spendableBudget,
        singleTxLimit,
        dailyLimit,
      },
    },
    store,
  );
  if (updateBudget.statusCode !== 200) {
    throw new Error(`update budget failed ${updateBudget.statusCode}`);
  }

  const vault = new Contract(
    vaultAddress,
    [
      "function depositForPet(uint256 petId) payable",
      "function petBudget(uint256 petId) view returns (uint256 deposited, uint256 spendableBudget, uint256 singleTxLimit, uint256 dailyLimit)",
    ],
    wallet,
  );

  const depositTx = await vault.depositForPet(onchainPetId, {
    value: depositAmount,
  });
  await depositTx.wait();

  await waitFor(
    async () => {
      const budget = await vault.petBudget(onchainPetId);
      return budget.deposited.gte(spendableBudget) ? budget : null;
    },
    { label: "vault deposit visibility" },
  );

  const setBudgetIntent = await resolveRoute(
    {
      method: "POST",
      path: "/api/onchain/set-budget/intent",
      headers: authHeaders,
      body: { petId },
    },
    store,
  );
  if (setBudgetIntent.statusCode !== 200) {
    throw new Error(
      `set-budget intent failed ${setBudgetIntent.statusCode} ${JSON.stringify(setBudgetIntent.body)}`,
    );
  }

  const setBudgetTx = await wallet.sendTransaction({
    to: setBudgetIntent.body.to,
    data: setBudgetIntent.body.data,
    value: setBudgetIntent.body.value,
  });
  await setBudgetTx.wait();

  const setBudgetConfirm = await resolveRoute(
    {
      method: "POST",
      path: "/api/onchain/set-budget/confirm",
      headers: authHeaders,
      body: { petId, txHash: setBudgetTx.hash },
    },
    store,
  );
  if (setBudgetConfirm.statusCode !== 200) {
    throw new Error(
      `set-budget confirm failed ${setBudgetConfirm.statusCode} ${JSON.stringify(setBudgetConfirm.body)}`,
    );
  }

  const finalBudget = await waitFor(
    async () => {
      const budget = await vault.petBudget(onchainPetId);
      return budget.spendableBudget.eq(spendableBudget) ? budget : null;
    },
    { label: "vault budget visibility" },
  );

  console.log(
    JSON.stringify(
      {
        fundedWallet: fundingWallet.address,
        wallet: wallet.address,
        fundingTxHash: fundTx.hash,
        registerPlayerTxHash: registerPlayerTx.hash,
        createPetTxHash: createPetTx.hash,
        depositTxHash: depositTx.hash,
        setBudgetTxHash: setBudgetTx.hash,
        onchainPetId: String(onchainPetId),
        chainSyncPlayer: registerPlayerConfirm.body.chainSync,
        chainSyncPet: setBudgetConfirm.body.chainSync,
        vaultBudget: {
          deposited: finalBudget.deposited.toString(),
          spendableBudget: finalBudget.spendableBudget.toString(),
          singleTxLimit: finalBudget.singleTxLimit.toString(),
          dailyLimit: finalBudget.dailyLimit.toString(),
        },
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
