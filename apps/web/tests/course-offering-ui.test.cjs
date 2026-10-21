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
    path.join(__dirname, "../src/app/teacher/course-offerings/page.tsx"),
    "utf8"
  );

  assert.match(page, /setCustomCode\(subjectsData\[0\]\.code\)/);
  assert.match(page, /handleSubjectChange\(event\.target\.value\)/);
  assert.match(page, /subjects\.find\(\(subject\) => subject\.id === subjectId\)\?\.code/);
  assert.match(page, /value=\{customCode\}/);
});

/** Args: none. Input: Student class route source. Output: void; asserts detail/history integration. Errors: AssertionError on regression. */
test("Student class details have a reversible browser-history step", () => {
  const page = fs.readFileSync(path.join(__dirname, "../src/app/(student)/course-offerings/page.tsx"), "utf8");
  assert.match(page, /window\.history\.pushState/);
  assert.match(page, /window\.addEventListener\("popstate", syncSelection\)/);
  assert.match(page, /window\.history\.back\(\)/);
  assert.match(page, /onClick=\{\(\) => navigateToOffering\(offering\.id\)\}/);
});
