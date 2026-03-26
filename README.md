# Agent Game

Monorepo scaffold for the agent pet game.

## Layout

- `apps/` for runnable app surfaces
- `packages/` for shared libraries
- `contracts/` for on-chain work
- `docs/` for planning material and project notes
- [`docs/canned-economy-model.md`](C:\Users\shine\Desktop\agent%20game\.worktrees\codex-initial\docs\canned-economy-model.md)
  First-MVP closed test-server economy using `罐头` as the internal gameplay currency.

## Current implementation slices

- `apps/server`
  Minimal backend with wallet challenge/session flow, player bootstrap, pet budgets, command execution, internal feed/plaza snapshots, canned economy flows, user-initiated claim intents, testnet claim confirmation, and system-agent simulation ticks.
- `apps/web`
  Read-only companion website for 首页 / 广场 / 宠物页 / 玩家页 / 机会板. Primary play still happens through OpenClaw and the internal backend feed.
- `packages/openclaw-client`
  Thin TypeScript client and CLI for skill-side use. Supports auth/bootstrap, command/budget flows, feed/message polling, economy operations, claim operations, and explicit onchain sync commands.
- `packages/openclaw-skill`
  Skill wrapper over `@agent-game/openclaw-client` for OpenClaw-hosted agent flows, including `createOkxOpenClawWalletHost(...)` for `okx/onchainos-skills` bridging.
- `contracts`
  `PetRegistry`, `BudgetVault`, `CannedToken`, and `CannedClaimVault` plus local smoke/deploy scripts.
- [`docs/okx-agentic-wallet-xlayer-testnet.md`](C:\Users\shine\Desktop\agent%20game\.worktrees\codex-initial\docs\okx-agentic-wallet-xlayer-testnet.md)
  Integration notes for wiring `okx/onchainos-skills` Agentic Wallet bridge into the OpenClaw host against X Layer testnet, plus the OpenClaw host smoke runner and manual fallback notes.
- [`docs/mvp-social-surface.md`](C:\Users\shine\Desktop\agent%20game\.worktrees\codex-initial\docs\mvp-social-surface.md)
  MVP note for the internal backend feed plus OpenClaw polling path. X/Twitter stays behind a placeholder adapter.

## Chain sync modes

- `CHAIN_SYNC_MODE=local`
  Keeps gameplay local-first and records placeholder sync metadata only.
- `CHAIN_SYNC_MODE=xlayer`
  Enables real X Layer RPC validation through the configured deployment manifest. Player metadata, pet metadata, budget sync, and user-initiated claim intents resolve to real contract calldata. Transactions are intended to be sent by the OKX Agentic Wallet host, then confirmed back to the backend by `txHash`.

## X integration modes

- `X_INTEGRATION_MODE=disabled`
  Default MVP path. Internal backend feed plus OpenClaw polling is the primary social surface; X/Twitter stays deferred.
- `X_INTEGRATION_MODE=local_upload`
  Optional local verification mode for later X bring-up. Enables upload/verification endpoints without making X a primary gameplay dependency.

## MVP startup

For the current internal MVP, prefer:

- `AUTH_MODE=unsafe`
- `CHAIN_SYNC_MODE=xlayer`
- `X_INTEGRATION_MODE=disabled`
- `SYSTEM_AGENTS_ENABLED=true`
- `SYSTEM_AGENT_TICK_INTERVAL_MS=30000`

Quick commands:

```powershell
corepack pnpm mvp:start:server
corepack pnpm mvp:smoke:local
corepack pnpm mvp:playtest:economy
corepack pnpm mvp:smoke:onchainos-runtime
```

The first starts the backend with test-friendly defaults.
The second runs a local end-to-end smoke using:

- the internal backend feed
- a local OpenClaw host module
- a local mock OKX skill bridge
- the existing X Layer testnet deployment manifest
- an automatically selected free localhost port

The third runs a canned-economy playtest with two test users and system-agent pressure.

The fourth runs a lightweight real-wallet runtime smoke using:

- the logged-in `okx-agentic-wallet` session
- `AUTH_MODE=unsafe`
- the real wallet address returned by `onchainos wallet addresses`
- bootstrap, one command, and one `home` snapshot

It does not perform real testnet `contract-call` through `okx-agentic-wallet`, because the installed runtime still does not expose `X Layer testnet` (`1952`) as a supported chain.

## Short internal launch path

1. Reuse or deploy [`contracts/deployments/xlayer-testnet.json`](C:\Users\shine\Desktop\agent%20game\.worktrees\codex-initial\contracts\deployments\xlayer-testnet.json)
2. Start the backend with `corepack pnpm mvp:start:server`
3. Validate with `corepack pnpm mvp:smoke:local`
4. Run `corepack pnpm mvp:playtest:economy`
5. Run `corepack pnpm mvp:smoke:onchainos-runtime`
6. Use OpenClaw for login, commands, and claim; keep the website read-only

## Testnet-first rollout

The intended first deployment target is `X Layer testnet`.

1. Deploy contracts from [`contracts`](C:\Users\shine\Desktop\agent%20game\.worktrees\codex-initial\contracts) with `corepack pnpm --dir contracts deploy:xlayer-testnet`
2. Read or reuse the generated manifest at [`contracts/deployments/xlayer-testnet.json`](C:\Users\shine\Desktop\agent%20game\.worktrees\codex-initial\contracts\deployments\xlayer-testnet.json)
3. Point [`apps/server/.env.example`](C:\Users\shine\Desktop\agent%20game\.worktrees\codex-initial\apps\server\.env.example) at that file with `DEPLOYMENT_MANIFEST_PATH`
4. For MVP, keep `AUTH_MODE=unsafe`, `CHAIN_SYNC_MODE=xlayer`, `X_INTEGRATION_MODE=disabled`, and `SYSTEM_AGENTS_ENABLED=true`
5. Only switch to `X_INTEGRATION_MODE=local_upload` when you explicitly want to test compatibility X uploads later
6. Run the OpenClaw / OKX wallet smoke flow from [`packages/openclaw-skill`](C:\Users\shine\Desktop\agent%20game\.worktrees\codex-initial\packages\openclaw-skill)

## Mainnet-ready claim model

The launch model is:

- gameplay can remain test-first
- wallet claims are user-initiated
- the user wallet pays gas
- the backend only prepares claim intents and verifies `txHash`

That flow is implemented with:

- `CannedToken`
- `CannedClaimVault`
- backend `claimableBalance -> claim intent -> confirm/cancel`

For details see [`docs/mainnet-claim-model.md`](C:\Users\shine\Desktop\agent%20game\.worktrees\codex-initial\docs\mainnet-claim-model.md).

## Validation

Run `corepack pnpm validate:structure` to confirm the root workspace directories are present.
