const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

test("FE-F03: deadline notification UI uses only the Java public contract", () => {
  const root = path.resolve(__dirname, "..");
  const apiClient = fs.readFileSync(path.join(root, "src/lib/api-client.ts"), "utf8");
  const page = fs.readFileSync(
    path.join(root, "src/app/(student)/notifications/page.tsx"),
    "utf8"
  );
  const shell = fs.readFileSync(path.join(root, "src/components/layout/app-shell.tsx"), "utf8");
  const bell = fs.readFileSync(path.join(root, "src/components/layout/student-notification-bell.tsx"), "utf8");
  const navigation = fs.readFileSync(path.join(root, "src/lib/notification-navigation.ts"), "utf8");
  const types = fs.readFileSync(path.join(root, "src/types/notification.ts"), "utf8");

  assert.match(apiClient, /\/student\/notifications/);
  assert.match(apiClient, /method: "PATCH"/);
  assert.doesNotMatch(apiClient, /localhost:8000|\/internal\/v1|pgvector/);
  assert.match(page, /Chỉ hiện chưa đọc/);
  assert.match(page, /notificationApi\.markRead/);
  assert.doesNotMatch(shell, /href: "\/notifications"/);
  assert.match(shell, /NotificationBell/);
  assert.match(shell, /role === "TEACHER"/);
  assert.match(bell, /client\.list\(true, 0, 1\)/);
  assert.match(bell, /client\.markRead/);
  assert.match(apiClient, /\/teacher\/notifications/);
  assert.match(bell, /notificationDestination/);
  assert.match(navigation, /\/teacher\/enrollments/);
  assert.match(navigation, /\/teacher\/assignments/);
  assert.match(navigation, /\/teacher\/documents/);
  assert.match(navigation, /\/materials/);
  assert.match(navigation, /\/course-offerings/);
  assert.match(types, /STUDENT_MATERIAL_PUBLISHED/);
  assert.match(types, /TEACHER_ASSIGNMENT_EXPIRED/);
  assert.match(types, /STUDENT_ENROLLMENT_APPROVED/);
  assert.match(types, /STUDY_PLAN_ITEM_CREATED/);
  assert.match(types, /STUDY_PLAN_ITEM_EXPIRED/);
  assert.match(types, /STUDY_PLAN_ITEM_LATE_COMPLETED/);
  assert.match(navigation, /STUDY_PLAN_ITEM_LATE_COMPLETED/);
  assert.match(bell, /studyflow:notifications-updated/);
  assert.match(bell, /Chỉ chưa đọc/);
  assert.match(bell, /Xem thêm thông báo/);
});
