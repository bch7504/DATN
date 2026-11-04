const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const viewerPage = fs.readFileSync(
  path.join(root, "src/app/(student)/materials/[documentId]/viewer/page.tsx"),
  "utf8",
);
const apiClient = fs.readFileSync(path.join(root, "src/lib/api-client.ts"), "utf8");

test("Course Material Tutor keeps previous exchanges when the PDF page changes", () => {
  assert.match(viewerPage, /type TutorTimelineEntry/);
  assert.match(viewerPage, /type: "page-context"/);
  assert.match(viewerPage, /type: "exchange"/);
  assert.match(viewerPage, /setTutorTimeline\(\(current\) => \[/);
  assert.match(viewerPage, /Đang xem trang \{entry\.pageNumber\}/);
  assert.match(viewerPage, /Hỏi tại trang \{entry\.pageNumber\}/);
  assert.match(viewerPage, /tutorTimeline\.map/);
  assert.doesNotMatch(viewerPage, /setTutorResult\(null\)/);
});

test("Course Material Tutor still asks Java with the page captured for each exchange", () => {
  assert.match(viewerPage, /const askedPage = pageNumber/);
  assert.match(
    viewerPage,
    /materialApi\.askTutor\(document\.id, askedPage, normalizedQuestion\)/,
  );
  assert.match(viewerPage, /pageNumber: askedPage/);
  assert.match(viewerPage, /entry\.response\.citations\.map/);
});

test("Course Material Tutor keeps its panel fixed while only the conversation scrolls", () => {
  assert.match(viewerPage, /xl:sticky xl:top-4/);
  assert.match(viewerPage, /h-\[min\(760px,calc\(100dvh-2rem\)\)\]/);
  assert.match(viewerPage, /data-testid="tutor-scroll-region"/);
  assert.match(viewerPage, /min-h-0 flex-1 space-y-4 overflow-y-auto/);
  assert.match(viewerPage, /form onSubmit=\{handleAskTutor\} className="shrink-0/);
});

test("Course Material Tutor restores Java-owned long-term memory", () => {
  assert.match(apiClient, /getTutorHistory\(documentId: string\)/);
  assert.match(apiClient, /\/tutor\/history/);
  assert.match(viewerPage, /historyToTimeline/);
  assert.match(viewerPage, /materialApi\.getTutorHistory\(document\.id\)/);
  assert.match(viewerPage, /Đang tải lịch sử AI Tutor/);
});
