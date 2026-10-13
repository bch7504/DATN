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

  assert.match(apiClient, /\/student\/notifications/);
  assert.match(apiClient, /method: "PATCH"/);
  assert.doesNotMatch(apiClient, /localhost:8000|\/internal\/v1|pgvector/);
  assert.match(page, /Chỉ hiện chưa đọc/);
  assert.match(page, /notificationApi\.markRead/);
  assert.match(shell, /href: "\/notifications"/);
});
