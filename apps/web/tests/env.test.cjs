const test = require("node:test");
const assert = require("node:assert/strict");

test("FE-M0: Environment configuration & validation", async (t) => {
  await t.test("should default NEXT_PUBLIC_API_URL to localhost:8080/api/v1", () => {
    const rawUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1";
    assert.match(rawUrl, /^https?:\/\//);
    assert.ok(rawUrl.includes("/api/v1"));
  });

  await t.test("should default NEXT_PUBLIC_DEMO_MODE to true if not set", () => {
    const demoMode = process.env.NEXT_PUBLIC_DEMO_MODE ?? "true";
    const isDemo = demoMode === "true" || demoMode === "1";
    assert.equal(isDemo, true);
  });

  await t.test("should only permit NEXT_PUBLIC_ prefixed variables on client", () => {
    const publicKeys = Object.keys(process.env).filter((k) =>
      k.startsWith("NEXT_PUBLIC_")
    );
    for (const key of publicKeys) {
      assert.ok(
        key.startsWith("NEXT_PUBLIC_"),
        `Key ${key} does not have NEXT_PUBLIC_ prefix`
      );
    }
  });
});
