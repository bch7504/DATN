<#
.SYNOPSIS
Starts, inspects, or stops the local S3-compatible StudyFlow object storage.

.DESCRIPTION
Contract:
- args: Action (start|status|stop), Port (1..65535), bucket, access key and secret key.
- input: Docker Desktop, infrastructure/docker/compose.database.yml and database.defaults.
- output: exit code 0 plus local endpoint/bucket status text; no structured data.
- errors: exits non-zero when Docker is unavailable, configuration is invalid, or Compose fails.
- side effects: start creates/starts the named studyflow-object-data volume; stop preserves it.
- retry/idempotency: start and stop are safe to repeat; this script has no reset/delete action.
#>
[CmdletBinding()]
param(
    [Parameter(Position = 0)]
    [ValidateSet("start", "status", "stop")]
    [string]$Action = "start",

    [ValidateRange(1, 65535)]
    [int]$Port = 8333,

    [ValidatePattern("^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$")]
    [string]$Bucket = "studyflow-documents",

    [ValidateLength(8, 128)]
    [string]$AccessKey = "studyflow_storage_local_access",

    [ValidateLength(8, 128)]
    [string]$SecretKey = "studyflow_storage_local_secret"
)

$ErrorActionPreference = "Stop"
$repositoryRoot = Split-Path -Parent $PSScriptRoot
$composeFile = Join-Path $repositoryRoot "infrastructure/docker/compose.database.yml"
$composeDefaults = Join-Path $repositoryRoot "infrastructure/docker/database.defaults"

function Invoke-CheckedCommand {
    <#
    .SYNOPSIS
    Runs an external command and throws on a non-zero exit code.

    .DESCRIPTION
    Contract:
    - args: FilePath is a required executable; Arguments is a required string array.
    - input: executable available in PATH or at FilePath.
    - output: void; command output is streamed to the caller.
    - errors: RuntimeException when the executable returns a non-zero exit code.
    #>
    param(
        [Parameter(Mandatory = $true)]
        [string]$FilePath,

        [Parameter(Mandatory = $true)]
        [string[]]$Arguments
    )

    & $FilePath @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "Command failed with exit code ${LASTEXITCODE}: $FilePath $($Arguments -join ' ')"
    }
}

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    throw "Docker CLI is required. Install or start Docker Desktop before continuing."
}

$previous = @{
    STORAGE_PORT = $env:STORAGE_PORT
    STORAGE_BUCKET = $env:STORAGE_BUCKET
    STORAGE_ACCESS_KEY = $env:STORAGE_ACCESS_KEY
    STORAGE_SECRET_KEY = $env:STORAGE_SECRET_KEY
}

try {
    $env:STORAGE_PORT = $Port.ToString()
    $env:STORAGE_BUCKET = $Bucket
    $env:STORAGE_ACCESS_KEY = $AccessKey
    $env:STORAGE_SECRET_KEY = $SecretKey
    $composeArgs = @("compose", "--env-file", $composeDefaults, "-f", $composeFile)

    switch ($Action) {
        "start" {
            Invoke-CheckedCommand "docker" ($composeArgs + @("up", "-d", "object-storage"))
            Write-Host "StudyFlow object storage is available at http://127.0.0.1:$Port (bucket: $Bucket)."
        }
        "status" {
            Invoke-CheckedCommand "docker" ($composeArgs + @("ps", "object-storage"))
            Write-Host "Expected local endpoint: http://127.0.0.1:$Port; bucket: $Bucket."
        }
        "stop" {
            Invoke-CheckedCommand "docker" ($composeArgs + @("stop", "object-storage"))
            Write-Host "StudyFlow object storage stopped. Named volume was preserved."
        }
    }
}
finally {
    $env:STORAGE_PORT = $previous.STORAGE_PORT
    $env:STORAGE_BUCKET = $previous.STORAGE_BUCKET
    $env:STORAGE_ACCESS_KEY = $previous.STORAGE_ACCESS_KEY
    $env:STORAGE_SECRET_KEY = $previous.STORAGE_SECRET_KEY
}
