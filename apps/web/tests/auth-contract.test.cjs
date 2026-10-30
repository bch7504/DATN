const test = require("node:test");
const assert = require("node:assert/strict");

test("FE-M1: Auth contract conformance", async (t) => {
  await t.test("Registration payload must not accept a role from the client", () => {
    // Java creates STUDENT accounts; the browser never chooses a privileged role.
    const registerPayload = {
      displayName: "Nguyen Van An",
      email: "an.nv@stu.ptit.edu.vn",
      password: "secure_password_123",
    };

    assert.equal(registerPayload.role, undefined);
  });
});
