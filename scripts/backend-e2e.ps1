<#
.SYNOPSIS
Runs the local StudyFlow Auth-to-Study-Plan integration flow with synthetic data.

.DESCRIPTION
Contract:
- args: BaseUrl and MailpitBaseUrl are optional local HTTP endpoints; DockerContainer
  is the PostgreSQL container name; all have local defaults.
- input: a running StudyFlow Java backend, Mailpit, PostgreSQL Docker container,
  and the public API contracts documented in docs/api-plan.md.
- output: JSON summary containing created synthetic entity IDs and verified states.
- errors: exits non-zero when health, OTP delivery, authentication, authorization,
  Course Offering, Enrollment, Study Plan, item completion, or calendar checks fail.
- side effects: creates two synthetic users, promotes one synthetic user to TEACHER,
  upserts one synthetic Subject/Semester, and creates an Offering, Enrollment and Plan.
- retry/idempotency: every run uses unique emails/codes; catalog upserts are idempotent.
  The completed-item request carries an Idempotency-Key.
#>
[CmdletBinding()]
param(
    [ValidatePattern('^https?://')]
    [string]$BaseUrl = "http://127.0.0.1:8088",

    [ValidatePattern('^https?://')]
    [string]$MailpitBaseUrl = "http://127.0.0.1:8025",

    [ValidateNotNullOrEmpty()]
    [string]$DockerContainer = "studyflow-postgres"
)

$ErrorActionPreference = "Stop"
$syntheticPassword = "StudyFlow123"
$runId = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds().ToString()
$studentEmail = "student.e2e.$runId@ptit.edu.vn"
$teacherEmail = "teacher.e2e.$runId@ptit.edu.vn"
$subjectId = "11111111-1111-4111-8111-111111111111"
$semesterId = "22222222-2222-4222-8222-222222222222"

function Invoke-JsonRequest {
    <#
    .DESCRIPTION
    Contract: Method/Uri are required; Body and WebSession are optional. Returns the
    parsed response body or null for 204. Throws the original HTTP exception on failure.
    #>
    param(
        [Parameter(Mandatory = $true)][string]$Method,
        [Parameter(Mandatory = $true)][string]$Uri,
        [object]$Body,
        [Microsoft.PowerShell.Commands.WebRequestSession]$WebSession,
        [hashtable]$Headers
    )

    $arguments = @{
        Method = $Method
        Uri = $Uri
        ContentType = "application/json"
    }
    if ($null -ne $Body) {
        $arguments.Body = $Body | ConvertTo-Json -Depth 10
    }
    if ($null -ne $WebSession) {
        $arguments.WebSession = $WebSession
    }
    if ($null -ne $Headers) {
        $arguments.Headers = $Headers
    }

    try {
        return Invoke-RestMethod @arguments
    }
    catch {
        if ($_.Exception.Response.StatusCode.value__ -eq 204) {
            return $null
        }
        throw
    }
}

function Get-MailpitVerificationCode {
    <#
    .DESCRIPTION
    Contract: Email is required. Polls Mailpit for at most 10 seconds and returns the
    six-digit registration code. Throws when no matching synthetic message/code exists.
    #>
    param([Parameter(Mandatory = $true)][string]$Email)

    for ($attempt = 0; $attempt -lt 20; $attempt++) {
        $messages = Invoke-RestMethod -Uri "$MailpitBaseUrl/api/v1/messages"
        $message = $messages.messages | Where-Object {
            ($_.To | ForEach-Object { $_.Address }) -contains $Email
        } | Select-Object -First 1

        if ($null -ne $message) {
            $detail = Invoke-RestMethod -Uri "$MailpitBaseUrl/api/v1/message/$($message.ID)"
            $content = "$($detail.Text)`n$($detail.HTML)"
            $match = [regex]::Match($content, '(?<!\d)\d{6}(?!\d)')
            if ($match.Success) {
                return $match.Value
            }
        }
        Start-Sleep -Milliseconds 500
    }
    throw "Mailpit did not receive a six-digit verification code for the synthetic account."
}

function Register-SyntheticUser {
    <#
    .DESCRIPTION
    Contract: DisplayName and Email are required. Starts registration, reads the local
    Mailpit OTP and verifies it. Returns void; throws when any public API step fails.
    #>
    param(
        [Parameter(Mandatory = $true)][string]$DisplayName,
        [Parameter(Mandatory = $true)][string]$Email
    )

    Invoke-JsonRequest -Method POST -Uri "$BaseUrl/api/v1/auth/register" -Body @{
        displayName = $DisplayName
        email = $Email
        password = $syntheticPassword
    } | Out-Null
    $verificationCode = Get-MailpitVerificationCode -Email $Email
    Invoke-JsonRequest -Method POST -Uri "$BaseUrl/api/v1/auth/verify-registration" -Body @{
        email = $Email
        verificationCode = $verificationCode
    } | Out-Null
}

function New-AuthenticatedSession {
    <#
    .DESCRIPTION
    Contract: Email is required. Logs in with the synthetic password and returns a
    WebRequestSession containing HttpOnly cookies. Throws on invalid authentication.
    #>
    param([Parameter(Mandatory = $true)][string]$Email)

    $session = [Microsoft.PowerShell.Commands.WebRequestSession]::new()
    Invoke-JsonRequest -Method POST -Uri "$BaseUrl/api/v1/auth/login" -Body @{
        identifier = $Email
        password = $syntheticPassword
    } -WebSession $session | Out-Null
    return $session
}

$health = Invoke-RestMethod -Uri "$BaseUrl/actuator/health"
if ($health.status -ne "UP") {
    throw "Backend health check is not UP."
}

Register-SyntheticUser -DisplayName "E2E Student" -Email $studentEmail
Register-SyntheticUser -DisplayName "E2E Teacher" -Email $teacherEmail

$catalogSql = @"
UPDATE app.users SET role = 'TEACHER', updated_at = NOW() WHERE LOWER(email) = LOWER('$teacherEmail');
INSERT INTO app.subjects (id, code, name, credits, description, status, created_at, updated_at)
VALUES ('$subjectId', 'E2E101', 'Synthetic integration subject', 3, 'Synthetic E2E fixture', 'ACTIVE', NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET status = 'ACTIVE', updated_at = NOW();
INSERT INTO app.semesters (id, code, name, academic_year, start_date, end_date, status, offering_creation_enabled, created_at, updated_at)
VALUES ('$semesterId', 'E2E-2026', 'Synthetic integration semester', '2026-2027', CURRENT_DATE - 30, CURRENT_DATE + 120, 'ACTIVE', TRUE, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET status = 'ACTIVE', offering_creation_enabled = TRUE, updated_at = NOW();
"@
& docker exec -i $DockerContainer psql -U studyflow_admin -d studyflow -v ON_ERROR_STOP=1 -c $catalogSql | Out-Null
if ($LASTEXITCODE -ne 0) {
    throw "Failed to prepare synthetic Teacher and academic catalog."
}

$teacherSession = New-AuthenticatedSession -Email $teacherEmail
$studentSession = New-AuthenticatedSession -Email $studentEmail
$teacherProfile = Invoke-JsonRequest -Method GET -Uri "$BaseUrl/api/v1/me" -WebSession $teacherSession
$studentProfile = Invoke-JsonRequest -Method GET -Uri "$BaseUrl/api/v1/me" -WebSession $studentSession
if ($teacherProfile.role -ne "TEACHER" -or $studentProfile.role -ne "STUDENT") {
    throw "Synthetic role setup did not match the expected access contract."
}

$offering = Invoke-JsonRequest -Method POST -Uri "$BaseUrl/api/v1/teacher/course-offerings" -WebSession $teacherSession -Body @{
    subjectId = $subjectId
    semesterId = $semesterId
    code = "E2E-$runId"
    name = "Synthetic integration class $runId"
}
if ([string]::IsNullOrWhiteSpace($offering.rawJoinCode)) {
    throw "Teacher Course Offering response did not include the one-time join code."
}

$enrollment = Invoke-JsonRequest -Method POST -Uri "$BaseUrl/api/v1/student/course-enrollments/join" -WebSession $studentSession -Body @{
    joinCode = $offering.rawJoinCode
}
if ($enrollment.status -ne "PENDING") {
    throw "Enrollment did not start in PENDING state."
}

$approvedEnrollment = Invoke-JsonRequest -Method POST -Uri "$BaseUrl/api/v1/teacher/enrollments/$($enrollment.id)/approve" -WebSession $teacherSession
if ($approvedEnrollment.status -ne "APPROVED") {
    throw "Teacher approval did not move Enrollment to APPROVED."
}

$studentOffering = Invoke-JsonRequest -Method GET -Uri "$BaseUrl/api/v1/student/course-offerings/$($offering.id)" -WebSession $studentSession
if ($studentOffering.enrollmentStatus -ne "APPROVED") {
    throw "Approved Course Offering is not visible to the Student."
}

$today = [DateTime]::UtcNow.Date
$plan = Invoke-JsonRequest -Method POST -Uri "$BaseUrl/api/v1/study-plans" -WebSession $studentSession -Body @{
    title = "E2E study plan $runId"
    description = "Synthetic integration data"
    startDate = $today.ToString("yyyy-MM-dd")
    endDate = $today.AddDays(14).ToString("yyyy-MM-dd")
}

$scheduledStart = [DateTimeOffset]::UtcNow.AddHours(1)
$item = Invoke-JsonRequest -Method POST -Uri "$BaseUrl/api/v1/study-plans/$($plan.id)/items" -WebSession $studentSession -Body @{
    title = "Integration study session"
    description = "Synthetic integration data"
    type = "STUDY_SESSION"
    scheduledStart = $scheduledStart.ToString("o")
    scheduledEnd = $scheduledStart.AddHours(1).ToString("o")
    dueAt = $scheduledStart.AddHours(2).ToString("o")
    reminderMinutesBefore = 30
}

$completedItem = Invoke-JsonRequest -Method PATCH -Uri "$BaseUrl/api/v1/study-plan-items/$($item.id)/status" -WebSession $studentSession -Headers @{
    "Idempotency-Key" = "e2e-complete-$runId"
} -Body @{ status = "COMPLETED" }
if ($completedItem.status -ne "COMPLETED") {
    throw "Study Plan item did not move to COMPLETED."
}

$calendarFrom = [Uri]::EscapeDataString([DateTimeOffset]::UtcNow.AddDays(-1).ToString("o"))
$calendarTo = [Uri]::EscapeDataString([DateTimeOffset]::UtcNow.AddDays(7).ToString("o"))
$calendar = Invoke-JsonRequest -Method GET -Uri "$BaseUrl/api/v1/calendar?from=$calendarFrom&to=$calendarTo" -WebSession $studentSession
if (-not ($calendar.items.id -contains $item.id)) {
    throw "Created Study Plan item was not projected into Calendar."
}

[pscustomobject]@{
    backend = $health.status
    auth = "PASSED"
    teacherRole = $teacherProfile.role
    studentRole = $studentProfile.role
    courseOfferingId = $offering.id
    enrollmentId = $approvedEnrollment.id
    enrollmentStatus = $approvedEnrollment.status
    studyPlanId = $plan.id
    studyPlanItemId = $completedItem.id
    studyPlanItemStatus = $completedItem.status
    calendarContainsItem = $true
} | ConvertTo-Json
