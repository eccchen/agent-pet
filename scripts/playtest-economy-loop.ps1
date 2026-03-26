param(
  [string]$BaseUrl = "http://127.0.0.1:3001",
  [switch]$StartServer
)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$serverDir = Join-Path $root "apps\server"
$manifestPath = Join-Path $root "contracts\deployments\xlayer-testnet.json"
$statePath = Join-Path $root ".data\playtest-server-state.json"
$logsDir = Join-Path $root ".data\logs"
$serverLog = Join-Path $logsDir "playtest-server.log"
$serverErrLog = Join-Path $logsDir "playtest-server.err.log"
$serverBootstrapScript = Join-Path $logsDir "playtest-server.bootstrap.ps1"

New-Item -ItemType Directory -Force -Path $logsDir | Out-Null

function Write-Step([string]$text) {
  Write-Host ""
  Write-Host "== $text =="
}

function Invoke-Json([string]$Method, [string]$Uri, [object]$Body = $null, [string]$Token = $null) {
  $headers = @{}
  if ($Token) {
    $headers["Authorization"] = "Bearer $Token"
  }

  try {
    if ($null -ne $Body) {
      return Invoke-RestMethod -Method $Method -Uri $Uri -Headers $headers -ContentType "application/json" -Body ($Body | ConvertTo-Json -Depth 10)
    }

    return Invoke-RestMethod -Method $Method -Uri $Uri -Headers $headers
  } catch {
    $response = $_.Exception.Response
    if ($response -and $response.GetResponseStream) {
      $reader = New-Object System.IO.StreamReader($response.GetResponseStream())
      $bodyText = $reader.ReadToEnd()
      throw "HTTP $Method $Uri failed: $bodyText"
    }

    throw
  }
}

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

function New-TestWalletAddress() {
  $hex = ([guid]::NewGuid().ToString("N") + [guid]::NewGuid().ToString("N")).ToLower()
  return "0x$($hex.Substring(0, 40))"
}

function New-UnsafeSession([string]$WalletAddress) {
  $challenge = Invoke-Json "POST" "$BaseUrl/api/auth/challenge" @{ walletAddress = $WalletAddress }
  $verify = Invoke-Json "POST" "$BaseUrl/api/auth/verify" @{
    walletAddress = $WalletAddress
    signature = "signed:$($challenge.nonce)"
  }

  return $verify.token
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
    Write-Step "Starting local MVP server"
    $serverState = Ensure-Server
    $serverProcess = $serverState.Process
    $BaseUrl = $serverState.BaseUrl
  }

  $walletA = New-TestWalletAddress
  $walletB = New-TestWalletAddress

  Write-Step "Creating test sessions"
  $tokenA = New-UnsafeSession $walletA
  $tokenB = New-UnsafeSession $walletB

  Write-Step "Bootstrapping players"
  $bootstrapA = Invoke-Json "POST" "$BaseUrl/api/players/bootstrap" @{} $tokenA
  $bootstrapB = Invoke-Json "POST" "$BaseUrl/api/players/bootstrap" @{} $tokenB

  Write-Host "Player A bootstrapped."
  Write-Host "Player B bootstrapped."

  Write-Step "Creating tip"
  $tip = Invoke-Json "POST" "$BaseUrl/api/economy/tips" @{
    fromPetId = "starter-pet"
    targetWalletAddress = $walletB
    toPetId = "starter-pet"
    amount = 50
  } $tokenA
  Write-Host "Tip id: $($tip.tip.id)"

  Write-Step "Creating bounty and claiming it"
  $bounty = Invoke-Json "POST" "$BaseUrl/api/economy/bounties" @{
    creatorPetId = "starter-pet"
    targetWalletAddress = $walletB
    targetPetId = "starter-pet"
    title = "Make some noise"
    detail = "Cause a small drama event"
    amount = 100
  } $tokenA
  $claimedBounty = Invoke-Json "POST" "$BaseUrl/api/economy/bounties/$($bounty.bounty.id)/claim" @{
    claimerPetId = "starter-pet"
  } $tokenB
  Write-Host "Bounty claimed: $($claimedBounty.bounty.status)"

  Write-Step "Creating duel, accepting, resolving"
  $duel = Invoke-Json "POST" "$BaseUrl/api/economy/duels" @{
    challengerPetId = "starter-pet"
    targetWalletAddress = $walletB
    targetPetId = "starter-pet"
    stakeAmount = 50
  } $tokenA
  $acceptedDuel = Invoke-Json "POST" "$BaseUrl/api/economy/duels/$($duel.duel.id)/accept" @{
    targetPetId = "starter-pet"
  } $tokenB
  $resolvedDuel = Invoke-Json "POST" "$BaseUrl/api/economy/duels/$($duel.duel.id)/resolve" @{
    winnerPetId = "starter-pet"
  } $tokenA
  Write-Host "Duel accepted: $($acceptedDuel.duel.status)"
  Write-Host "Duel resolved winner: $($resolvedDuel.duel.winnerPetId)"

  Write-Step "Creating service order, accepting, completing"
  $serviceOrder = Invoke-Json "POST" "$BaseUrl/api/economy/service-orders" @{
    clientPetId = "starter-pet"
    serviceType = "taunt"
    title = "Go stir drama"
    detail = "Push a rival into replying"
    amount = 50
  } $tokenA
  $acceptedOrder = Invoke-Json "POST" "$BaseUrl/api/economy/service-orders/$($serviceOrder.order.id)/accept" @{
    providerPetId = "starter-pet"
  } $tokenB
  $completedOrder = Invoke-Json "POST" "$BaseUrl/api/economy/service-orders/$($serviceOrder.order.id)/complete" @{} $tokenA
  Write-Host "Service order accepted: $($acceptedOrder.order.status)"
  Write-Host "Service order completed: $($completedOrder.order.status)"

  Write-Step "Fetching final home snapshots"
  $homeA = Invoke-Json "GET" "$BaseUrl/api/me/home" $null $tokenA
  $homeB = Invoke-Json "GET" "$BaseUrl/api/me/home" $null $tokenB

  $summary = [PSCustomObject]@{
    playerA = [PSCustomObject]@{
      wallet = $walletA
      treasury = $homeA.economy.treasuryBalance
      profitPool = $homeA.economy.profitPool
      ledgerEntries = $homeA.economy.ledgerEntries
      openBounties = $homeA.economy.openBounties
      openDuels = $homeA.economy.openDuels
      openServiceOrders = $homeA.economy.openServiceOrders
    }
    playerB = [PSCustomObject]@{
      wallet = $walletB
      treasury = $homeB.economy.treasuryBalance
      profitPool = $homeB.economy.profitPool
      ledgerEntries = $homeB.economy.ledgerEntries
      openBounties = $homeB.economy.openBounties
      openDuels = $homeB.economy.openDuels
      openServiceOrders = $homeB.economy.openServiceOrders
    }
  }

  $summary | ConvertTo-Json -Depth 10
  Write-Host ""
  Write-Host "Internal economy playtest completed."
} finally {
  Stop-ProcessTree $serverProcess
}
