import type { OnchainTxIntent } from "@agent-game/openclaw-client";
import type { WalletHostAdapter } from "./skill.js";
import { OKX_XLAYER_TESTNET_CHAIN, type OkxEvmChainConfig } from "./okx-wallet-common.js";

export type SkillInvokePayload = Record<string, unknown> | undefined;

export type SkillInvoker = Readonly<{
  invoke<T>(skill: string, action: string, payload?: SkillInvokePayload): Promise<T>;
}>;

export type OkxSkillActionMap = Readonly<{
  ensureChain: string | null;
  getAddress: string;
  signMessage: string | null;
  sendTransaction: string;
}>;

export type OkxSignMessageFallbackMode = "disabled" | "unsafe_challenge";

export type CreateOkxSkillWalletHostInput = Readonly<{
  invoker: SkillInvoker;
  skillId?: string;
  chain?: OkxEvmChainConfig;
  actions?: Partial<OkxSkillActionMap>;
  signMessageFallbackMode?: OkxSignMessageFallbackMode;
}>;

export type OkxSkillWalletHost = WalletHostAdapter &
  Readonly<{
    ensureChainReady(): Promise<void>;
    getCurrentChain(): OkxEvmChainConfig;
    getSkillId(): string;
    getActions(): OkxSkillActionMap;
    getSignMessageFallbackMode(): OkxSignMessageFallbackMode;
  }>;

const DEFAULT_OKX_SKILL_ID = "okx-agentic-wallet";

const DEFAULT_ACTIONS: OkxSkillActionMap = {
  ensureChain: null,
  getAddress: "wallet.addresses",
  signMessage: null,
  sendTransaction: "wallet.contract-call",
};

function extractString(
  source: Record<string, unknown> | null | undefined,
  keys: readonly string[],
): string | null {
  if (!source) {
    return null;
  }

  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value.length > 0) {
      return value;
    }
  }

  return null;
}

function walkForAddress(node: unknown, preferredChainIndexes: readonly number[]): string | null {
  if (!node) {
    return null;
  }

  if (typeof node === "string") {
    return /^0x[a-fA-F0-9]{40}$/.test(node) ? node : null;
  }

  if (Array.isArray(node)) {
    const sorted = [...node].sort((left, right) => {
      const leftIndex = typeof left === "object" && left && "chainIndex" in left
        ? preferredChainIndexes.indexOf(Number((left as Record<string, unknown>).chainIndex))
        : Number.MAX_SAFE_INTEGER;
      const rightIndex = typeof right === "object" && right && "chainIndex" in right
        ? preferredChainIndexes.indexOf(Number((right as Record<string, unknown>).chainIndex))
        : Number.MAX_SAFE_INTEGER;
      return leftIndex - rightIndex;
    });

    for (const entry of sorted) {
      const found = walkForAddress(entry, preferredChainIndexes);
      if (found) {
        return found;
      }
    }

    return null;
  }

  if (typeof node === "object") {
    const record = node as Record<string, unknown>;
    const direct =
      extractString(record, ["address", "walletAddress", "evmAddress"]) ??
      extractString(record, ["xlayerAddress", "xLayerAddress"]);

    if (direct && /^0x[a-fA-F0-9]{40}$/.test(direct)) {
      return direct;
    }

    for (const value of Object.values(record)) {
      const found = walkForAddress(value, preferredChainIndexes);
      if (found) {
        return found;
      }
    }
  }

  return null;
}

function normalizeAddressResult(result: unknown, chain: OkxEvmChainConfig): string {
  const preferredChainIndexes = [chain.chainIdDecimal, 196, 1952, 1];
  const address = walkForAddress(result, preferredChainIndexes);

  if (!address) {
    throw new Error("OKX skill bridge did not return an address.");
  }

  return address;
}

function extractNonceForUnsafeChallenge(message: string): string | null {
  const prefix = "Sign this wallet challenge: ";
  if (message.startsWith(prefix)) {
    const nonce = message.slice(prefix.length).trim();
    return nonce.length > 0 ? nonce : null;
  }

  return null;
}

function formatUnitsFromHex(valueHex: string, decimals: number): string {
  if (!/^0x[0-9a-fA-F]+$/.test(valueHex)) {
    return valueHex;
  }

  const value = BigInt(valueHex);
  if (value === 0n) {
    return "0";
  }

  const base = 10n ** BigInt(decimals);
  const whole = value / base;
  const fraction = value % base;

  if (fraction === 0n) {
    return whole.toString();
  }

  const padded = fraction.toString().padStart(decimals, "0").replace(/0+$/, "");
  return `${whole.toString()}.${padded}`;
}

function buildChainPayload(chain: OkxEvmChainConfig): Record<string, unknown> {
  return {
    chain: chain.chainIdDecimal,
    chainId: chain.chainIdDecimal,
    chainIdHex: chain.chainIdHex,
    chainName: chain.chainName,
    chainNamespaceId: chain.namespaceChainId,
    rpcUrl: chain.rpcUrl,
    blockExplorerUrls: [...chain.blockExplorerUrls],
    nativeCurrency: chain.nativeCurrency,
  };
}

function buildContractCallPayload(
  chain: OkxEvmChainConfig,
  tx: OnchainTxIntent,
): Record<string, unknown> {
  return {
    ...buildChainPayload(chain),
    to: tx.to,
    inputData: tx.data,
    value: formatUnitsFromHex(tx.value, chain.nativeCurrency.decimals),
    tx,
  };
}

export function createOkxSkillWalletHost({
  invoker,
  skillId = DEFAULT_OKX_SKILL_ID,
  chain = OKX_XLAYER_TESTNET_CHAIN,
  actions,
  signMessageFallbackMode = "unsafe_challenge",
}: CreateOkxSkillWalletHostInput): OkxSkillWalletHost {
  const actionMap: OkxSkillActionMap = {
    ...DEFAULT_ACTIONS,
    ...actions,
  };

  async function ensureChainReady(): Promise<void> {
    if (!actionMap.ensureChain) {
      return;
    }

    await invoker.invoke(skillId, actionMap.ensureChain, buildChainPayload(chain));
  }

  async function getAddress(): Promise<string> {
    await ensureChainReady();

    const result = await invoker.invoke(
      skillId,
      actionMap.getAddress,
      buildChainPayload(chain),
    );

    return normalizeAddressResult(result, chain);
  }

  async function signMessage(message: string): Promise<string> {
    await ensureChainReady();

    if (actionMap.signMessage) {
      const result = await invoker.invoke(skillId, actionMap.signMessage, {
        ...buildChainPayload(chain),
        message,
      });

      const signature =
        (typeof result === "string" && result) ||
        extractString(result as Record<string, unknown> | null | undefined, ["signature", "result"]);

      if (signature) {
        return signature;
      }

      throw new Error("OKX skill bridge did not return a signature.");
    }

    if (signMessageFallbackMode === "unsafe_challenge") {
      const nonce = extractNonceForUnsafeChallenge(message);
      if (nonce) {
        return `signed:${nonce}`;
      }
    }

    throw new Error(
      "okx-agentic-wallet does not expose generic message signing through the current bridge.",
    );
  }

  async function sendTransaction(tx: OnchainTxIntent): Promise<string> {
    await ensureChainReady();

    const result = await invoker.invoke(skillId, actionMap.sendTransaction, buildContractCallPayload(chain, tx));

    const txHash =
      (typeof result === "string" && result) ||
      extractString(result as Record<string, unknown> | null | undefined, ["txHash", "hash", "result"]);

    if (!txHash) {
      throw new Error("OKX skill bridge did not return a transaction hash.");
    }

    return txHash;
  }

  return {
    ensureChainReady,
    getCurrentChain() {
      return chain;
    },
    getSkillId() {
      return skillId;
    },
    getActions() {
      return actionMap;
    },
    getSignMessageFallbackMode() {
      return signMessageFallbackMode;
    },
    getAddress,
    signMessage,
    sendTransaction,
  };
}
