const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const page = fs.readFileSync(path.join(root, "src/app/teacher/documents/page.tsx"), "utf8");

test("Teacher PDF library lists owned classes before class-specific materials", async (t) => {
  await t.test("Class selection is reflected in the URL and direct class links are supported", () => {
    assert.match(page, /new URLSearchParams\(window\.location\.search\)\.get\("offeringId"\)/);
    assert.match(page, /window\.history\.pushState/);
    assert.match(page, /window\.addEventListener\("popstate", syncSelectedOffering\)/);
    assert.match(page, /window\.history\.back\(\)/);
    assert.match(page, /offerings\.map\(\(offering\)/);
  });

  await t.test("Published materials are filtered to the selected class", () => {
    assert.match(page, /documents\.filter\(\(document\) => document\.publishedOfferings\.some\(\(publication\) => publication\.offeringId === selectedOffering\.id\)\)/);
    assert.match(page, /Tài liệu của lớp/);
    assert.doesNotMatch(page, /Tài liệu riêng có thể thêm vào lớp/);
  });

  await t.test("A new class PDF is uploaded privately and publication requires confirmation", () => {
    assert.match(page, /teacherDocApi\.uploadDocument\(selectedFile, uploadTitle\.trim\(\), uploadMaterialType\)/);
    assert.match(page, /setUploadMaterialType\("SLIDE_PDF"\)/);
    assert.match(page, /value="REFERENCE_PDF"/);
    assert.match(page, /openPublishModal\(uploadedDocument, selectedOffering\.id\)/);
    assert.match(page, /Bấm “Lưu công bố” nếu muốn chia sẻ với sinh viên lớp/);
    assert.doesNotMatch(page, /publishDocument\(uploadedDocument\.id, \[selectedOffering\.id\]\)/);
  });
});
