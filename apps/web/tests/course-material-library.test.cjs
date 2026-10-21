const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const client = fs.readFileSync(path.join(root, "src/lib/api-client.ts"), "utf8");
const teacherPage = fs.readFileSync(path.join(root, "src/app/teacher/documents/page.tsx"), "utf8");
const studentPage = fs.readFileSync(path.join(root, "src/app/(student)/materials/page.tsx"), "utf8");
const viewerPage = fs.readFileSync(path.join(root, "src/app/(student)/materials/[documentId]/viewer/page.tsx"), "utf8");
const backendService = fs.readFileSync(path.join(root, "../../services/backend/src/main/java/com/studyflow/document/application/CourseMaterialLibraryService.java"), "utf8");

test("Course Material library uses persisted Java files without fixtures", async (t) => {
  await t.test("Teacher upload, publication, revoke, and preview use backend routes", () => {
    assert.match(client, /getDocuments\(\): Promise<TeacherDocument\[]>[\s\S]*?\/teacher\/documents/);
    assert.match(client, /uploadDocument\([\s\S]*?return apiFetch<TeacherDocument>\("\/teacher\/documents"/);
    assert.match(client, /publishDocument\([\s\S]*?await apiFetch<void>\(`\/teacher\/documents\/\$\{documentId\}\/publications`/);
    assert.match(client, /revokePublication\([\s\S]*?\/teacher\/documents\/\$\{documentId\}\/publications\?offeringId=/);
    assert.match(teacherPage, /teacherDocApi\.uploadDocument/);
    assert.match(teacherPage, /teacherDocApi\.publishDocument/);
    assert.match(teacherPage, /getDocumentDownloadUrl/);
    assert.doesNotMatch(client, /demoTeacherDocs|DEMO_MATERIAL_PAGES|demoPageNotes/);
  });

  await t.test("Student sees and opens only materials from the real Java API", () => {
    assert.match(client, /\/student\/course-offerings\/\$\{offeringId\}\/materials/);
    assert.match(client, /\/student\/materials\/\$\{encodeURIComponent\(documentId\)\}\/download/);
    assert.match(studentPage, /materialApi\.getMaterials/);
    assert.match(viewerPage, /materialApi\.getDownloadUrl/);
    assert.match(viewerPage, /Mở trong trình duyệt/);
    assert.doesNotMatch(`${studentPage}\n${viewerPage}`, /Hỏi AI|Ghi chú theo trang|Tutor/);
  });

  await t.test("Backend validates PDF text and rechecks ownership and enrollment", () => {
    assert.match(backendService, /PDFTextStripper/);
    assert.match(backendService, /PDF_TEXT_REQUIRED/);
    assert.match(backendService, /requireOwned\(teacherId, documentId\)/);
    assert.match(backendService, /EnrollmentStatus\.APPROVED/);
    assert.match(backendService, /storageProvider\.getIfAvailable\(\)/);
  });
});
