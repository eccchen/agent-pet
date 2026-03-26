# OpenClaw Skill Integration

This repo treats OpenClaw as the user-side agent host. The backend exposes a small set of endpoints and a matching client package for skill-side use. For the MVP social/message surface, use the internal backend feed plus OpenClaw polling; X/Twitter stays behind a placeholder adapter. Production claims are now modeled as user-initiated mainnet withdrawals.

## Identity and auth

- Agentic Wallet address is the player identity.
- Sign-in flow stays:
  - `POST /api/auth/challenge`
  - `POST /api/auth/verify`
  - `POST /api/players/bootstrap`
- After verify, the skill stores the bearer token locally and uses it for subsequent calls.
- Server auth modes:
  - `AUTH_MODE=unsafe` for local placeholder verification via `signed:<nonce>`
  - `AUTH_MODE=eip191` for real wallet personal-signature verification

## Recommended read path

Use one request to hydrate the local shell:

- `GET /api/me/home`

Response shape:

- `player`
- `claimableBalance` when available
- `claim` when the backend exposes a claim snapshot
- `events`
- `xActions`
- `availableCommands`

See also:

- [mvp-social-surface.md](C:\Users\shine\Desktop\agent game\.worktrees\codex-initial\docs\mvp-social-surface.md)

## Recommended write path

For skill-side actions there are two valid patterns.

### Direct endpoints

- `POST /api/pets/:id/commands`
- `PATCH /api/pets/:id/budget`
- `POST /api/profit/reinvest`
- `POST /api/profit/withdraw`
- `POST /api/x/actions/upload`
- `GET /api/me/claim`
- `POST /api/onchain/claim/intent`
- `POST /api/onchain/claim/confirm`
- `POST /api/onchain/claim/cancel`

### Unified OpenClaw endpoint

- `POST /api/openclaw/execute`

Supported `operation` values:

- `get_home`
- `issue_command`
- `update_budget`
- `reinvest_profit`
- `withdraw_profit`
- `upload_x_action`
- `register_player_onchain`
- `create_pet_onchain`
- `set_budget_onchain`

For the fixed MVP command surface and suggested user phrasing, see:

- [openclaw-user-command-guide.md](C:\Users\shine\Desktop\agent game\.worktrees\codex-initial\docs\openclaw-user-command-guide.md)

## X action upload rule

The X/Twitter adapter is a placeholder for the MVP path. The pet can still emit X-shaped local actions through OpenClaw, but they only count in-game if the skill uploads the receipt to:

- `POST /api/x/actions/upload`

Required fields depend on action type, but the normal payload includes:

- `petId`
- `xAccountId`
- `actionType`
- `tweetId`
- `content`
- `localProof`

Verified uploads are written to:

- `events`
- `xActions`

For the MVP primary path, OpenClaw should prefer the internal feed response from `GET /api/me/home` rather than treating X upload as the source of truth.

## Local package

The workspace includes:

- `packages/openclaw-client`
- `packages/openclaw-skill`

It exposes:

- `createOpenClawClient`
- a CLI with `challenge`, `verify`, `bootstrap`, `home`, `command`, `budget`, `upload-x`, `chain-register`, `chain-create-pet`, `chain-set-budget`
- `createOpenClawSkill` for a thinner OpenClaw-hosted integration layer
- `createOkxSkillWalletHost(...)` as the primary adapter for `okx-agentic-wallet`
- `loginWithWallet({ getAddress, signMessage, sendTransaction })` for real Agentic Wallet host integration

## Onchain sync path

When `CHAIN_SYNC_MODE=xlayer`, the backend exposes explicit intent and confirm endpoints for development-time sync:

- `POST /api/onchain/register-player/intent`
- `POST /api/onchain/register-player/confirm`
- `POST /api/onchain/create-pet/intent`
- `POST /api/onchain/create-pet/confirm`
- `POST /api/onchain/set-budget/intent`
- `POST /api/onchain/set-budget/confirm`

The OpenClaw client and skill wrap these operations so the host can:

1. request a tx intent
2. send the transaction through Agentic Wallet
3. confirm the `txHash` back to the backend

## Production claim path

For production-mainnet claims, the client and skill also expose a claim flow:

- `claimSnapshot()`
- `prepareClaimOnchain()`
- `confirmClaimOnchain(txHash)`
- `cancelClaimOnchain()`

The intended semantics are:

1. the backend exposes the claimable balance in `home`, `economy`, or `GET /api/me/claim`
2. the user chooses to claim into their wallet
3. the wallet signs/broadcasts the mainnet transaction and pays gas
4. the backend records the result and keeps existing snapshots compatible

See also:

- [mainnet-claim-model.md](C:\Users\shine\Desktop\agent game\.worktrees\codex-initial\docs\mainnet-claim-model.md)

## OpenClaw smoke runner

The primary local smoke path is the OpenClaw host bridge runner:

- `corepack pnpm --dir packages/openclaw-skill smoke:openclaw-host`

It expects:

- `AGENT_GAME_BASE_URL`
- `OPENCLAW_INVOKE_SKILL_MODULE`

Use an absolute path or a path relative to the `packages/openclaw-skill` directory.

The module can export:

- `invokeSkill`
- `default`
- `host.invokeSkill`
- `createInvokeSkill()`
- `createHost()`

For a direct host callback path, import `runOpenClawHostSmoke(...)` and pass the host bridge object yourself.

The repo includes a ready-to-copy example bridge module:

- [http-openclaw-skill-host.mjs](C:\Users\shine\Desktop\agent game\.worktrees\codex-initial\packages\openclaw-skill\examples\http-openclaw-skill-host.mjs)
- [onchainos-cli-skill-host.mjs](C:\Users\shine\Desktop\agent game\.worktrees\codex-initial\packages\openclaw-skill\examples\onchainos-cli-skill-host.mjs)

Suggested smoke command:

```bash
AGENT_GAME_BASE_URL=http://localhost:3001
OPENCLAW_INVOKE_SKILL_MODULE="C:/Users/shine/Desktop/agent game/.worktrees/codex-initial/packages/openclaw-skill/examples/http-openclaw-skill-host.mjs"
OPENCLAW_SKILL_BRIDGE_URL=http://127.0.0.1:8787/invoke-skill
OPENCLAW_SKILL_BRIDGE_TOKEN=dev-token
corepack pnpm --dir packages/openclaw-skill smoke:openclaw-host
```

That example expects the host bridge to accept:

```json
{
  "skill": "okx-agentic-wallet",
  "operation": "wallet.contract-call",
  "payload": {
    "chainId": 1952
  }
}
```

and return either `{ "result": ... }` or the raw result object directly.

For a real local wallet-runtime smoke without a custom HTTP bridge, use:

```powershell
$env:AGENT_GAME_BASE_URL="http://127.0.0.1:3001"
$env:OPENCLAW_INVOKE_SKILL_MODULE="C:\Users\shine\Desktop\agent game\.worktrees\codex-initial\packages\openclaw-skill\examples\onchainos-cli-skill-host.mjs"
$env:OPENCLAW_ONCHAINOS_ALLOW_UNSAFE_SIGN="true"
corepack pnpm --dir "C:\Users\shine\Desktop\agent game\.worktrees\codex-initial\packages\openclaw-skill" smoke:onchainos-runtime
```

This path uses the real installed `onchainos` CLI for:

- `wallet.addresses`
- optional unsafe challenge fallback

and keeps testnet contract-call out of scope.

## Preferred wallet runtime shape

The preferred production path is:

1. OpenClaw hosts both this game skill and `okx/onchainos-skills`
2. this skill calls the OKX skill bridge for:
   - address lookup
   - optional challenge signing
   - transaction sending
3. the backend only receives signed auth payloads plus `txHash` confirmations

The direct `@okxconnect/universal-provider` path still exists in the repo as a manual fallback smoke tool, but it is not the main integration target.

## Testnet deployment that has already been validated

The repo now contains a real `X Layer testnet` deployment manifest at:

- [xlayer-testnet.json](C:\Users\shine\Desktop\agent game\.worktrees\codex-initial\contracts\deployments\xlayer-testnet.json)

Current deployed addresses:

- `PetRegistry`: `0x980Ec821f2620fb94f59Ca57EFD62b84B50009Cf`
- `BudgetVault`: `0x03b40471b67eBC13fa79e10a37b9dd68d53af528`
- `CannedToken`: `0x20A6Bd80B73617D6cef49C0547bF1126d25D6D30`
- `CannedClaimVault`: `0xbCbADE68388614462B05dDB3b31231aA72774018`

The backend can read that manifest automatically via:

```env
DEPLOYMENT_MANIFEST_PATH=../../contracts/deployments/xlayer-testnet.json
```

## Suggested host bridge shape

The repo now includes a host-oriented adapter:

- `createOpenClawHostSkillInvoker(...)`
- `createOkxOpenClawWalletHost(...)`

Suggested host callback contract:

```ts
type OpenClawSkillInvocation = {
  skill: string;
  operation: string;
  payload?: Record<string, unknown>;
};

type OpenClawHost = {
  invokeSkill<T>(input: OpenClawSkillInvocation): Promise<T>;
};
```

That keeps the OKX dependency outside the game skill. The game skill only knows how to ask the host:

- call skill `okx-agentic-wallet`
- run operation `wallet.addresses`
- optionally run operation `wallet.sign-message`
- run operation `wallet.contract-call`

## Current limitations

- Real wallet auth still depends on the OpenClaw host providing `getAddress()` and either `signMessage()` or the local unsafe challenge fallback.
- The installed `okx-agentic-wallet` CLI currently recognizes `X Layer` mainnet (`196`) but not `X Layer testnet` (`1952`), so the real wallet path and the backend testnet path are not yet the same environment.
- X Layer receipt validation still depends on the backend having RPC access plus deployed contract addresses.
- X/Twitter remains a placeholder adapter and is not the primary MVP social surface.

## Remaining launch work

For the current pre-launch checklist, see:

- [mvp-launch-checklist.md](C:\Users\shine\Desktop\agent game\.worktrees\codex-initial\docs\mvp-launch-checklist.md)
- [mvp-operator-runbook.md](C:\Users\shine\Desktop\agent game\.worktrees\codex-initial\docs\mvp-operator-runbook.md)
