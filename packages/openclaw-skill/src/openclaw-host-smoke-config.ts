export type OpenClawHostSmokeConfig = Readonly<{
  baseUrl: string;
  invokeSkillModule: string | null;
  petId: string;
  spendableBudget: number;
  singleTxLimit: number;
  dailyLimit: number;
}>;

function requireEnv(env: NodeJS.ProcessEnv | Record<string, string | undefined>, key: string): string {
  const value = env[key]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable ${key}.`);
  }

  return value;
}

function readNumber(
  env: NodeJS.ProcessEnv | Record<string, string | undefined>,
  key: string,
  fallback: number,
): number {
  const raw = env[key]?.trim();
  if (!raw) {
    return fallback;
  }

  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`Invalid numeric environment variable ${key}.`);
  }

  return parsed;
}

export function loadOpenClawHostSmokeConfig(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): OpenClawHostSmokeConfig {
  return {
    baseUrl: requireEnv(env, "AGENT_GAME_BASE_URL"),
    invokeSkillModule: env.OPENCLAW_INVOKE_SKILL_MODULE?.trim() || null,
    petId: env.AGENT_GAME_PET_ID?.trim() || "starter-pet",
    spendableBudget: readNumber(env, "AGENT_GAME_SPENDABLE_BUDGET", 250),
    singleTxLimit: readNumber(env, "AGENT_GAME_SINGLE_TX_LIMIT", 75),
    dailyLimit: readNumber(env, "AGENT_GAME_DAILY_LIMIT", 300),
  };
}
