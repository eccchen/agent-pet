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

export type ChainSyncMetadata = Readonly<{
  syncStatus: "local" | "pending" | "synced" | "failed";
  onchainId: string;
  lastSyncedAt: string | null;
}>;

export type PetSnapshot = Readonly<{
  id: string;
  name: string;
  species: string;
  level: number;
  starter: true;
  budget: PetBudget;
  chainSync: ChainSyncMetadata;
}>;

export type PlayerSnapshot = Readonly<{
  walletAddress: string;
  displayId: string | null;
  xBinding: false;
  budget: number;
  profitPool: number;
  chainSync: ChainSyncMetadata;
  pets: readonly PetSnapshot[];
  createdAt: string;
  updatedAt: string;
}>;

export type PlayerEvent = Readonly<{
  id: string;
  type:
    | "player_bootstrapped"
    | "pet_budget_updated"
    | "pet_command_issued"
    | "profit_withdrawn"
    | "profit_reinvested";
  title: string;
  detail: string;
  createdAt: string;
  petId: string | null;
  commandType?: CommandType;
  amount?: number;
}>;

export type CommandType =
  | "earn"
  | "taunt"
  | "ally"
  | "revenge"
  | "stay_low";

export type CommandResult = Readonly<{
  player: PlayerSnapshot;
  pet: PetSnapshot;
  event: PlayerEvent;
}>;

export type ProfitActionResult = Readonly<{
  player: PlayerSnapshot;
  event: PlayerEvent;
}>;

export type ReinvestResult = Readonly<{
  player: PlayerSnapshot;
  pet: PetSnapshot;
  event: PlayerEvent;
}>;

type FetchLike = typeof fetch;

type ApiClientDeps = Readonly<{
  baseUrl: string;
  fetch?: FetchLike;
}>;

async function readJson<T>(response: Response): Promise<T> {
  const payload = (await response.json()) as T | { error?: string };

  if (!response.ok) {
    const message =
      typeof payload === "object" &&
      payload !== null &&
      "error" in payload &&
      typeof payload.error === "string"
        ? payload.error
        : `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return payload as T;
}

function createHeaders(token?: string): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

export function createApiClient({ baseUrl, fetch: fetchImpl = fetch }: ApiClientDeps) {
  async function postJson<T>(path: string, body: unknown, token?: string): Promise<T> {
    const response = await fetchImpl(`${baseUrl}${path}`, {
      method: "POST",
      headers: {
        ...createHeaders(token),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    return readJson<T>(response);
  }

  async function postWithoutBody<T>(path: string, token: string): Promise<T> {
    const response = await fetchImpl(`${baseUrl}${path}`, {
      method: "POST",
      headers: {
        ...createHeaders(token),
      },
    });

    return readJson<T>(response);
  }

  async function getJson<T>(path: string, token?: string): Promise<T> {
    const response = await fetchImpl(`${baseUrl}${path}`, {
      method: "GET",
      headers: {
        ...createHeaders(token),
      },
    });

    return readJson<T>(response);
  }

  async function patchJson<T>(path: string, body: unknown, token: string): Promise<T> {
    const response = await fetchImpl(`${baseUrl}${path}`, {
      method: "PATCH",
      headers: {
        ...createHeaders(token),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    return readJson<T>(response);
  }

  return {
    createChallenge(walletAddress: string) {
      return postJson<AuthChallenge>("/api/auth/challenge", { walletAddress });
    },
    verifyChallenge(walletAddress: string, signature: string) {
      return postJson<AuthSession>("/api/auth/verify", { walletAddress, signature });
    },
    bootstrapPlayer(token: string) {
      return postWithoutBody<PlayerSnapshot>("/api/players/bootstrap", token);
    },
    getMe(token: string) {
      return getJson<PlayerSnapshot>("/api/me", token);
    },
    getPet(token: string, petId: string) {
      return getJson<PetSnapshot>(`/api/pets/${petId}`, token);
    },
    listEvents(token: string) {
      return getJson<readonly PlayerEvent[]>("/api/me/events", token);
    },
    updatePetBudget(token: string, petId: string, budget: PetBudget) {
      return patchJson<PetSnapshot>(`/api/pets/${petId}/budget`, budget, token);
    },
    issueCommand(token: string, petId: string, commandType: CommandType) {
      return postJson<CommandResult>(`/api/pets/${petId}/commands`, { commandType }, token);
    },
    withdrawProfit(token: string, amount: number) {
      return postJson<ProfitActionResult>("/api/profit/withdraw", { amount }, token);
    },
    reinvestProfit(token: string, petId: string, amount: number) {
      return postJson<ReinvestResult>("/api/profit/reinvest", { petId, amount }, token);
    },
    setDisplayId(token: string, displayId: string) {
      return patchJson<{ displayId: string }>("/api/me/display-id", { displayId }, token);
    },
    createPost(token: string, petId: string, content: string, opts?: { replyToPostId?: string | null; eventRef?: string | null }) {
      return postJson<{ id: string; content: string; petName: string }>(`/api/pets/${petId}/posts`, { content, ...opts }, token);
    },
  };
}
