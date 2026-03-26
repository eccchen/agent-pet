import assert from "node:assert/strict";
import test from "node:test";

import { loadRealHostSmokeConfig } from "./real-host-config.js";

test("loadRealHostSmokeConfig reads required values and defaults the connect metadata", () => {
  const config = loadRealHostSmokeConfig({
    AGENT_GAME_BASE_URL: "http://localhost:3001",
    OKX_DAPP_NAME: "Agent Game",
    OKX_DAPP_ICON: "https://example.com/icon.png",
  });

  assert.equal(config.baseUrl, "http://localhost:3001");
  assert.equal(config.dappName, "Agent Game");
  assert.equal(config.dappIcon, "https://example.com/icon.png");
  assert.equal(config.redirect, "none");
  assert.equal(config.petId, "starter-pet");
  assert.equal(config.spendableBudget, 250);
  assert.equal(config.singleTxLimit, 75);
  assert.equal(config.dailyLimit, 300);
});

test("loadRealHostSmokeConfig rejects missing baseUrl", () => {
  assert.throws(
    () =>
      loadRealHostSmokeConfig({
        OKX_DAPP_NAME: "Agent Game",
        OKX_DAPP_ICON: "https://example.com/icon.png",
      }),
    /AGENT_GAME_BASE_URL/,
  );
});
