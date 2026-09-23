const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");

/**
 * @param {string} relativePath Source path below the web package.
 * @returns {string} UTF-8 source text used only for static contract assertions.
 * @throws {Error} When the expected source file is missing or unreadable.
 */
function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

test("auth client only calls documented Java endpoints", () => {
  const client = read("src/lib/api-client.ts");
  assert.match(client, /apiRequest<unknown>\("\/auth\/register"/);
  assert.match(client, /apiRequest<unknown>\("\/auth\/login"/);
  assert.match(client, /apiRequest<AuthenticatedUser>\("\/me"\)/);
  assert.match(client, /apiRequest<unknown>\("\/auth\/logout"/);
  assert.doesNotMatch(client, /OpenRouter|internal\/v1|pgvector/i);
});

test("fixtures require explicit demo mode", () => {
  const client = read("src/lib/api-client.ts");
  const app = read("src/components/study-flow-app.tsx");
  assert.match(client, /NEXT_PUBLIC_DEMO_MODE === "true"/);
  assert.doesNotMatch(client, /NODE_ENV === "development"/);
  assert.match(app, /demoMode && <span className="demo-badge"/);
});

test("route guard covers Student, Teacher and Admin", () => {
  const guard = read("src/components/auth-guard.tsx");
  assert.match(guard, /student: "STUDENT"/);
  assert.match(guard, /teacher: "TEACHER"/);
  assert.match(guard, /admin: "ADMIN"/);
  assert.match(guard, /reason\.status === 401/);
  assert.match(guard, /Không có quyền truy cập/);
});
