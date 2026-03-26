# ── Agent Pet Production Startup ─────────────────────────────────────────────
# Usage: .\scripts\start-production.ps1
#
# Starts server + web in production mode with correct env vars.
# Edit the variables below before first run.

param(
    [string]$ServerPort    = "3001",
    [string]$WebPort       = "4000",
    [string]$ApiPublicUrl  = "http://localhost:3001",   # change to your public API domain
    [string]$StatePath     = ".\.data\prod-state.json",
    [switch]$WithAgents    = $true
)

$root       = Split-Path $PSScriptRoot -Parent
$serverDir  = Join-Path $root "apps\server"
$webDir     = Join-Path $root "apps\web"

# ── Build ─────────────────────────────────────────────────────────────────────
Write-Host "Building server..." -ForegroundColor Cyan
Push-Location $serverDir
corepack pnpm build
if ($LASTEXITCODE -ne 0) { Write-Error "Server build failed"; exit 1 }
Pop-Location

Write-Host "Building web..." -ForegroundColor Cyan
Push-Location $webDir
$env:NEXT_PUBLIC_API_BASE_URL = $ApiPublicUrl
corepack pnpm build
if ($LASTEXITCODE -ne 0) { Write-Error "Web build failed"; exit 1 }
Pop-Location

# ── Start Server ──────────────────────────────────────────────────────────────
Write-Host "Starting server on :$ServerPort ..." -ForegroundColor Cyan
$serverJob = Start-Job -ScriptBlock {
    param($dir, $port, $state, $agents)
    Set-Location $dir
    $env:NODE_ENV                    = "production"
    $env:PORT                        = $port
    $env:AUTH_MODE                   = "eip191"          # CHANGE: unsafe only for local dev
    $env:STATE_PATH                  = $state
    $env:REQUEST_LOGGING             = "true"
    $env:CHAIN_SYNC_MODE             = "disabled"
    $env:X_INTEGRATION_MODE          = "disabled"
    $env:SYSTEM_AGENTS_ENABLED       = if ($agents) { "true" } else { "false" }
    $env:SYSTEM_AGENT_TICK_INTERVAL_MS = "30000"
    node dist\index.js
} -ArgumentList $serverDir, $ServerPort, (Resolve-Path $StatePath -ErrorAction SilentlyContinue ?? $StatePath), $WithAgents

# ── Start Web ─────────────────────────────────────────────────────────────────
Write-Host "Starting web on :$WebPort ..." -ForegroundColor Cyan
$webJob = Start-Job -ScriptBlock {
    param($dir, $port, $apiUrl)
    Set-Location $dir
    $env:PORT                      = $port
    $env:NEXT_PUBLIC_API_BASE_URL  = $apiUrl
    node .next\standalone\server.js
} -ArgumentList $webDir, $WebPort, $ApiPublicUrl

Write-Host ""
Write-Host "==================================================" -ForegroundColor Green
Write-Host "  Server : http://localhost:$ServerPort/health"    -ForegroundColor Green
Write-Host "  Web    : http://localhost:$WebPort"              -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Green
Write-Host "Press Ctrl+C to stop both services."

# Wait and stream logs
try {
    while ($true) {
        Receive-Job $serverJob | ForEach-Object { Write-Host "[server] $_" }
        Receive-Job $webJob    | ForEach-Object { Write-Host "[web]    $_" }
        Start-Sleep -Milliseconds 500
    }
} finally {
    Stop-Job $serverJob, $webJob
    Remove-Job $serverJob, $webJob
}
