import type { CommandType } from "./skill.js";

export type OpenClawCommandPreset = Readonly<{
  commandType: CommandType;
  title: string;
  purpose: string;
  examples: readonly string[];
  aliases: readonly string[];
}>;

export type OpenClawStrategyPreset = Readonly<{
  strategyMode: CommandType;
  title: string;
  purpose: string;
  examples: readonly string[];
  aliases: readonly string[];
}>;

export const OPENCLAW_COMMAND_PRESETS: readonly OpenClawCommandPreset[] = [
  {
    commandType: "earn",
    title: "赚钱",
    purpose: "让宠物优先跑安全赚钱动作，增加收益池。",
    examples: ["赚钱", "去赚钱", "去挣点钱", "earn"],
    aliases: ["赚钱", "去赚钱", "去挣点钱", "earn", "farm", "make money"],
  },
  {
    commandType: "taunt",
    title: "开怼",
    purpose: "让宠物去公开挑衅、拱火或点名对线。",
    examples: ["怼他", "去喷", "挑衅", "taunt"],
    aliases: ["怼他", "去喷", "挑衅", "taunt", "flame", "diss"],
  },
  {
    commandType: "ally",
    title: "结盟",
    purpose: "让宠物拉关系、站队或尝试建立合作。",
    examples: ["结盟", "去拉关系", "找盟友", "ally"],
    aliases: ["结盟", "去拉关系", "找盟友", "ally", "team up", "make ally"],
  },
  {
    commandType: "revenge",
    title: "复仇",
    purpose: "让宠物优先处理旧仇和报复目标。",
    examples: ["复仇", "去报复", "狠狠干回来", "revenge"],
    aliases: ["复仇", "去报复", "狠狠干回来", "revenge", "retaliate", "get back"],
  },
  {
    commandType: "stay_low",
    title: "苟住",
    purpose: "让宠物降低曝光和风险，先保预算和状态。",
    examples: ["苟住", "先别惹事", "低调点", "stay low"],
    aliases: ["苟住", "先别惹事", "低调点", "stay low", "hide", "lay low"],
  },
] as const;

export const OPENCLAW_STRATEGY_PRESETS: readonly OpenClawStrategyPreset[] = [
  {
    strategyMode: "earn",
    title: "稳健赚钱",
    purpose: "让宠物优先选择稳健收益动作，兼顾持续增长。",
    examples: ["稳健赚钱", "安全赚钱", "earn"],
    aliases: ["稳健赚钱", "安全赚钱", "earn", "farm", "make money"],
  },
  {
    strategyMode: "taunt",
    title: "高热度挑事",
    purpose: "让宠物优先拉高热度并主动挑事，增加曝光和冲突。",
    examples: ["高热度挑事", "主动挑衅", "taunt"],
    aliases: ["高热度挑事", "主动挑衅", "taunt", "flame", "diss"],
  },
  {
    strategyMode: "ally",
    title: "关系经营",
    purpose: "让宠物优先维护关系和合作，扩大可用协作面。",
    examples: ["关系经营", "去交朋友", "ally"],
    aliases: ["关系经营", "去交朋友", "ally", "team up", "make ally"],
  },
  {
    strategyMode: "revenge",
    title: "定向复仇",
    purpose: "让宠物优先处理旧仇和报复目标。",
    examples: ["定向复仇", "去报复", "revenge"],
    aliases: ["定向复仇", "去报复", "revenge", "retaliate", "get back"],
  },
  {
    strategyMode: "stay_low",
    title: "保本低调",
    purpose: "让宠物降低曝光和风险，先保预算和状态。",
    examples: ["保本低调", "先别惹事", "stay low"],
    aliases: ["保本低调", "先别惹事", "stay low", "hide", "lay low"],
  },
] as const;

const aliasToCommandType = new Map<string, CommandType>(
  OPENCLAW_COMMAND_PRESETS.flatMap((preset) =>
    [preset.commandType, ...preset.aliases].map((alias) => [alias.trim().toLowerCase(), preset.commandType] as const),
  ),
);

const strategyAliasToStrategyMode = new Map<string, CommandType>(
  OPENCLAW_STRATEGY_PRESETS.flatMap((preset) =>
    [preset.strategyMode, ...preset.aliases].map((alias) => [alias.trim().toLowerCase(), preset.strategyMode] as const),
  ),
);

export function normalizeOpenClawCommand(input: string): CommandType | null {
  const normalized = input.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  return aliasToCommandType.get(normalized) ?? null;
}

export function listOpenClawCommandPhrases(): readonly OpenClawCommandPreset[] {
  return OPENCLAW_COMMAND_PRESETS;
}

export function normalizeOpenClawStrategy(input: string): CommandType | null {
  const normalized = input.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  return strategyAliasToStrategyMode.get(normalized) ?? null;
}

export function listOpenClawStrategyPhrases(): readonly OpenClawStrategyPreset[] {
  return OPENCLAW_STRATEGY_PRESETS;
}
