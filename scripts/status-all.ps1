<#
.SYNOPSIS
Shows local StudyFlow process and API reachability status.

.DESCRIPTION
Contract:
- args: none.
- input: optional .runtime/studyflow-processes.json and local HTTP endpoints.
- output: human-readable process and endpoint status tables; no secret values.
- errors: unreachable endpoints are reported as DOWN instead of throwing.
- side effects: none; all checks are read-only.
- retry/idempotency: safe to run repeatedly.
#>
[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repositoryRoot = Split-Path -Parent $PSScriptRoot
$processFile = Join-Path $repositoryRoot ".runtime/studyflow-processes.json"

function Get-EndpointState {
    <#
    .SYNOPSIS
    Checks whether an HTTP service responds, including with an error status.

    .DESCRIPTION
    Args: Uri is a required local endpoint.
    Input: local HTTP service.
    Output: `UP (HTTP n)` when an HTTP response exists, otherwise `DOWN`.
    Errors: network exceptions are converted to the DOWN result.
    #>
    param([Parameter(Mandatory = $true)][string]$Uri)

    try {
        $response = Invoke-WebRequest -UseBasicParsing -Uri $Uri -TimeoutSec 3
        return "UP (HTTP $($response.StatusCode))"
    }
    catch {
        if ($null -ne $_.Exception.Response) {
            return "UP (HTTP $([int]$_.Exception.Response.StatusCode))"
        }
        return "DOWN"
    }
}

$processRows = @()
if (Test-Path -LiteralPath $processFile -PathType Leaf) {
    $records = @(Get-Content -LiteralPath $processFile -Raw | ConvertFrom-Json)
    foreach ($record in $records) {
        $process = Get-Process -Id $record.id -ErrorAction SilentlyContinue
        $state = if ($null -ne $process) { "RUNNING" } else { "STOPPED" }
        $processRows += [PSCustomObject]@{
            Service = $record.name
            PID = $record.id
            Process = $record.processName
            State = $state
        }
    }
}
if ($processRows.Count -eq 0) {
    $processRows += [PSCustomObject]@{
        Service = "No recorded application process"
        PID = "-"
        Process = "-"
        State = "STOPPED"
    }
}

$endpointRows = @(
    [PSCustomObject]@{ API = "Next.js Web"; Address = "http://127.0.0.1:3000"; State = Get-EndpointState "http://127.0.0.1:3000" },
    [PSCustomObject]@{ API = "Java Backend"; Address = "http://127.0.0.1:8088/actuator/health"; State = Get-EndpointState "http://127.0.0.1:8088/actuator/health" },
    [PSCustomObject]@{ API = "Python AI"; Address = "http://127.0.0.1:8001/internal/v1/health"; State = Get-EndpointState "http://127.0.0.1:8001/internal/v1/health" },
    [PSCustomObject]@{ API = "Mailpit"; Address = "http://127.0.0.1:8025"; State = Get-EndpointState "http://127.0.0.1:8025" }
)

Write-Host "Application processes"
$processRows | Format-Table -AutoSize
Write-Host "API reachability"
$endpointRows | Format-Table -AutoSize

