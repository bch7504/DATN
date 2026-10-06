const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const { webcrypto } = require("node:crypto");

/**
 * @param {(url: string, options: RequestInit) => Promise<Response>} fetchStub Required synthetic transport.
 * @returns {typeof import('../src/lib/api-client')} Actual client compiled in isolation; no network/env files.
 * @throws {Error} For an unexpected runtime import or invalid source.
 */
function loadClient(fetchStub) {
  const source = fs.readFileSync(path.join(process.cwd(), "src/lib/api-client.ts"), "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  vm.runInNewContext(compiled, {
    exports, Headers, FormData, crypto: webcrypto, fetch: fetchStub,
    require(name) {
      if (name === "./env") return { getApiUrl: () => "https://java.test/api/v1", isDemoMode: () => false };
      if (name === "./demo-data") return { DEMO_USERS: { STUDENT: { id: "synthetic-student" } } };
      throw new Error(`Unexpected import: ${name}`);
    },
  });
  return exports;
}

test("Quiz form client posts directly to Java with an idempotency key, not chat", async () => {
  const calls = [];
  const client = loadClient(async (url, options) => {
    calls.push({ url, options });
    return Response.json({ quizId: "synthetic-quiz", status: "GENERATING" }, { status: 202 });
  });
  const draft = await client.quizApi.createDraft({ sourceDocumentIds: ["synthetic-pdf"], prompt: "  Tạo 5 câu hỏi  " });
  assert.equal(calls[0].url, "https://java.test/api/v1/quizzes");
  assert.equal(calls[0].options.method, "POST");
  assert.ok(calls[0].options.headers.get("Idempotency-Key"));
  assert.deepEqual(JSON.parse(calls[0].options.body), { selectedDocumentIds: ["synthetic-pdf"], prompt: "Tạo 5 câu hỏi" });
  assert.equal(draft.id, "synthetic-quiz");
  assert.equal(draft.status, "GENERATING");
  assert.equal(draft.questions.length, 0);
  assert.equal(draft.sourceDocumentIds[0], "synthetic-pdf");
});

test("Quiz invalid inputs do not call the network", async () => {
  let calls = 0;
  const client = loadClient(async () => { calls++; throw new Error("Unexpected fetch"); });
  for (const sourceDocumentIds of [[], ["a", "a"], Array.from({ length: 11 }, (_, n) => String(n))]) {
    await assert.rejects(client.quizApi.createDraft({ sourceDocumentIds, prompt: "Tạo 5 câu" }), { code: "INVALID_DOCUMENT_SELECTION" });
  }
  for (const prompt of ["  ", "x".repeat(501)]) {
    await assert.rejects(client.quizApi.createDraft({ sourceDocumentIds: ["a"], prompt }), { code: "INVALID_QUIZ_PROMPT" });
  }
  assert.equal(calls, 0);
});

test("Regenerate follows the new identity and status refresh reads that draft", async () => {
  const calls = [];
  const fixture = { id: "new-draft", prompt: "Tạo 5 câu", sourceDocumentIds: ["synthetic-pdf"], status: "REVIEW_REQUIRED", questions: [], createdAt: "2026-10-06T00:00:00Z" };
  const client = loadClient(async (url, options) => {
    calls.push(url);
    return options.method === "POST"
      ? Response.json({ quizId: "new-draft", status: "GENERATING" }, { status: 202 })
      : Response.json(fixture);
  });
  const next = await client.quizApi.regenerateDraft("old-draft", "Tạo 5 câu");
  assert.equal(next.id, "new-draft");
  const refreshed = await client.quizApi.getDraft(next.id);
  assert.deepEqual(refreshed, fixture);
  assert.equal(calls[1], "https://java.test/api/v1/review/quizzes/new-draft");
});

test("Production AI failures are propagated instead of returning demo questions", async () => {
  const client = loadClient(async () => Response.json({ code: "AI_SERVICE_UNAVAILABLE", message: "Unavailable" }, { status: 503 }));
  await assert.rejects(client.quizApi.createDraft({ sourceDocumentIds: ["a"], prompt: "Tạo 5 câu" }), { status: 503, code: "AI_SERVICE_UNAVAILABLE" });
});

test("Both review entry points link to the dedicated Quiz form", () => {
  for (const route of ["review/page.tsx", "review/[courseId]/page.tsx"]) {
    const source = fs.readFileSync(path.join(process.cwd(), "src/app/(student)", route), "utf8");
    assert.ok(source.includes('href="/quiz/create"'));
    assert.ok(!source.includes("/personal-documents#personal-ai-assistant"));
  }
});
