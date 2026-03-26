import test from "node:test";
import assert from "node:assert/strict";

import { Wallet } from "ethers";

import { createWalletChallengeVerifier } from "./auth";

test("unsafe verifier accepts the development signed:nonce placeholder", () => {
  const verifier = createWalletChallengeVerifier({
    mode: "unsafe",
    challengePrefix: "Sign this wallet challenge",
  });

  const challenge = verifier.createChallenge("nonce-1");

  assert.equal(challenge, "Sign this wallet challenge: nonce-1");
  assert.equal(
    verifier.verify({
      walletAddress: "0xabc",
      nonce: "nonce-1",
      challenge,
      signature: "signed:nonce-1",
    }),
    true,
  );
});

test("eip191 verifier accepts a real personal signature from the wallet owner", async () => {
  const wallet = Wallet.createRandom();
  const verifier = createWalletChallengeVerifier({
    mode: "eip191",
    challengePrefix: "Sign this wallet challenge",
  });

  const challenge = verifier.createChallenge("nonce-2");
  const signature = await wallet.signMessage(challenge);

  assert.equal(
    verifier.verify({
      walletAddress: wallet.address,
      nonce: "nonce-2",
      challenge,
      signature,
    }),
    true,
  );
});

test("eip191 verifier rejects a signature from the wrong wallet", async () => {
  const wallet = Wallet.createRandom();
  const attacker = Wallet.createRandom();
  const verifier = createWalletChallengeVerifier({
    mode: "eip191",
    challengePrefix: "Sign this wallet challenge",
  });

  const challenge = verifier.createChallenge("nonce-3");
  const signature = await attacker.signMessage(challenge);

  assert.equal(
    verifier.verify({
      walletAddress: wallet.address,
      nonce: "nonce-3",
      challenge,
      signature,
    }),
    false,
  );
});
