param(
  [string]$BaseUrl = "http://127.0.0.1:3001",
  [switch]$StartServer
)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$serverDir = Join-Path $root "apps\server"
$skillDir = Join-Path $root "packages\openclaw-skill"
$hostModule = Join-Path $skillDir "examples\onchainos-cli-skill-host.mjs"
$manifestPath = Join-Path $root "contracts\deployments\xlayer-testnet.json"
$statePath = Join-Path $root ".data\onchainos-runtime-state.json"
$logsDir = Join-Path $root ".data\logs"
$serverLog = Join-Path $logsDir "onchainos-runtime-server.log"
$serverErrLog = Join-Path $logsDir "onchainos-runtime-server.err.log"
$serverBootstrapScript = Join-Path $logsDir "onchainos-runtime-server.bootstrap.ps1"
$runtimeSmokeScript = Join-Path $logsDir "onchainos-runtime-smoke.mjs"

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

function Ensure-Server() {
  if (Test-AgentGameHealth "$BaseUrl/health") {
    return [PSCustomObject]@{
      Process = $null
      BaseUrl = $BaseUrl
    }
  }

  $resolvedBaseUrl = $BaseUrl
  $uri = [System.Uri]$BaseUrl
  $port = Get-FreeTcpPort $uri.Port
  if ($port -ne $uri.Port) {
    $resolvedBaseUrl = "$($uri.Scheme)://$($uri.Host):$port"
  }

  $env:NODE_ENV = "development"
  $env:PORT = [string]$port
  $env:SERVICE_NAME = "agent-game-server"
  $env:STATE_PATH = $statePath
  $env:REQUEST_LOGGING = "true"
  $env:AUTH_MODE = "unsafe"
  $env:CHAIN_SYNC_MODE = "xlayer"
  $env:X_INTEGRATION_MODE = "disabled"
  $env:SYSTEM_AGENTS_ENABLED = "true"
  $env:SYSTEM_AGENT_TICK_INTERVAL_MS = "30000"
  $env:DEPLOYMENT_MANIFEST_PATH = $manifestPath

  corepack pnpm --dir $serverDir build | Out-Host
  Assert-LastExitCode "Server build"

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

  $process = Start-PowerShellFile $serverBootstrapScript

  for ($i = 0; $i -lt 40; $i++) {
    Start-Sleep -Milliseconds 500
    if (Test-AgentGameHealth "$resolvedBaseUrl/health") {
      return [PSCustomObject]@{
        Process = $process
        BaseUrl = $resolvedBaseUrl
      }
    }
  }

  throw "Server failed to start. See $serverLog"
}

$serverProcess = $null

try {
  if ($StartServer) {
    $serverState = Ensure-Server
    $serverProcess = $serverState.Process
    $BaseUrl = $serverState.BaseUrl
  }

  $env:AGENT_GAME_BASE_URL = $BaseUrl
  $env:OPENCLAW_INVOKE_SKILL_MODULE = $hostModule
  $env:OPENCLAW_ONCHAINOS_ALLOW_UNSAFE_SIGN = "true"
  $env:OPENCLAW_RUNTIME_COMMAND = "earn"
  $env:AGENT_GAME_SKILL_DIST = (Join-Path $skillDir "dist\index.js")

  corepack pnpm --dir $skillDir build | Out-Host
  Assert-LastExitCode "OpenClaw skill build"

  @"
import { pathToFileURL } from "node:url";

const skillDist = process.env.AGENT_GAME_SKILL_DIST;
if (!skillDist) {
  throw new Error("Missing AGENT_GAME_SKILL_DIST.");
}

const {
  loadOpenClawHostInvokerFromModule,
  createOkxOpenClawWalletHost,
  createOpenClawSkill,
} = await import(pathToFileURL(skillDist).href);

const baseUrl = process.env.AGENT_GAME_BASE_URL ?? "http://127.0.0.1:3001";
const modulePath = process.env.OPENCLAW_INVOKE_SKILL_MODULE;
const command = process.env.OPENCLAW_RUNTIME_COMMAND ?? "earn";

if (!modulePath) {
  throw new Error("Missing OPENCLAW_INVOKE_SKILL_MODULE.");
}

const host = await loadOpenClawHostInvokerFromModule(modulePath);
const wallet = createOkxOpenClawWalletHost({ host });
const skill = createOpenClawSkill({ baseUrl });

const session = await skill.loginWithWallet(wallet);
const player = await skill.bootstrap();
const commandResult = await skill.command("starter-pet", command);
const home = await skill.home();

console.log(JSON.stringify({
  walletAddress: session.walletAddress,
  player: {
    walletAddress: player.walletAddress,
    treasuryBalance: player.treasuryBalance,
    profitPool: player.profitPool,
    claimableBalance: player.claimableBalance,
  },
  commandResult: {
    profitPool: commandResult.player.profitPool,
    lastEventType: commandResult.event.type,
  },
  home: {
    availableCommands: home.availableCommands,
    feedCount: home.feed.length,
    messageCount: home.messageCenter.length,
    xEnabled: home.xAdapter.enabled,
  },
}, null, 2));
"@ | Set-Content -Path $runtimeSmokeScript -Encoding UTF8

  node $runtimeSmokeScript
  Assert-LastExitCode "OnchainOS runtime smoke"
} finally {
  Stop-ProcessTree $serverProcess
}
