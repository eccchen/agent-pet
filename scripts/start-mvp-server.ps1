$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$serverDir = Join-Path $root "apps\server"
$manifestPath = Join-Path $root "contracts\deployments\xlayer-testnet.json"
$statePath = Join-Path $root ".data\server-state.json"

$env:NODE_ENV = if ($env:NODE_ENV) { $env:NODE_ENV } else { "development" }
$env:PORT = if ($env:PORT) { $env:PORT } else { "3001" }
$env:SERVICE_NAME = if ($env:SERVICE_NAME) { $env:SERVICE_NAME } else { "agent-game-server" }
$env:STATE_PATH = if ($env:STATE_PATH) { $env:STATE_PATH } else { $statePath }
$env:REQUEST_LOGGING = if ($env:REQUEST_LOGGING) { $env:REQUEST_LOGGING } else { "true" }
$env:AUTH_MODE = if ($env:AUTH_MODE) { $env:AUTH_MODE } else { "unsafe" }
$env:CHAIN_SYNC_MODE = if ($env:CHAIN_SYNC_MODE) { $env:CHAIN_SYNC_MODE } else { "xlayer" }
$env:X_INTEGRATION_MODE = if ($env:X_INTEGRATION_MODE) { $env:X_INTEGRATION_MODE } else { "disabled" }
$env:SYSTEM_AGENTS_ENABLED = if ($env:SYSTEM_AGENTS_ENABLED) { $env:SYSTEM_AGENTS_ENABLED } else { "true" }
$env:SYSTEM_AGENT_TICK_INTERVAL_MS = if ($env:SYSTEM_AGENT_TICK_INTERVAL_MS) { $env:SYSTEM_AGENT_TICK_INTERVAL_MS } else { "30000" }
$env:DEPLOYMENT_MANIFEST_PATH = if ($env:DEPLOYMENT_MANIFEST_PATH) { $env:DEPLOYMENT_MANIFEST_PATH } else { $manifestPath }
$claimSignerConfigured = if ($env:CLAIM_SIGNER_PRIVATE_KEY) { "configured" } else { "missing" }

Write-Host "Starting MVP server with:"
Write-Host "  AUTH_MODE=$env:AUTH_MODE"
Write-Host "  CHAIN_SYNC_MODE=$env:CHAIN_SYNC_MODE"
Write-Host "  X_INTEGRATION_MODE=$env:X_INTEGRATION_MODE"
Write-Host "  SYSTEM_AGENTS_ENABLED=$env:SYSTEM_AGENTS_ENABLED"
Write-Host "  SYSTEM_AGENT_TICK_INTERVAL_MS=$env:SYSTEM_AGENT_TICK_INTERVAL_MS"
Write-Host "  DEPLOYMENT_MANIFEST_PATH=$env:DEPLOYMENT_MANIFEST_PATH"
Write-Host "  STATE_PATH=$env:STATE_PATH"
Write-Host "  CLAIM_SIGNER_PRIVATE_KEY=$claimSignerConfigured"

corepack pnpm --dir $serverDir build
node "`"$(Join-Path $serverDir "dist\index.js")`""
