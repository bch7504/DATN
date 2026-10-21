const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

test("student course cards show counts derived from published materials", () => {
  const page = fs.readFileSync(
    path.join(__dirname, "../src/app/(student)/course-offerings/page.tsx"),
    "utf8"
  );

  assert.match(page, /const documents = await materialApi\.getMaterials\(\)/);
  assert.match(page, /document\.publishedOfferings\.map\(\(publication\) => publication\.offeringId\)/);
  assert.match(page, /materialCounts\[offering\.id\] \?\? 0/);
  assert.doesNotMatch(page, /offering\.materialsCount \|\| 4/);
});
