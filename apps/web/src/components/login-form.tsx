"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { ApiClientError, getCurrentUser, isDemoMode, login, register } from "@/lib/api-client";
import type { UserRole } from "@/types/api";

type DemoRole = "student" | "teacher" | "admin";

const roleRoute: Record<UserRole, DemoRole> = {
  STUDENT: "student",
  TEACHER: "teacher",
  ADMIN: "admin",
};

/**
 * Renders login against Java, with an explicitly labelled fixture path in demo mode.
 * @returns Accessible login form and its loading/error states.
 */
export function LoginForm() {
  const router = useRouter();
  const demo = isDemoMode();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [mode, setMode] = useState<"login" | "register">("login");
  const [demoRole, setDemoRole] = useState<DemoRole>("student");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setError(null);
    if (demo) {
      router.push(`/${demoRole}/dashboard`);
      return;
    }
    if (!identifier.trim() || !password || (mode === "register" && !displayName.trim())) {
      setError("Vui lòng nhập đầy đủ tài khoản và mật khẩu.");
      return;
    }
    if (mode === "register" && password !== confirmPassword) {
      setError("Mật khẩu xác nhận không khớp.");
      return;
    }
    setSubmitting(true);
    try {
      if (mode === "register") {
        await register({ displayName: displayName.trim(), email: identifier.trim(), password });
      } else {
        await login({ identifier: identifier.trim(), password });
      }
      const profile = await getCurrentUser();
      router.replace(`/${roleRoute[profile.role]}/dashboard`);
    } catch (reason: unknown) {
      setError(
        reason instanceof ApiClientError && reason.status === 401
          ? "Tài khoản hoặc mật khẩu không chính xác."
          : reason instanceof ApiClientError && reason.status === 409
            ? "Email này đã được sử dụng."
          : "Không thể kết nối Java Backend. Vui lòng thử lại.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="login-card" onSubmit={submit} noValidate>
      <div>
        <span className="eyebrow">Chào mừng trở lại</span>
        <h2>{demo ? "Khám phá StudyFlow" : mode === "login" ? "Đăng nhập StudyFlow" : "Tạo tài khoản Student"}</h2>
        <p>{demo ? "Chọn vai trò để xem dữ liệu demo." : mode === "login" ? "Dùng tài khoản được cấp để tiếp tục." : "Đăng ký bằng email của bạn; role luôn do Java gán."}</p>
      </div>
      {demo ? (
        <label>
          Vai trò demo
          <select value={demoRole} onChange={(event) => setDemoRole(event.target.value as DemoRole)}>
            <option value="student">Sinh viên</option>
            <option value="teacher">Giảng viên</option>
            <option value="admin">Quản trị viên</option>
          </select>
        </label>
      ) : (
        <>
          {mode === "register" && <label>
            Họ và tên
            <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} type="text" name="displayName" autoComplete="name" />
          </label>}
          <label>
            {mode === "login" ? "Email hoặc tên đăng nhập" : "Email"}
            <input value={identifier} onChange={(event) => setIdentifier(event.target.value)} type={mode === "login" ? "text" : "email"} name="identifier" autoComplete="username" />
          </label>
          <label>
            Mật khẩu
            <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" name="password" autoComplete={mode === "login" ? "current-password" : "new-password"} />
          </label>
          {mode === "register" && <label>
            Xác nhận mật khẩu
            <input value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} type="password" name="confirmPassword" autoComplete="new-password" />
          </label>}
        </>
      )}
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="button primary wide" type="submit" disabled={submitting}>
        {submitting ? <LoaderCircle className="spin" size={17} /> : <ArrowRight size={17} />}
        {demo ? "Mở bản demo" : submitting ? "Đang xử lý" : mode === "login" ? "Đăng nhập" : "Đăng ký Student"}
      </button>
      {demo && <p className="login-note"><strong>Dữ liệu demo</strong> · Không gửi thông tin tới Backend.</p>}
      {!demo && <button className="auth-mode-toggle" type="button" onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(null); }}>
        {mode === "login" ? "Chưa có tài khoản? Đăng ký Student" : "Đã có tài khoản? Đăng nhập"}
      </button>}
    </form>
  );
}
