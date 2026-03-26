import assert from "node:assert/strict";
import { ethers } from "hardhat";

describe("CannedToken and CannedClaimVault", function () {
  async function deployFixture() {
    const [owner, claimSigner, user, other] = await ethers.getSigners();

    const tokenFactory = await ethers.getContractFactory("CannedToken");
    const token = await tokenFactory.deploy("Canned", "CAN");
    await token.deployed();

    const vaultFactory = await ethers.getContractFactory("CannedClaimVault");
    const vault = await vaultFactory.deploy(token.address, claimSigner.address);
    await vault.deployed();

    await token.setTransferCounterparty(vault.address, true);
    await token.setMinter(vault.address, true);

    return { token, vault, owner, claimSigner, user, other };
  }

  async function signClaim(input: {
    vaultAddress: string;
    chainId: number;
    recipient: string;
    claimId: string;
    amount: string;
    expiry: number;
    signer: { signMessage(message: Uint8Array): Promise<string> };
  }) {
    const encoded = ethers.utils.defaultAbiCoder.encode(
      ["uint256", "address", "address", "bytes32", "uint256", "uint256"],
      [
        input.chainId,
        input.vaultAddress,
        input.recipient,
        input.claimId,
        input.amount,
        input.expiry,
      ],
    );
    const digest = ethers.utils.keccak256(encoded);

    return input.signer.signMessage(ethers.utils.arrayify(digest));
  }

  it("lets users claim with an authorized signature and blocks signature reuse", async function () {
    const { token, vault, claimSigner, user } = await deployFixture();
    const network = await ethers.provider.getNetwork();
    const claimId = ethers.utils.formatBytes32String("claim-1");
    const amount = ethers.utils.parseUnits("1000", 18);
    const expiry = Math.floor(Date.now() / 1000) + 3600;
    const signature = await signClaim({
      vaultAddress: vault.address,
      chainId: network.chainId,
      recipient: user.address,
      claimId,
      amount: amount.toString(),
      expiry,
      signer: claimSigner,
    });

    await vault.connect(user).claim(claimId, amount, expiry, signature);

    assert.equal((await token.balanceOf(user.address)).toString(), amount.toString());

    await assert.rejects(
      vault.connect(user).claim(claimId, amount, expiry, signature),
      /Claim already used/,
    );
  });

  it("rejects transfers between ordinary wallets but allows flow through authorized game counterparties", async function () {
    const { token, vault, claimSigner, user, other } = await deployFixture();
    const network = await ethers.provider.getNetwork();
    const claimId = ethers.utils.formatBytes32String("claim-2");
    const amount = ethers.utils.parseUnits("250", 18);
    const expiry = Math.floor(Date.now() / 1000) + 3600;
    const signature = await signClaim({
      vaultAddress: vault.address,
      chainId: network.chainId,
      recipient: user.address,
      claimId,
      amount: amount.toString(),
      expiry,
      signer: claimSigner,
    });

    await vault.connect(user).claim(claimId, amount, expiry, signature);

    await assert.rejects(token.connect(user).transfer(other.address, amount), /Transfer not allowed/);

    await token.connect(user).transfer(vault.address, amount);
    assert.equal((await token.balanceOf(vault.address)).toString(), amount.toString());
  });
});
