const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

const source = fs.readFileSync(path.join(__dirname, "../src/lib/study-plan-dates.ts"), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const api = {};
vm.runInNewContext(compiled, { exports: api, Intl, Date, RangeError });

test("plan containment preserves an existing range without changing its input", () => {
  const plan = Object.freeze({ startDate: "2026-10-20", endDate: "2026-11-05" });
  const result = api.requiredPlanRange(plan, ["2026-10-31T02:00:00Z", "2026-11-02T13:08:00Z", null, undefined, ""], "Asia/Ho_Chi_Minh");
  assert.equal(result.startDate, plan.startDate);
  assert.equal(result.endDate, plan.endDate);
  assert.notEqual(result, plan);
});

test("a one-day plan can explicitly expand to contain a multi-day schedule and deadline", () => {
  const result = api.requiredPlanRange({ startDate: "2026-10-31", endDate: "2026-10-31" }, ["2026-10-31T02:00:00Z", "2026-11-02T13:08:00Z", "2026-11-02T13:08:00Z"], "Asia/Ho_Chi_Minh");
  assert.equal(result.startDate, "2026-10-31");
  assert.equal(result.endDate, "2026-11-02");
});

test("earlier schedules and later task deadlines extend both ends without shrinking the plan", () => {
  const result = api.requiredPlanRange({ startDate: "2026-10-20", endDate: "2026-10-31" }, ["2026-10-18T02:00:00Z", "2026-11-03T14:00:00Z"], "Asia/Ho_Chi_Minh");
  assert.equal(result.startDate, "2026-10-18");
  assert.equal(result.endDate, "2026-11-03");
});

test("calendar bounds use the account IANA zone rather than UTC dates", () => {
  const plan = { startDate: "2026-10-31", endDate: "2026-10-31" };
  const times = ["2026-11-01T00:30:00Z"];
  assert.equal(api.requiredPlanRange(plan, times, "America/Los_Angeles").endDate, "2026-10-31");
  assert.equal(api.requiredPlanRange(plan, times, "Asia/Ho_Chi_Minh").endDate, "2026-11-01");
  assert.equal(api.requiredPlanRange(plan, ["2026-10-31T00:30:00Z"], "America/Los_Angeles").startDate, "2026-10-30");
});

test("malformed inputs fail before a misleading plan range is returned", () => {
  assert.throws(() => api.requiredPlanRange({ startDate: "2026-11-02", endDate: "2026-10-31" }, [], "UTC"), RangeError);
  assert.throws(() => api.requiredPlanRange({ startDate: "31/10/2026", endDate: "2026-11-02" }, [], "UTC"), RangeError);
  const plan = { startDate: "2026-10-31", endDate: "2026-10-31" };
  assert.throws(() => api.requiredPlanRange(plan, ["invalid"], "UTC"), RangeError);
  assert.throws(() => api.requiredPlanRange(plan, [], "Invalid/Zone"), RangeError);
});

test("plan date labels keep the original calendar date without UTC conversion", () => {
  assert.equal(api.planDateLabel("2026-10-31"), "31/10/2026");
  assert.equal(api.planDateLabel(""), "");
});
