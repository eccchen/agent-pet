import assert from "node:assert/strict";
import { ethers, network } from "hardhat";

async function main() {
  assert.equal(network.name, "hardhat", "Run with --network hardhat");

  const [owner, claimSigner, other] = await ethers.getSigners();
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
  const claimVault = await claimVaultFactory.deploy(cannedToken.address, claimSigner.address);
  await claimVault.deployed();

  await cannedToken.setTransferCounterparty(claimVault.address, true);
  await cannedToken.setMinter(claimVault.address, true);

  await registry.registerPlayer();
  const created = await registry.createPet("Milo");
  const receipt = await created.wait();
  const petId = receipt.events?.find((event: any) => event.event === "PetCreated")?.args?.petId.toNumber();

  assert.ok(petId, "pet id should be created");
  assert.equal(await registry.ownerOf(petId), owner.address);

  await assert.rejects(
    vault.connect(other).depositForPet(petId, { value: ethers.utils.parseEther("1.0") }),
    /Not pet owner/
  );

  await vault.depositForPet(petId, { value: ethers.utils.parseEther("1.0") });
  await vault.setBudget(
    petId,
    ethers.utils.parseEther("0.4"),
    ethers.utils.parseEther("0.1"),
    ethers.utils.parseEther("0.2")
  );

  await assert.rejects(vault.withdrawUnused(petId, ethers.utils.parseEther("0.7")), /Exceeds unused funds/);
  await vault.withdrawUnused(petId, ethers.utils.parseEther("0.6"));

  const budget = await vault.petBudget(petId);
  assert.equal(budget.deposited.toString(), ethers.utils.parseEther("0.4").toString());
  assert.equal(budget.spendableBudget.toString(), ethers.utils.parseEther("0.4").toString());
  assert.equal(budget.singleTxLimit.toString(), ethers.utils.parseEther("0.1").toString());
  assert.equal(budget.dailyLimit.toString(), ethers.utils.parseEther("0.2").toString());

  const claimId = ethers.utils.formatBytes32String("smoke-claim");
  const claimAmount = ethers.utils.parseUnits("500", 18);
  const expiry = Math.floor(Date.now() / 1000) + 3600;
  const digest = ethers.utils.keccak256(
    ethers.utils.defaultAbiCoder.encode(
      ["uint256", "address", "address", "bytes32", "uint256", "uint256"],
      [network.config.chainId, claimVault.address, owner.address, claimId, claimAmount, expiry]
    )
  );
  const signature = await claimSigner.signMessage(ethers.utils.arrayify(digest));

  await claimVault.claim(claimId, claimAmount, expiry, signature);
  assert.equal((await cannedToken.balanceOf(owner.address)).toString(), claimAmount.toString());

  console.log(
    `smoke-ok petId=${petId} registry=${registry.address} vault=${vault.address} token=${cannedToken.address} claimVault=${claimVault.address}`
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
