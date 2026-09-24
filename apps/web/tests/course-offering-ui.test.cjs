const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const webRoot = path.resolve(__dirname, "..");

/**
 * Read a UTF-8 fixture/source file inside the web package.
 * @param {string} relativePath Required path relative to apps/web.
 * @returns {string} File content for static contract assertions.
 * @throws {Error} If the file cannot be read.
 */
function read(relativePath) {
  return fs.readFileSync(path.join(webRoot, relativePath), "utf8");
}

test("Course Offering replaces the former assignment UI", () => {
  const app = read("src/components/study-flow-app.tsx");
  const prototype = read("mvp.html");
  assert.match(app, /course-offerings/);
  assert.match(app, /Yêu cầu tham gia/);
  assert.match(app, /Teacher tự tạo và sở hữu lớp học phần/);
  assert.match(app, /Admin giám sát, không phân công/);
  assert.match(prototype, /page-student-course-offerings/);
  assert.match(prototype, /page-teacher-enrollments/);
  assert.doesNotMatch(`${app}\n${prototype}`, /ClassSubject|teacher-assignments|student-classes|admin-academics/);
});

test("document chat UI is evidence scoped and keeps the Java boundary", () => {
  const app = read("src/components/study-flow-app.tsx");
  assert.match(app, /Evidence scope/);
  assert.match(app, /Cuộc trò chuyện mới/);
  assert.match(app, /Đang truy xuất bằng chứng/);
  assert.match(app, /NO_EVIDENCE/);
  assert.match(app, /Citation này được gắn với claim/);
  assert.doesNotMatch(app, /openrouter\.ai|internal\/v1|NEXT_PUBLIC_OPENROUTER/i);
});

test("Student dashboard exposes Streak and Daily Goal without a standalone Progress route", () => {
  const app = read("src/components/study-flow-app.tsx");
  const prototype = read("mvp.html");
  const combined = `${app}\n${prototype}`;
  assert.match(combined, /Study Streak/);
  assert.match(combined, /Daily Goal/);
  assert.match(combined, /VIEW_SLIDE/);
  assert.match(combined, /STUDY_TASK_COMPLETED/);
  assert.match(combined, /QUIZ_COMPLETED/);
  assert.match(prototype, /page-student-offering-progress/);
  assert.doesNotMatch(combined, /student-progress/);
  assert.doesNotMatch(app, /key: "progress"/);
});
