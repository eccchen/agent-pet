import type { OnchainTxIntent } from "@agent-game/openclaw-client";
import type { WalletHostAdapter } from "./skill.js";
import {
  OKX_XLAYER_TESTNET_CHAIN,
  toPersonalSignHex,
  type OkxEvmChainConfig,
} from "./okx-wallet-common.js";

export type OkxUniversalRequestArgs = Readonly<{
  method: string;
  params?: unknown[] | Record<string, unknown>;
  redirect?: string;
}>;

export type OkxUniversalConnectParams = Readonly<{
  namespaces: {
    eip155: {
      chains: string[];
      defaultChain?: string;
      rpcMap?: Record<string, string>;
    };
  };
  sessionConfig?: {
    redirect?: string;
  };
}>;

export type OkxUniversalProviderLike = Readonly<{
  connected(): boolean;
  connect(params: OkxUniversalConnectParams): Promise<unknown>;
  request(args: OkxUniversalRequestArgs, chain?: string): Promise<unknown>;
}>;

export type CreateOkxUniversalWalletHostInput = Readonly<{
  provider: OkxUniversalProviderLike;
  chain?: OkxEvmChainConfig;
  redirect?: string;
}>;

export type OkxUniversalWalletHost = WalletHostAdapter &
  Readonly<{
    ensureConnected(): Promise<void>;
    ensureChainReady(): Promise<void>;
    getCurrentChain(): OkxEvmChainConfig;
  }>;

export function createOkxUniversalWalletHost({
  provider,
  chain = OKX_XLAYER_TESTNET_CHAIN,
  redirect,
}: CreateOkxUniversalWalletHostInput): OkxUniversalWalletHost {
  async function ensureConnected(): Promise<void> {
    if (provider.connected()) {
      return;
    }

    await provider.connect({
      namespaces: {
        eip155: {
          chains: [chain.namespaceChainId],
          defaultChain: String(chain.chainIdDecimal),
          rpcMap: {
            [String(chain.chainIdDecimal)]: chain.rpcUrl,
          },
        },
      },
      sessionConfig: redirect ? { redirect } : undefined,
    });
  }

  async function ensureChainReady(): Promise<void> {
    await ensureConnected();

    try {
      await provider.request(
        {
          method: "wallet_switchEthereumChain",
          params: [{ chainId: chain.chainIdHex }],
        },
        chain.namespaceChainId,
      );
    } catch {
      await provider.request(
        {
          method: "wallet_addEthereumChain",
          params: [
            {
              blockExplorerUrls: [...chain.blockExplorerUrls],
              chainId: chain.chainIdHex,
              chainName: chain.chainName,
              nativeCurrency: chain.nativeCurrency,
              rpcUrls: [chain.rpcUrl],
            },
          ],
        },
        chain.namespaceChainId,
      );
    }
  }

  async function getAddress(): Promise<string> {
    await ensureChainReady();

    const accounts = await provider.request(
      { method: "eth_requestAccounts" },
      chain.namespaceChainId,
    );

    if (!Array.isArray(accounts) || accounts.length === 0 || typeof accounts[0] !== "string") {
      throw new Error("OKX wallet did not return an EVM account.");
    }

    return accounts[0];
  }

  async function signMessage(message: string): Promise<string> {
    const address = await getAddress();
    const signature = await provider.request(
      {
        method: "personal_sign",
        params: [toPersonalSignHex(message), address],
      },
      chain.namespaceChainId,
    );

    if (typeof signature !== "string") {
      throw new Error("OKX wallet did not return a signature.");
    }

    return signature;
  }

  async function sendTransaction(tx: OnchainTxIntent): Promise<string> {
    const address = await getAddress();
    const txHash = await provider.request(
      {
        method: "eth_sendTransaction",
        params: [
          {
            from: address,
            to: tx.to,
            data: tx.data,
            value: tx.value,
          },
        ],
      },
      tx.chainNamespaceId,
    );

    if (typeof txHash !== "string") {
      throw new Error("OKX wallet did not return a transaction hash.");
    }

    return txHash;
  }

  return {
    ensureConnected,
    ensureChainReady,
    getCurrentChain() {
      return chain;
    },
    getAddress,
    signMessage,
    sendTransaction,
  };
}
