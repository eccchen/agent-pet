export type OkxEvmChainConfig = Readonly<{
  namespaceChainId: string;
  chainIdDecimal: number;
  chainIdHex: string;
  chainName: string;
  rpcUrl: string;
  blockExplorerUrls: readonly string[];
  nativeCurrency: Readonly<{
    name: string;
    symbol: string;
    decimals: number;
  }>;
}>;

export const OKX_XLAYER_TESTNET_CHAIN: OkxEvmChainConfig = {
  namespaceChainId: "eip155:1952",
  chainIdDecimal: 1952,
  chainIdHex: "0x7A0",
  chainName: "X Layer testnet",
  rpcUrl: "https://xlayertestrpc.okx.com/terigon",
  blockExplorerUrls: ["https://www.okx.com/web3/explorer/xlayer-test"],
  nativeCurrency: {
    name: "OKB",
    symbol: "OKB",
    decimals: 18,
  },
};

export const OKX_XLAYER_MAINNET_CHAIN: OkxEvmChainConfig = {
  namespaceChainId: "eip155:196",
  chainIdDecimal: 196,
  chainIdHex: "0xC4",
  chainName: "X Layer",
  rpcUrl: "https://rpc.xlayer.tech",
  blockExplorerUrls: ["https://www.okx.com/web3/explorer/xlayer"],
  nativeCurrency: {
    name: "OKB",
    symbol: "OKB",
    decimals: 18,
  },
};

export function toPersonalSignHex(message: string): string {
  if (/^0x[0-9a-fA-F]*$/.test(message)) {
    return message;
  }

  return `0x${Buffer.from(message, "utf8").toString("hex")}`;
}
