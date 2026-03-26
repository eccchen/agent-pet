$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$serverDir = Join-Path $root "apps\server"
$skillDir = Join-Path $root "packages\openclaw-skill"
$bridgeScript = Join-Path $skillDir "examples\http-openclaw-skill-bridge.mjs"
$hostModule = Join-Path $skillDir "examples\http-openclaw-skill-host.mjs"
$manifestPath = Join-Path $root "contracts\deployments\xlayer-testnet.json"
$statePath = Join-Path $root ".data\smoke-server-state.json"
$logsDir = Join-Path $root ".data\logs"
$serverLog = Join-Path $logsDir "mvp-server.log"
$serverErrLog = Join-Path $logsDir "mvp-server.err.log"
$bridgeLog = Join-Path $logsDir "mvp-bridge.log"
$bridgeErrLog = Join-Path $logsDir "mvp-bridge.err.log"
$serverBootstrapScript = Join-Path $logsDir "mvp-server.bootstrap.ps1"
$bridgeBootstrapScript = Join-Path $logsDir "mvp-bridge.bootstrap.ps1"
$hostSmokeScript = Join-Path $logsDir "openclaw-host-smoke.runtime.mjs"

New-Item -ItemType Directory -Force -Path $logsDir | Out-Null

function Get-FreeTcpPort([int]$preferredPort) {
  $listener = $null
  try {
    $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, 0)
    $listener.Start()
    return ([System.Net.IPEndPoint]$listener.LocalEndpoint).Port
  } finally {
    if ($listener) {
      $listener.Stop()
    }
  }
}

function Start-PowerShellFile([string]$scriptPath) {
  $psi = New-Object System.Diagnostics.ProcessStartInfo
  $psi.FileName = (Join-Path $PSHOME "powershell.exe")
  $psi.Arguments = "-NoProfile -ExecutionPolicy Bypass -File `"$scriptPath`""
  $psi.UseShellExecute = $false
  $psi.CreateNoWindow = $true

  $process = [System.Diagnostics.Process]::new()
  $process.StartInfo = $psi
  $null = $process.Start()
  return $process
}

function Stop-ProcessTree([System.Diagnostics.Process]$process) {
  if (-not $process) {
    return
  }

  try {
    $children = Get-CimInstance Win32_Process -Filter "ParentProcessId = $($process.Id)" -ErrorAction SilentlyContinue
    foreach ($child in $children) {
      try {
        Stop-Process -Id $child.ProcessId -Force -ErrorAction SilentlyContinue
      } catch {
      }
    }
  } catch {
  }

  try {
    if (-not $process.HasExited) {
      Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
    }
  } catch {
  }
}

function Assert-LastExitCode([string]$context) {
  if ($LASTEXITCODE -ne 0) {
    throw "$context failed with exit code $LASTEXITCODE."
  }
}

function Test-AgentGameHealth([string]$url) {
  try {
    $health = Invoke-RestMethod -Uri $url -Method Get -TimeoutSec 2
    return (($health.status -eq "ok") -or ($health.ok -eq $true)) -and ($health.service -eq "agent-game-server")
  } catch {
    return $false
  }
}

$serverPort = Get-FreeTcpPort 3001

$env:NODE_ENV = "development"
$env:PORT = [string]$serverPort
$env:SERVICE_NAME = "agent-game-server"
$env:STATE_PATH = $statePath
$env:REQUEST_LOGGING = "true"
$env:AUTH_MODE = "unsafe"
$env:CHAIN_SYNC_MODE = "xlayer"
$env:X_INTEGRATION_MODE = "disabled"
$env:SYSTEM_AGENTS_ENABLED = "true"
$env:SYSTEM_AGENT_TICK_INTERVAL_MS = "30000"
$env:DEPLOYMENT_MANIFEST_PATH = $manifestPath

corepack pnpm --dir $serverDir build
Assert-LastExitCode "Server build"
corepack pnpm --dir $skillDir build
Assert-LastExitCode "OpenClaw skill build"

  $serverEntry = Join-Path $serverDir "dist\index.js"
  $serverLaunch = @"
Set-Location -LiteralPath '$serverDir'
`$env:NODE_ENV = '$env:NODE_ENV'
`$env:PORT = '$env:PORT'
`$env:SERVICE_NAME = '$env:SERVICE_NAME'
`$env:STATE_PATH = '$env:STATE_PATH'
`$env:REQUEST_LOGGING = '$env:REQUEST_LOGGING'
`$env:AUTH_MODE = '$env:AUTH_MODE'
`$env:CHAIN_SYNC_MODE = '$env:CHAIN_SYNC_MODE'
`$env:X_INTEGRATION_MODE = '$env:X_INTEGRATION_MODE'
`$env:SYSTEM_AGENTS_ENABLED = '$env:SYSTEM_AGENTS_ENABLED'
`$env:SYSTEM_AGENT_TICK_INTERVAL_MS = '$env:SYSTEM_AGENT_TICK_INTERVAL_MS'
`$env:DEPLOYMENT_MANIFEST_PATH = '$env:DEPLOYMENT_MANIFEST_PATH'
node '$serverEntry' 1>> '$serverLog' 2>> '$serverErrLog'
"@
  Set-Content -Path $serverBootstrapScript -Value $serverLaunch -Encoding UTF8

  $serverProcess = Start-PowerShellFile $serverBootstrapScript

try {
  $healthy = $false
  for ($i = 0; $i -lt 40; $i++) {
    Start-Sleep -Milliseconds 500
    if (Test-AgentGameHealth "http://127.0.0.1:$serverPort/health") {
      $healthy = $true
      break
    }
  }

  if (-not $healthy) {
    throw "Server health check failed. See $serverLog"
  }

  $env:OPENCLAW_SKILL_BRIDGE_PORT = "8787"
  $env:OPENCLAW_SKILL_BRIDGE_TOKEN = "dev-token"
  $env:OPENCLAW_SKILL_MOCK_WALLET_ADDRESS = "0x881c6722397bf536edc1b766b10386aab62e4fa9"
  $env:OPENCLAW_SKILL_MOCK_SIGNATURE_MODE = "unsafe-challenge"
  $env:OPENCLAW_SKILL_MOCK_TX_HASH_MODE = "random"

  $bridgeLaunch = @"
Set-Location -LiteralPath '$skillDir'
`$env:OPENCLAW_SKILL_BRIDGE_PORT = '$env:OPENCLAW_SKILL_BRIDGE_PORT'
`$env:OPENCLAW_SKILL_BRIDGE_TOKEN = '$env:OPENCLAW_SKILL_BRIDGE_TOKEN'
`$env:OPENCLAW_SKILL_MOCK_WALLET_ADDRESS = '$env:OPENCLAW_SKILL_MOCK_WALLET_ADDRESS'
`$env:OPENCLAW_SKILL_MOCK_SIGNATURE_MODE = '$env:OPENCLAW_SKILL_MOCK_SIGNATURE_MODE'
`$env:OPENCLAW_SKILL_MOCK_TX_HASH_MODE = '$env:OPENCLAW_SKILL_MOCK_TX_HASH_MODE'
node '$bridgeScript' 1>> '$bridgeLog' 2>> '$bridgeErrLog'
"@
  Set-Content -Path $bridgeBootstrapScript -Value $bridgeLaunch -Encoding UTF8

  $bridgeProcess = Start-PowerShellFile $bridgeBootstrapScript

  try {
    Start-Sleep -Seconds 1

    $env:AGENT_GAME_BASE_URL = "http://127.0.0.1:$serverPort"
    $env:OPENCLAW_INVOKE_SKILL_MODULE = $hostModule
    $env:OPENCLAW_SKILL_BRIDGE_URL = "http://127.0.0.1:8787/invoke-skill"
    $env:OPENCLAW_SKILL_BRIDGE_TOKEN = "dev-token"
    $env:AGENT_GAME_PET_ID = "starter-pet"
    $env:AGENT_GAME_SPENDABLE_BUDGET = "250"
    $env:AGENT_GAME_SINGLE_TX_LIMIT = "75"
    $env:AGENT_GAME_DAILY_LIMIT = "300"
    $env:AGENT_GAME_SKILL_DIST = (Join-Path $skillDir "dist\index.js")

    @"
import { pathToFileURL } from "node:url";

const skillDist = process.env.AGENT_GAME_SKILL_DIST;
if (!skillDist) {
  throw new Error("Missing AGENT_GAME_SKILL_DIST.");
}

const skill = await import(pathToFileURL(skillDist).href);
const config = skill.loadOpenClawHostSmokeConfig();
if (!config.invokeSkillModule) {
  throw new Error("Missing OPENCLAW_INVOKE_SKILL_MODULE.");
}

const host = await skill.loadOpenClawHostInvokerFromModule(config.invokeSkillModule);
const result = await skill.runOpenClawHostSmoke({
  baseUrl: config.baseUrl,
  host,
  petId: config.petId,
  spendableBudget: config.spendableBudget,
  singleTxLimit: config.singleTxLimit,
  dailyLimit: config.dailyLimit,
});

console.log(JSON.stringify({
  walletAddress: result.session.walletAddress,
  budget: result.home.player.budget,
  profitPool: result.home.player.profitPool,
  petChainSync: result.syncedBudget.chainSync,
}, null, 2));
"@ | Set-Content -Path $hostSmokeScript -Encoding UTF8

    node $hostSmokeScript
    Assert-LastExitCode "OpenClaw host smoke"
    Write-Host ""
    Write-Host "Local MVP smoke succeeded."
    Write-Host "Server base URL: $env:AGENT_GAME_BASE_URL"
    Write-Host "Server log: $serverLog"
    Write-Host "Server error log: $serverErrLog"
    Write-Host "Bridge log: $bridgeLog"
    Write-Host "Bridge error log: $bridgeErrLog"
  } finally {
    if ($bridgeProcess -and -not $bridgeProcess.HasExited) {
      Stop-Process -Id $bridgeProcess.Id -Force
    }
  }
} finally {
  Stop-ProcessTree $serverProcess
}
