const test = require("node:test");
const assert = require("node:assert/strict");

test("FE-M1: Role guard & route protection logic", async (t) => {
  function checkAccess(userRole, allowedRoles) {
    if (!userRole) return { allowed: false, action: "REDIRECT_LOGIN" };
    if (!allowedRoles.includes(userRole)) {
      return { allowed: false, action: "FORBIDDEN_403" };
    }
    return { allowed: true, action: "RENDER" };
  }

  await t.test("Unauthenticated user should always be redirected to login", () => {
    const result = checkAccess(null, ["STUDENT"]);
    assert.equal(result.allowed, false);
    assert.equal(result.action, "REDIRECT_LOGIN");
  });

  await t.test("Student accessing student routes should be allowed", () => {
    const result = checkAccess("STUDENT", ["STUDENT"]);
    assert.equal(result.allowed, true);
    assert.equal(result.action, "RENDER");
  });

  await t.test("Student accessing teacher routes should receive 403 Forbidden", () => {
    const result = checkAccess("STUDENT", ["TEACHER"]);
    assert.equal(result.allowed, false);
    assert.equal(result.action, "FORBIDDEN_403");
  });

  await t.test("Student accessing admin routes should receive 403 Forbidden", () => {
    const result = checkAccess("STUDENT", ["ADMIN"]);
    assert.equal(result.allowed, false);
    assert.equal(result.action, "FORBIDDEN_403");
  });

  await t.test("Teacher accessing teacher routes should be allowed", () => {
    const result = checkAccess("TEACHER", ["TEACHER"]);
    assert.equal(result.allowed, true);
    assert.equal(result.action, "RENDER");
  });

  await t.test("Admin accessing admin routes should be allowed", () => {
    const result = checkAccess("ADMIN", ["ADMIN"]);
    assert.equal(result.allowed, true);
    assert.equal(result.action, "RENDER");
  });
});
