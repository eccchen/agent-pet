import assert from "node:assert/strict";
import { ethers } from "hardhat";

describe("PetRegistry", function () {
  async function deployRegistryFixture() {
    const [owner, other] = await ethers.getSigners();
    const factory = await ethers.getContractFactory("PetRegistry");
    const registry = await factory.deploy();
    await registry.deployed();

    return { registry, owner, other };
  }

  it("registers a player and records pet ownership facts", async function () {
    const { registry, owner } = await deployRegistryFixture();

    await registry.registerPlayer();
    const tx = await registry.createPet("Milo");
    const receipt = await tx.wait();
    const createdEvent = receipt.events?.find((event: any) => event.event === "PetCreated");

    assert.ok(createdEvent);

    const petId = createdEvent?.args?.petId.toNumber();
    const registered = await registry.isPlayerRegistered(owner.address);
    const pet = await registry.petOf(petId);

    assert.equal(registered, true);
    assert.equal(pet.owner, owner.address);
    assert.equal(pet.name, "Milo");
  });

  it("rejects pet creation before the caller registers", async function () {
    const { registry } = await deployRegistryFixture();

    await assert.rejects(registry.createPet("Milo"), /Player not registered/);
  });
});

describe("BudgetVault", function () {
  async function deployVaultFixture() {
    const [owner, other] = await ethers.getSigners();
    const registryFactory = await ethers.getContractFactory("PetRegistry");
    const registry = await registryFactory.deploy();
    await registry.deployed();

    const vaultFactory = await ethers.getContractFactory("BudgetVault");
    const vault = await vaultFactory.deploy(registry.address);
    await vault.deployed();

    return { registry, vault, owner, other };
  }

  it("stores budget metadata and lets the owner withdraw only unused funds", async function () {
    const { registry, vault, owner } = await deployVaultFixture();

    await registry.registerPlayer();
    const created = await registry.createPet("Milo");
    const receipt = await created.wait();
    const petId = receipt.events?.find((event: any) => event.event === "PetCreated")?.args?.petId.toNumber();

    await vault.depositForPet(petId, { value: ethers.utils.parseEther("1.0") });
    await vault.setBudget(petId, ethers.utils.parseEther("0.4"), ethers.utils.parseEther("0.1"), ethers.utils.parseEther("0.2"));

    const before = await ethers.provider.getBalance(owner.address);
    const tx = await vault.withdrawUnused(petId, ethers.utils.parseEther("0.6"));
    const receipt2 = await tx.wait();
    const gasUsed = receipt2.gasUsed.mul(receipt2.effectiveGasPrice ?? 0);
    const after = await ethers.provider.getBalance(owner.address);
    const budget = await vault.petBudget(petId);

    assert.equal(budget.spendableBudget.toString(), ethers.utils.parseEther("0.4").toString());
    assert.equal(budget.singleTxLimit.toString(), ethers.utils.parseEther("0.1").toString());
    assert.equal(budget.dailyLimit.toString(), ethers.utils.parseEther("0.2").toString());
    assert.equal(after.add(gasUsed).sub(before).toString(), ethers.utils.parseEther("0.6").toString());
  });

  it("rejects budget actions from non-owners", async function () {
    const { registry, vault, other } = await deployVaultFixture();

    await registry.registerPlayer();
    const created = await registry.createPet("Milo");
    const receipt = await created.wait();
    const petId = receipt.events?.find((event: any) => event.event === "PetCreated")?.args?.petId.toNumber();

    await assert.rejects(
      vault.connect(other).depositForPet(petId, { value: ethers.utils.parseEther("1.0") }),
      /Not pet owner/
    );
    await assert.rejects(
      vault.connect(other).setBudget(
        petId,
        ethers.utils.parseEther("0.4"),
        ethers.utils.parseEther("0.1"),
        ethers.utils.parseEther("0.2")
      ),
      /Not pet owner/
    );
    await assert.rejects(
      vault.connect(other).withdrawUnused(petId, ethers.utils.parseEther("0.1")),
      /Not pet owner/
    );
  });

  it("rejects budgets that exceed the deposited balance", async function () {
    const { registry, vault } = await deployVaultFixture();

    await registry.registerPlayer();
    const created = await registry.createPet("Milo");
    const receipt = await created.wait();
    const petId = receipt.events?.find((event: any) => event.event === "PetCreated")?.args?.petId.toNumber();

    await vault.depositForPet(petId, { value: ethers.utils.parseEther("1.0") });

    await assert.rejects(
      vault.setBudget(
        petId,
        ethers.utils.parseEther("1.1"),
        ethers.utils.parseEther("0.1"),
        ethers.utils.parseEther("0.2")
      ),
      /Budget exceeds deposit/
    );
  });

  it("rejects withdrawals that would dip into the spendable budget", async function () {
    const { registry, vault } = await deployVaultFixture();

    await registry.registerPlayer();
    const created = await registry.createPet("Milo");
    const receipt = await created.wait();
    const petId = receipt.events?.find((event: any) => event.event === "PetCreated")?.args?.petId.toNumber();

    await vault.depositForPet(petId, { value: ethers.utils.parseEther("1.0") });
    await vault.setBudget(
      petId,
      ethers.utils.parseEther("0.4"),
      ethers.utils.parseEther("0.1"),
      ethers.utils.parseEther("0.2")
    );

    await assert.rejects(
      vault.withdrawUnused(petId, ethers.utils.parseEther("0.7")),
      /Exceeds unused funds/
    );
  });
});
