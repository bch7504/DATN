<#
.SYNOPSIS
Stops local StudyFlow processes and containers without deleting data.

.DESCRIPTION
Contract:
- args: none.
- input: .runtime/studyflow-processes.json created by start-all.ps1.
- output: process exit code 0 and a short status summary.
- errors: reports but tolerates already-stopped processes/containers.
- side effects: terminates only recorded process trees, stops Mailpit and
  PostgreSQL, removes the generated PID file, and preserves Docker volumes.
- retry/idempotency: safe to run repeatedly.
#>
[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repositoryRoot = Split-Path -Parent $PSScriptRoot
$runtimeDirectory = Join-Path $repositoryRoot ".runtime"
$processFile = Join-Path $runtimeDirectory "studyflow-processes.json"
$databaseScript = Join-Path $PSScriptRoot "database.ps1"
$composeFile = Join-Path $repositoryRoot "infrastructure/docker/compose.database.yml"
$composeDefaults = Join-Path $repositoryRoot "infrastructure/docker/database.defaults"

if (Test-Path -LiteralPath $processFile -PathType Leaf) {
    $records = @(Get-Content -LiteralPath $processFile -Raw | ConvertFrom-Json)
    foreach ($record in $records) {
        $process = Get-Process -Id $record.id -ErrorAction SilentlyContinue
        if ($null -eq $process) {
            continue
        }
        $actualStartedAt = $process.StartTime.ToUniversalTime().ToString("O")
        if ($process.ProcessName -ne $record.processName -or $actualStartedAt -ne $record.startedAt) {
            Write-Warning "Skipped reused PID $($record.id) because its process identity changed."
            continue
        }
        & taskkill.exe /PID $record.id /T /F | Out-Null
        Write-Host "Stopped $($record.name)."
    }
    Remove-Item -LiteralPath $processFile -Force
}
else {
    Write-Host "No recorded StudyFlow application processes were found."
}

if (Get-Command docker -ErrorAction SilentlyContinue) {
    & docker compose --env-file $composeDefaults -f $composeFile stop mailpit | Out-Null
    try {
        & $databaseScript stop
    }
    catch {
        Write-Warning "PostgreSQL was already stopped or Docker is unavailable."
    }
}

Write-Host "StudyFlow stopped. Docker volumes and database data were preserved."

