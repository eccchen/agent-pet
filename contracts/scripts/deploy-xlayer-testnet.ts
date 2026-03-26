import { network } from "hardhat";

import { deployStack } from "./deploy-shared";

async function main() {
  const { deployment, outputPath } = await deployStack();

  console.log(`network=${network.name}`);
  console.log(`deployer=${deployment.deployer}`);
  console.log(`claimSigner=${deployment.claimSigner}`);
  console.log(`registry=${deployment.registry}`);
  console.log(`vault=${deployment.vault}`);
  console.log(`token=${deployment.token}`);
  console.log(`claimVault=${deployment.claimVault}`);
  console.log(`wrote=${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
