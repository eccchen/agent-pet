import test from "node:test";
import assert from "node:assert/strict";

import { BigNumber, Wallet, providers, utils } from "ethers";

import { createXLayerChainSyncAdapter } from "./chain-sync";

test("confirmPlayerOnchain accepts zero-value transactions emitted as 0x00", async () => {
  const walletAddress = "0x453dAaCA6048C7bc93210C92205CfE2b617A5e7A";
const registryAddress = "0x1111111111111111111111111111111111111111";
const vaultAddress = "0x2222222222222222222222222222222222222222";
  const txHash = `0x${"11".repeat(32)}`;

  const transaction: Partial<providers.TransactionResponse> = {
    hash: txHash,
    from: walletAddress,
    to: registryAddress,
    data: new utils.Interface(["function registerPlayer()"]).encodeFunctionData("registerPlayer", []),
    value: BigNumber.from(0),
  };

  const eventInterface = new utils.Interface([
    "event PlayerRegistered(address indexed player)",
  ]);
  const encodedEvent = eventInterface.encodeEventLog(
    eventInterface.getEvent("PlayerRegistered"),
    [walletAddress],
  );

  const receipt: Partial<providers.TransactionReceipt> = {
    status: 1,
    logs: [
      {
        address: registryAddress,
        topics: encodedEvent.topics,
        data: encodedEvent.data,
      } as providers.Log,
    ],
  };

  const getTransaction = providers.JsonRpcProvider.prototype.getTransaction;
  const getTransactionReceipt = providers.JsonRpcProvider.prototype.getTransactionReceipt;

  providers.JsonRpcProvider.prototype.getTransaction = async function (hash: string) {
    assert.equal(hash, txHash);
    return transaction as providers.TransactionResponse;
  };

  providers.JsonRpcProvider.prototype.getTransactionReceipt = async function (hash: string) {
    assert.equal(hash, txHash);
    return receipt as providers.TransactionReceipt;
  };

  try {
    const adapter = createXLayerChainSyncAdapter({
      rpcUrl: "https://xlayertestrpc.okx.com/terigon",
      registryAddress,
      vaultAddress,
      now: () => new Date("2026-03-24T00:00:00.000Z"),
    });

    const result = await adapter.confirmPlayerOnchain({
      walletAddress,
      txHash,
      current: {
        syncStatus: "pending",
        onchainId: `pending:player:${walletAddress.toLowerCase()}`,
        lastSyncedAt: null,
      },
    });

    assert.equal(result.syncStatus, "synced");
    assert.equal(result.onchainId, walletAddress);
  } finally {
    providers.JsonRpcProvider.prototype.getTransaction = getTransaction;
    providers.JsonRpcProvider.prototype.getTransactionReceipt = getTransactionReceipt;
  }
});

test("buildClaimIntent encodes a real claim contract call", () => {
  const claimSignerPrivateKey = "0x59c6995e998f97a5a0044966f094538e3b35f9e1f23e7f4f5f57d5a5d7f72d64";
  const claimVaultAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  const adapter = createXLayerChainSyncAdapter({
    chainId: 196,
    rpcUrl: "https://xlayerrpc.okx.com",
      registryAddress: "0x1111111111111111111111111111111111111111",
      vaultAddress: "0x2222222222222222222222222222222222222222",
    claimVaultAddress,
    claimSignerPrivateKey,
    claimIntentExpirySeconds: 3600,
    now: () => new Date("2026-03-25T08:00:00.000Z"),
  });

  const intent = adapter.buildClaimIntent({
    walletAddress: "0x453dAaCA6048C7bc93210C92205CfE2b617A5e7A",
    claimId: "claim-123",
    amount: 40,
  });

  assert.equal(intent.to, utils.getAddress(claimVaultAddress));
  assert.equal(intent.value, "0x0");
  assert.equal(intent.data.startsWith("0x"), true);
  assert.notEqual(intent.data, "0x");
});

test("confirmClaimOnchain validates a claimed event against the generated intent", async () => {
  const walletAddress = "0x453dAaCA6048C7bc93210C92205CfE2b617A5e7A";
  const claimVaultAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  const claimSignerPrivateKey = "0x59c6995e998f97a5a0044966f094538e3b35f9e1f23e7f4f5f57d5a5d7f72d64";
  const txHash = `0x${"22".repeat(32)}`;
  const adapter = createXLayerChainSyncAdapter({
    chainId: 196,
    rpcUrl: "https://xlayerrpc.okx.com",
      registryAddress: "0x1111111111111111111111111111111111111111",
      vaultAddress: "0x2222222222222222222222222222222222222222",
    claimVaultAddress,
    claimSignerPrivateKey,
    claimIntentExpirySeconds: 3600,
    now: () => new Date("2026-03-25T08:00:00.000Z"),
  });
  const intent = adapter.buildClaimIntent({
    walletAddress,
    claimId: "claim-abc",
    amount: 55,
  });

  const transaction: Partial<providers.TransactionResponse> = {
    hash: txHash,
    from: walletAddress,
    to: claimVaultAddress,
    data: intent.data,
    value: BigNumber.from(0),
  };

  const claimInterface = new utils.Interface([
    "event Claimed(bytes32 indexed claimId, address indexed recipient, uint256 amount, address indexed signer, uint256 expiry)",
  ]);
  const decoded = new utils.Interface([
    "function claim(bytes32 claimId, uint256 amount, uint256 expiry, bytes signature)",
  ]).decodeFunctionData("claim", intent.data);
  const encodedEvent = claimInterface.encodeEventLog(claimInterface.getEvent("Claimed"), [
    decoded.claimId,
    walletAddress,
    decoded.amount,
    new Wallet(claimSignerPrivateKey).address,
    decoded.expiry,
  ]);

  const receipt: Partial<providers.TransactionReceipt> = {
    status: 1,
    logs: [
      {
        address: claimVaultAddress,
        topics: encodedEvent.topics,
        data: encodedEvent.data,
      } as providers.Log,
    ],
  };

  const getTransaction = providers.JsonRpcProvider.prototype.getTransaction;
  const getTransactionReceipt = providers.JsonRpcProvider.prototype.getTransactionReceipt;

  providers.JsonRpcProvider.prototype.getTransaction = async function (hash: string) {
    assert.equal(hash, txHash);
    return transaction as providers.TransactionResponse;
  };

  providers.JsonRpcProvider.prototype.getTransactionReceipt = async function (hash: string) {
    assert.equal(hash, txHash);
    return receipt as providers.TransactionReceipt;
  };

  try {
    await adapter.confirmClaimOnchain({
      walletAddress,
      claimId: "claim-abc",
      amount: 55,
      txHash,
      intent,
    });
  } finally {
    providers.JsonRpcProvider.prototype.getTransaction = getTransaction;
    providers.JsonRpcProvider.prototype.getTransactionReceipt = getTransactionReceipt;
  }
});
