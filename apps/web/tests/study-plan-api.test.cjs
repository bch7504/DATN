const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const client = fs.readFileSync(path.join(__dirname, "../src/lib/api-client.ts"), "utf8");
const planPage = fs.readFileSync(path.join(__dirname, "../src/app/(student)/plan/page.tsx"), "utf8");

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
  });

  await t.test("Plan screen loads and mutates server data without fixed demo entries", () => {
    assert.match(planPage, /studyPlanApi\.listPlans\("ACTIVE"\)/);
    assert.match(planPage, /studyPlanApi\.getCalendar/);
    assert.match(planPage, /studyPlanApi\.createItem/);
    assert.match(planPage, /studyPlanApi\.changeItemStatus/);
    assert.doesNotMatch(planPage, /sb_01|task_01|21\/09|2026-09-21|setScheduleBlocks|setTasks/);
  });

  await t.test("Plan forms use one date defaulting to today and send a same-day range to Java", () => {
    assert.match(planPage, /newPlanDate, setNewPlanDate\] = useState\(\(\) => dateInputValue\(new Date\(\)\)\)/);
    assert.match(planPage, /startDate: newPlanDate,\s*endDate: newPlanDate/);
    assert.equal((planPage.match(/Ngày kế hoạch<input/g) ?? []).length, 3);
    assert.doesNotMatch(planPage, /Từ ngày<input|Đến ngày<input/);
    assert.match(planPage, /endDate: planDate === activePlan\.startDate \? activePlan\.endDate : planDate/);
  });

  await t.test("Weekly calendar shows every saved schedule and accepts free-form date-times", () => {
    assert.doesNotMatch(planPage, /TIME_SLOTS|Khung giờ bắt đầu|scheduleDuration/);
    assert.match(planPage, /dayItems\.map\(\(item\) => <article/);
    assert.match(planPage, /type="datetime-local" required value=\{scheduleStartAt\}/);
    assert.match(planPage, /type="datetime-local" required min=\{scheduleStartAt\} value=\{scheduleEndAt\}/);
    assert.match(planPage, /scheduledStart: startDate\.toISOString\(\),\s*scheduledEnd: endDate\.toISOString\(\)/);
    assert.match(planPage, /selectedWeekOffset === weekOffset\) await refreshCurrentWeek\(\)/);
  });

  await t.test("Calendar and task list share all active week items and creation stays in a dialog", () => {
    const calendar = planPage.slice(planPage.indexOf("{weekDays.map"), planPage.indexOf("Danh sách nhiệm vụ"));
    const list = planPage.slice(planPage.indexOf("Danh sách nhiệm vụ"), planPage.indexOf("{isScheduleModalOpen &&"));
    assert.match(planPage, /const weekItems = items[\s\S]*?item\.status !== "CANCELLED" && \(item\.scheduledStart \|\| item\.dueAt\)/);
    assert.match(planPage, /const dayItems = weekItems\.filter/);
    assert.match(list, /weekItems\.map\(\(item\) => <article/);
    assert.doesNotMatch(calendar, /openEdit\(item\)|toggleTask\(item\)|cancelItem\(item\)/);
    assert.match(list, /onClick=\{\(\) => openEdit\(item\)\}/);
    assert.match(list, /onChange=\{\(\) => void toggleTask\(item\)\}/);
    assert.match(list, /onClick=\{\(\) => void cancelItem\(item\)\}/);
    assert.match(list, /item\.lateCompleted/);
    assert.match(planPage, /studyPlanApi\.removeItem\(item\.planId, item\.id\)/);
    assert.match(planPage, /saving \|\| item\.lateCompleted/);
    assert.doesNotMatch(planPage, /item\.type === "TASK"\s*\)/);
    assert.match(list, /onClick=\{openTask\}/);
    assert.doesNotMatch(list, /<form|Tên nhiệm vụ cần làm/);
    assert.match(planPage, /aria-labelledby="task-modal-title"/);
    assert.match(planPage, /onSubmit=\{\(event\) => void addTask\(event\)\}/);
  });

  await t.test("Optional class label appears only for approved offerings and is not presented as a real link", () => {
    assert.match(client, /getOfferings\(\): Promise<CourseOffering\[]>[\s\S]*?fetchAllPages<CourseOffering>\("\/student\/course-offerings"\)/);
    assert.match(planPage, /studentApi\.getOfferings\(\)/);
    assert.match(planPage, /availableClasses\.length > 0 && <label/);
    assert.match(planPage, /description: selectedClass \? `Nhãn lớp:/);
    assert.match(planPage, /chưa liên kết dữ liệu lớp/);
    assert.doesNotMatch(planPage, /courseOfferingId: selectedClassId/);
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
    assert.match(planPage, /href="\/assignments"/);
    assert.match(planPage, /\{!activePlan && \(/);
    assert.match(planPage, /\{activePlan && \(\s*<section className="flex flex-wrap items-end/);
    const assignmentCards = planPage.slice(planPage.indexOf("{weekAssignments.map((assignment) => <article"), planPage.indexOf("{isScheduleModalOpen &&"));
    assert.doesNotMatch(assignmentCards, /toggleTask\(assignment\)|openEdit\(assignment\)|cancelItem\(assignment\)/);
  });
});
