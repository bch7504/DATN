const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const page = fs.readFileSync(path.join(root, "src/app/teacher/documents/document-library.tsx"), "utf8");
const upload = fs.readFileSync(path.join(root, "src/app/teacher/documents/[offeringId]/upload/page.tsx"), "utf8");
const publication = fs.readFileSync(path.join(root, "src/app/teacher/documents/publications/[documentId]/page.tsx"), "utf8");

test("Teacher PDF library lists owned classes before class-specific materials", async (t) => {
  await t.test("Class selection is reflected in the URL and direct class links are supported", () => {
    assert.match(page, /new URLSearchParams\(window\.location\.search\)\.get\("offeringId"\)/);
    assert.match(page, /router\.push\(offeringId \? `\/teacher\/documents\//);
    assert.match(page, /selectedOfferingId = offeringId/);
    assert.ok(fs.existsSync(path.join(root, "src/app/teacher/documents/[offeringId]/page.tsx")));
    assert.match(page, /offerings\.map\(\(offering\)/);
  });

  await t.test("Published materials are filtered to the selected class", () => {
    assert.match(page, /documents\.filter\(\(document\) => document\.publishedOfferings\.some\(\(publication\) => publication\.offeringId === selectedOffering\.id\)\)/);
    assert.match(page, /Tài liệu của lớp/);
    assert.doesNotMatch(page, /Tài liệu riêng có thể thêm vào lớp/);
  });

  await t.test("A new class PDF is uploaded privately and publication requires confirmation", () => {
    assert.match(upload, /teacherDocApi\.uploadDocument\(file, title\.trim\(\)\)/);
    assert.match(upload, /router\.replace\(`\/teacher\/documents\/publications\//);
    assert.match(publication, /teacherDocApi\.publishDocument\(document\.id, selected\)/);
    assert.doesNotMatch(upload, /teacherDocApi\.publishDocument/);
  });
});
