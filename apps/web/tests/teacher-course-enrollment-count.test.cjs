const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

test("teacher course cards derive class totals from enrollment records", () => {
  const page = fs.readFileSync(
    path.join(__dirname, "../src/app/teacher/course-offerings/page.tsx"),
    "utf8"
  );

  assert.match(page, /teacherApi\.getEnrollments\(\)/);
  assert.match(page, /enrollment\.status === "APPROVED"/);
  assert.match(page, /enrollment\.status === "PENDING"/);
  assert.match(page, /enrollmentCounts\[offering\.id\]\?\.approved/);
  assert.doesNotMatch(page, /<b>\{offering\.enrolledCount\}<\/b>/);
});
