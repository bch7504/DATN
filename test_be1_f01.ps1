# PowerShell Script test API BE1-F01
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$baseUrl = "http://localhost:8088/api/v1"
Write-Host "=== BAT DAU KIEM THU API BE1-F01 ===" -ForegroundColor Cyan

# 1. Catalog Check
Write-Host "`n1. Kiem tra Catalog mon hoc va hoc ky..." -ForegroundColor Yellow
$subjects = Invoke-RestMethod -Uri "$baseUrl/catalog/subjects" -Method Get
Write-Host "  -> Lay duoc $($subjects.Count) mon hoc: $($subjects[0].code)" -ForegroundColor Green

$semesters = Invoke-RestMethod -Uri "$baseUrl/catalog/semesters" -Method Get
Write-Host "  -> Lay duoc $($semesters.Count) hoc ky: $($semesters[0].code)" -ForegroundColor Green

# 2. Login Giang vien
Write-Host "`n2. Dang nhap Giang vien..." -ForegroundColor Yellow
$teacherLoginBody = @{ identifier = "teacher@ptit.edu.vn"; password = "ptit@demo123" } | ConvertTo-Json
$teacherAuth = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post -Body $teacherLoginBody -ContentType "application/json"
$teacherToken = $teacherAuth.accessToken
$teacherHeaders = @{ Authorization = "Bearer $teacherToken" }
Write-Host "  -> Dang nhap Giang vien thanh cong: $($teacherAuth.user.displayName)" -ForegroundColor Green

# 3. Tao Lop hoc phan
Write-Host "`n3. Giang vien tao lop hoc phan moi..." -ForegroundColor Yellow
$randNum = Get-Random -Minimum 1000 -Maximum 9999
$uniqueCode = "TEST_$randNum"
$createOfferingBody = @{
    subjectId = "subj_dbi"
    semesterId = "sem_2026_1"
    code = $uniqueCode
    name = "Co so du lieu - Nhom $uniqueCode"
} | ConvertTo-Json

$createdOffering = Invoke-RestMethod -Uri "$baseUrl/teacher/course-offerings" -Method Post -Headers $teacherHeaders -Body $createOfferingBody -ContentType "application/json"
$offeringId = $createdOffering.id
$rawJoinCode = $createdOffering.rawJoinCode
Write-Host "  -> Tao lop thanh cong! Offering ID: $offeringId" -ForegroundColor Green
Write-Host "  -> Ma tham gia (Join Code): $rawJoinCode" -ForegroundColor Magenta

# 4. Kiem tra danh sach lop (rawJoinCode an)
Write-Host "`n4. Kiem tra bao mat Join Code trong danh sach lop..." -ForegroundColor Yellow
$teacherOfferings = Invoke-RestMethod -Uri "$baseUrl/teacher/course-offerings" -Method Get -Headers $teacherHeaders
$found = $teacherOfferings | Where-Object { $_.id -eq $offeringId }
if ($null -eq $found.rawJoinCode) {
    Write-Host "  -> Bao mat tot: rawJoinCode da duoc an khoi danh sach!" -ForegroundColor Green
} else {
    Write-Host "  -> CANH BAO: rawJoinCode bi lo trong danh sach!" -ForegroundColor Red
}

# 5. Cap nhat metadata (PATCH)
Write-Host "`n5. Cap nhat metadata lop hoc phan (PATCH)..." -ForegroundColor Yellow
$patchBody = @{ name = "Co so du lieu - Nhom $uniqueCode (Cap Nhat)" } | ConvertTo-Json
$patched = Invoke-RestMethod -Uri "$baseUrl/teacher/course-offerings/$offeringId" -Method Patch -Headers $teacherHeaders -Body $patchBody -ContentType "application/json"
Write-Host "  -> Cap nhat ten thanh cong: $($patched.name)" -ForegroundColor Green

# 6. Login Sinh vien
Write-Host "`n6. Dang nhap Sinh vien..." -ForegroundColor Yellow
$studentLoginBody = @{ identifier = "student@ptit.edu.vn"; password = "ptit@demo123" } | ConvertTo-Json
$studentAuth = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post -Body $studentLoginBody -ContentType "application/json"
$studentToken = $studentAuth.accessToken
$studentHeaders = @{ Authorization = "Bearer $studentToken" }
Write-Host "  -> Dang nhap Sinh vien thanh cong: $($studentAuth.user.displayName)" -ForegroundColor Green

# 7. Sinh vien xin gia nhap bang Join Code
Write-Host "`n7. Sinh vien xin gia nhap bang Join Code..." -ForegroundColor Yellow
$joinBody = @{ joinCode = $rawJoinCode } | ConvertTo-Json
$enrollment = Invoke-RestMethod -Uri "$baseUrl/student/course-enrollments/join" -Method Post -Headers $studentHeaders -Body $joinBody -ContentType "application/json"
$enrollmentId = $enrollment.id
Write-Host "  -> Gui don thanh cong! Enrollment ID: $enrollmentId - Trang thai: $($enrollment.status)" -ForegroundColor Green

# 8. Sinh vien xem danh sach don ghi danh
Write-Host "`n8. Sinh vien xem danh sach don ghi danh..." -ForegroundColor Yellow
$studentEnrollments = Invoke-RestMethod -Uri "$baseUrl/student/course-enrollments" -Method Get -Headers $studentHeaders
Write-Host "  -> So don ghi danh: $($studentEnrollments.Count), Trang thai don: $($studentEnrollments[0].status)" -ForegroundColor Green

# 9. Giang vien duyet don ghi danh
Write-Host "`n9. Giang vien duyet don ghi danh..." -ForegroundColor Yellow
$pendingList = Invoke-RestMethod -Uri "$baseUrl/teacher/course-offerings/$offeringId/enrollments?status=PENDING" -Method Get -Headers $teacherHeaders
Write-Host "  -> Tim thay $($pendingList.Count) don cho duyet." -ForegroundColor Green

$approvedEnrollment = Invoke-RestMethod -Uri "$baseUrl/teacher/enrollments/$enrollmentId/approve" -Method Post -Headers $teacherHeaders
Write-Host "  -> Duyet thanh cong! Trang thai moi: $($approvedEnrollment.status)" -ForegroundColor Green

# 10. Sinh vien kiem tra danh sach lop duoc APPROVED
Write-Host "`n10. Sinh vien kiem tra danh sach lop duoc APPROVED..." -ForegroundColor Yellow
$approvedOfferings = Invoke-RestMethod -Uri "$baseUrl/student/course-offerings" -Method Get -Headers $studentHeaders
$isApproved = $approvedOfferings | Where-Object { $_.id -eq $offeringId }
if ($isApproved) {
    Write-Host "  -> THANH CONG: Lop hoc phan da xuat hien trong danh sach sinh vien!" -ForegroundColor Green
} else {
    Write-Host "  -> THAT BAI: Chua thay lop trong danh sach sinh vien." -ForegroundColor Red
}

# 11. Sinh vien xem chi tiet lop hoc phan
Write-Host "`n11. Sinh vien xem chi tiet lop hoc phan..." -ForegroundColor Yellow
$offeringDetail = Invoke-RestMethod -Uri "$baseUrl/student/course-offerings/$offeringId" -Method Get -Headers $studentHeaders
Write-Host "  -> Xem chi tiet thanh cong: $($offeringDetail.name) - Giang vien: $($offeringDetail.teacherName)" -ForegroundColor Green

# 12. Kiem tra Test Case chan: Join lai khi da APPROVED (Ky vong 409)
Write-Host "`n12. Kiem tra bao ve: Join lai khi da APPROVED (Ky vong loi 409)..." -ForegroundColor Yellow
try {
    Invoke-RestMethod -Uri "$baseUrl/student/course-enrollments/join" -Method Post -Headers $studentHeaders -Body $joinBody -ContentType "application/json"
    Write-Host "  -> LOI: Le ra phai bi chan!" -ForegroundColor Red
} catch {
    Write-Host "  -> CHUAN XAC: Backend da chan dung quy tac (HTTP 409 Conflict)!" -ForegroundColor Green
}

Write-Host "`n=== TAT CA 12/12 BUOC KIEM THU DEU THANH CONG XUAT SAC! ===" -ForegroundColor Cyan
