import assert from "node:assert/strict";
import test from "node:test";

import { createOnchainosCliHost } from "./onchainos-cli-host.js";

test("createOnchainosCliHost maps testnet address lookups onto supported X Layer mainnet address reads", async () => {
  const seenArgs: string[][] = [];
  const host = createOnchainosCliHost({
    runner: async (args) => {
      seenArgs.push([...args]);
      return {
        stdout: JSON.stringify({
          ok: true,
          data: {
            xlayer: [{ address: "0x881c6722397bf536edc1b766b10386aab62e4fa9", chainIndex: "196" }],
          },
        }),
        stderr: "",
      };
    },
  });

  const result = await host({
    skill: "okx-agentic-wallet",
    operation: "wallet.addresses",
    payload: { chainId: 1952 },
  });

  assert.deepEqual(seenArgs, [["wallet", "addresses", "--chain", "196"]]);
  assert.deepEqual(result, {
    xlayer: [{ address: "0x881c6722397bf536edc1b766b10386aab62e4fa9", chainIndex: "196" }],
  });
});

test("createOnchainosCliHost supports unsafe challenge signing only when explicitly enabled", async () => {
  const host = createOnchainosCliHost({
    allowUnsafeSign: true,
    runner: async () => {
      throw new Error("runner should not be called for unsafe challenge signing");
    },
  });

  const result = await host({
    skill: "okx-agentic-wallet",
    operation: "wallet.sign-message",
    payload: { message: "Sign this wallet challenge: abc123" },
  });

  assert.deepEqual(result, {
    signature: "signed:abc123",
  });
});

test("createOnchainosCliHost blocks unsupported testnet contract calls", async () => {
  const host = createOnchainosCliHost({
    runner: async () => {
      throw new Error("runner should not be called for blocked testnet contract calls");
    },
  });

  await assert.rejects(
    () =>
      host({
        skill: "okx-agentic-wallet",
        operation: "wallet.contract-call",
        payload: {
          chainId: 1952,
          to: "0x1111111111111111111111111111111111111111",
          inputData: "0x1234",
          value: "0",
        },
      }),
    /does not support X Layer testnet contract calls/i,
  );
});

