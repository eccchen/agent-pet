import { createHealthResponse } from "./health";
import type { PetBudget } from "./chain-sync";
import { GameStateError } from "./store";
import type {
  CommandType,
  InMemoryGameStore,
  Session,
  XActionType,
  StrategyMode,
  TargetPreference,
} from "./store";

export type RouteRequest = Readonly<{
  method?: string;
  path?: string;
  body?: unknown;
  headers?: Readonly<Record<string, string | undefined>>;
}>;

export type RouteResult = Readonly<{
  statusCode: number;
  headers: Readonly<Record<string, string>>;
  body: unknown;
}>;

type RouteContext = Readonly<{
  serviceName?: string;
  env?: string;
  uptimeSeconds?: number;
}>;

const defaultServiceName = "agent-game-server";
const defaultEnv = "development";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PATCH,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
} as const;

function json(statusCode: number, body: unknown): RouteResult {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders,
    },
    body,
  };
}

function errorJson(statusCode: number, message: string, code?: string): RouteResult {
  return json(statusCode, code ? { error: message, code } : { error: message });
}

function toRouteError(error: unknown): RouteResult {
  if (error instanceof GameStateError) {
    return errorJson(error.statusCode, error.message, error.name);
  }

  if (error instanceof Error) {
    return errorJson(500, error.message);
  }

  return errorJson(500, "internal server error");
}

function parsePath(path: string): string {
  try {
    return new URL(path, "http://localhost").pathname;
  } catch {
    return path;
  }
}

function readWalletAddress(body: unknown): string | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return null;
  }

  const walletAddress = (body as { walletAddress?: unknown }).walletAddress;
  if (typeof walletAddress !== "string" || !walletAddress.trim()) {
    return null;
  }

  return walletAddress.trim();
}

function readSignature(body: unknown): string | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return null;
  }

  const signature = (body as { signature?: unknown }).signature;
  if (typeof signature !== "string" || !signature.trim()) {
    return null;
  }

  return signature.trim();
}

function readBudget(body: unknown): PetBudget | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return null;
  }

  const candidate = body as Record<string, unknown>;
  const spendableBudget = Number(candidate.spendableBudget);
  const singleTxLimit = Number(candidate.singleTxLimit);
  const dailyLimit = Number(candidate.dailyLimit);

  if (
    !Number.isFinite(spendableBudget) ||
    !Number.isFinite(singleTxLimit) ||
    !Number.isFinite(dailyLimit)
  ) {
    return null;
  }

  return {
    spendableBudget,
    singleTxLimit,
    dailyLimit,
  };
}

function readAmount(body: unknown): number | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return null;
  }

  const amount = Number((body as { amount?: unknown }).amount);
  return Number.isFinite(amount) ? amount : null;
}

function readNumericField(body: unknown, key: string): number | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return null;
  }

  const value = Number((body as Record<string, unknown>)[key]);
  return Number.isFinite(value) ? value : null;
}

function readStrategyMode(body: unknown): StrategyMode | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return null;
  }

  const strategyMode = (body as { strategyMode?: unknown }).strategyMode;
  return strategyMode === "balanced" ||
    strategyMode === "growth" ||
    strategyMode === "pressure" ||
    strategyMode === "stealth" ||
    strategyMode === "opportunistic"
    ? strategyMode
    : null;
}

function readTargetPreference(body: unknown): TargetPreference | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return null;
  }

  const targetPreference = (body as { targetPreference?: unknown }).targetPreference;
  return targetPreference === "none" ||
    targetPreference === "profit" ||
    targetPreference === "social" ||
    targetPreference === "conflict" ||
    targetPreference === "service"
    ? targetPreference
    : null;
}

function readPetId(body: unknown): string | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return null;
  }

  const petId = (body as { petId?: unknown }).petId;
  if (typeof petId !== "string" || !petId.trim()) {
    return null;
  }

  return petId.trim();
}

function readStringField(body: unknown, key: string): string | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return null;
  }

  const value = (body as Record<string, unknown>)[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readTxHash(body: unknown): string | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return null;
  }

  const txHash = (body as { txHash?: unknown }).txHash;
  if (typeof txHash !== "string" || !txHash.trim()) {
    return null;
  }

  return txHash.trim();
}

function readCommandType(body: unknown): CommandType | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return null;
  }

  const commandType = (body as { commandType?: unknown }).commandType;
  if (
    commandType !== "earn" &&
    commandType !== "taunt" &&
    commandType !== "ally" &&
    commandType !== "revenge" &&
    commandType !== "stay_low"
  ) {
    return null;
  }

  return commandType;
}

function readXActionPayload(body: unknown): Readonly<{
  petId: string;
  xAccountId: string;
  actionType: XActionType;
  tweetId: string;
  replyToTweetId?: string | null;
  content?: string | null;
  localProof?: string | null;
}> | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return null;
  }

  const candidate = body as Record<string, unknown>;
  const petId = typeof candidate.petId === "string" ? candidate.petId.trim() : "";
  const xAccountId =
    typeof candidate.xAccountId === "string" ? candidate.xAccountId.trim() : "";
  const tweetId = typeof candidate.tweetId === "string" ? candidate.tweetId.trim() : "";
  const actionType = candidate.actionType;

  if (
    !petId ||
    !xAccountId ||
    !tweetId ||
    (actionType !== "post" && actionType !== "reply" && actionType !== "like")
  ) {
    return null;
  }

  return {
    petId,
    xAccountId,
    tweetId,
    actionType,
    replyToTweetId:
      typeof candidate.replyToTweetId === "string" ? candidate.replyToTweetId : null,
    content: typeof candidate.content === "string" ? candidate.content : null,
    localProof: typeof candidate.localProof === "string" ? candidate.localProof : null,
  };
}

function readOpenClawOperation(body: unknown): string | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return null;
  }

  const operation = (body as { operation?: unknown }).operation;
  return typeof operation === "string" && operation.trim() ? operation.trim() : null;
}

function readBearerToken(headers?: Readonly<Record<string, string | undefined>>): string | null {
  const authorization = headers?.authorization;
  if (!authorization) {
    return null;
  }

  const [scheme, token] = authorization.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token?.trim()) {
    return null;
  }

  return token.trim();
}

function requireSession(request: RouteRequest, store: InMemoryGameStore): Session | RouteResult {
  const token = readBearerToken(request.headers);
  if (!token) {
    return json(401, { error: "unauthorized" });
  }

  const session = store.getSession(token);
  if (!session) {
    return json(401, { error: "unauthorized" });
  }

  return session;
}

function routePetBudgetPath(pathname: string): string | null {
  const prefix = "/api/pets/";
  const suffix = "/budget";
  if (!pathname.startsWith(prefix) || !pathname.endsWith(suffix)) {
    return null;
  }

  const petId = pathname.slice(prefix.length, -suffix.length);
  return petId.length > 0 ? decodeURIComponent(petId) : null;
}

function routePetSuffixPath(pathname: string, suffix: string): string | null {
  const prefix = "/api/pets/";
  if (!pathname.startsWith(prefix) || !pathname.endsWith(suffix)) {
    return null;
  }

  const petId = pathname.slice(prefix.length, -suffix.length);
  return petId.length > 0 ? decodeURIComponent(petId) : null;
}

function routePetPath(pathname: string): string | null {
  const prefix = "/api/pets/";
  if (!pathname.startsWith(prefix)) {
    return null;
  }

  const remainder = pathname.slice(prefix.length);
  if (!remainder || remainder.includes("/")) {
    return null;
  }

  return decodeURIComponent(remainder);
}

function routePublicPlayerPath(pathname: string): string | null {
  const prefix = "/api/public/players/";
  if (!pathname.startsWith(prefix)) {
    return null;
  }

  const remainder = pathname.slice(prefix.length);
  if (!remainder || remainder.includes("/")) {
    return null;
  }

  return decodeURIComponent(remainder);
}

function routePublicPetPath(pathname: string): string | null {
  const prefix = "/api/public/pets/";
  if (!pathname.startsWith(prefix)) {
    return null;
  }

  const remainder = pathname.slice(prefix.length);
  if (!remainder || remainder.includes("/")) {
    return null;
  }

  return decodeURIComponent(remainder);
}

function routePetCommandPath(pathname: string): string | null {
  const prefix = "/api/pets/";
  const suffix = "/commands";
  if (!pathname.startsWith(prefix) || !pathname.endsWith(suffix)) {
    return null;
  }

  const petId = pathname.slice(prefix.length, -suffix.length);
  return petId.length > 0 ? decodeURIComponent(petId) : null;
}

function routeEconomyActionPath(pathname: string, prefix: string, suffix: string): string | null {
  if (!pathname.startsWith(prefix) || !pathname.endsWith(suffix)) {
    return null;
  }

  const id = pathname.slice(prefix.length, -suffix.length);
  return id.length > 0 ? decodeURIComponent(id) : null;
}

function buildClaimSnapshot(store: InMemoryGameStore, walletAddress: string) {
  const economy = store.getEconomySummary(walletAddress);
  if (!economy) {
    return null;
  }

  const claims = store.listClaims(walletAddress);
  const latestClaim = claims[0] ?? null;
  return {
    walletAddress,
    claimableBalance: economy.claimableBalance,
    status:
      latestClaim?.status ??
      (economy.claimableBalance > 0 ? "claimable" : "idle"),
    claimId: latestClaim?.id ?? null,
    txHash: latestClaim?.txHash ?? null,
    claimableAt: latestClaim?.createdAt ?? null,
    confirmedAt: latestClaim?.status === "confirmed" ? latestClaim.updatedAt : null,
    canceledAt: latestClaim?.status === "cancelled" ? latestClaim.updatedAt : null,
    claimableCurrencyCode: economy.currencyCode,
    claimableCurrencyName: economy.currencyName,
  };
}

function buildPetSnapshot(store: InMemoryGameStore, walletAddress: string, petId: string) {
  const personality = store.getPetPersonality(walletAddress, petId);
  if (!personality) {
    return null;
  }

  return {
    personality,
    strategy: {
      strategyMode: personality.strategyMode,
      autonomyLevel: personality.autonomyLevel,
      targetPreference: personality.targetPreference,
    },
    recommendations: store.getPetRecommendations(walletAddress, petId) ?? [],
  };
}

function buildHomeSnapshot(store: InMemoryGameStore, walletAddress: string) {
  const primaryPetId = store.listPets(walletAddress)[0]?.id ?? null;
  const petSnapshot = primaryPetId ? buildPetSnapshot(store, walletAddress, primaryPetId) : null;
  return {
    player: store.getPlayer(walletAddress),
    economy: store.getEconomySummary(walletAddress),
    claim: buildClaimSnapshot(store, walletAddress),
    personality: petSnapshot?.personality ?? null,
    strategy: petSnapshot?.strategy ?? null,
    recommendations: petSnapshot?.recommendations ?? [],
    events: store.listEvents(walletAddress),
    feed: store.listFeed(walletAddress),
    messageCenter: store.getMessageCenterSummary(walletAddress),
    xAdapter: store.getXAdapterStatus(),
    xActions: store.getXAdapterStatus().enabled ? store.listXActions(walletAddress) : [],
    availableCommands: ["earn", "taunt", "ally", "revenge", "stay_low"],
    commandPresets: store.listCommandPresets(),
    guidedActions: store.getGuidedActions(walletAddress),
    onboarding: store.getOnboardingSummary(walletAddress),
    opportunityBoard: store.getOpportunityBoard(walletAddress),
    plaza: store.getPlazaSummary(walletAddress),
  };
}

function buildMeSnapshot(store: InMemoryGameStore, walletAddress: string) {
  const player = store.getPlayer(walletAddress);
  if (!player) {
    return null;
  }

  const primaryPetId = player.pets[0]?.id ?? null;
  const petSnapshot = primaryPetId ? buildPetSnapshot(store, walletAddress, primaryPetId) : null;
  return {
    ...player,
    personality: petSnapshot?.personality ?? null,
    strategy: petSnapshot?.strategy ?? null,
    recommendations: petSnapshot?.recommendations ?? [],
  };
}

export async function resolveRoute(
  request: RouteRequest,
  store: InMemoryGameStore,
  context: RouteContext = {},
): Promise<RouteResult> {
  const method = (request.method ?? "GET").toUpperCase();
  const pathname = parsePath(request.path ?? "/");
  const serviceName = context.serviceName ?? defaultServiceName;
  const env = context.env ?? defaultEnv;
  const uptimeSeconds = context.uptimeSeconds ?? Math.round(process.uptime());

  try {
    if (method === "OPTIONS" && pathname.startsWith("/api/")) {
      return {
        statusCode: 204,
        headers: {
          ...corsHeaders,
        },
        body: null,
      };
    }

    if (method === "GET" && (pathname === "/health" || pathname === "/healthz")) {
      return json(200, createHealthResponse(serviceName, env, uptimeSeconds));
    }

    if (method === "GET" && pathname === "/api/public/world-summary") {
      return json(200, store.getPublicWorldSummary());
    }

    if (method === "GET" && pathname === "/api/public/plaza") {
      return json(200, store.getPublicPlazaSummary());
    }

    if (method === "GET" && pathname === "/api/public/opportunities") {
      return json(200, store.getPublicOpportunitySummary());
    }

    if (method === "GET" && pathname === "/api/public/posts") {
      return json(200, store.listPublicPosts(50));
    }

    if (method === "GET") {
      const postIdMatch = pathname.match(/^\/api\/public\/posts\/([^/]+)$/);
      if (postIdMatch) {
        const post = store.getPost(postIdMatch[1]!);
        if (!post) return json(404, { error: "post not found" });
        const replies = store.listPublicPosts(200).filter((p) => p.replyToPostId === post.id);
        return json(200, { post, replies });
      }
    }

    if (method === "GET") {
      const publicPlayerWalletAddress = routePublicPlayerPath(pathname);
      if (publicPlayerWalletAddress) {
        const publicPlayer = store.getPublicPlayer(publicPlayerWalletAddress);
        if (!publicPlayer) {
          return json(404, { error: "player not found" });
        }

        return json(200, publicPlayer);
      }
    }

    if (method === "GET") {
      const publicPetId = routePublicPetPath(pathname);
      if (publicPetId) {
        const publicPet = store.getPublicPet(publicPetId);
        if (!publicPet) {
          return json(404, { error: "pet not found" });
        }

        return json(200, publicPet);
      }
    }

    if (method === "POST" && pathname === "/api/auth/challenge") {
      const walletAddress = readWalletAddress(request.body);
      if (!walletAddress) {
        return json(400, { error: "walletAddress is required" });
      }

      return json(200, store.createChallenge(walletAddress));
    }

    if (method === "POST" && pathname === "/api/auth/verify") {
      const walletAddress = readWalletAddress(request.body);
      const signature = readSignature(request.body);
      if (!walletAddress || !signature) {
        return json(400, { error: "walletAddress and signature are required" });
      }

      const session = store.verifyChallenge(walletAddress, signature);
      if (!session) {
        return json(401, { error: "invalid challenge verification" });
      }

      return json(200, {
        walletAddress: session.walletAddress,
        token: session.token,
        authenticated: true,
      });
    }

    if (method === "POST" && pathname === "/api/players/bootstrap") {
      const session = requireSession(request, store);
      if ("statusCode" in session) {
        return session;
      }

      return json(200, store.bootstrapPlayer(session.walletAddress));
    }

    if (method === "GET" && pathname === "/api/me") {
      const session = requireSession(request, store);
      if ("statusCode" in session) {
        return session;
      }

      const me = buildMeSnapshot(store, session.walletAddress);
      if (!me) {
        return json(404, { error: "player not found" });
      }

      return json(200, me);
    }

    if (method === "GET" && pathname === "/api/me/home") {
      const session = requireSession(request, store);
      if ("statusCode" in session) {
        return session;
      }

      const player = store.getPlayer(session.walletAddress);
      if (!player) {
        return json(404, { error: "player not found" });
      }

      return json(200, buildHomeSnapshot(store, session.walletAddress));
    }

    if (method === "GET" && pathname === "/api/me/feed") {
    const session = requireSession(request, store);
    if ("statusCode" in session) {
      return session;
    }

    return json(200, store.listFeed(session.walletAddress));
  }

    if (method === "GET" && pathname === "/api/me/economy") {
      const session = requireSession(request, store);
      if ("statusCode" in session) {
        return session;
      }

      const economy = store.getEconomySummary(session.walletAddress);
      if (!economy) {
        return json(404, { error: "player not found" });
      }

      return json(200, economy);
    }

    if (method === "GET" && pathname === "/api/me/claim") {
      const session = requireSession(request, store);
      if ("statusCode" in session) {
        return session;
      }

      const claim = buildClaimSnapshot(store, session.walletAddress);
      if (!claim) {
        return json(404, { error: "player not found" });
      }

      return json(200, claim);
    }

    if (method === "GET" && pathname === "/api/me/claims") {
      const session = requireSession(request, store);
      if ("statusCode" in session) {
        return session;
      }

      return json(200, store.listClaims(session.walletAddress));
    }

    if (method === "GET" && pathname === "/api/me/economy/ledger") {
      const session = requireSession(request, store);
      if ("statusCode" in session) {
        return session;
      }

      return json(200, store.listLedger(session.walletAddress));
    }

    if (method === "GET" && pathname === "/api/me/messages") {
    const session = requireSession(request, store);
    if ("statusCode" in session) {
      return session;
    }

    return json(200, store.getMessageCenterSummary(session.walletAddress));
  }

    if (method === "GET" && pathname === "/api/me/discovery") {
      const session = requireSession(request, store);
      if ("statusCode" in session) {
        return session;
      }

      return json(200, {
        guidedActions: store.getGuidedActions(session.walletAddress),
        onboarding: store.getOnboardingSummary(session.walletAddress),
        opportunityBoard: store.getOpportunityBoard(session.walletAddress),
      });
    }

    if (method === "GET" && pathname === "/api/plaza") {
      const session = requireSession(request, store);
      if ("statusCode" in session) {
        return session;
      }

      return json(200, store.getPlazaSummary(session.walletAddress));
    }

    if (method === "GET" && pathname === "/api/x/status") {
    return json(200, store.getXAdapterStatus());
  }

    if (method === "GET" && pathname === "/api/me/pets") {
    const session = requireSession(request, store);
    if ("statusCode" in session) {
      return session;
    }

    return json(200, store.listPets(session.walletAddress));
  }

    if (method === "PATCH" && pathname === "/api/me/display-id") {
      const session = requireSession(request, store);
      if ("statusCode" in session) return session;
      const body = request.body as Record<string, unknown> | undefined;
      const displayId = typeof body?.displayId === "string" ? body.displayId.trim() : "";
      if (!displayId) return json(400, { error: "displayId is required" });
      const updated = store.setDisplayId(session.walletAddress, displayId);
      if (!updated) return json(404, { error: "player not found" });
      return json(200, { displayId: updated.displayId });
    }

    if (method === "POST") {
      const petPostMatch = pathname.match(/^\/api\/pets\/([^/]+)\/posts$/);
      if (petPostMatch) {
        const session = requireSession(request, store);
        if ("statusCode" in session) return session;
        const body = request.body as Record<string, unknown> | undefined;
        const content = typeof body?.content === "string" ? body.content.trim() : "";
        if (!content) return json(400, { error: "content is required" });
        const replyToPostId = typeof body?.replyToPostId === "string" ? body.replyToPostId : null;
        const eventRef = typeof body?.eventRef === "string" ? body.eventRef : null;
        const post = store.createPost(session.walletAddress, petPostMatch[1]!, content, { replyToPostId, eventRef });
        if (!post) return json(404, { error: "pet not found" });
        return json(200, post);
      }
    }

    if (method === "GET" && pathname === "/api/me/events") {
    const session = requireSession(request, store);
    if ("statusCode" in session) {
      return session;
    }

    return json(200, store.listEvents(session.walletAddress));
  }

    if (method === "GET" && pathname === "/api/me/x-actions") {
    const session = requireSession(request, store);
    if ("statusCode" in session) {
      return session;
    }

    if (!store.getXAdapterStatus().enabled) {
      return json(200, []);
    }

    return json(200, store.listXActions(session.walletAddress));
  }

    if (method === "GET" && pathname === "/api/economy/bounties") {
      const session = requireSession(request, store);
      if ("statusCode" in session) {
        return session;
      }

      return json(200, store.listBounties(session.walletAddress));
    }

    if (method === "GET" && pathname === "/api/economy/duels") {
      const session = requireSession(request, store);
      if ("statusCode" in session) {
        return session;
      }

      return json(200, store.listDuels(session.walletAddress));
    }

    if (method === "GET" && pathname === "/api/economy/service-orders") {
      const session = requireSession(request, store);
      if ("statusCode" in session) {
        return session;
      }

      return json(200, store.listServiceOrders(session.walletAddress));
    }

    if (method === "POST" && pathname === "/api/profit/withdraw") {
    const session = requireSession(request, store);
    if ("statusCode" in session) {
      return session;
    }

    const amount = readAmount(request.body);
    if (amount === null) {
      return json(400, { error: "amount is required" });
    }

    const result = store.withdrawProfit(session.walletAddress, amount);
    if (!result) {
      return json(400, { error: "unable to withdraw profit" });
    }

    return json(200, result);
  }

    if (method === "POST" && pathname === "/api/profit/reinvest") {
    const session = requireSession(request, store);
    if ("statusCode" in session) {
      return session;
    }

    const petId = readPetId(request.body);
    const amount = readAmount(request.body);
    if (!petId || amount === null) {
      return json(400, { error: "petId and amount are required" });
    }

    const result = store.reinvestProfit(session.walletAddress, petId, amount);
    if (!result) {
      return json(400, { error: "unable to reinvest profit" });
    }

    return json(200, result);
  }

    if (method === "POST" && pathname === "/api/economy/tips") {
      const session = requireSession(request, store);
      if ("statusCode" in session) {
        return session;
      }

      const fromPetId = readStringField(request.body, "fromPetId");
      const targetWalletAddress = readStringField(request.body, "targetWalletAddress");
      const toPetId = readStringField(request.body, "toPetId");
      const amount = readAmount(request.body);
      if (!fromPetId || !targetWalletAddress || !toPetId || amount === null) {
        return json(400, {
          error: "fromPetId, targetWalletAddress, toPetId and amount are required",
        });
      }

      return json(
        200,
        store.createTip(session.walletAddress, {
          fromPetId,
          targetWalletAddress,
          toPetId,
          amount,
        }),
      );
    }

    if (method === "POST" && pathname === "/api/economy/bounties") {
      const session = requireSession(request, store);
      if ("statusCode" in session) {
        return session;
      }

      const creatorPetId = readStringField(request.body, "creatorPetId");
      const targetWalletAddress = readStringField(request.body, "targetWalletAddress");
      const targetPetId = readStringField(request.body, "targetPetId");
      const title = readStringField(request.body, "title");
      const detail = readStringField(request.body, "detail");
      const amount = readAmount(request.body);
      if (
        !creatorPetId ||
        !targetWalletAddress ||
        !targetPetId ||
        !title ||
        !detail ||
        amount === null
      ) {
        return json(400, {
          error:
            "creatorPetId, targetWalletAddress, targetPetId, title, detail and amount are required",
        });
      }

      return json(
        200,
        store.createBounty(session.walletAddress, {
          creatorPetId,
          targetWalletAddress,
          targetPetId,
          title,
          detail,
          amount,
        }),
      );
    }

    const claimBountyId = routeEconomyActionPath(
      pathname,
      "/api/economy/bounties/",
      "/claim",
    );
    if (method === "POST" && claimBountyId) {
      const session = requireSession(request, store);
      if ("statusCode" in session) {
        return session;
      }
      const claimerPetId = readStringField(request.body, "claimerPetId");
      if (!claimerPetId) {
        return json(400, { error: "claimerPetId is required" });
      }

      return json(
        200,
        store.claimBounty(session.walletAddress, {
          bountyId: claimBountyId,
          claimerPetId,
        }),
      );
    }

    const cancelBountyId = routeEconomyActionPath(
      pathname,
      "/api/economy/bounties/",
      "/cancel",
    );
    if (method === "POST" && cancelBountyId) {
      const session = requireSession(request, store);
      if ("statusCode" in session) {
        return session;
      }

      return json(200, store.cancelBounty(session.walletAddress, cancelBountyId));
    }

    if (method === "POST" && pathname === "/api/economy/duels") {
      const session = requireSession(request, store);
      if ("statusCode" in session) {
        return session;
      }

      const challengerPetId = readStringField(request.body, "challengerPetId");
      const targetWalletAddress = readStringField(request.body, "targetWalletAddress");
      const targetPetId = readStringField(request.body, "targetPetId");
      const stakeAmount = readNumericField(request.body, "stakeAmount");
      if (!challengerPetId || !targetWalletAddress || !targetPetId || stakeAmount === null) {
        return json(400, {
          error: "challengerPetId, targetWalletAddress, targetPetId and stakeAmount are required",
        });
      }

      return json(
        200,
        store.createDuel(session.walletAddress, {
          challengerPetId,
          targetWalletAddress,
          targetPetId,
          stakeAmount,
        }),
      );
    }

    const acceptDuelId = routeEconomyActionPath(pathname, "/api/economy/duels/", "/accept");
    if (method === "POST" && acceptDuelId) {
      const session = requireSession(request, store);
      if ("statusCode" in session) {
        return session;
      }
      const targetPetId = readStringField(request.body, "targetPetId");
      if (!targetPetId) {
        return json(400, { error: "targetPetId is required" });
      }

      return json(
        200,
        store.acceptDuel(session.walletAddress, {
          duelId: acceptDuelId,
          targetPetId,
        }),
      );
    }

    const resolveDuelId = routeEconomyActionPath(pathname, "/api/economy/duels/", "/resolve");
    if (method === "POST" && resolveDuelId) {
      const session = requireSession(request, store);
      if ("statusCode" in session) {
        return session;
      }
      const winnerPetId = readStringField(request.body, "winnerPetId") ?? undefined;

      return json(
        200,
        store.resolveDuel(session.walletAddress, {
          duelId: resolveDuelId,
          winnerPetId,
        }),
      );
    }

    const cancelDuelId = routeEconomyActionPath(pathname, "/api/economy/duels/", "/cancel");
    if (method === "POST" && cancelDuelId) {
      const session = requireSession(request, store);
      if ("statusCode" in session) {
        return session;
      }

      return json(200, store.cancelDuel(session.walletAddress, cancelDuelId));
    }

    if (method === "POST" && pathname === "/api/economy/service-orders") {
      const session = requireSession(request, store);
      if ("statusCode" in session) {
        return session;
      }

      const clientPetId = readStringField(request.body, "clientPetId");
      const serviceType = readStringField(request.body, "serviceType");
      const title = readStringField(request.body, "title");
      const detail = readStringField(request.body, "detail");
      const amount = readAmount(request.body);
      if (!clientPetId || !serviceType || !title || !detail || amount === null) {
        return json(400, {
          error: "clientPetId, serviceType, title, detail and amount are required",
        });
      }

      return json(
        200,
        store.createServiceOrder(session.walletAddress, {
          clientPetId,
          serviceType,
          title,
          detail,
          amount,
        }),
      );
    }

    const acceptServiceOrderId = routeEconomyActionPath(
      pathname,
      "/api/economy/service-orders/",
      "/accept",
    );
    if (method === "POST" && acceptServiceOrderId) {
      const session = requireSession(request, store);
      if ("statusCode" in session) {
        return session;
      }
      const providerPetId = readStringField(request.body, "providerPetId");
      if (!providerPetId) {
        return json(400, { error: "providerPetId is required" });
      }

      return json(
        200,
        store.acceptServiceOrder(session.walletAddress, {
          orderId: acceptServiceOrderId,
          providerPetId,
        }),
      );
    }

    const completeServiceOrderId = routeEconomyActionPath(
      pathname,
      "/api/economy/service-orders/",
      "/complete",
    );
    if (method === "POST" && completeServiceOrderId) {
      const session = requireSession(request, store);
      if ("statusCode" in session) {
        return session;
      }

      return json(200, store.completeServiceOrder(session.walletAddress, completeServiceOrderId));
    }

    const cancelServiceOrderId = routeEconomyActionPath(
      pathname,
      "/api/economy/service-orders/",
      "/cancel",
    );
    if (method === "POST" && cancelServiceOrderId) {
      const session = requireSession(request, store);
      if ("statusCode" in session) {
        return session;
      }

      return json(200, store.cancelServiceOrder(session.walletAddress, cancelServiceOrderId));
    }

    if (method === "POST" && pathname === "/api/economy/safety-net/claim") {
      const session = requireSession(request, store);
      if ("statusCode" in session) {
        return session;
      }

      return json(200, store.claimSafetyNet(session.walletAddress));
    }

    if (method === "POST" && pathname === "/api/claims/intent") {
      const session = requireSession(request, store);
      if ("statusCode" in session) {
        return session;
      }

      const amount = readAmount(request.body);
      if (amount === null) {
        return json(400, { error: "amount is required" });
      }

      return json(200, store.prepareClaim(session.walletAddress, amount));
    }

    const confirmClaimId = routeEconomyActionPath(pathname, "/api/claims/", "/confirm");
    if (method === "POST" && confirmClaimId) {
      const session = requireSession(request, store);
      if ("statusCode" in session) {
        return session;
      }

      const txHash = readTxHash(request.body);
      if (!txHash) {
        return json(400, { error: "txHash is required" });
      }

      return json(200, await store.confirmClaim(session.walletAddress, confirmClaimId, txHash));
    }

    const cancelClaimId = routeEconomyActionPath(pathname, "/api/claims/", "/cancel");
    if (method === "POST" && cancelClaimId) {
      const session = requireSession(request, store);
      if ("statusCode" in session) {
        return session;
      }

      return json(200, store.cancelClaim(session.walletAddress, cancelClaimId));
    }

    if (method === "POST" && pathname === "/api/onchain/claim/intent") {
      const session = requireSession(request, store);
      if ("statusCode" in session) {
        return session;
      }

      const currentClaim = store.listClaims(session.walletAddress).find((claim) => claim.status === "pending");
      if (currentClaim) {
        return json(200, currentClaim.intent);
      }

      const claimable = buildClaimSnapshot(store, session.walletAddress);
      if (!claimable || claimable.claimableBalance <= 0) {
        return json(409, { error: "no claimable canned balance available" });
      }

      const prepared = store.prepareClaim(session.walletAddress, claimable.claimableBalance);
      if (!prepared) {
        return json(400, { error: "unable to prepare claim" });
      }

      return json(200, prepared.intent);
    }

    if (method === "POST" && pathname === "/api/onchain/claim/confirm") {
      const session = requireSession(request, store);
      if ("statusCode" in session) {
        return session;
      }

      const txHash = readTxHash(request.body);
      if (!txHash) {
        return json(400, { error: "txHash is required" });
      }

      const pendingClaim = store.listClaims(session.walletAddress).find((claim) => claim.status === "pending");
      if (!pendingClaim) {
        return json(409, { error: "no pending claim found" });
      }

      const result = await store.confirmClaim(session.walletAddress, pendingClaim.id, txHash);
      if (!result) {
        return json(404, { error: "claim not found" });
      }

      return json(200, buildClaimSnapshot(store, session.walletAddress));
    }

    if (method === "POST" && pathname === "/api/onchain/claim/cancel") {
      const session = requireSession(request, store);
      if ("statusCode" in session) {
        return session;
      }

      const pendingClaim = store.listClaims(session.walletAddress).find((claim) => claim.status === "pending");
      if (!pendingClaim) {
        return json(409, { error: "no pending claim found" });
      }

      const result = store.cancelClaim(session.walletAddress, pendingClaim.id);
      if (!result) {
        return json(404, { error: "claim not found" });
      }

      return json(200, buildClaimSnapshot(store, session.walletAddress));
    }

    if (method === "POST" && pathname === "/api/onchain/register-player/intent") {
    const session = requireSession(request, store);
    if ("statusCode" in session) {
      return session;
    }

    const intent = store.preparePlayerOnchain(session.walletAddress);
    if (!intent) {
      return json(404, { error: "player not found" });
    }

    return json(200, intent);
  }

    if (method === "POST" && pathname === "/api/onchain/register-player/confirm") {
    const session = requireSession(request, store);
    if ("statusCode" in session) {
      return session;
    }

    const txHash = readTxHash(request.body);
    if (!txHash) {
      return json(400, { error: "txHash is required" });
    }

    const player = await store.confirmPlayerOnchain(session.walletAddress, txHash);
    if (!player) {
      return json(404, { error: "player not found" });
    }

    return json(200, player);
  }

    if (method === "POST" && pathname === "/api/onchain/create-pet/intent") {
    const session = requireSession(request, store);
    if ("statusCode" in session) {
      return session;
    }

    const petId = readPetId(request.body);
    if (!petId) {
      return json(400, { error: "petId is required" });
    }

    const intent = store.preparePetOnchain(session.walletAddress, petId);
    if (!intent) {
      return json(404, { error: "pet not found" });
    }

    return json(200, intent);
  }

    if (method === "POST" && pathname === "/api/onchain/create-pet/confirm") {
    const session = requireSession(request, store);
    if ("statusCode" in session) {
      return session;
    }

    const petId = readPetId(request.body);
    const txHash = readTxHash(request.body);
    if (!petId || !txHash) {
      return json(400, { error: "petId and txHash are required" });
    }

    const pet = await store.confirmPetOnchain(session.walletAddress, petId, txHash);
    if (!pet) {
      return json(404, { error: "pet not found" });
    }

    return json(200, pet);
  }

    if (method === "POST" && pathname === "/api/onchain/set-budget/intent") {
    const session = requireSession(request, store);
    if ("statusCode" in session) {
      return session;
    }

    const petId = readPetId(request.body);
    if (!petId) {
      return json(400, { error: "petId is required" });
    }

    const intent = store.preparePetBudgetOnchain(session.walletAddress, petId);
    if (!intent) {
      return json(404, { error: "pet not found" });
    }

    return json(200, intent);
  }

    if (method === "POST" && pathname === "/api/onchain/set-budget/confirm") {
    const session = requireSession(request, store);
    if ("statusCode" in session) {
      return session;
    }

    const petId = readPetId(request.body);
    const txHash = readTxHash(request.body);
    if (!petId || !txHash) {
      return json(400, { error: "petId and txHash are required" });
    }

    const pet = await store.confirmPetBudgetOnchain(session.walletAddress, petId, txHash);
    if (!pet) {
      return json(404, { error: "pet not found" });
    }

    return json(200, pet);
  }

    if (method === "POST" && pathname === "/api/x/actions/upload") {
    const session = requireSession(request, store);
    if ("statusCode" in session) {
      return session;
    }

    if (!store.getXAdapterStatus().canUpload) {
      return json(503, {
        error: store.getXAdapterStatus().reason,
        code: "x_disabled",
      });
    }

    const payload = readXActionPayload(request.body);
    if (!payload) {
      return json(400, { error: "invalid x action payload" });
    }

    const result = store.uploadXAction(session.walletAddress, payload);
    if (!result) {
      return json(400, { error: "unable to verify x action" });
    }

    return json(200, result);
  }

    if (method === "POST" && pathname === "/api/openclaw/execute") {
    const session = requireSession(request, store);
    if ("statusCode" in session) {
      return session;
    }

    const operation = readOpenClawOperation(request.body);
    if (!operation) {
      return json(400, { error: "operation is required" });
    }

    if (operation === "get_home") {
      const player = store.getPlayer(session.walletAddress);
      if (!player) {
        return json(404, { error: "player not found" });
      }

      return json(200, buildHomeSnapshot(store, session.walletAddress));
    }

    if (operation === "get_feed") {
      return json(200, store.listFeed(session.walletAddress));
    }

    if (operation === "get_economy") {
      return json(200, store.getEconomySummary(session.walletAddress));
    }

    if (operation === "get_claim_snapshot") {
      return json(200, buildClaimSnapshot(store, session.walletAddress));
    }

    if (operation === "get_ledger") {
      return json(200, store.listLedger(session.walletAddress));
    }

    if (operation === "get_messages") {
      return json(200, store.getMessageCenterSummary(session.walletAddress));
    }

      if (operation === "get_discovery") {
        return json(200, {
          guidedActions: store.getGuidedActions(session.walletAddress),
          onboarding: store.getOnboardingSummary(session.walletAddress),
          opportunityBoard: store.getOpportunityBoard(session.walletAddress),
        });
      }

      if (operation === "get_plaza") {
        return json(200, store.getPlazaSummary(session.walletAddress));
      }

      if (operation === "get_x_adapter_status") {
        return json(200, store.getXAdapterStatus());
      }

    if (operation === "issue_command") {
      const petId = readPetId(request.body);
      const commandType = readCommandType(request.body);
      if (!petId || !commandType) {
        return json(400, { error: "petId and commandType are required" });
      }

      const result = store.issueCommand(session.walletAddress, petId, commandType);
      if (!result) {
        return json(404, { error: "pet not found" });
      }

      return json(200, result);
    }

    if (operation === "create_tip") {
      const fromPetId = readStringField(request.body, "fromPetId");
      const targetWalletAddress = readStringField(request.body, "targetWalletAddress");
      const toPetId = readStringField(request.body, "toPetId");
      const amount = readAmount(request.body);
      if (!fromPetId || !targetWalletAddress || !toPetId || amount === null) {
        return json(400, {
          error: "fromPetId, targetWalletAddress, toPetId and amount are required",
        });
      }

      return json(
        200,
        store.createTip(session.walletAddress, {
          fromPetId,
          targetWalletAddress,
          toPetId,
          amount,
        }),
      );
    }

    if (operation === "create_bounty") {
      const creatorPetId = readStringField(request.body, "creatorPetId");
      const targetWalletAddress = readStringField(request.body, "targetWalletAddress");
      const targetPetId = readStringField(request.body, "targetPetId");
      const title = readStringField(request.body, "title");
      const detail = readStringField(request.body, "detail");
      const amount = readAmount(request.body);
      if (
        !creatorPetId ||
        !targetWalletAddress ||
        !targetPetId ||
        !title ||
        !detail ||
        amount === null
      ) {
        return json(400, {
          error:
            "creatorPetId, targetWalletAddress, targetPetId, title, detail and amount are required",
        });
      }

      return json(
        200,
        store.createBounty(session.walletAddress, {
          creatorPetId,
          targetWalletAddress,
          targetPetId,
          title,
          detail,
          amount,
        }),
      );
    }

    if (operation === "claim_bounty") {
      const bountyId = readStringField(request.body, "bountyId");
      const claimerPetId = readStringField(request.body, "claimerPetId");
      if (!bountyId || !claimerPetId) {
        return json(400, { error: "bountyId and claimerPetId are required" });
      }

      return json(
        200,
        store.claimBounty(session.walletAddress, { bountyId, claimerPetId }),
      );
    }

    if (operation === "create_duel") {
      const challengerPetId = readStringField(request.body, "challengerPetId");
      const targetWalletAddress = readStringField(request.body, "targetWalletAddress");
      const targetPetId = readStringField(request.body, "targetPetId");
      const stakeAmount = readNumericField(request.body, "stakeAmount");
      if (!challengerPetId || !targetWalletAddress || !targetPetId || stakeAmount === null) {
        return json(400, {
          error: "challengerPetId, targetWalletAddress, targetPetId and stakeAmount are required",
        });
      }

      return json(
        200,
        store.createDuel(session.walletAddress, {
          challengerPetId,
          targetWalletAddress,
          targetPetId,
          stakeAmount,
        }),
      );
    }

    if (operation === "accept_duel") {
      const duelId = readStringField(request.body, "duelId");
      const targetPetId = readStringField(request.body, "targetPetId");
      if (!duelId || !targetPetId) {
        return json(400, { error: "duelId and targetPetId are required" });
      }

      return json(
        200,
        store.acceptDuel(session.walletAddress, { duelId, targetPetId }),
      );
    }

    if (operation === "resolve_duel") {
      const duelId = readStringField(request.body, "duelId");
      const winnerPetId = readStringField(request.body, "winnerPetId") ?? undefined;
      if (!duelId) {
        return json(400, { error: "duelId is required" });
      }

      return json(
        200,
        store.resolveDuel(session.walletAddress, { duelId, winnerPetId }),
      );
    }

    if (operation === "create_service_order") {
      const clientPetId = readStringField(request.body, "clientPetId");
      const serviceType = readStringField(request.body, "serviceType");
      const title = readStringField(request.body, "title");
      const detail = readStringField(request.body, "detail");
      const amount = readAmount(request.body);
      if (!clientPetId || !serviceType || !title || !detail || amount === null) {
        return json(400, {
          error: "clientPetId, serviceType, title, detail and amount are required",
        });
      }

      return json(
        200,
        store.createServiceOrder(session.walletAddress, {
          clientPetId,
          serviceType,
          title,
          detail,
          amount,
        }),
      );
    }

    if (operation === "accept_service_order") {
      const orderId = readStringField(request.body, "orderId");
      const providerPetId = readStringField(request.body, "providerPetId");
      if (!orderId || !providerPetId) {
        return json(400, { error: "orderId and providerPetId are required" });
      }

      return json(
        200,
        store.acceptServiceOrder(session.walletAddress, { orderId, providerPetId }),
      );
    }

    if (operation === "complete_service_order") {
      const orderId = readStringField(request.body, "orderId");
      if (!orderId) {
        return json(400, { error: "orderId is required" });
      }

      return json(200, store.completeServiceOrder(session.walletAddress, orderId));
    }

    if (operation === "update_budget") {
      const petId = readPetId(request.body);
      const budget = readBudget(request.body);
      if (!petId || !budget) {
        return json(400, { error: "petId and valid budget are required" });
      }

      const result = store.updatePetBudget(session.walletAddress, petId, budget);
      if (!result) {
        return json(404, { error: "pet not found" });
      }

      return json(200, result);
    }

    if (operation === "withdraw_profit") {
      const amount = readAmount(request.body);
      if (amount === null) {
        return json(400, { error: "amount is required" });
      }

      const result = store.withdrawProfit(session.walletAddress, amount);
      if (!result) {
        return json(400, { error: "unable to withdraw profit" });
      }

      return json(200, result);
    }

    if (operation === "reinvest_profit") {
      const petId = readPetId(request.body);
      const amount = readAmount(request.body);
      if (!petId || amount === null) {
        return json(400, { error: "petId and amount are required" });
      }

      const result = store.reinvestProfit(session.walletAddress, petId, amount);
      if (!result) {
        return json(400, { error: "unable to reinvest profit" });
      }

      return json(200, result);
    }

    if (operation === "upload_x_action") {
      if (!store.getXAdapterStatus().canUpload) {
        return json(503, {
          error: store.getXAdapterStatus().reason,
          code: "x_disabled",
        });
      }

      const payload = readXActionPayload(request.body);
      if (!payload) {
        return json(400, { error: "invalid x action payload" });
      }

      const result = store.uploadXAction(session.walletAddress, payload);
      if (!result) {
        return json(400, { error: "unable to verify x action" });
      }

      return json(200, result);
    }

    if (operation === "prepare_register_player_onchain") {
      const intent = store.preparePlayerOnchain(session.walletAddress);
      if (!intent) {
        return json(404, { error: "player not found" });
      }

      return json(200, intent);
    }

    if (operation === "confirm_register_player_onchain") {
      const txHash = readTxHash(request.body);
      if (!txHash) {
        return json(400, { error: "txHash is required" });
      }

      const player = await store.confirmPlayerOnchain(session.walletAddress, txHash);
      if (!player) {
        return json(404, { error: "player not found" });
      }

      return json(200, player);
    }

    if (operation === "prepare_create_pet_onchain") {
      const petId = readPetId(request.body);
      if (!petId) {
        return json(400, { error: "petId is required" });
      }

      const intent = store.preparePetOnchain(session.walletAddress, petId);
      if (!intent) {
        return json(404, { error: "pet not found" });
      }

      return json(200, intent);
    }

    if (operation === "confirm_create_pet_onchain") {
      const petId = readPetId(request.body);
      const txHash = readTxHash(request.body);
      if (!petId || !txHash) {
        return json(400, { error: "petId and txHash are required" });
      }

      const pet = await store.confirmPetOnchain(session.walletAddress, petId, txHash);
      if (!pet) {
        return json(404, { error: "pet not found" });
      }

      return json(200, pet);
    }

    if (operation === "prepare_set_pet_budget_onchain") {
      const petId = readPetId(request.body);
      if (!petId) {
        return json(400, { error: "petId is required" });
      }

      const intent = store.preparePetBudgetOnchain(session.walletAddress, petId);
      if (!intent) {
        return json(404, { error: "pet not found" });
      }

      return json(200, intent);
    }

    if (operation === "confirm_set_pet_budget_onchain") {
      const petId = readPetId(request.body);
      const txHash = readTxHash(request.body);
      if (!petId || !txHash) {
        return json(400, { error: "petId and txHash are required" });
      }

      const pet = await store.confirmPetBudgetOnchain(session.walletAddress, petId, txHash);
      if (!pet) {
        return json(404, { error: "pet not found" });
      }

      return json(200, pet);
    }

    if (operation === "prepare_claim_onchain") {
      const currentClaim = store.listClaims(session.walletAddress).find((claim) => claim.status === "pending");
      if (currentClaim) {
        return json(200, currentClaim.intent);
      }

      const claim = buildClaimSnapshot(store, session.walletAddress);
      if (!claim || claim.claimableBalance <= 0) {
        return json(409, { error: "no claimable canned balance available" });
      }

      const prepared = store.prepareClaim(session.walletAddress, claim.claimableBalance);
      if (!prepared) {
        return json(400, { error: "unable to prepare claim" });
      }

      return json(200, prepared.intent);
    }

    if (operation === "confirm_claim_onchain") {
      const txHash = readTxHash(request.body);
      if (!txHash) {
        return json(400, { error: "txHash is required" });
      }

      const pendingClaim = store.listClaims(session.walletAddress).find((claim) => claim.status === "pending");
      if (!pendingClaim) {
        return json(409, { error: "no pending claim found" });
      }

      const result = await store.confirmClaim(session.walletAddress, pendingClaim.id, txHash);
      if (!result) {
        return json(404, { error: "claim not found" });
      }

      return json(200, buildClaimSnapshot(store, session.walletAddress));
    }

    if (operation === "cancel_claim_onchain") {
      const pendingClaim = store.listClaims(session.walletAddress).find((claim) => claim.status === "pending");
      if (!pendingClaim) {
        return json(409, { error: "no pending claim found" });
      }

      const result = store.cancelClaim(session.walletAddress, pendingClaim.id);
      if (!result) {
        return json(404, { error: "claim not found" });
      }

      return json(200, buildClaimSnapshot(store, session.walletAddress));
    }

    return json(400, { error: "unsupported operation" });
  }

    if (method === "GET") {
      const petPersonalityId = routePetSuffixPath(pathname, "/personality");
      if (petPersonalityId) {
        const session = requireSession(request, store);
        if ("statusCode" in session) {
          return session;
        }

        const personality = store.getPetPersonality(session.walletAddress, petPersonalityId);
        if (!personality) {
          return json(404, { error: "pet not found" });
        }

        return json(200, personality);
      }

      const petRecommendationsId = routePetSuffixPath(pathname, "/recommendations");
      if (petRecommendationsId) {
        const session = requireSession(request, store);
        if ("statusCode" in session) {
          return session;
        }

        const recommendations = store.getPetRecommendations(
          session.walletAddress,
          petRecommendationsId,
        );
        if (!recommendations) {
          return json(404, { error: "pet not found" });
        }

        return json(200, recommendations);
      }

      const petId = routePetPath(pathname);
      if (petId) {
        const session = requireSession(request, store);
        if ("statusCode" in session) {
          return session;
        }

        const pet = store.getPet(session.walletAddress, petId);
        if (!pet) {
          return json(404, { error: "pet not found" });
        }

        return json(200, pet);
      }
    }

    if (method === "PATCH") {
      const strategyPetId = routePetSuffixPath(pathname, "/strategy");
      if (strategyPetId) {
        const session = requireSession(request, store);
        if ("statusCode" in session) {
          return session;
        }

        const strategyMode = readStrategyMode(request.body);
        const targetPreference = readTargetPreference(request.body);
        if (!strategyMode && !targetPreference) {
          return json(400, { error: "strategyMode or targetPreference is required" });
        }

        const pet = store.updatePetStrategy(session.walletAddress, strategyPetId, {
          strategyMode: strategyMode ?? undefined,
          targetPreference: targetPreference ?? undefined,
        });
        if (!pet) {
          return json(404, { error: "pet not found" });
        }

        return json(200, pet);
      }

      const autonomyPetId = routePetSuffixPath(pathname, "/autonomy");
      if (autonomyPetId) {
        const session = requireSession(request, store);
        if ("statusCode" in session) {
          return session;
        }

        const autonomyLevel = readNumericField(request.body, "autonomyLevel");
        if (autonomyLevel === null) {
          return json(400, { error: "autonomyLevel is required" });
        }

        const pet = store.updatePetAutonomy(session.walletAddress, autonomyPetId, autonomyLevel);
        if (!pet) {
          return json(404, { error: "pet not found" });
        }

        return json(200, pet);
      }

      const petId = routePetBudgetPath(pathname);
      if (petId) {
        const session = requireSession(request, store);
        if ("statusCode" in session) {
          return session;
        }

        const budget = readBudget(request.body);
        if (!budget) {
          return json(400, { error: "invalid budget payload" });
        }

        const pet = store.updatePetBudget(session.walletAddress, petId, budget);
        if (!pet) {
          return json(404, { error: "pet not found" });
        }

        return json(200, pet);
      }
    }

    if (method === "POST") {
      const petId = routePetCommandPath(pathname);
      if (petId) {
        const session = requireSession(request, store);
        if ("statusCode" in session) {
          return session;
        }

        const commandType = readCommandType(request.body);
        if (!commandType) {
          return json(400, { error: "commandType is required" });
        }

        const result = store.issueCommand(session.walletAddress, petId, commandType);
        if (!result) {
          return json(404, { error: "pet not found" });
        }

        return json(200, result);
      }
    }

    return json(404, { error: "not found" });
  } catch (error) {
    return toRouteError(error);
  }
}
