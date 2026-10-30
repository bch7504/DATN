const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const client = fs.readFileSync(path.join(root, "src/lib/api-client.ts"), "utf8");
const teacherPage = fs.readFileSync(path.join(root, "src/app/teacher/documents/document-library.tsx"), "utf8");
const studentPage = fs.readFileSync(path.join(root, "src/app/(student)/materials/material-library.tsx"), "utf8");
const viewerPage = fs.readFileSync(path.join(root, "src/app/(student)/materials/[documentId]/viewer/page.tsx"), "utf8");
const teacherUpload = fs.readFileSync(path.join(root, "src/app/teacher/documents/[offeringId]/upload/page.tsx"), "utf8");
const teacherPublication = fs.readFileSync(path.join(root, "src/app/teacher/documents/publications/[documentId]/page.tsx"), "utf8");

test("Course Material library uses persisted Java files without fixtures", async (t) => {
  await t.test("Teacher upload, publication, revoke, and preview use backend routes", () => {
    assert.match(client, /getDocuments\(\): Promise<TeacherDocument\[]>[\s\S]*?\/teacher\/documents/);
    assert.match(client, /uploadDocument\([\s\S]*?return apiFetch<TeacherDocument>\("\/teacher\/documents"/);
    assert.match(client, /publishDocument\([\s\S]*?await apiFetch<void>\(`\/teacher\/documents\/\$\{documentId\}\/publications`/);
    assert.match(client, /revokePublication\([\s\S]*?\/teacher\/documents\/\$\{documentId\}\/publications\?offeringId=/);
    assert.match(teacherUpload, /teacherDocApi\.uploadDocument/);
    assert.match(teacherPublication, /teacherDocApi\.publishDocument/);
    assert.match(teacherPage, /getDocumentDownloadUrl/);
    assert.doesNotMatch(client, /demoTeacherDocs|DEMO_MATERIAL_PAGES|demoPageNotes/);
  });

  await t.test("Student sees PDFs and asks the Python-backed Tutor through Java", () => {
    assert.match(client, /\/student\/course-offerings\/\$\{offeringId\}\/materials/);
    assert.match(client, /\/student\/materials\/\$\{encodeURIComponent\(documentId\)\}\/download/);
    assert.match(studentPage, /materialApi\.getMaterials/);
    assert.match(viewerPage, /materialApi\.getDownloadUrl/);
    assert.match(client, /askTutor\(documentId: string, pageNumber: number, question: string\)/);
    assert.match(client, /\/student\/materials\/\$\{encodeURIComponent\(documentId\)\}\/pages\/\$\{pageNumber\}\/tutor/);
    assert.match(viewerPage, /materialApi\.askTutor/);
    assert.match(viewerPage, /AI Tutor/);
    assert.match(viewerPage, /<iframe/);
  });

  await t.test("Frontend delegates authorization and publication to Java without directly reading backend implementation", () => {
    assert.match(teacherUpload, /accept="application\/pdf,\.pdf"/);
    assert.match(teacherPublication, /teacherApi\.getOfferings\(\)/);
    assert.match(studentPage, /studentApi\.getOfferings\(\)/);
    assert.doesNotMatch(`${teacherUpload}\n${teacherPublication}\n${studentPage}`, /services\/backend|pgvector|postgresql:\/\//);
  });
});
