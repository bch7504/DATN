const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const loadClient = require("./helpers/load-api-client.cjs");

/** @param {string} name Actual frontend module name. @param {object} context Synthetic browser globals. @returns {object} Executable module exports. @throws {Error} Invalid source/import. */
function loadModule(name, context = {}) {
  const source = fs.readFileSync(path.join(__dirname, "../src/lib", name), "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  vm.runInNewContext(compiled, { exports, require, ...context });
  return exports;
}

test("direct visits have a safe parent at each workflow step", () => {
  const { parentRoute } = loadModule("navigation.ts");
  const pairs = [
    ["/teacher/assignments/new", "/teacher/assignments"],
    ["/teacher/assignments/a1/edit", "/teacher/assignments/a1"],
    ["/teacher/documents/off1/upload", "/teacher/documents/off1"],
    ["/materials/class/off1", "/materials"],
    ["/assignments/a1", "/assignments"],
    ["/quiz/drafts/q1/accept", "/quiz/drafts/q1"],
    ["/review/PERSONAL/attempts/a1/result", "/review/PERSONAL"],
    ["/plan/p1/items/i1/edit", "/plan?planId=p1"],
    ["/admin/catalog/subjects/s1/edit", "/admin/catalog/subjects"],
    ["/admin/users/u1/edit", "/admin/users"],
    ["/admin/feedback/f1", "/admin/feedback"],
  ];
  for (const [route, parent] of pairs) assert.equal(parentRoute(route), parent);
  assert.equal(parentRoute("/unknown", "TEACHER"), "/teacher/dashboard");
});

test("admin direct edit links find records beyond the preferred page and preserve API failures", async () => {
  const { findAdminRecord } = loadModule("admin-detail.ts");
  const calls = [];
  const found = await findAdminRecord("target", async (page) => { calls.push(page); return { items: [{ id: page === 1 ? "target" : `row-${page}` }], totalPages: 3 }; }, 2);
  assert.equal(found.id, "target");
  assert.equal(calls.join(","), "2,0,1");
  assert.equal(await findAdminRecord("", async () => { throw new Error("Unexpected request"); }), null);
  await assert.rejects(findAdminRecord("target", async () => { throw new Error("Java unavailable"); }), /Java unavailable/);
});

test("quiz taking recovery preserves selections and rejects another account or corrupt storage", () => {
  const records = new Map();
  const storage = { getItem: (key) => records.get(key) ?? null, setItem: (key, value) => records.set(key, value), removeItem: (key) => records.delete(key) };
  const api = loadModule("quiz-attempt-session.ts", { sessionStorage: storage });
  const attempt = { attemptId: "a1", quizId: "q1", quizTitle: "Synthetic Quiz", startedAt: "2030-01-01T00:00:00Z", totalQuestions: 1, questions: [{ id: "question1", questionOrder: 1, questionText: "Synthetic question", options: [0, 1, 2, 3].map((index) => ({ index, text: String(index) })) }] };
  api.saveQuizAttemptSession("student1", "PERSONAL", attempt);
  const owned = api.readQuizAttemptSession("student1", "PERSONAL", "a1");
  assert.equal(owned.attempt.attemptId, "a1");
  api.updateQuizAttemptSession(owned, { question1: 2 });
  // A new module instance represents a page reload with the same tab storage.
  const reloaded = loadModule("quiz-attempt-session.ts", { sessionStorage: storage });
  assert.equal(reloaded.readQuizAttemptSession("student1", "PERSONAL", "a1").answers.question1, 2);
  assert.equal(reloaded.readQuizAttemptSession("student2", "PERSONAL", "a1"), null);
  records.set("studyflow.attempt.a1", '{"ownerId":"student1","attempt":{}}');
  assert.equal(reloaded.readQuizAttemptSession("student1", "PERSONAL", "a1"), null);
});

test("result navigation preserves the exact Java scoring response across reload without a second submission", () => {
  const records = new Map();
  const storage = { getItem: (key) => records.get(key) ?? null, setItem: (key, value) => records.set(key, value), removeItem: (key) => records.delete(key) };
  const api = loadModule("quiz-attempt-session.ts", { sessionStorage: storage });
  const result = { attemptId: "a1", quizId: "q1", score: 75, correctAnswersCount: 3, totalQuestionsCount: 4, completedAt: "2030-01-01T00:00:00Z" };
  api.saveQuizResultSession("student1", "PERSONAL", "Synthetic Quiz", result);
  const reloaded = loadModule("quiz-attempt-session.ts", { sessionStorage: storage });
  assert.deepEqual(JSON.parse(JSON.stringify(reloaded.readQuizResultSession("student1", "PERSONAL", "a1").result)), result);
  assert.equal(reloaded.readQuizResultSession("student2", "PERSONAL", "a1"), null);
});

test("plan detail/items use the documented read APIs and reject invalid IDs/pagination before network", async () => {
  const calls = [];
  const record = { id: "plan1", title: "Synthetic plan", description: null, startDate: "2030-01-01", endDate: "2030-01-01", status: "ACTIVE" };
  const client = loadClient(async (url) => { calls.push(url); return Response.json(url.includes("/items?") ? { items: [], page: 2, size: 50, totalItems: 0, totalPages: 0 } : record); }, "http://java.test/api/v1");
  assert.deepEqual(await client.studyPlanApi.getPlan("plan1"), record);
  const result = await client.studyPlanApi.listItems("plan1", 2, 50);
  assert.ok(Array.isArray(result.items));
  assert.equal(calls[1], "http://java.test/api/v1/study-plans/plan1/items?page=2&size=50");
  assert.throws(() => client.studyPlanApi.getPlan(" "), { code: "INVALID_PLAN_ID" });
  assert.throws(() => client.studyPlanApi.listItems("plan1", -1), { code: "INVALID_PAGE" });
  assert.throws(() => client.studyPlanApi.listItems("plan1", 0, 101), { code: "INVALID_PAGE" });
  assert.equal(calls.length, 2);
});
