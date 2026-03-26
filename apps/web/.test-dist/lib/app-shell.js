export const SESSION_STORAGE_KEY = "agent-pet.auth-session";
export function createAppShellState(defaultWalletAddress) {
    return {
        status: "disconnected",
        walletAddress: defaultWalletAddress,
        challenge: null,
        session: null,
        player: null,
        error: null,
    };
}
export function appShellReducer(state, action) {
    switch (action.type) {
        case "wallet-changed":
            return {
                ...state,
                walletAddress: action.walletAddress,
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
export function readPersistedSession(storage) {
    if (!storage) {
        return null;
    }
    const rawSession = storage.getItem(SESSION_STORAGE_KEY);
    if (!rawSession) {
        return null;
    }
    try {
        const parsedSession = JSON.parse(rawSession);
        if (typeof parsedSession.walletAddress !== "string" ||
            typeof parsedSession.token !== "string" ||
            parsedSession.authenticated !== true) {
            return null;
        }
        return {
            walletAddress: parsedSession.walletAddress,
            token: parsedSession.token,
            authenticated: true,
        };
    }
    catch {
        return null;
    }
}
export function writePersistedSession(storage, session) {
    storage?.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
}
export function clearPersistedSession(storage) {
    storage?.removeItem(SESSION_STORAGE_KEY);
}
