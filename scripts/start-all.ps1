<#
.SYNOPSIS
Starts the complete local StudyFlow stack with one command.

.DESCRIPTION
Contract:
- args: SkipDependencyInstall skips npm/uv dependency synchronization;
  SkipHealthCheck skips HTTP readiness polling. Both switches default to false.
- input: repository-root .env, Docker Desktop, Node/npm, Java 17, uv, and the
  checked-in service sources. The .env file is parsed as KEY=VALUE data and is
  never printed or modified.
- output: process exit code 0 after PostgreSQL, Mailpit, Backend, AI API,
  AI worker, and Frontend start; runtime metadata is written to .runtime.
- errors: exits non-zero for missing tools/configuration, failed migrations,
  dependency installation failure, process launch failure, or health timeout.
- side effects: starts Docker containers and four local process trees; applies
  forward-only migrations; may install dependencies. It never deletes volumes.
- retry/idempotency: fails when a recorded StudyFlow process is still running;
  use scripts/stop-all.ps1 before starting a second stack.
#>
[CmdletBinding()]
param(
    [switch]$SkipDependencyInstall,
    [switch]$SkipHealthCheck
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repositoryRoot = Split-Path -Parent $PSScriptRoot
$environmentFile = Join-Path $repositoryRoot ".env"
$runtimeDirectory = Join-Path $repositoryRoot ".runtime"
$processFile = Join-Path $runtimeDirectory "studyflow-processes.json"
$databaseScript = Join-Path $PSScriptRoot "database.ps1"
$composeFile = Join-Path $repositoryRoot "infrastructure/docker/compose.database.yml"
$composeDefaults = Join-Path $repositoryRoot "infrastructure/docker/database.defaults"
$backendDirectory = Join-Path $repositoryRoot "services/backend"
$aiDirectory = Join-Path $repositoryRoot "services/ai"
$frontendDirectory = Join-Path $repositoryRoot "apps/web"

function Import-DotEnvFile {
    <#
    .SYNOPSIS
    Loads KEY=VALUE entries into the current process without displaying values.

    .DESCRIPTION
    Args: Path is a required existing .env file path.
    Input: UTF-8 text containing blank lines, comments, optional `export`, and
    KEY=VALUE entries. Single/double outer quotes are removed.
    Output: void; valid names are added to Process environment scope.
    Errors: throws for a missing file, malformed assignment, or invalid key.
    #>
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path
    )

    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
        throw "Missing repository .env file: $Path"
    }

    $lineNumber = 0
    foreach ($rawLine in [System.IO.File]::ReadAllLines($Path)) {
        $lineNumber++
        $line = $rawLine.Trim()
        if (-not $line -or $line.StartsWith("#")) {
            continue
        }
        if ($line.StartsWith("export ")) {
            $line = $line.Substring(7).Trim()
        }
        elseif ($line.StartsWith("set ", [System.StringComparison]::OrdinalIgnoreCase)) {
            $line = $line.Substring(4).Trim()
        }
        elseif ($line.StartsWith('$env:', [System.StringComparison]::OrdinalIgnoreCase)) {
            $line = $line.Substring(5).Trim()
        }
        $separator = $line.IndexOf("=")
        if ($separator -lt 1) {
            throw "Invalid .env assignment at line $lineNumber."
        }
        $name = $line.Substring(0, $separator).Trim()
        if ($name -notmatch '^[A-Za-z_][A-Za-z0-9_]*$') {
            throw "Invalid .env variable name at line $lineNumber."
        }
        $value = $line.Substring($separator + 1).Trim()
        if ($value.Length -ge 2) {
            $first = $value[0]
            $last = $value[$value.Length - 1]
            if (($first -eq '"' -and $last -eq '"') -or ($first -eq "'" -and $last -eq "'")) {
                $value = $value.Substring(1, $value.Length - 2)
            }
        }
        [Environment]::SetEnvironmentVariable($name, $value, "Process")
    }
}

function Set-EnvironmentDefault {
    <#
    .SYNOPSIS
    Sets a local default only when a process variable is absent.

    .DESCRIPTION
    Args: Name and Value are required strings.
    Input: current Process environment.
    Output: void; existing user configuration is preserved.
    Errors: throws when environment mutation fails.
    #>
    param(
        [Parameter(Mandatory = $true)][string]$Name,
        [Parameter(Mandatory = $true)][string]$Value
    )

    if ([string]::IsNullOrWhiteSpace([Environment]::GetEnvironmentVariable($Name, "Process"))) {
        [Environment]::SetEnvironmentVariable($Name, $Value, "Process")
    }
}

function Assert-CommandAvailable {
    <#
    .SYNOPSIS
    Verifies that one required executable is available.

    .DESCRIPTION
    Args: Name is the executable name.
    Input: current PATH.
    Output: resolved command path.
    Errors: throws when the command cannot be resolved.
    #>
    param([Parameter(Mandatory = $true)][string]$Name)

    $command = Get-Command $Name -ErrorAction SilentlyContinue
    if ($null -eq $command) {
        throw "Required command is not available: $Name"
    }
    return $command.Source
}

function Invoke-CheckedCommand {
    <#
    .SYNOPSIS
    Executes one foreground setup command and validates its exit status.

    .DESCRIPTION
    Args: FilePath and Arguments are required; WorkingDirectory is optional.
    Input: executable plus argument list.
    Output: void; streams non-secret command output.
    Errors: throws when the process returns a non-zero exit code.
    #>
    param(
        [Parameter(Mandatory = $true)][string]$FilePath,
        [Parameter(Mandatory = $true)][string[]]$Arguments,
        [string]$WorkingDirectory = $repositoryRoot
    )

    Push-Location $WorkingDirectory
    try {
        & $FilePath @Arguments
        if ($LASTEXITCODE -ne 0) {
            throw "Command failed with exit code ${LASTEXITCODE}: $FilePath"
        }
    }
    finally {
        Pop-Location
    }
}

function Start-StudyFlowProcess {
    <#
    .SYNOPSIS
    Starts one managed hidden process and records safe runtime metadata.

    .DESCRIPTION
    Args: Name, FilePath, Arguments, and WorkingDirectory identify the process.
    Input: inherited Process environment loaded from .env.
    Output: object containing logical name, PID, process name, and start time.
    Errors: throws when process creation or output redirection fails.
    #>
    param(
        [Parameter(Mandatory = $true)][string]$Name,
        [Parameter(Mandatory = $true)][string]$FilePath,
        [Parameter(Mandatory = $true)][string[]]$Arguments,
        [Parameter(Mandatory = $true)][string]$WorkingDirectory
    )

    $stdoutPath = Join-Path $runtimeDirectory "$Name.stdout.txt"
    $stderrPath = Join-Path $runtimeDirectory "$Name.stderr.txt"
    $process = Start-Process `
        -FilePath $FilePath `
        -ArgumentList $Arguments `
        -WorkingDirectory $WorkingDirectory `
        -WindowStyle Hidden `
        -RedirectStandardOutput $stdoutPath `
        -RedirectStandardError $stderrPath `
        -PassThru
    $process.Refresh()
    return [PSCustomObject]@{
        name = $Name
        id = $process.Id
        processName = $process.ProcessName
        startedAt = $process.StartTime.ToUniversalTime().ToString("O")
    }
}

function Wait-HttpReady {
    <#
    .SYNOPSIS
    Waits until an HTTP endpoint returns a successful response.

    .DESCRIPTION
    Args: Name, Uri, optional Headers, TimeoutSeconds (1..300), and
    AcceptAnyHttpStatus for reachability checks of a degraded service.
    Input: running local HTTP service.
    Output: void when a 2xx response is received.
    Errors: throws after the timeout; callers should inspect .runtime stderr.
    #>
    param(
        [Parameter(Mandatory = $true)][string]$Name,
        [Parameter(Mandatory = $true)][string]$Uri,
        [hashtable]$Headers = @{},
        [ValidateRange(1, 300)][int]$TimeoutSeconds = 120,
        [switch]$AcceptAnyHttpStatus
    )

    $deadline = [DateTime]::UtcNow.AddSeconds($TimeoutSeconds)
    while ([DateTime]::UtcNow -lt $deadline) {
        try {
            $response = Invoke-WebRequest -UseBasicParsing -Uri $Uri -Headers $Headers -TimeoutSec 3
            if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 300) {
                Write-Host "$Name is ready: $Uri"
                return
            }
        }
        catch {
            if ($AcceptAnyHttpStatus -and $null -ne $_.Exception.Response) {
                $statusCode = [int]$_.Exception.Response.StatusCode
                Write-Host "$Name is reachable with HTTP ${statusCode}: $Uri"
                return
            }
            Start-Sleep -Seconds 2
        }
    }
    throw "$Name did not become ready within $TimeoutSeconds seconds."
}

Import-DotEnvFile -Path $environmentFile
Write-Host "Configuration loaded automatically from: $environmentFile"

Set-EnvironmentDefault "POSTGRES_PORT" "5433"
Set-EnvironmentDefault "POSTGRES_ADMIN_PASSWORD" "studyflow_admin_local_only"
Set-EnvironmentDefault "DATABASE_USERNAME" "studyflow_app"
Set-EnvironmentDefault "DATABASE_PASSWORD" "studyflow_app_local_only"
Set-EnvironmentDefault "AI_DATABASE_PASSWORD" "studyflow_ai_local_only"
Set-EnvironmentDefault "DATABASE_URL" "jdbc:postgresql://127.0.0.1:$($env:POSTGRES_PORT)/studyflow?currentSchema=app"
Set-EnvironmentDefault "AI_DATABASE_URL" "postgresql+psycopg://studyflow_ai:$($env:AI_DATABASE_PASSWORD)@127.0.0.1:$($env:POSTGRES_PORT)/studyflow?connect_timeout=5&options=-csearch_path%3Dai%2Cpublic"
Set-EnvironmentDefault "SPRING_PROFILES_ACTIVE" "local"
Set-EnvironmentDefault "JWT_SECRET" "studyflow-local-jwt-secret-minimum-32-characters"
Set-EnvironmentDefault "SERVER_PORT" "8088"
Set-EnvironmentDefault "MAIL_HOST" "127.0.0.1"
Set-EnvironmentDefault "MAIL_PORT" "1025"
Set-EnvironmentDefault "MAIL_FROM" "no-reply@studyflow.local"
Set-EnvironmentDefault "AI_SERVICE_URL" "http://127.0.0.1:8001"
Set-EnvironmentDefault "NEXT_PUBLIC_API_URL" "http://127.0.0.1:8088/api/v1"
Set-EnvironmentDefault "NEXT_PUBLIC_DEMO_MODE" "false"
Set-EnvironmentDefault "OPENROUTER_BASE_URL" "https://openrouter.ai/api/v1"
Set-EnvironmentDefault "OPENROUTER_CHAT_MODEL" "openai/gpt-5.6-luna"
Set-EnvironmentDefault "OPENROUTER_EMBEDDING_MODEL" "openai/text-embedding-3-large"
Set-EnvironmentDefault "EMBEDDING_DIMENSIONS" "1024"

if ([string]::IsNullOrWhiteSpace($env:INTERNAL_SERVICE_TOKEN) -and -not [string]::IsNullOrWhiteSpace($env:AI_SERVICE_TOKEN)) {
    $env:INTERNAL_SERVICE_TOKEN = $env:AI_SERVICE_TOKEN
}
if ([string]::IsNullOrWhiteSpace($env:AI_SERVICE_TOKEN) -and -not [string]::IsNullOrWhiteSpace($env:INTERNAL_SERVICE_TOKEN)) {
    $env:AI_SERVICE_TOKEN = $env:INTERNAL_SERVICE_TOKEN
}
if ([string]::IsNullOrWhiteSpace($env:INTERNAL_SERVICE_TOKEN)) {
    throw "INTERNAL_SERVICE_TOKEN or AI_SERVICE_TOKEN must be configured in .env."
}
$openRouterConfigured = -not [string]::IsNullOrWhiteSpace($env:OPENROUTER_API_KEY)
if (-not $openRouterConfigured) {
    Write-Host "OPENROUTER_API_KEY: MISSING"
    Write-Warning "OPENROUTER_API_KEY is not available. Services will start, but RAG/Quiz model calls will remain unavailable."
}
else {
    Write-Host "OPENROUTER_API_KEY: FOUND (value hidden)"
}

$dockerPath = Assert-CommandAvailable "docker"
$uvPath = Assert-CommandAvailable "uv"
$npmPath = Assert-CommandAvailable "npm.cmd"
[void](Assert-CommandAvailable "java")

New-Item -ItemType Directory -Path $runtimeDirectory -Force | Out-Null
if (Test-Path -LiteralPath $processFile) {
    $recorded = Get-Content -LiteralPath $processFile -Raw | ConvertFrom-Json
    $running = @($recorded | Where-Object { Get-Process -Id $_.id -ErrorAction SilentlyContinue })
    if ($running.Count -gt 0) {
        throw "StudyFlow already has recorded processes running. Use .\scripts\stop-all.ps1 first."
    }
    Remove-Item -LiteralPath $processFile -Force
}

if (-not $SkipDependencyInstall) {
    Write-Host "[1/7] Synchronizing Python and Frontend dependencies..."
    Invoke-CheckedCommand -FilePath $uvPath -Arguments @("sync", "--dev") -WorkingDirectory $aiDirectory
    Invoke-CheckedCommand -FilePath $npmPath -Arguments @("install") -WorkingDirectory $frontendDirectory
}
else {
    Write-Host "[1/7] Dependency synchronization skipped."
}

Write-Host "[2/7] Starting PostgreSQL/pgvector..."
& $databaseScript start `
    -Port ([int]$env:POSTGRES_PORT) `
    -AdminPassword $env:POSTGRES_ADMIN_PASSWORD `
    -AppPassword $env:DATABASE_PASSWORD `
    -AiPassword $env:AI_DATABASE_PASSWORD
Write-Host "[3/7] Applying Java and Python database migrations..."
& $databaseScript migrate `
    -Port ([int]$env:POSTGRES_PORT) `
    -AdminPassword $env:POSTGRES_ADMIN_PASSWORD `
    -AppPassword $env:DATABASE_PASSWORD `
    -AiPassword $env:AI_DATABASE_PASSWORD

Write-Host "[4/7] Starting Mailpit..."
Invoke-CheckedCommand -FilePath $dockerPath -Arguments @(
    "compose", "--env-file", $composeDefaults, "-f", $composeFile,
    "up", "-d", "--wait", "mailpit"
)

$processes = @()
Write-Host "[5/7] Starting Java Backend and Python AI processes..."
$processes += Start-StudyFlowProcess `
    -Name "backend" `
    -FilePath (Join-Path $backendDirectory "mvnw.cmd") `
    -Arguments @("-s", "maven-settings.xml", "spring-boot:run") `
    -WorkingDirectory $backendDirectory
Write-Host "  Java Backend started with PID $($processes[-1].id)."
$processes += Start-StudyFlowProcess `
    -Name "ai-api" `
    -FilePath $uvPath `
    -Arguments @("run", "uvicorn", "app.asgi:app", "--host", "127.0.0.1", "--port", "8001", "--no-access-log") `
    -WorkingDirectory $aiDirectory
Write-Host "  Python AI API started with PID $($processes[-1].id)."
$processes += Start-StudyFlowProcess `
    -Name "ai-worker" `
    -FilePath $uvPath `
    -Arguments @("run", "python", "-m", "app.workers.documents") `
    -WorkingDirectory $aiDirectory
Write-Host "  Python AI worker started with PID $($processes[-1].id)."
Write-Host "[6/7] Starting Next.js Frontend..."
$processes += Start-StudyFlowProcess `
    -Name "frontend" `
    -FilePath $npmPath `
    -Arguments @("run", "dev") `
    -WorkingDirectory $frontendDirectory
Write-Host "  Next.js Frontend started with PID $($processes[-1].id)."

$processes | ConvertTo-Json | Set-Content -LiteralPath $processFile -Encoding UTF8

if (-not $SkipHealthCheck) {
    Write-Host "[7/7] Checking APIs..."
    Wait-HttpReady -Name "Java Backend" -Uri "http://127.0.0.1:$($env:SERVER_PORT)/actuator/health"
    $aiHeaders = @{
        Authorization = "Bearer $($env:INTERNAL_SERVICE_TOKEN)"
        "X-Request-Id" = "local-startup-health"
        "X-Schema-Version" = "3"
    }
    Wait-HttpReady `
        -Name "Python AI" `
        -Uri "http://127.0.0.1:8001/internal/v1/health" `
        -Headers $aiHeaders `
        -AcceptAnyHttpStatus:(-not $openRouterConfigured)
    Wait-HttpReady -Name "Next.js Web" -Uri "http://127.0.0.1:3000"
}
else {
    Write-Host "[7/7] API health checks skipped."
}

Write-Host ""
Write-Host "StudyFlow started successfully."
$apiSummary = @(
    [PSCustomObject]@{ Service = "Next.js Web"; State = "RUNNING"; Address = "http://127.0.0.1:3000" },
    [PSCustomObject]@{ Service = "Java Backend"; State = "RUNNING"; Address = "http://127.0.0.1:$($env:SERVER_PORT)" },
    [PSCustomObject]@{ Service = "Python AI API"; State = $(if ($openRouterConfigured) { "RUNNING" } else { "DEGRADED - no OpenRouter key" }); Address = "http://127.0.0.1:8001" },
    [PSCustomObject]@{ Service = "Mailpit"; State = "RUNNING"; Address = "http://127.0.0.1:8025" },
    [PSCustomObject]@{ Service = "PostgreSQL"; State = "RUNNING"; Address = "127.0.0.1:$($env:POSTGRES_PORT)" }
)
$apiSummary | Format-Table -AutoSize
Write-Host "Stop:     .\scripts\stop-all.ps1"
Write-Host "Status:   .\scripts\status-all.ps1"
Write-Host "Runtime output: .runtime\*.stdout.txt and .runtime\*.stderr.txt"

