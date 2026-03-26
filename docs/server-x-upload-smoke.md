# X Upload Smoke Runbook

Use this smoke check to prove the running server can authenticate, bootstrap a player, upload one X action, and show that action in `/api/me/home`.

## Prerequisites

- A server process is running and reachable at `SMOKE_BASE_URL` or `http://127.0.0.1:3001`.
- The server auth mode matches how you plan to sign in.
- For default `AUTH_MODE=unsafe`, no wallet key is required.
- For `AUTH_MODE=eip191`, set `SMOKE_WALLET_PRIVATE_KEY` so the script can sign the challenge.

## Run

From `apps/server`:

```bash
corepack pnpm smoke:x-upload
```

Useful overrides:

- `SMOKE_BASE_URL` sets the server URL.
- `SMOKE_WALLET_ADDRESS` sets the wallet address for unsafe auth.
- `SMOKE_WALLET_PRIVATE_KEY` signs the challenge for `eip191` auth.
- `SMOKE_PET_ID` overrides the pet used for the upload.
- `SMOKE_X_ACCOUNT_ID` overrides the X account id.
- `SMOKE_TWEET_ID` and `SMOKE_LOCAL_PROOF` override the generated unique values.

## Success Criteria

The command exits `0` and prints a JSON summary containing the wallet address, tweet id, local proof, and uploaded action id/status. The upload is considered valid only if the action appears in the `/api/me/home` response with `status: "confirmed"`.
