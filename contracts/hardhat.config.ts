import { config as loadEnv } from "dotenv";
import "@nomiclabs/hardhat-ethers";
import { HardhatUserConfig } from "hardhat/config";

loadEnv();

const xLayerTestnetRpcUrl = process.env.XLAYER_TESTNET_RPC_URL ?? "";
const xLayerRpcUrl = process.env.XLAYER_RPC_URL ?? "";
const deployerPrivateKey = process.env.DEPLOYER_PRIVATE_KEY ?? "";
const xLayerTestnetChainId = Number(process.env.XLAYER_TESTNET_CHAIN_ID ?? "1952");
const xLayerChainId = Number(process.env.XLAYER_CHAIN_ID ?? "196");

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  networks: {
    hardhat: {},
    xlayerTestnet: {
      url: xLayerTestnetRpcUrl,
      chainId: xLayerTestnetChainId,
      accounts: deployerPrivateKey ? [deployerPrivateKey] : [],
    },
    xlayer: {
      url: xLayerRpcUrl,
      chainId: xLayerChainId,
      accounts: deployerPrivateKey ? [deployerPrivateKey] : [],
    },
  },
};

export default config;
