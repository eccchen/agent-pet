import { loadOpenClawHostSmokeConfig } from "../src/openclaw-host-smoke-config.js";
import { loadOpenClawHostInvokerFromModule, runOpenClawHostSmoke } from "../src/openclaw-host-smoke.js";

async function main() {
  const config = loadOpenClawHostSmokeConfig();

  if (!config.invokeSkillModule) {
    throw new Error(
      "Set OPENCLAW_INVOKE_SKILL_MODULE to a module that exports invokeSkill/default/host, then rerun smoke:openclaw-host.",
    );
  }

  const host = await loadOpenClawHostInvokerFromModule(config.invokeSkillModule);
  const result = await runOpenClawHostSmoke({
    baseUrl: config.baseUrl,
    host,
    petId: config.petId,
    spendableBudget: config.spendableBudget,
    singleTxLimit: config.singleTxLimit,
    dailyLimit: config.dailyLimit,
  });

  console.log(
    JSON.stringify(
      {
        walletAddress: result.session.walletAddress,
        budget: result.home.player.budget,
        profitPool: result.home.player.profitPool,
        petChainSync: result.syncedBudget.chainSync,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
