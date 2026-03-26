import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  loadOpenClawHostInvokerFromModule,
} from "./openclaw-host-smoke.js";
import { loadOpenClawHostSmokeConfig } from "./openclaw-host-smoke-config.js";

test("loadOpenClawHostSmokeConfig reads the OpenClaw smoke defaults", () => {
  const config = loadOpenClawHostSmokeConfig({
    AGENT_GAME_BASE_URL: "http://localhost:3001",
  });

  assert.equal(config.baseUrl, "http://localhost:3001");
  assert.equal(config.invokeSkillModule, null);
  assert.equal(config.petId, "starter-pet");
  assert.equal(config.spendableBudget, 250);
  assert.equal(config.singleTxLimit, 75);
  assert.equal(config.dailyLimit, 300);
});

test("loadOpenClawHostInvokerFromModule supports named, default, and host exports", async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "openclaw-host-smoke-"));
  const namedModulePath = path.join(tempDir, "named.mjs");
  const defaultModulePath = path.join(tempDir, "default.mjs");
  const hostModulePath = path.join(tempDir, "host.mjs");

  fs.writeFileSync(
    namedModulePath,
    "export const invokeSkill = async (input) => ({ kind: 'named', input });",
  );
  fs.writeFileSync(defaultModulePath, "export default async (input) => ({ kind: 'default', input });");
  fs.writeFileSync(
    hostModulePath,
    "export const host = { invokeSkill: async (input) => ({ kind: 'host', input }) };",
  );

  const named = await loadOpenClawHostInvokerFromModule(namedModulePath);
  const defaultHost = await loadOpenClawHostInvokerFromModule(defaultModulePath);
  const host = await loadOpenClawHostInvokerFromModule(hostModulePath);

  assert.equal(typeof named, "function");
  assert.equal(typeof defaultHost, "function");
  assert.equal(typeof host, "object");

  const namedInvoker = named as unknown as (input: {
    skill: string;
    operation: string;
    payload?: Record<string, unknown>;
  }) => Promise<unknown>;
  const defaultInvoker = defaultHost as unknown as (input: {
    skill: string;
    operation: string;
    payload?: Record<string, unknown>;
  }) => Promise<unknown>;
  const hostInvoker = host as unknown as { invokeSkill: typeof namedInvoker };

  assert.deepEqual(
    await namedInvoker({ skill: "skill", operation: "action", payload: { a: 1 } }),
    {
      kind: "named",
      input: {
        skill: "skill",
        operation: "action",
        payload: { a: 1 },
      },
    },
  );
  assert.deepEqual(await defaultInvoker({ skill: "skill", operation: "action", payload: { a: 2 } }), {
    kind: "default",
    input: {
      skill: "skill",
      operation: "action",
      payload: { a: 2 },
    },
  });
  assert.deepEqual(await hostInvoker.invokeSkill({ skill: "skill", operation: "action", payload: { a: 3 } }), {
    kind: "host",
    input: {
      skill: "skill",
      operation: "action",
      payload: { a: 3 },
    },
  });
});

test("loadOpenClawHostInvokerFromModule supports factory exports", async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "openclaw-host-factory-"));
  const createInvokeSkillModulePath = path.join(tempDir, "create-invoke-skill.mjs");
  const createHostModulePath = path.join(tempDir, "create-host.mjs");

  fs.writeFileSync(
    createInvokeSkillModulePath,
    `
      export function createInvokeSkill() {
        return async (input) => ({ kind: "factory-invoke-skill", input });
      }
    `,
  );

  fs.writeFileSync(
    createHostModulePath,
    `
      export function createHost() {
        return {
          invokeSkill: async (input) => ({ kind: "factory-host", input }),
        };
      }
    `,
  );

  const createdInvoker = await loadOpenClawHostInvokerFromModule(createInvokeSkillModulePath);
  const createdHost = await loadOpenClawHostInvokerFromModule(createHostModulePath);

  const invokeSkill = createdInvoker as unknown as (input: {
    skill: string;
    operation: string;
    payload?: Record<string, unknown>;
  }) => Promise<unknown>;
  const host = createdHost as unknown as {
    invokeSkill: typeof invokeSkill;
  };

  assert.deepEqual(
    await invokeSkill({ skill: "skill", operation: "action", payload: { a: 4 } }),
    {
      kind: "factory-invoke-skill",
      input: {
        skill: "skill",
        operation: "action",
        payload: { a: 4 },
      },
    },
  );
  assert.deepEqual(
    await host.invokeSkill({ skill: "skill", operation: "action", payload: { a: 5 } }),
    {
      kind: "factory-host",
      input: {
        skill: "skill",
        operation: "action",
        payload: { a: 5 },
      },
    },
  );
});
