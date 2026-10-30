const test = require("node:test");
const assert = require("node:assert/strict");
const loadApiClient = require("./helpers/load-api-client.cjs");

const base = "http://java.test/api/v1";
const page = (items) => ({ items, page: 0, size: 20, totalItems: items.length, totalPages: items.length ? 1 : 0 });
const json = (value, status = 200) => new Response(JSON.stringify(value), { status, headers: { "Content-Type": "application/json" } });

test("Admin client reads the Java dashboard and typed paginated metadata", async () => {
  const calls = [];
  const dashboard = { users: 4, students: 2, teachers: 1, activeOfferings: 3, pendingEnrollments: 1, publishedDocuments: 5, openFeedbackReports: 2 };
  const subject = { id: "sub-1", code: "BAS1151", name: "Kinh tế chính trị", credits: 3, description: null, status: "ACTIVE" };
  const client = loadApiClient(async (url, options) => {
    calls.push({ url, method: options.method || "GET" });
    if (url.endsWith("/admin/dashboard")) return json(dashboard);
    if (url.includes("/admin/subjects?")) return json(page([subject]));
    throw new Error(`Unexpected request ${url}`);
  }, base);

  assert.deepEqual(await client.adminApi.getDashboard(), dashboard);
  const result = await client.adminApi.getSubjects();
  assert.equal(result.totalItems, 1);
  assert.deepEqual(result.items[0], subject);
  assert.equal(calls[0].url, `${base}/admin/dashboard`);
  assert.equal(calls[1].url, `${base}/admin/subjects?page=0&size=20`);
});

test("Admin mutations send exact methods and payloads through Java", async () => {
  const calls = [];
  const client = loadApiClient(async (url, options) => {
    calls.push({ path: new URL(url).pathname, method: options.method, body: options.body ? JSON.parse(options.body) : undefined });
    if (options.method === "DELETE") return new Response(null, { status: 204 });
    return json({ id: "x", status: "ACTIVE", registrationEnabled: false });
  }, base);

  await client.adminApi.updateUser("user-1", { status: "LOCKED" });
  await client.adminApi.createSubject({ code: "BAS1151", name: "Môn học", credits: 3 });
  await client.adminApi.updateSubject("sub-1", { status: "INACTIVE" });
  await client.adminApi.createSemester({ code: "HK1", name: "Kỳ 1", academicYear: "2026-2027", startDate: "2026-09-01", endDate: "2027-01-31", status: "ACTIVE", offeringCreationEnabled: true });
  await client.adminApi.updateSemester("sem-1", { offeringCreationEnabled: false });
  await client.adminApi.deleteSemester("sem-1");
  await client.adminApi.lockOffering("off-1");
  await client.adminApi.archiveOffering("off-2");
  await client.adminApi.updateFeedbackReport("feedback-1", { status: "RESOLVED", resolution: "Đã xử lý" });
  await client.adminApi.updateSettings(false);

  assert.deepEqual(calls, [
    { path: "/api/v1/admin/users/user-1", method: "PATCH", body: { status: "LOCKED" } },
    { path: "/api/v1/admin/subjects", method: "POST", body: { code: "BAS1151", name: "Môn học", credits: 3 } },
    { path: "/api/v1/admin/subjects/sub-1", method: "PATCH", body: { status: "INACTIVE" } },
    { path: "/api/v1/admin/semesters", method: "POST", body: { code: "HK1", name: "Kỳ 1", academicYear: "2026-2027", startDate: "2026-09-01", endDate: "2027-01-31", status: "ACTIVE", offeringCreationEnabled: true } },
    { path: "/api/v1/admin/semesters/sem-1", method: "PATCH", body: { offeringCreationEnabled: false } },
    { path: "/api/v1/admin/semesters/sem-1", method: "DELETE", body: undefined },
    { path: "/api/v1/admin/course-offerings/off-1/lock", method: "POST", body: undefined },
    { path: "/api/v1/admin/course-offerings/off-2/archive", method: "POST", body: undefined },
    { path: "/api/v1/admin/feedback-reports/feedback-1", method: "PATCH", body: { status: "RESOLVED", resolution: "Đã xử lý" } },
    { path: "/api/v1/admin/system-settings", method: "PATCH", body: { registrationEnabled: false } },
  ]);
});

test("Admin list filters and detail routes follow the documented contract", async () => {
  const paths = [];
  const client = loadApiClient(async (url) => {
    paths.push(url.slice(base.length));
    if (url.includes("system-settings")) return json({ registrationEnabled: true });
    if (url.endsWith("/admin/course-offerings/off-1")) return json({ id: "off-1", code: "BAS1151-01", status: "ACTIVE" });
    return json(page([]));
  }, base);

  assert.equal((await client.adminApi.getUsers(1, 10, "TEACHER", "ACTIVE")).items.length, 0);
  await client.adminApi.getSemesters();
  await client.adminApi.getCourseOfferings(0, 20, "LOCKED");
  assert.equal((await client.adminApi.getCourseOffering("off-1")).id, "off-1");
  await client.adminApi.getFeedbackReports(0, 20, "OPEN");
  await client.adminApi.getSystemLogs();
  assert.deepEqual(await client.adminApi.getSettings(), { registrationEnabled: true });
  assert.deepEqual(paths, [
    "/admin/users?page=1&size=10&role=TEACHER&status=ACTIVE",
    "/admin/semesters?page=0&size=20",
    "/admin/course-offerings?page=0&size=20&status=LOCKED",
    "/admin/course-offerings/off-1",
    "/admin/feedback-reports?page=0&size=20&status=OPEN",
    "/admin/system-logs?page=0&size=20",
    "/admin/system-settings",
  ]);
});

test("Admin client rejects invalid input, invalid page schemas and Java errors", async () => {
  let requests = 0;
  const client = loadApiClient(async () => { requests++; return json({ items: {}, page: 0, size: 20, totalItems: 0, totalPages: 0 }); }, base);
  assert.throws(() => client.adminApi.getUsers(-1), (error) => error.code === "INVALID_PAGE");
  assert.throws(() => client.adminApi.updateUser("user-1", {}), (error) => error.code === "INVALID_USER_UPDATE");
  assert.throws(() => client.adminApi.getCourseOffering(""), (error) => error.code === "INVALID_ID");
  assert.equal(requests, 0);
  await assert.rejects(client.adminApi.getSubjects(), (error) => error.code === "INVALID_API_RESPONSE");

  const failed = loadApiClient(async () => json({ code: "SUBJECT_IN_USE", message: "Môn học đang được sử dụng" }, 409), base);
  await assert.rejects(failed.adminApi.deleteSubject("sub-1"), (error) => error.status === 409 && error.code === "SUBJECT_IN_USE");
});
