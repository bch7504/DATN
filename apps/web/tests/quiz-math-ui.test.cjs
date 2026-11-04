const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const mathText = fs.readFileSync(path.join(__dirname, "../src/components/quiz/math-text.tsx"), "utf8");
const studentAssignments = fs.readFileSync(path.join(__dirname, "../src/app/(student)/assignments/page.tsx"), "utf8");
const teacherAssignments = fs.readFileSync(path.join(__dirname, "../src/app/teacher/assignments/page.tsx"), "utf8");
const studentQuizCreate = fs.readFileSync(path.join(__dirname, "../src/app/(student)/quiz/create/page.tsx"), "utf8");
const teacherQuizCreate = fs.readFileSync(path.join(__dirname, "../src/app/teacher/quizzes/create/page.tsx"), "utf8");

test("Quiz math rendering is safe and shared by Student and Teacher flows", async (t) => {
  await t.test("KaTeX accepts only explicit delimiters and never trusts input HTML", () => {
    assert.match(mathText, /MATH_SEGMENT/);
    assert.match(mathText, /renderToString/);
    assert.match(mathText, /trust:\s*false/);
    assert.match(mathText, /throwOnError:\s*false/);
    assert.match(mathText, /if \(!isDisplay && !isInline\) return <span/);
  });

  await t.test("Student assignment, review and creation views use the shared renderer", () => {
    assert.match(studentAssignments, /<MathText text=\{question\.questionText\}/);
    assert.match(studentAssignments, /<MathText text=\{option\.text\}/);
    assert.match(studentQuizCreate, /<MathText text=\{q\.explanation\}/);
  });

  await t.test("Teacher assignment and draft views use the shared renderer and scale score to ten", () => {
    assert.match(teacherAssignments, /<MathText text=\{item\.questionText\}/);
    assert.match(teacherAssignments, /quizDetail\.result\.score \/ 10/);
    assert.match(teacherQuizCreate, /<MathText text=\{question\.questionText\}/);
  });
});
