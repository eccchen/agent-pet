# OpenClaw Skill

Thin wrapper around `@agent-game/openclaw-client` for OpenClaw-hosted agent flows.

## Exposed surface

- `login`
- `loginWithWallet`
- `bootstrap`
- `home`
- `claimSnapshot`
- `command`
- `budget`
- `uploadX`
- `prepareClaimOnchain`
- `confirmClaimOnchain`
- `cancelClaimOnchain`
- `prepareRegisterPlayerOnchain`
- `confirmRegisterPlayerOnchain`
- `prepareCreatePetOnchain`
- `confirmCreatePetOnchain`
- `prepareSetPetBudgetOnchain`
- `confirmSetPetBudgetOnchain`
- `registerPlayerOnchainWithWallet`
- `createPetOnchainWithWallet`
- `setPetBudgetOnchainWithWallet`
- `getSession`
- `execute`

`loginWithWallet` is the intended Agentic Wallet host path:

- the host provides `getAddress()`
- the host provides `signMessage(message)`
- the host provides `sendTransaction(tx)`
- the skill converts that into the backend `challenge -> verify -> session` flow

The production-mainnet claim model follows the same shape:

- `claimSnapshot()` fetches the user-facing claimable balance
- `prepareClaimOnchain()` returns the wallet-ready claim intent
- `confirmClaimOnchain(txHash)` records the completed mainnet claim
- `cancelClaimOnchain()` clears a stale or abandoned claim state
- the user wallet still signs and pays gas for the actual claim transaction

## Preferred OKX path: skill bridge

The primary runtime target is:

1. user installs this skill in OpenClaw
2. user also installs `okx/onchainos-skills`
3. OpenClaw or a thin host bridge calls the OKX skill for:
   - address lookup
   - optional message signing
   - contract call / transaction sending
4. the returned host is passed into `loginWithWallet(...)`

This package exposes `createOkxSkillWalletHost(...)` for that pattern. It keeps the game-side wallet seam fixed at:

- `getAddress()`
- `signMessage(message)`
- `sendTransaction(tx)`

For a more OpenClaw-shaped integration, this package also exposes `createOkxOpenClawWalletHost(...)`, which expects a host callback of the form:

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

Example:

```ts
import {
  createOkxOpenClawWalletHost,
  createOpenClawSkill,
} from "@agent-game/openclaw-skill";

const wallet = createOkxOpenClawWalletHost({
  host: {
    invokeSkill: (input) => host.invokeSkill(input),
  },
});

const skill = createOpenClawSkill({ baseUrl: "http://localhost:3001" });

await skill.loginWithWallet(wallet);
await skill.bootstrap();
await skill.registerPlayerOnchainWithWallet(wallet);
```

`createOkxSkillWalletHost(...)` now defaults to the installed `okx-agentic-wallet` skill surface:

- skill id: `okx-agentic-wallet`
- address lookup: `wallet.addresses`
- transaction sending: `wallet.contract-call`
- generic message signing: optional, not assumed by default

For local MVP runs, if generic message signing is unavailable, the bridge can fall back to the unsafe challenge format used by `AUTH_MODE=unsafe`.
If the actual OpenClaw host uses different action names, pass a custom `actions` map.

The preferred on-chain path is:

1. skill requests a tx intent from the backend
2. wallet host sends the transaction
3. skill confirms the resulting `txHash` back to the backend

The same flow applies to claim: the backend prepares the claim intent, the wallet broadcasts it, and the backend records the result.

See also:

- [docs/mainnet-claim-model.md](C:\Users\shine\Desktop\agent game\.worktrees\codex-initial\docs\mainnet-claim-model.md)

## Manual fallback

The repo still includes `createOkxUniversalWalletHost(...)` plus a manual smoke script for direct SDK testing. Treat that as a fallback or local debugging tool, not the primary integration path.

## Validation

```bash
corepack pnpm --dir packages/openclaw-skill test
corepack pnpm --dir packages/openclaw-skill build
```

## OpenClaw Host Smoke

Primary host-bridge smoke:

```bash
AGENT_GAME_BASE_URL=http://localhost:3001
OPENCLAW_INVOKE_SKILL_MODULE="C:/absolute/path/to/openclaw-host.mjs"
AGENT_GAME_PET_ID="starter-pet"
AGENT_GAME_SPENDABLE_BUDGET=250
AGENT_GAME_SINGLE_TX_LIMIT=75
AGENT_GAME_DAILY_LIMIT=300
corepack pnpm --dir packages/openclaw-skill smoke:openclaw-host
```

The referenced module can export any of the following:

- `invokeSkill`
- `default`
- `host.invokeSkill`
- `createInvokeSkill()`
- `createHost()`

For a host callback, import `runOpenClawHostSmoke(...)` and pass the host bridge object directly.

The repo also includes a copy-pasteable example host module:

- [examples/http-openclaw-skill-host.mjs](C:\Users\shine\Desktop\agent game\.worktrees\codex-initial\packages\openclaw-skill\examples\http-openclaw-skill-host.mjs)

Example:

```bash
AGENT_GAME_BASE_URL=http://localhost:3001
OPENCLAW_INVOKE_SKILL_MODULE="C:/Users/shine/Desktop/agent game/.worktrees/codex-initial/packages/openclaw-skill/examples/http-openclaw-skill-host.mjs"
OPENCLAW_SKILL_BRIDGE_URL=http://127.0.0.1:8787/invoke-skill
OPENCLAW_SKILL_BRIDGE_TOKEN=dev-token
corepack pnpm --dir packages/openclaw-skill smoke:openclaw-host
```

The example module assumes your local OpenClaw host can expose a tiny HTTP bridge that accepts:

```json
{
  "skill": "okx-agentic-wallet",
  "operation": "wallet.addresses",
  "payload": {}
}
```

and returns either:

```json
{
  "result": "0x..."
}
```

or a regular JSON object shaped like the OKX skill result.

For local smoke testing, this package also includes a minimal mock bridge server:

- [examples/http-openclaw-skill-bridge.mjs](C:\Users\shine\Desktop\agent game\.worktrees\codex-initial\packages\openclaw-skill\examples\http-openclaw-skill-bridge.mjs)

Run it with env-based mock values:

```bash
OPENCLAW_SKILL_BRIDGE_PORT=8787
OPENCLAW_SKILL_BRIDGE_TOKEN=dev-token
OPENCLAW_SKILL_MOCK_WALLET_ADDRESS=0x1234567890abcdef1234567890abcdef12345678
OPENCLAW_SKILL_MOCK_SIGNATURE_MODE=unsafe-challenge
OPENCLAW_SKILL_MOCK_SIGNATURE=0xsigned-message
OPENCLAW_SKILL_MOCK_TX_HASH_MODE=random
OPENCLAW_SKILL_MOCK_TX_HASH=0xdeadbeef
node packages/openclaw-skill/examples/http-openclaw-skill-bridge.mjs
```

The server accepts `POST /invoke-skill` with the same payload shape used by the host bridge example and returns mock OKX wallet responses for:

- `wallet.addresses`
- `wallet.sign-message`
- `wallet.contract-call`

## Manual Provider Smoke

For a manual OKX Agentic Wallet / Universal Provider fallback smoke run:

```bash
AGENT_GAME_BASE_URL=http://localhost:3001
OKX_DAPP_NAME="Agent Game"
OKX_DAPP_ICON="https://your-domain/icon.png"
AGENT_GAME_PET_ID="starter-pet"
AGENT_GAME_SPENDABLE_BUDGET=250
AGENT_GAME_SINGLE_TX_LIMIT=75
AGENT_GAME_DAILY_LIMIT=300
corepack pnpm --dir packages/openclaw-skill smoke:okx-real
```

Optional:

- `OKX_CONNECT_REDIRECT`
