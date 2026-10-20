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
  });

  await t.test("Plan screen loads and mutates server data without fixed demo entries", () => {
    assert.match(planPage, /studyPlanApi\.listPlans\("ACTIVE"\)/);
    assert.match(planPage, /studyPlanApi\.getCalendar/);
    assert.match(planPage, /studyPlanApi\.createItem/);
    assert.match(planPage, /studyPlanApi\.changeItemStatus/);
    assert.doesNotMatch(planPage, /sb_01|task_01|21\/09|2026-09-21|setScheduleBlocks|setTasks/);
  });
});
