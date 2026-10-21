const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const client = fs.readFileSync(path.join(__dirname, "../src/lib/api-client.ts"), "utf8");
const studentPage = fs.readFileSync(path.join(__dirname, "../src/app/(student)/assignments/page.tsx"), "utf8");
const teacherPage = fs.readFileSync(path.join(__dirname, "../src/app/teacher/assignments/page.tsx"), "utf8");
const loginPage = fs.readFileSync(path.join(__dirname, "../src/app/(auth)/login/page.tsx"), "utf8");

test("Class assignments use persisted Java API data without a demo fallback", async (t) => {
  await t.test("Teacher and Student assignment operations call Java", () => {
    assert.match(client, /listForTeacher: \(offeringId: string\): Promise<CourseAssignment\[]> => apiFetch/);
    assert.match(client, /create: \(offeringId: string[\s\S]*?=> apiFetch/);
    assert.match(client, /publish: \(assignmentId: string\): Promise<CourseAssignment> => apiFetch/);
    assert.match(client, /stats: \(assignmentId: string\): Promise<AssignmentStats> => apiFetch/);
    assert.match(client, /listForStudent: \(\): Promise<CourseAssignment\[]> => apiFetch\("\/student\/assignments"\)/);
    assert.doesNotMatch(client, /demoAssignments|demoSubmission|DEMO_FILE_NOT_STORED/);
  });

  await t.test("Authentication and login UI do not expose synthetic demo accounts", () => {
    assert.doesNotMatch(loginPage, /handleQuickDemo|Đăng nhập nhanh|admin@ptit/);
    const authApi = client.slice(client.indexOf("export const authApi"), client.indexOf("export const catalogApi"));
    assert.doesNotMatch(authApi, /isDemoMode|DEMO_USERS|findDemoUser/);
  });

  await t.test("Student submissions and downloads always use Java", () => {
    assert.match(client, /student\/assignments\/\$\{encodeURIComponent\(assignmentId\)\}\/submissions/);
    assert.match(client, /downloadForStudent: .*apiDownload/);
    assert.match(client, /downloadForTeacher: .*apiDownload/);
    assert.doesNotMatch(studentPage, /Chế độ demo|lưu tạm trong phiên/);
  });

  await t.test("Both role pages remain available and show real request failures", () => {
    assert.match(teacherPage, /assignmentApi\.listForTeacher/);
    assert.match(studentPage, /assignmentApi\.listForStudent/);
    assert.match(teacherPage, /window\.history\.pushState/);
    assert.match(studentPage, /window\.history\.pushState/);
    assert.match(teacherPage, /window\.addEventListener\("popstate", syncSelection\)/);
    assert.match(studentPage, /window\.addEventListener\("popstate", syncSelection\)/);
    assert.match(studentPage, /window\.history\.back\(\)/);
    assert.doesNotMatch(`${teacherPage}\n${studentPage}`, /Failed to fetch/);
  });

  await t.test("Teacher sees assignments from all classes by default and selects a class when creating", () => {
    assert.match(teacherPage, /<option value="">Tất cả<\/option>/);
    assert.match(teacherPage, /availableOfferings\.map\(\(offering\) => offering\.id\)/);
    assert.match(teacherPage, /Promise\.all\(ids\.map\(\(offering\) => assignmentApi\.listForTeacher\(offering\)\)\)/);
    assert.match(teacherPage, /<select required disabled=\{!!editingId\} value=\{composerOfferingId\}/);
    assert.match(teacherPage, /assignmentApi\.create\(composerOfferingId, input\)/);
  });

  await t.test("F01 has submission counts but no grading flow", () => {
    assert.match(client, /onTimeCount: number/);
    assert.match(client, /lateCount: number/);
    assert.match(client, /notSubmittedCount: number/);
    assert.doesNotMatch(client, /assignmentApi\.review|review: \(submissionId: string/);
    assert.doesNotMatch(`${teacherPage}\n${studentPage}`, /assignmentApi\.review|teacherFeedback|reviewedAt/);
    assert.match(teacherPage, /kể cả người được duyệt sau hạn/);
    assert.doesNotMatch(teacherPage, /chỉ tính sinh viên được duyệt vào lớp không muộn hơn hạn nộp/);
  });
});
