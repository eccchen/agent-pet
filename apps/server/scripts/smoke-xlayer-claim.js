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

async function main() {
  const rpcUrl = requireEnv("XLAYER_RPC_URL");
  const registryAddress = requireEnv("PET_REGISTRY_ADDRESS");
  const vaultAddress = requireEnv("BUDGET_VAULT_ADDRESS");
  const tokenAddress = requireEnv("CANNED_TOKEN_ADDRESS");
  const claimVaultAddress = requireEnv("CLAIM_VAULT_ADDRESS");
  const claimSignerPrivateKey = requireEnv("CLAIM_SIGNER_PRIVATE_KEY");
  const fundingPrivateKey = requireEnv("FUNDING_PRIVATE_KEY");
  const challengePrefix = process.env.CHALLENGE_PREFIX?.trim() || "Sign this wallet challenge";

  const provider = new providers.JsonRpcProvider(rpcUrl);
  const fundingWallet = new Wallet(fundingPrivateKey, provider);
  const wallet = Wallet.createRandom().connect(provider);

  const fundTx = await fundingWallet.sendTransaction({
    to: wallet.address,
    value: "10000000000000000",
  });
  await fundTx.wait();

  const chainSync = createXLayerChainSyncAdapter({
    chainId: 1952,
    rpcUrl,
    registryAddress,
    vaultAddress,
    claimVaultAddress,
    claimSignerPrivateKey,
    claimIntentExpirySeconds: 3600,
    now: () => new Date(),
  });

  const statePath = path.join(
    fs.mkdtempSync(path.join(os.tmpdir(), "agent-game-claim-")),
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
      body: { walletAddress: wallet.address, signature },
    },
    store,
  );
  if (verify.statusCode !== 200) {
    throw new Error(`verify failed ${verify.statusCode}`);
  }

  const authHeaders = { authorization: `Bearer ${verify.body.token}` };

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

  const command = await resolveRoute(
    {
      method: "POST",
      path: "/api/pets/starter-pet/commands",
      headers: authHeaders,
      body: { commandType: "earn" },
    },
    store,
  );
  if (command.statusCode !== 200) {
    throw new Error(`earn failed ${command.statusCode}`);
  }

  const withdraw = await resolveRoute(
    {
      method: "POST",
      path: "/api/profit/withdraw",
      headers: authHeaders,
      body: { amount: 60 },
    },
    store,
  );
  if (withdraw.statusCode !== 200) {
    throw new Error(`withdraw failed ${withdraw.statusCode}`);
  }

  const claimIntent = await resolveRoute(
    {
      method: "POST",
      path: "/api/onchain/claim/intent",
      headers: authHeaders,
    },
    store,
  );
  if (claimIntent.statusCode !== 200) {
    throw new Error(`claim intent failed ${claimIntent.statusCode} ${JSON.stringify(claimIntent.body)}`);
  }

  const claimTx = await wallet.sendTransaction({
    to: claimIntent.body.to,
    data: claimIntent.body.data,
    value: claimIntent.body.value,
  });
  await claimTx.wait();

  const claimConfirm = await resolveRoute(
    {
      method: "POST",
      path: "/api/onchain/claim/confirm",
      headers: authHeaders,
      body: { txHash: claimTx.hash },
    },
    store,
  );
  if (claimConfirm.statusCode !== 200) {
    throw new Error(`claim confirm failed ${claimConfirm.statusCode} ${JSON.stringify(claimConfirm.body)}`);
  }

  const token = new Contract(
    tokenAddress,
    ["function balanceOf(address account) view returns (uint256)"],
    provider,
  );
  const tokenBalance = await token.balanceOf(wallet.address);

  console.log(
    JSON.stringify(
      {
        wallet: wallet.address,
        fundingTxHash: fundTx.hash,
        claimTxHash: claimTx.hash,
        claim: claimConfirm.body.claim,
        tokenBalance: tokenBalance.toString(),
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
