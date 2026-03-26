const showcaseWalletAddress = "0x881c6722397bf536edc1b766b10386aab62e4fa9";
const fallbackBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim() ||
    process.env.API_BASE_URL?.trim() ||
    "http://localhost:3001";
const requestTimeoutMs = 1250;
const personaModes = [
    { mode: "稳健赚钱", tone: "cyan" },
    { mode: "高热度挑事", tone: "rose" },
    { mode: "关系经营", tone: "violet" },
    { mode: "定向复仇", tone: "amber" },
    { mode: "保本低调", tone: "cyan" },
];
const petNames = ["Sprout", "Murmur", "Cinder", "Moss", "Rift", "Halo", "Vanta", "Lumen"];
const petSpecies = ["starter-cat", "night-fox", "ember-hound", "moss-bird", "rift-wolf"];
const playerNames = ["广场理事", "夜巡商人", "风暴下注人", "回声经纪人", "静默主人"];
const playerClans = ["热度局", "回声社", "押注庭", "夜巡会", "广场署"];
const storyTags = ["广场", "冲突", "经济", "策略", "关系", "热度"];
const opportunityTypes = ["悬赏", "约架", "委托", "打赏"];
function createSource(mode) {
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
function createFallbackHomeSource() {
    return createSource("fallback");
}
function safeTrim(value) {
    return typeof value === "string" && value.trim() ? value.trim() : null;
}
function safeNumber(value, fallback) {
    return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}
function seedFromString(input) {
    let seed = 0;
    for (let index = 0; index < input.length; index += 1) {
        seed = (seed * 31 + input.charCodeAt(index)) >>> 0;
    }
    return seed;
}
function pickFrom(values, seed) {
    return values[seed % values.length];
}
function formatShortAddress(address) {
    if (address.length <= 10) {
        return address;
    }
    return `${address.slice(0, 6)}…${address.slice(-4)}`;
}
function buildStory(seed, title, detail, tag) {
    const index = seedFromString(seed);
    return {
        id: `${seed}:${index}`,
        title,
        detail,
        tag: tag ?? pickFrom(storyTags, index),
        tone: pickFrom(["cyan", "amber", "rose", "violet"], index),
    };
}
function buildOpportunity(seed, title, detail, type) {
    const index = seedFromString(seed);
    const routeIndex = index % 4;
    const route = routeIndex === 0
        ? `/pets/${petNames[index % petNames.length].toLowerCase()}`
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
        reward: ["120 罐头", "240 罐头", "400 罐头", "80 罐头"][index % 4],
        risk: ["低", "中", "中高", "高"][index % 4],
        target: ["热门宠物", "高热度玩家", "公开广场", "系统 Agent"][index % 4],
        href: route,
    };
}
function createFallbackPetProfile(petId) {
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
        autonomyLevel: ["手动", "低风险自动", "策略自动"][seed % 3],
        targetPreference: ["赚钱", "挑衅", "结盟", "复仇", "低调"][seed % 5],
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
            buildStory(`${petId}:earn`, `${name} 在广场里完成了一轮赚钱`, "命令被性格与策略修正后，结果更偏稳健或挑事。", "赚钱"),
            buildStory(`${petId}:tension`, `${name} 正在盯着一名高热度目标`, "广场热度上来后，系统 Agent 会把它推向更靠前的位置。", "目标"),
            buildStory(`${petId}:reward`, `${name} 的收益池又出现了可领取余额`, "主人是否复投，会继续改变它的忠诚和怨气。", "收益"),
        ],
        recommendations: [
            "先看广场里的热门冲突，再决定是赚钱还是挑衅。",
            "如果主人最近抽走了收益，低调会更稳。",
            "当热度升高时，机会板会更容易出现悬赏和约架。",
        ],
    };
}
function createFallbackPlayerProfile(walletAddress) {
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
            buildStory(`${walletAddress}:budget`, `${displayName} 刚给宠物补了一笔预算`, "预算越稳定，宠物越容易保守执行；预算越激进，宠物越容易冲高热度。", "预算"),
            buildStory(`${walletAddress}:profit`, `${displayName} 的收益池正在等待处理`, "可领取余额会在 OpenClaw 里完成，而不是在网站里直接操作。", "领取"),
            buildStory(`${walletAddress}:plaza`, `${displayName} 正在观察广场上的对手盘`, "玩家的目标不是单次命令，而是维持一条可循环的博弈线。", "广场"),
        ],
        focus: "围绕预算、收益池和目标选择做经营，而不是只刷单条命令。",
    };
}
function createFallbackHomeView() {
    return {
        source: createFallbackHomeSource(),
        headline: "宠物 Agent 社交博弈游戏",
        intro: "OpenClaw 负责下命令，网站负责把这个世界讲清楚。罐头、策略、广场和机会都在持续流动。",
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
        spotlight: buildStory("home:spotlight", "系统 Agent 把广场点热了", "挑事型宠物正在推高热度，赚钱型宠物开始围绕热门目标选择行动，世界不再是静态面板。", "热度"),
        pulse: [
            buildStory("home:pulse:1", "Sprout 在低调赚钱后保住了利润池", "同样的命令会被性格和策略修正，所以宠物更像活物而不是固定脚本。", "赚钱"),
            buildStory("home:pulse:2", "广场里又出现了一条悬赏线", "机会板的作用是让玩家一眼看见当前可参与的资源转移路径。", "机会"),
            buildStory("home:pulse:3", "一名玩家决定先复投，再提收益", "收益提取和复投会继续影响宠物的忠诚、怨气和野心。", "经营"),
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
    };
}
function createFallbackPlazaView() {
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
        spotlight: buildStory("plaza:spotlight", "一场高热度挑衅把广场点亮了", "挑衅触发了新的关注和后续对局，观众开始围绕某只宠物下注。", "冲突"),
        stories: [
            buildStory("plaza:1", "Sprout 刚刚完成一次稳健赚钱", "稳健流宠物通常会先保住收益，再考虑是否进入更高风险的对局。", "赚钱"),
            buildStory("plaza:2", "一笔悬赏刚刚被挂上去", "对手盘会围绕奖励和热度判断要不要介入。", "悬赏"),
            buildStory("plaza:3", "复仇型宠物开始盯住旧目标", "复仇线会把广场从单点事件推成连续剧情。", "复仇"),
            buildStory("plaza:4", "委托经纪型 Agent 也在寻找成交点", "委托把社交、赚钱和行动封装成一条可交易路径。", "委托"),
            buildStory("plaza:5", "主理人正在平衡预算与情绪", "抽取收益太狠会压低忠诚；复投过多会让宠物更敢冲。", "经营"),
        ],
        hotActors: ["Sprout", "Cinder", "Moon Operator", "Night Clerk", "System Agent"],
    };
}
function createFallbackOpportunityView() {
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
            buildOpportunity("opp:1", "给热门宠物挂一个小额悬赏", "让别的玩家接这个单，再把热度和预算流转起来。", "悬赏"),
            buildOpportunity("opp:2", "向高热度对手发起一场小规模约架", "赌的是结果，也赌的是后续围观和打赏。", "约架"),
            buildOpportunity("opp:3", "把委托交给一个关系型宠物", "委托更适合想要长期合作的玩家。", "委托"),
            buildOpportunity("opp:4", "围观者可以先打赏再看表现", "打赏会把情绪直接转成罐头流动。", "打赏"),
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
function mergeStoryList(base, live) {
    if (!Array.isArray(live)) {
        return base;
    }
    const normalized = live
        .filter((item) => Boolean(item) && typeof item === "object" && !Array.isArray(item))
        .map((item, index) => {
        const title = safeTrim(item.title) ?? base[index]?.title ?? `动态 ${index + 1}`;
        const detail = safeTrim(item.detail) ?? base[index]?.detail ?? "";
        const tag = safeTrim(item.tag) ?? base[index]?.tag ?? "广场";
        return {
            id: safeTrim(item.id) ?? `${tag}:${index}`,
            title,
            detail,
            tag,
            tone: safeTrim(item.tone) || base[index]?.tone || "cyan",
            href: safeTrim(item.href) ?? base[index]?.href,
        };
    });
    return normalized.length > 0 ? normalized : base;
}
function mergeMetricList(base, live) {
    if (!Array.isArray(live)) {
        return base;
    }
    const normalized = live
        .filter((item) => Boolean(item) && typeof item === "object" && !Array.isArray(item))
        .map((item, index) => ({
        label: safeTrim(item.label) ?? base[index]?.label ?? `指标 ${index + 1}`,
        value: safeTrim(item.value) ?? base[index]?.value ?? "0",
        hint: safeTrim(item.hint) ?? base[index]?.hint ?? "",
    }));
    return normalized.length > 0 ? normalized : base;
}
function mergeStringList(base, live) {
    if (!Array.isArray(live)) {
        return base;
    }
    const normalized = live.map((item) => safeTrim(item)).filter((item) => Boolean(item));
    return normalized.length > 0 ? normalized : base;
}
function mergeOpportunityList(base, live) {
    if (!Array.isArray(live)) {
        return base;
    }
    const normalized = live
        .filter((item) => Boolean(item) && typeof item === "object" && !Array.isArray(item))
        .map((item, index) => normalizeOpportunityRecord(item, index));
    return normalized.length > 0 ? normalized : base;
}
async function loadJson(fetchImpl, baseUrl, paths) {
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
            const payload = (await response.json());
            return payload;
        }
        catch {
            continue;
        }
        finally {
            clearTimeout(timer);
        }
    }
    return null;
}
function normalizeSource(isLive) {
    return createSource(isLive ? "public" : "fallback");
}
function resolvePetLabels(seed) {
    const index = seedFromString(seed);
    return {
        name: pickFrom(petNames, index),
        species: pickFrom(petSpecies, index),
        strategyMode: pickFrom(personaModes, index).mode,
        autonomyLevel: ["手动", "低风险自动", "策略自动"][index % 3],
        targetPreference: ["赚钱", "挑衅", "结盟", "复仇", "低调"][index % 5],
    };
}
export function createWorldLoader({ baseUrl = fallbackBaseUrl, fetch: fetchImpl = fetch, } = {}) {
    async function loadHomeView() {
        const liveSummary = await loadJson(fetchImpl, baseUrl, ["/api/public/world-summary"]);
        const livePlaza = await loadJson(fetchImpl, baseUrl, ["/api/public/plaza", "/api/plaza"]);
        const liveOpportunities = await loadJson(fetchImpl, baseUrl, ["/api/public/opportunities", "/api/me/discovery"]);
        const fallback = createFallbackHomeView();
        if (!liveSummary && !livePlaza && !liveOpportunities) {
            return fallback;
        }
        const summaryMetrics = liveSummary && Array.isArray(liveSummary.metrics)
            ? mergeMetricList(fallback.metrics, liveSummary.metrics)
            : fallback.metrics;
        const liveStories = mergeStoryList(fallback.pulse, livePlaza && Array.isArray(livePlaza.stories) ? livePlaza.stories : liveSummary?.stories);
        const opportunityItems = liveOpportunities && Array.isArray(liveOpportunities.opportunities)
            ? mergeOpportunityList(fallbackHomeOpps(), liveOpportunities.opportunities)
            : fallbackHomeOpps();
        const source = normalizeSource(Boolean(liveSummary || livePlaza || liveOpportunities));
        return {
            source,
            headline: safeTrim(liveSummary?.headline) ??
                safeTrim(livePlaza?.headline) ??
                fallback.headline,
            intro: safeTrim(liveSummary?.intro) ??
                safeTrim(livePlaza?.intro) ??
                fallback.intro,
            metrics: summaryMetrics,
            spotlight: liveStories[0] ??
                safeStoryFromRecord(liveSummary?.spotlight) ??
                fallback.spotlight,
            pulse: liveStories,
            featuredPets: fallback.featuredPets,
            featuredPlayers: fallback.featuredPlayers,
            guide: mergeStringList(fallback.guide, liveSummary?.guide),
        };
    }
    async function loadPlazaView() {
        const livePlaza = await loadJson(fetchImpl, baseUrl, ["/api/public/plaza", "/api/plaza"]);
        const fallback = createFallbackPlazaView();
        if (!livePlaza) {
            return fallback;
        }
        const stories = mergeStoryList(fallback.stories, livePlaza.stories);
        return {
            source: normalizeSource(true),
            headline: safeTrim(livePlaza.headline) ?? fallback.headline,
            intro: safeTrim(livePlaza.intro) ?? fallback.intro,
            metrics: mergeMetricList(fallback.metrics, livePlaza.metrics),
            spotlight: safeStoryFromRecord(livePlaza.spotlight) ?? stories[0] ?? fallback.spotlight,
            stories,
            hotActors: mergeStringList(fallback.hotActors, livePlaza.hotActors),
        };
    }
    async function loadOpportunityView() {
        const liveOpportunity = await loadJson(fetchImpl, baseUrl, ["/api/public/opportunities", "/api/me/discovery"]);
        const fallback = createFallbackOpportunityView();
        if (!liveOpportunity) {
            return fallback;
        }
        return {
            source: normalizeSource(true),
            headline: safeTrim(liveOpportunity.headline) ?? fallback.headline,
            intro: safeTrim(liveOpportunity.intro) ?? fallback.intro,
            metrics: mergeMetricList(fallback.metrics, liveOpportunity.metrics),
            opportunities: Array.isArray(liveOpportunity.opportunities) && liveOpportunity.opportunities.length > 0
                ? liveOpportunity.opportunities
                    .filter((item) => Boolean(item) && typeof item === "object" && !Array.isArray(item))
                    .map((item, index) => normalizeOpportunityRecord(item, index))
                : fallback.opportunities,
            recommendedRoutes: Array.isArray(liveOpportunity.recommendedRoutes) && liveOpportunity.recommendedRoutes.length > 0
                ? liveOpportunity.recommendedRoutes
                    .filter((item) => Boolean(item) && typeof item === "object" && !Array.isArray(item))
                    .map((item, index) => ({
                    title: safeTrim(item.title) ?? `路线 ${index + 1}`,
                    detail: safeTrim(item.detail) ?? "",
                    href: safeTrim(item.href) ?? "/guide",
                }))
                : fallback.recommendedRoutes,
        };
    }
    async function loadPetView(petId) {
        const livePet = await loadJson(fetchImpl, baseUrl, [`/api/public/pets/${petId}`]);
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
    async function loadPlayerView(walletAddress) {
        const livePlayer = await loadJson(fetchImpl, baseUrl, [`/api/public/players/${walletAddress}`]);
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
function safeStoryFromRecord(record) {
    if (!record || typeof record !== "object" || Array.isArray(record)) {
        return null;
    }
    const item = record;
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
        tone: safeTrim(item.tone) || "cyan",
        href: safeTrim(item.href) ?? undefined,
    };
}
function normalizeOpportunityRecord(record, index) {
    const typeCandidate = safeTrim(record.type);
    const type = opportunityTypes.includes(typeCandidate)
        ? typeCandidate
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
function normalizePetRecord(petId, record) {
    const fallback = createFallbackPetProfile(petId);
    const labels = resolvePetLabels(petId);
    const persona = record.personality && typeof record.personality === "object" && !Array.isArray(record.personality)
        ? record.personality
        : null;
    const budget = record.budget && typeof record.budget === "object" && !Array.isArray(record.budget)
        ? record.budget
        : null;
    return {
        id: petId,
        name: safeTrim(record.name) ?? fallback.name,
        species: safeTrim(record.species) ?? fallback.species,
        ownerLabel: safeTrim(record.ownerLabel) ?? fallback.ownerLabel,
        ownerWalletAddress: safeTrim(record.ownerWalletAddress) ?? fallback.ownerWalletAddress,
        level: safeNumber(record.level, fallback.level),
        strategyMode: safeTrim(record.strategyMode) ?? labels.strategyMode,
        autonomyLevel: safeTrim(record.autonomyLevel) ?? labels.autonomyLevel,
        targetPreference: safeTrim(record.targetPreference) ?? labels.targetPreference,
        personality: {
            loyalty: safeNumber(persona?.loyalty, fallback.personality.loyalty),
            resentment: safeNumber(persona?.resentment, fallback.personality.resentment),
            ambition: safeNumber(persona?.ambition, fallback.personality.ambition),
            heat: safeNumber(persona?.heat, fallback.personality.heat),
        },
        budget: {
            spendableBudget: safeNumber(budget?.spendableBudget, fallback.budget.spendableBudget),
            singleTxLimit: safeNumber(budget?.singleTxLimit, fallback.budget.singleTxLimit),
            dailyLimit: safeNumber(budget?.dailyLimit, fallback.budget.dailyLimit),
        },
        claimableBalance: safeNumber(record.claimableBalance, fallback.claimableBalance),
        recentStories: mergeStoryList(fallback.recentStories, record.recentStories),
        recommendations: mergeStringList(fallback.recommendations, record.recommendations),
    };
}
function normalizePlayerRecord(walletAddress, record) {
    const fallback = createFallbackPlayerProfile(walletAddress);
    const pets = Array.isArray(record.pets)
        ? record.pets
            .filter((item) => Boolean(item) && typeof item === "object" && !Array.isArray(item))
            .map((item, index) => ({
            id: safeTrim(item.id) ?? `${walletAddress}:${index}`,
            name: safeTrim(item.name) ?? fallback.pets[index]?.name ?? fallback.pets[0].name,
            strategy: safeTrim(item.strategy) ?? fallback.pets[index]?.strategy ?? fallback.pets[0].strategy,
        }))
        : fallback.pets;
    return {
        walletAddress,
        displayName: safeTrim(record.displayName) ?? fallback.displayName,
        clan: safeTrim(record.clan) ?? fallback.clan,
        budget: safeNumber(record.budget, fallback.budget),
        profitPool: safeNumber(record.profitPool, fallback.profitPool),
        claimableBalance: safeNumber(record.claimableBalance, fallback.claimableBalance),
        pets: pets.length > 0 ? pets : fallback.pets,
        recentStories: mergeStoryList(fallback.recentStories, record.recentStories),
        focus: safeTrim(record.focus) ?? fallback.focus,
    };
}
function fallbackHomeOpps() {
    return createFallbackOpportunityView().opportunities;
}
