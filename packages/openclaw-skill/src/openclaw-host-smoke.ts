import { pathToFileURL } from "node:url";
import path from "node:path";

import type { CreateOpenClawHostSkillInvokerInput } from "./openclaw-host-bridge.js";
import { createOkxOpenClawWalletHost } from "./openclaw-host-bridge.js";
import { createOpenClawSkill } from "./skill.js";

export type OpenClawHostSmokeRunnerInput = Readonly<{
  baseUrl: string;
  host: CreateOpenClawHostSkillInvokerInput;
  petId: string;
  spendableBudget: number;
  singleTxLimit: number;
  dailyLimit: number;
}>;

export type OpenClawHostModuleShape = Readonly<{
  invokeSkill?: CreateOpenClawHostSkillInvokerInput;
  default?: CreateOpenClawHostSkillInvokerInput;
  host?: CreateOpenClawHostSkillInvokerInput;
  createInvokeSkill?: (
    context: OpenClawHostModuleFactoryContext,
  ) => Promise<CreateOpenClawHostSkillInvokerInput> | CreateOpenClawHostSkillInvokerInput;
  createHost?: (
    context: OpenClawHostModuleFactoryContext,
  ) => Promise<CreateOpenClawHostSkillInvokerInput> | CreateOpenClawHostSkillInvokerInput;
}>;

export type OpenClawHostModuleFactoryContext = Readonly<{
  cwd: string;
  env: NodeJS.ProcessEnv;
  modulePath: string;
}>;

function isSupportedHostExport(
  value: unknown,
): value is CreateOpenClawHostSkillInvokerInput {
  if (typeof value === "function") {
    return true;
  }

  return Boolean(
    value &&
      typeof value === "object" &&
      "invokeSkill" in value &&
      typeof (value as { invokeSkill?: unknown }).invokeSkill === "function",
  );
}

export async function loadOpenClawHostInvokerFromModule(
  modulePath: string,
): Promise<CreateOpenClawHostSkillInvokerInput> {
  const resolvedPath = path.isAbsolute(modulePath) ? modulePath : path.resolve(process.cwd(), modulePath);
  const moduleUrl = pathToFileURL(resolvedPath).href;
  const mod = (await import(moduleUrl)) as OpenClawHostModuleShape;
  const context: OpenClawHostModuleFactoryContext = {
    cwd: process.cwd(),
    env: process.env,
    modulePath: resolvedPath,
  };

  if (isSupportedHostExport(mod.invokeSkill)) {
    return mod.invokeSkill;
  }

  if (isSupportedHostExport(mod.default)) {
    return mod.default;
  }

  if (isSupportedHostExport(mod.host)) {
    return mod.host;
  }

  if (typeof mod.createInvokeSkill === "function") {
    const createdInvoker = await mod.createInvokeSkill(context);
    if (isSupportedHostExport(createdInvoker)) {
      return createdInvoker;
    }
  }

  if (typeof mod.createHost === "function") {
    const createdHost = await mod.createHost(context);
    if (isSupportedHostExport(createdHost)) {
      return createdHost;
    }
  }

  throw new Error(
    "OpenClaw host module must export invokeSkill, default, host, createInvokeSkill(), or createHost().",
  );
}

export async function runOpenClawHostSmoke({
  baseUrl,
  host,
  petId,
  spendableBudget,
  singleTxLimit,
  dailyLimit,
}: OpenClawHostSmokeRunnerInput) {
  const walletHost = createOkxOpenClawWalletHost({ host });
  const skill = createOpenClawSkill({ baseUrl });

  const session = await skill.loginWithWallet(walletHost);
  const player = await skill.bootstrap();
  const syncedPlayer = await skill.registerPlayerOnchainWithWallet(walletHost);
  const syncedPet = await skill.createPetOnchainWithWallet(walletHost, petId);
  await skill.budget(petId, {
    spendableBudget,
    singleTxLimit,
    dailyLimit,
  });
  const syncedBudget = await skill.setPetBudgetOnchainWithWallet(walletHost, petId);
  const home = await skill.home();

  return {
    session,
    player,
    syncedPlayer,
    syncedPet,
    syncedBudget,
    home,
  };
}
