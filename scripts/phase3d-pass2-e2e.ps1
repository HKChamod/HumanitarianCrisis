<#
.SYNOPSIS
    HCMS Phase 3D - Pass 2: Consolidated Stateful E2E API Verification Script.
.DESCRIPTION
    Executes the authorized stateful E2E verification workflow against http://localhost:5107/api:
      - Uses $env:HCMS_TEST_ADMIN_EMAIL / $env:HCMS_TEST_ADMIN_PASSWORD if already set in this session,
        otherwise prompts securely (masked password, in-memory only, never persisted or printed).
      - Creates 1 temporary Organization, 1 Approved Admin Membership, 1 CrisisEvent, and 1 CitizenRequest.
      - Verifies my-access, matching & mismatched X-Organization-Id, Organization Settings rename,
        CrisisEvent status transitions (Active -> Resolved -> Closed),
        CitizenRequest status transitions (Pending -> Verified -> Assigned -> Fulfilled),
        and optional non-admin 403 checks.
      - Keeps all temporary records intact (NO cleanup/deletion).
      - Never prints passwords, JWTs, or Authorization headers.
#>

[CmdletBinding()]
param(
    [string]$ApiBaseUrl = "http://localhost:5107/api"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$script:Passed = 0
$script:Failed = 0
$script:Skipped = 0
$script:CreatedRecords = [ordered]@{
    OrganizationId = $null
    MembershipId   = $null
    CrisisId       = $null
    RequestId      = $null
    AreaIdUsed     = $null
}

function Write-Pass {
    param([string]$Message)
    Write-Host "  [PASS] $Message" -ForegroundColor Green
    $script:Passed++
}

function Write-Fail {
    param([string]$Message)
    Write-Host "  [FAIL] $Message" -ForegroundColor Red
    $script:Failed++
}

function Write-Skip {
    param([string]$Message)
    Write-Host "  [SKIP] $Message" -ForegroundColor Yellow
    $script:Skipped++
}

function Assert-Condition {
    param(
        [bool]$Condition,
        [string]$Message
    )
    if ($Condition) {
        Write-Pass $Message
    } else {
        Write-Fail $Message
    }
    return $Condition
}

function Invoke-SafeApiRequest {
    param(
        [Parameter(Mandatory = $true)][string]$Method,
        [Parameter(Mandatory = $true)][string]$Path,
        [hashtable]$Headers = @{},
        [object]$Body = $null
    )

    $uri = "$ApiBaseUrl$Path"
    $requestHeaders = @{ "Accept" = "application/json" }
    foreach ($k in $Headers.Keys) {
        $requestHeaders[$k] = $Headers[$k]
    }

    $params = @{
        Uri         = $uri
        Method      = $Method
        Headers     = $requestHeaders
        UseBasicParsing = $true
    }

    if ($null -ne $Body) {
        $params["ContentType"] = "application/json"
        $params["Body"] = ($Body | ConvertTo-Json -Depth 10)
    }

    try {
        $resp = Invoke-WebRequest @params
        $raw = $resp.Content
        $json = $null
        if (-not [string]::IsNullOrWhiteSpace($raw)) {
            try { $json = $raw | ConvertFrom-Json } catch { $json = $null }
        }
        return [PSCustomObject]@{
            StatusCode = [int]$resp.StatusCode
            Json       = $json
            SafeError  = $null
        }
    } catch {
        $statusCode = 0
        $rawBody = ""
        if ($_.Exception.Response) {
            try { $statusCode = [int]$_.Exception.Response.StatusCode } catch { $statusCode = 0 }
            try {
                $stream = $_.Exception.Response.GetResponseStream()
                if ($stream) {
                    $reader = New-Object System.IO.StreamReader($stream)
                    $rawBody = $reader.ReadToEnd()
                    $reader.Dispose()
                }
            } catch {
                $rawBody = ""
            }
        }

        $json = $null
        $safeError = $_.Exception.Message
        if (-not [string]::IsNullOrWhiteSpace($rawBody)) {
            try {
                $json = $rawBody | ConvertFrom-Json
                $parts = @()
                if ($json.PSObject.Properties["title"] -and $json.title) { $parts += $json.title }
                if ($json.PSObject.Properties["detail"] -and $json.detail) { $parts += $json.detail }
                if ($json.PSObject.Properties["message"] -and $json.message) { $parts += $json.message }
                if ($parts.Count -gt 0) {
                    $safeError = ($parts -join " - ")
                }
            } catch {
                $safeError = ($rawBody -replace "Bearer\s+\S+", "Bearer [REDACTED]")
                if ($safeError.Length -gt 240) { $safeError = $safeError.Substring(0, 240) }
            }
        }

        return [PSCustomObject]@{
            StatusCode = $statusCode
            Json       = $json
            SafeError  = $safeError
        }
    }
}

Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host " HCMS Phase 3D - Pass 2: Consolidated Stateful E2E Verification" -ForegroundColor Cyan
Write-Host " API: $ApiBaseUrl" -ForegroundColor Cyan
Write-Host " Mode: Keep all created temporary records (NO cleanup)" -ForegroundColor Cyan
Write-Host "=================================================================`n" -ForegroundColor Cyan

# --- STEP 0: UNAUTHENTICATED 401 CHECK ---
Write-Host "--- Step 0: Unauthenticated 401 Enforcement ---" -ForegroundColor White
$unauthAreas = Invoke-SafeApiRequest -Method "GET" -Path "/Areas"
Assert-Condition ($unauthAreas.StatusCode -eq 401) "Unauthenticated GET /api/Areas returns HTTP 401 (actual: $($unauthAreas.StatusCode))" | Out-Null

# --- STEP 1: ADMIN CREDENTIALS (SESSION ENV OR SECURE PROMPT) ---
Write-Host "`n--- Step 1: System Administrator Authentication & /Auth/me ---" -ForegroundColor White
$adminEmail = $env:HCMS_TEST_ADMIN_EMAIL
$adminPassword = $env:HCMS_TEST_ADMIN_PASSWORD
$promptedCreds = $false

if ([string]::IsNullOrWhiteSpace($adminEmail)) {
    $adminEmail = (Read-Host "Enter HCMS System Administrator Email").Trim()
    $promptedCreds = $true
}
if ([string]::IsNullOrWhiteSpace($adminPassword)) {
    $secPass = Read-Host "Enter HCMS System Administrator Password" -AsSecureString
    $adminPassword = [System.Net.NetworkCredential]::new("", $secPass).Password
    $secPass.Dispose()
    $promptedCreds = $true
}

$loginResp = Invoke-SafeApiRequest -Method "POST" -Path "/Auth/login" -Body @{
    email    = $adminEmail
    password = $adminPassword
}
$loginOk = Assert-Condition ($loginResp.StatusCode -eq 200 -and $null -ne $loginResp.Json -and -not [string]::IsNullOrWhiteSpace($loginResp.Json.accessToken)) `
    "POST /api/Auth/login returns HTTP 200 with JWT accessToken (actual: $($loginResp.StatusCode))"

if (-not $loginOk) {
    Write-Host "  Diagnostics: $($loginResp.SafeError)" -ForegroundColor Red
    Write-Host "`nStopping stateful tests because Admin authentication failed." -ForegroundColor Red
    exit 1
}

$adminHeaders = @{
    "Authorization" = "Bearer $($loginResp.Json.accessToken)"
}

$meResp = Invoke-SafeApiRequest -Method "GET" -Path "/Auth/me" -Headers $adminHeaders
Assert-Condition ($meResp.StatusCode -eq 200) "GET /api/Auth/me returns HTTP 200 (actual: $($meResp.StatusCode))" | Out-Null
if ($meResp.StatusCode -eq 200 -and $null -ne $meResp.Json) {
    $hasAdminRole = $meResp.Json.roles -contains "Administrator"
    Assert-Condition $hasAdminRole "Authenticated user has Administrator role (UserId: $($meResp.Json.userId), Permissions: $($meResp.Json.permissions.Count))" | Out-Null
}

# --- STEP 2: CREATE ONE TEMPORARY ORGANIZATION ---
Write-Host "`n--- Step 2: Create Temporary Organization ---" -ForegroundColor White
$existingOrgsResp = Invoke-SafeApiRequest -Method "GET" -Path "/Organizations" -Headers $adminHeaders
Assert-Condition ($existingOrgsResp.StatusCode -eq 200) "GET /api/Organizations pre-check returns HTTP 200 (actual: $($existingOrgsResp.StatusCode))" | Out-Null

$duplicateOrg = $null
if ($existingOrgsResp.StatusCode -eq 200 -and $null -ne $existingOrgsResp.Json) {
    $duplicateOrg = @($existingOrgsResp.Json) | Where-Object {
        $_.registrationNumber -eq "RT-TEST-ORG-001" -or
        $_.organizationName -eq "HCMS Runtime Test Relief Org" -or
        $_.organizationName -eq "HCMS Runtime Test Relief Org - Renamed"
    } | Select-Object -First 1
}

if ($null -ne $duplicateOrg) {
    Write-Fail "Aborting Step 2: A test organization already exists (OrganizationId=$($duplicateOrg.organizationId), Name='$($duplicateOrg.organizationName)'). Stopping to avoid modifying or duplicating existing records."
    exit 1
}

$createOrgPayload = @{
    organizationName   = "HCMS Runtime Test Relief Org"
    organizationType   = "NGO"
    registrationNumber = "RT-TEST-ORG-001"
    description        = "Temporary organization for Phase 3D E2E verification."
    email              = "runtime-test-org@hcms.local"
    phoneNumber        = "+94112000001"
    address            = "100 Test Command Road, Matale"
}

$createOrgResp = Invoke-SafeApiRequest -Method "POST" -Path "/Organizations" -Headers $adminHeaders -Body $createOrgPayload
$orgCreated = Assert-Condition ($createOrgResp.StatusCode -eq 201 -and $null -ne $createOrgResp.Json.organizationId) `
    "POST /api/Organizations returns HTTP 201 Created (actual: $($createOrgResp.StatusCode))"

if (-not $orgCreated) {
    Write-Host "  Diagnostics: $($createOrgResp.SafeError)" -ForegroundColor Red
    exit 1
}

$orgId = [int]$createOrgResp.Json.organizationId
$script:CreatedRecords.OrganizationId = $orgId
Write-Host "  Created OrganizationId: $orgId" -ForegroundColor Cyan

# --- STEP 3: CREATE & APPROVE ADMIN MEMBERSHIP + VERIFY ACCESS & HEADERS ---
Write-Host "`n--- Step 3: Create & Approve Admin Membership + Access Validation ---" -ForegroundColor White
$reqMemResp = Invoke-SafeApiRequest -Method "POST" -Path "/Organizations/$orgId/members" -Headers $adminHeaders
$memCreated = Assert-Condition ($reqMemResp.StatusCode -eq 201 -and $null -ne $reqMemResp.Json.membershipId -and $reqMemResp.Json.membershipStatus -eq "Pending") `
    "POST /api/Organizations/$orgId/members returns HTTP 201 with Pending status (actual: $($reqMemResp.StatusCode), status: $($reqMemResp.Json.membershipStatus))"

if ($memCreated) {
    $membershipId = [int]$reqMemResp.Json.membershipId
    $script:CreatedRecords.MembershipId = $membershipId
    Write-Host "  Created MembershipId: $membershipId" -ForegroundColor Cyan

    $approveResp = Invoke-SafeApiRequest -Method "PATCH" -Path "/Organizations/$orgId/members/$membershipId/approve" -Headers $adminHeaders
    Assert-Condition ($approveResp.StatusCode -eq 200 -and $approveResp.Json.membershipStatus -eq "Approved") `
        "PATCH /api/Organizations/$orgId/members/$membershipId/approve returns HTTP 200 Approved (actual: $($approveResp.StatusCode), status: $($approveResp.Json.membershipStatus))" | Out-Null

    $myMemResp = Invoke-SafeApiRequest -Method "GET" -Path "/Organizations/my-memberships" -Headers $adminHeaders
    $foundApproved = $false
    if ($myMemResp.StatusCode -eq 200 -and $null -ne $myMemResp.Json) {
        $match = @($myMemResp.Json) | Where-Object { [int]$_.organizationId -eq $orgId -and $_.membershipStatus -eq "Approved" -and $_.isOrganizationActive -eq $true }
        $foundApproved = ($null -ne $match)
    }
    Assert-Condition ($myMemResp.StatusCode -eq 200 -and $foundApproved) `
        "GET /api/Organizations/my-memberships includes Approved active membership for OrgId=$orgId (actual: $($myMemResp.StatusCode))" | Out-Null

    $matchingHeaders = @{
        "Authorization"     = $adminHeaders["Authorization"]
        "X-Organization-Id" = "$orgId"
    }
    $myAccessMatch = Invoke-SafeApiRequest -Method "GET" -Path "/Organizations/$orgId/my-access" -Headers $matchingHeaders
    Assert-Condition ($myAccessMatch.StatusCode -eq 200 -and [int]$myAccessMatch.Json.organizationId -eq $orgId -and $myAccessMatch.Json.membershipStatus -eq "Approved") `
        "GET /api/Organizations/$orgId/my-access with matching X-Organization-Id=$orgId returns HTTP 200 Approved (actual: $($myAccessMatch.StatusCode))" | Out-Null

    $mismatchedOrgId = $orgId + 99999
    $mismatchHeaders = @{
        "Authorization"     = $adminHeaders["Authorization"]
        "X-Organization-Id" = "$mismatchedOrgId"
    }
    $myAccessMismatch = Invoke-SafeApiRequest -Method "GET" -Path "/Organizations/$orgId/my-access" -Headers $mismatchHeaders
    Assert-Condition ($myAccessMismatch.StatusCode -eq 403) `
        "GET /api/Organizations/$orgId/my-access with mismatched X-Organization-Id=$mismatchedOrgId returns HTTP 403 Forbidden (actual: $($myAccessMismatch.StatusCode))" | Out-Null
}

# --- STEP 4: ORGANIZATION SETTINGS (GET -> PUT RENAME -> VERIFY) ---
Write-Host "`n--- Step 4: Organization Settings Profile Read & Rename ---" -ForegroundColor White
$getOrgResp = Invoke-SafeApiRequest -Method "GET" -Path "/Organizations/$orgId" -Headers $adminHeaders
Assert-Condition ($getOrgResp.StatusCode -eq 200 -and $getOrgResp.Json.organizationName -eq "HCMS Runtime Test Relief Org") `
    "GET /api/Organizations/$orgId returns HTTP 200 with initial name (actual: $($getOrgResp.StatusCode))" | Out-Null

$renamedName = "HCMS Runtime Test Relief Org - Renamed"
$updateOrgPayload = @{
    organizationName   = $renamedName
    organizationType   = "NGO"
    registrationNumber = "RT-TEST-ORG-001"
    description        = "Temporary organization for Phase 3D E2E verification (renamed)."
    email              = "runtime-test-org@hcms.local"
    phoneNumber        = "+94112000001"
    address            = "100 Test Command Road, Matale"
    isActive           = $true
}

$putOrgResp = Invoke-SafeApiRequest -Method "PUT" -Path "/Organizations/$orgId" -Headers $adminHeaders -Body $updateOrgPayload
Assert-Condition ($putOrgResp.StatusCode -eq 200 -and $putOrgResp.Json.organizationName -eq $renamedName) `
    "PUT /api/Organizations/$orgId returns HTTP 200 with renamed organizationName (actual: $($putOrgResp.StatusCode))" | Out-Null

$verifyOrgResp = Invoke-SafeApiRequest -Method "GET" -Path "/Organizations/$orgId" -Headers $adminHeaders
Assert-Condition ($verifyOrgResp.StatusCode -eq 200 -and $verifyOrgResp.Json.organizationName -eq $renamedName) `
    "Subsequent GET /api/Organizations/$orgId confirms persisted renamed organizationName" | Out-Null

$verifyMemRenameResp = Invoke-SafeApiRequest -Method "GET" -Path "/Organizations/my-memberships" -Headers $adminHeaders
$renamedInMemberships = $false
if ($verifyMemRenameResp.StatusCode -eq 200 -and $null -ne $verifyMemRenameResp.Json) {
    $m = @($verifyMemRenameResp.Json) | Where-Object { [int]$_.organizationId -eq $orgId -and $_.organizationName -eq $renamedName }
    $renamedInMemberships = ($null -ne $m)
}
Assert-Condition $renamedInMemberships `
    "GET /api/Organizations/my-memberships reflects renamed organizationName for shell propagation" | Out-Null

# --- STEP 5: CRISIS EVENT LIFECYCLE ---
Write-Host "`n--- Step 5: Crisis Event Lifecycle & Status Transitions ---" -ForegroundColor White
$createCrisisPayload = @{
    crisisName    = "Phase 3D Runtime Test Monsoon Flood"
    crisisType    = "Flood"
    description   = "Temporary crisis event created for Phase 3D stateful E2E verification."
    severityLevel = "High"
    startDate     = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
}

$createCrisisResp = Invoke-SafeApiRequest -Method "POST" -Path "/CrisisEvents" -Headers $adminHeaders -Body $createCrisisPayload
$crisisCreated = Assert-Condition ($createCrisisResp.StatusCode -eq 201 -and $null -ne $createCrisisResp.Json.crisisId -and $createCrisisResp.Json.status -eq "Active") `
    "POST /api/CrisisEvents returns HTTP 201 Created with initial status=Active (actual: $($createCrisisResp.StatusCode), status: $($createCrisisResp.Json.status))"

$crisisId = $null
if ($crisisCreated) {
    $crisisId = [int]$createCrisisResp.Json.crisisId
    $script:CreatedRecords.CrisisId = $crisisId
    Write-Host "  Created CrisisId: $crisisId" -ForegroundColor Cyan

    $getCrisisResp = Invoke-SafeApiRequest -Method "GET" -Path "/CrisisEvents/$crisisId" -Headers $adminHeaders
    Assert-Condition ($getCrisisResp.StatusCode -eq 200 -and $getCrisisResp.Json.status -eq "Active") `
        "GET /api/CrisisEvents/$crisisId returns HTTP 200 with status=Active (actual: $($getCrisisResp.StatusCode))" | Out-Null

    foreach ($nextCrisisStatus in @("Resolved", "Closed")) {
        $patchCrisis = Invoke-SafeApiRequest -Method "PATCH" -Path "/CrisisEvents/$crisisId/status" -Headers $adminHeaders -Body @{ status = $nextCrisisStatus }
        Assert-Condition ($patchCrisis.StatusCode -eq 200 -and $patchCrisis.Json.status -eq $nextCrisisStatus) `
            "PATCH /api/CrisisEvents/$crisisId/status -> $nextCrisisStatus returns HTTP 200 (actual: $($patchCrisis.StatusCode))" | Out-Null

        $verifyCrisis = Invoke-SafeApiRequest -Method "GET" -Path "/CrisisEvents/$crisisId" -Headers $adminHeaders
        Assert-Condition ($verifyCrisis.StatusCode -eq 200 -and $verifyCrisis.Json.status -eq $nextCrisisStatus) `
            "GET /api/CrisisEvents/$crisisId confirms persisted status=$nextCrisisStatus" | Out-Null
    }
}

# --- STEP 6: CITIZEN REQUEST LIFECYCLE ---
Write-Host "`n--- Step 6: Geographic Areas & Citizen Request Lifecycle ---" -ForegroundColor White
$areasResp = Invoke-SafeApiRequest -Method "GET" -Path "/Areas" -Headers $adminHeaders
$activeArea = $null
if ($areasResp.StatusCode -eq 200 -and $null -ne $areasResp.Json) {
    $activeArea = @($areasResp.Json) | Where-Object { $_.isActive -eq $true } | Select-Object -First 1
}
$areaFound = Assert-Condition ($areasResp.StatusCode -eq 200 -and $null -ne $activeArea) `
    "GET /api/Areas returns HTTP 200 with at least one active Area (actual: $($areasResp.StatusCode), count: $(@($areasResp.Json).Count))"

if ($areaFound) {
    $areaId = [int]$activeArea.areaId
    $script:CreatedRecords.AreaIdUsed = $areaId
    $areaByIdResp = Invoke-SafeApiRequest -Method "GET" -Path "/Areas/$areaId" -Headers $adminHeaders
    Assert-Condition ($areaByIdResp.StatusCode -eq 200 -and [int]$areaByIdResp.Json.areaId -eq $areaId) `
        "GET /api/Areas/$areaId returns HTTP 200 for '$($activeArea.areaName)' (actual: $($areaByIdResp.StatusCode))" | Out-Null

    $createReqPayload = @{
        requestType  = "Food"
        description  = "Temporary aid request for Phase 3D stateful status transition verification."
        urgencyLevel = "High"
        peopleCount  = 4
        areaId       = $areaId
        crisisId     = $crisisId
        address      = "Test Shelter Point, Matale"
        latitude     = 7.4675
        longitude    = 80.6234
    }

    $createReqResp = Invoke-SafeApiRequest -Method "POST" -Path "/CitizenRequests" -Headers $adminHeaders -Body $createReqPayload
    $reqCreated = Assert-Condition ($createReqResp.StatusCode -eq 201 -and $null -ne $createReqResp.Json.requestId -and $createReqResp.Json.status -eq "Pending") `
        "POST /api/CitizenRequests returns HTTP 201 Created with initial status=Pending (actual: $($createReqResp.StatusCode), status: $($createReqResp.Json.status))"

    if ($reqCreated) {
        $requestId = [int]$createReqResp.Json.requestId
        $script:CreatedRecords.RequestId = $requestId
        Write-Host "  Created RequestId: $requestId (linked to AreaId=$areaId, CrisisId=$crisisId)" -ForegroundColor Cyan

        $getReqResp = Invoke-SafeApiRequest -Method "GET" -Path "/CitizenRequests/$requestId" -Headers $adminHeaders
        Assert-Condition ($getReqResp.StatusCode -eq 200 -and $getReqResp.Json.status -eq "Pending") `
            "GET /api/CitizenRequests/$requestId returns HTTP 200 with status=Pending (actual: $($getReqResp.StatusCode))" | Out-Null

        foreach ($nextReqStatus in @("Verified", "Assigned", "Fulfilled")) {
            $patchReq = Invoke-SafeApiRequest -Method "PATCH" -Path "/CitizenRequests/$requestId/status" -Headers $adminHeaders -Body @{ status = $nextReqStatus }
            Assert-Condition ($patchReq.StatusCode -eq 200 -and $patchReq.Json.status -eq $nextReqStatus) `
                "PATCH /api/CitizenRequests/$requestId/status -> $nextReqStatus returns HTTP 200 (actual: $($patchReq.StatusCode))" | Out-Null

            $verifyReq = Invoke-SafeApiRequest -Method "GET" -Path "/CitizenRequests/$requestId" -Headers $adminHeaders
            Assert-Condition ($verifyReq.StatusCode -eq 200 -and $verifyReq.Json.status -eq $nextReqStatus) `
                "GET /api/CitizenRequests/$requestId confirms persisted status=$nextReqStatus" | Out-Null
        }
    }
}

# --- STEP 7: OPTIONAL NON-ADMIN 403 VERIFICATION ---
Write-Host "`n--- Step 7: Optional Non-Admin 403 Enforcement ---" -ForegroundColor White
$citizenEmail = $env:HCMS_TEST_CITIZEN_EMAIL
$citizenPassword = $env:HCMS_TEST_CITIZEN_PASSWORD

if ([string]::IsNullOrWhiteSpace($citizenEmail) -or [string]::IsNullOrWhiteSpace($citizenPassword)) {
    Write-Skip "Non-admin 403 checks skipped (HCMS_TEST_CITIZEN_EMAIL / HCMS_TEST_CITIZEN_PASSWORD not set in session)."
} else {
    $citLogin = Invoke-SafeApiRequest -Method "POST" -Path "/Auth/login" -Body @{
        email    = $citizenEmail
        password = $citizenPassword
    }
    if (Assert-Condition ($citLogin.StatusCode -eq 200 -and -not [string]::IsNullOrWhiteSpace($citLogin.Json.accessToken)) `
        "Non-admin login returns HTTP 200 (actual: $($citLogin.StatusCode))") {
        $citHeaders = @{ "Authorization" = "Bearer $($citLogin.Json.accessToken)" }

        $citOrg403 = Invoke-SafeApiRequest -Method "POST" -Path "/Organizations" -Headers $citHeaders -Body @{
            organizationName = "Unauthorized Org Attempt"
            organizationType = "NGO"
        }
        Assert-Condition ($citOrg403.StatusCode -eq 403) "Non-admin POST /api/Organizations returns HTTP 403 Forbidden (actual: $($citOrg403.StatusCode))" | Out-Null

        if ($null -ne $crisisId) {
            $citCrisis403 = Invoke-SafeApiRequest -Method "PATCH" -Path "/CrisisEvents/$crisisId/status" -Headers $citHeaders -Body @{ status = "Active" }
            Assert-Condition ($citCrisis403.StatusCode -eq 403) "Non-admin PATCH /api/CrisisEvents/$crisisId/status returns HTTP 403 Forbidden (actual: $($citCrisis403.StatusCode))" | Out-Null
        }

        if ($null -ne $script:CreatedRecords.RequestId) {
            $reqId = $script:CreatedRecords.RequestId
            $citReq403 = Invoke-SafeApiRequest -Method "PATCH" -Path "/CitizenRequests/$reqId/status" -Headers $citHeaders -Body @{ status = "Rejected" }
            Assert-Condition ($citReq403.StatusCode -eq 403) "Non-admin PATCH /api/CitizenRequests/$reqId/status returns HTTP 403 Forbidden (actual: $($citReq403.StatusCode))" | Out-Null
        }

        $citMeAfter403 = Invoke-SafeApiRequest -Method "GET" -Path "/Auth/me" -Headers $citHeaders
        Assert-Condition ($citMeAfter403.StatusCode -eq 200) "Non-admin GET /api/Auth/me still returns HTTP 200 after 403 responses (session preserved)" | Out-Null
    }
}

# --- STEP 8: RE-RUN AUTOMATED SMOKE SUITE (testIntegration.mjs) ---
Write-Host "`n--- Step 8: Post-Workflow Smoke Suite (Frontend/src/testIntegration.mjs) ---" -ForegroundColor White
$prevEmail = $env:HCMS_TEST_ADMIN_EMAIL
$prevPass = $env:HCMS_TEST_ADMIN_PASSWORD
try {
    if ($promptedCreds) {
        $env:HCMS_TEST_ADMIN_EMAIL = $adminEmail
        $env:HCMS_TEST_ADMIN_PASSWORD = $adminPassword
    }
    node "Frontend/src/testIntegration.mjs"
    $smokeExit = $LASTEXITCODE
    Assert-Condition ($smokeExit -eq 0) "Frontend/src/testIntegration.mjs completed with exit code 0 (actual: $smokeExit)" | Out-Null
} finally {
    if ($promptedCreds) {
        $env:HCMS_TEST_ADMIN_EMAIL = $prevEmail
        $env:HCMS_TEST_ADMIN_PASSWORD = $prevPass
    }
}

# --- SUMMARY ---
Write-Host "`n=================================================================" -ForegroundColor Cyan
Write-Host " CREATED TEMPORARY RECORDS (KEPT INTACT - NO CLEANUP PERFORMED)" -ForegroundColor Cyan
Write-Host "   OrganizationId : $($script:CreatedRecords.OrganizationId)" -ForegroundColor White
Write-Host "   MembershipId   : $($script:CreatedRecords.MembershipId)" -ForegroundColor White
Write-Host "   CrisisId       : $($script:CreatedRecords.CrisisId)" -ForegroundColor White
Write-Host "   RequestId      : $($script:CreatedRecords.RequestId)" -ForegroundColor White
Write-Host "   AreaId (reused): $($script:CreatedRecords.AreaIdUsed)" -ForegroundColor White
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host " SUMMARY: $($script:Passed) PASSED | $($script:Failed) FAILED | $($script:Skipped) SKIPPED" -ForegroundColor Cyan
Write-Host "=================================================================" -ForegroundColor Cyan

if ($script:Failed -gt 0) {
    exit 1
}
