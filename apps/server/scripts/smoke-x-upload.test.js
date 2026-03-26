const assert = require("node:assert/strict");
const test = require("node:test");

const { runSmoke } = require("./smoke-x-upload.js");

test("runSmoke logs in, uploads one x action, and verifies it appears on home", async () => {
  const calls = [];
  const uploadedActions = [];

  const fetchImpl = async (url, options = {}) => {
    const parsedUrl = new URL(url);
    const body = options.body ? JSON.parse(options.body) : undefined;
    calls.push({
      method: options.method ?? "GET",
      path: parsedUrl.pathname,
      body,
    });

    if (parsedUrl.pathname === "/api/auth/challenge") {
      return createJsonResponse({
        walletAddress: body.walletAddress,
        nonce: "nonce-123",
        challenge: "Sign this wallet challenge: nonce-123",
      });
    }

    if (parsedUrl.pathname === "/api/auth/verify") {
      return createJsonResponse({
        walletAddress: body.walletAddress,
        token: "session-token",
        authenticated: true,
      });
    }

    if (parsedUrl.pathname === "/api/players/bootstrap") {
      return createJsonResponse({
        walletAddress: "0xabc",
        xBinding: false,
        budget: 1000,
        profitPool: 0,
        pets: [],
        chainSync: { syncStatus: "synced", onchainId: "pending:player:0xabc" },
        createdAt: "2026-03-25T00:00:00.000Z",
        updatedAt: "2026-03-25T00:00:00.000Z",
      });
    }

    if (parsedUrl.pathname === "/api/x/status") {
      return createJsonResponse({
        mode: "local_upload",
        enabled: true,
        canUpload: true,
        reason: "x local upload verification is enabled",
      });
    }

    if (parsedUrl.pathname === "/api/x/actions/upload") {
      uploadedActions.unshift({
        id: "x-action-1",
        ...body,
        status: "confirmed",
      });

      return createJsonResponse({
        action: uploadedActions[0],
        event: {
          id: "event-1",
          type: "x_action_verified",
          title: "X action verified",
          detail: "verified",
          createdAt: "2026-03-25T00:00:00.000Z",
          petId: body.petId,
        },
      });
    }

    if (parsedUrl.pathname === "/api/me/home") {
      return createJsonResponse({
        player: {
          walletAddress: "0xabc",
          xBinding: true,
        },
        events: [],
        xActions: uploadedActions,
        availableCommands: ["earn"],
      });
    }

    throw new Error(`unexpected request ${options.method ?? "GET"} ${parsedUrl.pathname}`);
  };

  const result = await runSmoke({
    baseUrl: "http://127.0.0.1:3001",
    fetchImpl,
    now: () => new Date("2026-03-25T00:00:00.000Z"),
    walletAddress: "0xabc",
  });

  assert.equal(
    calls.map((call) => call.path).join(","),
    [
      "/api/auth/challenge",
      "/api/auth/verify",
      "/api/players/bootstrap",
      "/api/x/status",
      "/api/x/actions/upload",
      "/api/me/home",
    ].join(","),
  );
  assert.equal(calls[4].body.tweetId, result.tweetId);
  assert.equal(calls[4].body.localProof, result.localProof);
  assert.equal(result.home.xActions[0].tweetId, result.tweetId);
  assert.equal(result.home.xActions[0].localProof, result.localProof);
  assert.equal(result.home.xActions[0].status, "confirmed");
});

function createJsonResponse(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async text() {
      return JSON.stringify(body);
    },
  };
}
