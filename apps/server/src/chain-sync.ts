import { BigNumber, Contract, Wallet, providers, utils } from "ethers";

export type PetBudget = Readonly<{
  spendableBudget: number;
  singleTxLimit: number;
  dailyLimit: number;
}>;

export type ChainSyncStatus = "local" | "pending" | "synced" | "failed";

export type ChainSyncMetadata = Readonly<{
  syncStatus: ChainSyncStatus;
  onchainId: string;
  lastSyncedAt: string | null;
}>;

export type OnchainTxIntent = Readonly<{
  chainId: number;
  chainNamespaceId: string;
  to: string;
  data: string;
  value: string;
}>;

export type ChainSyncAdapter = Readonly<{
  syncPlayer(walletAddress: string): ChainSyncMetadata;
  syncPet(walletAddress: string, petId: string): ChainSyncMetadata;
  syncPetBudget(walletAddress: string, petId: string, budget: PetBudget): ChainSyncMetadata;
  buildRegisterPlayerIntent(walletAddress: string): OnchainTxIntent;
  buildCreatePetIntent(input: Readonly<{
    walletAddress: string;
    petId: string;
    petName: string;
  }>): OnchainTxIntent;
  buildSetPetBudgetIntent(input: Readonly<{
    walletAddress: string;
    petId: string;
    budget: PetBudget;
    current?: ChainSyncMetadata | null;
  }>): OnchainTxIntent | null;
  buildClaimIntent(input: Readonly<{
    walletAddress: string;
    claimId: string;
    amount: number;
  }>): OnchainTxIntent;
  confirmPlayerOnchain(input: Readonly<{
    walletAddress: string;
    txHash: string;
    current?: ChainSyncMetadata | null;
  }>): Promise<ChainSyncMetadata>;
  confirmPetOnchain(input: Readonly<{
    walletAddress: string;
    petId: string;
    petName: string;
    txHash: string;
    current?: ChainSyncMetadata | null;
  }>): Promise<ChainSyncMetadata>;
  confirmPetBudgetOnchain(input: Readonly<{
    walletAddress: string;
    petId: string;
    budget: PetBudget;
    txHash: string;
    current?: ChainSyncMetadata | null;
  }>): Promise<ChainSyncMetadata>;
  confirmClaimOnchain(input: Readonly<{
    walletAddress: string;
    claimId: string;
    amount: number;
    txHash: string;
    intent?: OnchainTxIntent | null;
  }>): Promise<void>;
}>;

type ChainSyncClock = Readonly<{
  now: () => Date;
}>;

type XLayerChainSyncConfig = Readonly<{
  rpcUrl: string;
  registryAddress: string;
  vaultAddress: string;
  claimVaultAddress?: string | null;
  claimSignerPrivateKey?: string | null;
  claimIntentExpirySeconds?: number;
  now: () => Date;
  chainId?: number;
  chainNamespaceId?: string;
}>;

const defaultChainId = 1952;
const defaultChainNamespaceId = "eip155:1952";

const registryAbi = [
  "function registerPlayer()",
  "function createPet(string name) returns (uint256 petId)",
  "function isPlayerRegistered(address player) view returns (bool)",
  "event PlayerRegistered(address indexed player)",
  "event PetCreated(uint256 indexed petId, address indexed owner, string name)",
] as const;

const vaultAbi = [
  "function setBudget(uint256 petId, uint256 spendableBudget, uint256 singleTxLimit, uint256 dailyLimit)",
  "function petBudget(uint256 petId) view returns (uint256 deposited, uint256 spendableBudget, uint256 singleTxLimit, uint256 dailyLimit)",
] as const;

const claimVaultAbi = [
  "function claim(bytes32 claimId, uint256 amount, uint256 expiry, bytes signature)",
  "event Claimed(bytes32 indexed claimId, address indexed recipient, uint256 amount, address indexed signer, uint256 expiry)",
] as const;

function createPlaceholderId(entityType: "player" | "pet", entityId: string): string {
  return `pending:${entityType}:${entityId}`;
}

function createLocalSyncMetadata(
  entityType: "player" | "pet",
  entityId: string,
  now: () => Date,
): ChainSyncMetadata {
  return {
    syncStatus: "local",
    onchainId: createPlaceholderId(entityType, entityId),
    lastSyncedAt: now().toISOString(),
  };
}

function createFailedSyncMetadata(
  fallbackId: string,
  now: () => Date,
  current?: ChainSyncMetadata | null,
): ChainSyncMetadata {
  return {
    syncStatus: "failed",
    onchainId: current?.onchainId ?? fallbackId,
    lastSyncedAt: now().toISOString(),
  };
}

function createLocalConfirmMetadata(
  fallbackId: string,
  now: () => Date,
  current?: ChainSyncMetadata | null,
): ChainSyncMetadata {
  return {
    syncStatus: "local",
    onchainId: current?.onchainId ?? fallbackId,
    lastSyncedAt: now().toISOString(),
  };
}

function createSyncedMetadata(onchainId: string, now: () => Date): ChainSyncMetadata {
  return {
    syncStatus: "synced",
    onchainId,
    lastSyncedAt: now().toISOString(),
  };
}

function isPositiveIntegerString(value: string): boolean {
  return /^\d+$/.test(value) && Number(value) > 0;
}

function normalizeAddress(value: string): string {
  return utils.getAddress(value);
}

function normalizeHash(value: string): string {
  if (!/^0x[0-9a-fA-F]{64}$/.test(value)) {
    throw new Error("Invalid transaction hash.");
  }

  return value;
}

function createPendingIntent(chainId: number, chainNamespaceId: string): OnchainTxIntent {
  return {
    chainId,
    chainNamespaceId,
    to: "pending",
    data: "0x",
    value: "0x0",
  };
}

function toOnchainClaimId(claimId: string): string {
  return utils.keccak256(utils.toUtf8Bytes(claimId));
}

function toTokenUnits(amount: number): BigNumber {
  return utils.parseUnits(String(amount), 18);
}

export function createNoopChainSyncAdapter(clock: ChainSyncClock): ChainSyncAdapter {
  return {
    syncPlayer(walletAddress: string) {
      return createLocalSyncMetadata("player", walletAddress, clock.now);
    },
    syncPet(walletAddress: string, petId: string) {
      return createLocalSyncMetadata("pet", `${walletAddress}:${petId}`, clock.now);
    },
    syncPetBudget(walletAddress: string, petId: string, budget: PetBudget) {
      void budget;
      return createLocalSyncMetadata("pet", `${walletAddress}:${petId}`, clock.now);
    },
    buildRegisterPlayerIntent() {
      return createPendingIntent(defaultChainId, defaultChainNamespaceId);
    },
    buildCreatePetIntent() {
      return createPendingIntent(defaultChainId, defaultChainNamespaceId);
    },
    buildSetPetBudgetIntent() {
      return createPendingIntent(defaultChainId, defaultChainNamespaceId);
    },
    buildClaimIntent() {
      return createPendingIntent(defaultChainId, defaultChainNamespaceId);
    },
    async confirmPlayerOnchain({ walletAddress, current }) {
      return createLocalConfirmMetadata(
        current?.onchainId ?? createPlaceholderId("player", walletAddress),
        clock.now,
        current,
      );
    },
    async confirmPetOnchain({ walletAddress, petId, current }) {
      return createLocalConfirmMetadata(
        current?.onchainId ?? createPlaceholderId("pet", `${walletAddress}:${petId}`),
        clock.now,
        current,
      );
    },
    async confirmPetBudgetOnchain({ walletAddress, petId, current }) {
      return createLocalConfirmMetadata(
        current?.onchainId ?? createPlaceholderId("pet", `${walletAddress}:${petId}`),
        clock.now,
        current,
      );
    },
    async confirmClaimOnchain() {
      return;
    },
  };
}

export function createXLayerChainSyncAdapter(config: XLayerChainSyncConfig): ChainSyncAdapter {
  const provider = new providers.JsonRpcProvider(config.rpcUrl);
  const registryInterface = new utils.Interface(registryAbi);
  const vaultInterface = new utils.Interface(vaultAbi);
  const claimVaultInterface = new utils.Interface(claimVaultAbi);
  const chainId = config.chainId ?? defaultChainId;
  const chainNamespaceId = config.chainNamespaceId ?? defaultChainNamespaceId;
  const claimIntentExpirySeconds = config.claimIntentExpirySeconds ?? 3600;
  const normalizedClaimVaultAddress =
    config.claimVaultAddress && config.claimVaultAddress.trim().length > 0
      ? normalizeAddress(config.claimVaultAddress)
      : null;
  const claimSigner = config.claimSignerPrivateKey
    ? new Wallet(config.claimSignerPrivateKey)
    : null;

  function buildIntent(to: string, data: string, value = "0x0"): OnchainTxIntent {
    return {
      chainId,
      chainNamespaceId,
      to,
      data,
      value,
    };
  }

  async function readTransaction(txHash: string) {
    const normalizedHash = normalizeHash(txHash);
    const [transaction, receipt] = await Promise.all([
      provider.getTransaction(normalizedHash),
      provider.getTransactionReceipt(normalizedHash),
    ]);

    if (!transaction || !receipt || receipt.status !== 1) {
      throw new Error("Transaction was not mined successfully.");
    }

    return {
      transaction,
      receipt,
    };
  }

  function txMatchesBase(
    transaction: providers.TransactionResponse,
    walletAddress: string,
    to: string,
    data: string,
    value: string,
  ): boolean {
    return (
      normalizeAddress(transaction.from) === normalizeAddress(walletAddress) &&
      normalizeAddress(transaction.to ?? "") === normalizeAddress(to) &&
      transaction.data.toLowerCase() === data.toLowerCase() &&
      BigNumber.from(transaction.value).eq(BigNumber.from(value))
    );
  }

  function requireClaimInfrastructure() {
    if (!normalizedClaimVaultAddress) {
      throw new Error("Claim vault is not configured.");
    }
    if (!claimSigner) {
      throw new Error("Claim signer private key is not configured.");
    }

    return {
      claimVaultAddress: normalizedClaimVaultAddress,
      claimSigner,
    };
  }

  function buildClaimTransactionIntent(walletAddress: string, claimId: string, amount: number) {
    const { claimVaultAddress, claimSigner: configuredClaimSigner } = requireClaimInfrastructure();
    const normalizedWalletAddress = normalizeAddress(walletAddress);
    const onchainClaimId = toOnchainClaimId(claimId);
    const onchainAmount = toTokenUnits(amount);
    const expiry = Math.floor(config.now().getTime() / 1000) + claimIntentExpirySeconds;
    const digest = utils.keccak256(
      utils.defaultAbiCoder.encode(
        ["uint256", "address", "address", "bytes32", "uint256", "uint256"],
        [chainId, claimVaultAddress, normalizedWalletAddress, onchainClaimId, onchainAmount, expiry],
      ),
    );
    const signature = configuredClaimSigner._signingKey().signDigest(
      utils.hashMessage(utils.arrayify(digest)),
    );

    return buildIntent(
      claimVaultAddress,
      claimVaultInterface.encodeFunctionData("claim", [
        onchainClaimId,
        onchainAmount,
        expiry,
        utils.joinSignature(signature),
      ]),
    );
  }

  return {
    syncPlayer(walletAddress: string) {
      return createLocalSyncMetadata("player", walletAddress, config.now);
    },
    syncPet(walletAddress: string, petId: string) {
      return createLocalSyncMetadata("pet", `${walletAddress}:${petId}`, config.now);
    },
    syncPetBudget(walletAddress: string, petId: string, budget: PetBudget) {
      void budget;
      return createLocalSyncMetadata("pet", `${walletAddress}:${petId}`, config.now);
    },
    buildRegisterPlayerIntent() {
      return buildIntent(
        config.registryAddress,
        registryInterface.encodeFunctionData("registerPlayer", []),
      );
    },
    buildCreatePetIntent({ petName }) {
      return buildIntent(
        config.registryAddress,
        registryInterface.encodeFunctionData("createPet", [petName]),
      );
    },
    buildSetPetBudgetIntent({ walletAddress, petId, budget, current }) {
      void walletAddress;
      if (!current?.onchainId || !isPositiveIntegerString(current.onchainId)) {
        return null;
      }

      return buildIntent(
        config.vaultAddress,
        vaultInterface.encodeFunctionData("setBudget", [
          current.onchainId,
          budget.spendableBudget,
          budget.singleTxLimit,
          budget.dailyLimit,
        ]),
      );
    },
    buildClaimIntent({ walletAddress, claimId, amount }) {
      return buildClaimTransactionIntent(walletAddress, claimId, amount);
    },
    async confirmPlayerOnchain({ walletAddress, txHash, current }) {
      try {
        const expected = buildIntent(
          config.registryAddress,
          registryInterface.encodeFunctionData("registerPlayer", []),
        );
        const { transaction, receipt } = await readTransaction(txHash);
        if (!txMatchesBase(transaction, walletAddress, expected.to, expected.data, expected.value)) {
          throw new Error("Transaction does not match registerPlayer intent.");
        }

        const event = receipt.logs
          .map((log) => {
            try {
              return registryInterface.parseLog(log);
            } catch {
              return null;
            }
          })
          .find((parsed) => parsed?.name === "PlayerRegistered");

        const registeredPlayer = event?.args?.player;
        if (!registeredPlayer || normalizeAddress(registeredPlayer) !== normalizeAddress(walletAddress)) {
          throw new Error("PlayerRegistered event missing or mismatched.");
        }

        return createSyncedMetadata(normalizeAddress(walletAddress), config.now);
      } catch {
        return createFailedSyncMetadata(
          current?.onchainId ?? createPlaceholderId("player", walletAddress),
          config.now,
          current,
        );
      }
    },
    async confirmPetOnchain({ walletAddress, petId, petName, txHash, current }) {
      try {
        const expected = buildIntent(
          config.registryAddress,
          registryInterface.encodeFunctionData("createPet", [petName]),
        );
        const { transaction, receipt } = await readTransaction(txHash);
        if (!txMatchesBase(transaction, walletAddress, expected.to, expected.data, expected.value)) {
          throw new Error("Transaction does not match createPet intent.");
        }

        const event = receipt.logs
          .map((log) => {
            try {
              return registryInterface.parseLog(log);
            } catch {
              return null;
            }
          })
          .find((parsed) => parsed?.name === "PetCreated");

        const onchainPetId = event?.args?.petId?.toString?.();
        const owner = event?.args?.owner;
        if (!onchainPetId || !owner || normalizeAddress(owner) !== normalizeAddress(walletAddress)) {
          throw new Error("PetCreated event missing or mismatched.");
        }

        return createSyncedMetadata(onchainPetId, config.now);
      } catch {
        return createFailedSyncMetadata(
          current?.onchainId ?? createPlaceholderId("pet", `${walletAddress}:${petId}`),
          config.now,
          current,
        );
      }
    },
    async confirmPetBudgetOnchain({ walletAddress, petId, budget, txHash, current }) {
      if (!current?.onchainId || !isPositiveIntegerString(current.onchainId)) {
        return createFailedSyncMetadata(
          current?.onchainId ?? createPlaceholderId("pet", `${walletAddress}:${petId}`),
          config.now,
          current,
        );
      }

      try {
        const expected = buildIntent(
          config.vaultAddress,
          vaultInterface.encodeFunctionData("setBudget", [
            current.onchainId,
            budget.spendableBudget,
            budget.singleTxLimit,
            budget.dailyLimit,
          ]),
        );
        const { transaction } = await readTransaction(txHash);
        if (!txMatchesBase(transaction, walletAddress, expected.to, expected.data, expected.value)) {
          throw new Error("Transaction does not match setBudget intent.");
        }

        return createSyncedMetadata(current.onchainId, config.now);
      } catch {
        return createFailedSyncMetadata(current.onchainId, config.now, current);
      }
    },
    async confirmClaimOnchain({ walletAddress, claimId, amount, txHash, intent }) {
      const { claimVaultAddress } = requireClaimInfrastructure();
      const { transaction, receipt } = await readTransaction(txHash);
      const fallbackIntent =
        intent && intent.to !== "pending"
          ? intent
          : buildClaimTransactionIntent(walletAddress, claimId, amount);
      const expectedTo = fallbackIntent.to && fallbackIntent.to !== "pending" ? fallbackIntent.to : claimVaultAddress;
      const expectedData = fallbackIntent.data;
      const expectedValue = fallbackIntent.value ?? "0x0";

      if (!txMatchesBase(transaction, walletAddress, expectedTo, expectedData, expectedValue)) {
        throw new Error("Transaction does not match claim intent.");
      }

      const event = receipt.logs
        .map((log) => {
          try {
            return claimVaultInterface.parseLog(log);
          } catch {
            return null;
          }
        })
        .find((parsed) => parsed?.name === "Claimed");

      const recipient = event?.args?.recipient;
      if (!recipient || normalizeAddress(recipient) !== normalizeAddress(walletAddress)) {
        throw new Error("Claimed event missing or mismatched.");
      }
    },
  };
}
