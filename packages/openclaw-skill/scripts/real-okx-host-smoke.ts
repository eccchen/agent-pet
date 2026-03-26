import { OKXUniversalProvider } from "@okxconnect/universal-provider";

import { loadRealHostSmokeConfig } from "../src/real-host-config.js";
import { createOkxUniversalWalletHost } from "../src/okx-host.js";
import { createOpenClawSkill } from "../src/skill.js";

async function main() {
  const config = loadRealHostSmokeConfig();

  const provider = await OKXUniversalProvider.init({
    DAppMetaData: {
      name: config.dappName,
      icon: config.dappIcon,
    },
  });

  const walletHost = createOkxUniversalWalletHost({
    provider,
    redirect: config.redirect === "none" ? undefined : config.redirect,
  });

  const skill = createOpenClawSkill({
    baseUrl: config.baseUrl,
  });

  console.log("Connecting OKX Agentic Wallet on X Layer testnet...");
  const session = await skill.loginWithWallet(walletHost);
  console.log("Authenticated wallet:", session.walletAddress);

  const player = await skill.bootstrap();
  console.log("Bootstrap complete. Pets:", player.pets.length);
  console.log("Target pet:", config.petId);

  const syncedPlayer = await skill.registerPlayerOnchainWithWallet(walletHost);
  console.log("registerPlayer confirmed:", syncedPlayer.chainSync);

  const syncedPet = await skill.createPetOnchainWithWallet(walletHost, config.petId);
  console.log("createPet confirmed:", syncedPet.chainSync);

  const updatedPet = await skill.budget(config.petId, {
    spendableBudget: config.spendableBudget,
    singleTxLimit: config.singleTxLimit,
    dailyLimit: config.dailyLimit,
  });
  console.log("Local budget updated:", updatedPet.budget);

  const syncedBudget = await skill.setPetBudgetOnchainWithWallet(walletHost, config.petId);
  console.log("setBudget confirmed:", syncedBudget.chainSync);

  const home = await skill.home();
  console.log(
    JSON.stringify(
      {
        walletAddress: home.player.walletAddress,
        budget: home.player.budget,
        profitPool: home.player.profitPool,
        availableCommands: home.availableCommands,
        petChainSync: syncedBudget.chainSync,
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
