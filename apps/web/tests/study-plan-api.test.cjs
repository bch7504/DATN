const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const client = fs.readFileSync(path.join(__dirname, "../src/lib/api-client.ts"), "utf8");
const planPage = fs.readFileSync(path.join(__dirname, "../src/app/(student)/plan/page.tsx"), "utf8");
const planEditor = fs.readFileSync(path.join(__dirname, "../src/app/(student)/plan/plan-editor.tsx"), "utf8");
const itemEditor = fs.readFileSync(path.join(__dirname, "../src/app/(student)/plan/plan-item-editor.tsx"), "utf8");

test("Personal study plan and calendar use persisted Java API data", async (t) => {
  await t.test("API client exposes owner-scoped plan, calendar, item, status, and cancel operations", () => {
    const api = client.slice(client.indexOf("export const studyPlanApi"));
    assert.match(api, /listPlans\(status\?: StudyPlanStatus/);
    assert.match(api, /createPlan\(input:/);
    assert.match(api, /getCalendar\(from: string, to: string\)/);
    assert.match(api, /createItem\(planId: string, input: SaveStudyPlanItemInput\)/);
    assert.match(api, /changeItemStatus\([\s\S]*?Idempotency-Key/);
    assert.match(api, /cancelItem\(planId: string, itemId: string\)/);
    assert.match(api, /removeItem\(planId: string, itemId: string\)/);
    assert.match(api, /permanentlyDeleteItem\(planId: string, itemId: string\)/);
    assert.match(api, /\/permanently`/);
  });

  await t.test("Plan screen loads and mutates server data without fixed demo entries", () => {
    assert.match(planPage, /studyPlanApi\.listPlans\("ACTIVE"\)/);
    assert.match(planPage, /studyPlanApi\.getCalendar/);
    assert.match(itemEditor, /studyPlanApi\.createItem/);
    assert.match(planPage, /studyPlanApi\.changeItemStatus/);
    assert.doesNotMatch(planPage, /sb_01|task_01|21\/09|2026-09-21|setScheduleBlocks|setTasks/);
  });

  await t.test("Plan forms use one date defaulting to today and send a same-day range to Java", () => {
    assert.match(planEditor, /const today = new Date\(\)/);
    assert.match(planEditor, /startDate: date, endDate: date/);
    assert.equal((planEditor.match(/Ngày kế hoạch<input/g) ?? []).length, 1);
    assert.doesNotMatch(planEditor, /Từ ngày<input|Đến ngày<input/);
    assert.match(planEditor, /endDate: date === plan\.startDate \? plan\.endDate : date/);
  });

  await t.test("Weekly calendar shows every saved schedule and accepts free-form date-times", () => {
    assert.doesNotMatch(planPage, /TIME_SLOTS|Khung giờ bắt đầu|scheduleDuration/);
    assert.match(planPage, /dayItems\.map\(\(item\) => <article/);
    assert.match(itemEditor, /type="datetime-local" required value=\{start\}/);
    assert.match(itemEditor, /type="datetime-local" required min=\{start\} value=\{end\}/);
    assert.match(itemEditor, /scheduledStart: scheduled \? new Date\(start\)\.toISOString/);
    assert.match(itemEditor, /router\.replace\(`\/plan\?planId=/);
  });

  await t.test("Calendar and task list share active week items while create/edit open dedicated routes", () => {
    const calendar = planPage.slice(planPage.indexOf("{weekDays.map"), planPage.indexOf("Danh sách nhiệm vụ"));
    const list = planPage.slice(planPage.indexOf("Danh sách nhiệm vụ"), planPage.indexOf("{pendingConfirmation &&"));
    assert.match(planPage, /const weekItems = items[\s\S]*?item\.status !== "CANCELLED" && \(item\.scheduledStart \|\| item\.dueAt\)/);
    assert.match(planPage, /const dayItems = weekItems\.filter/);
    assert.match(list, /weekItems\.map\(\(item\) => <article/);
    assert.doesNotMatch(calendar, /openEdit\(item\)|toggleTask\(item\)|cancelItem\(item\)/);
    assert.match(list, /onClick=\{\(\) => openEdit\(item\)\}/);
    assert.match(list, /onChange=\{\(\) => void toggleTask\(item\)\}/);
    assert.match(list, /onClick=\{\(\) => requestDeleteItem\(item\)\}/);
    assert.match(list, /item\.lateCompleted/);
    assert.doesNotMatch(planPage, /studyPlanApi\.removeItem\(confirmation\.item\.planId, confirmation\.item\.id\)/);
    assert.match(planPage, /saving \|\| item\.lateCompleted/);
    assert.doesNotMatch(planPage, /item\.type === "TASK"\s*\)/);
    assert.match(list, /onClick=\{openTask\}/);
    assert.doesNotMatch(list, /<form|Tên nhiệm vụ cần làm/);
    assert.match(planPage, /router\.push\(`\/plan\/\$\{encodeURIComponent\(activePlan\.id\)\}\/items\/new\?type=TASK/);
    assert.match(itemEditor, /studyPlanApi\.updateItem/);
    assert.doesNotMatch(planPage, /task-modal-title|schedule-modal-title/);
  });

  await t.test("Destructive plan actions use in-app confirmation and permanently remove item history", () => {
    assert.doesNotMatch(planPage, /window\.confirm|\bconfirm\(/);
    assert.match(planPage, /role="alertdialog" aria-modal="true"/);
    assert.match(planPage, /Xóa nhiệm vụ\?/);
    assert.match(planPage, /lịch sử hoàn thành và thông báo liên quan sẽ bị xóa\./);
    assert.match(planPage, /actionError\.status === 404/);
    assert.match(planPage, /Backend chưa nhận API xóa nhiệm vụ mới/);
    assert.match(planPage, /confirmPendingAction\(\)/);
    assert.match(planPage, /studyPlanApi\.permanentlyDeleteItem\(confirmation\.item\.planId, confirmation\.item\.id\)/);
  });

  await t.test("Optional class label appears only for approved offerings and is not presented as a real link", () => {
    assert.match(client, /getOfferings\(\): Promise<CourseOffering\[]>[\s\S]*?fetchAllPages<CourseOffering>\("\/student\/course-offerings"\)/);
    assert.match(itemEditor, /studentApi\.getOfferings\(\)/);
    assert.match(itemEditor, /classes\.length > 0 && <label/);
    assert.match(itemEditor, /description: item\?\.description \?\? \(label \? `Nhãn lớp:/);
    assert.match(itemEditor, /Nhãn lớp học \(tùy chọn\)/);
    assert.doesNotMatch(itemEditor, /courseOfferingId: classId/);
  });

  await t.test("Published teacher assignments appear beside personal items without becoming editable tasks", () => {
    assert.match(client, /export type CourseAssignment = \{[\s\S]*?createdAt: string/);
    assert.match(client, /listForStudent: \(\): Promise<CourseAssignment\[]> => apiFetch\("\/student\/assignments"\)/);
    assert.match(planPage, /assignmentApi\.listForStudent\(\)/);
    assert.match(planPage, /assignment\.status !== "PUBLISHED" \|\| !assignment\.publishedAt/);
    assert.match(planPage, /created < weekEnd\.getTime\(\) && due >= weekStart\.getTime\(\)/);
    assert.match(planPage, /dayAssignments\.map\(\(assignment\) => <article/);
    assert.match(planPage, /weekAssignments\.map\(\(assignment\) => <article/);
    assert.match(planPage, /assignment\.submission\.status === "LATE"/);
    assert.match(planPage, /assignmentStateLabel\(assignment, now\)/);
    assert.match(planPage, /href=\{`\/assignments\/\$\{encodeURIComponent\(assignment\.id\)\}/);
    assert.match(planPage, /\{!activePlan && \(/);
    assert.match(planPage, /\{activePlan && \(\s*<section className="flex flex-wrap items-end/);
    const assignmentCards = planPage.slice(planPage.indexOf("{weekAssignments.map((assignment) => <article"), planPage.indexOf("{pendingConfirmation &&"));
    assert.doesNotMatch(assignmentCards, /toggleTask\(assignment\)|openEdit\(assignment\)|cancelItem\(assignment\)/);
  });
});
