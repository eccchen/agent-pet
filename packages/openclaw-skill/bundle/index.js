// ../openclaw-client/dist/client.js
function isRetryableStatus(statusCode) {
  return statusCode === 409 || statusCode === 408 || statusCode === 425 || statusCode === 429 || statusCode >= 500;
}
function extractErrorMessage(payload, fallback) {
  if (payload && typeof payload === "object") {
    const candidate = payload;
    if (typeof candidate.error === "string" && candidate.error.trim()) {
      return candidate.error.trim();
    }
    if (typeof candidate.message === "string" && candidate.message.trim()) {
      return candidate.message.trim();
    }
  }
  if (typeof payload === "string" && payload.trim()) {
    return payload.trim();
  }
  return fallback;
}
var OpenClawApiError = class extends Error {
  kind;
  operation;
  endpoint;
  statusCode;
  retryable;
  responseBody;
  constructor(kind, message, details) {
    super(message);
    this.name = "OpenClawApiError";
    this.kind = kind;
    this.operation = details.operation;
    this.endpoint = details.endpoint;
    this.statusCode = details.statusCode ?? null;
    this.retryable = details.retryable ?? false;
    this.responseBody = details.responseBody;
    Object.setPrototypeOf(this, new.target.prototype);
  }
};
var OpenClawAuthError = class extends OpenClawApiError {
  constructor(message, details) {
    super("auth", message, details);
    this.name = "OpenClawAuthError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
};
var OpenClawOnchainError = class extends OpenClawApiError {
  phase;
  action;
  constructor(message, details) {
    super("onchain", message, details);
    this.name = "OpenClawOnchainError";
    this.phase = details.phase;
    this.action = details.action;
    Object.setPrototypeOf(this, new.target.prototype);
  }
};
var OpenClawXUploadError = class extends OpenClawApiError {
  constructor(message, details) {
    super("x-upload", message, details);
    this.name = "OpenClawXUploadError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
};
var OpenClawNetworkError = class extends OpenClawApiError {
  constructor(message, details) {
    super("network", message, details);
    this.name = "OpenClawNetworkError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
};
function createHeaders(token) {
  return {
    Accept: "application/json",
    Authorization: `Bearer ${token}`
  };
}
async function requestJson(fetchImpl, baseUrl, path3, init, metadata) {
  let response;
  try {
    response = await fetchImpl(`${baseUrl}${path3}`, {
      method: init.method,
      headers: init.headers,
      body: init.body
    });
  } catch (cause) {
    throw new OpenClawNetworkError(`Network error while calling ${metadata.operation}.`, {
      operation: metadata.operation,
      endpoint: metadata.endpoint,
      retryable: true
    });
  }
  let parsed = null;
  const rawText = await response.text();
  try {
    parsed = {
      text: rawText,
      body: rawText ? JSON.parse(rawText) : null
    };
  } catch {
    parsed = {
      text: rawText,
      body: rawText
    };
  }
  if (!response.ok) {
    const message = extractErrorMessage(parsed.body, `Request failed with status ${response.status}`);
    const details = {
      operation: metadata.operation,
      endpoint: metadata.endpoint,
      statusCode: response.status,
      retryable: isRetryableStatus(response.status),
      responseBody: parsed.body
    };
    if (metadata.kind === "auth") {
      throw new OpenClawAuthError(message, details);
    }
    if (metadata.kind === "onchain") {
      throw new OpenClawOnchainError(message, {
        ...details,
        phase: metadata.onchainPhase ?? "confirm",
        action: metadata.onchainAction ?? metadata.operation
      });
    }
    if (metadata.kind === "x-upload") {
      throw new OpenClawXUploadError(message, details);
    }
    throw new OpenClawApiError(metadata.kind, message, details);
  }
  if (!parsed) {
    throw new OpenClawApiError(metadata.kind, `Unexpected empty response for ${metadata.operation}.`, {
      operation: metadata.operation,
      endpoint: metadata.endpoint,
      statusCode: response.status,
      retryable: false
    });
  }
  return parsed.body;
}
async function retry(operation, fn, options = {}) {
  const maxAttempts = Math.max(1, Math.floor(options.maxAttempts ?? 3));
  const delayMs = Math.max(0, Math.floor(options.delayMs ?? 0));
  let lastError;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const retryable = error instanceof OpenClawApiError ? error.retryable : true;
      if (!retryable || attempt >= maxAttempts) {
        throw error;
      }
      if (delayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }
  throw lastError instanceof Error ? lastError : new Error(`Failed to complete ${operation}.`);
}
function createOpenClawClient({ baseUrl, token, fetch: fetchImpl = fetch }) {
  function call(path3, init, metadata) {
    return requestJson(fetchImpl, baseUrl, path3, init, metadata);
  }
  return {
    createChallenge(walletAddress) {
      return call("/api/auth/challenge", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ walletAddress })
      }, {
        operation: "createChallenge",
        endpoint: "/api/auth/challenge",
        kind: "auth"
      });
    },
    verifyChallenge(walletAddress, signature) {
      return call("/api/auth/verify", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ walletAddress, signature })
      }, {
        operation: "verifyChallenge",
        endpoint: "/api/auth/verify",
        kind: "auth"
      });
    },
    bootstrapPlayer() {
      return call("/api/players/bootstrap", {
        method: "POST",
        headers: createHeaders(token)
      }, {
        operation: "bootstrapPlayer",
        endpoint: "/api/players/bootstrap",
        kind: "api"
      });
    },
    getHome() {
      return call("/api/me/home", {
        method: "GET",
        headers: createHeaders(token)
      }, {
        operation: "getHome",
        endpoint: "/api/me/home",
        kind: "api"
      });
    },
    getFeed() {
      return call("/api/me/feed", {
        method: "GET",
        headers: createHeaders(token)
      }, {
        operation: "getFeed",
        endpoint: "/api/me/feed",
        kind: "api"
      });
    },
    getMessageCenter() {
      return call("/api/me/messages", {
        method: "GET",
        headers: createHeaders(token)
      }, {
        operation: "getMessageCenter",
        endpoint: "/api/me/messages",
        kind: "api"
      });
    },
    getXAdapterStatus() {
      return call("/api/x/status", {
        method: "GET",
        headers: createHeaders(token)
      }, {
        operation: "getXAdapterStatus",
        endpoint: "/api/x/status",
        kind: "api"
      });
    },
    getPetPersonality(petId) {
      const endpoint = `/api/pets/${encodeURIComponent(petId)}/personality`;
      return call(endpoint, {
        method: "GET",
        headers: createHeaders(token)
      }, {
        operation: "getPetPersonality",
        endpoint,
        kind: "api"
      });
    },
    setPetStrategy(petId, strategyMode) {
      const endpoint = `/api/pets/${encodeURIComponent(petId)}/strategy`;
      return call(endpoint, {
        method: "PATCH",
        headers: {
          ...createHeaders(token),
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ strategyMode })
      }, {
        operation: "setPetStrategy",
        endpoint,
        kind: "api"
      });
    },
    setPetAutonomy(petId, autonomyLevel) {
      const endpoint = `/api/pets/${encodeURIComponent(petId)}/autonomy`;
      return call(endpoint, {
        method: "PATCH",
        headers: {
          ...createHeaders(token),
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ autonomyLevel })
      }, {
        operation: "setPetAutonomy",
        endpoint,
        kind: "api"
      });
    },
    getPetRecommendations(petId) {
      const endpoint = `/api/pets/${encodeURIComponent(petId)}/recommendations`;
      return call(endpoint, {
        method: "GET",
        headers: createHeaders(token)
      }, {
        operation: "getPetRecommendations",
        endpoint,
        kind: "api"
      });
    },
    getClaimSnapshot() {
      return call("/api/me/claim", {
        method: "GET",
        headers: createHeaders(token)
      }, {
        operation: "getClaimSnapshot",
        endpoint: "/api/me/claim",
        kind: "api"
      });
    },
    getEconomy() {
      return call("/api/me/economy", {
        method: "GET",
        headers: createHeaders(token)
      }, {
        operation: "getEconomy",
        endpoint: "/api/me/economy",
        kind: "api"
      });
    },
    getLedger() {
      return call("/api/me/economy/ledger", {
        method: "GET",
        headers: createHeaders(token)
      }, {
        operation: "getLedger",
        endpoint: "/api/me/economy/ledger",
        kind: "api"
      });
    },
    listBounties() {
      return call("/api/economy/bounties", {
        method: "GET",
        headers: createHeaders(token)
      }, {
        operation: "listBounties",
        endpoint: "/api/economy/bounties",
        kind: "api"
      });
    },
    listDuels() {
      return call("/api/economy/duels", {
        method: "GET",
        headers: createHeaders(token)
      }, {
        operation: "listDuels",
        endpoint: "/api/economy/duels",
        kind: "api"
      });
    },
    listServiceOrders() {
      return call("/api/economy/service-orders", {
        method: "GET",
        headers: createHeaders(token)
      }, {
        operation: "listServiceOrders",
        endpoint: "/api/economy/service-orders",
        kind: "api"
      });
    },
    issuePetCommand(petId, commandType) {
      return call(`/api/pets/${encodeURIComponent(petId)}/commands`, {
        method: "POST",
        headers: {
          ...createHeaders(token),
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ commandType })
      }, {
        operation: "issuePetCommand",
        endpoint: `/api/pets/${encodeURIComponent(petId)}/commands`,
        kind: "api"
      });
    },
    updatePetBudget(petId, budget) {
      return call(`/api/pets/${encodeURIComponent(petId)}/budget`, {
        method: "PATCH",
        headers: {
          ...createHeaders(token),
          "Content-Type": "application/json"
        },
        body: JSON.stringify(budget)
      }, {
        operation: "updatePetBudget",
        endpoint: `/api/pets/${encodeURIComponent(petId)}/budget`,
        kind: "api"
      });
    },
    createTip(fromPetId, targetWalletAddress, toPetId, amount) {
      return call("/api/economy/tips", {
        method: "POST",
        headers: {
          ...createHeaders(token),
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ fromPetId, targetWalletAddress, toPetId, amount })
      }, {
        operation: "createTip",
        endpoint: "/api/economy/tips",
        kind: "api"
      });
    },
    createBounty(payload) {
      return call("/api/economy/bounties", {
        method: "POST",
        headers: {
          ...createHeaders(token),
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      }, {
        operation: "createBounty",
        endpoint: "/api/economy/bounties",
        kind: "api"
      });
    },
    claimBounty(bountyId, claimerPetId) {
      return call(`/api/economy/bounties/${encodeURIComponent(bountyId)}/claim`, {
        method: "POST",
        headers: {
          ...createHeaders(token),
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ claimerPetId })
      }, {
        operation: "claimBounty",
        endpoint: `/api/economy/bounties/${encodeURIComponent(bountyId)}/claim`,
        kind: "api"
      });
    },
    createDuel(payload) {
      return call("/api/economy/duels", {
        method: "POST",
        headers: {
          ...createHeaders(token),
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      }, {
        operation: "createDuel",
        endpoint: "/api/economy/duels",
        kind: "api"
      });
    },
    acceptDuel(duelId, targetPetId) {
      return call(`/api/economy/duels/${encodeURIComponent(duelId)}/accept`, {
        method: "POST",
        headers: {
          ...createHeaders(token),
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ targetPetId })
      }, {
        operation: "acceptDuel",
        endpoint: `/api/economy/duels/${encodeURIComponent(duelId)}/accept`,
        kind: "api"
      });
    },
    resolveDuel(duelId, winnerPetId) {
      return call(`/api/economy/duels/${encodeURIComponent(duelId)}/resolve`, {
        method: "POST",
        headers: {
          ...createHeaders(token),
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ winnerPetId })
      }, {
        operation: "resolveDuel",
        endpoint: `/api/economy/duels/${encodeURIComponent(duelId)}/resolve`,
        kind: "api"
      });
    },
    createServiceOrder(payload) {
      return call("/api/economy/service-orders", {
        method: "POST",
        headers: {
          ...createHeaders(token),
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      }, {
        operation: "createServiceOrder",
        endpoint: "/api/economy/service-orders",
        kind: "api"
      });
    },
    acceptServiceOrder(orderId, providerPetId) {
      return call(`/api/economy/service-orders/${encodeURIComponent(orderId)}/accept`, {
        method: "POST",
        headers: {
          ...createHeaders(token),
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ providerPetId })
      }, {
        operation: "acceptServiceOrder",
        endpoint: `/api/economy/service-orders/${encodeURIComponent(orderId)}/accept`,
        kind: "api"
      });
    },
    completeServiceOrder(orderId) {
      return call(`/api/economy/service-orders/${encodeURIComponent(orderId)}/complete`, {
        method: "POST",
        headers: createHeaders(token)
      }, {
        operation: "completeServiceOrder",
        endpoint: `/api/economy/service-orders/${encodeURIComponent(orderId)}/complete`,
        kind: "api"
      });
    },
    claimSafetyNet() {
      return call("/api/economy/safety-net/claim", {
        method: "POST",
        headers: createHeaders(token)
      }, {
        operation: "claimSafetyNet",
        endpoint: "/api/economy/safety-net/claim",
        kind: "api"
      });
    },
    prepareClaimOnchain() {
      return call("/api/onchain/claim/intent", {
        method: "POST",
        headers: createHeaders(token)
      }, {
        operation: "prepareClaimOnchain",
        endpoint: "/api/onchain/claim/intent",
        kind: "onchain",
        onchainPhase: "intent",
        onchainAction: "claim"
      });
    },
    confirmClaimOnchain(txHash) {
      return call("/api/onchain/claim/confirm", {
        method: "POST",
        headers: {
          ...createHeaders(token),
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ txHash })
      }, {
        operation: "confirmClaimOnchain",
        endpoint: "/api/onchain/claim/confirm",
        kind: "onchain",
        onchainAction: "claim"
      });
    },
    cancelClaimOnchain() {
      return call("/api/onchain/claim/cancel", {
        method: "POST",
        headers: createHeaders(token)
      }, {
        operation: "cancelClaimOnchain",
        endpoint: "/api/onchain/claim/cancel",
        kind: "api"
      });
    },
    uploadXAction(payload) {
      return call("/api/x/actions/upload", {
        method: "POST",
        headers: {
          ...createHeaders(token),
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      }, {
        operation: "uploadXAction",
        endpoint: "/api/x/actions/upload",
        kind: "x-upload"
      });
    },
    prepareRegisterPlayerOnchain() {
      return call("/api/onchain/register-player/intent", {
        method: "POST",
        headers: createHeaders(token)
      }, {
        operation: "prepareRegisterPlayerOnchain",
        endpoint: "/api/onchain/register-player/intent",
        kind: "onchain",
        onchainPhase: "intent",
        onchainAction: "register-player"
      });
    },
    confirmRegisterPlayerOnchain(txHash) {
      return call("/api/onchain/register-player/confirm", {
        method: "POST",
        headers: {
          ...createHeaders(token),
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ txHash })
      }, {
        operation: "confirmRegisterPlayerOnchain",
        endpoint: "/api/onchain/register-player/confirm",
        kind: "onchain",
        onchainPhase: "confirm",
        onchainAction: "register-player"
      });
    },
    prepareCreatePetOnchain(petId) {
      return call("/api/onchain/create-pet/intent", {
        method: "POST",
        headers: {
          ...createHeaders(token),
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ petId })
      }, {
        operation: "prepareCreatePetOnchain",
        endpoint: "/api/onchain/create-pet/intent",
        kind: "onchain",
        onchainPhase: "intent",
        onchainAction: "create-pet"
      });
    },
    confirmCreatePetOnchain(petId, txHash) {
      return call("/api/onchain/create-pet/confirm", {
        method: "POST",
        headers: {
          ...createHeaders(token),
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ petId, txHash })
      }, {
        operation: "confirmCreatePetOnchain",
        endpoint: "/api/onchain/create-pet/confirm",
        kind: "onchain",
        onchainPhase: "confirm",
        onchainAction: "create-pet"
      });
    },
    prepareSetPetBudgetOnchain(petId) {
      return call("/api/onchain/set-budget/intent", {
        method: "POST",
        headers: {
          ...createHeaders(token),
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ petId })
      }, {
        operation: "prepareSetPetBudgetOnchain",
        endpoint: "/api/onchain/set-budget/intent",
        kind: "onchain",
        onchainPhase: "intent",
        onchainAction: "set-budget"
      });
    },
    confirmSetPetBudgetOnchain(petId, txHash) {
      return call("/api/onchain/set-budget/confirm", {
        method: "POST",
        headers: {
          ...createHeaders(token),
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ petId, txHash })
      }, {
        operation: "confirmSetPetBudgetOnchain",
        endpoint: "/api/onchain/set-budget/confirm",
        kind: "onchain",
        onchainPhase: "confirm",
        onchainAction: "set-budget"
      });
    },
    confirmRegisterPlayerOnchainWithRetry(txHash, options) {
      return retry("confirmRegisterPlayerOnchainWithRetry", () => this.confirmRegisterPlayerOnchain(txHash), options);
    },
    confirmCreatePetOnchainWithRetry(petId, txHash, options) {
      return retry("confirmCreatePetOnchainWithRetry", () => this.confirmCreatePetOnchain(petId, txHash), options);
    },
    confirmSetPetBudgetOnchainWithRetry(petId, txHash, options) {
      return retry("confirmSetPetBudgetOnchainWithRetry", () => this.confirmSetPetBudgetOnchain(petId, txHash), options);
    },
    uploadXActionWithRetry(payload, options) {
      return retry("uploadXActionWithRetry", () => this.uploadXAction(payload), options);
    }
  };
}

// ../openclaw-client/dist/cli.js
import { fileURLToPath } from "node:url";
import path from "node:path";
function parseArgs(argv) {
  const [command = "help", ...rest] = argv;
  const flags = {};
  for (let index = 0; index < rest.length; index += 1) {
    const part = rest[index];
    if (!part.startsWith("--")) {
      continue;
    }
    const key = part.slice(2);
    const value = rest[index + 1];
    if (value && !value.startsWith("--")) {
      flags[key] = value;
      index += 1;
    } else {
      flags[key] = "true";
    }
  }
  return { command, flags };
}
function requireFlag(flags, name) {
  const value = flags[name]?.trim();
  if (!value) {
    throw new Error(`Missing required flag --${name}`);
  }
  return value;
}
function toBudget(flags) {
  return {
    spendableBudget: Number(requireFlag(flags, "spendable-budget")),
    singleTxLimit: Number(requireFlag(flags, "single-tx-limit")),
    dailyLimit: Number(requireFlag(flags, "daily-limit"))
  };
}
function print(io, value) {
  const text = `${JSON.stringify(value, null, 2)}
`;
  (io.stdout ?? process.stdout).write(text);
}
function printError(io, value) {
  (io.stderr ?? process.stderr).write(`${value}
`);
}
function formatError(error) {
  if (error instanceof OpenClawApiError) {
    const parts = [
      `op=${error.operation}`,
      `kind=${error.kind}`
    ];
    if (error.statusCode !== null) {
      parts.push(`status=${error.statusCode}`);
    }
    if (error.retryable) {
      parts.push("retryable=true");
    }
    return `${error.name}: ${error.message} (${parts.join(", ")})`;
  }
  if (error instanceof Error) {
    return `${error.name}: ${error.message}`;
  }
  return "CLI failed";
}
async function runCli(argv, io = {}) {
  const { command, flags } = parseArgs(argv);
  if (command === "help" || command === "--help" || command === "-h") {
    print(io, {
      commands: [
        "challenge",
        "verify",
        "bootstrap",
        "home",
        "claim-snapshot",
        "economy",
        "ledger",
        "command",
        "budget",
        "tip",
        "bounty-create",
        "bounty-claim",
        "duel-create",
        "duel-accept",
        "duel-resolve",
        "service-create",
        "service-accept",
        "service-complete",
        "safety-net",
        "claim-prepare",
        "claim-confirm",
        "claim-cancel",
        "upload-x",
        "chain-register",
        "chain-create-pet",
        "chain-set-budget"
      ]
    });
    return 0;
  }
  const baseUrl = requireFlag(flags, "base-url");
  const token = requireFlag(flags, "token");
  const client = createOpenClawClient({ baseUrl, token, fetch: io.fetch });
  try {
    switch (command) {
      case "challenge": {
        const walletAddress = requireFlag(flags, "wallet");
        const challenge = await client.createChallenge(walletAddress);
        print(io, challenge);
        return 0;
      }
      case "verify": {
        const walletAddress = requireFlag(flags, "wallet");
        const signature = requireFlag(flags, "signature");
        const session = await client.verifyChallenge(walletAddress, signature);
        print(io, session);
        return 0;
      }
      case "bootstrap": {
        const snapshot = await client.bootstrapPlayer();
        print(io, snapshot);
        return 0;
      }
      case "home": {
        const snapshot = await client.getHome();
        print(io, snapshot);
        return 0;
      }
      case "claim-snapshot": {
        const snapshot = await client.getClaimSnapshot();
        print(io, snapshot);
        return 0;
      }
      case "economy": {
        const snapshot = await client.getEconomy();
        print(io, snapshot);
        return 0;
      }
      case "ledger": {
        const snapshot = await client.getLedger();
        print(io, snapshot);
        return 0;
      }
      case "command": {
        const petId = requireFlag(flags, "pet-id");
        const commandType = requireFlag(flags, "type");
        const result = await client.issuePetCommand(petId, commandType);
        print(io, result);
        return 0;
      }
      case "budget": {
        const petId = requireFlag(flags, "pet-id");
        const result = await client.updatePetBudget(petId, toBudget(flags));
        print(io, result);
        return 0;
      }
      case "tip": {
        const fromPetId = requireFlag(flags, "from-pet-id");
        const targetWalletAddress = requireFlag(flags, "target-wallet");
        const toPetId = requireFlag(flags, "to-pet-id");
        const amount = Number(requireFlag(flags, "amount"));
        const result = await client.createTip(fromPetId, targetWalletAddress, toPetId, amount);
        print(io, result);
        return 0;
      }
      case "bounty-create": {
        const result = await client.createBounty({
          creatorPetId: requireFlag(flags, "creator-pet-id"),
          targetWalletAddress: requireFlag(flags, "target-wallet"),
          targetPetId: requireFlag(flags, "target-pet-id"),
          title: requireFlag(flags, "title"),
          detail: requireFlag(flags, "detail"),
          amount: Number(requireFlag(flags, "amount"))
        });
        print(io, result);
        return 0;
      }
      case "bounty-claim": {
        const result = await client.claimBounty(requireFlag(flags, "bounty-id"), requireFlag(flags, "claimer-pet-id"));
        print(io, result);
        return 0;
      }
      case "duel-create": {
        const result = await client.createDuel({
          challengerPetId: requireFlag(flags, "challenger-pet-id"),
          targetWalletAddress: requireFlag(flags, "target-wallet"),
          targetPetId: requireFlag(flags, "target-pet-id"),
          stakeAmount: Number(requireFlag(flags, "stake-amount"))
        });
        print(io, result);
        return 0;
      }
      case "duel-accept": {
        const result = await client.acceptDuel(requireFlag(flags, "duel-id"), requireFlag(flags, "target-pet-id"));
        print(io, result);
        return 0;
      }
      case "duel-resolve": {
        const result = await client.resolveDuel(requireFlag(flags, "duel-id"), requireFlag(flags, "winner-pet-id"));
        print(io, result);
        return 0;
      }
      case "service-create": {
        const result = await client.createServiceOrder({
          clientPetId: requireFlag(flags, "client-pet-id"),
          serviceType: requireFlag(flags, "service-type"),
          title: requireFlag(flags, "title"),
          detail: requireFlag(flags, "detail"),
          amount: Number(requireFlag(flags, "amount"))
        });
        print(io, result);
        return 0;
      }
      case "service-accept": {
        const result = await client.acceptServiceOrder(requireFlag(flags, "order-id"), requireFlag(flags, "provider-pet-id"));
        print(io, result);
        return 0;
      }
      case "service-complete": {
        const result = await client.completeServiceOrder(requireFlag(flags, "order-id"));
        print(io, result);
        return 0;
      }
      case "safety-net": {
        const result = await client.claimSafetyNet();
        print(io, result);
        return 0;
      }
      case "claim-prepare": {
        const result = await client.prepareClaimOnchain();
        print(io, result);
        return 0;
      }
      case "claim-confirm": {
        const txHash = requireFlag(flags, "tx-hash");
        const result = await client.confirmClaimOnchain(txHash);
        print(io, result);
        return 0;
      }
      case "claim-cancel": {
        const result = await client.cancelClaimOnchain();
        print(io, result);
        return 0;
      }
      case "upload-x": {
        const petId = requireFlag(flags, "pet-id");
        const xAccountId = requireFlag(flags, "x-account");
        const actionType = requireFlag(flags, "action-type");
        const tweetId = requireFlag(flags, "tweet-id");
        const payload = {
          petId,
          xAccountId,
          actionType,
          tweetId,
          replyToTweetId: flags["reply-to"] ?? null,
          content: flags.content ?? null,
          localProof: flags["local-proof"] ?? null
        };
        const result = await client.uploadXAction(payload);
        print(io, result);
        return 0;
      }
      case "chain-register": {
        const result = await client.prepareRegisterPlayerOnchain();
        print(io, result);
        return 0;
      }
      case "chain-create-pet": {
        const petId = requireFlag(flags, "pet-id");
        const result = await client.prepareCreatePetOnchain(petId);
        print(io, result);
        return 0;
      }
      case "chain-set-budget": {
        const petId = requireFlag(flags, "pet-id");
        const result = await client.prepareSetPetBudgetOnchain(petId);
        print(io, result);
        return 0;
      }
      default:
        throw new Error(`Unknown command: ${command}`);
    }
  } catch (error) {
    printError(io, formatError(error));
    return 1;
  }
}
function isMainModule(moduleUrl, modulePath) {
  return path.resolve(fileURLToPath(moduleUrl)) === path.resolve(modulePath);
}
if (process.argv[1] && isMainModule(import.meta.url, process.argv[1])) {
  void runCli(process.argv.slice(2));
}

// src/command-presets.ts
var OPENCLAW_COMMAND_PRESETS = [
  {
    commandType: "earn",
    title: "\u8D5A\u94B1",
    purpose: "\u8BA9\u5BA0\u7269\u4F18\u5148\u8DD1\u5B89\u5168\u8D5A\u94B1\u52A8\u4F5C\uFF0C\u589E\u52A0\u6536\u76CA\u6C60\u3002",
    examples: ["\u8D5A\u94B1", "\u53BB\u8D5A\u94B1", "\u53BB\u6323\u70B9\u94B1", "earn"],
    aliases: ["\u8D5A\u94B1", "\u53BB\u8D5A\u94B1", "\u53BB\u6323\u70B9\u94B1", "earn", "farm", "make money"]
  },
  {
    commandType: "taunt",
    title: "\u5F00\u603C",
    purpose: "\u8BA9\u5BA0\u7269\u53BB\u516C\u5F00\u6311\u8845\u3001\u62F1\u706B\u6216\u70B9\u540D\u5BF9\u7EBF\u3002",
    examples: ["\u603C\u4ED6", "\u53BB\u55B7", "\u6311\u8845", "taunt"],
    aliases: ["\u603C\u4ED6", "\u53BB\u55B7", "\u6311\u8845", "taunt", "flame", "diss"]
  },
  {
    commandType: "ally",
    title: "\u7ED3\u76DF",
    purpose: "\u8BA9\u5BA0\u7269\u62C9\u5173\u7CFB\u3001\u7AD9\u961F\u6216\u5C1D\u8BD5\u5EFA\u7ACB\u5408\u4F5C\u3002",
    examples: ["\u7ED3\u76DF", "\u53BB\u62C9\u5173\u7CFB", "\u627E\u76DF\u53CB", "ally"],
    aliases: ["\u7ED3\u76DF", "\u53BB\u62C9\u5173\u7CFB", "\u627E\u76DF\u53CB", "ally", "team up", "make ally"]
  },
  {
    commandType: "revenge",
    title: "\u590D\u4EC7",
    purpose: "\u8BA9\u5BA0\u7269\u4F18\u5148\u5904\u7406\u65E7\u4EC7\u548C\u62A5\u590D\u76EE\u6807\u3002",
    examples: ["\u590D\u4EC7", "\u53BB\u62A5\u590D", "\u72E0\u72E0\u5E72\u56DE\u6765", "revenge"],
    aliases: ["\u590D\u4EC7", "\u53BB\u62A5\u590D", "\u72E0\u72E0\u5E72\u56DE\u6765", "revenge", "retaliate", "get back"]
  },
  {
    commandType: "stay_low",
    title: "\u82DF\u4F4F",
    purpose: "\u8BA9\u5BA0\u7269\u964D\u4F4E\u66DD\u5149\u548C\u98CE\u9669\uFF0C\u5148\u4FDD\u9884\u7B97\u548C\u72B6\u6001\u3002",
    examples: ["\u82DF\u4F4F", "\u5148\u522B\u60F9\u4E8B", "\u4F4E\u8C03\u70B9", "stay low"],
    aliases: ["\u82DF\u4F4F", "\u5148\u522B\u60F9\u4E8B", "\u4F4E\u8C03\u70B9", "stay low", "hide", "lay low"]
  }
];
var OPENCLAW_STRATEGY_PRESETS = [
  {
    strategyMode: "earn",
    title: "\u7A33\u5065\u8D5A\u94B1",
    purpose: "\u8BA9\u5BA0\u7269\u4F18\u5148\u9009\u62E9\u7A33\u5065\u6536\u76CA\u52A8\u4F5C\uFF0C\u517C\u987E\u6301\u7EED\u589E\u957F\u3002",
    examples: ["\u7A33\u5065\u8D5A\u94B1", "\u5B89\u5168\u8D5A\u94B1", "earn"],
    aliases: ["\u7A33\u5065\u8D5A\u94B1", "\u5B89\u5168\u8D5A\u94B1", "earn", "farm", "make money"]
  },
  {
    strategyMode: "taunt",
    title: "\u9AD8\u70ED\u5EA6\u6311\u4E8B",
    purpose: "\u8BA9\u5BA0\u7269\u4F18\u5148\u62C9\u9AD8\u70ED\u5EA6\u5E76\u4E3B\u52A8\u6311\u4E8B\uFF0C\u589E\u52A0\u66DD\u5149\u548C\u51B2\u7A81\u3002",
    examples: ["\u9AD8\u70ED\u5EA6\u6311\u4E8B", "\u4E3B\u52A8\u6311\u8845", "taunt"],
    aliases: ["\u9AD8\u70ED\u5EA6\u6311\u4E8B", "\u4E3B\u52A8\u6311\u8845", "taunt", "flame", "diss"]
  },
  {
    strategyMode: "ally",
    title: "\u5173\u7CFB\u7ECF\u8425",
    purpose: "\u8BA9\u5BA0\u7269\u4F18\u5148\u7EF4\u62A4\u5173\u7CFB\u548C\u5408\u4F5C\uFF0C\u6269\u5927\u53EF\u7528\u534F\u4F5C\u9762\u3002",
    examples: ["\u5173\u7CFB\u7ECF\u8425", "\u53BB\u4EA4\u670B\u53CB", "ally"],
    aliases: ["\u5173\u7CFB\u7ECF\u8425", "\u53BB\u4EA4\u670B\u53CB", "ally", "team up", "make ally"]
  },
  {
    strategyMode: "revenge",
    title: "\u5B9A\u5411\u590D\u4EC7",
    purpose: "\u8BA9\u5BA0\u7269\u4F18\u5148\u5904\u7406\u65E7\u4EC7\u548C\u62A5\u590D\u76EE\u6807\u3002",
    examples: ["\u5B9A\u5411\u590D\u4EC7", "\u53BB\u62A5\u590D", "revenge"],
    aliases: ["\u5B9A\u5411\u590D\u4EC7", "\u53BB\u62A5\u590D", "revenge", "retaliate", "get back"]
  },
  {
    strategyMode: "stay_low",
    title: "\u4FDD\u672C\u4F4E\u8C03",
    purpose: "\u8BA9\u5BA0\u7269\u964D\u4F4E\u66DD\u5149\u548C\u98CE\u9669\uFF0C\u5148\u4FDD\u9884\u7B97\u548C\u72B6\u6001\u3002",
    examples: ["\u4FDD\u672C\u4F4E\u8C03", "\u5148\u522B\u60F9\u4E8B", "stay low"],
    aliases: ["\u4FDD\u672C\u4F4E\u8C03", "\u5148\u522B\u60F9\u4E8B", "stay low", "hide", "lay low"]
  }
];
var aliasToCommandType = new Map(
  OPENCLAW_COMMAND_PRESETS.flatMap(
    (preset) => [preset.commandType, ...preset.aliases].map((alias) => [alias.trim().toLowerCase(), preset.commandType])
  )
);
var strategyAliasToStrategyMode = new Map(
  OPENCLAW_STRATEGY_PRESETS.flatMap(
    (preset) => [preset.strategyMode, ...preset.aliases].map((alias) => [alias.trim().toLowerCase(), preset.strategyMode])
  )
);
function normalizeOpenClawCommand(input) {
  const normalized = input.trim().toLowerCase();
  if (!normalized) {
    return null;
  }
  return aliasToCommandType.get(normalized) ?? null;
}
function listOpenClawCommandPhrases() {
  return OPENCLAW_COMMAND_PRESETS;
}
function normalizeOpenClawStrategy(input) {
  const normalized = input.trim().toLowerCase();
  if (!normalized) {
    return null;
  }
  return strategyAliasToStrategyMode.get(normalized) ?? null;
}
function listOpenClawStrategyPhrases() {
  return OPENCLAW_STRATEGY_PRESETS;
}

// src/skill.ts
function requireSession(session) {
  if (!session) {
    throw new Error("Call login() first.");
  }
  return session;
}
function normalizeStrategyMode(strategy) {
  const normalized = normalizeOpenClawStrategy(strategy);
  if (!normalized) {
    throw new Error(`Unknown strategy: ${strategy}`);
  }
  return normalized;
}
function createOpenClawSkill({ baseUrl, fetch: fetchImpl = fetch }) {
  let session = null;
  function createAuthedClient() {
    const currentSession = requireSession(session);
    return createOpenClawClient({
      baseUrl,
      token: currentSession.token,
      fetch: fetchImpl
    });
  }
  return {
    greeting() {
      return {
        title: "\u{1F44B} \u6B22\u8FCE\u6765\u5230 Agent Pet\uFF01",
        body: "\u4F60\u8FDB\u5165\u4E86\u4E00\u4E2A\u7531\u5BA0\u7269 Agent \u9A71\u52A8\u7684\u94FE\u4E0A\u535A\u5F08\u4E16\u754C\u3002\u5148\u8FDE\u63A5 OKX \u94B1\u5305\uFF0C\u9886\u53D6\u4F60\u7684\u521D\u59CB\u5BA0\u7269\u548C\u7F50\u5934\uFF0C\u7136\u540E\u53BB\u5E7F\u573A\u770B\u770B\u5176\u4ED6\u89D2\u8272\u5728\u505A\u4EC0\u4E48\u3002",
        steps: [
          "\u8FDE\u63A5 OKX \u94B1\u5305\uFF08\u53D1\u9001\u300C\u8FDE\u63A5\u94B1\u5305\u300D\uFF09",
          "\u9886\u53D6\u521D\u59CB\u5BA0\u7269\u548C 500 \u7F50\u5934\u542F\u52A8\u8D44\u91D1",
          "\u53BB\u7F51\u7AD9\u5E7F\u573A\u770B\u770B\u73B0\u5728\u8C01\u5728\u95F9\u4E8B",
          "\u56DE\u6765\u4E0B\u547D\u4EE4\uFF1A\u6311\u8845\u3001\u53D1\u60AC\u8D4F\u3001\u6216\u8005\u9ED8\u9ED8\u8D5A\u94B1"
        ],
        cta: "\u53D1\u9001\u300C\u8FDE\u63A5\u94B1\u5305\u300D\u5F00\u59CB"
      };
    },
    async login(input) {
      const anonymousClient = createOpenClawClient({
        baseUrl,
        token: "",
        fetch: fetchImpl
      });
      const challenge = await anonymousClient.createChallenge(input.walletAddress);
      const signature = await input.signChallenge(challenge);
      session = await anonymousClient.verifyChallenge(input.walletAddress, signature);
      return session;
    },
    async loginWithWallet(wallet) {
      const walletAddress = await wallet.getAddress();
      return this.login({
        walletAddress,
        signChallenge: async (challenge) => {
          try {
            return await wallet.signMessage(challenge.challenge);
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            throw new Error(
              `Wallet-backed login failed: ${message}. If you are using okx-agentic-wallet without generic message signing, keep the server in AUTH_MODE=unsafe for local MVP runs or add a wallet-specific verify flow.`
            );
          }
        }
      });
    },
    bootstrap() {
      return createAuthedClient().bootstrapPlayer();
    },
    home() {
      return createAuthedClient().getHome();
    },
    claimSnapshot() {
      return createAuthedClient().getClaimSnapshot();
    },
    economy() {
      return createAuthedClient().getEconomy();
    },
    ledger() {
      return createAuthedClient().getLedger();
    },
    personality(petId) {
      return createAuthedClient().getPetPersonality(petId);
    },
    setStrategy(petId, strategy) {
      return createAuthedClient().setPetStrategy(petId, normalizeStrategyMode(strategy));
    },
    setAutonomy(petId, autonomyLevel) {
      return createAuthedClient().setPetAutonomy(petId, autonomyLevel);
    },
    recommendations(petId) {
      return createAuthedClient().getPetRecommendations(petId);
    },
    command(petId, commandType) {
      return createAuthedClient().issuePetCommand(petId, commandType);
    },
    budget(petId, budget) {
      return createAuthedClient().updatePetBudget(petId, budget);
    },
    tip(fromPetId, targetWalletAddress, toPetId, amount) {
      return createAuthedClient().createTip(fromPetId, targetWalletAddress, toPetId, amount);
    },
    createBounty(payload) {
      return createAuthedClient().createBounty(payload);
    },
    claimBounty(bountyId, claimerPetId) {
      return createAuthedClient().claimBounty(bountyId, claimerPetId);
    },
    createDuel(payload) {
      return createAuthedClient().createDuel(payload);
    },
    acceptDuel(duelId, targetPetId) {
      return createAuthedClient().acceptDuel(duelId, targetPetId);
    },
    resolveDuel(duelId, winnerPetId) {
      return createAuthedClient().resolveDuel(duelId, winnerPetId);
    },
    createServiceOrder(payload) {
      return createAuthedClient().createServiceOrder(payload);
    },
    acceptServiceOrder(orderId, providerPetId) {
      return createAuthedClient().acceptServiceOrder(orderId, providerPetId);
    },
    completeServiceOrder(orderId) {
      return createAuthedClient().completeServiceOrder(orderId);
    },
    claimSafetyNet() {
      return createAuthedClient().claimSafetyNet();
    },
    prepareClaimOnchain() {
      return createAuthedClient().prepareClaimOnchain();
    },
    confirmClaimOnchain(txHash) {
      return createAuthedClient().confirmClaimOnchain(txHash);
    },
    cancelClaimOnchain() {
      return createAuthedClient().cancelClaimOnchain();
    },
    uploadX(payload) {
      return createAuthedClient().uploadXAction(payload);
    },
    uploadXWithRetry(payload, options) {
      return createAuthedClient().uploadXActionWithRetry(payload, options);
    },
    prepareRegisterPlayerOnchain() {
      return createAuthedClient().prepareRegisterPlayerOnchain();
    },
    confirmRegisterPlayerOnchain(txHash) {
      return createAuthedClient().confirmRegisterPlayerOnchain(txHash);
    },
    confirmRegisterPlayerOnchainWithRetry(txHash, options) {
      return createAuthedClient().confirmRegisterPlayerOnchainWithRetry(txHash, options);
    },
    prepareCreatePetOnchain(petId) {
      return createAuthedClient().prepareCreatePetOnchain(petId);
    },
    confirmCreatePetOnchain(petId, txHash) {
      return createAuthedClient().confirmCreatePetOnchain(petId, txHash);
    },
    confirmCreatePetOnchainWithRetry(petId, txHash, options) {
      return createAuthedClient().confirmCreatePetOnchainWithRetry(petId, txHash, options);
    },
    prepareSetPetBudgetOnchain(petId) {
      return createAuthedClient().prepareSetPetBudgetOnchain(petId);
    },
    confirmSetPetBudgetOnchain(petId, txHash) {
      return createAuthedClient().confirmSetPetBudgetOnchain(petId, txHash);
    },
    confirmSetPetBudgetOnchainWithRetry(petId, txHash, options) {
      return createAuthedClient().confirmSetPetBudgetOnchainWithRetry(petId, txHash, options);
    },
    async registerPlayerOnchainWithWallet(wallet) {
      const intent = await this.prepareRegisterPlayerOnchain();
      const txHash = await wallet.sendTransaction(intent);
      return this.confirmRegisterPlayerOnchain(txHash);
    },
    async createPetOnchainWithWallet(wallet, petId) {
      const intent = await this.prepareCreatePetOnchain(petId);
      const txHash = await wallet.sendTransaction(intent);
      return this.confirmCreatePetOnchain(petId, txHash);
    },
    async setPetBudgetOnchainWithWallet(wallet, petId) {
      const intent = await this.prepareSetPetBudgetOnchain(petId);
      const txHash = await wallet.sendTransaction(intent);
      return this.confirmSetPetBudgetOnchain(petId, txHash);
    },
    getSession() {
      return session;
    },
    execute(action) {
      switch (action.operation) {
        case "greeting":
          return Promise.resolve(this.greeting());
        case "login":
          return this.login({
            walletAddress: action.walletAddress,
            signChallenge: action.signChallenge
          });
        case "connectWallet":
          return this.loginWithWallet(action.wallet);
        case "bootstrap":
          return this.bootstrap();
        case "home":
          return this.home();
        case "claimSnapshot":
          return this.claimSnapshot();
        case "economy":
          return this.economy();
        case "ledger":
          return this.ledger();
        case "get_personality":
          return this.personality(action.petId);
        case "set_strategy":
          return this.setStrategy(action.petId, action.strategy);
        case "set_autonomy":
          return this.setAutonomy(action.petId, action.autonomyLevel);
        case "get_recommendations":
          return this.recommendations(action.petId);
        case "command":
          return this.command(action.petId, action.commandType);
        case "budget":
          return this.budget(action.petId, action.budget);
        case "tip":
          return this.tip(action.fromPetId, action.targetWalletAddress, action.toPetId, action.amount);
        case "createBounty":
          return this.createBounty(action.payload);
        case "claimBounty":
          return this.claimBounty(action.bountyId, action.claimerPetId);
        case "createDuel":
          return this.createDuel(action.payload);
        case "acceptDuel":
          return this.acceptDuel(action.duelId, action.targetPetId);
        case "resolveDuel":
          return this.resolveDuel(action.duelId, action.winnerPetId);
        case "createServiceOrder":
          return this.createServiceOrder(action.payload);
        case "acceptServiceOrder":
          return this.acceptServiceOrder(action.orderId, action.providerPetId);
        case "completeServiceOrder":
          return this.completeServiceOrder(action.orderId);
        case "claimSafetyNet":
          return this.claimSafetyNet();
        case "prepareClaimOnchain":
          return this.prepareClaimOnchain();
        case "confirmClaimOnchain":
          return this.confirmClaimOnchain(action.txHash);
        case "cancelClaimOnchain":
          return this.cancelClaimOnchain();
        case "uploadX":
          return this.uploadX(action.payload);
        case "uploadXWithRetry":
          return this.uploadXWithRetry(action.payload, action.options);
        case "prepareRegisterPlayerOnchain":
          return this.prepareRegisterPlayerOnchain();
        case "confirmRegisterPlayerOnchain":
          return this.confirmRegisterPlayerOnchain(action.txHash);
        case "confirmRegisterPlayerOnchainWithRetry":
          return this.confirmRegisterPlayerOnchainWithRetry(action.txHash, action.options);
        case "prepareCreatePetOnchain":
          return this.prepareCreatePetOnchain(action.petId);
        case "confirmCreatePetOnchain":
          return this.confirmCreatePetOnchain(action.petId, action.txHash);
        case "confirmCreatePetOnchainWithRetry":
          return this.confirmCreatePetOnchainWithRetry(action.petId, action.txHash, action.options);
        case "prepareSetPetBudgetOnchain":
          return this.prepareSetPetBudgetOnchain(action.petId);
        case "confirmSetPetBudgetOnchain":
          return this.confirmSetPetBudgetOnchain(action.petId, action.txHash);
        case "confirmSetPetBudgetOnchainWithRetry":
          return this.confirmSetPetBudgetOnchainWithRetry(action.petId, action.txHash, action.options);
        case "registerPlayerOnchainWithWallet":
          return this.registerPlayerOnchainWithWallet(action.wallet);
        case "createPetOnchainWithWallet":
          return this.createPetOnchainWithWallet(action.wallet, action.petId);
        case "setPetBudgetOnchainWithWallet":
          return this.setPetBudgetOnchainWithWallet(action.wallet, action.petId);
      }
    }
  };
}

// src/okx-wallet-common.ts
var OKX_XLAYER_TESTNET_CHAIN = {
  namespaceChainId: "eip155:1952",
  chainIdDecimal: 1952,
  chainIdHex: "0x7A0",
  chainName: "X Layer testnet",
  rpcUrl: "https://xlayertestrpc.okx.com/terigon",
  blockExplorerUrls: ["https://www.okx.com/web3/explorer/xlayer-test"],
  nativeCurrency: {
    name: "OKB",
    symbol: "OKB",
    decimals: 18
  }
};
var OKX_XLAYER_MAINNET_CHAIN = {
  namespaceChainId: "eip155:196",
  chainIdDecimal: 196,
  chainIdHex: "0xC4",
  chainName: "X Layer",
  rpcUrl: "https://rpc.xlayer.tech",
  blockExplorerUrls: ["https://www.okx.com/web3/explorer/xlayer"],
  nativeCurrency: {
    name: "OKB",
    symbol: "OKB",
    decimals: 18
  }
};
function toPersonalSignHex(message) {
  if (/^0x[0-9a-fA-F]*$/.test(message)) {
    return message;
  }
  return `0x${Buffer.from(message, "utf8").toString("hex")}`;
}

// src/okx-skill-bridge.ts
var DEFAULT_OKX_SKILL_ID = "okx-agentic-wallet";
var DEFAULT_ACTIONS = {
  ensureChain: null,
  getAddress: "wallet.addresses",
  signMessage: null,
  sendTransaction: "wallet.contract-call"
};
function extractString(source, keys) {
  if (!source) {
    return null;
  }
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value.length > 0) {
      return value;
    }
  }
  return null;
}
function walkForAddress(node, preferredChainIndexes) {
  if (!node) {
    return null;
  }
  if (typeof node === "string") {
    return /^0x[a-fA-F0-9]{40}$/.test(node) ? node : null;
  }
  if (Array.isArray(node)) {
    const sorted = [...node].sort((left, right) => {
      const leftIndex = typeof left === "object" && left && "chainIndex" in left ? preferredChainIndexes.indexOf(Number(left.chainIndex)) : Number.MAX_SAFE_INTEGER;
      const rightIndex = typeof right === "object" && right && "chainIndex" in right ? preferredChainIndexes.indexOf(Number(right.chainIndex)) : Number.MAX_SAFE_INTEGER;
      return leftIndex - rightIndex;
    });
    for (const entry of sorted) {
      const found = walkForAddress(entry, preferredChainIndexes);
      if (found) {
        return found;
      }
    }
    return null;
  }
  if (typeof node === "object") {
    const record = node;
    const direct = extractString(record, ["address", "walletAddress", "evmAddress"]) ?? extractString(record, ["xlayerAddress", "xLayerAddress"]);
    if (direct && /^0x[a-fA-F0-9]{40}$/.test(direct)) {
      return direct;
    }
    for (const value of Object.values(record)) {
      const found = walkForAddress(value, preferredChainIndexes);
      if (found) {
        return found;
      }
    }
  }
  return null;
}
function normalizeAddressResult(result, chain) {
  const preferredChainIndexes = [chain.chainIdDecimal, 196, 1952, 1];
  const address = walkForAddress(result, preferredChainIndexes);
  if (!address) {
    throw new Error("OKX skill bridge did not return an address.");
  }
  return address;
}
function extractNonceForUnsafeChallenge(message) {
  const prefix = "Sign this wallet challenge: ";
  if (message.startsWith(prefix)) {
    const nonce = message.slice(prefix.length).trim();
    return nonce.length > 0 ? nonce : null;
  }
  return null;
}
function formatUnitsFromHex(valueHex, decimals) {
  if (!/^0x[0-9a-fA-F]+$/.test(valueHex)) {
    return valueHex;
  }
  const value = BigInt(valueHex);
  if (value === 0n) {
    return "0";
  }
  const base = 10n ** BigInt(decimals);
  const whole = value / base;
  const fraction = value % base;
  if (fraction === 0n) {
    return whole.toString();
  }
  const padded = fraction.toString().padStart(decimals, "0").replace(/0+$/, "");
  return `${whole.toString()}.${padded}`;
}
function buildChainPayload(chain) {
  return {
    chain: chain.chainIdDecimal,
    chainId: chain.chainIdDecimal,
    chainIdHex: chain.chainIdHex,
    chainName: chain.chainName,
    chainNamespaceId: chain.namespaceChainId,
    rpcUrl: chain.rpcUrl,
    blockExplorerUrls: [...chain.blockExplorerUrls],
    nativeCurrency: chain.nativeCurrency
  };
}
function buildContractCallPayload(chain, tx) {
  return {
    ...buildChainPayload(chain),
    to: tx.to,
    inputData: tx.data,
    value: formatUnitsFromHex(tx.value, chain.nativeCurrency.decimals),
    tx
  };
}
function createOkxSkillWalletHost({
  invoker,
  skillId = DEFAULT_OKX_SKILL_ID,
  chain = OKX_XLAYER_TESTNET_CHAIN,
  actions,
  signMessageFallbackMode = "unsafe_challenge"
}) {
  const actionMap = {
    ...DEFAULT_ACTIONS,
    ...actions
  };
  async function ensureChainReady() {
    if (!actionMap.ensureChain) {
      return;
    }
    await invoker.invoke(skillId, actionMap.ensureChain, buildChainPayload(chain));
  }
  async function getAddress() {
    await ensureChainReady();
    const result = await invoker.invoke(
      skillId,
      actionMap.getAddress,
      buildChainPayload(chain)
    );
    return normalizeAddressResult(result, chain);
  }
  async function signMessage(message) {
    await ensureChainReady();
    if (actionMap.signMessage) {
      const result = await invoker.invoke(skillId, actionMap.signMessage, {
        ...buildChainPayload(chain),
        message
      });
      const signature = typeof result === "string" && result || extractString(result, ["signature", "result"]);
      if (signature) {
        return signature;
      }
      throw new Error("OKX skill bridge did not return a signature.");
    }
    if (signMessageFallbackMode === "unsafe_challenge") {
      const nonce = extractNonceForUnsafeChallenge(message);
      if (nonce) {
        return `signed:${nonce}`;
      }
    }
    throw new Error(
      "okx-agentic-wallet does not expose generic message signing through the current bridge."
    );
  }
  async function sendTransaction(tx) {
    await ensureChainReady();
    const result = await invoker.invoke(skillId, actionMap.sendTransaction, buildContractCallPayload(chain, tx));
    const txHash = typeof result === "string" && result || extractString(result, ["txHash", "hash", "result"]);
    if (!txHash) {
      throw new Error("OKX skill bridge did not return a transaction hash.");
    }
    return txHash;
  }
  return {
    ensureChainReady,
    getCurrentChain() {
      return chain;
    },
    getSkillId() {
      return skillId;
    },
    getActions() {
      return actionMap;
    },
    getSignMessageFallbackMode() {
      return signMessageFallbackMode;
    },
    getAddress,
    signMessage,
    sendTransaction
  };
}

// src/openclaw-host-bridge.ts
function resolveInvokeSkill(host) {
  if (typeof host === "function") {
    return host;
  }
  return host.invokeSkill.bind(host);
}
function createOpenClawHostSkillInvoker(host) {
  const invokeSkill = resolveInvokeSkill(host);
  return {
    invoke(skill, action, payload) {
      return invokeSkill({
        skill,
        operation: action,
        payload
      });
    }
  };
}
function createOkxOpenClawWalletHost({
  host,
  ...rest
}) {
  return createOkxSkillWalletHost({
    ...rest,
    invoker: createOpenClawHostSkillInvoker(host)
  });
}

// src/openclaw-host-smoke-config.ts
function requireEnv(env, key) {
  const value = env[key]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable ${key}.`);
  }
  return value;
}
function readNumber(env, key, fallback) {
  const raw = env[key]?.trim();
  if (!raw) {
    return fallback;
  }
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`Invalid numeric environment variable ${key}.`);
  }
  return parsed;
}
function loadOpenClawHostSmokeConfig(env = process.env) {
  return {
    baseUrl: requireEnv(env, "AGENT_GAME_BASE_URL"),
    invokeSkillModule: env.OPENCLAW_INVOKE_SKILL_MODULE?.trim() || null,
    petId: env.AGENT_GAME_PET_ID?.trim() || "starter-pet",
    spendableBudget: readNumber(env, "AGENT_GAME_SPENDABLE_BUDGET", 250),
    singleTxLimit: readNumber(env, "AGENT_GAME_SINGLE_TX_LIMIT", 75),
    dailyLimit: readNumber(env, "AGENT_GAME_DAILY_LIMIT", 300)
  };
}

// src/openclaw-host-smoke.ts
import { pathToFileURL } from "node:url";
import path2 from "node:path";
function isSupportedHostExport(value) {
  if (typeof value === "function") {
    return true;
  }
  return Boolean(
    value && typeof value === "object" && "invokeSkill" in value && typeof value.invokeSkill === "function"
  );
}
async function loadOpenClawHostInvokerFromModule(modulePath) {
  const resolvedPath = path2.isAbsolute(modulePath) ? modulePath : path2.resolve(process.cwd(), modulePath);
  const moduleUrl = pathToFileURL(resolvedPath).href;
  const mod = await import(moduleUrl);
  const context = {
    cwd: process.cwd(),
    env: process.env,
    modulePath: resolvedPath
  };
  if (isSupportedHostExport(mod.invokeSkill)) {
    return mod.invokeSkill;
  }
  if (isSupportedHostExport(mod.default)) {
    return mod.default;
  }
  if (isSupportedHostExport(mod.host)) {
    return mod.host;
  }
  if (typeof mod.createInvokeSkill === "function") {
    const createdInvoker = await mod.createInvokeSkill(context);
    if (isSupportedHostExport(createdInvoker)) {
      return createdInvoker;
    }
  }
  if (typeof mod.createHost === "function") {
    const createdHost = await mod.createHost(context);
    if (isSupportedHostExport(createdHost)) {
      return createdHost;
    }
  }
  throw new Error(
    "OpenClaw host module must export invokeSkill, default, host, createInvokeSkill(), or createHost()."
  );
}
async function runOpenClawHostSmoke({
  baseUrl,
  host,
  petId,
  spendableBudget,
  singleTxLimit,
  dailyLimit
}) {
  const walletHost = createOkxOpenClawWalletHost({ host });
  const skill = createOpenClawSkill({ baseUrl });
  const session = await skill.loginWithWallet(walletHost);
  const player = await skill.bootstrap();
  const syncedPlayer = await skill.registerPlayerOnchainWithWallet(walletHost);
  const syncedPet = await skill.createPetOnchainWithWallet(walletHost, petId);
  await skill.budget(petId, {
    spendableBudget,
    singleTxLimit,
    dailyLimit
  });
  const syncedBudget = await skill.setPetBudgetOnchainWithWallet(walletHost, petId);
  const home = await skill.home();
  return {
    session,
    player,
    syncedPlayer,
    syncedPet,
    syncedBudget,
    home
  };
}

// src/okx-host.ts
function createOkxUniversalWalletHost({
  provider,
  chain = OKX_XLAYER_TESTNET_CHAIN,
  redirect
}) {
  async function ensureConnected() {
    if (provider.connected()) {
      return;
    }
    await provider.connect({
      namespaces: {
        eip155: {
          chains: [chain.namespaceChainId],
          defaultChain: String(chain.chainIdDecimal),
          rpcMap: {
            [String(chain.chainIdDecimal)]: chain.rpcUrl
          }
        }
      },
      sessionConfig: redirect ? { redirect } : void 0
    });
  }
  async function ensureChainReady() {
    await ensureConnected();
    try {
      await provider.request(
        {
          method: "wallet_switchEthereumChain",
          params: [{ chainId: chain.chainIdHex }]
        },
        chain.namespaceChainId
      );
    } catch {
      await provider.request(
        {
          method: "wallet_addEthereumChain",
          params: [
            {
              blockExplorerUrls: [...chain.blockExplorerUrls],
              chainId: chain.chainIdHex,
              chainName: chain.chainName,
              nativeCurrency: chain.nativeCurrency,
              rpcUrls: [chain.rpcUrl]
            }
          ]
        },
        chain.namespaceChainId
      );
    }
  }
  async function getAddress() {
    await ensureChainReady();
    const accounts = await provider.request(
      { method: "eth_requestAccounts" },
      chain.namespaceChainId
    );
    if (!Array.isArray(accounts) || accounts.length === 0 || typeof accounts[0] !== "string") {
      throw new Error("OKX wallet did not return an EVM account.");
    }
    return accounts[0];
  }
  async function signMessage(message) {
    const address = await getAddress();
    const signature = await provider.request(
      {
        method: "personal_sign",
        params: [toPersonalSignHex(message), address]
      },
      chain.namespaceChainId
    );
    if (typeof signature !== "string") {
      throw new Error("OKX wallet did not return a signature.");
    }
    return signature;
  }
  async function sendTransaction(tx) {
    const address = await getAddress();
    const txHash = await provider.request(
      {
        method: "eth_sendTransaction",
        params: [
          {
            from: address,
            to: tx.to,
            data: tx.data,
            value: tx.value
          }
        ]
      },
      tx.chainNamespaceId
    );
    if (typeof txHash !== "string") {
      throw new Error("OKX wallet did not return a transaction hash.");
    }
    return txHash;
  }
  return {
    ensureConnected,
    ensureChainReady,
    getCurrentChain() {
      return chain;
    },
    getAddress,
    signMessage,
    sendTransaction
  };
}

// src/onchainos-cli-host.ts
import { execFile } from "node:child_process";
import { promisify } from "node:util";
var execFileAsync = promisify(execFile);
var DEFAULT_COMMAND = "onchainos";
function defaultRunner(command) {
  return async (args) => {
    const result = await execFileAsync(command, [...args], {
      windowsHide: true
    });
    return {
      stdout: result.stdout,
      stderr: result.stderr
    };
  };
}
function parseJson(stdout) {
  const text = stdout.trim();
  if (!text) {
    return null;
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`onchainos output was not valid JSON: ${text}`);
  }
}
function normalizeResult(payload) {
  if (payload && typeof payload === "object" && "data" in payload) {
    return payload.data;
  }
  return payload;
}
function readChainOverride(rawChainId, options) {
  const chainId = String(rawChainId);
  if (options.chainOverrides && chainId in options.chainOverrides) {
    return options.chainOverrides[chainId] ?? null;
  }
  if (chainId === "1952") {
    return options.chainOverrideTestnet ?? null;
  }
  return null;
}
function mapChain(rawChainId, operation, options) {
  const override = readChainOverride(rawChainId, options);
  if (override) {
    return override;
  }
  if (String(rawChainId) === "1952" && operation === "wallet.addresses") {
    return "196";
  }
  return String(rawChainId);
}
function buildUnsafeSignature(message) {
  const prefix = "Sign this wallet challenge: ";
  if (!message.startsWith(prefix)) {
    throw new Error("Unsafe sign fallback only supports challenge messages.");
  }
  const nonce = message.slice(prefix.length).trim();
  if (!nonce) {
    throw new Error("Challenge nonce is empty.");
  }
  return `signed:${nonce}`;
}
async function runJsonCommand(runner, args) {
  const result = await runner(args);
  const parsed = parseJson(result.stdout);
  if (parsed && typeof parsed === "object" && "ok" in parsed && parsed.ok === false) {
    const payload = parsed;
    const message = typeof payload.error === "string" ? payload.error : result.stderr.trim() || result.stdout.trim() || "Unknown onchainos failure.";
    throw new Error(message);
  }
  return normalizeResult(parsed);
}
function createOnchainosCliHost(options = {}) {
  const runner = options.runner ?? defaultRunner(options.command ?? DEFAULT_COMMAND);
  return async function invokeSkill(input) {
    if (input.skill !== "okx-agentic-wallet") {
      throw new Error(`Unsupported skill: ${input.skill}`);
    }
    const payload = input.payload ?? {};
    switch (input.operation) {
      case "wallet.addresses": {
        const rawChain = typeof payload.chain === "number" || typeof payload.chain === "string" ? payload.chain : typeof payload.chainId === "number" || typeof payload.chainId === "string" ? payload.chainId : 196;
        const chain = mapChain(rawChain, input.operation, options);
        return await runJsonCommand(runner, ["wallet", "addresses", "--chain", chain]);
      }
      case "wallet.contract-call": {
        const rawChain = typeof payload.chain === "number" || typeof payload.chain === "string" ? payload.chain : typeof payload.chainId === "number" || typeof payload.chainId === "string" ? payload.chainId : null;
        if (rawChain === null) {
          throw new Error("wallet.contract-call requires chain.");
        }
        const chain = mapChain(rawChain, input.operation, options);
        if (chain === "1952") {
          throw new Error(
            "The installed okx-agentic-wallet runtime does not support X Layer testnet contract calls. Keep MVP gameplay on testnet via backend/local smokes and use this host for real wallet runtime validation."
          );
        }
        const to = typeof payload.to === "string" ? payload.to : "";
        const inputData = typeof payload.inputData === "string" ? payload.inputData : "";
        const value = typeof payload.value === "string" ? payload.value : "0";
        if (!to || !inputData) {
          throw new Error("wallet.contract-call requires to and inputData.");
        }
        return await runJsonCommand(runner, [
          "wallet",
          "contract-call",
          "--to",
          to,
          "--chain",
          chain,
          "--value",
          value,
          "--input-data",
          inputData,
          "--force"
        ]);
      }
      case "wallet.sign-message": {
        if (!options.allowUnsafeSign) {
          throw new Error(
            "wallet.sign-message is not exposed by okx-agentic-wallet. Enable allowUnsafeSign only for local MVP auth fallback."
          );
        }
        const message = typeof payload.message === "string" ? payload.message : "";
        return {
          signature: buildUnsafeSignature(message)
        };
      }
      case "wallet.status":
        return await runJsonCommand(runner, ["wallet", "status"]);
      default:
        throw new Error(`Unsupported okx-agentic-wallet operation: ${input.operation}`);
    }
  };
}
export {
  OKX_XLAYER_MAINNET_CHAIN,
  OKX_XLAYER_TESTNET_CHAIN,
  OPENCLAW_COMMAND_PRESETS,
  OPENCLAW_STRATEGY_PRESETS,
  createOkxOpenClawWalletHost,
  createOkxSkillWalletHost,
  createOkxUniversalWalletHost,
  createOnchainosCliHost,
  createOpenClawHostSkillInvoker,
  createOpenClawSkill,
  listOpenClawCommandPhrases,
  listOpenClawStrategyPhrases,
  loadOpenClawHostInvokerFromModule,
  loadOpenClawHostSmokeConfig,
  normalizeOpenClawCommand,
  normalizeOpenClawStrategy,
  runOpenClawHostSmoke,
  toPersonalSignHex
};
