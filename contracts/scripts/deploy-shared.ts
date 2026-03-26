import fs from "node:fs/promises";
import path from "node:path";

import { ethers, network } from "hardhat";

export async function deployStack() {
  const [deployer, fallbackClaimSigner] = await ethers.getSigners();
  const claimSignerAddress = fallbackClaimSigner?.address ?? deployer.address;

  const registryFactory = await ethers.getContractFactory("PetRegistry");
  const registry = await registryFactory.deploy();
  await registry.deployed();

  const vaultFactory = await ethers.getContractFactory("BudgetVault");
  const vault = await vaultFactory.deploy(registry.address);
  await vault.deployed();

  const cannedTokenFactory = await ethers.getContractFactory("CannedToken");
  const cannedToken = await cannedTokenFactory.deploy("Canned", "CAN");
  await cannedToken.deployed();

  const claimVaultFactory = await ethers.getContractFactory("CannedClaimVault");
  const claimVault = await claimVaultFactory.deploy(cannedToken.address, claimSignerAddress);
  await claimVault.deployed();

  await (await cannedToken.setTransferCounterparty(claimVault.address, true)).wait();
  await (await cannedToken.setMinter(claimVault.address, true)).wait();

  const deployment = {
    network: network.name,
    chainId: Number(network.config.chainId ?? 0),
    deployedAt: new Date().toISOString(),
    deployer: deployer.address,
    claimSigner: claimSignerAddress,
    registry: registry.address,
    vault: vault.address,
    token: cannedToken.address,
    claimVault: claimVault.address,
  };

  const deploymentsDir = path.resolve(process.cwd(), "deployments");
  await fs.mkdir(deploymentsDir, { recursive: true });
  const outputPath = path.join(deploymentsDir, `${network.name}.json`);
  await fs.writeFile(outputPath, `${JSON.stringify(deployment, null, 2)}\n`, "utf8");

  if (network.name === "xlayerTestnet") {
    await fs.writeFile(
      path.join(deploymentsDir, "xlayer-testnet.json"),
      `${JSON.stringify(deployment, null, 2)}\n`,
      "utf8",
    );
  }

  return { deployment, outputPath };
}
