import test from "node:test";
import assert from "node:assert/strict";

import { loadConfig } from "./config";

test("loadConfig requires an explicit AUTH_MODE", () => {
  assert.throws(
    () =>
      loadConfig({
        PORT: "3001",
      }),
    /AUTH_MODE must be explicitly set/i,
  );
});

test("loadConfig rejects unknown AUTH_MODE values", () => {
  assert.throws(
    () =>
      loadConfig({
        AUTH_MODE: "something-else",
        PORT: "3001",
      }),
    /Unsupported AUTH_MODE/i,
  );
});

test("loadConfig accepts explicit unsafe and eip191 auth modes", () => {
  assert.equal(
    loadConfig({
      AUTH_MODE: "unsafe",
      PORT: "3001",
    }).authMode,
    "unsafe",
  );

  assert.equal(
    loadConfig({
      AUTH_MODE: "eip191",
      PORT: "3001",
    }).authMode,
    "eip191",
  );
});

test("loadConfig reads system agent toggles", () => {
  const config = loadConfig({
    AUTH_MODE: "unsafe",
    PORT: "3001",
    SYSTEM_AGENTS_ENABLED: "true",
    SYSTEM_AGENT_TICK_INTERVAL_MS: "15000",
  });

  assert.equal(config.systemAgentsEnabled, true);
  assert.equal(config.systemAgentTickIntervalMs, 15000);
});
