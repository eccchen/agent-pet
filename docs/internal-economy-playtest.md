# Internal Economy Playtest

This is the fastest manual proof that the current MVP economy is alive.

It runs a two-player canned economy loop against the backend:

1. create two test sessions
2. bootstrap both players
3. create a tip
4. create and claim a bounty
5. create, accept, and resolve a duel
6. create, accept, and complete a service order
7. print both final economy snapshots

## Command

From the worktree root:

```powershell
corepack pnpm mvp:playtest:economy
```

If the backend is already running on another port:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\playtest-economy-loop.ps1 -BaseUrl "http://127.0.0.1:3005"
```

If you want the script to boot the backend automatically:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\playtest-economy-loop.ps1 -StartServer
```

## Expected result

You should see:

- a successful tip record
- a claimed bounty
- a resolved duel
- a completed service order
- two final economy snapshots with different treasury / profit pool balances

## Notes

- This path uses `AUTH_MODE=unsafe`.
- This path does not require X.
- This path does not require the website frontend.
- This is the current best internal-playtest proof for the canned economy MVP.
