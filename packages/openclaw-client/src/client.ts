export type HomeSnapshot = Readonly<{
  player: {
    walletAddress: string;
    budget: number;
    profitPool: number;
    [key: string]: unknown;
  };
  claimableBalance?: number | null;
  claim?: ClaimSnapshot | null;
  guidedActions?: readonly GuidedActionSnapshot[] | null;
  opportunityBoard?: OpportunityBoardSnapshot | null;
  plaza?: PlazaSnapshot | null;
  onboarding?: OnboardingSnapshot | null;
  events: readonly unknown[];
  feed: readonly unknown[];
  messageCenter: Readonly<{
    totalItems: number;
    latestItemId: string | null;
    latestCreatedAt: string | null;
  }>;
  xAdapter: Readonly<{
    mode: string;
    enabled: boolean;
    canUpload: boolean;
    reason: string;
  }>;
  xActions: readonly unknown[];
  economy?: EconomySummary | null;
  personality?: PetPersonalitySnapshot | null;
  strategySummary?: PetStrategySummary | null;
  autonomySummary?: PetAutonomySummary | null;
  recommendations?: readonly PetRecommendation[] | null;
  availableCommands: readonly string[];
}>;

export type PetStrategyMode = "earn" | "taunt" | "ally" | "revenge" | "stay_low";

export type RecentOutcome = Readonly<Record<string, unknown>>;

export type PetPersonalitySnapshot = Readonly<{
  petId: string;
  personaProfile: Readonly<Record<string, unknown>>;
  loyalty: number;
  resentment: number;
  ambition: number;
  heat: number;
  strategyMode: PetStrategyMode;
  autonomyLevel: string;
  targetPreference: string | null;
  recentOutcomes: readonly RecentOutcome[];
  [key: string]: unknown;
}>;

export type PetStrategySummary = Readonly<{
  petId: string;
  strategyMode: PetStrategyMode;
  label: string;
  summary: string;
  [key: string]: unknown;
}>;

export type PetAutonomySummary = Readonly<{
  petId: string;
  autonomyLevel: string;
  label: string;
  summary: string;
  [key: string]: unknown;
}>;

export type PetRecommendation = Readonly<{
  id: string;
  title: string;
  detail: string;
  strategyMode?: PetStrategyMode | null;
  commandType?: PetStrategyMode | null;
  [key: string]: unknown;
}>;

export type GuidedActionSnapshot = Readonly<Record<string, unknown>>;

export type OpportunityBoardSnapshot = Readonly<Record<string, unknown>>;

export type PlazaSnapshot = Readonly<Record<string, unknown>>;

export type OnboardingSnapshot = Readonly<Record<string, unknown>>;

export type ClaimSnapshot = Readonly<{
  walletAddress: string;
  claimableBalance: number;
  status: string;
  claimId: string | null;
  txHash: string | null;
  claimableAt: string | null;
  confirmedAt: string | null;
  canceledAt: string | null;
  claimableCurrencyCode?: string | null;
  claimableCurrencyName?: string | null;
  [key: string]: unknown;
}>;

export type PlayerSnapshot = Readonly<{
  walletAddress: string;
  budget: number;
  profitPool: number;
  xBinding: boolean;
  pets: readonly PetSnapshot[];
  chainSync: {
    syncStatus: string;
    onchainId: string;
    lastSyncedAt: string | null;
  };
  createdAt: string;
  updatedAt: string;
}>;

export type PetSnapshot = Readonly<{
  id: string;
  name: string;
  species: string;
  level: number;
  starter: true;
  budget: PetBudget;
  chainSync: {
    syncStatus: string;
    onchainId: string;
    lastSyncedAt: string | null;
  };
}>;

export type CommandResult = Readonly<{
  player: PlayerSnapshot;
  pet: PetSnapshot;
  event: {
    type: string;
    [key: string]: unknown;
  };
}>;

export type XActionRecord = Readonly<{
  id: string;
  petId: string;
  xAccountId: string;
  actionType: XActionType;
  tweetId: string;
  replyToTweetId: string | null;
  content: string | null;
  localProof: string | null;
  status: "submitted" | "confirmed" | "failed";
  submittedAt: string;
  resolvedAt: string | null;
  failureReason: string | null;
  verificationNotes: string | null;
}>;

export type XActionResult = Readonly<{
  action: XActionRecord;
  event: {
    type: string;
    [key: string]: unknown;
  };
}>;

export type AuthChallenge = Readonly<{
  walletAddress: string;
  nonce: string;
  challenge: string;
}>;

export type AuthSession = Readonly<{
  walletAddress: string;
  token: string;
  authenticated: true;
}>;

export type PetBudget = Readonly<{
  spendableBudget: number;
  singleTxLimit: number;
  dailyLimit: number;
}>;

export type EconomySummary = Readonly<{
  currencyCode: "CANS";
  currencyName: string;
  treasuryBalance: number;
  profitPool: number;
  platformTreasury: number;
  openBounties: number;
  openDuels: number;
  openServiceOrders: number;
  ledgerEntries: number;
  claimableBalance?: number | null;
  claim?: ClaimSnapshot | null;
}>;

export type LedgerEntry = Readonly<{
  id: string;
  walletAddress: string;
  direction: "in" | "out";
  amount: number;
  sourceType: string;
  sourceId: string;
  description: string;
  createdAt: string;
  treasuryBalanceAfter: number;
  profitPoolAfter: number;
  counterpartyWallet: string | null;
  counterpartyPetId: string | null;
}>;

export type TipResult = Readonly<{
  tip: {
    id: string;
    grossAmount: number;
    netAmount: number;
    feeAmount: number;
  };
  sender: PlayerSnapshot;
  recipient: PlayerSnapshot;
}>;

export type BountyResult = Readonly<{
  bounty: {
    id: string;
    status: string;
    title: string;
    grossAmount: number;
    netAmount: number;
    targetWalletAddress: string;
    targetPetId: string;
  };
  player?: PlayerSnapshot;
  claimer?: PlayerSnapshot;
}>;

export type DuelResult = Readonly<{
  duel: {
    id: string;
    status: string;
    stakeAmount: number;
    challengerWalletAddress: string;
    targetWalletAddress: string;
    challengerPetId: string;
    targetPetId: string;
    winnerPetId: string | null;
  };
  player?: PlayerSnapshot;
  winner?: PlayerSnapshot;
}>;

export type ServiceOrderResult = Readonly<{
  order: {
    id: string;
    status: string;
    serviceType: string;
    title: string;
    grossAmount: number;
    netAmount: number;
    clientWalletAddress: string;
    providerWalletAddress: string | null;
    providerPetId: string | null;
  };
  player?: PlayerSnapshot;
  provider?: PlayerSnapshot;
}>;

export type XActionType = "post" | "reply" | "like";

export type OnchainTxIntent = Readonly<{
  chainId: number;
  chainNamespaceId: string;
  to: string;
  data: string;
  value: string;
}>;

export type UploadXActionPayload = Readonly<{
  petId: string;
  xAccountId: string;
  actionType: XActionType;
  tweetId: string;
  replyToTweetId?: string | null;
  content?: string | null;
  localProof?: string | null;
}>;

export type OpenClawClientDeps = Readonly<{
  baseUrl: string;
  token: string;
  fetch?: typeof fetch;
}>;

export type RetryOptions = Readonly<{
  maxAttempts?: number;
  delayMs?: number;
}>;

export type OpenClawErrorKind = "auth" | "onchain" | "x-upload" | "api" | "network";

export type OpenClawOnchainPhase = "intent" | "confirm";

function isRetryableStatus(statusCode: number): boolean {
  return statusCode === 409 || statusCode === 408 || statusCode === 425 || statusCode === 429 || statusCode >= 500;
}

function extractErrorMessage(payload: unknown, fallback: string): string {
  if (payload && typeof payload === "object") {
    const candidate = payload as Record<string, unknown>;
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

export class OpenClawApiError extends Error {
  readonly kind: OpenClawErrorKind;
  readonly operation: string;
  readonly endpoint: string;
  readonly statusCode: number | null;
  readonly retryable: boolean;
  readonly responseBody: unknown;

  constructor(
    kind: OpenClawErrorKind,
    message: string,
    details: Readonly<{
      operation: string;
      endpoint: string;
      statusCode?: number | null;
      retryable?: boolean;
      responseBody?: unknown;
    }>,
  ) {
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
}

export class OpenClawAuthError extends OpenClawApiError {
  constructor(
    message: string,
    details: ConstructorParameters<typeof OpenClawApiError>[2],
  ) {
    super("auth", message, details);
    this.name = "OpenClawAuthError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class OpenClawOnchainError extends OpenClawApiError {
  readonly phase: OpenClawOnchainPhase;
  readonly action: string;

  constructor(
    message: string,
    details: ConstructorParameters<typeof OpenClawApiError>[2] & Readonly<{
      phase: OpenClawOnchainPhase;
      action: string;
    }>,
  ) {
    super("onchain", message, details);
    this.name = "OpenClawOnchainError";
    this.phase = details.phase;
    this.action = details.action;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class OpenClawXUploadError extends OpenClawApiError {
  constructor(
    message: string,
    details: ConstructorParameters<typeof OpenClawApiError>[2],
  ) {
    super("x-upload", message, details);
    this.name = "OpenClawXUploadError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class OpenClawNetworkError extends OpenClawApiError {
  constructor(message: string, details: ConstructorParameters<typeof OpenClawApiError>[2]) {
    super("network", message, details);
    this.name = "OpenClawNetworkError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

type RequestInitLike = Readonly<{
  method: string;
  headers: Record<string, string>;
  body?: string;
}>;

type RequestKind = "auth" | "onchain" | "x-upload" | "api";

type RequestMetadata = Readonly<{
  operation: string;
  endpoint: string;
  kind: RequestKind;
  onchainPhase?: OpenClawOnchainPhase;
  onchainAction?: string;
}>;

type ParsedResponse = Readonly<{
  body: unknown;
  text: string;
}>;

function createHeaders(token: string): Record<string, string> {
  return {
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
  };
}

async function readJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

async function requestJson<T>(
  fetchImpl: typeof fetch,
  baseUrl: string,
  path: string,
  init: RequestInitLike,
  metadata: RequestMetadata,
): Promise<T> {
  let response: Response;

  try {
    response = await fetchImpl(`${baseUrl}${path}`, {
      method: init.method,
      headers: init.headers,
      body: init.body,
    });
  } catch (cause) {
    throw new OpenClawNetworkError(
      `Network error while calling ${metadata.operation}.`,
      {
        operation: metadata.operation,
        endpoint: metadata.endpoint,
        retryable: true,
      },
    );
  }

  let parsed: ParsedResponse | null = null;
  const rawText = await response.text();
  try {
    parsed = {
      text: rawText,
      body: rawText ? JSON.parse(rawText) : null,
    };
  } catch {
    parsed = {
      text: rawText,
      body: rawText,
    };
  }

  if (!response.ok) {
    const message = extractErrorMessage(parsed.body, `Request failed with status ${response.status}`);
    const details = {
      operation: metadata.operation,
      endpoint: metadata.endpoint,
      statusCode: response.status,
      retryable: isRetryableStatus(response.status),
      responseBody: parsed.body,
    } as const;

    if (metadata.kind === "auth") {
      throw new OpenClawAuthError(message, details);
    }

    if (metadata.kind === "onchain") {
      throw new OpenClawOnchainError(message, {
        ...details,
        phase: metadata.onchainPhase ?? "confirm",
        action: metadata.onchainAction ?? metadata.operation,
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
      retryable: false,
    });
  }

  return parsed.body as T;
}

async function retry<T>(operation: string, fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const maxAttempts = Math.max(1, Math.floor(options.maxAttempts ?? 3));
  const delayMs = Math.max(0, Math.floor(options.delayMs ?? 0));
  let lastError: unknown;

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

export function createOpenClawClient({ baseUrl, token, fetch: fetchImpl = fetch }: OpenClawClientDeps) {
  function call<T>(
    path: string,
    init: RequestInitLike,
    metadata: RequestMetadata,
  ): Promise<T> {
    return requestJson<T>(fetchImpl, baseUrl, path, init, metadata);
  }

  return {
    createChallenge(walletAddress: string) {
      return call<AuthChallenge>("/api/auth/challenge", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ walletAddress }),
      }, {
        operation: "createChallenge",
        endpoint: "/api/auth/challenge",
        kind: "auth",
      });
    },
    verifyChallenge(walletAddress: string, signature: string) {
      return call<AuthSession>("/api/auth/verify", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ walletAddress, signature }),
      }, {
        operation: "verifyChallenge",
        endpoint: "/api/auth/verify",
        kind: "auth",
      });
    },
    bootstrapPlayer() {
      return call<PlayerSnapshot>("/api/players/bootstrap", {
        method: "POST",
        headers: createHeaders(token),
      }, {
        operation: "bootstrapPlayer",
        endpoint: "/api/players/bootstrap",
        kind: "api",
      });
    },
    getHome() {
      return call<HomeSnapshot>("/api/me/home", {
        method: "GET",
        headers: createHeaders(token),
      }, {
        operation: "getHome",
        endpoint: "/api/me/home",
        kind: "api",
      });
    },
    getFeed() {
      return call<readonly unknown[]>("/api/me/feed", {
        method: "GET",
        headers: createHeaders(token),
      }, {
        operation: "getFeed",
        endpoint: "/api/me/feed",
        kind: "api",
      });
    },
    getMessageCenter() {
      return call<HomeSnapshot["messageCenter"]>("/api/me/messages", {
        method: "GET",
        headers: createHeaders(token),
      }, {
        operation: "getMessageCenter",
        endpoint: "/api/me/messages",
        kind: "api",
      });
    },
    getXAdapterStatus() {
      return call<HomeSnapshot["xAdapter"]>("/api/x/status", {
        method: "GET",
        headers: createHeaders(token),
      }, {
        operation: "getXAdapterStatus",
        endpoint: "/api/x/status",
        kind: "api",
      });
    },
    getPetPersonality(petId: string) {
      const endpoint = `/api/pets/${encodeURIComponent(petId)}/personality`;
      return call<PetPersonalitySnapshot>(endpoint, {
        method: "GET",
        headers: createHeaders(token),
      }, {
        operation: "getPetPersonality",
        endpoint,
        kind: "api",
      });
    },
    setPetStrategy(petId: string, strategyMode: PetStrategyMode) {
      const endpoint = `/api/pets/${encodeURIComponent(petId)}/strategy`;
      return call<PetStrategySummary>(endpoint, {
        method: "PATCH",
        headers: {
          ...createHeaders(token),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ strategyMode }),
      }, {
        operation: "setPetStrategy",
        endpoint,
        kind: "api",
      });
    },
    setPetAutonomy(petId: string, autonomyLevel: string) {
      const endpoint = `/api/pets/${encodeURIComponent(petId)}/autonomy`;
      return call<PetAutonomySummary>(endpoint, {
        method: "PATCH",
        headers: {
          ...createHeaders(token),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ autonomyLevel }),
      }, {
        operation: "setPetAutonomy",
        endpoint,
        kind: "api",
      });
    },
    getPetRecommendations(petId: string) {
      const endpoint = `/api/pets/${encodeURIComponent(petId)}/recommendations`;
      return call<readonly PetRecommendation[]>(endpoint, {
        method: "GET",
        headers: createHeaders(token),
      }, {
        operation: "getPetRecommendations",
        endpoint,
        kind: "api",
      });
    },
    getClaimSnapshot() {
      return call<ClaimSnapshot>("/api/me/claim", {
        method: "GET",
        headers: createHeaders(token),
      }, {
        operation: "getClaimSnapshot",
        endpoint: "/api/me/claim",
        kind: "api",
      });
    },
    getEconomy() {
      return call<EconomySummary>("/api/me/economy", {
        method: "GET",
        headers: createHeaders(token),
      }, {
        operation: "getEconomy",
        endpoint: "/api/me/economy",
        kind: "api",
      });
    },
    getLedger() {
      return call<readonly LedgerEntry[]>("/api/me/economy/ledger", {
        method: "GET",
        headers: createHeaders(token),
      }, {
        operation: "getLedger",
        endpoint: "/api/me/economy/ledger",
        kind: "api",
      });
    },
    listBounties() {
      return call<readonly BountyResult["bounty"][]>("/api/economy/bounties", {
        method: "GET",
        headers: createHeaders(token),
      }, {
        operation: "listBounties",
        endpoint: "/api/economy/bounties",
        kind: "api",
      });
    },
    listDuels() {
      return call<readonly DuelResult["duel"][]>("/api/economy/duels", {
        method: "GET",
        headers: createHeaders(token),
      }, {
        operation: "listDuels",
        endpoint: "/api/economy/duels",
        kind: "api",
      });
    },
    listServiceOrders() {
      return call<readonly ServiceOrderResult["order"][]>("/api/economy/service-orders", {
        method: "GET",
        headers: createHeaders(token),
      }, {
        operation: "listServiceOrders",
        endpoint: "/api/economy/service-orders",
        kind: "api",
      });
    },
    issuePetCommand(petId: string, commandType: string) {
      return call<CommandResult>(`/api/pets/${encodeURIComponent(petId)}/commands`, {
        method: "POST",
        headers: {
          ...createHeaders(token),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ commandType }),
      }, {
        operation: "issuePetCommand",
        endpoint: `/api/pets/${encodeURIComponent(petId)}/commands`,
        kind: "api",
      });
    },
    updatePetBudget(petId: string, budget: PetBudget) {
      return call<PetSnapshot>(`/api/pets/${encodeURIComponent(petId)}/budget`, {
        method: "PATCH",
        headers: {
          ...createHeaders(token),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(budget),
      }, {
        operation: "updatePetBudget",
        endpoint: `/api/pets/${encodeURIComponent(petId)}/budget`,
        kind: "api",
      });
    },
    createTip(fromPetId: string, targetWalletAddress: string, toPetId: string, amount: number) {
      return call<TipResult>("/api/economy/tips", {
        method: "POST",
        headers: {
          ...createHeaders(token),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ fromPetId, targetWalletAddress, toPetId, amount }),
      }, {
        operation: "createTip",
        endpoint: "/api/economy/tips",
        kind: "api",
      });
    },
    createBounty(payload: Readonly<{
      creatorPetId: string;
      targetWalletAddress: string;
      targetPetId: string;
      title: string;
      detail: string;
      amount: number;
    }>) {
      return call<BountyResult>("/api/economy/bounties", {
        method: "POST",
        headers: {
          ...createHeaders(token),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }, {
        operation: "createBounty",
        endpoint: "/api/economy/bounties",
        kind: "api",
      });
    },
    claimBounty(bountyId: string, claimerPetId: string) {
      return call<BountyResult>(`/api/economy/bounties/${encodeURIComponent(bountyId)}/claim`, {
        method: "POST",
        headers: {
          ...createHeaders(token),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ claimerPetId }),
      }, {
        operation: "claimBounty",
        endpoint: `/api/economy/bounties/${encodeURIComponent(bountyId)}/claim`,
        kind: "api",
      });
    },
    createDuel(payload: Readonly<{
      challengerPetId: string;
      targetWalletAddress: string;
      targetPetId: string;
      stakeAmount: number;
    }>) {
      return call<DuelResult>("/api/economy/duels", {
        method: "POST",
        headers: {
          ...createHeaders(token),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }, {
        operation: "createDuel",
        endpoint: "/api/economy/duels",
        kind: "api",
      });
    },
    acceptDuel(duelId: string, targetPetId: string) {
      return call<DuelResult>(`/api/economy/duels/${encodeURIComponent(duelId)}/accept`, {
        method: "POST",
        headers: {
          ...createHeaders(token),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ targetPetId }),
      }, {
        operation: "acceptDuel",
        endpoint: `/api/economy/duels/${encodeURIComponent(duelId)}/accept`,
        kind: "api",
      });
    },
    resolveDuel(duelId: string, winnerPetId: string) {
      return call<DuelResult>(`/api/economy/duels/${encodeURIComponent(duelId)}/resolve`, {
        method: "POST",
        headers: {
          ...createHeaders(token),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ winnerPetId }),
      }, {
        operation: "resolveDuel",
        endpoint: `/api/economy/duels/${encodeURIComponent(duelId)}/resolve`,
        kind: "api",
      });
    },
    createServiceOrder(payload: Readonly<{
      clientPetId: string;
      serviceType: string;
      title: string;
      detail: string;
      amount: number;
    }>) {
      return call<ServiceOrderResult>("/api/economy/service-orders", {
        method: "POST",
        headers: {
          ...createHeaders(token),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }, {
        operation: "createServiceOrder",
        endpoint: "/api/economy/service-orders",
        kind: "api",
      });
    },
    acceptServiceOrder(orderId: string, providerPetId: string) {
      return call<ServiceOrderResult>(
        `/api/economy/service-orders/${encodeURIComponent(orderId)}/accept`,
        {
          method: "POST",
          headers: {
            ...createHeaders(token),
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ providerPetId }),
        },
        {
          operation: "acceptServiceOrder",
          endpoint: `/api/economy/service-orders/${encodeURIComponent(orderId)}/accept`,
          kind: "api",
        },
      );
    },
    completeServiceOrder(orderId: string) {
      return call<ServiceOrderResult>(
        `/api/economy/service-orders/${encodeURIComponent(orderId)}/complete`,
        {
          method: "POST",
          headers: createHeaders(token),
        },
        {
          operation: "completeServiceOrder",
          endpoint: `/api/economy/service-orders/${encodeURIComponent(orderId)}/complete`,
          kind: "api",
        },
      );
    },
    claimSafetyNet() {
      return call<{
        player: PlayerSnapshot;
        event: { type: string; [key: string]: unknown };
      }>("/api/economy/safety-net/claim", {
        method: "POST",
        headers: createHeaders(token),
      }, {
        operation: "claimSafetyNet",
        endpoint: "/api/economy/safety-net/claim",
        kind: "api",
      });
    },
    prepareClaimOnchain() {
      return call<OnchainTxIntent>("/api/onchain/claim/intent", {
        method: "POST",
        headers: createHeaders(token),
      }, {
        operation: "prepareClaimOnchain",
        endpoint: "/api/onchain/claim/intent",
        kind: "onchain",
        onchainPhase: "intent",
        onchainAction: "claim",
      });
    },
    confirmClaimOnchain(txHash: string) {
      return call<ClaimSnapshot>("/api/onchain/claim/confirm", {
        method: "POST",
        headers: {
          ...createHeaders(token),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ txHash }),
      }, {
        operation: "confirmClaimOnchain",
        endpoint: "/api/onchain/claim/confirm",
        kind: "onchain",
        onchainAction: "claim",
      });
    },
    cancelClaimOnchain() {
      return call<ClaimSnapshot>("/api/onchain/claim/cancel", {
        method: "POST",
        headers: createHeaders(token),
      }, {
        operation: "cancelClaimOnchain",
        endpoint: "/api/onchain/claim/cancel",
        kind: "api",
      });
    },
    uploadXAction(payload: UploadXActionPayload) {
      return call<XActionResult>("/api/x/actions/upload", {
        method: "POST",
        headers: {
          ...createHeaders(token),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }, {
        operation: "uploadXAction",
        endpoint: "/api/x/actions/upload",
        kind: "x-upload",
      });
    },
    prepareRegisterPlayerOnchain() {
      return call<OnchainTxIntent>("/api/onchain/register-player/intent", {
        method: "POST",
        headers: createHeaders(token),
      }, {
        operation: "prepareRegisterPlayerOnchain",
        endpoint: "/api/onchain/register-player/intent",
        kind: "onchain",
        onchainPhase: "intent",
        onchainAction: "register-player",
      });
    },
    confirmRegisterPlayerOnchain(txHash: string) {
      return call<PlayerSnapshot>("/api/onchain/register-player/confirm", {
        method: "POST",
        headers: {
          ...createHeaders(token),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ txHash }),
      }, {
        operation: "confirmRegisterPlayerOnchain",
        endpoint: "/api/onchain/register-player/confirm",
        kind: "onchain",
        onchainPhase: "confirm",
        onchainAction: "register-player",
      });
    },
    prepareCreatePetOnchain(petId: string) {
      return call<OnchainTxIntent>("/api/onchain/create-pet/intent", {
        method: "POST",
        headers: {
          ...createHeaders(token),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ petId }),
      }, {
        operation: "prepareCreatePetOnchain",
        endpoint: "/api/onchain/create-pet/intent",
        kind: "onchain",
        onchainPhase: "intent",
        onchainAction: "create-pet",
      });
    },
    confirmCreatePetOnchain(petId: string, txHash: string) {
      return call<PetSnapshot>("/api/onchain/create-pet/confirm", {
        method: "POST",
        headers: {
          ...createHeaders(token),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ petId, txHash }),
      }, {
        operation: "confirmCreatePetOnchain",
        endpoint: "/api/onchain/create-pet/confirm",
        kind: "onchain",
        onchainPhase: "confirm",
        onchainAction: "create-pet",
      });
    },
    prepareSetPetBudgetOnchain(petId: string) {
      return call<OnchainTxIntent>("/api/onchain/set-budget/intent", {
        method: "POST",
        headers: {
          ...createHeaders(token),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ petId }),
      }, {
        operation: "prepareSetPetBudgetOnchain",
        endpoint: "/api/onchain/set-budget/intent",
        kind: "onchain",
        onchainPhase: "intent",
        onchainAction: "set-budget",
      });
    },
    confirmSetPetBudgetOnchain(petId: string, txHash: string) {
      return call<PetSnapshot>("/api/onchain/set-budget/confirm", {
        method: "POST",
        headers: {
          ...createHeaders(token),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ petId, txHash }),
      }, {
        operation: "confirmSetPetBudgetOnchain",
        endpoint: "/api/onchain/set-budget/confirm",
        kind: "onchain",
        onchainPhase: "confirm",
        onchainAction: "set-budget",
      });
    },
    confirmRegisterPlayerOnchainWithRetry(txHash: string, options?: RetryOptions) {
      return retry("confirmRegisterPlayerOnchainWithRetry", () => this.confirmRegisterPlayerOnchain(txHash), options);
    },
    confirmCreatePetOnchainWithRetry(petId: string, txHash: string, options?: RetryOptions) {
      return retry("confirmCreatePetOnchainWithRetry", () => this.confirmCreatePetOnchain(petId, txHash), options);
    },
    confirmSetPetBudgetOnchainWithRetry(petId: string, txHash: string, options?: RetryOptions) {
      return retry("confirmSetPetBudgetOnchainWithRetry", () => this.confirmSetPetBudgetOnchain(petId, txHash), options);
    },
    uploadXActionWithRetry(payload: UploadXActionPayload, options?: RetryOptions) {
      return retry("uploadXActionWithRetry", () => this.uploadXAction(payload), options);
    },
  };
}
