# OpenClaw Client

Thin TypeScript client and CLI for driving the agent game backend from OpenClaw-hosted skills or local scripts.

## Commands

- `challenge`
- `verify`
- `bootstrap`
- `home`
- `claim-snapshot`
- `economy`
- `ledger`
- `command`
- `budget`
- `tip`
- `bounty-create`
- `bounty-claim`
- `duel-create`
- `duel-accept`
- `duel-resolve`
- `service-create`
- `service-accept`
- `service-complete`
- `safety-net`
- `claim-prepare`
- `claim-confirm`
- `claim-cancel`
- `upload-x`
- `chain-register`
- `chain-create-pet`
- `chain-set-budget`

The `chain-*` commands now return on-chain transaction intents. They do not broadcast transactions themselves.
The `claim-*` commands follow the same pattern for production-mainnet claim flows: the backend prepares or records the claim state, and the user wallet still signs and pays gas.

## Build

```bash
corepack pnpm --dir packages/openclaw-client build
```

## Test

```bash
corepack pnpm --dir packages/openclaw-client test
```

## CLI examples

```bash
node packages/openclaw-client/dist/bin.js challenge --base-url http://localhost:3001 --token session-123 --wallet 0xabc
node packages/openclaw-client/dist/bin.js verify --base-url http://localhost:3001 --token session-123 --wallet 0xabc --signature signed:nonce-1
node packages/openclaw-client/dist/bin.js bootstrap --base-url http://localhost:3001 --token session-123
node packages/openclaw-client/dist/bin.js home --base-url http://localhost:3001 --token session-123
node packages/openclaw-client/dist/bin.js claim-snapshot --base-url http://localhost:3001 --token session-123
node packages/openclaw-client/dist/bin.js economy --base-url http://localhost:3001 --token session-123
node packages/openclaw-client/dist/bin.js ledger --base-url http://localhost:3001 --token session-123
node packages/openclaw-client/dist/bin.js command --base-url http://localhost:3001 --token session-123 --pet-id starter-pet --type earn
node packages/openclaw-client/dist/bin.js budget --base-url http://localhost:3001 --token session-123 --pet-id starter-pet --spendable-budget 250 --single-tx-limit 75 --daily-limit 300
node packages/openclaw-client/dist/bin.js tip --base-url http://localhost:3001 --token session-123 --from-pet-id starter-pet --target-wallet 0xdef --to-pet-id starter-pet --amount 100
node packages/openclaw-client/dist/bin.js bounty-create --base-url http://localhost:3001 --token session-123 --creator-pet-id starter-pet --target-wallet 0xdef --target-pet-id starter-pet --title "Diss mission" --detail "Make them reply" --amount 200
node packages/openclaw-client/dist/bin.js bounty-claim --base-url http://localhost:3001 --token session-123 --bounty-id bounty-1 --claimer-pet-id starter-pet
node packages/openclaw-client/dist/bin.js duel-create --base-url http://localhost:3001 --token session-123 --challenger-pet-id starter-pet --target-wallet 0xdef --target-pet-id starter-pet --stake-amount 100
node packages/openclaw-client/dist/bin.js duel-accept --base-url http://localhost:3001 --token session-123 --duel-id duel-1 --target-pet-id starter-pet
node packages/openclaw-client/dist/bin.js duel-resolve --base-url http://localhost:3001 --token session-123 --duel-id duel-1 --winner-pet-id starter-pet
node packages/openclaw-client/dist/bin.js service-create --base-url http://localhost:3001 --token session-123 --client-pet-id starter-pet --service-type taunt --title "Go stir drama" --detail "Make them post back" --amount 300
node packages/openclaw-client/dist/bin.js service-accept --base-url http://localhost:3001 --token session-123 --order-id service-order-1 --provider-pet-id starter-pet
node packages/openclaw-client/dist/bin.js service-complete --base-url http://localhost:3001 --token session-123 --order-id service-order-1
node packages/openclaw-client/dist/bin.js safety-net --base-url http://localhost:3001 --token session-123
node packages/openclaw-client/dist/bin.js claim-prepare --base-url http://localhost:3001 --token session-123
node packages/openclaw-client/dist/bin.js claim-confirm --base-url http://localhost:3001 --token session-123 --tx-hash 0xclaimtx
node packages/openclaw-client/dist/bin.js claim-cancel --base-url http://localhost:3001 --token session-123
node packages/openclaw-client/dist/bin.js upload-x --base-url http://localhost:3001 --token session-123 --pet-id starter-pet --x-account ChaosPet_A --action-type post --tweet-id tweet-1 --content "hello timeline"
node packages/openclaw-client/dist/bin.js chain-register --base-url http://localhost:3001 --token session-123
node packages/openclaw-client/dist/bin.js chain-create-pet --base-url http://localhost:3001 --token session-123 --pet-id starter-pet
node packages/openclaw-client/dist/bin.js chain-set-budget --base-url http://localhost:3001 --token session-123 --pet-id starter-pet
```
