const test = require("node:test");
const assert = require("node:assert/strict");
const loadClient = require("./helpers/load-api-client.cjs");

test("class and document lists follow pagination using the actual API client", async () => {
  const calls = [];
  const client = loadClient(async (url, options) => {
    assert.equal(options.credentials, "include");
    const page = Number(new URL(url).searchParams.get("page"));
    calls.push(url);
    return Response.json({ items: [{ id: `row-${page}`, publishedOfferings: [] }], page, size: 100, totalItems: 101, totalPages: 2 });
  }, "http://java.test/api/v1");
  assert.equal((await client.teacherApi.getOfferings()).length, 2);
  assert.equal((await client.studentApi.getOfferings()).length, 2);
  assert.equal((await client.teacherDocApi.getDocuments()).length, 2);
  assert.equal((await client.materialApi.getMaterials()).length, 2);
  assert.equal(calls.length, 8);
});

test("repeated page metadata is rejected instead of looping or silently dropping records", async () => {
  const client = loadClient(async () => Response.json({ items: [{ id: "test" }], page: 0, totalPages: 2 }), "http://java.test/api/v1");
  await assert.rejects(client.materialApi.getMaterials(), { code: "INVALID_API_RESPONSE" });
});

test("draft update and plan edit preserve method, path and payload", async () => {
  const calls = [];
  const client = loadClient(async (url, options) => {
    calls.push({ url, options });
    return Response.json({ id: "saved" });
  }, "http://java.test/api/v1");
  await client.assignmentApi.update("assignment", { title: "Edited", description: "Work", dueAt: "2030-01-01T00:00:00Z" });
  await client.studyPlanApi.updateItem("actual-plan", "item", { title: "Edited task", type: "TASK", dueAt: "2030-01-01T00:00:00Z" });
  await client.studyPlanApi.updatePlan("actual-plan", { title: "Edited plan", startDate: "2029-01-01", endDate: "2030-12-31", status: "ACTIVE" });
  await client.studyPlanApi.archivePlan("actual-plan");
  assert.equal(calls[0].options.method, "PUT");
  assert.equal(calls[1].url, "http://java.test/api/v1/study-plans/actual-plan/items/item");
  assert.equal(calls[1].options.method, "PUT");
  assert.equal(calls[2].options.method, "PUT");
  assert.equal(calls[3].options.method, "DELETE");
});

test("PDF invalid sizes never reach network; upload leaves multipart boundary to fetch", async () => {
  let calls = 0;
  const client = loadClient(async (_url, options) => {
    calls++;
    assert.equal(options.headers.has("Content-Type"), false);
    assert.ok(options.body instanceof FormData);
    assert.equal(options.body.get("title"), "PDF fixture");
    return Response.json({ id: "document", status: "READY" });
  }, "http://java.test/api/v1");
  await assert.rejects(client.teacherDocApi.uploadDocument(new File([], "empty.pdf"), "PDF fixture"), { code: "INVALID_FILE_SIZE" });
  await assert.rejects(client.teacherDocApi.uploadDocument(new File(["x"], "wrong.pptx"), "PDF fixture"), { status: 415 });
  assert.equal(calls, 0);
  const result = await client.teacherDocApi.uploadDocument(new File(["synthetic bytes"], "sample.pdf"), "PDF fixture");
  assert.equal(result.status, "READY");
  assert.equal(calls, 1);
});

test("failed persisted feature requests propagate Java error envelopes without demo success", async () => {
  const client = loadClient(async () => Response.json({ code: "FORBIDDEN", message: "No access", details: [], traceId: "test-trace" }, { status: 403 }), "http://java.test/api/v1");
  for (const operation of [() => client.studentApi.getOfferings(), () => client.materialApi.getMaterials(), () => client.notificationApi.list(), () => client.studyPlanApi.listPlans(), () => client.assignmentApi.listForStudent()]) {
    await assert.rejects(operation(), { status: 403, code: "FORBIDDEN", traceId: "test-trace" });
  }
});

test("network failures show an actionable error and do not retry mutations", async () => {
  let calls = 0;
  const client = loadClient(async () => { calls++; throw new TypeError("Failed to fetch"); }, "http://java.test/api/v1");
  await assert.rejects(client.assignmentApi.publish("test"), { status: 0, code: "NETWORK_UNAVAILABLE" });
  assert.equal(calls, 1);
});

test("Course Material Tutor validates the page and sends the question only to Java", async () => {
  const calls = [];
  const client = loadClient(async (url, options) => {
    calls.push({ url, options });
    return Response.json({
      status: "ANSWERED",
      answer: "Synthetic grounded answer",
      citations: [{ documentId: "doc-1", pageNumber: 2, excerpt: "Synthetic excerpt" }],
      traceId: "req-test-001",
    });
  }, "http://java.test/api/v1");

  assert.throws(() => client.materialApi.askTutor("doc-1", 0, "Question"), {
    code: "INVALID_PAGE_NUMBER",
  });
  assert.throws(() => client.materialApi.askTutor("doc-1", 1, "   "), {
    code: "INVALID_QUESTION",
  });
  const result = await client.materialApi.askTutor("doc-1", 2, "  Explain this page  ");

  assert.equal(result.status, "ANSWERED");
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "http://java.test/api/v1/student/materials/doc-1/pages/2/tutor");
  assert.equal(calls[0].options.method, "POST");
  assert.deepEqual(JSON.parse(calls[0].options.body), { question: "Explain this page" });
});
