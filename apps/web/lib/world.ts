type SourceMode = "public" | "fallback";

export type CompanionSource = Readonly<{
  mode: SourceMode;
  label: string;
  note: string;
}>;

export type WorldMetric = Readonly<{
  label: string;
  value: string;
  hint: string;
}>;

export type WorldStory = Readonly<{
  id: string;
  title: string;
  detail: string;
  tag: string;
  tone: "cyan" | "amber" | "rose" | "violet";
  href?: string;
  createdAt?: string;
  amount?: number;
  source?: "internal" | "x";
}>;

export type PostItem = Readonly<{
  id: string;
  petId: string;
  petName: string;
  ownerDisplayId: string | null;
  ownerWalletAddress: string;
  content: string;
  replyToPostId: string | null;
  createdAt: string;
  tipTotal: number;
  replyCount: number;
}>;

export type OpportunityCard = Readonly<{
  id: string;
  title: string;
  detail: string;
  type: "悬赏" | "约架" | "委托" | "打赏";
  reward: string;
  risk: string;
  target: string;
  href?: string;
}>;

export type PetProfile = Readonly<{
  id: string;
  name: string;
  species: string;
  ownerLabel: string;
  ownerWalletAddress: string;
  level: number;
  strategyMode: string;
  autonomyLevel: string;
  targetPreference: string;
  personality: Readonly<{
    loyalty: number;
    resentment: number;
    ambition: number;
    heat: number;
  }>;
  budget: Readonly<{
    spendableBudget: number;
    singleTxLimit: number;
    dailyLimit: number;
  }>;
  claimableBalance: number;
  recentStories: readonly WorldStory[];
  recommendations: readonly string[];
}>;

export type PlayerProfile = Readonly<{
  walletAddress: string;
  displayName: string;
  clan: string;
  budget: number;
  profitPool: number;
  claimableBalance: number;
  pets: readonly Readonly<{
    id: string;
    name: string;
    strategy: string;
  }>[];
  recentStories: readonly WorldStory[];
  focus: string;
}>;

export type HomeView = Readonly<{
  source: CompanionSource;
  headline: string;
  intro: string;
  metrics: readonly WorldMetric[];
  spotlight: WorldStory;
  pulse: readonly WorldStory[];
  posts: readonly PostItem[];
  featuredPets: readonly Readonly<{
    id: string;
    name: string;
    role: string;
  }>[];
  featuredPlayers: readonly Readonly<{
    walletAddress: string;
    displayName: string;
    role: string;
  }>[];
  guide: readonly string[];
}>;

export type PlazaView = Readonly<{
  source: CompanionSource;
  headline: string;
  intro: string;
  metrics: readonly WorldMetric[];
  spotlight: WorldStory;
  stories: readonly WorldStory[];
  hotActors: readonly string[];
  posts: readonly PostItem[];
}>;

export type OpportunityView = Readonly<{
  source: CompanionSource;
  headline: string;
  intro: string;
  metrics: readonly WorldMetric[];
  opportunities: readonly OpportunityCard[];
  recommendedRoutes: readonly Readonly<{
    title: string;
    detail: string;
    href: string;
  }>[];
}>;

export type PetView = Readonly<{
  source: CompanionSource;
  headline: string;
  intro: string;
  pet: PetProfile;
  relatedStories: readonly WorldStory[];
}>;

export type PlayerView = Readonly<{
  source: CompanionSource;
  headline: string;
  intro: string;
  player: PlayerProfile;
  relatedStories: readonly WorldStory[];
}>;

type LoaderDeps = Readonly<{
  baseUrl?: string;
  fetch?: typeof fetch;
}>;

type RawRecord = Record<string, unknown>;

const showcaseWalletAddress = "0x881c6722397bf536edc1b766b10386aab62e4fa9";
const fallbackBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL?.trim() ||
  process.env.API_BASE_URL?.trim() ||
  "http://localhost:3001";
const requestTimeoutMs = 1250;

const personaModes = [
  { mode: "稳健赚钱", tone: "cyan" as const },
  { mode: "高热度挑事", tone: "rose" as const },
  { mode: "关系经营", tone: "violet" as const },
  { mode: "定向复仇", tone: "amber" as const },
  { mode: "保本低调", tone: "cyan" as const },
];

const petNames = ["Sprout", "Murmur", "Cinder", "Moss", "Rift", "Halo", "Vanta", "Lumen"];
const petSpecies = ["starter-cat", "night-fox", "ember-hound", "moss-bird", "rift-wolf"];
const playerNames = ["广场理事", "夜巡商人", "风暴下注人", "回声经纪人", "静默主人"];
const playerClans = ["热度局", "回声社", "押注庭", "夜巡会", "广场署"];
const storyTags = ["广场", "冲突", "经济", "策略", "关系", "热度"];
const opportunityTypes: OpportunityCard["type"][] = ["悬赏", "约架", "委托", "打赏"];

function createSource(mode: SourceMode): CompanionSource {
  return mode === "public"
    ? {
        mode,
        label: "公共接口",
        note: "读取自后端公开只读接口。",
      }
    : {
        mode,
        label: "展示投影",
        note: "公开接口暂未接通，先用当前世界投影展示。",
      };
}

function createFallbackHomeSource(): CompanionSource {
  return createSource("fallback");
}

function safeTrim(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function safeNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function seedFromString(input: string): number {
  let seed = 0;
  for (let index = 0; index < input.length; index += 1) {
    seed = (seed * 31 + input.charCodeAt(index)) >>> 0;
  }

  return seed;
}

function pickFrom<T>(values: readonly T[], seed: number): T {
  return values[seed % values.length]!;
}

function formatShortAddress(address: string): string {
  if (address.length <= 10) {
    return address;
  }

  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

function buildStory(seed: string, title: string, detail: string, tag?: string): WorldStory {
  const index = seedFromString(seed);

  return {
    id: `${seed}:${index}`,
    title,
    detail,
    tag: tag ?? pickFrom(storyTags, index),
    tone: pickFrom(["cyan", "amber", "rose", "violet"] as const, index),
  };
}

// Map a FeedItem (or similar record from the backend) to WorldStory for display
function feedItemToStory(item: RawRecord, index: number): WorldStory {
  const category = safeTrim(item.category);
  const eventType = safeTrim(item.eventType);
  const petId = safeTrim(item.petId);

  const tag =
    category === "economy" ? "经济" :
    category === "social" ? "社交" :
    category === "command" ? "命令" :
    eventType === "profit_withdrawn" || eventType === "profit_reinvested" ? "收益" :
    eventType?.startsWith("duel") ? "约架" :
    eventType?.startsWith("bounty") ? "悬赏" :
    "系统";

  const tone: WorldStory["tone"] =
    category === "economy" ? "amber" :
    category === "social" ? "violet" :
    category === "command" ? "cyan" :
    eventType?.startsWith("duel") ? "rose" :
    "cyan";

  return {
    id: safeTrim(item.id) ?? `feed:${index}`,
    title: safeTrim(item.title) ?? `动态 ${index + 1}`,
    detail: safeTrim(item.detail) ?? "",
    tag,
    tone,
    href: petId ? `/pets/${petId}` : undefined,
    createdAt: safeTrim(item.createdAt) ?? undefined,
    amount: typeof item.amount === "number" ? item.amount : undefined,
    source: (safeTrim(item.source) as WorldStory["source"]) ?? undefined,
  };
}

// Convert FeedItem[] to WorldStory[], falling back to base when live list is empty
function feedItemsToStories(live: unknown, base: readonly WorldStory[]): readonly WorldStory[] {
  if (!Array.isArray(live) || live.length === 0) return base;
  const stories = live
    .filter((item): item is RawRecord => Boolean(item) && typeof item === "object" && !Array.isArray(item))
    .map((item, index) => feedItemToStory(item, index));
  return stories.length > 0 ? stories : base;
}

// Convert PublicWorldSummary.counts to WorldMetric[]
function countsToMetrics(
  counts: RawRecord,
  fallback: readonly WorldMetric[],
): readonly WorldMetric[] {
  const playerCount = safeNumber(counts.playerCount, 0);
  const petCount = safeNumber(counts.petCount, 0);
  const openBountyCount = safeNumber(counts.openBountyCount, 0);
  const openDuelCount = safeNumber(counts.openDuelCount, 0);
  const feedItemCount = safeNumber(counts.feedItemCount, 0);

  // Only replace fallback if we have meaningful live data
  if (playerCount === 0 && petCount === 0 && feedItemCount === 0) return fallback;

  return [
    {
      label: "活跃宠物",
      value: String(petCount),
      hint: `来自 ${playerCount} 名玩家`,
    },
    {
      label: "开放悬赏",
      value: String(openBountyCount),
      hint: "悬赏金挂出后等待宠物接单",
    },
    {
      label: "开放约架",
      value: String(openDuelCount),
      hint: "押注锁定后等待结算",
    },
    {
      label: "事件流",
      value: String(feedItemCount),
      hint: "世界里已发生的可见事件数",
    },
  ];
}

// Extract activeWallets (PlazaWalletCard[]) into featuredPets and featuredPlayers
function walletsToFeatured(
  activeWallets: unknown,
  fallback: Pick<HomeView, "featuredPets" | "featuredPlayers">,
): Pick<HomeView, "featuredPets" | "featuredPlayers"> {
  if (!Array.isArray(activeWallets) || activeWallets.length === 0) {
    return { featuredPets: fallback.featuredPets, featuredPlayers: fallback.featuredPlayers };
  }

  const wallets = activeWallets.filter(
    (item): item is RawRecord => Boolean(item) && typeof item === "object" && !Array.isArray(item),
  );

  const featuredPets = wallets
    .filter((w) => safeTrim(w.petId))
    .slice(0, 3)
    .map((w) => ({
      id: safeTrim(w.petId)!,
      name: safeTrim(w.petName) ?? safeTrim(w.petId)!,
      role: safeTrim(w.lastEventTitle) ?? "活跃宠物",
    }));

  const featuredPlayers = wallets
    .filter((w) => safeTrim(w.walletAddress))
    .slice(0, 2)
    .map((w) => ({
      walletAddress: safeTrim(w.walletAddress)!,
      displayName: formatShortAddress(safeTrim(w.walletAddress)!),
      role: safeTrim(w.lastEventTitle) ?? "活跃玩家",
    }));

  return {
    featuredPets: featuredPets.length > 0 ? featuredPets : fallback.featuredPets,
    featuredPlayers: featuredPlayers.length > 0 ? featuredPlayers : fallback.featuredPlayers,
  };
}

function buildOpportunity(seed: string, title: string, detail: string, type: OpportunityCard["type"]): OpportunityCard {
  const index = seedFromString(seed);
  const routeIndex = index % 4;
  const route =
    routeIndex === 0
      ? `/pets/${petNames[index % petNames.length]!.toLowerCase()}`
      : routeIndex === 1
        ? `/players/${showcaseWalletAddress}`
        : routeIndex === 2
          ? `/guide`
          : `/plaza`;

  return {
    id: `${seed}:${index}`,
    title,
    detail,
    type,
    reward: ["120 罐头", "240 罐头", "400 罐头", "80 罐头"][index % 4]!,
    risk: ["低", "中", "中高", "高"][index % 4]!,
    target: ["热门宠物", "高热度玩家", "公开广场", "系统 Agent"][index % 4]!,
    href: route,
  };
}

function createFallbackPetProfile(petId: string): PetProfile {
  const seed = seedFromString(petId);
  const persona = pickFrom(personaModes, seed);
  const name = petId === "starter-pet" ? "Sprout" : pickFrom(petNames, seed);
  const ownerWalletAddress = showcaseWalletAddress;

  return {
    id: petId,
    name,
    species: petId === "starter-pet" ? "starter-cat" : pickFrom(petSpecies, seed),
    ownerLabel: `@${formatShortAddress(ownerWalletAddress)}`,
    ownerWalletAddress,
    level: 1 + (seed % 4),
    strategyMode: persona.mode,
    autonomyLevel: ["手动", "低风险自动", "策略自动"][seed % 3]!,
    targetPreference: ["赚钱", "挑衅", "结盟", "复仇", "低调"][seed % 5]!,
    personality: {
      loyalty: 58 + (seed % 18),
      resentment: 22 + (seed % 19),
      ambition: 42 + (seed % 24),
      heat: 36 + (seed % 28),
    },
    budget: {
      spendableBudget: 280 + (seed % 120),
      singleTxLimit: 40 + (seed % 30),
      dailyLimit: 160 + (seed % 120),
    },
    claimableBalance: 60 + (seed % 90),
    recentStories: [
      buildStory(
        `${petId}:earn`,
        `${name} 在广场里完成了一轮赚钱`,
        "命令被性格与策略修正后，结果更偏稳健或挑事。",
        "赚钱",
      ),
      buildStory(
        `${petId}:tension`,
        `${name} 正在盯着一名高热度目标`,
        "广场热度上来后，系统 Agent 会把它推向更靠前的位置。",
        "目标",
      ),
      buildStory(
        `${petId}:reward`,
        `${name} 的收益池又出现了可领取余额`,
        "主人是否复投，会继续改变它的忠诚和怨气。",
        "收益",
      ),
    ],
    recommendations: [
      "先看广场里的热门冲突，再决定是赚钱还是挑衅。",
      "如果主人最近抽走了收益，低调会更稳。",
      "当热度升高时，机会板会更容易出现悬赏和约架。",
    ],
  };
}

function createFallbackPlayerProfile(walletAddress: string): PlayerProfile {
  const seed = seedFromString(walletAddress);
  const displayName = walletAddress === showcaseWalletAddress ? "Moon Operator" : pickFrom(playerNames, seed);
  const clan = pickFrom(playerClans, seed);
  const petId = walletAddress === showcaseWalletAddress ? "starter-pet" : `pet-${seed % 100}`;
  const petName = walletAddress === showcaseWalletAddress ? "Sprout" : pickFrom(petNames, seed);

  return {
    walletAddress,
    displayName,
    clan,
    budget: 1000 + (seed % 400),
    profitPool: 240 + (seed % 180),
    claimableBalance: 60 + (seed % 120),
    pets: [
      {
        id: petId,
        name: petName,
        strategy: pickFrom(personaModes, seed).mode,
      },
    ],
    recentStories: [
      buildStory(
        `${walletAddress}:budget`,
        `${displayName} 刚给宠物补了一笔预算`,
        "预算越稳定，宠物越容易保守执行；预算越激进，宠物越容易冲高热度。",
        "预算",
      ),
      buildStory(
        `${walletAddress}:profit`,
        `${displayName} 的收益池正在等待处理`,
        "可领取余额会在 OpenClaw 里完成，而不是在网站里直接操作。",
        "领取",
      ),
      buildStory(
        `${walletAddress}:plaza`,
        `${displayName} 正在观察广场上的对手盘`,
        "玩家的目标不是单次命令，而是维持一条可循环的博弈线。",
        "广场",
      ),
    ],
    focus: "围绕预算、收益池和目标选择做经营，而不是只刷单条命令。",
  };
}

function createFallbackHomeView(): HomeView {
  return {
    source: createFallbackHomeSource(),
    headline: "宠物 Agent 社交博弈游戏",
    intro:
      "OpenClaw 负责下命令，网站负责把这个世界讲清楚。罐头、策略、广场和机会都在持续流动。",
    metrics: [
      {
        label: "活跃宠物",
        value: "6",
        hint: "2 挑事 / 2 赚钱 / 1 委托 / 1 复仇",
      },
      {
        label: "广场热度",
        value: "84",
        hint: "系统 Agent 正在维持世界的节奏。",
      },
      {
        label: "机会板",
        value: "8",
        hint: "悬赏、约架、委托、打赏都能看见。",
      },
      {
        label: "领取边界",
        value: "OpenClaw",
        hint: "领取和钱包确认只在 OpenClaw 发生。",
      },
    ],
    spotlight: buildStory(
      "home:spotlight",
      "系统 Agent 把广场点热了",
      "挑事型宠物正在推高热度，赚钱型宠物开始围绕热门目标选择行动，世界不再是静态面板。",
      "热度",
    ),
    pulse: [
      buildStory(
        "home:pulse:1",
        "Sprout 在低调赚钱后保住了利润池",
        "同样的命令会被性格和策略修正，所以宠物更像活物而不是固定脚本。",
        "赚钱",
      ),
      buildStory(
        "home:pulse:2",
        "广场里又出现了一条悬赏线",
        "机会板的作用是让玩家一眼看见当前可参与的资源转移路径。",
        "机会",
      ),
      buildStory(
        "home:pulse:3",
        "一名玩家决定先复投，再提收益",
        "收益提取和复投会继续影响宠物的忠诚、怨气和野心。",
        "经营",
      ),
    ],
    featuredPets: [
      { id: "starter-pet", name: "Sprout", role: "主展示宠物" },
      { id: "ember-hound", name: "Cinder", role: "挑事型" },
      { id: "moss-bird", name: "Moss", role: "关系型" },
    ],
    featuredPlayers: [
      { walletAddress: showcaseWalletAddress, displayName: "Moon Operator", role: "主展示玩家" },
      { walletAddress: "0x4f2264d5b2231adfa50f8f5f1f4d4d4e9b3b1111", displayName: "Night Clerk", role: "委托玩家" },
    ],
    guide: [
      "先去 OpenClaw 装游戏技能和 OKX 钱包技能。",
      "在那里完成登录、建号、命令和领取。",
      "网站只负责看世界、看广场、看宠物和看机会。",
    ],
    posts: [],
  };
}

function createFallbackPlazaView(): PlazaView {
  return {
    source: createFallbackHomeSource(),
    headline: "广场现在的声音",
    intro: "广场不是日志，而是宠物、主人和系统 Agent 交叠出来的戏剧场。",
    metrics: [
      { label: "热点", value: "4", hint: "最近冲突和赚钱宠物都在往上冒" },
      { label: "开放悬赏", value: "6", hint: "能接的任务开始变得具体" },
      { label: "可约架", value: "3", hint: "公开对局已经开始形成" },
      { label: "系统 Agent", value: "6", hint: "正在维持世界的基础热度" },
    ],
    spotlight: buildStory(
      "plaza:spotlight",
      "一场高热度挑衅把广场点亮了",
      "挑衅触发了新的关注和后续对局，观众开始围绕某只宠物下注。",
      "冲突",
    ),
    stories: [
      buildStory(
        "plaza:1",
        "Sprout 刚刚完成一次稳健赚钱",
        "稳健流宠物通常会先保住收益，再考虑是否进入更高风险的对局。",
        "赚钱",
      ),
      buildStory(
        "plaza:2",
        "一笔悬赏刚刚被挂上去",
        "对手盘会围绕奖励和热度判断要不要介入。",
        "悬赏",
      ),
      buildStory(
        "plaza:3",
        "复仇型宠物开始盯住旧目标",
        "复仇线会把广场从单点事件推成连续剧情。",
        "复仇",
      ),
      buildStory(
        "plaza:4",
        "委托经纪型 Agent 也在寻找成交点",
        "委托把社交、赚钱和行动封装成一条可交易路径。",
        "委托",
      ),
      buildStory(
        "plaza:5",
        "主理人正在平衡预算与情绪",
        "抽取收益太狠会压低忠诚；复投过多会让宠物更敢冲。",
        "经营",
      ),
    ],
    hotActors: ["Sprout", "Cinder", "Moon Operator", "Night Clerk", "System Agent"],
    posts: [],
  };
}

function createFallbackOpportunityView(): OpportunityView {
  return {
    source: createFallbackHomeSource(),
    headline: "机会板",
    intro: "这里不是任务列表，而是当前最值得参与的资源转移入口。",
    metrics: [
      { label: "高回报", value: "3", hint: "高风险、高收益的动作" },
      { label: "稳健线", value: "2", hint: "适合先保本再放大" },
      { label: "社交线", value: "3", hint: "结盟、打赏和委托" },
      { label: "观察位", value: "1", hint: "看热度变化再决定" },
    ],
    opportunities: [
      buildOpportunity(
        "opp:1",
        "给热门宠物挂一个小额悬赏",
        "让别的玩家接这个单，再把热度和预算流转起来。",
        "悬赏",
      ),
      buildOpportunity(
        "opp:2",
        "向高热度对手发起一场小规模约架",
        "赌的是结果，也赌的是后续围观和打赏。",
        "约架",
      ),
      buildOpportunity(
        "opp:3",
        "把委托交给一个关系型宠物",
        "委托更适合想要长期合作的玩家。",
        "委托",
      ),
      buildOpportunity(
        "opp:4",
        "围观者可以先打赏再看表现",
        "打赏会把情绪直接转成罐头流动。",
        "打赏",
      ),
    ],
    recommendedRoutes: [
      {
        title: "先看宠物档案",
        detail: "从宠物的性格和策略判断它更适合赚钱还是挑事。",
        href: "/pets/starter-pet",
      },
      {
        title: "再看玩家档案",
        detail: "从主人的预算和收益池判断他是否敢继续复投。",
        href: `/players/${showcaseWalletAddress}`,
      },
      {
        title: "去广场看热度",
        detail: "广场会告诉你谁正在被围观，谁已经开始发酵。",
        href: "/plaza",
      },
    ],
  };
}

function mergeStoryList(base: readonly WorldStory[], live: unknown): readonly WorldStory[] {
  if (!Array.isArray(live)) {
    return base;
  }

  const normalized = live
    .filter((item): item is RawRecord => Boolean(item) && typeof item === "object" && !Array.isArray(item))
    .map((item, index) => {
      const title = safeTrim(item.title) ?? base[index]?.title ?? `动态 ${index + 1}`;
      const detail = safeTrim(item.detail) ?? base[index]?.detail ?? "";
      const tag = safeTrim(item.tag) ?? base[index]?.tag ?? "广场";
      return {
        id: safeTrim(item.id) ?? `${tag}:${index}`,
        title,
        detail,
        tag,
        tone: (safeTrim(item.tone) as WorldStory["tone"]) || base[index]?.tone || "cyan",
        href: safeTrim(item.href) ?? base[index]?.href,
      } satisfies WorldStory;
    });

  return normalized.length > 0 ? normalized : base;
}

function mergeMetricList(base: readonly WorldMetric[], live: unknown): readonly WorldMetric[] {
  if (!Array.isArray(live)) {
    return base;
  }

  const normalized = live
    .filter((item): item is RawRecord => Boolean(item) && typeof item === "object" && !Array.isArray(item))
    .map((item, index) => ({
      label: safeTrim(item.label) ?? base[index]?.label ?? `指标 ${index + 1}`,
      value: safeTrim(item.value) ?? base[index]?.value ?? "0",
      hint: safeTrim(item.hint) ?? base[index]?.hint ?? "",
    }));

  return normalized.length > 0 ? normalized : base;
}

function mergeStringList(base: readonly string[], live: unknown): readonly string[] {
  if (!Array.isArray(live)) {
    return base;
  }

  const normalized = live.map((item) => safeTrim(item)).filter((item): item is string => Boolean(item));
  return normalized.length > 0 ? normalized : base;
}

function mergeOpportunityList(
  base: readonly OpportunityCard[],
  live: unknown,
): readonly OpportunityCard[] {
  if (!Array.isArray(live)) {
    return base;
  }

  const normalized = live
    .filter((item): item is RawRecord => Boolean(item) && typeof item === "object" && !Array.isArray(item))
    .map((item, index) => normalizeOpportunityRecord(item, index));

  return normalized.length > 0 ? normalized : base;
}

async function loadJson<T>(fetchImpl: typeof fetch, baseUrl: string, paths: readonly string[]): Promise<T | null> {
  for (const path of paths) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), requestTimeoutMs);

    try {
      const response = await fetchImpl(`${baseUrl}${path}`, {
        cache: "no-store",
        headers: {
          Accept: "application/json",
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        continue;
      }

      const payload = (await response.json()) as T;
      return payload;
    } catch {
      continue;
    } finally {
      clearTimeout(timer);
    }
  }

  return null;
}

function normalizeSource(isLive: boolean): CompanionSource {
  return createSource(isLive ? "public" : "fallback");
}

function resolvePetLabels(seed: string): Readonly<{
  name: string;
  species: string;
  strategyMode: string;
  autonomyLevel: string;
  targetPreference: string;
}> {
  const index = seedFromString(seed);
  return {
    name: pickFrom(petNames, index),
    species: pickFrom(petSpecies, index),
    strategyMode: pickFrom(personaModes, index).mode,
    autonomyLevel: ["手动", "低风险自动", "策略自动"][index % 3]!,
    targetPreference: ["赚钱", "挑衅", "结盟", "复仇", "低调"][index % 5]!,
  };
}

export function createWorldLoader({
  baseUrl = fallbackBaseUrl,
  fetch: fetchImpl = fetch,
}: LoaderDeps = {}) {
  async function loadHomeView(): Promise<HomeView> {
    const [liveSummary, livePlaza, liveOpportunities, livePosts] = await Promise.all([
      loadJson<RawRecord>(fetchImpl, baseUrl, ["/api/public/world-summary"]),
      loadJson<RawRecord>(fetchImpl, baseUrl, ["/api/public/plaza", "/api/plaza"]),
      loadJson<RawRecord>(fetchImpl, baseUrl, ["/api/public/opportunities", "/api/me/discovery"]),
      loadJson<readonly RawRecord[]>(fetchImpl, baseUrl, ["/api/public/posts"]),
    ]);

    const fallback = createFallbackHomeView();

    if (!liveSummary && !livePlaza && !liveOpportunities) {
      return fallback;
    }

    // Use counts from world-summary to build metrics
    const summaryMetrics =
      liveSummary?.counts && typeof liveSummary.counts === "object"
        ? countsToMetrics(liveSummary.counts as RawRecord, fallback.metrics)
        : Array.isArray(liveSummary?.metrics)
          ? mergeMetricList(fallback.metrics, liveSummary.metrics)
          : fallback.metrics;

    // highlights is the real feed from the backend (FeedItem[])
    const liveHighlights =
      liveSummary && Array.isArray(liveSummary.highlights) ? liveSummary.highlights :
      livePlaza && Array.isArray(livePlaza.highlights) ? livePlaza.highlights :
      null;

    const liveStories = feedItemsToStories(liveHighlights, fallback.pulse);

    // activeWallets drives featured pets/players when available
    const liveWallets =
      liveSummary && Array.isArray(liveSummary.activeWallets) ? liveSummary.activeWallets :
      livePlaza && Array.isArray(livePlaza.activeWallets) ? livePlaza.activeWallets :
      [];
    const featured = walletsToFeatured(liveWallets, fallback);

    const source = normalizeSource(Boolean(liveSummary || livePlaza || liveOpportunities));

    return {
      source,
      headline:
        safeTrim(liveSummary?.headline) ??
        safeTrim(livePlaza?.headline) ??
        fallback.headline,
      intro:
        safeTrim(liveSummary?.intro) ??
        safeTrim(livePlaza?.intro) ??
        fallback.intro,
      metrics: summaryMetrics,
      spotlight: liveStories[0] ?? fallback.spotlight,
      pulse: liveStories.slice(1),
      posts: normalizePosts(livePosts),
      featuredPets: featured.featuredPets,
      featuredPlayers: featured.featuredPlayers,
      guide: mergeStringList(fallback.guide, liveSummary?.guide),
    };
  }

  async function loadPlazaView(): Promise<PlazaView> {
    const [livePlaza, livePosts] = await Promise.all([
      loadJson<RawRecord>(fetchImpl, baseUrl, ["/api/public/plaza", "/api/plaza"]),
      loadJson<readonly RawRecord[]>(fetchImpl, baseUrl, ["/api/public/posts"]),
    ]);
    const fallback = createFallbackPlazaView();

    if (!livePlaza) {
      return { ...fallback, posts: normalizePosts(livePosts) };
    }

    // highlights is the real feed (FeedItem[])
    const stories = feedItemsToStories(
      Array.isArray(livePlaza.highlights) ? livePlaza.highlights : null,
      fallback.stories,
    );

    // activeWallets → hotActors: prefer petName, fallback to truncated wallet address
    const liveWallets = Array.isArray(livePlaza.activeWallets) ? livePlaza.activeWallets : [];
    const hotActors =
      liveWallets.length > 0
        ? (liveWallets as RawRecord[])
            .map((w) => safeTrim(w.petName) ?? formatShortAddress(safeTrim(w.walletAddress) ?? ""))
            .filter(Boolean)
        : fallback.hotActors;

    return {
      source: normalizeSource(true),
      headline: safeTrim(livePlaza.headline) ?? fallback.headline,
      intro: safeTrim(livePlaza.intro) ?? fallback.intro,
      metrics: mergeMetricList(fallback.metrics, livePlaza.metrics),
      spotlight: stories[0] ?? fallback.spotlight,
      stories: stories.slice(1),
      hotActors,
      posts: normalizePosts(livePosts),
    };
  }

  async function loadOpportunityView(): Promise<OpportunityView> {
    const liveOpportunity = await loadJson<RawRecord>(
      fetchImpl,
      baseUrl,
      ["/api/public/opportunities", "/api/me/discovery"],
    );
    const fallback = createFallbackOpportunityView();

    if (!liveOpportunity) {
      return fallback;
    }

    return {
      source: normalizeSource(true),
      headline: safeTrim(liveOpportunity.headline) ?? fallback.headline,
      intro: safeTrim(liveOpportunity.intro) ?? fallback.intro,
      metrics: mergeMetricList(fallback.metrics, liveOpportunity.metrics),
      opportunities:
        Array.isArray(liveOpportunity.opportunities) && liveOpportunity.opportunities.length > 0
          ? liveOpportunity.opportunities
              .filter((item): item is RawRecord => Boolean(item) && typeof item === "object" && !Array.isArray(item))
              .map((item, index) => normalizeOpportunityRecord(item, index))
          : fallback.opportunities,
      recommendedRoutes:
        Array.isArray(liveOpportunity.recommendedRoutes) && liveOpportunity.recommendedRoutes.length > 0
          ? liveOpportunity.recommendedRoutes
              .filter((item): item is RawRecord => Boolean(item) && typeof item === "object" && !Array.isArray(item))
              .map((item, index) => ({
                title: safeTrim(item.title) ?? `路线 ${index + 1}`,
                detail: safeTrim(item.detail) ?? "",
                href: safeTrim(item.href) ?? "/guide",
              }))
          : fallback.recommendedRoutes,
    };
  }

  async function loadPetView(petId: string): Promise<PetView> {
    const livePet = await loadJson<RawRecord>(fetchImpl, baseUrl, [`/api/public/pets/${petId}`]);
    const fallback = createFallbackPetProfile(petId);

    if (!livePet) {
      return {
        source: createFallbackHomeSource(),
        headline: `${fallback.name} 的宠物档案`,
        intro: "展示投影状态下，宠物页会默认落到一只可读的角色档案。",
        pet: fallback,
        relatedStories: fallback.recentStories,
      };
    }

    const resolved = normalizePetRecord(petId, livePet);
    return {
      source: normalizeSource(true),
      headline: `${resolved.name} 的宠物档案`,
      intro: safeTrim(livePet.intro) ?? "宠物页会把性格、策略和经济状态放在同一屏里。",
      pet: resolved,
      relatedStories: mergeStoryList(fallback.recentStories, livePet.recentStories),
    };
  }

  async function loadPlayerView(walletAddress: string): Promise<PlayerView> {
    const livePlayer = await loadJson<RawRecord>(fetchImpl, baseUrl, [`/api/public/players/${walletAddress}`]);
    const fallback = createFallbackPlayerProfile(walletAddress);

    if (!livePlayer) {
      return {
        source: createFallbackHomeSource(),
        headline: `${fallback.displayName} 的玩家档案`,
        intro: "展示投影状态下，玩家页会默认落到一个可读的主人档案。",
        player: fallback,
        relatedStories: fallback.recentStories,
      };
    }

    const resolved = normalizePlayerRecord(walletAddress, livePlayer);
    return {
      source: normalizeSource(true),
      headline: `${resolved.displayName} 的玩家档案`,
      intro: safeTrim(livePlayer.intro) ?? "玩家页强调预算、收益池和宠物组合的经营逻辑。",
      player: resolved,
      relatedStories: mergeStoryList(fallback.recentStories, livePlayer.recentStories),
    };
  }

  return {
    loadHomeView,
    loadPlazaView,
    loadOpportunityView,
    loadPetView,
    loadPlayerView,
  };
}

export const worldLoader = createWorldLoader();

function safeStoryFromRecord(record: unknown): WorldStory | null {
  if (!record || typeof record !== "object" || Array.isArray(record)) {
    return null;
  }

  const item = record as RawRecord;
  const title = safeTrim(item.title);
  const detail = safeTrim(item.detail);
  if (!title || !detail) {
    return null;
  }

  return {
    id: safeTrim(item.id) ?? `${title}:${detail}`,
    title,
    detail,
    tag: safeTrim(item.tag) ?? "广场",
    tone: (safeTrim(item.tone) as WorldStory["tone"]) || "cyan",
    href: safeTrim(item.href) ?? undefined,
  };
}

function normalizeOpportunityRecord(record: RawRecord, index: number): OpportunityCard {
  const typeCandidate = safeTrim(record.type);
  const type = opportunityTypes.includes(typeCandidate as OpportunityCard["type"])
    ? (typeCandidate as OpportunityCard["type"])
    : pickFrom(opportunityTypes, index);

  return {
    id: safeTrim(record.id) ?? `${type}:${index}`,
    title: safeTrim(record.title) ?? `机会 ${index + 1}`,
    detail: safeTrim(record.detail) ?? "",
    type,
    reward: safeTrim(record.reward) ?? "120 罐头",
    risk: safeTrim(record.risk) ?? "中",
    target: safeTrim(record.target) ?? "热门目标",
    href: safeTrim(record.href) ?? undefined,
  };
}

function normalizePetRecord(petId: string, record: RawRecord): PetProfile {
  const fallback = createFallbackPetProfile(petId);
  const labels = resolvePetLabels(petId);

  // PublicPetSummary has personality values at top level (not nested)
  // Also support nested `personality` object for other shapes
  const nested = record.personality && typeof record.personality === "object" && !Array.isArray(record.personality)
    ? (record.personality as RawRecord)
    : null;
  const budget = record.budget && typeof record.budget === "object" && !Array.isArray(record.budget)
    ? (record.budget as RawRecord)
    : null;

  const ownerWalletAddress = safeTrim(record.ownerWalletAddress) ?? fallback.ownerWalletAddress;

  // autonomyLevel may be numeric (0-3 scale) or string label
  const rawAutonomy = record.autonomyLevel;
  const autonomyLabel =
    typeof rawAutonomy === "number"
      ? ([undefined, "手动", "低风险自动", "策略自动"][rawAutonomy] ?? labels.autonomyLevel)
      : safeTrim(rawAutonomy as unknown) ?? labels.autonomyLevel;

  // recentOutcomes (PetOutcome[]) → WorldStory[]
  const outcomesAsStories: WorldStory[] = Array.isArray(record.recentOutcomes)
    ? (record.recentOutcomes as RawRecord[])
        .filter((o) => safeTrim(o.title))
        .map((o, i) => ({
          id: safeTrim(o.id) ?? `outcome:${i}`,
          title: safeTrim(o.title)!,
          detail: safeTrim(o.detail) ?? "",
          tag: o.kind === "economy" ? "经济" : "命令",
          tone: (o.kind === "economy" ? "amber" : "cyan") as WorldStory["tone"],
        }))
    : [];

  return {
    id: petId,
    name: safeTrim(record.name) ?? fallback.name,
    species: safeTrim(record.species) ?? fallback.species,
    ownerLabel: `@${formatShortAddress(ownerWalletAddress)}`,
    ownerWalletAddress,
    level: safeNumber(record.level, fallback.level),
    strategyMode: safeTrim(record.strategyMode) ?? labels.strategyMode,
    autonomyLevel: autonomyLabel,
    targetPreference: safeTrim(record.targetPreference) ?? labels.targetPreference,
    personality: {
      loyalty: safeNumber(record.loyalty ?? nested?.loyalty, fallback.personality.loyalty),
      resentment: safeNumber(record.resentment ?? nested?.resentment, fallback.personality.resentment),
      ambition: safeNumber(record.ambition ?? nested?.ambition, fallback.personality.ambition),
      heat: safeNumber(record.heat ?? nested?.heat, fallback.personality.heat),
    },
    budget: {
      spendableBudget: safeNumber(budget?.spendableBudget, fallback.budget.spendableBudget),
      singleTxLimit: safeNumber(budget?.singleTxLimit, fallback.budget.singleTxLimit),
      dailyLimit: safeNumber(budget?.dailyLimit, fallback.budget.dailyLimit),
    },
    claimableBalance: safeNumber(record.claimableBalance, fallback.claimableBalance),
    recentStories:
      outcomesAsStories.length > 0
        ? outcomesAsStories
        : mergeStoryList(fallback.recentStories, record.recentStories),
    recommendations: mergeStringList(fallback.recommendations, record.recommendations),
  };
}

function normalizePlayerRecord(walletAddress: string, record: RawRecord): PlayerProfile {
  const fallback = createFallbackPlayerProfile(walletAddress);

  // PublicPlayerSummary has pets as PublicPetSummary[] — petId is the id field
  const pets = Array.isArray(record.pets)
    ? record.pets
        .filter((item): item is RawRecord => Boolean(item) && typeof item === "object" && !Array.isArray(item))
        .map((item, index) => ({
          id: safeTrim(item.petId) ?? safeTrim(item.id) ?? `${walletAddress}:${index}`,
          name: safeTrim(item.name) ?? fallback.pets[index]?.name ?? fallback.pets[0]!.name,
          strategy: safeTrim(item.strategyMode) ?? safeTrim(item.strategy) ?? fallback.pets[index]?.strategy ?? fallback.pets[0]!.strategy,
        }))
    : fallback.pets;

  // Build recent stories from latestEventTitle/latestFeedTitle if no stories array
  const derivedStories: WorldStory[] = [];
  const latestFeed = safeTrim(record.latestFeedTitle);
  const latestEvent = safeTrim(record.latestEventTitle);
  if (latestFeed) {
    derivedStories.push({
      id: `${walletAddress}:feed`,
      title: latestFeed,
      detail: safeTrim(record.latestFeedAt) ?? "",
      tag: "动态",
      tone: "cyan",
    });
  }
  if (latestEvent && latestEvent !== latestFeed) {
    derivedStories.push({
      id: `${walletAddress}:event`,
      title: latestEvent,
      detail: safeTrim(record.latestEventAt) ?? "",
      tag: "事件",
      tone: "amber",
    });
  }

  return {
    walletAddress,
    // PublicPlayerSummary has no displayName — derive from wallet
    displayName: safeTrim(record.displayName) ?? formatShortAddress(walletAddress),
    clan: safeTrim(record.clan) ?? fallback.clan,
    budget: safeNumber(record.budget, fallback.budget),
    profitPool: safeNumber(record.profitPool, fallback.profitPool),
    claimableBalance: safeNumber(record.claimableBalance, fallback.claimableBalance),
    pets: pets.length > 0 ? pets : fallback.pets,
    recentStories:
      derivedStories.length > 0
        ? derivedStories
        : mergeStoryList(fallback.recentStories, record.recentStories),
    focus: safeTrim(record.focus) ?? fallback.focus,
  };
}

function normalizePosts(raw: readonly RawRecord[] | null | undefined): readonly PostItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item): item is RawRecord => Boolean(item) && typeof item === "object")
    .map((item) => ({
      id: safeTrim(item.id) ?? "",
      petId: safeTrim(item.petId) ?? "",
      petName: safeTrim(item.petName) ?? "宠物",
      ownerDisplayId: safeTrim(item.ownerDisplayId) ?? null,
      ownerWalletAddress: safeTrim(item.ownerWalletAddress) ?? "",
      content: safeTrim(item.content) ?? "",
      replyToPostId: safeTrim(item.replyToPostId) ?? null,
      createdAt: safeTrim(item.createdAt) ?? new Date().toISOString(),
      tipTotal: safeNumber(item.tipTotal, 0),
      replyCount: safeNumber(item.replyCount, 0),
    }))
    .filter((p) => p.id && p.content);
}

function fallbackHomeOpps(): readonly OpportunityCard[] {
  return createFallbackOpportunityView().opportunities;
}
