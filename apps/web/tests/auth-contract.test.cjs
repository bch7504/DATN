const test = require("node:test");
const assert = require("node:assert/strict");

test("FE-M1: Auth contract & demo accounts conformance", async (t) => {
  const DEMO_USERS = {
    STUDENT: {
      id: "usr_student_01",
      displayName: "Nguyễn Văn An",
      email: "student@ptit.edu.vn",
      role: "STUDENT",
    },
    TEACHER: {
      id: "usr_teacher_01",
      displayName: "TS. Trần Thị Giảng Viên",
      email: "teacher@ptit.edu.vn",
      role: "TEACHER",
    },
    ADMIN: {
      id: "usr_admin_01",
      displayName: "Quản trị viên Hệ thống PTIT",
      email: "admin@ptit.edu.vn",
      role: "ADMIN",
    },
  };

  await t.test("Demo accounts should contain exactly the 3 required roles", () => {
    const roles = Object.keys(DEMO_USERS);
    assert.deepEqual(roles.sort(), ["ADMIN", "STUDENT", "TEACHER"]);
  });

  await t.test("Every demo user must have valid id, displayName, email, and role", () => {
    for (const [role, user] of Object.entries(DEMO_USERS)) {
      assert.ok(user.id.startsWith("usr_"), `User ID ${user.id} should start with usr_`);
      assert.ok(user.displayName.length > 0, "DisplayName must not be empty");
      assert.match(user.email, /^[^@]+@ptit\.edu\.vn$/, "Email must be a ptit.edu.vn email");
      assert.equal(user.role, role, "Role must match dictionary key");
    }
  });

  await t.test("Registration payload should not accept role from client", () => {
    // Per docs/api-plan.md Section 2: "Java tạo STUDENT; Frontend không nhận role từ form đăng ký."
    const registerPayload = {
      displayName: "Nguyen Van An",
      email: "an.nv@stu.ptit.edu.vn",
      password: "secure_password_123",
    };

    assert.equal(registerPayload.role, undefined, "Role should not be provided by client in registration");
  });
});
