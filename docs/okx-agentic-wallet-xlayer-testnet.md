# OKX Agentic Wallet + X Layer testnet

This note captures the intended wallet integration shape for the agent game on `2026-03-24`.

## Current reality

As of `2026-03-25`, the installed `okx-agentic-wallet` CLI command surface recognizes:

- `X Layer` mainnet via chain id `196`

and does **not** recognize:

- `X Layer testnet` via chain id `1952`

This was verified locally with:

- `onchainos wallet chains`
- `onchainos wallet addresses --chain 1952`
- `onchainos wallet balance --chain 1952`

where `1952` returned `unknown chain: 1952`.

So the practical split is:

- backend / contracts can continue to use `X Layer testnet`
- real `okx-agentic-wallet` CLI integration currently only covers `X Layer` mainnet

## Primary path

The main runtime path is:

1. user installs this game skill in OpenClaw
2. user also installs `okx/onchainos-skills`
3. OpenClaw exposes a bridge so this game skill can ask the OKX skill to:
   - return the active EVM address
   - sign a challenge message
   - send a prepared transaction
4. the backend only builds tx intents and confirms `txHash` / receipt on `X Layer testnet`

The repo models that path with:

- [createOkxSkillWalletHost](C:\Users\shine\Desktop\agent game\.worktrees\codex-initial\packages\openclaw-skill\src\okx-skill-bridge.ts)
- [createOkxOpenClawWalletHost](C:\Users\shine\Desktop\agent game\.worktrees\codex-initial\packages\openclaw-skill\src\openclaw-host-bridge.ts)
- [createOpenClawSkill](C:\Users\shine\Desktop\agent game\.worktrees\codex-initial\packages\openclaw-skill\src\skill.ts)

The game-side wallet seam stays minimal:

- `getAddress()`
- `signMessage(message)`
- `sendTransaction(tx)`

The more host-specific seam is:

- `invokeSkill({ skill, operation, payload })`

`createOkxOpenClawWalletHost(...)` converts that host callback into the wallet seam above.

## Why this is the preferred model

- matches the user-owned Agentic Wallet flow inside OpenClaw
- keeps wallet state with the OKX skill instead of duplicating another wallet SDK in the game skill
- lets the backend remain non-custodial
- fits the repo's `intent -> wallet send -> confirm` design

## Bridge contract

`createOkxSkillWalletHost(...)` expects a generic invoker:

```ts
type SkillInvoker = {
  invoke<T>(skill: string, action: string, payload?: Record<string, unknown>): Promise<T>;
};
```

Default target:

- `skill`: `okx-agentic-wallet`

Default logical actions used by the repo bridge:

- `wallet.addresses`
- `wallet.contract-call`
- generic message signing is optional and not assumed

If the real host uses different action names, pass a custom `actions` map when constructing the bridge.

## X Layer testnet defaults

The bridge and fallback helper default to:

```ts
{
  namespaceChainId: "eip155:1952",
  chainIdDecimal: 1952,
  chainIdHex: "0x7A0",
  chainName: "X Layer testnet",
  rpcUrl: "https://xlayertestrpc.okx.com/terigon",
  blockExplorerUrls: ["https://www.okx.com/web3/explorer/xlayer-test"],
  nativeCurrency: {
    name: "OKB",
    symbol: "OKB",
    decimals: 18,
  },
}
```

The repo also exports a mainnet constant for the currently supported real wallet path:

```ts
{
  namespaceChainId: "eip155:196",
  chainIdDecimal: 196,
  chainIdHex: "0xC4",
  chainName: "X Layer",
  rpcUrl: "https://rpc.xlayer.tech",
}
```

## End-to-end flow

1. game skill asks backend for challenge
2. game skill asks OKX skill bridge to sign challenge
3. backend verifies and issues session
4. game skill asks backend for an onchain intent
5. game skill asks OKX skill bridge to send the transaction
6. backend confirms `txHash` against X Layer testnet receipt and updates chain sync state

## OpenClaw smoke runner

The primary smoke path is the OpenClaw host bridge runner:

- `corepack pnpm --dir packages/openclaw-skill smoke:openclaw-host`

It expects:

- `AGENT_GAME_BASE_URL`
- `OPENCLAW_INVOKE_SKILL_MODULE`

The module can export:

- `invokeSkill`
- `default`
- `host.invokeSkill`

For a direct host callback path, import `runOpenClawHostSmoke(...)` and pass the host bridge object yourself.

## Backend config for validation

```env
AUTH_MODE=eip191
CHAIN_SYNC_MODE=xlayer
DEPLOYMENT_MANIFEST_PATH=../../contracts/deployments/xlayer-testnet.json
```

For the current real `okx-agentic-wallet` MVP path, local development should prefer:

```env
AUTH_MODE=unsafe
```

unless you add a wallet-specific verify flow that does not rely on generic message signing.

If you need to pin values directly, the current validated deployment is:

- `XLAYER_RPC_URL=https://xlayertestrpc.okx.com/terigon`
- `PET_REGISTRY_ADDRESS=0x980Ec821f2620fb94f59Ca57EFD62b84B50009Cf`
- `BUDGET_VAULT_ADDRESS=0x03b40471b67eBC13fa79e10a37b9dd68d53af528`
- `CANNED_TOKEN_ADDRESS=0x20A6Bd80B73617D6cef49C0547bF1126d25D6D30`
- `CLAIM_VAULT_ADDRESS=0xbCbADE68388614462B05dDB3b31231aA72774018`

Those addresses are also stored in:

- [xlayer-testnet.json](C:\Users\shine\Desktop\agent game\.worktrees\codex-initial\contracts\deployments\xlayer-testnet.json)

## Manual fallback

The repo still includes a direct `@okxconnect/universal-provider` helper in:

- [okx-host.ts](C:\Users\shine\Desktop\agent game\.worktrees\codex-initial\packages\openclaw-skill\src\okx-host.ts)

and a manual smoke script in:

- [real-okx-host-smoke.ts](C:\Users\shine\Desktop\agent game\.worktrees\codex-initial\packages\openclaw-skill\scripts\real-okx-host-smoke.ts)

Treat those as local debugging tools or fallback integration aids. They are not the primary product path.

## Real testnet proof already in repo

The repo now includes a real testnet smoke script:

- [smoke-xlayer-real.js](C:\Users\shine\Desktop\agent game\.worktrees\codex-initial\apps\server\scripts\smoke-xlayer-real.js)

It has already been used to run a real `X Layer testnet` flow:

- fund a temporary wallet
- `registerPlayer`
- `createPet`
- `depositForPet`
- `setBudget`

The repo also now includes a real claim smoke script:

- [smoke-xlayer-claim.js](C:\Users\shine\Desktop\agent game\.worktrees\codex-initial\apps\server\scripts\smoke-xlayer-claim.js)

That flow has already been used to:

- prepare a real backend claim intent
- submit a wallet-paid `claim(...)` transaction
- confirm the resulting `txHash`
- verify the claimed `罐头` balance in `CannedToken`

So the remaining work for production-like validation is at the OpenClaw host / `okx/onchainos-skills` layer, not at the chain deployment layer.
