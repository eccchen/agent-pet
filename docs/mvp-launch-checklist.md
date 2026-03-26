# MVP Launch Checklist

This checklist tracks the remaining work between the current codebase and a first internal MVP launch.

## Current status

Already done:

- backend auth/session/bootstrap flow
- player and pet state, budgets, profit pool, claimable balance, and internal feed state exposed through OpenClaw polling
- personality and strategy as part of the core gameplay loop
- system agent bootstrap and plaza/economy simulation ticks
- `PetRegistry` + `BudgetVault`
- restricted `CannedToken` + `CannedClaimVault`
- `intent -> wallet send -> confirm` onchain flow
- real `X Layer testnet` deployment and real smoke run
- OpenClaw client and OpenClaw skill packages
- OKX Agentic Wallet bridge for `okx/onchainos-skills`
- local smoke, economy playtest, and onchain runtime playtest scripts
- claim modeled as an OpenClaw-first user action, not a website action
- startup path documented with `SYSTEM_AGENTS_ENABLED=true`

Main remaining gap:

- real OpenClaw host runtime hookup
- final internal-team environment packaging and handoff
- optional later: switch the deployment manifest from testnet to `xlayer` mainnet
- lowest priority: X/Twitter adapter bring-up

Runtime status:

- the repository-level `onchainos` CLI runtime smoke now runs successfully on this machine
- real `okx-agentic-wallet` address lookup, unsafe-auth login, `bootstrap`, and one canonical command have been validated
- final validation still needs to happen inside the real OpenClaw host environment

Supporting economy reference:

- [canned-economy-model.md](C:\Users\shine\Desktop\agent game\.worktrees\codex-initial\docs\canned-economy-model.md)

## P0: Must finish before internal MVP

### 1. Real OpenClaw host integration

- connect the actual OpenClaw skill-to-skill invocation API to:
  - [openclaw-host-bridge.ts](C:\Users\shine\Desktop\agent game\.worktrees\codex-initial\packages\openclaw-skill\src\openclaw-host-bridge.ts)
- prove that the host can call:
  - `wallet.addresses`
  - optional `wallet.sign-message`
  - `wallet.contract-call`

Definition of done:

- `smoke:openclaw-host` runs against the real host callback

### 2. Real OKX skill validation

- install and run `okx/onchainos-skills` in the same OpenClaw environment
- validate:
  - get EVM address
  - if available, sign auth challenge
  - run MVP login and one command through the host bridge

Definition of done:

- one end-to-end run completes through the real OKX skill inside the OpenClaw host, not just the standalone CLI host smoke

### 3. Internal team environment packaging

- freeze the internal `.env` template
- confirm the deployment manifest path
- confirm state path and restart behavior
- confirm operator commands for:
  - `mvp:start:server`
  - `mvp:smoke:local`
  - `mvp:playtest:economy`
  - `mvp:playtest:onchainos-runtime`

Definition of done:

- a new dev can boot the test environment from docs alone

## P1: Strongly recommended before external testing

### 4. Runtime logging review

- verify logs clearly show:
  - wallet auth failures
  - tx intent generation
  - tx confirm failures
  - internal feed failures
  - placeholder X adapter failures

### 5. Operator runbook

- document:
  - server start
  - contract deployment reuse
  - real smoke commands
  - OpenClaw host smoke command
  - expected error cases

### 6. User command surface lock

- keep the OpenClaw-facing command set fixed for MVP:
  - `earn`
  - `taunt`
  - `ally`
  - `revenge`
  - `stay_low`
- keep aliases stable for prompt and instruction writing

### 7. Keep personality and strategy first-class

- treat personality and strategy as part of the base MVP loop
- surface them in OpenClaw before any website expansion
- keep strategy changes explicit and readable to internal testers

## Not required for internal MVP

- heavy frontend
- website action surface for claim or wallet operations
- guilds
- adoption and redemption market
- advanced combat
- automated X crawling
- primary X/Twitter posting and re-fetching path
- full public leaderboard

## Exit criteria

The MVP is ready for internal testing when:

1. a user can log in through OpenClaw with OKX Agentic Wallet
2. the user can bootstrap a pet
3. the user can issue one command
4. the user can sync player and pet on `X Layer testnet`
5. the internal feed, plaza, and message state appear through OpenClaw polling
6. the home snapshot shows the updated player, pet, event, feed, and message state
7. claim is completed in OpenClaw and reflected elsewhere only as a read-only result
