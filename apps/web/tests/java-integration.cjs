/* Opt-in integration runner, invoked only by RealHttpApiTest with isolated fixtures on stdin.
 * Args: none. Input: {baseUrl,teacher,student,studentId,offeringId,pdfBase64} synthetic test data.
 * Output: three success labels, exit 0; on failure a safe error name/status and exit 1.
 * Uses real Java HTTP/JPA/security with synthetic mail/storage doubles; not a browser UI test.
 */
const assert = require("node:assert/strict");
const loadClient = require("./helpers/load-api-client.cjs");

let integrationStep = "bootstrap";

/** @returns {Promise<void>} Mutates isolated fixtures only. @throws {Error} On any contract mismatch. */
async function run() {
  let input = "";
  for await (const chunk of process.stdin) input += chunk;
  const fixture = JSON.parse(input);
  const endpoint = new URL(fixture.baseUrl);
  assert.equal(endpoint.hostname, "127.0.0.1");
  assert.equal(endpoint.pathname, "/api/v1");
  let role = "teacher";
  const client = loadClient(async (url, options) => {
    assert.equal(new URL(url).origin, endpoint.origin);
    assert.equal(options.credentials, "include");
    const headers = new Headers(options.headers);
    headers.set("Cookie", fixture[role]);
    return fetch(url, { ...options, headers, signal: AbortSignal.timeout(10000) });
  }, fixture.baseUrl);
  const dueAt = new Date(Date.now() + 86400000).toISOString();
  integrationStep = "assignments";
  const draft = await client.assignmentApi.create(fixture.offeringId, { title: "Client integration", description: "Synthetic assignment", dueAt });
  const updated = await client.assignmentApi.update(draft.id, { title: "Edited from client", description: "Synthetic assignment", dueAt });
  assert.equal(updated.title, "Edited from client");
  await client.assignmentApi.publish(draft.id);
  role = "student";
  assert.ok((await client.assignmentApi.listForStudent()).some((item) => item.id === draft.id));
  const pdf = new File([Buffer.from(fixture.pdfBase64, "base64")], "synthetic.pdf", { type: "application/pdf" });
  const submitted = await client.assignmentApi.submit(draft.id, "Synthetic answer", [pdf]);
  assert.equal(submitted.attachments.length, 1);
  assert.equal((await client.assignmentApi.downloadForStudent(draft.id, submitted.attachments[0].id)).size, pdf.size);
  role = "teacher";
  const report = await client.assignmentApi.stats(draft.id);
  assert.equal(report.submittedCount, 1);
  assert.equal(report.onTimeCount, 1);
  assert.equal(report.lateCount, 0);
  assert.equal(report.notSubmittedCount, 0);
  assert.equal((await client.assignmentApi.downloadForTeacher(draft.id, fixture.studentId, submitted.attachments[0].id)).size, pdf.size);
  role = "student";
  const result = (await client.assignmentApi.listForStudent()).find((item) => item.id === draft.id).submission;
  assert.equal(Object.hasOwn(result, "score"), false);
  assert.equal(Object.hasOwn(result, "teacherFeedback"), false);
  console.log("WEB_JAVA_PASS assignments");

  integrationStep = "materials-upload";
  role = "teacher";
  let document = await client.teacherDocApi.uploadDocument(pdf, "Client PDF");
  assert.ok(["PENDING_PROCESSING", "PROCESSING", "READY"].includes(document.status));
  for (let attempt = 0; document.status !== "READY" && attempt < 100; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 100));
    document = (await client.teacherDocApi.getDocuments()).find((item) => item.id === document.id) ?? document;
    assert.notEqual(document.status, "FAILED");
  }
  assert.equal(document.status, "READY");
  integrationStep = "materials-publish";
  await client.teacherDocApi.publishDocument(document.id, [fixture.offeringId]);
  role = "student";
  integrationStep = "materials-student-read";
  assert.ok((await client.materialApi.getMaterials()).some((item) => item.id === document.id));
  assert.equal((await client.apiDownload(`/student/materials/${document.id}/download`)).size, pdf.size);
  role = "teacher";
  integrationStep = "materials-revoke";
  await client.teacherDocApi.revokePublication(document.id, fixture.offeringId);
  role = "student";
  integrationStep = "materials-revoked-read";
  assert.equal((await client.materialApi.getMaterials()).some((item) => item.id === document.id), false);
  await assert.rejects(client.apiDownload(`/student/materials/${document.id}/download`), { status: 403 });
  console.log("WEB_JAVA_PASS materials");

  integrationStep = "plans";
  const plan = await client.studyPlanApi.createPlan({ title: "Client plan", startDate: "2020-01-01", endDate: "2099-12-31" });
  const renamed = await client.studyPlanApi.updatePlan(plan.id, { title: "Renamed client plan", startDate: plan.startDate, endDate: plan.endDate, status: "ACTIVE" });
  assert.equal(renamed.title, "Renamed client plan");
  const task = await client.studyPlanApi.createItem(plan.id, { title: "Client task", type: "TASK", dueAt });
  const saved = await client.studyPlanApi.updateItem(plan.id, task.id, { title: "Changed task", type: "TASK", dueAt, reminderMinutesBefore: 60 });
  assert.equal(saved.title, "Changed task");
  assert.ok(saved.reminderAt);
  await assert.rejects(client.studyPlanApi.changeItemStatus(task.id, "COMPLETED"), { status: 422 });
  assert.equal((await client.studyPlanApi.changeItemStatus(task.id, "COMPLETED", "client-integration-key")).status, "COMPLETED");
  const calendar = await client.studyPlanApi.getCalendar(new Date().toISOString(), new Date(Date.now() + 172800000).toISOString());
  assert.equal(calendar.items.find((item) => item.id === task.id).planId, plan.id);
  await client.studyPlanApi.cancelItem(plan.id, task.id);
  await client.studyPlanApi.archivePlan(plan.id);
  assert.equal((await client.studyPlanApi.listPlans("ACTIVE")).items.some((item) => item.id === plan.id), false);
  const notifications = await client.notificationApi.list();
  const notice = notifications.items.find((item) => item.type === "ASSIGNMENT_PUBLISHED" && item.sourceId === draft.id);
  assert.ok(notice);
  assert.ok((await client.notificationApi.markRead(notice.id)).readAt);
  console.log("WEB_JAVA_PASS plans-and-notifications");
}
run().catch((error) => {
  const location = String(error.stack ?? "").split("\n").find((line) => line.includes("java-integration.cjs:"))?.trim() ?? "unknown";
  console.error(`WEB_JAVA_FAIL step=${integrationStep} ${error.name} status=${error.status ?? "assertion"} code=${error.code ?? "none"} at=${location}`);
  process.exitCode = 1;
});
