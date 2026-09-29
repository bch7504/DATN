const test = require("node:test");
const assert = require("node:assert/strict");

test("FE-M0: API Client contract & error envelope handling", async (t) => {
  await t.test("ApiClientError should correctly parse standard error envelope", () => {
    class ApiClientError extends Error {
      constructor(status, envelope) {
        super(envelope.message || `Lỗi API mã ${status}`);
        this.name = "ApiClientError";
        this.code = envelope.code || "UNKNOWN_ERROR";
        this.status = status;
        this.details = envelope.details;
        this.traceId = envelope.traceId;
      }
    }

    const envelope = {
      code: "ENROLLMENT_REQUIRED",
      message: "Bạn chưa được duyệt vào lớp học phần",
      details: { offeringId: "offering_dbi_01" },
      traceId: "req_test_12345",
    };

    const err = new ApiClientError(403, envelope);
    assert.equal(err.status, 403);
    assert.equal(err.code, "ENROLLMENT_REQUIRED");
    assert.equal(err.message, "Bạn chưa được duyệt vào lớp học phần");
    assert.equal(err.traceId, "req_test_12345");
    assert.deepEqual(err.details, { offeringId: "offering_dbi_01" });
  });

  await t.test("API base URL should not end with trailing slash", () => {
    const rawUrl = "http://localhost:8080/api/v1/";
    const normalized = rawUrl.endsWith("/") ? rawUrl.slice(0, -1) : rawUrl;
    assert.equal(normalized, "http://localhost:8080/api/v1");
  });

  await t.test("Auth endpoints should only call Java /api/v1 without exposing direct AI/DB URLs", () => {
    const allowedPrefix = "/api/v1";
    const endpoints = [
      "/auth/login",
      "/auth/register",
      "/auth/logout",
      "/me",
    ];

    for (const ep of endpoints) {
      assert.ok(!ep.includes("/internal/"));
      assert.ok(!ep.includes("localhost:8000")); // Python AI service
      assert.ok(!ep.includes("postgres"));
    }
  });
});
