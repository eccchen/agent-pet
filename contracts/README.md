# Contracts

Hardhat workspace for the agent game contracts.

## Contracts

- `PetRegistry`
  Player registration plus pet ownership metadata.
- `BudgetVault`
  Pet budget metadata for onchain sync.
- `CannedToken`
  Restricted in-game token. Transfers are only allowed when either the sender or receiver is an approved game counterparty.
- `CannedClaimVault`
  User-initiated claim vault. The backend signs off-chain claim authorizations; the user wallet sends the onchain `claim(...)` transaction and pays gas.

## Networks

Supported network configs:

- `xlayerTestnet`
  - `chainId`: `1952`
  - env: `XLAYER_TESTNET_RPC_URL`
- `xlayer`
  - `chainId`: `196`
  - env: `XLAYER_RPC_URL`

Both use:

```env
DEPLOYER_PRIVATE_KEY=
```

## Scripts

- `corepack pnpm --dir contracts build`
- `corepack pnpm --dir contracts test`
- `corepack pnpm --dir contracts smoke:local`
- `corepack pnpm --dir contracts deploy:xlayer-testnet`
- `corepack pnpm --dir contracts deploy:xlayer`

## Deployment output

Each deploy script writes a manifest to `contracts/deployments/<network>.json`.

The manifest now includes:

- `network`
- `chainId`
- `deployedAt`
- `deployer`
- `claimSigner`
- `registry`
- `vault`
- `token`
- `claimVault`
