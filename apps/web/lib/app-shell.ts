import type { AuthChallenge, AuthSession, PlayerSnapshot } from "./api.js";

export type AppShellStatus =
  | "disconnected"
  | "challenged"
  | "authenticated"
  | "bootstrapped";

export type AppShellState = Readonly<{
  status: AppShellStatus;
  walletAddress: string;
  challenge: AuthChallenge | null;
  session: AuthSession | null;
  player: PlayerSnapshot | null;
  error: string | null;
}>;

export type AppShellAction =
  | Readonly<{ type: "wallet-changed"; walletAddress: string }>
  | Readonly<{ type: "challenge-issued"; challenge: AuthChallenge }>
  | Readonly<{ type: "session-authenticated"; session: AuthSession }>
  | Readonly<{ type: "player-loaded"; player: PlayerSnapshot }>
  | Readonly<{ type: "session-cleared" }>
  | Readonly<{ type: "error-set"; error: string }>
  | Readonly<{ type: "error-cleared" }>;

export const SESSION_STORAGE_KEY = "agent-pet.auth-session";

export type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function createAppShellState(defaultWalletAddress: string): AppShellState {
  return {
    status: "disconnected",
    walletAddress: defaultWalletAddress,
    challenge: null,
    session: null,
    player: null,
    error: null,
  };
}

export function appShellReducer(state: AppShellState, action: AppShellAction): AppShellState {
  switch (action.type) {
    case "wallet-changed":
      return {
        ...state,
        status: "disconnected",
        walletAddress: action.walletAddress,
        challenge: null,
        session: null,
        player: null,
        error: null,
      };
    case "challenge-issued":
      return {
        ...state,
        status: "challenged",
        walletAddress: action.challenge.walletAddress,
        challenge: action.challenge,
        session: null,
        player: null,
        error: null,
      };
    case "session-authenticated":
      return {
        ...state,
        status: "authenticated",
        walletAddress: action.session.walletAddress,
        session: action.session,
        player: null,
        error: null,
      };
    case "player-loaded":
      return {
        ...state,
        status: "bootstrapped",
        walletAddress: action.player.walletAddress,
        player: action.player,
        error: null,
      };
    case "session-cleared":
      return {
        ...state,
        status: "disconnected",
        challenge: null,
        session: null,
        player: null,
        error: null,
      };
    case "error-set":
      return {
        ...state,
        error: action.error,
      };
    case "error-cleared":
      return {
        ...state,
        error: null,
      };
    default:
      return state;
  }
}

export function readPersistedSession(storage: StorageLike | null): AuthSession | null {
  if (!storage) {
    return null;
  }

  const rawSession = storage.getItem(SESSION_STORAGE_KEY);
  if (!rawSession) {
    return null;
  }

  try {
    const parsedSession = JSON.parse(rawSession) as Partial<AuthSession>;

    if (
      typeof parsedSession.walletAddress !== "string" ||
      typeof parsedSession.token !== "string" ||
      parsedSession.authenticated !== true
    ) {
      return null;
    }

    return {
      walletAddress: parsedSession.walletAddress,
      token: parsedSession.token,
      authenticated: true,
    };
  } catch {
    return null;
  }
}

export function writePersistedSession(storage: StorageLike | null, session: AuthSession): void {
  storage?.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
}

export function clearPersistedSession(storage: StorageLike | null): void {
  storage?.removeItem(SESSION_STORAGE_KEY);
}
