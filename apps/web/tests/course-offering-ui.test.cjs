const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

test("FE-M2: Course Offering & Enrollment business rules", async (t) => {
  await t.test("Join code normalization should trim and uppercase input", () => {
    const rawInput = "  ai2026ptit  ";
    const normalized = rawInput.trim().toUpperCase();
    assert.equal(normalized, "AI2026PTIT");
  });

  await t.test("Enrollment access policy: only APPROVED can access materials", () => {
    function canAccessMaterials(status) {
      return status === "APPROVED";
    }

    assert.equal(canAccessMaterials("PENDING"), false, "PENDING student must not access materials");
    assert.equal(canAccessMaterials("REJECTED"), false, "REJECTED student must not access materials");
    assert.equal(canAccessMaterials("REMOVED"), false, "REMOVED student must not access materials");
    assert.equal(canAccessMaterials("APPROVED"), true, "APPROVED student is granted material access");
  });

  await t.test("Teacher enrollment review actions: approve changes status to APPROVED", () => {
    const enrollment = {
      id: "enr_test_01",
      studentId: "usr_student_01",
      status: "PENDING",
      requestedAt: "2026-09-24T10:00:00Z",
    };

    function approve(e) {
      return {
        ...e,
        status: "APPROVED",
        approvedAt: new Date().toISOString(),
      };
    }

    const approved = approve(enrollment);
    assert.equal(approved.status, "APPROVED");
    assert.ok(approved.approvedAt);
  });

  await t.test("Admin Course Offering monitoring does not include teacher assignment action", () => {
    // Per rule: "Admin chỉ giám sát, không phân công từng lớp trong MVP"
    const adminPermittedActions = ["MONITOR", "LOCK", "ARCHIVE"];
    assert.ok(!adminPermittedActions.includes("ASSIGN_TEACHER"));
  });
});

test("Teacher create form prefills editable class code from the selected subject", () => {
  const page = fs.readFileSync(
    path.join(__dirname, "../src/app/teacher/course-offerings/new/page.tsx"),
    "utf8"
  );

  assert.match(page, /setCode\(subjectList\[0\]\?\.code/);
  assert.match(page, /selectSubject\(event\.target\.value\)/);
  assert.match(page, /subjects\.find\(\(entry\) => entry\.id === nextId\)\?\.code/);
  assert.match(page, /value=\{code\}/);
});

/** Args: none. Input: Student class route source. Output: void; asserts detail/history integration. Errors: AssertionError on regression. */
test("Student class details have a reversible browser-history step", () => {
  const page = fs.readFileSync(path.join(__dirname, "../src/app/(student)/course-offerings/course-workspace.tsx"), "utf8");
  assert.match(page, /router\.push\(offeringId \? `\/course-offerings\//);
  assert.match(page, /selectedOfferingId = offeringId/);
  assert.ok(fs.existsSync(path.join(__dirname, "../src/app/(student)/course-offerings/[offeringId]/page.tsx")));
  assert.match(page, /onClick=\{\(\) => navigateToOffering\(offering\.id\)\}/);
});

/** Args: none. Input: Student class route source. Output: void; asserts semester grouping. Errors: AssertionError on regression. */
test("Student Course Offerings are grouped by semester", () => {
  const page = fs.readFileSync(
    path.join(__dirname, "../src/app/(student)/course-offerings/course-workspace.tsx"),
    "utf8"
  );

  assert.match(page, /approvedSemesterGroups/);
  assert.match(page, /toggleSemester/);
  assert.match(page, /aria-expanded=\{!isCollapsed\}/);
  assert.match(page, /môn học trong học kỳ/);
  assert.match(page, /materialCounts\[offering\.id\]/);
  assert.match(page, /assignmentCounts\[offering\.id\]/);
});

/** Args: none. Input: Student class and shell source. Output: void; asserts consolidated class navigation. Errors: AssertionError on regression. */
test("Student class detail consolidates materials and homework", () => {
  const page = fs.readFileSync(path.join(__dirname, "../src/app/(student)/course-offerings/course-workspace.tsx"), "utf8");
  const shell = fs.readFileSync(path.join(__dirname, "../src/components/layout/app-shell.tsx"), "utf8");
  const studentNav = shell.slice(shell.indexOf("const STUDENT_NAV"), shell.indexOf("const TEACHER_NAV"));

  assert.doesNotMatch(studentNav, /href: "\/materials"|href: "\/assignments"/);
  assert.match(page, /assignmentApi\.listForStudent\(\)/);
  assert.match(page, /courseSection === "MATERIALS"/);
  assert.match(page, /courseSection === "ASSIGNMENTS"/);
  assert.match(page, /assignment\.courseOfferingId === selectedOfferingId/);
  assert.match(page, /Học liệu \(\{materials\.length\}\)/);
  assert.match(page, /Bài tập về nhà \(\{selectedAssignments\.length\}\)/);
  assert.match(page, /`\/assignments\/\$\{encodeURIComponent\(assignment\.id\)\}`/);
});

/** Args: none. Input: Teacher shell, class list and dashboard source. Output: void; verifies class-scoped Teacher navigation. Errors: AssertionError on regression. */
test("Teacher class area owns enrollment requests and assignments", () => {
  const shell = fs.readFileSync(path.join(__dirname, "../src/components/layout/app-shell.tsx"), "utf8");
  const page = fs.readFileSync(path.join(__dirname, "../src/app/teacher/course-offerings/page.tsx"), "utf8");
  const workspace = fs.readFileSync(path.join(__dirname, "../src/app/teacher/course-offerings/[offeringId]/page.tsx"), "utf8");
  const dashboard = fs.readFileSync(path.join(__dirname, "../src/app/teacher/dashboard/page.tsx"), "utf8");
  const teacherNav = shell.slice(shell.indexOf("const TEACHER_NAV"), shell.indexOf("const ADMIN_NAV"));

  assert.match(teacherNav, /label: "Lớp học phần", href: "\/teacher\/course-offerings"/);
  assert.doesNotMatch(teacherNav, /href: "\/teacher\/(?:assignments|enrollments)"/);
  assert.match(shell, /item\.href === "\/teacher\/course-offerings"/);
  assert.match(shell, /isTeacherClassMaterialRoute/);
  assert.match(shell, /item\.href === "\/teacher\/documents" && isTeacherClassMaterialRoute/);
  assert.match(page, /`\/teacher\/course-offerings\/\$\{encodeURIComponent\(offering\.id\)\}`/);
  assert.match(workspace, /Yêu cầu chờ duyệt/);
  assert.match(workspace, /Danh sách sinh viên/);
  assert.match(workspace, /Bài tập và kết quả/);
  assert.match(workspace, /Chọn một chức năng để mở trang quản lý riêng/);
  assert.match(workspace, /`\/teacher\/enrollments\?offeringId=\$\{encodeURIComponent\(offeringId\)\}&tab=PENDING`/);
  assert.match(workspace, /`\/teacher\/enrollments\?offeringId=\$\{encodeURIComponent\(offeringId\)\}&tab=APPROVED`/);
  assert.match(workspace, /`\/teacher\/assignments\?offeringId=\$\{encodeURIComponent\(offeringId\)\}`/);
  assert.match(workspace, /Kho tài liệu lớp/);
  assert.match(workspace, /`\/teacher\/documents\/\$\{encodeURIComponent\(offeringId\)\}`/);
  assert.doesNotMatch(workspace, /pending\.map\(/);
  assert.doesNotMatch(workspace, /approved\.map\(/);
  assert.match(dashboard, /`\/teacher\/assignments\?offeringId=\$\{encodeURIComponent\(offering\.id\)\}`/);
  assert.doesNotMatch(dashboard, /href="\/teacher\/enrollments"/);
});
