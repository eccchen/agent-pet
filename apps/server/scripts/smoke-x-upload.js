const crypto = require("node:crypto");

const { Wallet } = require("ethers");

function readEnv(name) {
  const value = process.env[name]?.trim();
  return value ? value : null;
}

function createRandomWalletAddress() {
  return `0x${crypto.randomBytes(20).toString("hex")}`;
}

function createUniqueValue(prefix, now) {
  const timestamp = now().toISOString().replace(/[:.]/g, "-");
  const suffix = crypto.randomBytes(3).toString("hex");
  return `${prefix}-${timestamp}-${suffix}`;
}

function normalizeBaseUrl(baseUrl) {
  return baseUrl.replace(/\/+$/, "");
}

async function readResponseBody(response) {
  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function requestJson(fetchImpl, baseUrl, method, path, body, headers = {}) {
  const response = await fetchImpl(`${baseUrl}${path}`, {
    method,
    headers: {
      "content-type": "application/json",
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const parsedBody = await readResponseBody(response);
  if (!response.ok) {
    throw new Error(
      `${method} ${path} failed with ${response.status}${parsedBody ? `: ${JSON.stringify(parsedBody)}` : ""}`,
    );
  }

  return parsedBody;
}

async function runSmoke(options = {}) {
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  if (typeof fetchImpl !== "function") {
    throw new Error("fetch is not available in this runtime");
  }

  const now = options.now ?? (() => new Date());
  const baseUrl = normalizeBaseUrl(
    options.baseUrl ?? readEnv("SMOKE_BASE_URL") ?? "http://127.0.0.1:3001",
  );
  const privateKey = options.privateKey ?? readEnv("SMOKE_WALLET_PRIVATE_KEY");
  const walletFromPrivateKey = privateKey ? new Wallet(privateKey) : null;
  const walletAddress =
    options.walletAddress ??
    readEnv("SMOKE_WALLET_ADDRESS") ??
    walletFromPrivateKey?.address ??
    createRandomWalletAddress();

  if (
    walletFromPrivateKey &&
    walletAddress.toLowerCase() !== walletFromPrivateKey.address.toLowerCase()
  ) {
    throw new Error("walletAddress does not match SMOKE_WALLET_PRIVATE_KEY");
  }

  const xAccountId = options.xAccountId ?? readEnv("SMOKE_X_ACCOUNT_ID") ?? `smoke-${crypto.randomBytes(3).toString("hex")}`;
  const petId = options.petId ?? readEnv("SMOKE_PET_ID") ?? "starter-pet";
  const tweetId = options.tweetId ?? readEnv("SMOKE_TWEET_ID") ?? createUniqueValue("smoke-tweet", now);
  const localProof =
    options.localProof ?? readEnv("SMOKE_LOCAL_PROOF") ?? createUniqueValue("smoke-proof", now);

  const challenge = await requestJson(fetchImpl, baseUrl, "POST", "/api/auth/challenge", {
    walletAddress,
  });
  if (!challenge || typeof challenge.challenge !== "string" || typeof challenge.nonce !== "string") {
    throw new Error("challenge response is invalid");
  }

  const signature = walletFromPrivateKey
    ? await walletFromPrivateKey.signMessage(challenge.challenge)
    : `signed:${challenge.nonce}`;

  const verify = await requestJson(fetchImpl, baseUrl, "POST", "/api/auth/verify", {
    walletAddress,
    signature,
  });
  if (!verify || typeof verify.token !== "string") {
    throw new Error("verify response is invalid");
  }

  const authHeaders = {
    authorization: `Bearer ${verify.token}`,
  };

  await requestJson(fetchImpl, baseUrl, "POST", "/api/players/bootstrap", undefined, authHeaders);

  const xStatus = await requestJson(fetchImpl, baseUrl, "GET", "/api/x/status", undefined, authHeaders);
  if (!xStatus || xStatus.enabled !== true || xStatus.canUpload !== true) {
    throw new Error(
      "X upload smoke requires X_INTEGRATION_MODE=local_upload; current adapter is disabled.",
    );
  }

  const uploadPayload = {
    petId,
    xAccountId,
    actionType: "post",
    tweetId,
    content: `Smoke upload for ${tweetId}`,
    localProof,
  };

  const upload = await requestJson(
    fetchImpl,
    baseUrl,
    "POST",
    "/api/x/actions/upload",
    uploadPayload,
    authHeaders,
  );
  if (!upload || !upload.action) {
    throw new Error("upload response is invalid");
  }

  const home = await requestJson(fetchImpl, baseUrl, "GET", "/api/me/home", undefined, authHeaders);
  const xActions = Array.isArray(home?.xActions) ? home.xActions : [];
  const matchedAction = xActions.find(
    (action) => action?.tweetId === tweetId && action?.localProof === localProof,
  );

  if (!matchedAction) {
    throw new Error(`uploaded x action ${tweetId} was not found in /api/me/home`);
  }

  if (matchedAction.status !== "confirmed") {
    throw new Error(`uploaded x action ${tweetId} is ${matchedAction.status}`);
  }

  return {
    baseUrl,
    walletAddress,
    xAccountId,
    petId,
    tweetId,
    localProof,
    upload,
    home,
  };
}

async function main() {
  const result = await runSmoke();
  console.log(
    JSON.stringify(
      {
        baseUrl: result.baseUrl,
        walletAddress: result.walletAddress,
        xAccountId: result.xAccountId,
        petId: result.petId,
        tweetId: result.tweetId,
        localProof: result.localProof,
        uploadedActionId: result.upload.action.id,
        uploadedActionStatus: result.upload.action.status,
      },
      null,
      2,
    ),
  );
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}

module.exports = {
  runSmoke,
};
