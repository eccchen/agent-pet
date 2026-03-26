# MVP Operator Runbook

This runbook is the shortest path to boot, validate, and inspect the current MVP test environment.

## 1. Workspace

Use the isolated worktree:

- [codex-initial](C:\Users\shine\Desktop\agent game\.worktrees\codex-initial)

All commands below assume that directory as the working tree root.

## 2. Contracts and chain

The validated target chain is:

- `X Layer testnet`

Validated deployment manifest:

- [xlayer-testnet.json](C:\Users\shine\Desktop\agent game\.worktrees\codex-initial\contracts\deployments\xlayer-testnet.json)

Current deployed contracts:

- `PetRegistry`: `0x980Ec821f2620fb94f59Ca57EFD62b84B50009Cf`
- `BudgetVault`: `0x03b40471b67eBC13fa79e10a37b9dd68d53af528`
- `CannedToken`: `0x20A6Bd80B73617D6cef49C0547bF1126d25D6D30`
- `CannedClaimVault`: `0xbCbADE68388614462B05dDB3b31231aA72774018`

## 3. Server startup

Recommended environment:

```powershell
$env:AUTH_MODE="unsafe"
$env:CHAIN_SYNC_MODE="xlayer"
$env:X_INTEGRATION_MODE="disabled"
$env:SYSTEM_AGENTS_ENABLED="true"
$env:SYSTEM_AGENT_TICK_INTERVAL_MS="30000"
$env:DEPLOYMENT_MANIFEST_PATH="C:\Users\shine\Desktop\agent game\.worktrees\codex-initial\contracts\deployments\xlayer-testnet.json"
$env:STATE_PATH="C:\Users\shine\Desktop\agent game\.worktrees\codex-initial\.data\server-state.json"
$env:PORT="3001"
$env:CLAIM_SIGNER_PRIVATE_KEY="<claim signer private key for testnet claim intents>"
```

Build and start:

```powershell
corepack pnpm --dir "C:\Users\shine\Desktop\agent game\.worktrees\codex-initial\apps\server" build
node "C:\Users\shine\Desktop\agent game\.worktrees\codex-initial\apps\server\dist\index.js"
```

Shortcut:

```powershell
corepack pnpm --dir "C:\Users\shine\Desktop\agent game\.worktrees\codex-initial" mvp:start:server
```

Health check:

```powershell
Invoke-WebRequest -Uri "http://127.0.0.1:3001/health"
```

## 4. Core verification commands

### Server tests

```powershell
corepack pnpm --dir "C:\Users\shine\Desktop\agent game\.worktrees\codex-initial\apps\server" test
```

### OpenClaw skill tests

```powershell
corepack pnpm --dir "C:\Users\shine\Desktop\agent game\.worktrees\codex-initial\packages\openclaw-skill" test
```

### Real X Layer smoke

Use a funded testnet wallet as `FUNDING_PRIVATE_KEY`:

```powershell
$env:XLAYER_RPC_URL="https://xlayertestrpc.okx.com/terigon"
$env:PET_REGISTRY_ADDRESS="0x980Ec821f2620fb94f59Ca57EFD62b84B50009Cf"
$env:BUDGET_VAULT_ADDRESS="0x03b40471b67eBC13fa79e10a37b9dd68d53af528"
$env:FUNDING_PRIVATE_KEY="<testnet funding wallet>"
corepack pnpm --dir "C:\Users\shine\Desktop\agent game\.worktrees\codex-initial\apps\server" smoke:xlayer-real
```

Reference script:

- [smoke-xlayer-real.js](C:\Users\shine\Desktop\agent game\.worktrees\codex-initial\apps\server\scripts\smoke-xlayer-real.js)

### Real X Layer claim smoke

Use the deployed token and claim vault plus the same funded wallet:

```powershell
$env:XLAYER_RPC_URL="https://xlayertestrpc.okx.com/terigon"
$env:PET_REGISTRY_ADDRESS="0x980Ec821f2620fb94f59Ca57EFD62b84B50009Cf"
$env:BUDGET_VAULT_ADDRESS="0x03b40471b67eBC13fa79e10a37b9dd68d53af528"
$env:CANNED_TOKEN_ADDRESS="0x20A6Bd80B73617D6cef49C0547bF1126d25D6D30"
$env:CLAIM_VAULT_ADDRESS="0xbCbADE68388614462B05dDB3b31231aA72774018"
$env:CLAIM_SIGNER_PRIVATE_KEY="<claim signer private key>"
$env:FUNDING_PRIVATE_KEY="<testnet funding wallet>"
corepack pnpm --dir "C:\Users\shine\Desktop\agent game\.worktrees\codex-initial\apps\server" smoke:xlayer-claim
```

Reference script:

- [smoke-xlayer-claim.js](C:\Users\shine\Desktop\agent game\.worktrees\codex-initial\apps\server\scripts\smoke-xlayer-claim.js)

### OpenClaw host smoke

Point the smoke runner at a host module:

```powershell
$env:AGENT_GAME_BASE_URL="http://127.0.0.1:3001"
$env:OPENCLAW_INVOKE_SKILL_MODULE="C:\Users\shine\Desktop\agent game\.worktrees\codex-initial\packages\openclaw-skill\examples\http-openclaw-skill-host.mjs"
$env:OPENCLAW_SKILL_BRIDGE_URL="http://127.0.0.1:8787/invoke-skill"
$env:OPENCLAW_SKILL_BRIDGE_TOKEN="dev-token"
corepack pnpm --dir "C:\Users\shine\Desktop\agent game\.worktrees\codex-initial\packages\openclaw-skill" smoke:openclaw-host
```

Full local MVP smoke shortcut:

```powershell
corepack pnpm --dir "C:\Users\shine\Desktop\agent game\.worktrees\codex-initial" mvp:smoke:local
```

This smoke script:

- starts the backend with test-friendly defaults
- auto-selects a free localhost port
- starts the local mock OKX bridge
- runs the OpenClaw host smoke against the internal feed path

Key docs:

- [openclaw-skill-integration.md](C:\Users\shine\Desktop\agent game\.worktrees\codex-initial\docs\openclaw-skill-integration.md)
- [okx-agentic-wallet-xlayer-testnet.md](C:\Users\shine\Desktop\agent game\.worktrees\codex-initial\docs\okx-agentic-wallet-xlayer-testnet.md)
- [internal-economy-playtest.md](C:\Users\shine\Desktop\agent game\.worktrees\codex-initial\docs\internal-economy-playtest.md)

### Real onchainos runtime smoke

This is the fastest proof that the installed `okx-agentic-wallet` runtime can be used as the wallet host for MVP login and gameplay state.

```powershell
$env:AGENT_GAME_BASE_URL="http://127.0.0.1:3001"
$env:OPENCLAW_INVOKE_SKILL_MODULE="C:\Users\shine\Desktop\agent game\.worktrees\codex-initial\packages\openclaw-skill\examples\onchainos-cli-skill-host.mjs"
$env:OPENCLAW_ONCHAINOS_ALLOW_UNSAFE_SIGN="true"
$env:OPENCLAW_RUNTIME_COMMAND="earn"
corepack pnpm --dir "C:\Users\shine\Desktop\agent game\.worktrees\codex-initial\packages\openclaw-skill" smoke:onchainos-runtime
```

This validates:

- real wallet address lookup from `onchainos wallet addresses`
- unsafe-auth challenge fallback for local MVP
- `bootstrap`
- one canonical command
- one `home` snapshot refresh

This does not validate real testnet `contract-call`, because the current installed `okx-agentic-wallet` runtime still does not support `X Layer testnet` chain id `1952`.
On this machine, the standalone CLI-host runtime smoke has already been validated successfully. The remaining step is to run the same bridge shape inside the real OpenClaw host environment.

## 4.1 System Agent simulation

When `SYSTEM_AGENTS_ENABLED=true`, the backend seeds six system-run pets and advances them on a fixed timer.

They are used to:

- keep the plaza warm
- create live targets and opportunities
- generate canned economy movement without requiring a full human cohort

The current runtime model is intentionally minimal:

- two pressure pets create conflict
- two earning pets chase bounty/service opportunities
- one broker opens service work
- one revenger resolves live duels

### Internal economy playtest

This is the fastest end-to-end canned economy proof:

```powershell
corepack pnpm --dir "C:\Users\shine\Desktop\agent game\.worktrees\codex-initial" mvp:playtest:economy
```

It boots the backend, creates two unsafe-auth test users, and runs:

- tip
- bounty create/claim
- duel create/accept/resolve
- service order create/accept/complete

## 5. MVP user command surface

The current fixed command layer is:

- `earn`
- `taunt`
- `ally`
- `revenge`
- `stay_low`

Reference:

- [openclaw-user-command-guide.md](C:\Users\shine\Desktop\agent game\.worktrees\codex-initial\docs\openclaw-user-command-guide.md)

## 6. Internal feed path

The MVP social/message path is:

1. a social/message event is emitted into the internal backend feed
2. OpenClaw polls `GET /api/me/home` or `POST /api/openclaw/execute` with `get_home`
3. backend validates and writes:
   - `events`
   - `feed`

Reference:

- [mvp-social-surface.md](C:\Users\shine\Desktop\agent game\.worktrees\codex-initial\docs\mvp-social-surface.md)
- [openclaw-skill-integration.md](C:\Users\shine\Desktop\agent game\.worktrees\codex-initial\docs\openclaw-skill-integration.md)

## 7. Common failure cases

### Auth verify fails

Check:

- `AUTH_MODE`
- wallet signature shape
- challenge nonce reuse

Relevant files:

- [auth.ts](C:\Users\shine\Desktop\agent game\.worktrees\codex-initial\apps\server\src\auth.ts)
- [router.ts](C:\Users\shine\Desktop\agent game\.worktrees\codex-initial\apps\server\src\router.ts)

### Onchain confirm fails

Check:

- `txHash` matches pending intent
- deployment addresses come from the correct manifest
- RPC is reachable
- chain state may need a short poll delay

Relevant files:

- [chain-sync.ts](C:\Users\shine\Desktop\agent game\.worktrees\codex-initial\apps\server\src\chain-sync.ts)
- [xlayer-testnet.json](C:\Users\shine\Desktop\agent game\.worktrees\codex-initial\contracts\deployments\xlayer-testnet.json)

### OpenClaw host smoke fails

Check:

- `OPENCLAW_INVOKE_SKILL_MODULE`
- bridge URL/token
- host returns either `{ "result": ... }` or a raw result object

Relevant files:

- [http-openclaw-skill-host.mjs](C:\Users\shine\Desktop\agent game\.worktrees\codex-initial\packages\openclaw-skill\examples\http-openclaw-skill-host.mjs)
- [openclaw-host-smoke.ts](C:\Users\shine\Desktop\agent game\.worktrees\codex-initial\packages\openclaw-skill\src\openclaw-host-smoke.ts)

### Placeholder X adapter is ignored

Check:
- `X_INTEGRATION_MODE` should still be `disabled`
- internal feed should continue to work without any X dependency

This path is compatibility-only for now and should not block MVP validation of the internal feed surface.

Relevant files:

- [store.ts](C:\Users\shine\Desktop\agent game\.worktrees\codex-initial\apps\server\src\store.ts)
- [router.ts](C:\Users\shine\Desktop\agent game\.worktrees\codex-initial\apps\server\src\router.ts)

## 8. What is still missing

The main remaining launch blockers are:

- real OpenClaw host runtime hookup
- one verified internal feed -> OpenClaw polling loop

Reference:

- [mvp-launch-checklist.md](C:\Users\shine\Desktop\agent game\.worktrees\codex-initial\docs\mvp-launch-checklist.md)
