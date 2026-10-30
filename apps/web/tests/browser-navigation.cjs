/**
 * CLI args: optional frontend origin (default http://localhost:3001).
 * Input: a running Next dev server, installed Chrome, and synthetic API fixtures below.
 * Output: route/Back/reload/form smoke results; exit 0 on success, 1 on failure.
 * All /api/v1 requests are intercepted; no real accounts, files, database writes or environment files are used.
 * Errors: missing Chrome/server, unexpected API request, browser exception or failed assertion fails the run.
 */
const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const origin = process.argv[2] || "http://localhost:3001";
const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const port = 9234;
const timestamp = "2030-01-07T02:00:00Z";
let role = "TEACHER";
let starts = 0;
const unexpected = [];
const runtimeErrors = [];
const offering = { id: "off1", code: "FIX101", name: "Fixture course", subjectId: "sub1", subjectCode: "FIX101", subjectName: "Fixture subject", semesterId: "sem1", semesterName: "Fixture semester", teacherId: "fixture-actor", teacherName: "Fixture teacher", status: "ACTIVE", joinCodeEnabled: true, joinCodeHint: "TEST", createdAt: timestamp };
const subject = { id: "sub1", code: "FIX101", name: "Fixture subject", credits: 3, description: "Synthetic catalog", status: "ACTIVE" };
const semester = { id: "sem1", code: "SEM1", name: "Fixture semester", academicYear: "2030-2031", startDate: "2030-01-01", endDate: "2030-06-30", status: "ACTIVE", offeringCreationEnabled: true };
const document = { id: "doc1", title: "Fixture PDF", fileName: "fixture.pdf", fileType: "PDF", fileSize: 100, status: "READY", totalPages: 2, publishedOfferings: [{ offeringId: "off1", offeringCode: "FIX101", offeringName: "Fixture course", publishedAt: timestamp }], createdAt: timestamp };
const assignment = { id: "a1", courseOfferingId: "off1", title: "Fixture assignment", description: "Fixture instructions", dueAt: "2030-01-08T10:00:00Z", status: "DRAFT", publishedAt: null, createdAt: timestamp, updatedAt: timestamp, submission: null };
const assignments = [assignment];
const question = { id: "qst1", type: "MCQ_SINGLE", questionText: "Fixture question", options: ["A", "B", "C", "D"].map((id) => ({ id, text: `Option ${id}` })), correctOptionId: "B", explanation: "Fixture explanation", citation: { documentId: "doc1", documentName: "Fixture PDF", pageNumber: 1, excerpt: "Synthetic evidence" } };
const draft = { id: "q1", prompt: "Fixture prompt", sourceDocumentIds: ["doc1"], status: "REVIEW_REQUIRED", questions: [question], createdAt: timestamp };
const plan = { id: "plan1", title: "Fixture plan", description: null, startDate: "2030-01-07", endDate: "2030-01-07", status: "ACTIVE", createdAt: timestamp, updatedAt: timestamp };
const items = [{ id: "item1", planId: "plan1", title: "Fixture task", description: null, type: "TASK", scheduledStart: null, scheduledEnd: null, dueAt: "2030-01-07T14:00:00Z", reminderAt: "2030-01-06T14:00:00Z", status: "TODO", completedAt: null, lateCompleted: false, createdAt: timestamp, updatedAt: timestamp }];
const adminUser = { id: "user1", email: "fixture@example.test", username: "fixture", fullName: "Fixture user", role: "STUDENT", status: "ACTIVE", createdAt: timestamp };
const feedback = { id: "report1", reporterId: "user1", title: "Fixture report", content: "Synthetic report content", type: "GENERAL", status: "OPEN", resolution: null, createdAt: timestamp, updatedAt: timestamp };

/** @param {unknown[]} records Synthetic records. @returns {object} Documented paginated response. */
function page(records) { return { items: records, page: 0, size: 100, totalItems: records.length, totalPages: records.length ? 1 : 0 }; }
/** @param {string} endpoint API path. @param {string} method HTTP method. @param {object} body JSON request. @returns {unknown} Synthetic API response; records unexpected endpoints. */
function fixture(endpoint, method, body) {
  if (endpoint === "/me") return { id: "fixture-actor", displayName: "Fixture actor", email: "actor@example.test", role };
  if (endpoint.includes("/notifications")) return page([]);
  if (endpoint === "/catalog/subjects") return page([subject]);
  if (endpoint === "/catalog/semesters") return page([semester]);
  if (endpoint === "/teacher/course-offerings" || endpoint === "/student/course-offerings") return page([offering]);
  if (endpoint.endsWith("/enrollments") || endpoint === "/student/course-enrollments") return page([{ id: "enr1", courseOfferingId: "off1", offeringId: "off1", studentId: "user1", studentName: "Fixture student", studentEmail: "student@example.test", status: "APPROVED", requestedAt: timestamp }]);
  if (endpoint === "/teacher/documents" && method === "POST") return document;
  if (endpoint === "/teacher/documents" || endpoint === "/student/materials" || endpoint.endsWith("/materials")) return page([document]);
  if (endpoint === "/personal-documents") return page([{ ...document, status: "READY" }]);
  if (endpoint.includes("/publications")) return null;
  if (endpoint === "/teacher/course-offerings/off1/assignments") {
    if (method === "POST") { const record = { ...assignment, ...body, id: "a2" }; assignments.push(record); return record; }
    return assignments;
  }
  if (/^\/teacher\/assignments\/[^/]+\/publish$/.test(endpoint)) { const record = assignments.find((item) => endpoint.includes(`/${item.id}/`)); record.status = "PUBLISHED"; record.publishedAt = timestamp; return record; }
  if (/^\/teacher\/assignments\/[^/]+\/submissions$/.test(endpoint)) return { assignmentId: "a1", title: "Fixture assignment", dueAt: assignment.dueAt, approvedStudentCount: 1, submittedCount: 0, onTimeCount: 0, lateCount: 0, notSubmittedCount: 1, students: [] };
  if (/^\/teacher\/assignments\/[^/]+$/.test(endpoint)) { const record = assignments.find((item) => endpoint.endsWith(`/${item.id}`)); Object.assign(record, body); return record; }
  if (endpoint === "/student/assignments") return assignments.map((item) => ({ ...item, status: "PUBLISHED", publishedAt: timestamp }));
  if (/^\/student\/assignments\/[^/]+\/submissions$/.test(endpoint)) { assignment.submission = { id: "submission1", answerText: "Fixture answer", status: "ON_TIME", submittedAt: timestamp, attachments: [] }; return assignment.submission; }
  if (endpoint === "/teacher/quizzes/generations" || endpoint === "/quizzes") return draft;
  if (endpoint.endsWith("/regenerate")) return { ...draft, id: "q2" };
  if (/^\/review\/quizzes\/[^/]+\/accept$/.test(endpoint)) return { id: "q1", title: "Fixture Quiz", courseOfferingId: body.courseOfferingId || null, status: "READY" };
  if (endpoint === "/teacher/quizzes/q1/publish") return { ...draft, status: "PUBLISHED" };
  if (/^\/review\/quizzes\/[^/]+\/attempts$/.test(endpoint)) { starts += 1; return { attemptId: "attempt1", quizId: "q1", quizTitle: "Fixture Quiz", startedAt: timestamp, totalQuestions: 1, questions: [{ id: "qst1", questionOrder: 1, questionText: "Fixture question", options: [0, 1, 2, 3].map((index) => ({ index, text: `Option ${index}` })) }] }; }
  if (endpoint === "/review/attempts/attempt1/submit") return { attemptId: "attempt1", quizId: "q1", score: 100, correctAnswersCount: 1, totalQuestionsCount: 1, completedAt: timestamp };
  if (/^\/review\/quizzes\/[^/]+$/.test(endpoint)) return draft;
  if (endpoint === "/review/personal-quizzes") return [{ id: "q1", title: "Fixture Quiz", questionCount: 1, createdAt: timestamp, attemptCount: 0, highestScore: null }];
  if (endpoint === "/review/course-offerings/off1") return { courseOfferingId: "off1", quizzes: [], reviewItems: [], attempts: [] };
  if (endpoint === "/calendar") return { from: timestamp, to: timestamp, items };
  if (endpoint === "/study-plans") return page([plan]);
  if (endpoint === "/study-plans/plan1") { if (method === "PUT") Object.assign(plan, body); return plan; }
  if (endpoint === "/study-plans/plan1/items") { if (method === "POST") { const record = { ...items[0], ...body, id: "item2" }; items.push(record); return record; } return page(items); }
  if (endpoint === "/study-plans/plan1/items/item1") { Object.assign(items[0], body); return items[0]; }
  if (endpoint === "/admin/users") return page([adminUser]);
  if (endpoint === "/admin/users/user1") { Object.assign(adminUser, body); return adminUser; }
  if (endpoint === "/admin/feedback-reports") return page([feedback]);
  if (endpoint === "/admin/feedback-reports/report1") { Object.assign(feedback, body); return feedback; }
  if (endpoint === "/admin/course-offerings") return page([{ ...offering, approvedStudents: 1, semesterCode: "SEM1" }]);
  if (endpoint === "/admin/course-offerings/off1") return { ...offering, approvedStudents: 1, semesterCode: "SEM1" };
  if (endpoint === "/admin/subjects") return page([subject]);
  if (endpoint === "/admin/semesters") return page([semester]);
  unexpected.push(`${method} ${endpoint}`);
  return { code: "FIXTURE_NOT_CONFIGURED", message: "Unexpected fixture API" };
}

let sequence = 0;
const pending = new Map();
let socket;
/** @param {string} method CDP method. @param {object} params CDP arguments. @returns {Promise<object>} CDP result. @throws {Error} Protocol error or timeout. */
function command(method, params = {}) {
  const id = ++sequence;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { pending.delete(id); reject(new Error(`CDP timeout: ${method}`)); }, 30000);
    pending.set(id, { resolve, reject, timer }); socket.send(JSON.stringify({ id, method, params }));
  });
}
/** @param {string} expression Browser JavaScript expression. @returns {Promise<unknown>} JSON-compatible result. @throws {Error} JavaScript exception. */
async function evaluate(expression) {
  const result = await command("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
  return result.result.value;
}
/** @param {string} expression Boolean browser expression. @param {number} timeout Maximum milliseconds. @returns {Promise<void>} Resolves on success. @throws {Error} Failed browser condition. */
async function waitFor(expression, timeout = 45000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) { if (await evaluate(expression)) return; await new Promise((resolve) => setTimeout(resolve, 150)); }
  throw new Error(`Browser condition timed out: ${expression}\n${await evaluate("document.body.innerText.slice(-1800)")}`);
}
/** @param {string} pathname App route. @param {string} actor Role fixture. @returns {Promise<void>} Navigates and waits for route/form content. @throws {Error} Route compile/render failure. */
async function visit(pathname, actor = role) {
  role = actor;
  await command("Page.navigate", { url: origin + pathname });
  await waitFor(`location.pathname === ${JSON.stringify(pathname.split("?")[0])} && !!document.querySelector('h1') && !document.body.innerText.includes('Build Error')`);
  await new Promise((resolve) => setTimeout(resolve, 350));
  console.log(`PASS direct ${actor} ${pathname}`);
}
/** @param {string} selector CSS selector. @returns {Promise<void>} Clicks after render. @throws {Error} Missing element. */
async function click(selector) { await waitFor(`!!document.querySelector(${JSON.stringify(selector)})`); await evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`); }
/** @param {string} selector CSS selector. @param {string} value Controlled field value. @returns {Promise<void>} Dispatches a React-compatible input event. @throws {Error} Missing field. */
async function fill(selector, value) {
  await waitFor(`!!document.querySelector(${JSON.stringify(selector)})`);
  await evaluate(`(() => { const element=document.querySelector(${JSON.stringify(selector)}); const prototype=element.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:element.tagName==='SELECT'?HTMLSelectElement.prototype:HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(prototype,'value').set.call(element,${JSON.stringify(value)}); element.dispatchEvent(new Event(element.tagName==='SELECT'?'change':'input',{bubbles:true})); })()`);
}

/** Args: none. Input: synthetic role fixtures and running Next app. Output: Promise<void>; exercises route separation, browser history, reload and write payloads. Errors: assertion/protocol/API mismatch fails the CLI. */
async function run() {
  assert.ok(fs.existsSync(chromePath), "Chrome is required");
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), "studyflow-route-smoke-"));
  const chrome = spawn(chromePath, ["--headless=new", "--disable-gpu", "--no-first-run", "--no-default-browser-check", "--remote-allow-origins=*", `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, "about:blank"], { windowsHide: true, stdio: ["ignore", "ignore", "pipe"] });
  let diagnostics = "";
  chrome.stderr.on("data", (chunk) => { diagnostics += chunk.toString(); });
  try {
    let targets;
    for (let attempt = 0; attempt < 100; attempt += 1) { try { targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json(); break; } catch { await new Promise((resolve) => setTimeout(resolve, 200)); } }
    assert.ok(targets?.length, `Chrome debugging target unavailable: ${diagnostics.slice(0, 800)}`);
    socket = new WebSocket(targets.find((target) => target.type === "page").webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { socket.addEventListener("open", resolve, { once: true }); socket.addEventListener("error", reject, { once: true }); });
    socket.addEventListener("message", async (event) => {
      const message = JSON.parse(event.data);
      if (message.id) { const task = pending.get(message.id); if (task) { pending.delete(message.id); clearTimeout(task.timer); if (message.error) task.reject(new Error(message.error.message)); else task.resolve(message.result); } }
      if (message.method === "Runtime.exceptionThrown") runtimeErrors.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
      if (message.method === "Fetch.requestPaused") {
        const { requestId, request } = message.params;
        const endpoint = new URL(request.url).pathname.replace(/^.*\/api\/v1/, "");
        let body = {}; try { body = JSON.parse(request.postData || "{}"); } catch { /* Multipart form contents are irrelevant to navigation fixtures. */ }
        const result = request.method === "OPTIONS" ? null : fixture(endpoint, request.method, body);
        await command("Fetch.fulfillRequest", { requestId, responseCode: 200, responseHeaders: [{ name: "Content-Type", value: "application/json" }, { name: "Access-Control-Allow-Origin", value: origin }, { name: "Access-Control-Allow-Credentials", value: "true" }, { name: "Access-Control-Allow-Methods", value: "GET, POST, PUT, PATCH, DELETE, OPTIONS" }, { name: "Access-Control-Allow-Headers", value: "Content-Type, Authorization, Idempotency-Key" }], body: Buffer.from(JSON.stringify(result)).toString("base64") });
      }
    });
    await command("Runtime.enable"); await command("Page.enable"); await command("Fetch.enable", { patterns: [{ urlPattern: "*/api/v1/*", requestStage: "Request" }] });

    await visit("/teacher/assignments");
    await waitFor("document.body.innerText.includes('Fixture assignment')");
    await evaluate("Array.from(document.querySelectorAll('main button')).find(element=>element.innerText.includes('Fixture assignment')).click()");
    await waitFor("location.pathname === '/teacher/assignments/a1'");
    await command("Page.reload"); await waitFor("document.body.innerText.includes('Fixture instructions')");
    assert.equal(await evaluate("Array.from(document.querySelectorAll('h2')).some(element=>element.textContent==='Danh sách bài tập')"), false);
    await evaluate("history.back()"); await waitFor("location.pathname === '/teacher/assignments'");
    console.log("PASS teacher assignment detail/reload/Back without duplicate list");
    await visit("/teacher/assignments/new?offeringId=off1");
    await fill('main input:not([type])', "Fixture created assignment"); await fill('main input[type="datetime-local"]', "2030-01-08T17:00"); await fill("main textarea", "Fixture new instructions"); await click('main button:not([type="button"])');
    await waitFor("location.pathname === '/teacher/assignments/a2'");
    console.log("PASS assignment create/save opens detail route");
    for (const route of ["/teacher/assignments/a1/edit", "/teacher/course-offerings/new", "/teacher/documents", "/teacher/documents/off1", "/teacher/documents/off1/upload", "/teacher/documents/publications/doc1?offeringId=off1", "/teacher/quizzes/create", "/teacher/quizzes/q1"]) await visit(route);
    await visit("/teacher/quizzes/create");
    await click('main form button[type="submit"], form button[type="submit"]');
    await waitFor("location.pathname === '/teacher/quizzes/q1'");
    console.log("PASS teacher generation opens separate review screen");

    for (const route of ["/admin/users", "/admin/users/user1/edit", "/admin/feedback/report1", "/admin/course-offerings/off1", "/admin/catalog/subjects", "/admin/catalog/subjects/new", "/admin/catalog/subjects/sub1/edit", "/admin/catalog/semesters", "/admin/catalog/semesters/new", "/admin/catalog/semesters/sem1/edit"]) await visit(route, "ADMIN");

    for (const route of ["/assignments", "/assignments/a1", "/materials", "/materials/class/off1", "/course-offerings", "/course-offerings/off1", "/plan", "/plan/new", "/plan/plan1/edit", "/plan/plan1/items/new?type=STUDY_SESSION&date=2030-01-07", "/plan/plan1/items/new?type=TASK&date=2030-01-07", "/plan/plan1/items/item1/edit", "/quiz/create", "/quiz/drafts/q1", "/quiz/drafts/q1/accept"]) await visit(route, "STUDENT");
    await visit("/assignments/a1", "STUDENT");
    await fill("main textarea", "Fixture answer");
    await evaluate("Array.from(document.querySelectorAll('main button')).find(element=>element.innerText.includes('Nộp bài')).click()");
    await waitFor("document.querySelector('[role=status]')?.innerText.includes('Đã lưu bài nộp')");
    await visit("/plan/plan1/items/new?type=TASK&date=2030-01-07", "STUDENT");
    await fill("main form input:not([type])", "Fixture created task"); await click("main form button");
    await waitFor("location.pathname === '/plan' && document.body.innerText.includes('Fixture created task')");
    await command("Page.reload"); await waitFor("document.body.innerText.includes('Fixture created task')");
    console.log("PASS task create returns to saved calendar week and survives reload");
    await visit("/quiz/create", "STUDENT");
    await click('main input[type="checkbox"]'); await fill("#quiz-prompt", "Fixture generation prompt"); await click("main form button");
    await waitFor("location.pathname === '/quiz/drafts/q1'");
    await command("Page.reload"); await waitFor("document.body.innerText.includes('Fixture question')");
    await click('main a[href="/quiz/drafts/q1/accept"]'); await waitFor("location.pathname.endsWith('/accept')");
    await click("main form button"); await waitFor("location.pathname === '/review/PERSONAL'");
    console.log("PASS Student generate/review/reload/accept routes");
    await visit("/review/PERSONAL", "STUDENT");
    await waitFor("document.body.innerText.includes('Fixture Quiz')");
    await evaluate("Array.from(document.querySelectorAll('button')).find(element=>element.innerText.includes('Làm bài thi')).click()");
    await waitFor("location.pathname === '/review/PERSONAL/attempts/attempt1' && !!document.querySelector('input[type=radio]')");
    await click('input[type="radio"]');
    await command("Page.reload"); await waitFor("!!document.querySelector('input[type=radio]:checked')");
    assert.equal(starts, 1, "Reload must not create another attempt");
    await evaluate("Array.from(document.querySelectorAll('main button')).find(element=>element.innerText.includes('Nộp bài')).click()");
    await waitFor("location.pathname.endsWith('/result') && document.body.innerText.includes('100%')");
    await command("Page.reload"); await waitFor("document.body.innerText.includes('100%')");
    console.log("PASS quiz taking/reload/submit/result/reload with one Java attempt");
    assert.deepEqual(unexpected, [], "Unexpected fixture API calls");
    assert.deepEqual(runtimeErrors, [], "Browser runtime errors");
    console.log("PASS all route smoke checks; API data was synthetic test data only");
  } finally { socket?.close(); chrome.kill(); }
}
run().catch((error) => { console.error(error); process.exitCode = 1; });
