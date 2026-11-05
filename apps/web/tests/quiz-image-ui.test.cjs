const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");

test("Quiz image uses authenticated Java download and revokes private blob URLs", () => {
  const source = fs.readFileSync(path.join(root, "src/components/quiz/quiz-question-image.tsx"), "utf8");
  assert.match(source, /apiDownload\(image\.url\)/);
  assert.match(source, /URL\.createObjectURL/);
  assert.match(source, /URL\.revokeObjectURL/);
  assert.doesNotMatch(source, /storageKey|STORAGE_|s3:/i);
});

test("Student and Teacher Quiz review render the optional grounded image", () => {
  const student = fs.readFileSync(path.join(root, "src/app/(student)/quiz/drafts/[draftId]/page.tsx"), "utf8");
  const teacher = fs.readFileSync(path.join(root, "src/app/teacher/quizzes/[quizId]/page.tsx"), "utf8");
  assert.match(student, /question\.image && <QuizQuestionImage image=\{question\.image\}/);
  assert.match(teacher, /question\.image && <QuizQuestionImage image=\{question\.image\}/);
});
