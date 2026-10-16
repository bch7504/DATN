const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

/**
 * @param {(url: string, options: RequestInit) => Promise<Response>} fetchStub Synthetic Java transport.
 * @returns {typeof import('../src/lib/api-client')} Actual typed client compiled without browser or secrets.
 * @throws {Error} For unexpected runtime imports or invalid TypeScript source.
 */
function loadClient(fetchStub) {
  const source = fs.readFileSync(path.join(process.cwd(), "src/lib/api-client.ts"), "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  vm.runInNewContext(compiled, {
    exports, Headers, FormData, fetch: fetchStub,
    require(name) {
      if (name === "./env") return { getApiUrl: () => "https://java.test/api/v1", isDemoMode: () => false };
      if (name === "./demo-data") return { DEMO_USERS: { STUDENT: { id: "synthetic-student" } } };
      throw new Error(`Unexpected import: ${name}`);
    },
  });
  return exports;
}

const pending = {
  status: "VERIFICATION_REQUIRED",
  expiresAt: "2026-10-16T14:10:00Z",
  resendAvailableAt: "2026-10-16T14:01:00Z",
};

test("registration sends OTP request and retains the pending response instead of creating a session", async () => {
  const calls = [];
  const client = loadClient(async (url, options) => {
    calls.push({ url, options });
    return Response.json(pending, { status: 202 });
  });
  const result = await client.authApi.register({
    displayName: "Sinh viên thử nghiệm", email: "student@stu.ptit.edu.vn", password: "synthetic-password",
  });
  assert.deepEqual({ ...result }, pending);
  assert.equal(calls[0].url, "https://java.test/api/v1/auth/register");
  assert.equal(calls[0].options.method, "POST");
  assert.equal(calls[0].options.credentials, "include");
  assert.deepEqual(JSON.parse(calls[0].options.body), {
    displayName: "Sinh viên thử nghiệm", email: "student@stu.ptit.edu.vn", password: "synthetic-password",
  });
});

test("OTP verification posts the six-digit code and accepts Java HTTP 204", async () => {
  const calls = [];
  const client = loadClient(async (url, options) => {
    calls.push({ url, options });
    return new Response(null, { status: 204 });
  });
  await client.authApi.verifyRegistration({ email: "student@stu.ptit.edu.vn", verificationCode: "123456" });
  assert.equal(calls[0].url, "https://java.test/api/v1/auth/verify-registration");
  assert.equal(calls[0].options.method, "POST");
  assert.deepEqual(JSON.parse(calls[0].options.body), {
    email: "student@stu.ptit.edu.vn", verificationCode: "123456",
  });
});

test("resend targets the pending email and parses the replacement code timing", async () => {
  const calls = [];
  const client = loadClient(async (url, options) => {
    calls.push({ url, options });
    return Response.json(pending, { status: 202 });
  });
  const result = await client.authApi.resendVerification({ email: "student@stu.ptit.edu.vn" });
  assert.deepEqual({ ...result }, pending);
  assert.equal(calls[0].url, "https://java.test/api/v1/auth/resend-verification");
  assert.deepEqual(JSON.parse(calls[0].options.body), { email: "student@stu.ptit.edu.vn" });
});

test("invalid OTP response schema and invalid code errors do not report success", async () => {
  const invalidClient = loadClient(async () => Response.json({ status: "READY" }, { status: 202 }));
  await assert.rejects(
    invalidClient.authApi.register({ displayName: "A", email: "student@stu.ptit.edu.vn", password: "synthetic" }),
    { code: "INVALID_REGISTRATION_RESPONSE", status: 502 },
  );
  const rejectedClient = loadClient(async () => Response.json(
    { code: "VERIFICATION_INVALID", message: "Mã xác minh không hợp lệ" }, { status: 422 },
  ));
  await assert.rejects(
    rejectedClient.authApi.verifyRegistration({ email: "student@stu.ptit.edu.vn", verificationCode: "000000" }),
    { code: "VERIFICATION_INVALID", status: 422 },
  );
});

test("registration screen shows OTP entry and redirects only after verification", () => {
  const page = fs.readFileSync(path.join(process.cwd(), "src/app/(auth)/register/page.tsx"), "utf8");
  assert.match(page, /autoComplete="one-time-code"/);
  assert.match(page, /resendVerification\(\{ email: verificationEmail \}\)/);
  assert.match(page, /await verifyRegistration\(\{ email: verificationEmail, verificationCode \}\);\s*router\.replace\("\/login\?verified=1"\)/);
  assert.doesNotMatch(page, /registered=true/);
});
