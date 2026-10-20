<#
.SYNOPSIS
Starts, migrates, inspects, or stops the local StudyFlow PostgreSQL database.

.DESCRIPTION
Contract:
- args: Action (start|migrate|status|stop), Port (1..65535), and three local-only
  database passwords. Password parameters are optional and have documented
  development defaults; pass different values outside an isolated local machine.
- input: Docker Desktop, infrastructure/docker/compose.database.yml, Java Flyway
  SQL migrations, Python Alembic migrations, and uv for Action=migrate.
- output: process exit code 0 and status text on success; no structured data.
- errors: exits non-zero when Docker is unavailable, PostgreSQL is unhealthy,
  Flyway/Alembic fails, the port is invalid, or uv is missing for migration.
- side effects: start creates/starts a named PostgreSQL volume; migrate applies
  forward-only app and ai migrations; stop stops the container without deleting data.
- retry/idempotency: start and migrate are safe to repeat. This command never removes
  the named volume and intentionally has no reset/delete action.
#>
[CmdletBinding()]
param(
    [Parameter(Position = 0)]
    [ValidateSet("start", "migrate", "status", "stop")]
    [string]$Action = "start",

    [ValidateRange(1, 65535)]
    [int]$Port = 5433,

    [string]$AdminPassword = "studyflow_admin_local_only",
    [string]$AppPassword = "studyflow_app_local_only",
    [string]$AiPassword = "studyflow_ai_local_only"
)

$ErrorActionPreference = "Stop"
$repositoryRoot = Split-Path -Parent $PSScriptRoot
$composeFile = Join-Path $repositoryRoot "infrastructure/docker/compose.database.yml"
$composeDefaults = Join-Path $repositoryRoot "infrastructure/docker/database.defaults"
$aiService = Join-Path $repositoryRoot "services/ai"

function Invoke-CheckedCommand {
    <#
    .SYNOPSIS
    Runs an external command and fails when its exit code is non-zero.

    .DESCRIPTION
    Contract:
    - args: FilePath is a required executable; Arguments is a required string array.
    - input: executable available in PATH or at FilePath.
    - output: void; streams command output to the caller.
    - errors: throws RuntimeException when the executable returns a non-zero exit code.
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
    POSTGRES_PORT = $env:POSTGRES_PORT
    POSTGRES_ADMIN_PASSWORD = $env:POSTGRES_ADMIN_PASSWORD
    DATABASE_PASSWORD = $env:DATABASE_PASSWORD
    AI_DATABASE_PASSWORD = $env:AI_DATABASE_PASSWORD
    AI_DATABASE_URL = $env:AI_DATABASE_URL
}

try {
    $env:POSTGRES_PORT = $Port.ToString()
    $env:POSTGRES_ADMIN_PASSWORD = $AdminPassword
    $env:DATABASE_PASSWORD = $AppPassword
    $env:AI_DATABASE_PASSWORD = $AiPassword

    # The explicit non-secret env file prevents Compose from auto-reading repository .env.
    $composeArgs = @("compose", "--env-file", $composeDefaults, "-f", $composeFile)

    switch ($Action) {
        "start" {
            Invoke-CheckedCommand "docker" ($composeArgs + @("up", "-d", "--wait", "postgres"))
            Write-Host "StudyFlow PostgreSQL is ready at 127.0.0.1:$Port/studyflow."
        }
        "migrate" {
            Invoke-CheckedCommand "docker" ($composeArgs + @("up", "-d", "--wait", "postgres"))
            $databaseCreateGranted = $false
            try {
                # Existing baseline migrations contain CREATE SCHEMA IF NOT EXISTS.
                # PostgreSQL still requires database CREATE for that statement, so grant it
                # only for migration and revoke it even when a migration fails.
                Invoke-CheckedCommand "docker" ($composeArgs + @(
                    "exec", "-T", "postgres", "psql", "-U", "studyflow_admin", "-d", "studyflow",
                    "-v", "ON_ERROR_STOP=1", "-c",
                    "GRANT CREATE ON DATABASE studyflow TO studyflow_app, studyflow_ai;"
                ))
                $databaseCreateGranted = $true

                Invoke-CheckedCommand "docker" ($composeArgs + @("--profile", "migration", "run", "--rm", "app-migrate"))

                if (-not (Get-Command uv -ErrorAction SilentlyContinue)) {
                    throw "uv is required to run the Python Alembic migrations."
                }

                $escapedAiPassword = [Uri]::EscapeDataString($AiPassword)
                $env:AI_DATABASE_URL = "postgresql+psycopg://studyflow_ai:${escapedAiPassword}@127.0.0.1:${Port}/studyflow?connect_timeout=5&options=-csearch_path%3Dai%2Cpublic"
                Push-Location $aiService
                try {
                    Invoke-CheckedCommand "uv" @("run", "--offline", "alembic", "upgrade", "head")
                }
                finally {
                    Pop-Location
                }
            }
            finally {
                if ($databaseCreateGranted) {
                    Invoke-CheckedCommand "docker" ($composeArgs + @(
                        "exec", "-T", "postgres", "psql", "-U", "studyflow_admin", "-d", "studyflow",
                        "-v", "ON_ERROR_STOP=1", "-c",
                        "REVOKE CREATE ON DATABASE studyflow FROM studyflow_app, studyflow_ai;"
                    ))
                }
            }

            Write-Host "Flyway and Alembic migrations completed."
        }
        "status" {
            Invoke-CheckedCommand "docker" ($composeArgs + @("ps"))
            Invoke-CheckedCommand "docker" ($composeArgs + @(
                "exec", "-T", "postgres", "psql", "-U", "studyflow_admin", "-d", "studyflow",
                "-v", "ON_ERROR_STOP=1", "-c",
                "SELECT schema_name FROM information_schema.schemata WHERE schema_name IN ('app','ai') ORDER BY schema_name;"
            ))
            Invoke-CheckedCommand "docker" ($composeArgs + @(
                "exec", "-T", "postgres", "psql", "-U", "studyflow_admin", "-d", "studyflow",
                "-v", "ON_ERROR_STOP=1", "-c",
                "SELECT schemaname, count(*) AS table_count FROM pg_tables WHERE schemaname IN ('app','ai') GROUP BY schemaname ORDER BY schemaname;"
            ))
        }
        "stop" {
            Invoke-CheckedCommand "docker" ($composeArgs + @("stop", "postgres"))
            Write-Host "StudyFlow PostgreSQL stopped. Named volume was preserved."
        }
    }
}
finally {
    $env:POSTGRES_PORT = $previous.POSTGRES_PORT
    $env:POSTGRES_ADMIN_PASSWORD = $previous.POSTGRES_ADMIN_PASSWORD
    $env:DATABASE_PASSWORD = $previous.DATABASE_PASSWORD
    $env:AI_DATABASE_PASSWORD = $previous.AI_DATABASE_PASSWORD
    $env:AI_DATABASE_URL = $previous.AI_DATABASE_URL
}
