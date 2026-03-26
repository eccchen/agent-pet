import assert from "node:assert/strict";
import test from "node:test";

import { createOkxSkillWalletHost, OKX_XLAYER_TESTNET_CHAIN } from "./index.js";

test("OKX skill wallet host defaults to okx-agentic-wallet and reads addresses via wallet.addresses", async () => {
  const calls: Array<{ skill: string; action: string; payload?: Record<string, unknown> }> = [];

  const host = createOkxSkillWalletHost({
    invoker: {
      invoke: async <T>(skill: string, action: string, payload?: Record<string, unknown>) => {
        calls.push({ skill, action, payload });

        if (action === "wallet.addresses") {
          return {
            accountName: "Account 1",
            xlayer: [
              {
                address: "0x1111111111111111111111111111111111111111",
                chainIndex: "1952",
                chainName: "X Layer testnet",
              },
            ],
            evm: [
              {
                address: "0x2222222222222222222222222222222222222222",
                chainIndex: "1",
                chainName: "Ethereum",
              },
            ],
          } as T;
        }

        throw new Error(`Unexpected action: ${action}`);
      },
    },
  });

  const address = await host.getAddress();

  assert.equal(address, "0x1111111111111111111111111111111111111111");
  assert.equal(host.getSkillId(), "okx-agentic-wallet");
  assert.equal(calls[0]?.action, "wallet.addresses");
  assert.deepEqual(calls[0]?.payload, {
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
  });
});

test("OKX skill wallet host falls back to unsafe challenge signing when generic sign is unavailable", async () => {
  const host = createOkxSkillWalletHost({
    invoker: {
      invoke: async <T>() => {
        throw new Error("Unexpected invoke");
      },
    },
  });

  const signature = await host.signMessage("Sign this wallet challenge: nonce-123");

  assert.equal(signature, "signed:nonce-123");
  assert.equal(host.getSignMessageFallbackMode(), "unsafe_challenge");
});

test("OKX skill wallet host supports explicit sign/send action overrides", async () => {
  const calls: Array<{ skill: string; action: string; payload?: Record<string, unknown> }> = [];

  const host = createOkxSkillWalletHost({
    skillId: "okx/custom-wallet",
    actions: {
      ensureChain: "wallet.ensureChain",
      getAddress: "wallet.addresses",
      signMessage: "wallet.sign-message",
      sendTransaction: "wallet.contract-call",
    },
    signMessageFallbackMode: "disabled",
    invoker: {
      invoke: async <T>(skill: string, action: string, payload?: Record<string, unknown>) => {
        calls.push({ skill, action, payload });

        if (action === "wallet.ensureChain") {
          return { ok: true } as T;
        }

        if (action === "wallet.addresses") {
          return { data: { evm: [{ address: "0x3333333333333333333333333333333333333333" }] } } as T;
        }

        if (action === "wallet.sign-message") {
          return { signature: "0xsigned" } as T;
        }

        if (action === "wallet.contract-call") {
          return { txHash: "0xtx" } as T;
        }

        throw new Error(`Unexpected action: ${action}`);
      },
    },
  });

  const address = await host.getAddress();
  const signature = await host.signMessage("sign me");
  const txHash = await host.sendTransaction({
    chainId: OKX_XLAYER_TESTNET_CHAIN.chainIdDecimal,
    chainNamespaceId: OKX_XLAYER_TESTNET_CHAIN.namespaceChainId,
    to: "0xvault",
    data: "0x1234",
    value: "0xde0b6b3a7640000",
  });

  assert.equal(address, "0x3333333333333333333333333333333333333333");
  assert.equal(signature, "0xsigned");
  assert.equal(txHash, "0xtx");
  assert.equal(calls[0]?.action, "wallet.ensureChain");
  assert.equal(calls[1]?.action, "wallet.addresses");
  assert.equal(calls[2]?.action, "wallet.ensureChain");
  assert.equal(calls[3]?.action, "wallet.sign-message");
  assert.equal(calls[4]?.action, "wallet.ensureChain");
  assert.equal(calls[5]?.action, "wallet.contract-call");
  assert.deepEqual(calls[5]?.payload, {
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
    to: "0xvault",
    inputData: "0x1234",
    value: "1",
    tx: {
      chainId: 1952,
      chainNamespaceId: "eip155:1952",
      to: "0xvault",
      data: "0x1234",
      value: "0xde0b6b3a7640000",
    },
  });
});

test("OKX skill wallet host errors when generic sign is disabled and no sign action exists", async () => {
  const host = createOkxSkillWalletHost({
    signMessageFallbackMode: "disabled",
    invoker: {
      invoke: async <T>(_skill: string, action: string) => {
        if (action === "wallet.addresses") {
          return { xlayer: [{ address: "0x4444444444444444444444444444444444444444" }] } as T;
        }

        throw new Error(`Unexpected action: ${action}`);
      },
    },
  });

  await assert.rejects(
    async () => Promise.resolve(host.signMessage("Sign this wallet challenge: nonce-1")),
    /does not expose generic message signing/,
  );
});
