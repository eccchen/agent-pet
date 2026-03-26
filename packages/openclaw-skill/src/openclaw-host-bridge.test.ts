import assert from "node:assert/strict";
import test from "node:test";

import {
  createOkxOpenClawWalletHost,
  createOpenClawHostSkillInvoker,
  OKX_XLAYER_TESTNET_CHAIN,
} from "./index.js";

test("createOpenClawHostSkillInvoker maps action names into OpenClaw operation calls", async () => {
  const calls: Array<{ skill: string; operation: string; payload?: Record<string, unknown> }> = [];

  const invoker = createOpenClawHostSkillInvoker({
    invokeSkill: async <T>({ skill, operation, payload }: { skill: string; operation: string; payload?: Record<string, unknown> }) => {
      calls.push({ skill, operation, payload });
      return "0xabc" as T;
    },
  });

  const result = await invoker.invoke<string>("okx-agentic-wallet", "wallet.addresses", {
    chainId: 1952,
  });

  assert.equal(result, "0xabc");
  assert.deepEqual(calls, [
    {
      skill: "okx-agentic-wallet",
      operation: "wallet.addresses",
      payload: { chainId: 1952 },
    },
  ]);
});

test("createOkxOpenClawWalletHost wraps an OpenClaw host callback into WalletHostAdapter", async () => {
  const calls: Array<{ skill: string; operation: string; payload?: Record<string, unknown> }> = [];

  const wallet = createOkxOpenClawWalletHost({
    host: async <T>({ skill, operation, payload }: { skill: string; operation: string; payload?: Record<string, unknown> }) => {
      calls.push({ skill, operation, payload });

      switch (operation) {
        case "wallet.addresses":
          return {
            xlayer: [{ address: "0x1111111111111111111111111111111111111111" }],
          } as T;
        case "wallet.sign-message":
          return { signature: "0xsigned" } as T;
        case "wallet.contract-call":
          return { txHash: "0xtx" } as T;
        default:
          throw new Error(`Unexpected operation: ${operation}`);
      }
    },
    actions: {
      signMessage: "wallet.sign-message",
    },
    signMessageFallbackMode: "disabled",
  });

  assert.equal(await wallet.getAddress(), "0x1111111111111111111111111111111111111111");
  assert.equal(await wallet.signMessage("openclaw"), "0xsigned");
  assert.equal(
    await wallet.sendTransaction({
      chainId: OKX_XLAYER_TESTNET_CHAIN.chainIdDecimal,
      chainNamespaceId: OKX_XLAYER_TESTNET_CHAIN.namespaceChainId,
      to: "0xregistry",
      data: "0x1234",
      value: "0x0",
    }),
    "0xtx",
  );

  assert.equal(calls[0]?.skill, "okx-agentic-wallet");
  assert.equal(calls[0]?.operation, "wallet.addresses");
  assert.equal(calls[1]?.operation, "wallet.sign-message");
  assert.equal(calls[2]?.operation, "wallet.contract-call");
  assert.deepEqual(calls[2]?.payload, {
    chain: 1952,
    chainId: 1952,
    chainIdHex: "0x7A0",
    chainName: "X Layer testnet",
    chainNamespaceId: "eip155:1952",
    rpcUrl: "https://xlayertestrpc.okx.com/terigon",
    blockExplorerUrls: ["https://www.okx.com/web3/explorer/xlayer-test"],
    nativeCurrency: {
      name: "OKB",
      symbol: "OKB",
      decimals: 18,
    },
    to: "0xregistry",
    inputData: "0x1234",
    value: "0",
    tx: {
      chainId: 1952,
      chainNamespaceId: "eip155:1952",
      to: "0xregistry",
      data: "0x1234",
      value: "0x0",
    },
  });
});
