import {
  createOpenClawClient,
  type AuthChallenge,
  type AuthSession,
  type CommandResult,
  type PetAutonomySummary,
  type HomeSnapshot,
  type PetPersonalitySnapshot,
  type PetRecommendation,
  type PetStrategyMode,
  type PetStrategySummary,
  type OnchainTxIntent,
  type PetBudget,
  type RetryOptions,
  type PetSnapshot,
  type PlayerSnapshot,
  type UploadXActionPayload,
  type XActionResult,
  type XActionType,
} from "@agent-game/openclaw-client";
import { normalizeOpenClawStrategy } from "./command-presets.js";

export type CommandType = PetStrategyMode;

export type ClaimSnapshot = NonNullable<NonNullable<HomeSnapshot["claim"]>>;

export type EconomySummary = Readonly<{
  currencyCode: "CANS";
  currencyName: string;
  treasuryBalance: number;
  profitPool: number;
  platformTreasury: number;
  openBounties: number;
  openDuels: number;
  openServiceOrders: number;
  ledgerEntries: number;
}>;

export type LedgerEntry = Readonly<{
  id: string;
  sourceType: string;
  amount: number;
  [key: string]: unknown;
}>;

export type TipResult = Readonly<{
  tip: {
    id: string;
    grossAmount: number;
    netAmount: number;
    feeAmount: number;
  };
  sender?: PlayerSnapshot;
  recipient?: PlayerSnapshot;
}>;

export type BountyResult = Readonly<{
  bounty: {
    id: string;
    status: string;
    title: string;
    grossAmount: number;
    netAmount: number;
    targetWalletAddress: string;
    targetPetId: string;
  };
  player?: PlayerSnapshot;
  claimer?: PlayerSnapshot;
}>;

export type DuelResult = Readonly<{
  duel: {
    id: string;
    status: string;
    stakeAmount: number;
    challengerWalletAddress: string;
    targetWalletAddress: string;
    challengerPetId: string;
    targetPetId: string;
    winnerPetId: string | null;
  };
  player?: PlayerSnapshot;
  winner?: PlayerSnapshot;
}>;

export type ServiceOrderResult = Readonly<{
  order: {
    id: string;
    status: string;
    serviceType: string;
    title: string;
    grossAmount: number;
    netAmount: number;
    clientWalletAddress: string;
    providerWalletAddress: string | null;
    providerPetId: string | null;
  };
  player?: PlayerSnapshot;
  provider?: PlayerSnapshot;
}>;

type EconomyClient = ReturnType<typeof createOpenClawClient> & {
  getClaimSnapshot(): Promise<ClaimSnapshot>;
  getEconomy(): Promise<EconomySummary>;
  getLedger(): Promise<readonly LedgerEntry[]>;
  getPetPersonality(petId: string): Promise<PetPersonalitySnapshot>;
  setPetStrategy(petId: string, strategyMode: PetStrategyMode): Promise<PetStrategySummary>;
  setPetAutonomy(petId: string, autonomyLevel: string): Promise<PetAutonomySummary>;
  getPetRecommendations(petId: string): Promise<readonly PetRecommendation[]>;
  createTip(fromPetId: string, targetWalletAddress: string, toPetId: string, amount: number): Promise<TipResult>;
  createBounty(payload: Readonly<{
    creatorPetId: string;
    targetWalletAddress: string;
    targetPetId: string;
    title: string;
    detail: string;
    amount: number;
  }>): Promise<BountyResult>;
  claimBounty(bountyId: string, claimerPetId: string): Promise<BountyResult>;
  createDuel(payload: Readonly<{
    challengerPetId: string;
    targetWalletAddress: string;
    targetPetId: string;
    stakeAmount: number;
  }>): Promise<DuelResult>;
  acceptDuel(duelId: string, targetPetId: string): Promise<DuelResult>;
  resolveDuel(duelId: string, winnerPetId: string): Promise<DuelResult>;
  createServiceOrder(payload: Readonly<{
    clientPetId: string;
    serviceType: string;
    title: string;
    detail: string;
    amount: number;
  }>): Promise<ServiceOrderResult>;
  acceptServiceOrder(orderId: string, providerPetId: string): Promise<ServiceOrderResult>;
  completeServiceOrder(orderId: string): Promise<ServiceOrderResult>;
  claimSafetyNet(): Promise<Readonly<{ player: PlayerSnapshot; event: { type: string; [key: string]: unknown } }>>;
  prepareClaimOnchain(): Promise<OnchainTxIntent>;
  confirmClaimOnchain(txHash: string): Promise<ClaimSnapshot>;
  cancelClaimOnchain(): Promise<ClaimSnapshot>;
};

export type OpenClawSkillDeps = Readonly<{
  baseUrl: string;
  fetch?: typeof fetch;
}>;

export type LoginInput = Readonly<{
  walletAddress: string;
  signChallenge: (challenge: AuthChallenge) => string | Promise<string>;
}>;

export type WalletHostAdapter = Readonly<{
  getAddress(): string | Promise<string>;
  signMessage(message: string): string | Promise<string>;
  sendTransaction(tx: OnchainTxIntent): string | Promise<string>;
}>;

export type GreetingMessage = Readonly<{
  title: string;
  body: string;
  steps: readonly string[];
  cta: string;
}>;

export type OpenClawSkill = Readonly<{
  greeting(): GreetingMessage;
  login(input: LoginInput): Promise<AuthSession>;
  loginWithWallet(wallet: WalletHostAdapter): Promise<AuthSession>;
  bootstrap(): Promise<PlayerSnapshot>;
  home(): Promise<HomeSnapshot>;
  claimSnapshot(): Promise<ClaimSnapshot>;
  economy(): Promise<EconomySummary>;
  ledger(): Promise<readonly LedgerEntry[]>;
  personality(petId: string): Promise<PetPersonalitySnapshot>;
  setStrategy(petId: string, strategy: string): Promise<PetStrategySummary>;
  setAutonomy(petId: string, autonomyLevel: string): Promise<PetAutonomySummary>;
  recommendations(petId: string): Promise<readonly PetRecommendation[]>;
  command(petId: string, commandType: CommandType): Promise<CommandResult>;
  budget(petId: string, budget: PetBudget): Promise<PetSnapshot>;
  tip(fromPetId: string, targetWalletAddress: string, toPetId: string, amount: number): Promise<TipResult>;
  createBounty(payload: Readonly<{
    creatorPetId: string;
    targetWalletAddress: string;
    targetPetId: string;
    title: string;
    detail: string;
    amount: number;
  }>): Promise<BountyResult>;
  claimBounty(bountyId: string, claimerPetId: string): Promise<BountyResult>;
  createDuel(payload: Readonly<{
    challengerPetId: string;
    targetWalletAddress: string;
    targetPetId: string;
    stakeAmount: number;
  }>): Promise<DuelResult>;
  acceptDuel(duelId: string, targetPetId: string): Promise<DuelResult>;
  resolveDuel(duelId: string, winnerPetId: string): Promise<DuelResult>;
  createServiceOrder(payload: Readonly<{
    clientPetId: string;
    serviceType: string;
    title: string;
    detail: string;
    amount: number;
  }>): Promise<ServiceOrderResult>;
  acceptServiceOrder(orderId: string, providerPetId: string): Promise<ServiceOrderResult>;
  completeServiceOrder(orderId: string): Promise<ServiceOrderResult>;
  claimSafetyNet(): Promise<Readonly<{ player: PlayerSnapshot; event: { type: string; [key: string]: unknown } }>>;
  prepareClaimOnchain(): Promise<OnchainTxIntent>;
  confirmClaimOnchain(txHash: string): Promise<ClaimSnapshot>;
  cancelClaimOnchain(): Promise<ClaimSnapshot>;
  uploadX(payload: UploadXActionPayload): Promise<XActionResult>;
  uploadXWithRetry(payload: UploadXActionPayload, options?: RetryOptions): Promise<XActionResult>;
  prepareRegisterPlayerOnchain(): Promise<OnchainTxIntent>;
  confirmRegisterPlayerOnchain(txHash: string): Promise<PlayerSnapshot>;
  confirmRegisterPlayerOnchainWithRetry(txHash: string, options?: RetryOptions): Promise<PlayerSnapshot>;
  prepareCreatePetOnchain(petId: string): Promise<OnchainTxIntent>;
  confirmCreatePetOnchain(petId: string, txHash: string): Promise<PetSnapshot>;
  confirmCreatePetOnchainWithRetry(
    petId: string,
    txHash: string,
    options?: RetryOptions,
  ): Promise<PetSnapshot>;
  prepareSetPetBudgetOnchain(petId: string): Promise<OnchainTxIntent>;
  confirmSetPetBudgetOnchain(petId: string, txHash: string): Promise<PetSnapshot>;
  confirmSetPetBudgetOnchainWithRetry(
    petId: string,
    txHash: string,
    options?: RetryOptions,
  ): Promise<PetSnapshot>;
  registerPlayerOnchainWithWallet(wallet: WalletHostAdapter): Promise<PlayerSnapshot>;
  createPetOnchainWithWallet(wallet: WalletHostAdapter, petId: string): Promise<PetSnapshot>;
  setPetBudgetOnchainWithWallet(wallet: WalletHostAdapter, petId: string): Promise<PetSnapshot>;
  getSession(): AuthSession | null;
  execute(
    action:
      | Readonly<{ operation: "greeting" }>
      | Readonly<{ operation: "login"; walletAddress: string; signChallenge: LoginInput["signChallenge"] }>
      | Readonly<{ operation: "connectWallet"; wallet: WalletHostAdapter }>
      | Readonly<{ operation: "bootstrap" }>
      | Readonly<{ operation: "home" }>
      | Readonly<{ operation: "claimSnapshot" }>
      | Readonly<{ operation: "economy" }>
      | Readonly<{ operation: "ledger" }>
      | Readonly<{ operation: "get_personality"; petId: string }>
      | Readonly<{ operation: "set_strategy"; petId: string; strategy: string }>
      | Readonly<{ operation: "set_autonomy"; petId: string; autonomyLevel: string }>
      | Readonly<{ operation: "get_recommendations"; petId: string }>
      | Readonly<{ operation: "command"; petId: string; commandType: CommandType }>
      | Readonly<{ operation: "budget"; petId: string; budget: PetBudget }>
      | Readonly<{ operation: "tip"; fromPetId: string; targetWalletAddress: string; toPetId: string; amount: number }>
      | Readonly<{ operation: "createBounty"; payload: { creatorPetId: string; targetWalletAddress: string; targetPetId: string; title: string; detail: string; amount: number } }>
      | Readonly<{ operation: "claimBounty"; bountyId: string; claimerPetId: string }>
      | Readonly<{ operation: "createDuel"; payload: { challengerPetId: string; targetWalletAddress: string; targetPetId: string; stakeAmount: number } }>
      | Readonly<{ operation: "acceptDuel"; duelId: string; targetPetId: string }>
      | Readonly<{ operation: "resolveDuel"; duelId: string; winnerPetId: string }>
      | Readonly<{ operation: "createServiceOrder"; payload: { clientPetId: string; serviceType: string; title: string; detail: string; amount: number } }>
      | Readonly<{ operation: "acceptServiceOrder"; orderId: string; providerPetId: string }>
      | Readonly<{ operation: "completeServiceOrder"; orderId: string }>
      | Readonly<{ operation: "claimSafetyNet" }>
      | Readonly<{ operation: "prepareClaimOnchain" }>
      | Readonly<{ operation: "confirmClaimOnchain"; txHash: string }>
      | Readonly<{ operation: "cancelClaimOnchain" }>
      | Readonly<{ operation: "uploadX"; payload: UploadXActionPayload }>
      | Readonly<{ operation: "uploadXWithRetry"; payload: UploadXActionPayload; options?: RetryOptions }>
      | Readonly<{ operation: "prepareRegisterPlayerOnchain" }>
      | Readonly<{ operation: "confirmRegisterPlayerOnchain"; txHash: string }>
      | Readonly<{ operation: "confirmRegisterPlayerOnchainWithRetry"; txHash: string; options?: RetryOptions }>
      | Readonly<{ operation: "prepareCreatePetOnchain"; petId: string }>
      | Readonly<{ operation: "confirmCreatePetOnchain"; petId: string; txHash: string }>
      | Readonly<{ operation: "confirmCreatePetOnchainWithRetry"; petId: string; txHash: string; options?: RetryOptions }>
      | Readonly<{ operation: "prepareSetPetBudgetOnchain"; petId: string }>
      | Readonly<{ operation: "confirmSetPetBudgetOnchain"; petId: string; txHash: string }>
      | Readonly<{ operation: "confirmSetPetBudgetOnchainWithRetry"; petId: string; txHash: string; options?: RetryOptions }>
      | Readonly<{ operation: "registerPlayerOnchainWithWallet"; wallet: WalletHostAdapter }>
      | Readonly<{ operation: "createPetOnchainWithWallet"; wallet: WalletHostAdapter; petId: string }>
      | Readonly<{ operation: "setPetBudgetOnchainWithWallet"; wallet: WalletHostAdapter; petId: string }>,
  ): Promise<GreetingMessage | AuthSession | PlayerSnapshot | HomeSnapshot | ClaimSnapshot | EconomySummary | readonly LedgerEntry[] | PetPersonalitySnapshot | PetStrategySummary | PetAutonomySummary | readonly PetRecommendation[] | CommandResult | PetSnapshot | TipResult | BountyResult | DuelResult | ServiceOrderResult | XActionResult | OnchainTxIntent | Readonly<{ player: PlayerSnapshot; event: { type: string; [key: string]: unknown } }>>;
}>;

function requireSession(session: AuthSession | null): AuthSession {
  if (!session) {
    throw new Error("Call login() first.");
  }

  return session;
}

function normalizeStrategyMode(strategy: string): CommandType {
  const normalized = normalizeOpenClawStrategy(strategy);
  if (!normalized) {
    throw new Error(`Unknown strategy: ${strategy}`);
  }

  return normalized;
}

export function createOpenClawSkill({ baseUrl, fetch: fetchImpl = fetch }: OpenClawSkillDeps): OpenClawSkill {
  let session: AuthSession | null = null;

  function createAuthedClient() {
    const currentSession = requireSession(session);
    return createOpenClawClient({
      baseUrl,
      token: currentSession.token,
      fetch: fetchImpl,
    }) as EconomyClient;
  }

  return {
    greeting(): GreetingMessage {
      return {
        title: "👋 欢迎来到 Agent Pet！",
        body: "你进入了一个由宠物 Agent 驱动的链上博弈世界。先连接 OKX 钱包，领取你的初始宠物和罐头，然后去广场看看其他角色在做什么。",
        steps: [
          "连接 OKX 钱包（发送「连接钱包」）",
          "领取初始宠物和 500 罐头启动资金",
          "去网站广场看看现在谁在闹事",
          "回来下命令：挑衅、发悬赏、或者默默赚钱",
        ],
        cta: "发送「连接钱包」开始",
      };
    },

    async login(input: LoginInput) {
      const anonymousClient = createOpenClawClient({
        baseUrl,
        token: "",
        fetch: fetchImpl,
      });

      const challenge = await anonymousClient.createChallenge(input.walletAddress);
      const signature = await input.signChallenge(challenge);
      session = await anonymousClient.verifyChallenge(input.walletAddress, signature);
      return session;
    },

    async loginWithWallet(wallet: WalletHostAdapter) {
      const walletAddress = await wallet.getAddress();
      return this.login({
        walletAddress,
        signChallenge: async (challenge) => {
          try {
            return await wallet.signMessage(challenge.challenge);
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            throw new Error(
              `Wallet-backed login failed: ${message}. If you are using okx-agentic-wallet without generic message signing, keep the server in AUTH_MODE=unsafe for local MVP runs or add a wallet-specific verify flow.`,
            );
          }
        },
      });
    },

    bootstrap() {
      return createAuthedClient().bootstrapPlayer();
    },

    home() {
      return createAuthedClient().getHome();
    },

    claimSnapshot() {
      return createAuthedClient().getClaimSnapshot();
    },

    economy() {
      return createAuthedClient().getEconomy();
    },

    ledger() {
      return createAuthedClient().getLedger();
    },

    personality(petId: string) {
      return createAuthedClient().getPetPersonality(petId);
    },

    setStrategy(petId: string, strategy: string) {
      return createAuthedClient().setPetStrategy(petId, normalizeStrategyMode(strategy));
    },

    setAutonomy(petId: string, autonomyLevel: string) {
      return createAuthedClient().setPetAutonomy(petId, autonomyLevel);
    },

    recommendations(petId: string) {
      return createAuthedClient().getPetRecommendations(petId);
    },

    command(petId: string, commandType: CommandType) {
      return createAuthedClient().issuePetCommand(petId, commandType as XActionType);
    },

    budget(petId: string, budget: PetBudget) {
      return createAuthedClient().updatePetBudget(petId, budget);
    },

    tip(fromPetId: string, targetWalletAddress: string, toPetId: string, amount: number) {
      return createAuthedClient().createTip(fromPetId, targetWalletAddress, toPetId, amount);
    },

    createBounty(payload) {
      return createAuthedClient().createBounty(payload);
    },

    claimBounty(bountyId: string, claimerPetId: string) {
      return createAuthedClient().claimBounty(bountyId, claimerPetId);
    },

    createDuel(payload) {
      return createAuthedClient().createDuel(payload);
    },

    acceptDuel(duelId: string, targetPetId: string) {
      return createAuthedClient().acceptDuel(duelId, targetPetId);
    },

    resolveDuel(duelId: string, winnerPetId: string) {
      return createAuthedClient().resolveDuel(duelId, winnerPetId);
    },

    createServiceOrder(payload) {
      return createAuthedClient().createServiceOrder(payload);
    },

    acceptServiceOrder(orderId: string, providerPetId: string) {
      return createAuthedClient().acceptServiceOrder(orderId, providerPetId);
    },

    completeServiceOrder(orderId: string) {
      return createAuthedClient().completeServiceOrder(orderId);
    },

    claimSafetyNet() {
      return createAuthedClient().claimSafetyNet();
    },

    prepareClaimOnchain() {
      return createAuthedClient().prepareClaimOnchain();
    },

    confirmClaimOnchain(txHash: string) {
      return createAuthedClient().confirmClaimOnchain(txHash);
    },

    cancelClaimOnchain() {
      return createAuthedClient().cancelClaimOnchain();
    },

    uploadX(payload: UploadXActionPayload) {
      return createAuthedClient().uploadXAction(payload);
    },

    uploadXWithRetry(payload: UploadXActionPayload, options?: RetryOptions) {
      return createAuthedClient().uploadXActionWithRetry(payload, options);
    },

    prepareRegisterPlayerOnchain() {
      return createAuthedClient().prepareRegisterPlayerOnchain();
    },

    confirmRegisterPlayerOnchain(txHash: string) {
      return createAuthedClient().confirmRegisterPlayerOnchain(txHash);
    },

    confirmRegisterPlayerOnchainWithRetry(txHash: string, options?: RetryOptions) {
      return createAuthedClient().confirmRegisterPlayerOnchainWithRetry(txHash, options);
    },

    prepareCreatePetOnchain(petId: string) {
      return createAuthedClient().prepareCreatePetOnchain(petId);
    },

    confirmCreatePetOnchain(petId: string, txHash: string) {
      return createAuthedClient().confirmCreatePetOnchain(petId, txHash);
    },

    confirmCreatePetOnchainWithRetry(petId: string, txHash: string, options?: RetryOptions) {
      return createAuthedClient().confirmCreatePetOnchainWithRetry(petId, txHash, options);
    },

    prepareSetPetBudgetOnchain(petId: string) {
      return createAuthedClient().prepareSetPetBudgetOnchain(petId);
    },

    confirmSetPetBudgetOnchain(petId: string, txHash: string) {
      return createAuthedClient().confirmSetPetBudgetOnchain(petId, txHash);
    },

    confirmSetPetBudgetOnchainWithRetry(petId: string, txHash: string, options?: RetryOptions) {
      return createAuthedClient().confirmSetPetBudgetOnchainWithRetry(petId, txHash, options);
    },

    async registerPlayerOnchainWithWallet(wallet: WalletHostAdapter) {
      const intent = await this.prepareRegisterPlayerOnchain();
      const txHash = await wallet.sendTransaction(intent);
      return this.confirmRegisterPlayerOnchain(txHash);
    },

    async createPetOnchainWithWallet(wallet: WalletHostAdapter, petId: string) {
      const intent = await this.prepareCreatePetOnchain(petId);
      const txHash = await wallet.sendTransaction(intent);
      return this.confirmCreatePetOnchain(petId, txHash);
    },

    async setPetBudgetOnchainWithWallet(wallet: WalletHostAdapter, petId: string) {
      const intent = await this.prepareSetPetBudgetOnchain(petId);
      const txHash = await wallet.sendTransaction(intent);
      return this.confirmSetPetBudgetOnchain(petId, txHash);
    },

    getSession() {
      return session;
    },

    execute(action) {
      switch (action.operation) {
        case "greeting":
          return Promise.resolve(this.greeting());
        case "login":
          return this.login({
            walletAddress: action.walletAddress,
            signChallenge: action.signChallenge,
          });
        case "connectWallet":
          return this.loginWithWallet(action.wallet);
        case "bootstrap":
          return this.bootstrap();
        case "home":
          return this.home();
        case "claimSnapshot":
          return this.claimSnapshot();
        case "economy":
          return this.economy();
        case "ledger":
          return this.ledger();
        case "get_personality":
          return this.personality(action.petId);
        case "set_strategy":
          return this.setStrategy(action.petId, action.strategy);
        case "set_autonomy":
          return this.setAutonomy(action.petId, action.autonomyLevel);
        case "get_recommendations":
          return this.recommendations(action.petId);
        case "command":
          return this.command(action.petId, action.commandType);
        case "budget":
          return this.budget(action.petId, action.budget);
        case "tip":
          return this.tip(action.fromPetId, action.targetWalletAddress, action.toPetId, action.amount);
        case "createBounty":
          return this.createBounty(action.payload);
        case "claimBounty":
          return this.claimBounty(action.bountyId, action.claimerPetId);
        case "createDuel":
          return this.createDuel(action.payload);
        case "acceptDuel":
          return this.acceptDuel(action.duelId, action.targetPetId);
        case "resolveDuel":
          return this.resolveDuel(action.duelId, action.winnerPetId);
        case "createServiceOrder":
          return this.createServiceOrder(action.payload);
        case "acceptServiceOrder":
          return this.acceptServiceOrder(action.orderId, action.providerPetId);
        case "completeServiceOrder":
          return this.completeServiceOrder(action.orderId);
        case "claimSafetyNet":
          return this.claimSafetyNet();
        case "prepareClaimOnchain":
          return this.prepareClaimOnchain();
        case "confirmClaimOnchain":
          return this.confirmClaimOnchain(action.txHash);
        case "cancelClaimOnchain":
          return this.cancelClaimOnchain();
        case "uploadX":
          return this.uploadX(action.payload);
        case "uploadXWithRetry":
          return this.uploadXWithRetry(action.payload, action.options);
        case "prepareRegisterPlayerOnchain":
          return this.prepareRegisterPlayerOnchain();
        case "confirmRegisterPlayerOnchain":
          return this.confirmRegisterPlayerOnchain(action.txHash);
        case "confirmRegisterPlayerOnchainWithRetry":
          return this.confirmRegisterPlayerOnchainWithRetry(action.txHash, action.options);
        case "prepareCreatePetOnchain":
          return this.prepareCreatePetOnchain(action.petId);
        case "confirmCreatePetOnchain":
          return this.confirmCreatePetOnchain(action.petId, action.txHash);
        case "confirmCreatePetOnchainWithRetry":
          return this.confirmCreatePetOnchainWithRetry(action.petId, action.txHash, action.options);
        case "prepareSetPetBudgetOnchain":
          return this.prepareSetPetBudgetOnchain(action.petId);
        case "confirmSetPetBudgetOnchain":
          return this.confirmSetPetBudgetOnchain(action.petId, action.txHash);
        case "confirmSetPetBudgetOnchainWithRetry":
          return this.confirmSetPetBudgetOnchainWithRetry(action.petId, action.txHash, action.options);
        case "registerPlayerOnchainWithWallet":
          return this.registerPlayerOnchainWithWallet(action.wallet);
        case "createPetOnchainWithWallet":
          return this.createPetOnchainWithWallet(action.wallet, action.petId);
        case "setPetBudgetOnchainWithWallet":
          return this.setPetBudgetOnchainWithWallet(action.wallet, action.petId);
      }
    },
  };
}
