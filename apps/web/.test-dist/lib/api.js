async function readJson(response) {
    const payload = (await response.json());
    if (!response.ok) {
        const message = typeof payload === "object" &&
            payload !== null &&
            "error" in payload &&
            typeof payload.error === "string"
            ? payload.error
            : `Request failed with status ${response.status}`;
        throw new Error(message);
    }
    return payload;
}
function createHeaders(token) {
    const headers = {
        Accept: "application/json",
    };
    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }
    return headers;
}
export function createApiClient({ baseUrl, fetch: fetchImpl = fetch }) {
    async function postJson(path, body, token) {
        const response = await fetchImpl(`${baseUrl}${path}`, {
            method: "POST",
            headers: {
                ...createHeaders(token),
                "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
        });
        return readJson(response);
    }
    async function postWithoutBody(path, token) {
        const response = await fetchImpl(`${baseUrl}${path}`, {
            method: "POST",
            headers: {
                ...createHeaders(token),
            },
        });
        return readJson(response);
    }
    async function getJson(path, token) {
        const response = await fetchImpl(`${baseUrl}${path}`, {
            method: "GET",
            headers: {
                ...createHeaders(token),
            },
        });
        return readJson(response);
    }
    async function patchJson(path, body, token) {
        const response = await fetchImpl(`${baseUrl}${path}`, {
            method: "PATCH",
            headers: {
                ...createHeaders(token),
                "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
        });
        return readJson(response);
    }
    return {
        createChallenge(walletAddress) {
            return postJson("/api/auth/challenge", { walletAddress });
        },
        verifyChallenge(walletAddress, signature) {
            return postJson("/api/auth/verify", { walletAddress, signature });
        },
        bootstrapPlayer(token) {
            return postWithoutBody("/api/players/bootstrap", token);
        },
        getMe(token) {
            return getJson("/api/me", token);
        },
        getPet(token, petId) {
            return getJson(`/api/pets/${petId}`, token);
        },
        listEvents(token) {
            return getJson("/api/me/events", token);
        },
        updatePetBudget(token, petId, budget) {
            return patchJson(`/api/pets/${petId}/budget`, budget, token);
        },
        issueCommand(token, petId, commandType) {
            return postJson(`/api/pets/${petId}/commands`, { commandType }, token);
        },
        withdrawProfit(token, amount) {
            return postJson("/api/profit/withdraw", { amount }, token);
        },
        reinvestProfit(token, petId, amount) {
            return postJson("/api/profit/reinvest", { petId, amount }, token);
        },
    };
}
