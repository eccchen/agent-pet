import { utils as ethersUtils } from "ethers";

export type AuthMode = "unsafe" | "eip191";

export type WalletChallengeVerifier = Readonly<{
  createChallenge(nonce: string): string;
  verify(input: Readonly<{
    walletAddress: string;
    nonce: string;
    challenge: string;
    signature: string;
  }>): boolean;
}>;

type WalletChallengeVerifierDeps = Readonly<{
  mode: AuthMode;
  challengePrefix: string;
}>;

function normalizeWalletAddress(walletAddress: string): string {
  return walletAddress.trim().toLowerCase();
}

export function createWalletChallengeVerifier({
  mode,
  challengePrefix,
}: WalletChallengeVerifierDeps): WalletChallengeVerifier {
  return {
    createChallenge(nonce: string): string {
      return `${challengePrefix}: ${nonce}`;
    },
    verify({ walletAddress, nonce, challenge, signature }): boolean {
      if (mode === "unsafe") {
        return signature === `signed:${nonce}`;
      }

      try {
        const recoveredWalletAddress = ethersUtils.verifyMessage(challenge, signature);
        return normalizeWalletAddress(recoveredWalletAddress) === normalizeWalletAddress(walletAddress);
      } catch {
        return false;
      }
    },
  };
}
