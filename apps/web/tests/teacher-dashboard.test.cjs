const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const page = fs.readFileSync(
  path.join(__dirname, "../src/app/teacher/dashboard/page.tsx"),
  "utf8"
);

test("Teacher dashboard uses scoped API data and a real empty state", () => {
  assert.match(page, /teacherApi\.getOfferings\(\)/);
  assert.match(page, /offerings\.length === 0/);
  assert.match(page, /Chưa có lớp học phần nào/);
  assert.match(page, /<ErrorAlert/);
  assert.match(page, /href="\/teacher\/course-offerings"/);
  assert.doesNotMatch(page, /offering_ai_02|offering_ds_01|AI2026PTIT|DSA2026PTIT/);
  assert.doesNotMatch(page, /Tổng số sinh viên: 97|Course Material PDF|Duyệt \(3\)/);
});
