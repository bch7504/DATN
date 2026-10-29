const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const page = fs.readFileSync(path.join(root, "src/app/(student)/materials/page.tsx"), "utf8");

test("Student PDF library lists approved classes before class-specific materials", async (t) => {
  await t.test("Class selection is reflected in the URL and direct class links are supported", () => {
    assert.match(page, /new URLSearchParams\(window\.location\.search\)\.get\("offeringId"\)/);
    assert.match(page, /window\.history\.pushState/);
    assert.match(page, /window\.addEventListener\("popstate", syncSelectedOffering\)/);
    assert.match(page, /window\.history\.back\(\)/);
    assert.match(page, /offerings\.map\(\(offering\)/);
  });

  await t.test("Student materials are filtered to the selected approved class", () => {
    assert.match(page, /materials\.filter\(\(material\) => material\.publishedOfferings\.some\(\(publication\) => publication\.offeringId === selectedOffering\.id\)\)/);
    assert.match(page, /Tài liệu giảng viên đã công bố cho lớp/);
    assert.match(page, /materialType === "SLIDE_PDF"/);
    assert.match(page, /Xem slide/);
    assert.match(page, /Tải tài liệu/);
  });
});
