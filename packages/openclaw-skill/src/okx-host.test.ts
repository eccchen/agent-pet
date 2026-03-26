import assert from "node:assert/strict";
import test from "node:test";

import { createOkxUniversalWalletHost } from "./okx-host.js";
import { OKX_XLAYER_TESTNET_CHAIN, toPersonalSignHex } from "./okx-wallet-common.js";

test("toPersonalSignHex encodes plain utf-8 messages and preserves hex input", () => {
  assert.equal(toPersonalSignHex("hello"), "0x68656c6c6f");
  assert.equal(toPersonalSignHex("0x1234"), "0x1234");
});

test("wallet host connects to X Layer testnet and returns the first account", async () => {
  const calls: Array<{ kind: "connect" | "request"; payload: unknown; chain?: string }> = [];

  const host = createOkxUniversalWalletHost({
    provider: {
      connected: () => false,
      connect: async (params) => {
        calls.push({ kind: "connect", payload: params });
        return undefined;
      },
      request: async (args, chain) => {
        calls.push({ kind: "request", payload: args, chain });
        if (args.method === "wallet_switchEthereumChain") {
          return null;
        }

        if (args.method === "eth_requestAccounts") {
          return ["0xabc"];
        }

        throw new Error(`Unexpected method: ${args.method}`);
      },
    },
  });

  const address = await host.getAddress();

  assert.equal(address, "0xabc");
  assert.equal(calls[0]?.kind, "connect");
  assert.deepEqual((calls[0]?.payload as { namespaces: unknown }).namespaces, {
    eip155: {
      chains: [OKX_XLAYER_TESTNET_CHAIN.namespaceChainId],
      defaultChain: String(OKX_XLAYER_TESTNET_CHAIN.chainIdDecimal),
      rpcMap: {
        [String(OKX_XLAYER_TESTNET_CHAIN.chainIdDecimal)]: OKX_XLAYER_TESTNET_CHAIN.rpcUrl,
      },
    },
  });
  assert.equal(calls[1]?.chain, "eip155:1952");
  assert.equal(calls[2]?.chain, "eip155:1952");
});

test("wallet host adds the chain when switch fails and signs with personal_sign", async () => {
  const methods: string[] = [];

  const host = createOkxUniversalWalletHost({
    provider: {
      connected: () => true,
      connect: async () => undefined,
      request: async (args) => {
        methods.push(args.method);

        if (args.method === "wallet_switchEthereumChain") {
          throw new Error("CHAIN_NOT_SUPPORTED");
        }

        if (args.method === "wallet_addEthereumChain") {
          return null;
        }

        if (args.method === "eth_requestAccounts") {
          return ["0xdef"];
        }

        if (args.method === "personal_sign") {
          assert.deepEqual(args.params, ["0x7369676e206d65", "0xdef"]);
          return "0xsigned";
        }

        throw new Error(`Unexpected method: ${args.method}`);
      },
    },
  });

  const signature = await host.signMessage("sign me");

  assert.equal(signature, "0xsigned");
  assert.deepEqual(methods, [
    "wallet_switchEthereumChain",
    "wallet_addEthereumChain",
    "eth_requestAccounts",
    "personal_sign",
  ]);
});
