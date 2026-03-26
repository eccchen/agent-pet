function requireEnv(key) {
  const value = process.env[key]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable ${key}.`);
  }

  return value;
}

function buildHeaders(token) {
  const headers = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

export function createInvokeSkill() {
  const bridgeUrl = requireEnv("OPENCLAW_SKILL_BRIDGE_URL");
  const bridgeToken = process.env.OPENCLAW_SKILL_BRIDGE_TOKEN?.trim() || "";

  return async function invokeSkill(input) {
    const response = await fetch(bridgeUrl, {
      method: "POST",
      headers: buildHeaders(bridgeToken),
      body: JSON.stringify(input),
    });

    const text = await response.text();
    let payload = null;

    if (text) {
      try {
        payload = JSON.parse(text);
      } catch {
        payload = text;
      }
    }

    if (!response.ok) {
      const message =
        payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string"
          ? payload.error
          : `OpenClaw skill bridge returned ${response.status}.`;
      throw new Error(message);
    }

    if (payload && typeof payload === "object" && "result" in payload) {
      return payload.result;
    }

    return payload;
  };
}

