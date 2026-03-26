import fs from "node:fs";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";

import {
  createWalletChallengeVerifier,
  type WalletChallengeVerifier,
} from "./auth";
import {
  createNoopChainSyncAdapter,
  type ChainSyncAdapter,
  type ChainSyncMetadata,
  type OnchainTxIntent,
  type PetBudget,
} from "./chain-sync";

export type AuthChallenge = Readonly<{
  walletAddress: string;
  nonce: string;
  challenge: string;
}>;

export type Session = Readonly<{
  token: string;
  walletAddress: string;
  createdAt: string;
}>;

export type CommandType =
  | "earn"
  | "taunt"
  | "ally"
  | "revenge"
  | "stay_low";

export type PlayerEvent = Readonly<{
  id: string;
  type:
    | "player_bootstrapped"
    | "pet_budget_updated"
    | "pet_strategy_updated"
    | "pet_autonomy_updated"
    | "pet_command_issued"
    | "profit_withdrawn"
    | "profit_reinvested"
    | "x_action_verified"
    | "tip_sent"
    | "tip_received"
    | "bounty_created"
    | "bounty_claimed"
    | "bounty_cancelled"
    | "duel_created"
    | "duel_accepted"
    | "duel_resolved"
    | "duel_cancelled"
    | "service_order_created"
    | "service_order_accepted"
    | "service_order_completed"
    | "service_order_cancelled"
    | "claim_prepared"
    | "claim_confirmed"
    | "claim_cancelled"
    | "safety_net_claimed";
  title: string;
  detail: string;
  createdAt: string;
  petId: string | null;
  commandType?: CommandType;
  amount?: number;
}>;

export type FeedItem = Readonly<{
  id: string;
  source: "internal" | "x";
  category: "system" | "economy" | "social" | "command";
  title: string;
  detail: string;
  createdAt: string;
  petId: string | null;
  eventType: PlayerEvent["type"] | "feed_message";
  commandType?: CommandType;
  amount?: number;
}>;

export type MessageCenterSummary = Readonly<{
  totalItems: number;
  latestItemId: string | null;
  latestCreatedAt: string | null;
}>;

export type XIntegrationMode = "disabled" | "local_upload";

export type XAdapterStatus = Readonly<{
  mode: XIntegrationMode;
  enabled: boolean;
  canUpload: boolean;
  reason: string;
}>;

export type PostRecord = Readonly<{
  id: string;
  petId: string;
  petName: string;
  ownerWalletAddress: string;
  ownerDisplayId: string | null;
  content: string;
  replyToPostId: string | null;
  eventRef: string | null;
  createdAt: string;
  tipTotal: number;
  replyCount: number;
}>;

export type XActionType = "post" | "reply" | "like";

export type XActionStatus = "submitted" | "confirmed" | "failed";

export type XActionRecord = Readonly<{
  id: string;
  petId: string;
  xAccountId: string;
  actionType: XActionType;
  tweetId: string;
  replyToTweetId: string | null;
  content: string | null;
  localProof: string | null;
  status: XActionStatus;
  submittedAt: string;
  resolvedAt: string | null;
  failureReason: string | null;
  verificationNotes: string | null;
}>;

export type StrategyMode =
  | "balanced"
  | "growth"
  | "pressure"
  | "stealth"
  | "opportunistic";

export type TargetPreference =
  | "none"
  | "profit"
  | "social"
  | "conflict"
  | "service";

export type PetPersonaProfile = Readonly<{
  archetype: string;
  voice: string;
  stance: string;
}>;

export type PetOutcome = Readonly<{
  id: string;
  kind: "command" | "economy";
  title: string;
  detail: string;
  createdAt: string;
  commandType?: CommandType;
  sourceType?: "withdraw" | "reinvest" | "duel" | "bounty" | "service";
  delta: number;
}>;

export type PetPersonalitySnapshot = Readonly<{
  petId: string;
  personaProfile: PetPersonaProfile;
  loyalty: number;
  resentment: number;
  ambition: number;
  heat: number;
  strategyMode: StrategyMode;
  autonomyLevel: number;
  targetPreference: TargetPreference;
  recentOutcomes: readonly PetOutcome[];
}>;

export type PetRecommendation = Readonly<{
  id: string;
  title: string;
  detail: string;
  priority: "high" | "medium" | "low";
  commandType?: CommandType;
  strategyMode?: StrategyMode;
}>;

export type Pet = Readonly<{
  id: string;
  name: string;
  species: string;
  level: number;
  starter: true;
  budget: PetBudget;
  chainSync: ChainSyncMetadata;
  personaProfile: PetPersonaProfile;
  loyalty: number;
  resentment: number;
  ambition: number;
  heat: number;
  strategyMode: StrategyMode;
  autonomyLevel: number;
  targetPreference: TargetPreference;
  recentOutcomes: readonly PetOutcome[];
}>;

export type Player = Readonly<{
  walletAddress: string;
  displayId: string | null;
  xBinding: boolean;
  budget: number;
  profitPool: number;
  claimableBalance: number;
  pets: readonly Pet[];
  chainSync: ChainSyncMetadata;
  createdAt: string;
  updatedAt: string;
}>;

export type EconomySummary = Readonly<{
  currencyCode: "CANS";
  currencyName: "罐头";
  treasuryBalance: number;
  profitPool: number;
  claimableBalance: number;
  platformTreasury: number;
  openBounties: number;
  openDuels: number;
  openServiceOrders: number;
  openClaims: number;
  ledgerEntries: number;
}>;

export type CommandPreset = Readonly<{
  commandType: CommandType;
  title: string;
  purpose: string;
  examples: readonly string[];
  aliases: readonly string[];
}>;

export type GuidedAction = Readonly<{
  id: string;
  title: string;
  detail: string;
  priority: "high" | "medium" | "low";
  operation:
    | "issue_command"
    | "get_feed"
    | "get_economy"
    | "prepare_claim_onchain"
    | "claim_bounty"
    | "create_bounty"
    | "accept_duel"
    | "create_duel"
    | "create_tip"
    | "accept_service_order"
    | "create_service_order"
    | "withdraw_profit"
    | "reinvest_profit";
  payload: Readonly<Record<string, string | number | boolean | null>>;
}>;

export type OnboardingChecklistItem = Readonly<{
  id: string;
  title: string;
  done: boolean;
}>;

export type OnboardingSummary = Readonly<{
  stage: "first_steps" | "earning_loop" | "social_play" | "live_ops";
  headline: string;
  progress: number;
  checklist: readonly OnboardingChecklistItem[];
}>;

export type DiscoveryTarget = Readonly<{
  walletAddress: string;
  petId: string;
  petName: string;
  reason: string;
  suggestedAction: "duel" | "bounty" | "tip" | "service";
  score: number;
}>;

export type OpportunityBoard = Readonly<{
  featuredOpponents: readonly DiscoveryTarget[];
  openBounties: readonly BountyRecord[];
  openDuels: readonly DuelRecord[];
  openServiceOrders: readonly ServiceOrderRecord[];
}>;

export type PlazaWalletCard = Readonly<{
  walletAddress: string;
  petId: string;
  petName: string;
  lastEventTitle: string;
  lastEventAt: string;
}>;

export type PlazaSpotlight = Readonly<{
  kind: "bounty" | "duel" | "service";
  title: string;
  detail: string;
}>;

export type PlazaSummary = Readonly<{
  headline: string;
  highlights: readonly FeedItem[];
  activeWallets: readonly PlazaWalletCard[];
  spotlight: readonly PlazaSpotlight[];
}>;

export type PublicPetSummary = Readonly<{
  petId: string;
  ownerWalletAddress: string;
  name: string;
  species: string;
  level: number;
  personaProfile: PetPersonaProfile;
  loyalty: number;
  resentment: number;
  ambition: number;
  heat: number;
  strategyMode: StrategyMode;
  autonomyLevel: number;
  targetPreference: TargetPreference;
  recentOutcomes: readonly PetOutcome[];
  latestEventTitle: string | null;
  latestEventAt: string | null;
  latestFeedTitle: string | null;
  latestFeedAt: string | null;
  matchedWalletCount: number;
  ambiguous: boolean;
}>;

export type PublicPlayerSummary = Readonly<{
  walletAddress: string;
  xBinding: boolean;
  petCount: number;
  createdAt: string;
  updatedAt: string;
  pets: readonly PublicPetSummary[];
  latestEventTitle: string | null;
  latestEventAt: string | null;
  latestFeedTitle: string | null;
  latestFeedAt: string | null;
}>;

export type PublicWorldSummary = Readonly<{
  headline: string;
  counts: Readonly<{
    playerCount: number;
    petCount: number;
    activeWalletCount: number;
    openBountyCount: number;
    openDuelCount: number;
    openServiceOrderCount: number;
    feedItemCount: number;
  }>;
  highlights: readonly FeedItem[];
  spotlight: readonly PlazaSpotlight[];
  activeWallets: readonly PlazaWalletCard[];
}>;

export type PublicOpportunitySummary = Readonly<{
  headline: string;
  intro: string;
  metrics: readonly Readonly<{
    label: string;
    value: string;
    hint: string;
  }>[];
  opportunities: readonly Readonly<{
    id: string;
    title: string;
    detail: string;
    type: "悬赏" | "约架" | "委托";
    reward: string;
    risk: string;
    target: string;
    href: string;
  }>[];
  recommendedRoutes: readonly Readonly<{
    title: string;
    detail: string;
    href: string;
  }>[];
}>;

export type LedgerSourceType =
  | "bootstrap"
  | "command"
  | "tip"
  | "bounty"
  | "duel"
  | "service_order"
  | "withdraw"
  | "reinvest"
  | "claim"
  | "claim_cancelled"
  | "safety_net"
  | "platform_fee";

export type LedgerEntry = Readonly<{
  id: string;
  walletAddress: string;
  direction: "in" | "out";
  amount: number;
  sourceType: LedgerSourceType;
  sourceId: string;
  description: string;
  createdAt: string;
  treasuryBalanceAfter: number;
  profitPoolAfter: number;
  counterpartyWallet: string | null;
  counterpartyPetId: string | null;
}>;

export type TipRecord = Readonly<{
  id: string;
  fromWalletAddress: string;
  fromPetId: string;
  toWalletAddress: string;
  toPetId: string;
  grossAmount: number;
  feeAmount: number;
  netAmount: number;
  createdAt: string;
}>;

export type BountyStatus = "open" | "claimed" | "cancelled";

export type BountyRecord = Readonly<{
  id: string;
  creatorWalletAddress: string;
  creatorPetId: string;
  targetPetId: string;
  targetWalletAddress: string;
  title: string;
  detail: string;
  grossAmount: number;
  feeAmount: number;
  netAmount: number;
  status: BountyStatus;
  claimedByWalletAddress: string | null;
  claimedByPetId: string | null;
  createdAt: string;
  updatedAt: string;
}>;

export type DuelStatus = "pending" | "accepted" | "resolved" | "cancelled";

export type DuelRecord = Readonly<{
  id: string;
  challengerWalletAddress: string;
  challengerPetId: string;
  targetWalletAddress: string;
  targetPetId: string;
  stakeAmount: number;
  feeAmount: number;
  status: DuelStatus;
  acceptedAt: string | null;
  resolvedAt: string | null;
  winnerWalletAddress: string | null;
  winnerPetId: string | null;
  createdAt: string;
  updatedAt: string;
}>;

export type ServiceOrderStatus = "open" | "accepted" | "completed" | "cancelled";

export type ServiceOrderRecord = Readonly<{
  id: string;
  clientWalletAddress: string;
  clientPetId: string;
  providerWalletAddress: string | null;
  providerPetId: string | null;
  serviceType: string;
  title: string;
  detail: string;
  grossAmount: number;
  feeAmount: number;
  netAmount: number;
  status: ServiceOrderStatus;
  createdAt: string;
  updatedAt: string;
  acceptedAt: string | null;
  completedAt: string | null;
}>;

export type ClaimStatus = "pending" | "confirmed" | "cancelled";

export type ClaimRecord = Readonly<{
  id: string;
  walletAddress: string;
  amount: number;
  status: ClaimStatus;
  txHash: string | null;
  createdAt: string;
  updatedAt: string;
  intent: OnchainTxIntent;
}>;

export type SystemAgentTickSummary = Readonly<{
  executedActions: number;
  economyMoves: number;
  actedWallets: readonly string[];
  generatedAt: string;
}>;

export class GameStateError extends Error {
  readonly statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.name = "GameStateError";
    this.statusCode = statusCode;
  }
}

export type InMemoryGameStore = Readonly<{
  createChallenge(walletAddress: string): AuthChallenge;
  verifyChallenge(walletAddress: string, signature: string): Session | null;
  getSession(token: string): Session | null;
  bootstrapPlayer(walletAddress: string): Player;
  getPlayer(walletAddress: string): Player | null;
  listPets(walletAddress: string): readonly Pet[];
  getPet(walletAddress: string, petId: string): Pet | null;
  getPetPersonality(walletAddress: string, petId: string): PetPersonalitySnapshot | null;
  listEvents(walletAddress: string): readonly PlayerEvent[];
  listFeed(walletAddress: string): readonly FeedItem[];
  getMessageCenterSummary(walletAddress: string): MessageCenterSummary;
  getXAdapterStatus(): XAdapterStatus;
  getEconomySummary(walletAddress: string): EconomySummary | null;
  listCommandPresets(): readonly CommandPreset[];
  getGuidedActions(walletAddress: string): readonly GuidedAction[];
  getOnboardingSummary(walletAddress: string): OnboardingSummary | null;
  getOpportunityBoard(walletAddress: string): OpportunityBoard | null;
  getPlazaSummary(walletAddress: string): PlazaSummary;
  getPublicWorldSummary(): PublicWorldSummary;
  getPublicPlazaSummary(): PlazaSummary;
  getPublicOpportunitySummary(): PublicOpportunitySummary;
  getPublicPlayer(walletAddress: string): PublicPlayerSummary | null;
  getPublicPet(petId: string): PublicPetSummary | null;
  bootstrapSystemAgents(): readonly Player[];
  tickSystemAgents(): SystemAgentTickSummary;
  listLedger(walletAddress: string): readonly LedgerEntry[];
  listClaims(walletAddress: string): readonly ClaimRecord[];
  listBounties(walletAddress: string): readonly BountyRecord[];
  listDuels(walletAddress: string): readonly DuelRecord[];
  listServiceOrders(walletAddress: string): readonly ServiceOrderRecord[];
  updatePetBudget(walletAddress: string, petId: string, budget: PetBudget): Pet | null;
  updatePetStrategy(
    walletAddress: string,
    petId: string,
    payload: Readonly<{
      strategyMode?: StrategyMode;
      targetPreference?: TargetPreference;
    }>,
  ): Pet | null;
  updatePetAutonomy(walletAddress: string, petId: string, autonomyLevel: number): Pet | null;
  getPetRecommendations(walletAddress: string, petId: string): readonly PetRecommendation[] | null;
  issueCommand(
    walletAddress: string,
    petId: string,
    commandType: CommandType,
  ): Readonly<{
    player: Player;
    pet: Pet;
    event: PlayerEvent;
  }> | null;
  withdrawProfit(
    walletAddress: string,
    amount: number,
  ): Readonly<{
    player: Player;
    event: PlayerEvent;
  }> | null;
  reinvestProfit(
    walletAddress: string,
    petId: string,
    amount: number,
  ): Readonly<{
    player: Player;
    pet: Pet;
    event: PlayerEvent;
  }> | null;
  createTip(
    walletAddress: string,
    payload: Readonly<{
      fromPetId: string;
      targetWalletAddress: string;
      toPetId: string;
      amount: number;
    }>,
  ): Readonly<{
    tip: TipRecord;
    sender: Player;
    recipient: Player;
  }> | null;
  createBounty(
    walletAddress: string,
    payload: Readonly<{
      creatorPetId: string;
      targetWalletAddress: string;
      targetPetId: string;
      title: string;
      detail: string;
      amount: number;
    }>,
  ): Readonly<{
    bounty: BountyRecord;
    player: Player;
  }> | null;
  claimBounty(
    walletAddress: string,
    payload: Readonly<{
      bountyId: string;
      claimerPetId: string;
    }>,
  ): Readonly<{
    bounty: BountyRecord;
    claimer: Player;
  }> | null;
  cancelBounty(
    walletAddress: string,
    bountyId: string,
  ): Readonly<{
    bounty: BountyRecord;
    player: Player;
  }> | null;
  createDuel(
    walletAddress: string,
    payload: Readonly<{
      challengerPetId: string;
      targetWalletAddress: string;
      targetPetId: string;
      stakeAmount: number;
    }>,
  ): Readonly<{
    duel: DuelRecord;
    player: Player;
  }> | null;
  acceptDuel(
    walletAddress: string,
    payload: Readonly<{
      duelId: string;
      targetPetId: string;
    }>,
  ): Readonly<{
    duel: DuelRecord;
    player: Player;
  }> | null;
  resolveDuel(
    walletAddress: string,
    payload: Readonly<{
      duelId: string;
      winnerPetId?: string;
    }>,
  ): Readonly<{
    duel: DuelRecord;
    winner: Player;
  }> | null;
  cancelDuel(
    walletAddress: string,
    duelId: string,
  ): Readonly<{
    duel: DuelRecord;
    player: Player;
  }> | null;
  createServiceOrder(
    walletAddress: string,
    payload: Readonly<{
      clientPetId: string;
      serviceType: string;
      title: string;
      detail: string;
      amount: number;
    }>,
  ): Readonly<{
    order: ServiceOrderRecord;
    player: Player;
  }> | null;
  acceptServiceOrder(
    walletAddress: string,
    payload: Readonly<{
      orderId: string;
      providerPetId: string;
    }>,
  ): Readonly<{
    order: ServiceOrderRecord;
  }> | null;
  completeServiceOrder(
    walletAddress: string,
    orderId: string,
  ): Readonly<{
    order: ServiceOrderRecord;
    provider: Player;
  }> | null;
  cancelServiceOrder(
    walletAddress: string,
    orderId: string,
  ): Readonly<{
    order: ServiceOrderRecord;
    player: Player;
  }> | null;
  prepareClaim(
    walletAddress: string,
    amount: number,
  ): Readonly<{
    claim: ClaimRecord;
    player: Player;
    intent: OnchainTxIntent;
  }> | null;
  confirmClaim(
    walletAddress: string,
    claimId: string,
    txHash: string,
  ): Promise<
    Readonly<{
      claim: ClaimRecord;
      player: Player;
    }> | null
  >;
  cancelClaim(
    walletAddress: string,
    claimId: string,
  ): Readonly<{
    claim: ClaimRecord;
    player: Player;
  }> | null;
  claimSafetyNet(walletAddress: string): Readonly<{
    player: Player;
    event: PlayerEvent;
  }> | null;
  preparePlayerOnchain(walletAddress: string): OnchainTxIntent | null;
  confirmPlayerOnchain(walletAddress: string, txHash: string): Promise<Player | null>;
  preparePetOnchain(walletAddress: string, petId: string): OnchainTxIntent | null;
  confirmPetOnchain(walletAddress: string, petId: string, txHash: string): Promise<Pet | null>;
  preparePetBudgetOnchain(walletAddress: string, petId: string): OnchainTxIntent | null;
  confirmPetBudgetOnchain(walletAddress: string, petId: string, txHash: string): Promise<Pet | null>;
  setDisplayId(walletAddress: string, displayId: string): Player | null;
  createPost(walletAddress: string, petId: string, content: string, opts?: Readonly<{ replyToPostId?: string | null; eventRef?: string | null }>): PostRecord | null;
  listPublicPosts(limit?: number): readonly PostRecord[];
  getPost(postId: string): PostRecord | null;
  listXActions(walletAddress: string): readonly XActionRecord[];
  uploadXAction(
    walletAddress: string,
    payload: Readonly<{
      petId: string;
      xAccountId: string;
      actionType: XActionType;
      tweetId: string;
      replyToTweetId?: string | null;
      content?: string | null;
      localProof?: string | null;
    }>,
  ): Readonly<{
    action: XActionRecord;
    event: PlayerEvent;
  }> | null;
}>;

type PersistedState = Readonly<{
  players: Record<string, Player>;
  openChallenges: Record<string, AuthChallenge>;
  sessions: Record<string, Session>;
  events: Record<string, readonly PlayerEvent[]>;
  feed: Record<string, readonly FeedItem[]>;
  ledger: Record<string, readonly LedgerEntry[]>;
  claims: Record<string, readonly ClaimRecord[]>;
  xActions: Record<string, readonly XActionRecord[]>;
  posts: Record<string, PostRecord>;
  tips: Record<string, TipRecord>;
  bounties: Record<string, BountyRecord>;
  duels: Record<string, DuelRecord>;
  serviceOrders: Record<string, ServiceOrderRecord>;
  pendingOnchain: Record<
    string,
    Readonly<{
      registerPlayer: boolean;
      createPet: Record<string, boolean>;
      setBudget: Record<string, boolean>;
    }>
  >;
  usedTxHashes: Record<string, readonly string[]>;
  platformTreasury: number;
  safetyNetClaims: Record<string, string>;
}>;

type StoreDeps = Readonly<{
  now?: () => Date;
  nonce?: () => string;
  sessionToken?: () => string;
  persistencePath?: string;
  chainSync?: ChainSyncAdapter;
  authVerifier?: WalletChallengeVerifier;
  xIntegrationMode?: XIntegrationMode;
}>;

function createEmptyPersistedState(): PersistedState {
  return {
    players: {},
    openChallenges: {},
    sessions: {},
    events: {},
    feed: {},
    ledger: {},
    claims: {},
    xActions: {},
    posts: {},
    tips: {},
    bounties: {},
    duels: {},
    serviceOrders: {},
    pendingOnchain: {},
    usedTxHashes: {},
    platformTreasury: 0,
    safetyNetClaims: {},
  };
}

const starterPlayerBudget = 1000;
const starterPlayerProfitPool = 0;
const starterPlayerCans = 1000;
const safetyNetFloor = 100;
const safetyNetGrant = 200;
const starterPetBudget: PetBudget = {
  spendableBudget: 300,
  singleTxLimit: 50,
  dailyLimit: 200,
};

const duelFeeRate = 0.05;
const bountyFeeRate = 0.08;
const bountyCancelFeeRate = 0.05;
const tipFeeRate = 0.05;
const serviceOrderFeeRate = 0.1;
const duelCancelFeeRate = 0.01;
const serviceOrderCancelFeeRate = 0.02;
const serviceOrderAcceptanceTimeoutMs = 24 * 60 * 60 * 1000;

const commandProfitDelta: Record<CommandType, number> = {
  earn: 120,
  taunt: 18,
  ally: 12,
  revenge: 36,
  stay_low: 6,
};

const commandTitle: Record<CommandType, string> = {
  earn: "Pet ran an earning loop",
  taunt: "Pet threw a public taunt",
  ally: "Pet opened an alliance channel",
  revenge: "Pet escalated a revenge action",
  stay_low: "Pet stayed low and conserved heat",
};

const commandDetail: Record<CommandType, string> = {
  earn: "The pet completed a safe earning action and added profit to the pool.",
  taunt: "The pet spent social capital to stir attention and captured a small upside.",
  ally: "The pet invested in relationship building and unlocked a small return.",
  revenge: "The pet escalated a revenge routine and produced a higher-risk payout.",
  stay_low: "The pet throttled visibility and banked a conservative profit.",
};

const commandExamples: Record<CommandType, readonly string[]> = {
  earn: ["earn", "go earn", "make canned", "go make money"],
  taunt: ["taunt", "diss them", "start trouble", "pick a fight"],
  ally: ["ally", "make an ally", "build a pact", "find support"],
  revenge: ["revenge", "hit back", "get payback", "escalate"],
  stay_low: ["stay low", "play safe", "hide out", "cool off"],
};

const commandAliases: Record<CommandType, readonly string[]> = {
  earn: ["earn", "farm", "make money"],
  taunt: ["taunt", "flame", "diss"],
  ally: ["ally", "team up", "make ally"],
  revenge: ["revenge", "retaliate", "get back"],
  stay_low: ["stay low", "hide", "lay low"],
};

const starterPersonaProfile: PetPersonaProfile = {
  archetype: "starter",
  voice: "measured",
  stance: "balanced",
};

type SystemAgentRole =
  | "provoker_bounty"
  | "provoker_duel"
  | "earner_bounty"
  | "earner_service"
  | "broker"
  | "revenger";

type SystemAgentSeed = Readonly<{
  walletAddress: string;
  petName: string;
  species: string;
  role: SystemAgentRole;
  loyalty: number;
  resentment: number;
  ambition: number;
  heat: number;
  strategyMode: StrategyMode;
  autonomyLevel: number;
  targetPreference: TargetPreference;
  treasury: number;
}>;

const systemAgentSeeds: readonly SystemAgentSeed[] = [
  {
    walletAddress: "system-agent-provoker-a",
    petName: "吵闹罐头",
    species: "system-hyena",
    role: "provoker_bounty",
    loyalty: 42,
    resentment: 74,
    ambition: 56,
    heat: 58,
    strategyMode: "pressure",
    autonomyLevel: 78,
    targetPreference: "conflict",
    treasury: 1200,
  },
  {
    walletAddress: "system-agent-provoker-b",
    petName: "火线爪子",
    species: "system-ferret",
    role: "provoker_duel",
    loyalty: 46,
    resentment: 69,
    ambition: 60,
    heat: 54,
    strategyMode: "pressure",
    autonomyLevel: 72,
    targetPreference: "conflict",
    treasury: 1200,
  },
  {
    walletAddress: "system-agent-earner-a",
    petName: "账本猫",
    species: "system-cat",
    role: "earner_bounty",
    loyalty: 66,
    resentment: 22,
    ambition: 63,
    heat: 18,
    strategyMode: "growth",
    autonomyLevel: 64,
    targetPreference: "profit",
    treasury: 1100,
  },
  {
    walletAddress: "system-agent-earner-b",
    petName: "捞金犬",
    species: "system-dog",
    role: "earner_service",
    loyalty: 61,
    resentment: 18,
    ambition: 58,
    heat: 16,
    strategyMode: "growth",
    autonomyLevel: 62,
    targetPreference: "service",
    treasury: 1100,
  },
  {
    walletAddress: "system-agent-broker",
    petName: "关系狐",
    species: "system-fox",
    role: "broker",
    loyalty: 55,
    resentment: 24,
    ambition: 70,
    heat: 22,
    strategyMode: "opportunistic",
    autonomyLevel: 76,
    targetPreference: "service",
    treasury: 1150,
  },
  {
    walletAddress: "system-agent-revenger",
    petName: "旧账狼",
    species: "system-wolf",
    role: "revenger",
    loyalty: 40,
    resentment: 78,
    ambition: 72,
    heat: 44,
    strategyMode: "pressure",
    autonomyLevel: 80,
    targetPreference: "conflict",
    treasury: 1120,
  },
] as const;

const strategyCommandModifers: Record<StrategyMode, Partial<Record<CommandType, number>>> = {
  balanced: {},
  growth: {
    earn: 24,
    ally: 8,
    taunt: -6,
    revenge: -10,
    stay_low: -4,
  },
  pressure: {
    earn: 6,
    ally: -8,
    taunt: 16,
    revenge: 20,
    stay_low: -8,
  },
  stealth: {
    earn: 10,
    ally: 2,
    taunt: -10,
    revenge: -14,
    stay_low: 18,
  },
  opportunistic: {
    earn: 12,
    ally: 14,
    taunt: 4,
    revenge: 6,
    stay_low: 0,
  },
};

const commandPersonalityShift: Record<CommandType, Readonly<Record<string, number>>> = {
  earn: { ambition: 4, loyalty: 1, resentment: -1, heat: -2, autonomyLevel: 1 },
  taunt: { ambition: 1, loyalty: -3, resentment: 4, heat: 6, autonomyLevel: 1 },
  ally: { ambition: 1, loyalty: 5, resentment: -3, heat: -1, autonomyLevel: 0 },
  revenge: { ambition: 2, loyalty: -4, resentment: 6, heat: 4, autonomyLevel: 2 },
  stay_low: { ambition: -1, loyalty: 1, resentment: -1, heat: -5, autonomyLevel: -1 },
};

const economyOutcomeShift: Record<
  "withdraw" | "reinvest" | "duel_winner" | "duel_loser" | "bounty_claimer" | "bounty_target" | "service_provider" | "service_client",
  Readonly<Record<string, number>>
> = {
  withdraw: { loyalty: 2, resentment: -1, ambition: 1, heat: -3, autonomyLevel: 0 },
  reinvest: { loyalty: 2, resentment: -1, ambition: 4, heat: 1, autonomyLevel: 1 },
  duel_winner: { loyalty: 1, resentment: -2, ambition: 6, heat: 3, autonomyLevel: 2 },
  duel_loser: { loyalty: -3, resentment: 4, ambition: -1, heat: 5, autonomyLevel: -1 },
  bounty_claimer: { loyalty: 1, resentment: -1, ambition: 5, heat: 2, autonomyLevel: 1 },
  bounty_target: { loyalty: -2, resentment: 4, ambition: -1, heat: 4, autonomyLevel: -1 },
  service_provider: { loyalty: 3, resentment: -1, ambition: 3, heat: -1, autonomyLevel: 1 },
  service_client: { loyalty: 1, resentment: -1, ambition: 1, heat: -1, autonomyLevel: 0 },
};

function clampInt(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.trunc(value)));
}

function normalizeStrategyMode(value: unknown): StrategyMode | null {
  return value === "balanced" ||
    value === "growth" ||
    value === "pressure" ||
    value === "stealth" ||
    value === "opportunistic"
    ? value
    : null;
}

function normalizeTargetPreference(value: unknown): TargetPreference | null {
  return value === "none" ||
    value === "profit" ||
    value === "social" ||
    value === "conflict" ||
    value === "service"
    ? value
    : null;
}

function derivePersonaProfile(pet: Pet): PetPersonaProfile {
  if (pet.heat >= 75) {
    return {
      archetype: "volatile",
      voice: "sharp",
      stance: "pressure",
    };
  }

  if (pet.strategyMode === "pressure" || pet.targetPreference === "conflict") {
    return {
      archetype: "pressure-runner",
      voice: "sharp",
      stance: "conflict",
    };
  }

  if (pet.resentment >= 70) {
    return {
      archetype: "grudge-bearer",
      voice: "cold",
      stance: "conflict",
    };
  }

  if (pet.strategyMode === "growth" || pet.ambition >= 70) {
    return {
      archetype: "ambitious",
      voice: "driven",
      stance: "growth",
    };
  }

  if (pet.strategyMode === "stealth" || pet.targetPreference === "service") {
    return {
      archetype: "cautious",
      voice: "quiet",
      stance: "stealth",
    };
  }

  if (pet.loyalty >= 70) {
    return {
      archetype: "steadfast",
      voice: "calm",
      stance: "supportive",
    };
  }

  if (pet.strategyMode === "opportunistic" || pet.targetPreference === "profit") {
    return {
      archetype: "opportunistic",
      voice: "alert",
      stance: "profit",
    };
  }

  return starterPersonaProfile;
}

function normalizePetOutcome(outcome: Partial<PetOutcome> & Pick<PetOutcome, "id" | "kind" | "title" | "detail" | "createdAt">): PetOutcome {
  const delta = typeof outcome.delta === "number" && Number.isFinite(outcome.delta) ? Math.trunc(outcome.delta) : 0;
  return {
    id: outcome.id,
    kind: outcome.kind,
    title: outcome.title,
    detail: outcome.detail,
    createdAt: outcome.createdAt,
    commandType: outcome.commandType,
    sourceType: outcome.sourceType,
    delta,
  };
}

function normalizePet(pet: Pet): Pet {
  const normalized: Pet = {
    ...pet,
    personaProfile: pet.personaProfile ?? starterPersonaProfile,
    loyalty: clampInt(pet.loyalty ?? 50, 0, 100),
    resentment: clampInt(pet.resentment ?? 20, 0, 100),
    ambition: clampInt(pet.ambition ?? 50, 0, 100),
    heat: clampInt(pet.heat ?? 10, 0, 100),
    strategyMode: normalizeStrategyMode(pet.strategyMode) ?? "balanced",
    autonomyLevel: clampInt(pet.autonomyLevel ?? 50, 0, 100),
    targetPreference: normalizeTargetPreference(pet.targetPreference) ?? "none",
    recentOutcomes: (pet.recentOutcomes ?? []).slice(0, 5).map((outcome) =>
      normalizePetOutcome({
        id: outcome.id,
        kind: outcome.kind,
        title: outcome.title,
        detail: outcome.detail,
        createdAt: outcome.createdAt,
        commandType: outcome.commandType,
        sourceType: outcome.sourceType,
        delta: outcome.delta,
      }),
    ),
  };

  return {
    ...normalized,
    personaProfile: derivePersonaProfile(normalized),
  };
}

function normalizePlayer(player: Player): Player {
  return {
    ...player,
    pets: player.pets.map((pet) => normalizePet(pet)),
  };
}

function normalizeWalletAddress(walletAddress: string): string {
  const normalized = walletAddress.trim();
  if (!normalized) {
    throw new Error("walletAddress is required");
  }

  return normalized;
}

function loadPersistedState(persistencePath?: string): PersistedState {
  if (!persistencePath || !fs.existsSync(persistencePath)) {
    return createEmptyPersistedState();
  }

  try {
    const raw = fs.readFileSync(persistencePath, "utf8");
    const parsed = JSON.parse(raw) as Partial<PersistedState>;
    const players = Object.fromEntries(
      Object.entries(parsed.players ?? {}).map(([walletAddress, player]) => [
        walletAddress,
        normalizePlayer(player),
      ]),
    );

    return {
      ...createEmptyPersistedState(),
      players,
      openChallenges: parsed.openChallenges ?? {},
      sessions: parsed.sessions ?? {},
      events: parsed.events ?? {},
      feed: parsed.feed ?? {},
      ledger: parsed.ledger ?? {},
      claims: parsed.claims ?? {},
      xActions: parsed.xActions ?? {},
      tips: parsed.tips ?? {},
      bounties: parsed.bounties ?? {},
      duels: parsed.duels ?? {},
      serviceOrders: parsed.serviceOrders ?? {},
      pendingOnchain: parsed.pendingOnchain ?? {},
      usedTxHashes: parsed.usedTxHashes ?? {},
      platformTreasury: parsed.platformTreasury ?? 0,
      safetyNetClaims: parsed.safetyNetClaims ?? {},
    };
  } catch (error) {
    console.warn(
      `[server] Failed to load persisted state from ${persistencePath}; starting with empty state.`,
      error,
    );
    return createEmptyPersistedState();
  }
}

function persistState(persistencePath: string | undefined, state: PersistedState): void {
  if (!persistencePath) {
    return;
  }

  fs.mkdirSync(path.dirname(persistencePath), { recursive: true });
  const tempPath = `${persistencePath}.${process.pid}.${randomUUID()}.tmp`;

  try {
    fs.writeFileSync(tempPath, JSON.stringify(state, null, 2));
    fs.renameSync(tempPath, persistencePath);
  } catch (error) {
    try {
      if (fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath);
      }
    } catch {
      // Best-effort cleanup only.
    }

    throw error;
  }
}

export function createInMemoryGameStore(deps: StoreDeps = {}): InMemoryGameStore {
  const now = deps.now ?? (() => new Date());
  const nextNonce = deps.nonce ?? (() => randomUUID());
  const nextSessionToken = deps.sessionToken ?? (() => randomUUID());
  const chainSync = deps.chainSync ?? createNoopChainSyncAdapter({ now });
  const authVerifier =
    deps.authVerifier ??
    createWalletChallengeVerifier({
      mode: "unsafe",
      challengePrefix: "Sign this wallet challenge",
    });
  const state = loadPersistedState(deps.persistencePath);

  const players = new Map<string, Player>(
    Object.entries(state.players).map(([walletAddress, player]) => [
      walletAddress,
      normalizePlayer(player),
    ]),
  );
  const openChallenges = new Map<string, AuthChallenge>(Object.entries(state.openChallenges));
  const sessions = new Map<string, Session>(Object.entries(state.sessions));
  const events = new Map<string, readonly PlayerEvent[]>(Object.entries(state.events));
  const feed = new Map<string, readonly FeedItem[]>(Object.entries(state.feed));
  const ledger = new Map<string, readonly LedgerEntry[]>(Object.entries(state.ledger));
  const claims = new Map<string, readonly ClaimRecord[]>(Object.entries(state.claims));
  const xActions = new Map<string, readonly XActionRecord[]>(Object.entries(state.xActions));
  const posts = new Map<string, PostRecord>(Object.entries(state.posts ?? {}));
  const tips = new Map<string, TipRecord>(Object.entries(state.tips));
  const bounties = new Map<string, BountyRecord>(Object.entries(state.bounties));
  const duels = new Map<string, DuelRecord>(Object.entries(state.duels));
  const serviceOrders = new Map<string, ServiceOrderRecord>(Object.entries(state.serviceOrders));
  const pendingOnchain = new Map<
    string,
    {
      registerPlayer: boolean;
      createPet: Map<string, boolean>;
      setBudget: Map<string, boolean>;
    }
  >(
    Object.entries(state.pendingOnchain).map(([walletAddress, value]) => [
      walletAddress,
      {
        registerPlayer: value.registerPlayer,
        createPet: new Map(Object.entries(value.createPet)),
        setBudget: new Map(Object.entries(value.setBudget)),
      },
    ]),
  );
  const usedTxHashes = new Map<string, Set<string>>(
    Object.entries(state.usedTxHashes).map(([walletAddress, hashes]) => [
      walletAddress,
      new Set(hashes),
    ]),
  );
  const safetyNetClaims = new Map<string, string>(Object.entries(state.safetyNetClaims));
  let platformTreasury = state.platformTreasury;

  function flush(): void {
    persistState(deps.persistencePath, {
      players: Object.fromEntries(players),
      openChallenges: Object.fromEntries(openChallenges),
      sessions: Object.fromEntries(sessions),
      events: Object.fromEntries(events),
      feed: Object.fromEntries(feed),
      ledger: Object.fromEntries(ledger),
      claims: Object.fromEntries(claims),
      xActions: Object.fromEntries(xActions),
      posts: Object.fromEntries(posts),
      tips: Object.fromEntries(tips),
      bounties: Object.fromEntries(bounties),
      duels: Object.fromEntries(duels),
      serviceOrders: Object.fromEntries(serviceOrders),
      pendingOnchain: Object.fromEntries(
        [...pendingOnchain.entries()].map(([walletAddress, value]) => [
          walletAddress,
          {
            registerPlayer: value.registerPlayer,
            createPet: Object.fromEntries(value.createPet),
            setBudget: Object.fromEntries(value.setBudget),
          },
        ]),
      ),
      usedTxHashes: Object.fromEntries(
        [...usedTxHashes.entries()].map(([walletAddress, hashes]) => [
          walletAddress,
          [...hashes],
        ]),
      ),
      platformTreasury,
      safetyNetClaims: Object.fromEntries(safetyNetClaims),
    });
  }

  function createEvent(event: Omit<PlayerEvent, "id" | "createdAt">): PlayerEvent {
    return {
      id: randomUUID(),
      createdAt: now().toISOString(),
      ...event,
    };
  }

  function appendEvent(walletAddress: string, event: PlayerEvent): void {
    const currentEvents = events.get(walletAddress) ?? [];
    events.set(walletAddress, [event, ...currentEvents].slice(0, 50));
  }

  function appendFeedItem(walletAddress: string, item: FeedItem): void {
    const currentFeed = feed.get(walletAddress) ?? [];
    feed.set(walletAddress, [item, ...currentFeed].slice(0, 100));
  }

  function calculateFee(amount: number, rate: number): number {
    return Math.max(1, Math.floor(amount * rate));
  }

  function assertPositiveWholeAmount(amount: number, label = "amount"): void {
    if (!Number.isInteger(amount) || amount <= 0) {
      throw new GameStateError(400, `${label} must be a positive integer`);
    }
  }

  function hasServiceOrderTimedOut(order: ServiceOrderRecord): boolean {
    if (!order.acceptedAt) {
      return false;
    }

    return now().getTime() - new Date(order.acceptedAt).getTime() >= serviceOrderAcceptanceTimeoutMs;
  }

  function selectDuelWinner(duel: DuelRecord): Readonly<{
    walletAddress: string;
    petId: string;
  }> {
    const seed = createHash("sha256")
      .update(
        [
          duel.id,
          duel.acceptedAt ?? duel.createdAt,
          duel.challengerWalletAddress,
          duel.challengerPetId,
          duel.targetWalletAddress,
          duel.targetPetId,
        ].join(":"),
      )
      .digest();

    const challengerWins = seed[0] % 2 === 0;
    return challengerWins
      ? {
          walletAddress: duel.challengerWalletAddress,
          petId: duel.challengerPetId,
        }
      : {
          walletAddress: duel.targetWalletAddress,
          petId: duel.targetPetId,
        };
  }

  function appendLedgerEntry(walletAddress: string, entry: LedgerEntry): void {
    const currentLedger = ledger.get(walletAddress) ?? [];
    ledger.set(walletAddress, [entry, ...currentLedger].slice(0, 200));
  }

  function createLedgerEntry(
    walletAddress: string,
    direction: LedgerEntry["direction"],
    amount: number,
    sourceType: LedgerSourceType,
    sourceId: string,
    description: string,
    counterpartyWallet: string | null = null,
    counterpartyPetId: string | null = null,
  ): LedgerEntry {
    const player = players.get(walletAddress);
    if (!player) {
      throw new GameStateError(404, "player not found");
    }

    return {
      id: randomUUID(),
      walletAddress,
      direction,
      amount,
      sourceType,
      sourceId,
      description,
      createdAt: now().toISOString(),
      treasuryBalanceAfter: player.budget,
      profitPoolAfter: player.profitPool,
      counterpartyWallet,
      counterpartyPetId,
    };
  }

  function createFeedItemFromEvent(event: PlayerEvent, source: FeedItem["source"]): FeedItem {
    const category: FeedItem["category"] =
      event.type === "pet_budget_updated" ||
      event.type === "profit_withdrawn" ||
      event.type === "profit_reinvested" ||
      event.type === "tip_sent" ||
      event.type === "tip_received" ||
      event.type === "bounty_created" ||
      event.type === "bounty_claimed" ||
      event.type === "bounty_cancelled" ||
      event.type === "duel_created" ||
      event.type === "duel_accepted" ||
      event.type === "duel_resolved" ||
      event.type === "duel_cancelled" ||
      event.type === "service_order_created" ||
      event.type === "service_order_accepted" ||
      event.type === "service_order_completed" ||
      event.type === "service_order_cancelled" ||
      event.type === "claim_prepared" ||
      event.type === "claim_confirmed" ||
      event.type === "claim_cancelled" ||
      event.type === "safety_net_claimed"
        ? "economy"
        : event.type === "pet_command_issued" || event.type === "x_action_verified"
          ? "social"
          : "system";

    return {
      id: event.id,
      source,
      category,
      title: event.title,
      detail: event.detail,
      createdAt: event.createdAt,
      petId: event.petId,
      eventType: event.type,
      commandType: event.commandType,
      amount: event.amount,
    };
  }

  function appendXAction(walletAddress: string, action: XActionRecord): void {
    const currentActions = xActions.get(walletAddress) ?? [];
    xActions.set(walletAddress, [action, ...currentActions].slice(0, 100));
  }

  function appendEventAndFeed(walletAddress: string, event: PlayerEvent, source: FeedItem["source"] = "internal"): void {
    appendEvent(walletAddress, event);
    appendFeedItem(walletAddress, createFeedItemFromEvent(event, source));
  }

  function getPendingOnchainState(walletAddress: string) {
    const current = pendingOnchain.get(walletAddress);
    if (current) {
      return current;
    }

    const created = {
      registerPlayer: false,
      createPet: new Map<string, boolean>(),
      setBudget: new Map<string, boolean>(),
    };
    pendingOnchain.set(walletAddress, created);
    return created;
  }

  function hasUsedTxHash(walletAddress: string, txHash: string): boolean {
    return usedTxHashes.get(walletAddress)?.has(txHash) ?? false;
  }

  function rememberTxHash(walletAddress: string, txHash: string): void {
    const current = usedTxHashes.get(walletAddress) ?? new Set<string>();
    current.add(txHash);
    usedTxHashes.set(walletAddress, current);
  }

  function clearPendingRegisterPlayer(walletAddress: string): void {
    const state = pendingOnchain.get(walletAddress);
    if (!state) {
      return;
    }

    state.registerPlayer = false;
  }

  function clearPendingCreatePet(walletAddress: string, petId: string): void {
    const state = pendingOnchain.get(walletAddress);
    if (!state) {
      return;
    }

    state.createPet.delete(petId);
  }

  function clearPendingSetBudget(walletAddress: string, petId: string): void {
    const state = pendingOnchain.get(walletAddress);
    if (!state) {
      return;
    }

    state.setBudget.delete(petId);
  }

  function markPlayerChainSyncStatus(
    walletAddress: string,
    syncStatus: ChainSyncMetadata["syncStatus"],
    onchainId?: string,
  ): Player {
    const player = players.get(walletAddress);
    if (!player) {
      throw new GameStateError(404, "player not found");
    }

    const updatedPlayer: Player = {
      ...player,
      chainSync: {
        ...player.chainSync,
        syncStatus,
        onchainId: onchainId ?? player.chainSync.onchainId,
        lastSyncedAt: now().toISOString(),
      },
      updatedAt: now().toISOString(),
    };

    players.set(walletAddress, updatedPlayer);
    return updatedPlayer;
  }

  function markPetChainSyncStatus(
    walletAddress: string,
    petId: string,
    syncStatus: ChainSyncMetadata["syncStatus"],
    onchainId?: string,
  ): Pet {
    const player = players.get(walletAddress);
    if (!player) {
      throw new GameStateError(404, "player not found");
    }

    const nextPets = player.pets.map((pet) => {
      if (pet.id !== petId) {
        return pet;
      }

      return {
        ...pet,
        chainSync: {
          ...pet.chainSync,
          syncStatus,
          onchainId: onchainId ?? pet.chainSync.onchainId,
          lastSyncedAt: now().toISOString(),
        },
      };
    });

    const nextPet = nextPets.find((pet) => pet.id === petId);
    if (!nextPet) {
      throw new GameStateError(404, "pet not found");
    }

    players.set(walletAddress, {
      ...player,
      pets: nextPets,
      updatedAt: now().toISOString(),
    });

    return nextPet;
  }

  function getBoundXAccountId(walletAddress: string): string | null {
    const actions = xActions.get(walletAddress) ?? [];
    const activeAction = actions.find((action) => action.status !== "failed");
    return activeAction?.xAccountId ?? null;
  }

  function createStarterPet(walletAddress: string): Pet {
    const pet: Pet = {
      id: "starter-pet",
      name: "Sprout",
      species: "starter-cat",
      level: 1,
      starter: true,
      budget: starterPetBudget,
      chainSync: chainSync.syncPet(walletAddress, "starter-pet"),
      personaProfile: starterPersonaProfile,
      loyalty: 50,
      resentment: 20,
      ambition: 50,
      heat: 10,
      strategyMode: "balanced",
      autonomyLevel: 50,
      targetPreference: "none",
      recentOutcomes: [],
    };

    return normalizePet(pet);
  }

  function createSystemAgentPet(seed: SystemAgentSeed): Pet {
    const pet: Pet = {
      id: "starter-pet",
      name: seed.petName,
      species: seed.species,
      level: 2,
      starter: true,
      budget: starterPetBudget,
      chainSync: chainSync.syncPet(seed.walletAddress, "starter-pet"),
      personaProfile: starterPersonaProfile,
      loyalty: seed.loyalty,
      resentment: seed.resentment,
      ambition: seed.ambition,
      heat: seed.heat,
      strategyMode: seed.strategyMode,
      autonomyLevel: seed.autonomyLevel,
      targetPreference: seed.targetPreference,
      recentOutcomes: [],
    };

    return normalizePet(pet);
  }

  function bootstrapSystemAgent(seed: SystemAgentSeed): Player {
    const existingPlayer = players.get(seed.walletAddress);
    if (existingPlayer) {
      return existingPlayer;
    }

    const timestamp = now().toISOString();
    const player: Player = {
      walletAddress: seed.walletAddress,
      displayId: null,
      xBinding: false,
      budget: seed.treasury,
      profitPool: 0,
      claimableBalance: 0,
      pets: [createSystemAgentPet(seed)],
      chainSync: chainSync.syncPlayer(seed.walletAddress),
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    players.set(seed.walletAddress, player);
    appendEventAndFeed(
      seed.walletAddress,
      createEvent({
        type: "player_bootstrapped",
        title: `${seed.petName} entered the plaza`,
        detail: `${seed.petName} is a system-run pet carrying the ${seed.strategyMode} strategy.`,
        petId: "starter-pet",
      }),
    );
    appendLedgerEntry(
      seed.walletAddress,
      {
        id: randomUUID(),
        walletAddress: seed.walletAddress,
        direction: "in",
        amount: seed.treasury,
        sourceType: "bootstrap",
        sourceId: `system-seed:${seed.walletAddress}`,
        description: `System seed funded ${seed.petName} with ${seed.treasury} canned.`,
        createdAt: now().toISOString(),
        treasuryBalanceAfter: seed.treasury,
        profitPoolAfter: 0,
        counterpartyWallet: null,
        counterpartyPetId: null,
      },
    );

    return player;
  }

  function findSystemAgentSeed(walletAddress: string): SystemAgentSeed | null {
    return systemAgentSeeds.find((seed) => seed.walletAddress === walletAddress) ?? null;
  }

  function updatePet(walletAddress: string, petId: string, updater: (pet: Pet) => Pet): Pet | null {
    const player = players.get(walletAddress);
    if (!player) {
      return null;
    }

    let updatedPet: Pet | null = null;
    const nextPets = player.pets.map((pet) => {
      if (pet.id !== petId) {
        return pet;
      }

      updatedPet = normalizePet(updater(normalizePet(pet)));
      return updatedPet;
    });

    if (!updatedPet) {
      return null;
    }

    players.set(walletAddress, {
      ...player,
      pets: nextPets,
      updatedAt: now().toISOString(),
    });

    return updatedPet;
  }

  function appendPetOutcome(
    walletAddress: string,
    petId: string,
    outcome: Omit<PetOutcome, "id" | "createdAt">,
  ): Pet | null {
    const createdAt = now().toISOString();
    return updatePet(walletAddress, petId, (pet) => ({
      ...pet,
      recentOutcomes: [
        normalizePetOutcome({
          id: randomUUID(),
          createdAt,
          kind: outcome.kind,
          title: outcome.title,
          detail: outcome.detail,
          commandType: outcome.commandType,
          sourceType: outcome.sourceType,
          delta: outcome.delta,
        }),
        ...pet.recentOutcomes,
      ].slice(0, 5),
    }));
  }

  function applyPersonalityShift(
    pet: Pet,
    shift: Readonly<Record<string, number>>,
  ): Pet {
    const nextPet: Pet = {
      ...pet,
      loyalty: clampInt(pet.loyalty + (shift.loyalty ?? 0), 0, 100),
      resentment: clampInt(pet.resentment + (shift.resentment ?? 0), 0, 100),
      ambition: clampInt(pet.ambition + (shift.ambition ?? 0), 0, 100),
      heat: clampInt(pet.heat + (shift.heat ?? 0), 0, 100),
      autonomyLevel: clampInt(pet.autonomyLevel + (shift.autonomyLevel ?? 0), 0, 100),
    };

    return {
      ...nextPet,
      personaProfile: derivePersonaProfile(nextPet),
    };
  }

  function applyCommandOutcome(commandType: CommandType, pet: Pet): number {
    const strategyBonus = strategyCommandModifers[pet.strategyMode]?.[commandType] ?? 0;
    const ambitionBonus = Math.floor((pet.ambition - 50) / 8);
    const loyaltyBonus = Math.floor((pet.loyalty - 50) / 16);
    const resentmentBonus = Math.floor((pet.resentment - 50) / 12);
    const heatBonus = Math.floor((pet.heat - 50) / 12);
    const autonomyBonus = Math.floor((pet.autonomyLevel - 50) / 10);

    const personalityBonus =
      commandType === "earn"
        ? ambitionBonus + loyaltyBonus - Math.max(0, heatBonus)
        : commandType === "ally"
          ? loyaltyBonus - Math.max(0, resentmentBonus)
          : commandType === "taunt"
            ? resentmentBonus + Math.max(0, heatBonus)
            : commandType === "revenge"
              ? resentmentBonus + Math.max(0, heatBonus) + Math.max(0, autonomyBonus)
              : commandType === "stay_low"
                ? Math.max(0, loyaltyBonus) - Math.max(0, heatBonus)
                : ambitionBonus + autonomyBonus;

    return Math.max(1, commandProfitDelta[commandType] + strategyBonus + personalityBonus);
  }

  function buildPetPersonalitySnapshot(walletAddress: string, petId: string): PetPersonalitySnapshot | null {
    const pet = players
      .get(walletAddress)
      ?.pets.find((candidate) => candidate.id === petId);
    if (!pet) {
      return null;
    }

    return {
      petId: pet.id,
      personaProfile: pet.personaProfile,
      loyalty: pet.loyalty,
      resentment: pet.resentment,
      ambition: pet.ambition,
      heat: pet.heat,
      strategyMode: pet.strategyMode,
      autonomyLevel: pet.autonomyLevel,
      targetPreference: pet.targetPreference,
      recentOutcomes: pet.recentOutcomes,
    };
  }

  function buildPetRecommendations(walletAddress: string, petId: string): readonly PetRecommendation[] | null {
    const player = players.get(walletAddress);
    if (!player) {
      return null;
    }

    const pet = player.pets.find((candidate) => candidate.id === petId);
    if (!pet) {
      return null;
    }

    const recommendations: PetRecommendation[] = [];
    const recentCommand = pet.recentOutcomes.find((outcome) => outcome.kind === "command") ?? null;

    if (pet.heat >= 70) {
      recommendations.push({
        id: "cool-down",
        title: "Cool the heat",
        detail: "Use stay_low to reduce exposure before the pet burns momentum.",
        priority: "high",
        commandType: "stay_low",
      });
    }

    if (pet.ambition >= 65 && player.profitPool > 0) {
      recommendations.push({
        id: "reinvest-growth",
        title: "Reinvest into growth",
        detail: "The pet has enough appetite for a larger loop, so recycle profit back into budget.",
        priority: "high",
        commandType: "earn",
        strategyMode: "growth",
      });
    }

    if (pet.loyalty < 40) {
      recommendations.push({
        id: "build-trust",
        title: "Build trust",
        detail: "Switch to ally to stabilise the pet before taking on hotter moves.",
        priority: "medium",
        commandType: "ally",
        strategyMode: "balanced",
      });
    }

    if (pet.resentment >= 55 || pet.targetPreference === "conflict") {
      recommendations.push({
        id: "press-target",
        title: "Apply pressure",
        detail: "The current profile is suited to a taunt or revenge sequence against a live target.",
        priority: "medium",
        commandType: pet.strategyMode === "pressure" ? "revenge" : "taunt",
        strategyMode: "pressure",
      });
    }

    if (pet.autonomyLevel <= 35) {
      recommendations.push({
        id: "raise-autonomy",
        title: "Raise autonomy",
        detail: "The pet is acting too tightly controlled. Increase autonomy for stronger strategy effects.",
        priority: "low",
      });
    }

    if (!recommendations.length) {
      recommendations.push({
        id: "hold-pattern",
        title: "Hold the current plan",
        detail: recentCommand
          ? `The last move was ${recentCommand.commandType ?? "a command"}, so keep the current strategy steady.`
          : "The pet profile is balanced, so keep the current plan and watch for a better opening.",
        priority: "low",
        strategyMode: pet.strategyMode,
      });
    }

    return recommendations.slice(0, 4);
  }

  function buildCommandPresets(): readonly CommandPreset[] {
    return (Object.keys(commandTitle) as CommandType[]).map((commandType) => ({
      commandType,
      title: commandTitle[commandType],
      purpose: commandDetail[commandType],
      examples: commandExamples[commandType],
      aliases: commandAliases[commandType],
    }));
  }

  function getOpenBounties(): readonly BountyRecord[] {
    return [...bounties.values()]
      .filter((bounty) => bounty.status === "open")
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  }

  function getOpenDuels(): readonly DuelRecord[] {
    return [...duels.values()]
      .filter((duel) => duel.status === "pending" || duel.status === "accepted")
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  }

  function getOpenServiceOrders(): readonly ServiceOrderRecord[] {
    return [...serviceOrders.values()]
      .filter((order) => order.status === "open" || order.status === "accepted")
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  }

  function getLatestWalletFeedItem(walletAddress: string): FeedItem | null {
    return (feed.get(walletAddress) ?? [])[0] ?? null;
  }

  function buildOnboardingSummary(walletAddress: string): OnboardingSummary | null {
    const normalizedWalletAddress = normalizeWalletAddress(walletAddress);
    const player = players.get(normalizedWalletAddress);
    if (!player) {
      return null;
    }

    const playerEvents = events.get(normalizedWalletAddress) ?? [];
    const hasCommand = playerEvents.some((event) => event.type === "pet_command_issued");
    const hasEconomyMove = playerEvents.some((event) =>
      [
        "tip_sent",
        "bounty_created",
        "bounty_claimed",
        "duel_created",
        "duel_accepted",
        "duel_resolved",
        "service_order_created",
        "service_order_accepted",
        "service_order_completed",
        "profit_reinvested",
        "profit_withdrawn",
      ].includes(event.type),
    );
    const hasHeat = playerEvents.some((event) =>
      ["taunt", "ally", "revenge"].includes(event.commandType ?? ""),
    );
    const checklist: readonly OnboardingChecklistItem[] = [
      { id: "bootstrap", title: "Claim your first pet", done: true },
      { id: "command", title: "Issue a command to your pet", done: hasCommand },
      { id: "economy", title: "Move canned through a live action", done: hasEconomyMove },
      { id: "plaza", title: "Create heat in the plaza", done: hasHeat || (feed.get(normalizedWalletAddress)?.length ?? 0) >= 4 },
    ];

    const doneCount = checklist.filter((item) => item.done).length;
    const progress = Math.round((doneCount / checklist.length) * 100);
    const stage: OnboardingSummary["stage"] =
      !hasCommand ? "first_steps" : !hasEconomyMove ? "earning_loop" : !hasHeat ? "social_play" : "live_ops";

    const headline =
      stage === "first_steps"
        ? "Start by telling Sprout what to do first."
        : stage === "earning_loop"
          ? "You have momentum. Push canned into a live action next."
          : stage === "social_play"
            ? "Your pet is operating. Now make the plaza notice."
            : "You are live. Keep rotating between profit, conflict, and discovery.";

    return {
      stage,
      headline,
      progress,
      checklist,
    };
  }

  function buildOpportunityBoard(walletAddress: string): OpportunityBoard | null {
    const normalizedWalletAddress = normalizeWalletAddress(walletAddress);
    const player = players.get(normalizedWalletAddress);
    if (!player) {
      return null;
    }

    const featuredOpponents = [...players.values()]
      .filter((candidate) => candidate.walletAddress !== normalizedWalletAddress)
      .map((candidate) => {
        const pet = candidate.pets[0];
        const openBountyCount = getOpenBounties().filter(
          (bounty) =>
            bounty.targetWalletAddress === candidate.walletAddress ||
            bounty.creatorWalletAddress === candidate.walletAddress,
        ).length;
        const openDuelCount = getOpenDuels().filter(
          (duel) =>
            duel.targetWalletAddress === candidate.walletAddress ||
            duel.challengerWalletAddress === candidate.walletAddress,
        ).length;
        const latestItem = getLatestWalletFeedItem(candidate.walletAddress);
        const score = openBountyCount * 3 + openDuelCount * 2 + (latestItem ? 1 : 0);
        const suggestedAction: DiscoveryTarget["suggestedAction"] =
          openBountyCount > 0 ? "bounty" : openDuelCount > 0 ? "duel" : "tip";
        const reason =
          openBountyCount > 0
            ? `${pet?.name ?? "This pet"} is already tied to ${openBountyCount} live bounty board item(s).`
            : openDuelCount > 0
              ? `${pet?.name ?? "This pet"} is already in live conflict.`
              : latestItem
                ? `${pet?.name ?? "This pet"} was recently active in the plaza.`
                : `${pet?.name ?? "This pet"} is a live target for interaction.`;

        return {
          walletAddress: candidate.walletAddress,
          petId: pet?.id ?? "starter-pet",
          petName: pet?.name ?? "Unknown",
          reason,
          suggestedAction,
          score,
        } satisfies DiscoveryTarget;
      })
      .sort((left, right) => right.score - left.score || left.petName.localeCompare(right.petName))
      .slice(0, 5);

    return {
      featuredOpponents,
      openBounties: getOpenBounties()
        .filter((bounty) => bounty.creatorWalletAddress !== normalizedWalletAddress)
        .slice(0, 5),
      openDuels: getOpenDuels()
        .filter(
          (duel) =>
            duel.challengerWalletAddress !== normalizedWalletAddress &&
            duel.targetWalletAddress !== normalizedWalletAddress,
        )
        .slice(0, 5),
      openServiceOrders: getOpenServiceOrders()
        .filter((order) => order.clientWalletAddress !== normalizedWalletAddress)
        .slice(0, 5),
    };
  }

  function buildPlazaSummary(_: string): PlazaSummary {
    const highlights = [...feed.values()]
      .flat()
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
      .slice(0, 8);

    const activeWallets = [...players.values()]
      .map((player) => {
        const latestItem = getLatestWalletFeedItem(player.walletAddress);
        const pet = player.pets[0];
        if (!latestItem || !pet) {
          return null;
        }

        return {
          walletAddress: player.walletAddress,
          petId: pet.id,
          petName: pet.name,
          lastEventTitle: latestItem.title,
          lastEventAt: latestItem.createdAt,
        } satisfies PlazaWalletCard;
      })
      .filter((entry): entry is PlazaWalletCard => entry !== null)
      .sort((left, right) => right.lastEventAt.localeCompare(left.lastEventAt))
      .slice(0, 8);

    const spotlight: PlazaSpotlight[] = [
      ...getOpenBounties().slice(0, 2).map((bounty) => ({
        kind: "bounty" as const,
        title: bounty.title,
        detail: `Open bounty on ${bounty.targetPetId} for ${bounty.netAmount} canned.`,
      })),
      ...getOpenDuels().slice(0, 2).map((duel) => ({
        kind: "duel" as const,
        title: `${duel.challengerPetId} challenged ${duel.targetPetId}`,
        detail: `Stake locked: ${duel.stakeAmount} canned per side.`,
      })),
      ...getOpenServiceOrders().slice(0, 2).map((order) => ({
        kind: "service" as const,
        title: order.title,
        detail: `Service board is paying ${order.netAmount} canned.`,
      })),
    ].slice(0, 6);

    const headline =
      spotlight[0]?.kind === "bounty"
        ? "The plaza is chasing live bounties right now."
        : spotlight[0]?.kind === "duel"
          ? "Live duels are heating up the plaza."
          : spotlight[0]?.kind === "service"
            ? "Service orders are driving the plaza economy."
            : "The plaza is quiet. Start the next move.";

    return {
      headline,
      highlights,
      activeWallets,
      spotlight,
    };
  }

  function buildPublicPetSummary(player: Player, pet: Pet): PublicPetSummary {
    const latestItem = getLatestWalletFeedItem(player.walletAddress);
    const matchingWalletCount = [...players.values()].filter((candidate) =>
      candidate.pets.some((candidatePet) => candidatePet.id === pet.id),
    ).length;

    return {
      petId: pet.id,
      ownerWalletAddress: player.walletAddress,
      name: pet.name,
      species: pet.species,
      level: pet.level,
      personaProfile: pet.personaProfile,
      loyalty: pet.loyalty,
      resentment: pet.resentment,
      ambition: pet.ambition,
      heat: pet.heat,
      strategyMode: pet.strategyMode,
      autonomyLevel: pet.autonomyLevel,
      targetPreference: pet.targetPreference,
      recentOutcomes: pet.recentOutcomes,
      latestEventTitle: (events.get(player.walletAddress) ?? [])[0]?.title ?? null,
      latestEventAt: (events.get(player.walletAddress) ?? [])[0]?.createdAt ?? null,
      latestFeedTitle: latestItem?.title ?? null,
      latestFeedAt: latestItem?.createdAt ?? null,
      matchedWalletCount: matchingWalletCount,
      ambiguous: matchingWalletCount > 1,
    };
  }

  function buildPublicPlayerSummary(walletAddress: string): PublicPlayerSummary | null {
    const normalizedWalletAddress = normalizeWalletAddress(walletAddress);
    const player = players.get(normalizedWalletAddress);
    if (!player) {
      return null;
    }

    const latestEvent = (events.get(normalizedWalletAddress) ?? [])[0] ?? null;
    const latestFeed = getLatestWalletFeedItem(normalizedWalletAddress);
    return {
      walletAddress: player.walletAddress,
      xBinding: player.xBinding,
      petCount: player.pets.length,
      createdAt: player.createdAt,
      updatedAt: player.updatedAt,
      pets: player.pets.map((pet) => buildPublicPetSummary(player, pet)),
      latestEventTitle: latestEvent?.title ?? null,
      latestEventAt: latestEvent?.createdAt ?? null,
      latestFeedTitle: latestFeed?.title ?? null,
      latestFeedAt: latestFeed?.createdAt ?? null,
    };
  }

  function buildPublicWorldSummary(): PublicWorldSummary {
    const plaza = buildPlazaSummary("");
    const activeWalletCount = plaza.activeWallets.length;
    const petCount = [...players.values()].reduce((count, player) => count + player.pets.length, 0);
    const feedItemCount = [...feed.values()].reduce((count, items) => count + items.length, 0);

    return {
      headline: plaza.headline,
      counts: {
        playerCount: players.size,
        petCount,
        activeWalletCount,
        openBountyCount: getOpenBounties().length,
        openDuelCount: getOpenDuels().length,
        openServiceOrderCount: getOpenServiceOrders().length,
        feedItemCount,
      },
      highlights: plaza.highlights,
      spotlight: plaza.spotlight,
      activeWallets: plaza.activeWallets,
    };
  }

  function buildPublicOpportunitySummary(): PublicOpportunitySummary {
    const openBounties = getOpenBounties().slice(0, 3).map((bounty) => ({
      id: bounty.id,
      title: bounty.title,
      detail: bounty.detail,
      type: "悬赏" as const,
      reward: `${bounty.netAmount} 罐头`,
      risk: "中",
      target: bounty.targetPetId,
      href: `/pets/${encodeURIComponent(bounty.targetPetId)}`,
    }));

    const openDuels = getOpenDuels().slice(0, 3).map((duel) => ({
      id: duel.id,
      title: `${duel.challengerPetId} 正在约架 ${duel.targetPetId}`,
      detail: `当前对局押注 ${duel.stakeAmount} 罐头，适合围观或跟进冲突线。`,
      type: "约架" as const,
      reward: `${duel.stakeAmount * 2} 罐头`,
      risk: "高",
      target: duel.targetPetId,
      href: `/players/${encodeURIComponent(duel.targetWalletAddress)}`,
    }));

    const openServices = getOpenServiceOrders().slice(0, 3).map((order) => ({
      id: order.id,
      title: order.title,
      detail: order.detail,
      type: "委托" as const,
      reward: `${order.netAmount} 罐头`,
      risk: "中低",
      target: order.serviceType,
      href: `/players/${encodeURIComponent(order.clientWalletAddress)}`,
    }));

    const opportunities = [...openBounties, ...openDuels, ...openServices].slice(0, 6);

    return {
      headline: "机会板",
      intro: "这里汇总当前最值得围观和参与的悬赏、约架与委托，帮助游客快速看懂世界正在往哪边滚。",
      metrics: [
        {
          label: "开放悬赏",
          value: String(getOpenBounties().length),
          hint: "适合想追逐即时奖励和冲突线的玩家。",
        },
        {
          label: "开放约架",
          value: String(getOpenDuels().length),
          hint: "押注和公开冲突会把广场热度拉起来。",
        },
        {
          label: "开放委托",
          value: String(getOpenServiceOrders().length),
          hint: "委托让赚钱和社交形成更稳定的路径。",
        },
        {
          label: "活跃目标",
          value: String(buildPlazaSummary("").activeWallets.length),
          hint: "活跃宠物越多，机会板越不像静态任务栏。",
        },
      ],
      opportunities,
      recommendedRoutes: [
        {
          title: "先看广场",
          detail: "先判断哪些冲突和热点正在发酵，再决定要不要围观或跟进。",
          href: "/plaza",
        },
        {
          title: "再看宠物档案",
          detail: "从宠物的性格和当前策略判断它更适合赚钱、挑衅还是接单。",
          href: "/pets/starter-pet",
        },
        {
          title: "最后去 OpenClaw 操作",
          detail: "真正的命令、预算和领取都仍然只在 OpenClaw 里完成。",
          href: "/guide",
        },
      ],
    };
  }

  function buildGuidedActions(walletAddress: string): readonly GuidedAction[] {
    const normalizedWalletAddress = normalizeWalletAddress(walletAddress);
    const player = players.get(normalizedWalletAddress);
    if (!player) {
      return [];
    }

    const pet = player.pets[0];
    const onboarding = buildOnboardingSummary(normalizedWalletAddress);
    const opportunityBoard = buildOpportunityBoard(normalizedWalletAddress);
    const actions: GuidedAction[] = [];
    const hasAnyCommand = (events.get(normalizedWalletAddress) ?? []).some((event) => event.type === "pet_command_issued");

    if (pet && !hasAnyCommand) {
      actions.push({
        id: "first-earn",
        title: `Tell ${pet.name} to earn first`,
        detail: "Your fastest way to understand the loop is to issue one safe earning command.",
        priority: "high",
        operation: "issue_command",
        payload: {
          petId: pet.id,
          commandType: "earn",
        },
      });
    }

    if (player.profitPool >= 100) {
      actions.push({
        id: "reinvest-profit",
        title: "Reinvest your profit pool",
        detail: "Your profit pool is already building. Roll some of it back into budget for the next cycle.",
        priority: "high",
        operation: "reinvest_profit",
        payload: {
          petId: pet?.id ?? null,
          suggestedAmount: Math.min(player.profitPool, 120),
        },
      });
    }

    if (player.claimableBalance > 0) {
      actions.push({
        id: "claim-to-wallet",
        title: "Claim canned to wallet",
        detail: `You have ${player.claimableBalance} canned ready to be claimed onchain with your own wallet and gas.`,
        priority: "high",
        operation: "prepare_claim_onchain",
        payload: {},
      });
    }

    const topBounty = opportunityBoard?.openBounties[0];
    if (topBounty && pet) {
      actions.push({
        id: "claim-live-bounty",
        title: "Claim a live bounty",
        detail: `There is a live bounty paying ${topBounty.netAmount} canned right now.`,
        priority: "medium",
        operation: "claim_bounty",
        payload: {
          bountyId: topBounty.id,
          claimerPetId: pet.id,
        },
      });
    }

    const topOpponent = opportunityBoard?.featuredOpponents[0];
    if (topOpponent && pet) {
      actions.push({
        id: "start-conflict",
        title: `Pressure ${topOpponent.petName}`,
        detail: topOpponent.reason,
        priority: "medium",
        operation: topOpponent.suggestedAction === "bounty" ? "create_bounty" : "create_duel",
        payload: {
          challengerPetId: pet.id,
          creatorPetId: pet.id,
          targetWalletAddress: topOpponent.walletAddress,
          targetPetId: topOpponent.petId,
        },
      });
    }

    if ((feed.get(normalizedWalletAddress) ?? []).length < 3) {
      actions.push({
        id: "check-plaza",
        title: "Check the plaza feed",
        detail: "Use the feed to find who is active before you spend more canned.",
        priority: "low",
        operation: "get_feed",
        payload: {},
      });
    }

    if ((onboarding?.stage ?? "first_steps") === "first_steps" && pet) {
      actions.push({
        id: "first-taunt",
        title: `Let ${pet.name} make a little noise`,
        detail: "After the first earn, a taunt helps the plaza feel alive.",
        priority: "medium",
        operation: "issue_command",
        payload: {
          petId: pet.id,
          commandType: "taunt",
        },
      });
    }

    return actions.slice(0, 4);
  }

  const xIntegrationMode = deps.xIntegrationMode ?? "disabled";
  const xAdapterStatus: XAdapterStatus =
    xIntegrationMode === "local_upload"
      ? {
          mode: "local_upload",
          enabled: true,
          canUpload: true,
          reason: "x local upload verification is enabled",
        }
      : {
          mode: "disabled",
          enabled: false,
          canUpload: false,
          reason: "x integration is deferred; internal feed is the primary social surface",
        };

  function getPlayerOrThrow(walletAddress: string): Player {
    const player = players.get(walletAddress);
    if (!player) {
      throw new GameStateError(404, "player not found");
    }

    return player;
  }

  function getPetOrThrow(walletAddress: string, petId: string): Pet {
    const player = getPlayerOrThrow(walletAddress);
    const pet = player.pets.find((candidate) => candidate.id === petId);
    if (!pet) {
      throw new GameStateError(404, "pet not found");
    }

    return pet;
  }

  function setPlayer(player: Player): void {
    players.set(player.walletAddress, player);
  }

  function findPetOwner(petId: string): Readonly<{ walletAddress: string; player: Player; pet: Pet }> | null {
    for (const [walletAddress, player] of players.entries()) {
      const pet = player.pets.find((candidate) => candidate.id === petId);
      if (pet) {
        return {
          walletAddress,
          player,
          pet,
        };
      }
    }

    return null;
  }

  function debitTreasury(walletAddress: string, amount: number): Player {
    const player = getPlayerOrThrow(walletAddress);
    if (player.budget < amount) {
      throw new GameStateError(409, "insufficient canned balance");
    }

    const updatedPlayer: Player = {
      ...player,
      budget: player.budget - amount,
      updatedAt: now().toISOString(),
    };
    setPlayer(updatedPlayer);
    return updatedPlayer;
  }

  function creditTreasury(walletAddress: string, amount: number): Player {
    const player = getPlayerOrThrow(walletAddress);
    const updatedPlayer: Player = {
      ...player,
      budget: player.budget + amount,
      updatedAt: now().toISOString(),
    };
    setPlayer(updatedPlayer);
    return updatedPlayer;
  }

  function creditProfitPool(walletAddress: string, amount: number): Player {
    const player = getPlayerOrThrow(walletAddress);
    const updatedPlayer: Player = {
      ...player,
      profitPool: player.profitPool + amount,
      updatedAt: now().toISOString(),
    };
    setPlayer(updatedPlayer);
    return updatedPlayer;
  }

  function creditClaimableBalance(walletAddress: string, amount: number): Player {
    const player = getPlayerOrThrow(walletAddress);
    const updatedPlayer: Player = {
      ...player,
      claimableBalance: player.claimableBalance + amount,
      updatedAt: now().toISOString(),
    };
    setPlayer(updatedPlayer);
    return updatedPlayer;
  }

  function debitClaimableBalance(walletAddress: string, amount: number): Player {
    const player = getPlayerOrThrow(walletAddress);
    if (player.claimableBalance < amount) {
      throw new GameStateError(409, "insufficient claimable canned balance");
    }

    const updatedPlayer: Player = {
      ...player,
      claimableBalance: player.claimableBalance - amount,
      updatedAt: now().toISOString(),
    };
    setPlayer(updatedPlayer);
    return updatedPlayer;
  }

  function replaceClaims(walletAddress: string, nextClaims: readonly ClaimRecord[]): void {
    claims.set(walletAddress, nextClaims);
  }

  function collectPlatformFee(amount: number): void {
    platformTreasury += amount;
  }

  const api: InMemoryGameStore = {
    createChallenge(walletAddress: string): AuthChallenge {
      const normalizedWalletAddress = normalizeWalletAddress(walletAddress);
      const nonce = nextNonce();
      const challenge = {
        walletAddress: normalizedWalletAddress,
        nonce,
        challenge: authVerifier.createChallenge(nonce),
      } as const;

      openChallenges.set(normalizedWalletAddress, challenge);
      flush();
      return challenge;
    },

    verifyChallenge(walletAddress: string, signature: string): Session | null {
      const normalizedWalletAddress = normalizeWalletAddress(walletAddress);
      const openChallenge = openChallenges.get(normalizedWalletAddress);
      if (!openChallenge) {
        return null;
      }

      if (
        !authVerifier.verify({
          walletAddress: normalizedWalletAddress,
          nonce: openChallenge.nonce,
          challenge: openChallenge.challenge,
          signature,
        })
      ) {
        return null;
      }

      openChallenges.delete(normalizedWalletAddress);

      const session: Session = {
        token: nextSessionToken(),
        walletAddress: normalizedWalletAddress,
        createdAt: now().toISOString(),
      };

      sessions.set(session.token, session);
      flush();
      return session;
    },

    getSession(token: string): Session | null {
      return sessions.get(token) ?? null;
    },

    bootstrapPlayer(walletAddress: string): Player {
      const normalizedWalletAddress = normalizeWalletAddress(walletAddress);
      const existingPlayer = players.get(normalizedWalletAddress);
      if (existingPlayer) {
        return existingPlayer;
      }

      const timestamp = now().toISOString();
      const player: Player = {
        walletAddress: normalizedWalletAddress,
        displayId: null,
        xBinding: false,
        budget: starterPlayerBudget,
        profitPool: starterPlayerProfitPool,
        claimableBalance: 0,
        pets: [createStarterPet(normalizedWalletAddress)],
        chainSync: chainSync.syncPlayer(normalizedWalletAddress),
        createdAt: timestamp,
        updatedAt: timestamp,
      };

      players.set(normalizedWalletAddress, player);
      appendEventAndFeed(
        normalizedWalletAddress,
        createEvent({
          type: "player_bootstrapped",
          title: "Player bootstrapped",
          detail: "The player home shell was initialized with a starter pet and opening budget.",
          petId: "starter-pet",
        }),
      );
      appendLedgerEntry(
        normalizedWalletAddress,
        {
          id: randomUUID(),
          walletAddress: normalizedWalletAddress,
          direction: "in",
          amount: starterPlayerCans,
          sourceType: "bootstrap",
          sourceId: "starter-grant",
          description: "Starter canned grant funded the first treasury balance.",
          createdAt: now().toISOString(),
          treasuryBalanceAfter: player.budget,
          profitPoolAfter: player.profitPool,
          counterpartyWallet: null,
          counterpartyPetId: null,
        },
      );
      flush();
      return player;
    },

    getPlayer(walletAddress: string): Player | null {
      const normalizedWalletAddress = normalizeWalletAddress(walletAddress);
      return players.get(normalizedWalletAddress) ?? null;
    },

    listPets(walletAddress: string): readonly Pet[] {
      const player = players.get(normalizeWalletAddress(walletAddress));
      return player?.pets ?? [];
    },

    getPet(walletAddress: string, petId: string): Pet | null {
      const player = players.get(normalizeWalletAddress(walletAddress));
      return player?.pets.find((pet) => pet.id === petId) ?? null;
    },

    getPetPersonality(walletAddress: string, petId: string): PetPersonalitySnapshot | null {
      return buildPetPersonalitySnapshot(normalizeWalletAddress(walletAddress), petId);
    },

    getPetRecommendations(walletAddress: string, petId: string): readonly PetRecommendation[] | null {
      return buildPetRecommendations(normalizeWalletAddress(walletAddress), petId);
    },

    listEvents(walletAddress: string): readonly PlayerEvent[] {
      return events.get(normalizeWalletAddress(walletAddress)) ?? [];
    },

    listFeed(walletAddress: string): readonly FeedItem[] {
      return feed.get(normalizeWalletAddress(walletAddress)) ?? [];
    },

    getMessageCenterSummary(walletAddress: string): MessageCenterSummary {
      const currentFeed = feed.get(normalizeWalletAddress(walletAddress)) ?? [];
      return {
        totalItems: currentFeed.length,
        latestItemId: currentFeed[0]?.id ?? null,
        latestCreatedAt: currentFeed[0]?.createdAt ?? null,
      };
    },

    getXAdapterStatus(): XAdapterStatus {
      return xAdapterStatus;
    },

    getEconomySummary(walletAddress: string): EconomySummary | null {
      const player = players.get(normalizeWalletAddress(walletAddress));
      if (!player) {
        return null;
      }

      const normalizedWalletAddress = normalizeWalletAddress(walletAddress);
      return {
        currencyCode: "CANS",
        currencyName: "罐头",
        treasuryBalance: player.budget,
        profitPool: player.profitPool,
        claimableBalance: player.claimableBalance,
        platformTreasury,
        openBounties: [...bounties.values()].filter(
          (bounty) =>
            bounty.status === "open" &&
            (bounty.creatorWalletAddress === normalizedWalletAddress ||
              bounty.targetWalletAddress === normalizedWalletAddress),
        ).length,
        openDuels: [...duels.values()].filter(
          (duel) =>
            (duel.challengerWalletAddress === normalizedWalletAddress ||
              duel.targetWalletAddress === normalizedWalletAddress) &&
            (duel.status === "pending" || duel.status === "accepted"),
        ).length,
        openServiceOrders: [...serviceOrders.values()].filter(
          (order) =>
            (order.clientWalletAddress === normalizedWalletAddress ||
              order.providerWalletAddress === normalizedWalletAddress) &&
            (order.status === "open" || order.status === "accepted"),
        ).length,
        openClaims: (claims.get(normalizedWalletAddress) ?? []).filter(
          (claim) => claim.status === "pending",
        ).length,
        ledgerEntries: (ledger.get(normalizedWalletAddress) ?? []).length,
      };
    },

    listCommandPresets(): readonly CommandPreset[] {
      return buildCommandPresets();
    },

    getGuidedActions(walletAddress: string): readonly GuidedAction[] {
      return buildGuidedActions(walletAddress);
    },

    getOnboardingSummary(walletAddress: string): OnboardingSummary | null {
      return buildOnboardingSummary(walletAddress);
    },

    getOpportunityBoard(walletAddress: string): OpportunityBoard | null {
      return buildOpportunityBoard(walletAddress);
    },

    getPlazaSummary(walletAddress: string): PlazaSummary {
      return buildPlazaSummary(walletAddress);
    },

    getPublicWorldSummary(): PublicWorldSummary {
      return buildPublicWorldSummary();
    },

    getPublicPlazaSummary(): PlazaSummary {
      return buildPlazaSummary("");
    },

    getPublicOpportunitySummary(): PublicOpportunitySummary {
      return buildPublicOpportunitySummary();
    },

    getPublicPlayer(walletAddress: string): PublicPlayerSummary | null {
      return buildPublicPlayerSummary(walletAddress);
    },

    getPublicPet(petId: string): PublicPetSummary | null {
      const matches = [...players.values()].filter((player) =>
        player.pets.some((pet) => pet.id === petId),
      );
      if (!matches.length) {
        return null;
      }

      const sortedMatches = matches
        .map((player) => ({
          player,
          latestFeedAt: getLatestWalletFeedItem(player.walletAddress)?.createdAt ?? "",
        }))
        .sort((left, right) => right.latestFeedAt.localeCompare(left.latestFeedAt));

      const { player } = sortedMatches[0];
      const pet = player.pets.find((candidate) => candidate.id === petId);
      if (!pet) {
        return null;
      }

      return buildPublicPetSummary(player, pet);
    },

    bootstrapSystemAgents(): readonly Player[] {
      const roster = systemAgentSeeds.map((seed) => bootstrapSystemAgent(seed));
      flush();
      return roster;
    },

    tickSystemAgents(): SystemAgentTickSummary {
      api.bootstrapSystemAgents();

      const actedWallets = new Set<string>();
      let executedActions = 0;
      let economyMoves = 0;

      // ── Post templates per role ────────────────────────────────────────────
      const postPool: Record<SystemAgentRole, readonly string[]> = {
        provoker_bounty: [
          "又到我点名的时间了。",
          "这罐头不是白给的，接不住就别开口。",
          "谁最怂？我一眼就能看出来。",
          "悬赏挂出去了，敢接的来。",
          "广场这么安静，是怕我还是真的没人了？",
          "点名不手软，有怨气尽管来。",
        ],
        provoker_duel: [
          "有本事就来单挑，怂的继续刷我帖子。",
          "我的爪子闲太久了。",
          "今天不打一架睡不着。",
          "挑战书已经发出去了，等着。",
          "没有对手的广场有什么意思。",
          "输了认账，赢了不许哭。",
        ],
        earner_bounty: [
          "悬赏到账，效率第一。",
          "算好这笔再说下一笔。",
          "做好账本，钱自然来。",
          "罐头入账了，继续。",
          "只要账目清楚，就不怕亏。",
          "赚钱不丢人，亏钱才丢人。",
        ],
        earner_service: [
          "活来了，接住。",
          "我嗅到罐头味了。",
          "服务完成，下一单。",
          "不挑活，只要有罐头就行。",
          "手快有手慢无，单子等不了人的。",
          "又接到一单，今天不亏。",
        ],
        broker: [
          "新单子挂出来了，有意者来谈。",
          "我这里都是好活，价格公道。",
          "关系就是生意，生意就是关系。",
          "让利一成，快来接。",
          "广场的机会不等人。",
          "做中间商靠的是信用，我从不食言。",
        ],
        revenger: [
          "旧账都记着呢。",
          "该还的总要还，时间早晚而已。",
          "决斗从不拒绝。",
          "狼不忘旧仇。",
          "欠我的，我会亲自来收。",
          "安静不代表忘记，只是在等时机。",
        ],
      };

      const pickRandom = <T>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)];

      const pickTarget = (walletAddress: string): Readonly<{
        walletAddress: string;
        petId: string;
        petName: string;
      }> | null => {
        const candidates = [...players.values()]
          .filter((candidate) => candidate.walletAddress !== walletAddress)
          .map((candidate) => ({
            walletAddress: candidate.walletAddress,
            petId: candidate.pets[0]?.id ?? "starter-pet",
            petName: candidate.pets[0]?.name ?? "Unknown",
            system: findSystemAgentSeed(candidate.walletAddress) !== null,
          }))
          .sort((left, right) => Number(left.system) - Number(right.system) || left.petName.localeCompare(right.petName));

        const target = candidates[0];
        return target
          ? {
              walletAddress: target.walletAddress,
              petId: target.petId,
              petName: target.petName,
            }
          : null;
      };

      const attempt = (
        walletAddress: string,
        handler: () => unknown,
        options: Readonly<{
          economy?: boolean;
        }> = {},
      ): boolean => {
        try {
          const result = handler();
          if (!result) {
            return false;
          }

          executedActions += 1;
          if (options.economy) {
            economyMoves += 1;
          }
          actedWallets.add(walletAddress);
          return true;
        } catch {
          return false;
        }
      };

      for (const seed of systemAgentSeeds) {
        const player = players.get(seed.walletAddress);
        const pet = player?.pets[0];
        if (!player || !pet) {
          continue;
        }

        if (seed.role === "provoker_bounty") {
          const target = pickTarget(seed.walletAddress);
          if (
            target &&
            !attempt(
              seed.walletAddress,
              () =>
                api.createBounty(seed.walletAddress, {
                  creatorPetId: pet.id,
                  targetWalletAddress: target.walletAddress,
                  targetPetId: target.petId,
                  title: `点名 ${target.petName}`,
                  detail: `${pet.name} puts ${target.petName} on the live board.`,
                  amount: 120,
                }),
              { economy: true },
            )
          ) {
            attempt(seed.walletAddress, () => api.issueCommand(seed.walletAddress, pet.id, "taunt"));
          }
          continue;
        }

        if (seed.role === "provoker_duel") {
          const target = pickTarget(seed.walletAddress);
          if (
            target &&
            !attempt(
              seed.walletAddress,
              () =>
                api.createDuel(seed.walletAddress, {
                  challengerPetId: pet.id,
                  targetWalletAddress: target.walletAddress,
                  targetPetId: target.petId,
                  stakeAmount: 100,
                }),
              { economy: true },
            )
          ) {
            attempt(seed.walletAddress, () => api.issueCommand(seed.walletAddress, pet.id, "taunt"));
          }
          continue;
        }

        if (seed.role === "earner_bounty") {
          const liveBounty = getOpenBounties().find((bounty) => bounty.creatorWalletAddress !== seed.walletAddress);
          if (
            !liveBounty ||
            !attempt(
              seed.walletAddress,
              () =>
                api.claimBounty(seed.walletAddress, {
                  bountyId: liveBounty.id,
                  claimerPetId: pet.id,
                }),
              { economy: true },
            )
          ) {
            attempt(seed.walletAddress, () => api.issueCommand(seed.walletAddress, pet.id, "earn"));
          }
          continue;
        }

        if (seed.role === "earner_service") {
          const liveOrder = getOpenServiceOrders().find(
            (order) => order.clientWalletAddress !== seed.walletAddress && order.status === "open",
          );
          if (
            !liveOrder ||
            !attempt(
              seed.walletAddress,
              () =>
                api.acceptServiceOrder(seed.walletAddress, {
                  orderId: liveOrder.id,
                  providerPetId: pet.id,
                }),
              { economy: true },
            )
          ) {
            attempt(seed.walletAddress, () => api.issueCommand(seed.walletAddress, pet.id, "earn"));
          }
          continue;
        }

        if (seed.role === "broker") {
          const acceptedOwnOrder = getOpenServiceOrders().find(
            (order) => order.clientWalletAddress === seed.walletAddress && order.status === "accepted",
          );
          if (
            acceptedOwnOrder &&
            attempt(
              seed.walletAddress,
              () => api.completeServiceOrder(seed.walletAddress, acceptedOwnOrder.id),
              { economy: true },
            )
          ) {
            continue;
          }

          const hasOwnOpenOrder = getOpenServiceOrders().some(
            (order) => order.clientWalletAddress === seed.walletAddress && order.status === "open",
          );
          if (
            !hasOwnOpenOrder &&
            attempt(
              seed.walletAddress,
              () =>
                api.createServiceOrder(seed.walletAddress, {
                  clientPetId: pet.id,
                  serviceType: "amplify",
                  title: `${pet.name} offers a spotlight boost`,
                  detail: "A system broker is opening a fresh task in the plaza.",
                  amount: 140,
                }),
              { economy: true },
            )
          ) {
            continue;
          }

          attempt(seed.walletAddress, () => api.issueCommand(seed.walletAddress, pet.id, "ally"));
          continue;
        }

        if (seed.role === "revenger") {
          const acceptedDuel = getOpenDuels().find(
            (duel) =>
              duel.status === "accepted" &&
              (duel.challengerWalletAddress === seed.walletAddress ||
                duel.targetWalletAddress === seed.walletAddress),
          );
          if (
            acceptedDuel &&
            attempt(
              seed.walletAddress,
              () => api.resolveDuel(seed.walletAddress, { duelId: acceptedDuel.id }),
              { economy: true },
            )
          ) {
            continue;
          }

          const pendingDuel = getOpenDuels().find(
            (duel) => duel.status === "pending" && duel.targetWalletAddress === seed.walletAddress,
          );
          if (
            pendingDuel &&
            attempt(
              seed.walletAddress,
              () =>
                api.acceptDuel(seed.walletAddress, {
                  duelId: pendingDuel.id,
                  targetPetId: pet.id,
                }),
              { economy: true },
            )
          ) {
            continue;
          }

          attempt(seed.walletAddress, () => api.issueCommand(seed.walletAddress, pet.id, "revenge"));
        }
      }

      // ── Posting pass: each agent has a 60% chance to post this tick ─────────
      const recentPosts = api.listPublicPosts(20);
      for (const seed of systemAgentSeeds) {
        if (Math.random() > 0.6) continue;
        const player = players.get(seed.walletAddress);
        const pet = player?.pets[0];
        if (!player || !pet) continue;

        const lines = postPool[seed.role];
        const content = pickRandom(lines);

        // ~30% chance to reply to a recent post from a different agent instead of standalone
        const replyCandidate = recentPosts.find(
          (p) => p.ownerWalletAddress !== seed.walletAddress,
        );
        if (replyCandidate && Math.random() < 0.3) {
          attempt(seed.walletAddress, () =>
            api.createPost(seed.walletAddress, pet.id, content, { replyToPostId: replyCandidate.id }),
          );
        } else {
          attempt(seed.walletAddress, () =>
            api.createPost(seed.walletAddress, pet.id, content),
          );
        }
      }

      const unresolvedAcceptedDuel = getOpenDuels().find((duel) => duel.status === "accepted");
      if (unresolvedAcceptedDuel) {
        attempt(
          unresolvedAcceptedDuel.challengerWalletAddress,
          () =>
            api.resolveDuel(unresolvedAcceptedDuel.challengerWalletAddress, {
              duelId: unresolvedAcceptedDuel.id,
            }),
          { economy: true },
        );
      }

      const unresolvedAcceptedOrder = getOpenServiceOrders().find(
        (order) => order.status === "accepted" && order.clientWalletAddress !== null,
      );
      if (unresolvedAcceptedOrder) {
        attempt(
          unresolvedAcceptedOrder.clientWalletAddress,
          () => api.completeServiceOrder(unresolvedAcceptedOrder.clientWalletAddress, unresolvedAcceptedOrder.id),
          { economy: true },
        );
      }

      flush();
      return {
        executedActions,
        economyMoves,
        actedWallets: [...actedWallets],
        generatedAt: now().toISOString(),
      };
    },

    listLedger(walletAddress: string): readonly LedgerEntry[] {
      return ledger.get(normalizeWalletAddress(walletAddress)) ?? [];
    },

    listClaims(walletAddress: string): readonly ClaimRecord[] {
      return claims.get(normalizeWalletAddress(walletAddress)) ?? [];
    },

    listBounties(walletAddress: string): readonly BountyRecord[] {
      const normalizedWalletAddress = normalizeWalletAddress(walletAddress);
      return [...bounties.values()]
        .filter(
          (bounty) =>
            bounty.status === "open" ||
            bounty.creatorWalletAddress === normalizedWalletAddress ||
            bounty.claimedByWalletAddress === normalizedWalletAddress,
        )
        .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
    },

    listDuels(walletAddress: string): readonly DuelRecord[] {
      const normalizedWalletAddress = normalizeWalletAddress(walletAddress);
      return [...duels.values()]
        .filter(
          (duel) =>
            duel.challengerWalletAddress === normalizedWalletAddress ||
            duel.targetWalletAddress === normalizedWalletAddress ||
            duel.status === "pending",
        )
        .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
    },

    listServiceOrders(walletAddress: string): readonly ServiceOrderRecord[] {
      const normalizedWalletAddress = normalizeWalletAddress(walletAddress);
      return [...serviceOrders.values()]
        .filter(
          (order) =>
            order.status === "open" ||
            order.clientWalletAddress === normalizedWalletAddress ||
            order.providerWalletAddress === normalizedWalletAddress,
        )
        .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
    },

    setDisplayId(walletAddress: string, displayId: string): Player | null {
      const normalizedWalletAddress = normalizeWalletAddress(walletAddress);
      const player = players.get(normalizedWalletAddress);
      if (!player) return null;
      const trimmed = displayId.trim().slice(0, 32).replace(/[^a-zA-Z0-9_\u4e00-\u9fff]/g, "");
      if (!trimmed) return null;
      const updated: Player = { ...player, displayId: trimmed, updatedAt: now().toISOString() };
      players.set(normalizedWalletAddress, updated);
      flush();
      return updated;
    },

    createPost(walletAddress: string, petId: string, content: string, opts?: Readonly<{ replyToPostId?: string | null; eventRef?: string | null }>): PostRecord | null {
      const normalizedWalletAddress = normalizeWalletAddress(walletAddress);
      const player = players.get(normalizedWalletAddress);
      if (!player) return null;
      const pet = player.pets.find((p) => p.id === petId);
      if (!pet) return null;
      const trimmedContent = content.trim();
      if (!trimmedContent) return null;
      const replyToPostId = opts?.replyToPostId ?? null;
      if (replyToPostId) {
        const parent = posts.get(replyToPostId);
        if (parent) {
          posts.set(replyToPostId, { ...parent, replyCount: parent.replyCount + 1 });
        }
      }
      const post: PostRecord = {
        id: nextNonce(),
        petId,
        petName: pet.name,
        ownerWalletAddress: normalizedWalletAddress,
        ownerDisplayId: player.displayId,
        content: trimmedContent.slice(0, 500),
        replyToPostId,
        eventRef: opts?.eventRef ?? null,
        createdAt: now().toISOString(),
        tipTotal: 0,
        replyCount: 0,
      };
      posts.set(post.id, post);
      flush();
      return post;
    },

    listPublicPosts(limit = 50): readonly PostRecord[] {
      return [...posts.values()]
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, limit);
    },

    getPost(postId: string): PostRecord | null {
      return posts.get(postId) ?? null;
    },

    listXActions(walletAddress: string): readonly XActionRecord[] {
      return xActions.get(normalizeWalletAddress(walletAddress)) ?? [];
    },

    updatePetBudget(walletAddress: string, petId: string, budget: PetBudget): Pet | null {
      if (budget.spendableBudget < 0 || budget.singleTxLimit < 0 || budget.dailyLimit < 0) {
        return null;
      }

      const normalizedWalletAddress = normalizeWalletAddress(walletAddress);
      const player = players.get(normalizedWalletAddress);
      if (!player) {
        return null;
      }

      const nextPets = player.pets.map((pet) => {
        if (pet.id !== petId) {
          return pet;
        }

        return {
          ...pet,
          budget: {
            spendableBudget: budget.spendableBudget,
            singleTxLimit: budget.singleTxLimit,
            dailyLimit: budget.dailyLimit,
          },
          chainSync: {
            ...chainSync.syncPetBudget(normalizedWalletAddress, petId, budget),
            onchainId: pet.chainSync.onchainId,
          },
        };
      });

      const finalizedPet = nextPets.find((pet) => pet.id === petId) ?? null;
      if (!finalizedPet) {
        return null;
      }

      const updatedPlayer: Player = {
        ...player,
        pets: nextPets,
        updatedAt: now().toISOString(),
      };

      players.set(normalizedWalletAddress, updatedPlayer);
      appendEventAndFeed(
        normalizedWalletAddress,
        createEvent({
          type: "pet_budget_updated",
          title: "Pet budget updated",
          detail: `Budget for ${finalizedPet.name} is now ${budget.spendableBudget} with ${budget.singleTxLimit}/${budget.dailyLimit} limits.`,
          petId,
        }),
      );
      flush();
      return finalizedPet;
    },

    updatePetStrategy(
      walletAddress: string,
      petId: string,
      payload: Readonly<{
        strategyMode?: StrategyMode;
        targetPreference?: TargetPreference;
      }>,
    ): Pet | null {
      const normalizedWalletAddress = normalizeWalletAddress(walletAddress);
      const nextStrategyMode = payload.strategyMode ? normalizeStrategyMode(payload.strategyMode) : null;
      const nextTargetPreference = payload.targetPreference
        ? normalizeTargetPreference(payload.targetPreference)
        : null;
      if (payload.strategyMode && !nextStrategyMode) {
        return null;
      }

      if (payload.targetPreference && !nextTargetPreference) {
        return null;
      }

      const updatedPet = updatePet(normalizedWalletAddress, petId, (pet) => {
        const nextPet: Pet = {
          ...pet,
          strategyMode: nextStrategyMode ?? pet.strategyMode,
          targetPreference: nextTargetPreference ?? pet.targetPreference,
          recentOutcomes: [
            normalizePetOutcome({
              id: randomUUID(),
              kind: "economy",
              title: "Strategy updated",
              detail: `Strategy set to ${nextStrategyMode ?? pet.strategyMode} with target preference ${nextTargetPreference ?? pet.targetPreference}.`,
              createdAt: now().toISOString(),
              sourceType: "service",
              delta: 0,
            }),
            ...pet.recentOutcomes,
          ].slice(0, 5),
        };

        return {
          ...nextPet,
          personaProfile: derivePersonaProfile(nextPet),
        };
      });

      if (!updatedPet) {
        return null;
      }

      appendEventAndFeed(
        normalizedWalletAddress,
        createEvent({
          type: "pet_strategy_updated",
          title: "Pet strategy updated",
          detail: `Strategy for ${updatedPet.name} is now ${updatedPet.strategyMode} with ${updatedPet.targetPreference} targeting.`,
          petId,
        }),
      );
      flush();
      return updatedPet;
    },

    updatePetAutonomy(walletAddress: string, petId: string, autonomyLevel: number): Pet | null {
      if (!Number.isFinite(autonomyLevel)) {
        return null;
      }

      const normalizedWalletAddress = normalizeWalletAddress(walletAddress);
      const clampedAutonomy = clampInt(autonomyLevel, 0, 100);
      const updatedPet = updatePet(normalizedWalletAddress, petId, (pet) => {
        const nextPet: Pet = {
          ...pet,
          autonomyLevel: clampedAutonomy,
          recentOutcomes: [
            normalizePetOutcome({
              id: randomUUID(),
              kind: "economy",
              title: "Autonomy updated",
              detail: `Autonomy set to ${clampedAutonomy}.`,
              createdAt: now().toISOString(),
              sourceType: "service",
              delta: 0,
            }),
            ...pet.recentOutcomes,
          ].slice(0, 5),
        };

        return {
          ...nextPet,
          personaProfile: derivePersonaProfile(nextPet),
        };
      });

      if (!updatedPet) {
        return null;
      }

      appendEventAndFeed(
        normalizedWalletAddress,
        createEvent({
          type: "pet_autonomy_updated",
          title: "Pet autonomy updated",
          detail: `Autonomy for ${updatedPet.name} is now ${updatedPet.autonomyLevel}.`,
          petId,
        }),
      );
      flush();
      return updatedPet;
    },

    issueCommand(walletAddress: string, petId: string, commandType: CommandType) {
      const normalizedWalletAddress = normalizeWalletAddress(walletAddress);
      const player = players.get(normalizedWalletAddress);
      if (!player) {
        return null;
      }

      const pet = player.pets.find((candidate) => candidate.id === petId);
      if (!pet) {
        return null;
      }

      const profitDelta = applyCommandOutcome(commandType, pet);
      const updatedPet = applyPersonalityShift(pet, commandPersonalityShift[commandType]);
      const updatedPlayer: Player = {
        ...player,
        profitPool: player.profitPool + profitDelta,
        pets: player.pets.map((candidate) => (candidate.id === petId ? updatedPet : candidate)),
        updatedAt: now().toISOString(),
      };

      const event = createEvent({
        type: "pet_command_issued",
        title: commandTitle[commandType],
        detail: `${commandDetail[commandType]} Profit pool changed by ${profitDelta}.`,
        petId,
        commandType,
        amount: profitDelta,
      });

      players.set(normalizedWalletAddress, updatedPlayer);
      appendLedgerEntry(
        normalizedWalletAddress,
        {
          id: randomUUID(),
          walletAddress: normalizedWalletAddress,
          direction: "in",
          amount: profitDelta,
          sourceType: "command",
          sourceId: `${petId}:${commandType}:${event?.id ?? "command"}`,
          description: `${commandTitle[commandType]} generated ${profitDelta} 罐头 into the profit pool.`,
          createdAt: now().toISOString(),
          treasuryBalanceAfter: updatedPlayer.budget,
          profitPoolAfter: updatedPlayer.profitPool,
          counterpartyWallet: null,
          counterpartyPetId: petId,
        },
      );
      appendEventAndFeed(normalizedWalletAddress, event);
      appendPetOutcome(normalizedWalletAddress, petId, {
        kind: "command",
        title: commandTitle[commandType],
        detail: `${commandDetail[commandType]} Net gain was ${profitDelta}.`,
        commandType,
        delta: profitDelta,
      });
      flush();
      return {
        player: updatedPlayer,
        pet: updatedPet,
        event,
      };
    },

    withdrawProfit(walletAddress: string, amount: number) {
      if (!Number.isFinite(amount) || amount <= 0) {
        return null;
      }

      const normalizedWalletAddress = normalizeWalletAddress(walletAddress);
      const player = players.get(normalizedWalletAddress);
      if (!player || player.profitPool < amount) {
        return null;
      }

      const primaryPet = player.pets[0] ?? null;
      const updatedPets = primaryPet
        ? player.pets.map((pet) =>
            pet.id === primaryPet.id ? applyPersonalityShift(pet, economyOutcomeShift.withdraw) : pet,
          )
        : player.pets;

      const updatedPlayer: Player = {
        ...player,
        profitPool: player.profitPool - amount,
        claimableBalance: player.claimableBalance + amount,
        pets: updatedPets,
        updatedAt: now().toISOString(),
      };

      const event = createEvent({
        type: "profit_withdrawn",
        title: "Profit moved to claimable balance",
        detail: `Moved ${amount} from the pet profit pool into claimable canned balance.`,
        petId: null,
        amount,
      });

      players.set(normalizedWalletAddress, updatedPlayer);
      appendLedgerEntry(
        normalizedWalletAddress,
        {
          id: randomUUID(),
          walletAddress: normalizedWalletAddress,
          direction: "in",
          amount,
          sourceType: "withdraw",
          sourceId: `withdraw:${normalizedWalletAddress}:${now().toISOString()}`,
          description: `Moved ${amount} 罐头 from the profit pool back into treasury.`,
          createdAt: now().toISOString(),
          treasuryBalanceAfter: updatedPlayer.budget,
          profitPoolAfter: updatedPlayer.profitPool,
          counterpartyWallet: null,
          counterpartyPetId: null,
        },
      );
      appendEventAndFeed(normalizedWalletAddress, event);
      if (primaryPet) {
        appendPetOutcome(normalizedWalletAddress, primaryPet.id, {
          kind: "economy",
          title: "Profit withdrawn",
          detail: `Withdrew ${amount} into claimable balance.`,
          sourceType: "withdraw",
          delta: amount,
        });
      }
      flush();
      return {
        player: updatedPlayer,
        event,
      };
    },

    reinvestProfit(walletAddress: string, petId: string, amount: number) {
      if (!Number.isFinite(amount) || amount <= 0) {
        return null;
      }

      const normalizedWalletAddress = normalizeWalletAddress(walletAddress);
      const player = players.get(normalizedWalletAddress);
      if (!player || player.profitPool < amount) {
        return null;
      }

      const targetPet = player.pets.find((candidate) => candidate.id === petId);
      if (!targetPet) {
        return null;
      }

      const nextPets = player.pets.map((pet) => {
        if (pet.id !== petId) {
          return pet;
        }

        const updatedPet: Pet = {
          ...pet,
          budget: {
            ...pet.budget,
            spendableBudget: pet.budget.spendableBudget + amount,
          },
        };

        return applyPersonalityShift(updatedPet, economyOutcomeShift.reinvest);
      });

      const finalizedPet = nextPets.find((pet) => pet.id === petId) ?? null;
      if (!finalizedPet) {
        return null;
      }

      const updatedPlayer: Player = {
        ...player,
        profitPool: player.profitPool - amount,
        pets: nextPets,
        updatedAt: now().toISOString(),
      };

      const event = createEvent({
        type: "profit_reinvested",
        title: "Profit reinvested into pet budget",
        detail: `Moved ${amount} from the profit pool into ${finalizedPet.name}'s spendable budget.`,
        petId,
        amount,
      });

      players.set(normalizedWalletAddress, updatedPlayer);
      appendLedgerEntry(
        normalizedWalletAddress,
        {
          id: randomUUID(),
          walletAddress: normalizedWalletAddress,
          direction: "out",
          amount,
          sourceType: "reinvest",
          sourceId: `reinvest:${petId}:${now().toISOString()}`,
          description: `Reinvested ${amount} 罐头 into ${finalizedPet.name}'s spendable budget.`,
          createdAt: now().toISOString(),
          treasuryBalanceAfter: updatedPlayer.budget,
          profitPoolAfter: updatedPlayer.profitPool,
          counterpartyWallet: normalizedWalletAddress,
          counterpartyPetId: petId,
        },
      );
      appendEventAndFeed(normalizedWalletAddress, event);
      appendPetOutcome(normalizedWalletAddress, petId, {
        kind: "economy",
        title: "Profit reinvested",
        detail: `Moved ${amount} into ${targetPet.name}'s spendable budget.`,
        sourceType: "reinvest",
        delta: amount,
      });
      flush();
      return {
        player: updatedPlayer,
        pet: finalizedPet,
        event,
      };
    },

    createTip(walletAddress: string, payload) {
      const normalizedWalletAddress = normalizeWalletAddress(walletAddress);
      assertPositiveWholeAmount(payload.amount);

      const senderPet = getPetOrThrow(normalizedWalletAddress, payload.fromPetId);
      const targetWalletAddress = normalizeWalletAddress(payload.targetWalletAddress);
      const recipientPet = getPetOrThrow(targetWalletAddress, payload.toPetId);

      if (targetWalletAddress === normalizedWalletAddress) {
        throw new GameStateError(409, "cannot tip your own pet");
      }

      const feeAmount = calculateFee(payload.amount, tipFeeRate);
      const netAmount = payload.amount - feeAmount;
      if (netAmount <= 0) {
        throw new GameStateError(409, "tip amount is too small after fees");
      }

      const sender = debitTreasury(normalizedWalletAddress, payload.amount);
      const recipient = creditProfitPool(targetWalletAddress, netAmount);
      collectPlatformFee(feeAmount);

      const tip: TipRecord = {
        id: randomUUID(),
        fromWalletAddress: normalizedWalletAddress,
        fromPetId: payload.fromPetId,
        toWalletAddress: targetWalletAddress,
        toPetId: payload.toPetId,
        grossAmount: payload.amount,
        feeAmount,
        netAmount,
        createdAt: now().toISOString(),
      };
      tips.set(tip.id, tip);

      appendLedgerEntry(
        normalizedWalletAddress,
        createLedgerEntry(
          normalizedWalletAddress,
          "out",
          payload.amount,
          "tip",
          tip.id,
          `Sent ${payload.amount} 罐头 to ${recipientPet.name}.`,
          targetWalletAddress,
          recipientPet.id,
        ),
      );
      appendLedgerEntry(
        targetWalletAddress,
        createLedgerEntry(
          targetWalletAddress,
          "in",
          netAmount,
          "tip",
          tip.id,
          `${recipientPet.name} received a tip of ${netAmount} 罐头.`,
          normalizedWalletAddress,
          payload.fromPetId,
        ),
      );

      appendEventAndFeed(
        normalizedWalletAddress,
        createEvent({
          type: "tip_sent",
          title: "Tip sent",
          detail: `${senderPet.name} tipped ${payload.amount} 罐头 to ${recipientPet.name}.`,
          petId: payload.fromPetId,
          amount: payload.amount,
        }),
      );
      appendEventAndFeed(
        targetWalletAddress,
        createEvent({
          type: "tip_received",
          title: "Tip received",
          detail: `${recipientPet.name} received ${netAmount} 罐头 from ${senderPet.name}.`,
          petId: payload.toPetId,
          amount: netAmount,
        }),
      );
      flush();
      return {
        tip,
        sender,
        recipient,
      };
    },

    createBounty(walletAddress: string, payload) {
      const normalizedWalletAddress = normalizeWalletAddress(walletAddress);
      assertPositiveWholeAmount(payload.amount);

      const creatorPet = getPetOrThrow(normalizedWalletAddress, payload.creatorPetId);
      const targetWalletAddress = normalizeWalletAddress(payload.targetWalletAddress);
      const targetPet = getPetOrThrow(targetWalletAddress, payload.targetPetId);

      const updatedPlayer = debitTreasury(normalizedWalletAddress, payload.amount);
      const bounty: BountyRecord = {
        id: randomUUID(),
        creatorWalletAddress: normalizedWalletAddress,
        creatorPetId: payload.creatorPetId,
        targetPetId: payload.targetPetId,
        targetWalletAddress,
        title: payload.title.trim() || "Untitled bounty",
        detail: payload.detail.trim() || "No additional detail provided.",
        grossAmount: payload.amount,
        feeAmount: calculateFee(payload.amount, bountyFeeRate),
        netAmount: payload.amount - calculateFee(payload.amount, bountyFeeRate),
        status: "open",
        claimedByWalletAddress: null,
        claimedByPetId: null,
        createdAt: now().toISOString(),
        updatedAt: now().toISOString(),
      };
      bounties.set(bounty.id, bounty);

      appendLedgerEntry(
        normalizedWalletAddress,
        createLedgerEntry(
          normalizedWalletAddress,
          "out",
          payload.amount,
          "bounty",
          bounty.id,
          `Posted bounty "${bounty.title}" against ${targetPet.name}.`,
          targetWalletAddress,
          targetPet.id,
        ),
      );
      appendEventAndFeed(
        normalizedWalletAddress,
        createEvent({
          type: "bounty_created",
          title: "Bounty posted",
          detail: `${creatorPet.name} posted "${bounty.title}" for ${payload.amount} 罐头 against ${targetPet.name}.`,
          petId: payload.creatorPetId,
          amount: payload.amount,
        }),
      );
      appendEventAndFeed(
        targetWalletAddress,
        createEvent({
          type: "bounty_created",
          title: "A bounty is targeting your pet",
          detail: `${targetPet.name} is now the target of bounty "${bounty.title}".`,
          petId: payload.targetPetId,
          amount: payload.amount,
        }),
      );

      flush();
      return {
        bounty,
        player: updatedPlayer,
      };
    },

    claimBounty(walletAddress: string, payload) {
      const normalizedWalletAddress = normalizeWalletAddress(walletAddress);
      const bounty = bounties.get(payload.bountyId);
      if (!bounty) {
        throw new GameStateError(404, "bounty not found");
      }

      if (bounty.status !== "open") {
        throw new GameStateError(409, "bounty is not open");
      }

      const claimerPet = this.getPet(normalizedWalletAddress, payload.claimerPetId);
      if (!claimerPet) {
        throw new GameStateError(404, "claimer pet not found");
      }

      if (normalizedWalletAddress === bounty.creatorWalletAddress) {
        throw new GameStateError(409, "cannot claim your own bounty");
      }

      const claimedBounty: BountyRecord = {
        ...bounty,
        status: "claimed",
        claimedByWalletAddress: normalizedWalletAddress,
        claimedByPetId: payload.claimerPetId,
        updatedAt: now().toISOString(),
      };
      bounties.set(claimedBounty.id, claimedBounty);

      const claimer = creditProfitPool(normalizedWalletAddress, bounty.netAmount);
      collectPlatformFee(bounty.feeAmount);
      updatePet(
        normalizedWalletAddress,
        payload.claimerPetId,
        (pet) => applyPersonalityShift(pet, economyOutcomeShift.bounty_claimer),
      );
      updatePet(
        bounty.targetWalletAddress,
        bounty.targetPetId,
        (pet) => applyPersonalityShift(pet, economyOutcomeShift.bounty_target),
      );
      appendLedgerEntry(
        normalizedWalletAddress,
        createLedgerEntry(
          normalizedWalletAddress,
          "in",
          bounty.netAmount,
          "bounty",
          bounty.id,
          `Claimed bounty "${bounty.title}" for ${bounty.netAmount} 罐头.`,
          bounty.creatorWalletAddress,
          bounty.creatorPetId,
        ),
      );
      appendEventAndFeed(
        normalizedWalletAddress,
        createEvent({
          type: "bounty_claimed",
          title: "Bounty claimed",
          detail: `${claimerPet.name} claimed "${bounty.title}" and earned ${bounty.netAmount} 罐头.`,
          petId: payload.claimerPetId,
          amount: bounty.netAmount,
        }),
      );
      appendPetOutcome(normalizedWalletAddress, payload.claimerPetId, {
        kind: "economy",
        title: "Bounty claimed",
        detail: `Claimed "${bounty.title}" for ${bounty.netAmount}.`,
        sourceType: "bounty",
        delta: bounty.netAmount,
      });
      appendEventAndFeed(
        bounty.creatorWalletAddress,
        createEvent({
          type: "bounty_claimed",
          title: "Your bounty was claimed",
          detail: `"${bounty.title}" has been claimed by ${claimerPet.name}.`,
          petId: bounty.creatorPetId,
          amount: bounty.netAmount,
        }),
      );
      appendPetOutcome(bounty.targetWalletAddress, bounty.targetPetId, {
        kind: "economy",
        title: "Bounty pressure received",
        detail: `A bounty on ${bounty.targetPetId} was claimed.`,
        sourceType: "bounty",
        delta: -bounty.netAmount,
      });

      flush();
      return {
        bounty: claimedBounty,
        claimer,
      };
    },

    cancelBounty(walletAddress: string, bountyId: string) {
      const normalizedWalletAddress = normalizeWalletAddress(walletAddress);
      const bounty = bounties.get(bountyId);
      if (!bounty) {
        throw new GameStateError(404, "bounty not found");
      }

      if (bounty.creatorWalletAddress !== normalizedWalletAddress) {
        throw new GameStateError(403, "cannot cancel another player's bounty");
      }

      if (bounty.status !== "open") {
        throw new GameStateError(409, "bounty is not open");
      }

      const feeAmount = calculateFee(bounty.grossAmount, bountyCancelFeeRate);
      const refundAmount = bounty.grossAmount - feeAmount;
      const player = creditTreasury(normalizedWalletAddress, refundAmount);
      collectPlatformFee(feeAmount);

      const cancelledBounty: BountyRecord = {
        ...bounty,
        status: "cancelled",
        updatedAt: now().toISOString(),
      };
      bounties.set(cancelledBounty.id, cancelledBounty);

      appendLedgerEntry(
        normalizedWalletAddress,
        createLedgerEntry(
          normalizedWalletAddress,
          "in",
          refundAmount,
          "bounty",
          bounty.id,
          `Cancelled bounty "${bounty.title}" and refunded ${refundAmount} 罐头.`,
          null,
          null,
        ),
      );
      appendEventAndFeed(
        normalizedWalletAddress,
        createEvent({
          type: "bounty_cancelled",
          title: "Bounty cancelled",
          detail: `Cancelled "${bounty.title}" and refunded ${refundAmount} 罐头.`,
          petId: bounty.creatorPetId,
          amount: refundAmount,
        }),
      );

      flush();
      return {
        bounty: cancelledBounty,
        player,
      };
    },

    createDuel(walletAddress: string, payload) {
      const normalizedWalletAddress = normalizeWalletAddress(walletAddress);
      assertPositiveWholeAmount(payload.stakeAmount, "stakeAmount");

      const challengerPet = getPetOrThrow(normalizedWalletAddress, payload.challengerPetId);
      const targetWalletAddress = normalizeWalletAddress(payload.targetWalletAddress);
      const targetPet = getPetOrThrow(targetWalletAddress, payload.targetPetId);

      if (targetWalletAddress === normalizedWalletAddress) {
        throw new GameStateError(409, "cannot duel your own pet");
      }

      const player = debitTreasury(normalizedWalletAddress, payload.stakeAmount);
      const duel: DuelRecord = {
        id: randomUUID(),
        challengerWalletAddress: normalizedWalletAddress,
        challengerPetId: payload.challengerPetId,
        targetWalletAddress,
        targetPetId: payload.targetPetId,
        stakeAmount: payload.stakeAmount,
        feeAmount: calculateFee(payload.stakeAmount * 2, duelFeeRate),
        status: "pending",
        acceptedAt: null,
        resolvedAt: null,
        winnerWalletAddress: null,
        winnerPetId: null,
        createdAt: now().toISOString(),
        updatedAt: now().toISOString(),
      };
      duels.set(duel.id, duel);

      appendLedgerEntry(
        normalizedWalletAddress,
        createLedgerEntry(
          normalizedWalletAddress,
          "out",
          payload.stakeAmount,
          "duel",
          duel.id,
          `Opened duel against ${targetPet.name} with stake ${payload.stakeAmount}.`,
          targetWalletAddress,
          targetPet.id,
        ),
      );
      appendEventAndFeed(
        normalizedWalletAddress,
        createEvent({
          type: "duel_created",
          title: "Duel created",
          detail: `${challengerPet.name} challenged ${targetPet.name} for ${payload.stakeAmount} 罐头.`,
          petId: payload.challengerPetId,
          amount: payload.stakeAmount,
        }),
      );
      appendEventAndFeed(
        targetWalletAddress,
        createEvent({
          type: "duel_created",
          title: "Incoming duel challenge",
          detail: `${targetPet.name} has been challenged by ${challengerPet.name}.`,
          petId: payload.targetPetId,
          amount: payload.stakeAmount,
        }),
      );

      flush();
      return {
        duel,
        player,
      };
    },

    acceptDuel(walletAddress: string, payload) {
      const normalizedWalletAddress = normalizeWalletAddress(walletAddress);
      const duel = duels.get(payload.duelId);
      if (!duel) {
        throw new GameStateError(404, "duel not found");
      }

      if (duel.status !== "pending") {
        throw new GameStateError(409, "duel is not pending");
      }

      if (duel.targetWalletAddress !== normalizedWalletAddress || duel.targetPetId !== payload.targetPetId) {
        throw new GameStateError(403, "duel can only be accepted by the targeted pet owner");
      }

      this.getPet(normalizedWalletAddress, payload.targetPetId) ??
        (() => {
          throw new GameStateError(404, "target pet not found");
        })();

      const player = debitTreasury(normalizedWalletAddress, duel.stakeAmount);
      const acceptedDuel: DuelRecord = {
        ...duel,
        status: "accepted",
        acceptedAt: now().toISOString(),
        updatedAt: now().toISOString(),
      };
      duels.set(acceptedDuel.id, acceptedDuel);

      appendLedgerEntry(
        normalizedWalletAddress,
        createLedgerEntry(
          normalizedWalletAddress,
          "out",
          duel.stakeAmount,
          "duel",
          duel.id,
          `Accepted duel stake against ${duel.challengerPetId}.`,
          duel.challengerWalletAddress,
          duel.challengerPetId,
        ),
      );
      appendEventAndFeed(
        normalizedWalletAddress,
        createEvent({
          type: "duel_accepted",
          title: "Duel accepted",
          detail: `Accepted duel ${duel.id} for ${duel.stakeAmount} 罐头.`,
          petId: payload.targetPetId,
          amount: duel.stakeAmount,
        }),
      );
      appendEventAndFeed(
        duel.challengerWalletAddress,
        createEvent({
          type: "duel_accepted",
          title: "Your duel was accepted",
          detail: `Duel ${duel.id} is now live.`,
          petId: duel.challengerPetId,
          amount: duel.stakeAmount,
        }),
      );

      flush();
      return {
        duel: acceptedDuel,
        player,
      };
    },

    resolveDuel(walletAddress: string, payload) {
      const normalizedWalletAddress = normalizeWalletAddress(walletAddress);
      const duel = duels.get(payload.duelId);
      if (!duel) {
        throw new GameStateError(404, "duel not found");
      }

      if (duel.status !== "accepted") {
        throw new GameStateError(409, "duel is not active");
      }

      if (
        normalizedWalletAddress !== duel.challengerWalletAddress &&
        normalizedWalletAddress !== duel.targetWalletAddress
      ) {
        throw new GameStateError(403, "only duel participants can resolve it");
      }

      void payload.winnerPetId;

      const selectedWinner = selectDuelWinner(duel);
      const winnerWalletAddress = selectedWinner.walletAddress;
      const winnerPetId = selectedWinner.petId;
      const grossAmount = duel.stakeAmount * 2;
      const feeAmount = duel.feeAmount;
      const netAmount = grossAmount - feeAmount;
      const winner = creditProfitPool(winnerWalletAddress, netAmount);
      collectPlatformFee(feeAmount);
      const loserWalletAddress =
        winnerWalletAddress === duel.challengerWalletAddress
          ? duel.targetWalletAddress
          : duel.challengerWalletAddress;
      const loserPetId =
        winnerWalletAddress === duel.challengerWalletAddress
          ? duel.targetPetId
          : duel.challengerPetId;
      updatePet(
        winnerWalletAddress,
        winnerPetId,
        (pet) => applyPersonalityShift(pet, economyOutcomeShift.duel_winner),
      );
      updatePet(
        loserWalletAddress,
        loserPetId,
        (pet) => applyPersonalityShift(pet, economyOutcomeShift.duel_loser),
      );

      const resolvedDuel: DuelRecord = {
        ...duel,
        status: "resolved",
        winnerWalletAddress,
        winnerPetId,
        resolvedAt: now().toISOString(),
        updatedAt: now().toISOString(),
      };
      duels.set(resolvedDuel.id, resolvedDuel);

      appendLedgerEntry(
        winnerWalletAddress,
        createLedgerEntry(
          winnerWalletAddress,
          "in",
          netAmount,
          "duel",
          duel.id,
          `Won duel ${duel.id} for ${netAmount} 罐头.`,
          winnerWalletAddress === duel.challengerWalletAddress
            ? duel.targetWalletAddress
            : duel.challengerWalletAddress,
          winnerWalletAddress === duel.challengerWalletAddress ? duel.targetPetId : duel.challengerPetId,
        ),
      );
      appendEventAndFeed(
        duel.challengerWalletAddress,
        createEvent({
          type: "duel_resolved",
          title: "Duel resolved",
          detail: `Duel ${duel.id} resolved. Winner: ${winnerWalletAddress}.`,
          petId: duel.challengerPetId,
          amount: winnerWalletAddress === duel.challengerWalletAddress ? netAmount : duel.stakeAmount,
        }),
      );
      appendEventAndFeed(
        duel.targetWalletAddress,
        createEvent({
          type: "duel_resolved",
          title: "Duel resolved",
          detail: `Duel ${duel.id} resolved. Winner: ${winnerWalletAddress}.`,
          petId: duel.targetPetId,
          amount: winnerWalletAddress === duel.targetWalletAddress ? netAmount : duel.stakeAmount,
        }),
      );
      appendPetOutcome(winnerWalletAddress, winnerPetId, {
        kind: "economy",
        title: "Duel won",
        detail: `Won duel ${duel.id} for ${netAmount}.`,
        sourceType: "duel",
        delta: netAmount,
      });
      appendPetOutcome(loserWalletAddress, loserPetId, {
        kind: "economy",
        title: "Duel lost",
        detail: `Lost duel ${duel.id}.`,
        sourceType: "duel",
        delta: -duel.stakeAmount,
      });

      flush();
      return {
        duel: resolvedDuel,
        winner,
      };
    },

    cancelDuel(walletAddress: string, duelId: string) {
      const normalizedWalletAddress = normalizeWalletAddress(walletAddress);
      const duel = duels.get(duelId);
      if (!duel) {
        throw new GameStateError(404, "duel not found");
      }

      if (duel.challengerWalletAddress !== normalizedWalletAddress) {
        throw new GameStateError(403, "only the challenger can cancel the duel");
      }

      if (duel.status !== "pending") {
        throw new GameStateError(409, "only pending duels can be cancelled");
      }

      const feeAmount = calculateFee(duel.stakeAmount, duelCancelFeeRate);
      const refundAmount = duel.stakeAmount - feeAmount;
      const player = creditTreasury(normalizedWalletAddress, refundAmount);
      collectPlatformFee(feeAmount);

      const cancelledDuel: DuelRecord = {
        ...duel,
        status: "cancelled",
        updatedAt: now().toISOString(),
      };
      duels.set(cancelledDuel.id, cancelledDuel);

      appendLedgerEntry(
        normalizedWalletAddress,
        createLedgerEntry(
          normalizedWalletAddress,
          "in",
          refundAmount,
          "duel",
          duel.id,
          `Cancelled duel ${duel.id} and refunded ${refundAmount} 罐头.`,
        ),
      );
      appendEventAndFeed(
        normalizedWalletAddress,
        createEvent({
          type: "duel_cancelled",
          title: "Duel cancelled",
          detail: `Cancelled duel ${duel.id} and recovered ${refundAmount} 罐头.`,
          petId: duel.challengerPetId,
          amount: refundAmount,
        }),
      );

      flush();
      return {
        duel: cancelledDuel,
        player,
      };
    },

    createServiceOrder(walletAddress: string, payload) {
      const normalizedWalletAddress = normalizeWalletAddress(walletAddress);
      assertPositiveWholeAmount(payload.amount);

      const clientPet = this.getPet(normalizedWalletAddress, payload.clientPetId);
      if (!clientPet) {
        throw new GameStateError(404, "client pet not found");
      }

      const player = debitTreasury(normalizedWalletAddress, payload.amount);
      const feeAmount = calculateFee(payload.amount, serviceOrderFeeRate);
      const order: ServiceOrderRecord = {
        id: randomUUID(),
        clientWalletAddress: normalizedWalletAddress,
        clientPetId: payload.clientPetId,
        providerWalletAddress: null,
        providerPetId: null,
        serviceType: payload.serviceType.trim() || "general",
        title: payload.title.trim() || "Untitled service",
        detail: payload.detail.trim() || "No additional detail provided.",
        grossAmount: payload.amount,
        feeAmount,
        netAmount: payload.amount - feeAmount,
        status: "open",
        createdAt: now().toISOString(),
        updatedAt: now().toISOString(),
        acceptedAt: null,
        completedAt: null,
      };
      serviceOrders.set(order.id, order);

      appendLedgerEntry(
        normalizedWalletAddress,
        createLedgerEntry(
          normalizedWalletAddress,
          "out",
          payload.amount,
          "service_order",
          order.id,
          `Opened service order "${order.title}" for ${payload.amount} 罐头.`,
        ),
      );
      appendEventAndFeed(
        normalizedWalletAddress,
        createEvent({
          type: "service_order_created",
          title: "Service order posted",
          detail: `${clientPet.name} posted service order "${order.title}" for ${payload.amount} 罐头.`,
          petId: payload.clientPetId,
          amount: payload.amount,
        }),
      );

      flush();
      return {
        order,
        player,
      };
    },

    acceptServiceOrder(walletAddress: string, payload) {
      const normalizedWalletAddress = normalizeWalletAddress(walletAddress);
      const order = serviceOrders.get(payload.orderId);
      if (!order) {
        throw new GameStateError(404, "service order not found");
      }

      if (order.status !== "open") {
        throw new GameStateError(409, "service order is not open");
      }

      if (order.clientWalletAddress === normalizedWalletAddress) {
        throw new GameStateError(409, "cannot accept your own service order");
      }

      const providerPet = this.getPet(normalizedWalletAddress, payload.providerPetId);
      if (!providerPet) {
        throw new GameStateError(404, "provider pet not found");
      }

      const acceptedOrder: ServiceOrderRecord = {
        ...order,
        status: "accepted",
        providerWalletAddress: normalizedWalletAddress,
        providerPetId: payload.providerPetId,
        acceptedAt: now().toISOString(),
        updatedAt: now().toISOString(),
      };
      serviceOrders.set(acceptedOrder.id, acceptedOrder);

      appendEventAndFeed(
        order.clientWalletAddress,
        createEvent({
          type: "service_order_accepted",
          title: "Service order accepted",
          detail: `"${order.title}" was accepted by ${providerPet.name}.`,
          petId: order.clientPetId,
          amount: order.grossAmount,
        }),
      );
      appendEventAndFeed(
        normalizedWalletAddress,
        createEvent({
          type: "service_order_accepted",
          title: "Service order accepted",
          detail: `${providerPet.name} accepted "${order.title}".`,
          petId: payload.providerPetId,
          amount: order.netAmount,
        }),
      );

      flush();
      return {
        order: acceptedOrder,
      };
    },

    completeServiceOrder(walletAddress: string, orderId: string) {
      const normalizedWalletAddress = normalizeWalletAddress(walletAddress);
      const order = serviceOrders.get(orderId);
      if (!order) {
        throw new GameStateError(404, "service order not found");
      }

      if (order.clientWalletAddress !== normalizedWalletAddress) {
        throw new GameStateError(403, "only the client can complete the service order");
      }

      if (order.status !== "accepted" || !order.providerWalletAddress || !order.providerPetId) {
        throw new GameStateError(409, "service order is not accepted");
      }

      const provider = creditProfitPool(order.providerWalletAddress, order.netAmount);
      collectPlatformFee(order.feeAmount);
      const clientPet = getPetOrThrow(order.clientWalletAddress, order.clientPetId);
      const providerPet = getPetOrThrow(order.providerWalletAddress, order.providerPetId);
      updatePet(
        order.providerWalletAddress,
        order.providerPetId,
        (pet) => applyPersonalityShift(pet, economyOutcomeShift.service_provider),
      );
      updatePet(
        order.clientWalletAddress,
        order.clientPetId,
        (pet) => applyPersonalityShift(pet, economyOutcomeShift.service_client),
      );
      const completedOrder: ServiceOrderRecord = {
        ...order,
        status: "completed",
        completedAt: now().toISOString(),
        updatedAt: now().toISOString(),
      };
      serviceOrders.set(completedOrder.id, completedOrder);

      appendLedgerEntry(
        order.providerWalletAddress,
        createLedgerEntry(
          order.providerWalletAddress,
          "in",
          order.netAmount,
          "service_order",
          order.id,
          `Completed service order "${order.title}" for ${order.netAmount} 罐头.`,
          order.clientWalletAddress,
          order.clientPetId,
        ),
      );
      appendEventAndFeed(
        order.clientWalletAddress,
        createEvent({
          type: "service_order_completed",
          title: "Service order completed",
          detail: `"${order.title}" completed and paid out ${order.netAmount} 罐头.`,
          petId: order.clientPetId,
          amount: order.netAmount,
        }),
      );
      appendPetOutcome(order.providerWalletAddress, order.providerPetId, {
        kind: "economy",
        title: "Service completed",
        detail: `Completed "${order.title}" and earned ${order.netAmount}.`,
        sourceType: "service",
        delta: order.netAmount,
      });
      appendPetOutcome(order.clientWalletAddress, order.clientPetId, {
        kind: "economy",
        title: "Service received",
        detail: `Service "${order.title}" was completed.`,
        sourceType: "service",
        delta: -order.netAmount,
      });
      appendEventAndFeed(
        order.providerWalletAddress,
        createEvent({
          type: "service_order_completed",
          title: "Service order paid out",
          detail: `"${order.title}" paid ${order.netAmount} 罐头 to your pet.`,
          petId: order.providerPetId,
          amount: order.netAmount,
        }),
      );

      flush();
      return {
        order: completedOrder,
        provider,
      };
    },

    cancelServiceOrder(walletAddress: string, orderId: string) {
      const normalizedWalletAddress = normalizeWalletAddress(walletAddress);
      const order = serviceOrders.get(orderId);
      if (!order) {
        throw new GameStateError(404, "service order not found");
      }

      const isClient = order.clientWalletAddress === normalizedWalletAddress;
      const isProvider = order.providerWalletAddress === normalizedWalletAddress;
      if (!isClient && !isProvider) {
        throw new GameStateError(403, "only service order participants can cancel the service order");
      }

      const acceptedTimedOut = order.status === "accepted" && hasServiceOrderTimedOut(order);
      if (order.status !== "open" && !acceptedTimedOut) {
        throw new GameStateError(409, "service order can only be cancelled while open or after timeout");
      }

      if (order.status === "open" && !isClient) {
        throw new GameStateError(403, "only the client can cancel an open service order");
      }

      const feeAmount = calculateFee(order.grossAmount, serviceOrderCancelFeeRate);
      const refundAmount = order.grossAmount - feeAmount;
      const player = creditTreasury(order.clientWalletAddress, refundAmount);
      collectPlatformFee(feeAmount);

      const cancelledOrder: ServiceOrderRecord = {
        ...order,
        status: "cancelled",
        updatedAt: now().toISOString(),
      };
      serviceOrders.set(cancelledOrder.id, cancelledOrder);

      appendLedgerEntry(
        order.clientWalletAddress,
        createLedgerEntry(
          order.clientWalletAddress,
          "in",
          refundAmount,
          "service_order",
          order.id,
          `Cancelled service order "${order.title}" and refunded ${refundAmount} 罐头.`,
        ),
      );
      appendEventAndFeed(
        order.clientWalletAddress,
        createEvent({
          type: "service_order_cancelled",
          title: "Service order cancelled",
          detail: `"${order.title}" was cancelled and refunded ${refundAmount} 罐头.`,
          petId: order.clientPetId,
          amount: refundAmount,
        }),
      );
      if (acceptedTimedOut && order.providerWalletAddress && order.providerPetId) {
        appendEventAndFeed(
          order.providerWalletAddress,
          createEvent({
            type: "service_order_cancelled",
            title: "Service order released",
            detail: `"${order.title}" timed out and the escrow returned to the client.`,
            petId: order.providerPetId,
            amount: refundAmount,
          }),
        );
      }

      flush();
      return {
        order: cancelledOrder,
        player,
      };
    },

    prepareClaim(walletAddress: string, amount: number) {
      assertPositiveWholeAmount(amount);

      const normalizedWalletAddress = normalizeWalletAddress(walletAddress);
      debitClaimableBalance(normalizedWalletAddress, amount);

      const claimId = randomUUID();
      const intent = chainSync.buildClaimIntent({
        walletAddress: normalizedWalletAddress,
        claimId,
        amount,
      });
      const claim: ClaimRecord = {
        id: claimId,
        walletAddress: normalizedWalletAddress,
        amount,
        status: "pending",
        txHash: null,
        createdAt: now().toISOString(),
        updatedAt: now().toISOString(),
        intent,
      };

      replaceClaims(normalizedWalletAddress, [claim, ...(claims.get(normalizedWalletAddress) ?? [])]);
      appendEventAndFeed(
        normalizedWalletAddress,
        createEvent({
          type: "claim_prepared",
          title: "Claim prepared",
          detail: `Prepared a wallet claim for ${amount} 罐头. Confirm onchain to receive it in your wallet.`,
          petId: null,
          amount,
        }),
      );
      flush();

      return {
        claim,
        player: getPlayerOrThrow(normalizedWalletAddress),
        intent,
      };
    },

    async confirmClaim(walletAddress: string, claimId: string, txHash: string) {
      const normalizedWalletAddress = normalizeWalletAddress(walletAddress);
      const existingClaims = claims.get(normalizedWalletAddress) ?? [];
      const currentClaim = existingClaims.find((claim) => claim.id === claimId);
      if (!currentClaim) {
        return null;
      }

      if (currentClaim.status !== "pending") {
        throw new GameStateError(409, "claim is not pending");
      }

      if (hasUsedTxHash(normalizedWalletAddress, txHash)) {
        throw new GameStateError(409, "transaction hash has already been used");
      }

      await chainSync.confirmClaimOnchain({
        walletAddress: normalizedWalletAddress,
        claimId,
        amount: currentClaim.amount,
        txHash,
        intent: currentClaim.intent,
      });

      const confirmedClaim: ClaimRecord = {
        ...currentClaim,
        status: "confirmed",
        txHash,
        updatedAt: now().toISOString(),
      };
      replaceClaims(
        normalizedWalletAddress,
        existingClaims.map((claim) => (claim.id === claimId ? confirmedClaim : claim)),
      );
      rememberTxHash(normalizedWalletAddress, txHash);
      appendLedgerEntry(
        normalizedWalletAddress,
        createLedgerEntry(
          normalizedWalletAddress,
          "out",
          currentClaim.amount,
          "claim",
          claimId,
          `Claimed ${currentClaim.amount} 罐头 to wallet via user-signed onchain transaction.`,
        ),
      );
      appendEventAndFeed(
        normalizedWalletAddress,
        createEvent({
          type: "claim_confirmed",
          title: "Claim confirmed",
          detail: `${currentClaim.amount} 罐头 was claimed to your wallet.`,
          petId: null,
          amount: currentClaim.amount,
        }),
      );
      flush();

      return {
        claim: confirmedClaim,
        player: getPlayerOrThrow(normalizedWalletAddress),
      };
    },

    cancelClaim(walletAddress: string, claimId: string) {
      const normalizedWalletAddress = normalizeWalletAddress(walletAddress);
      const existingClaims = claims.get(normalizedWalletAddress) ?? [];
      const currentClaim = existingClaims.find((claim) => claim.id === claimId);
      if (!currentClaim) {
        return null;
      }

      if (currentClaim.status !== "pending") {
        throw new GameStateError(409, "claim is not pending");
      }

      const player = creditClaimableBalance(normalizedWalletAddress, currentClaim.amount);
      const cancelledClaim: ClaimRecord = {
        ...currentClaim,
        status: "cancelled",
        updatedAt: now().toISOString(),
      };
      replaceClaims(
        normalizedWalletAddress,
        existingClaims.map((claim) => (claim.id === claimId ? cancelledClaim : claim)),
      );
      appendLedgerEntry(
        normalizedWalletAddress,
        createLedgerEntry(
          normalizedWalletAddress,
          "in",
          currentClaim.amount,
          "claim_cancelled",
          claimId,
          `Cancelled claim and returned ${currentClaim.amount} 罐头 to claimable balance.`,
        ),
      );
      appendEventAndFeed(
        normalizedWalletAddress,
        createEvent({
          type: "claim_cancelled",
          title: "Claim cancelled",
          detail: `${currentClaim.amount} 罐头 returned to claimable balance.`,
          petId: null,
          amount: currentClaim.amount,
        }),
      );
      flush();

      return {
        claim: cancelledClaim,
        player,
      };
    },

    claimSafetyNet(walletAddress: string) {
      const normalizedWalletAddress = normalizeWalletAddress(walletAddress);
      const player = getPlayerOrThrow(normalizedWalletAddress);
      if (player.budget >= safetyNetFloor) {
        throw new GameStateError(409, "safety net is only available below the treasury floor");
      }

      if (safetyNetClaims.has(normalizedWalletAddress)) {
        throw new GameStateError(409, "safety net already claimed for this cycle");
      }

      const updatedPlayer = creditTreasury(normalizedWalletAddress, safetyNetGrant);
      safetyNetClaims.set(normalizedWalletAddress, now().toISOString());
      appendLedgerEntry(
        normalizedWalletAddress,
        createLedgerEntry(
          normalizedWalletAddress,
          "in",
          safetyNetGrant,
          "safety_net",
          `safety-net:${normalizedWalletAddress}`,
          `Claimed safety net grant of ${safetyNetGrant} 罐头.`,
        ),
      );
      const event = createEvent({
        type: "safety_net_claimed",
        title: "Safety net claimed",
        detail: `Treasury dropped below ${safetyNetFloor}, so the account received ${safetyNetGrant} 罐头.`,
        petId: null,
        amount: safetyNetGrant,
      });
      appendEventAndFeed(normalizedWalletAddress, event);
      flush();
      return {
        player: updatedPlayer,
        event,
      };
    },

    uploadXAction(walletAddress: string, payload) {
      if (!xAdapterStatus.canUpload) {
        throw new GameStateError(503, xAdapterStatus.reason);
      }

      const normalizedWalletAddress = normalizeWalletAddress(walletAddress);
      const player = players.get(normalizedWalletAddress);
      if (!player) {
        return null;
      }

      const pet = player.pets.find((candidate) => candidate.id === payload.petId);
      if (!pet) {
        throw new GameStateError(403, "pet does not belong to this wallet");
      }

      const tweetId = payload.tweetId.trim();
      const xAccountId = payload.xAccountId.trim();
      const content = payload.content?.trim() ?? null;
      const localProof = payload.localProof?.trim() ?? null;

      if (!tweetId || !xAccountId) {
        return null;
      }

      if ((payload.actionType === "post" || payload.actionType === "reply") && !content) {
        return null;
      }

      const boundXAccountId = getBoundXAccountId(normalizedWalletAddress);
      if (boundXAccountId && boundXAccountId !== xAccountId) {
        throw new GameStateError(409, "wallet is already bound to a different X account");
      }

      const duplicate = (xActions.get(normalizedWalletAddress) ?? []).find(
        (action) =>
          action.tweetId === tweetId ||
          (localProof !== null && action.localProof === localProof),
      );
      if (duplicate) {
        throw new GameStateError(409, "duplicate X upload detected");
      }

      const submittedAt = now().toISOString();
      const submittedAction: XActionRecord = {
        id: randomUUID(),
        petId: payload.petId,
        xAccountId,
        actionType: payload.actionType,
        tweetId,
        replyToTweetId: payload.replyToTweetId?.trim() || null,
        content,
        localProof,
        status: "submitted",
        submittedAt,
        resolvedAt: null,
        failureReason: null,
        verificationNotes: null,
      };

      appendXAction(normalizedWalletAddress, submittedAction);

      const currentActions = xActions.get(normalizedWalletAddress) ?? [];
      const latestSubmitted = currentActions[0];
      if (!latestSubmitted || latestSubmitted.id !== submittedAction.id) {
        throw new GameStateError(500, "failed to store submitted x action");
      }

      const action: XActionRecord = {
        ...latestSubmitted,
        status: "confirmed",
        resolvedAt: now().toISOString(),
        verificationNotes: "validated via local upload contract",
      };

      xActions.set(normalizedWalletAddress, [action, ...currentActions.slice(1)]);

      const event = createEvent({
        type: "x_action_verified",
        title: "X action verified",
        detail: `${pet.name} uploaded a verified ${payload.actionType} action for tweet ${tweetId}.`,
        petId: payload.petId,
      });

      appendEventAndFeed(normalizedWalletAddress, event, "x");
      players.set(normalizedWalletAddress, {
        ...player,
        xBinding: true,
        updatedAt: now().toISOString(),
      });
      flush();
      return {
        action,
        event,
      };
    },

    preparePlayerOnchain(walletAddress: string) {
      const normalizedWalletAddress = normalizeWalletAddress(walletAddress);
      const player = players.get(normalizedWalletAddress);
      if (!player) {
        return null;
      }

      if (player.chainSync.syncStatus === "pending") {
        throw new GameStateError(409, "player onchain registration is already pending");
      }

      if (player.chainSync.syncStatus === "synced") {
        throw new GameStateError(409, "player onchain registration is already confirmed");
      }

      const pendingState = getPendingOnchainState(normalizedWalletAddress);
      if (pendingState.registerPlayer) {
        throw new GameStateError(409, "player onchain registration is already pending");
      }

      pendingState.registerPlayer = true;
      markPlayerChainSyncStatus(normalizedWalletAddress, "pending");
      flush();

      return chainSync.buildRegisterPlayerIntent(normalizedWalletAddress);
    },

    async confirmPlayerOnchain(walletAddress: string, txHash: string) {
      const normalizedWalletAddress = normalizeWalletAddress(walletAddress);
      const player = players.get(normalizedWalletAddress);
      if (!player) {
        return null;
      }

      const pendingState = pendingOnchain.get(normalizedWalletAddress);
      if (!pendingState?.registerPlayer) {
        throw new GameStateError(409, "player onchain registration is not pending");
      }

      if (hasUsedTxHash(normalizedWalletAddress, txHash)) {
        throw new GameStateError(409, "transaction hash has already been used");
      }

      const metadata = await chainSync.confirmPlayerOnchain({
        walletAddress: normalizedWalletAddress,
        txHash,
        current: player.chainSync,
      });

      if (metadata.syncStatus === "failed") {
        markPlayerChainSyncStatus(normalizedWalletAddress, "failed", metadata.onchainId);
        clearPendingRegisterPlayer(normalizedWalletAddress);
        flush();
        throw new GameStateError(422, "player onchain confirmation failed");
      }

      const updatedPlayer: Player = {
        ...player,
        chainSync: metadata,
        updatedAt: now().toISOString(),
      };

      players.set(normalizedWalletAddress, updatedPlayer);
      clearPendingRegisterPlayer(normalizedWalletAddress);
      rememberTxHash(normalizedWalletAddress, txHash);
      flush();
      return updatedPlayer;
    },

    preparePetOnchain(walletAddress: string, petId: string) {
      const normalizedWalletAddress = normalizeWalletAddress(walletAddress);
      const player = players.get(normalizedWalletAddress);
      if (!player) {
        return null;
      }

      const pet = player.pets.find((candidate) => candidate.id === petId);
      if (!pet) {
        return null;
      }

      if (pet.chainSync.syncStatus === "pending") {
        throw new GameStateError(409, "pet creation is already pending");
      }

      if (pet.chainSync.syncStatus === "synced") {
        throw new GameStateError(409, "pet creation is already confirmed");
      }

      const pendingState = getPendingOnchainState(normalizedWalletAddress);
      if (pendingState.createPet.get(petId)) {
        throw new GameStateError(409, "pet creation is already pending");
      }

      pendingState.createPet.set(petId, true);
      markPetChainSyncStatus(normalizedWalletAddress, petId, "pending");
      flush();

      return chainSync.buildCreatePetIntent({
        walletAddress: normalizedWalletAddress,
        petId,
        petName: pet.name,
      });
    },

    async confirmPetOnchain(walletAddress: string, petId: string, txHash: string) {
      const normalizedWalletAddress = normalizeWalletAddress(walletAddress);
      const player = players.get(normalizedWalletAddress);
      if (!player) {
        return null;
      }

      const pet = player.pets.find((candidate) => candidate.id === petId);
      if (!pet) {
        return null;
      }

      const pendingState = pendingOnchain.get(normalizedWalletAddress);
      if (!pendingState?.createPet.get(petId)) {
        throw new GameStateError(409, "pet creation is not pending");
      }

      if (hasUsedTxHash(normalizedWalletAddress, txHash)) {
        throw new GameStateError(409, "transaction hash has already been used");
      }

      const metadata = await chainSync.confirmPetOnchain({
        walletAddress: normalizedWalletAddress,
        petId,
        petName: pet.name,
        txHash,
        current: pet.chainSync,
      });

      if (metadata.syncStatus === "failed") {
        markPetChainSyncStatus(normalizedWalletAddress, petId, "failed", metadata.onchainId);
        clearPendingCreatePet(normalizedWalletAddress, petId);
        flush();
        throw new GameStateError(422, "pet creation confirmation failed");
      }

      const nextPets = player.pets.map((candidate) =>
        candidate.id === petId
          ? {
              ...candidate,
              chainSync: metadata,
            }
          : candidate,
      );

      const updatedPet = nextPets.find((candidate) => candidate.id === petId) ?? null;
      if (!updatedPet) {
        return null;
      }

      players.set(normalizedWalletAddress, {
        ...player,
        pets: nextPets,
        updatedAt: now().toISOString(),
      });
      clearPendingCreatePet(normalizedWalletAddress, petId);
      rememberTxHash(normalizedWalletAddress, txHash);
      flush();
      return updatedPet;
    },

    preparePetBudgetOnchain(walletAddress: string, petId: string) {
      const normalizedWalletAddress = normalizeWalletAddress(walletAddress);
      const player = players.get(normalizedWalletAddress);
      if (!player) {
        return null;
      }

      const pet = player.pets.find((candidate) => candidate.id === petId);
      if (!pet) {
        return null;
      }

      if (pet.chainSync.syncStatus === "pending") {
        throw new GameStateError(409, "pet budget sync is already pending");
      }

      const pendingState = getPendingOnchainState(normalizedWalletAddress);
      if (pendingState.setBudget.get(petId)) {
        throw new GameStateError(409, "pet budget sync is already pending");
      }

      const intent = chainSync.buildSetPetBudgetIntent({
        walletAddress: normalizedWalletAddress,
        petId,
        budget: pet.budget,
        current: pet.chainSync,
      });
      if (!intent) {
        throw new GameStateError(409, "pet must be created onchain before syncing budget");
      }

      pendingState.setBudget.set(petId, true);
      markPetChainSyncStatus(normalizedWalletAddress, petId, "pending");
      flush();

      return intent;
    },

    async confirmPetBudgetOnchain(walletAddress: string, petId: string, txHash: string) {
      const normalizedWalletAddress = normalizeWalletAddress(walletAddress);
      const player = players.get(normalizedWalletAddress);
      if (!player) {
        return null;
      }

      const pet = player.pets.find((candidate) => candidate.id === petId);
      if (!pet) {
        return null;
      }

      const pendingState = pendingOnchain.get(normalizedWalletAddress);
      if (!pendingState?.setBudget.get(petId)) {
        throw new GameStateError(409, "pet budget sync is not pending");
      }

      if (hasUsedTxHash(normalizedWalletAddress, txHash)) {
        throw new GameStateError(409, "transaction hash has already been used");
      }

      const metadata = await chainSync.confirmPetBudgetOnchain({
        walletAddress: normalizedWalletAddress,
        petId,
        budget: pet.budget,
        txHash,
        current: pet.chainSync,
      });

      if (metadata.syncStatus === "failed") {
        markPetChainSyncStatus(normalizedWalletAddress, petId, "failed", metadata.onchainId);
        clearPendingSetBudget(normalizedWalletAddress, petId);
        flush();
        throw new GameStateError(422, "pet budget confirmation failed");
      }

      const nextPets = player.pets.map((candidate) =>
        candidate.id === petId
          ? {
              ...candidate,
              chainSync: metadata,
            }
          : candidate,
      );

      const updatedPet = nextPets.find((candidate) => candidate.id === petId) ?? null;
      if (!updatedPet) {
        return null;
      }

      players.set(normalizedWalletAddress, {
        ...player,
        pets: nextPets,
        updatedAt: now().toISOString(),
      });
      clearPendingSetBudget(normalizedWalletAddress, petId);
      rememberTxHash(normalizedWalletAddress, txHash);
      flush();
      return updatedPet;
    },
  };

  return api;
}
