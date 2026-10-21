"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/auth-context";
import { PtitLogo } from "@/components/ui/ptit-logo";
import { ErrorAlert } from "@/components/ui/error-states";
import { LoadingSpinner } from "@/components/ui/loading-states";
import { User, Mail, Lock, ArrowRight } from "lucide-react";
import { RegistrationStatusResponse } from "@/types/auth";

export default function RegisterPage() {
  const { register, verifyRegistration, resendVerification } = useAuth();
  const router = useRouter();

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [verificationEmail, setVerificationEmail] = useState("");
  const [registrationStatus, setRegistrationStatus] = useState<RegistrationStatusResponse | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    if (!registrationStatus) return;
    const timer = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [registrationStatus]);

  const resendSeconds = registrationStatus
    ? Math.max(0, Math.ceil((Date.parse(registrationStatus.resendAvailableAt) - nowMs) / 1000))
    : 0;
  const expiresSeconds = registrationStatus
    ? Math.max(0, Math.ceil((Date.parse(registrationStatus.expiresAt) - nowMs) / 1000))
    : 0;

  /**
   * Args: registration form event. Input: Student name, institutional email and matching passwords.
   * Output: void; shows the OTP form only after Java confirms delivery was requested.
   * Errors: invalid form or API error is shown without claiming the account is created.
   */
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    if (!displayName.trim() || !email.trim() || !password.trim()) {
      setErrorMsg("Vui lòng điền đầy đủ các thông tin bắt buộc.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg("Mật khẩu xác nhận không khớp.");
      return;
    }

    if (password.length < 6) {
      setErrorMsg("Mật khẩu phải chứa ít nhất 6 ký tự.");
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (!/^[^@\s]+@stu\.ptit\.edu\.vn$/.test(normalizedEmail)) {
      setErrorMsg("Chỉ dùng email sinh viên có đuôi @stu.ptit.edu.vn.");
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);
    setNotice(null);

    try {
      const status = await register({ displayName: displayName.trim(), email: normalizedEmail, password });
      setVerificationEmail(normalizedEmail);
      setRegistrationStatus(status);
      setNowMs(Date.now());
      setPassword("");
      setConfirmPassword("");
      setNotice("Đã gửi mã xác nhận 6 chữ số. Vui lòng kiểm tra hộp thư và mục Spam.");
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Đăng ký không thành công. Vui lòng kiểm tra lại.";
      setErrorMsg(msg);
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * Args: OTP form event. Input: six-digit code for the pending email.
   * Output: void; Java creates the account, then the browser opens login.
   * Errors: invalid/expired OTP or network error remains visible for correction.
   */
  const handleVerify = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    if (!/^\d{6}$/.test(verificationCode)) {
      setErrorMsg("Vui lòng nhập đúng 6 chữ số trong email.");
      return;
    }
    setSubmitting(true);
    setErrorMsg(null);
    setNotice(null);
    try {
      await verifyRegistration({ email: verificationEmail, verificationCode });
      router.replace("/login?verified=1");
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Không xác minh được mã. Vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * Args: none. Input: pending registration email after the server cooldown.
   * Output: void; replaces the old code and refreshes expiry/cooldown display.
   * Errors: server throttling or delivery errors are shown without changing the current status.
   */
  const handleResend = async (): Promise<void> => {
    if (submitting || resendSeconds > 0 || !verificationEmail) return;
    setSubmitting(true);
    setErrorMsg(null);
    setNotice(null);
    try {
      const status = await resendVerification({ email: verificationEmail });
      setRegistrationStatus(status);
      setNowMs(Date.now());
      setVerificationCode("");
      setNotice("Đã gửi mã mới. Mã cũ không còn hiệu lực.");
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Chưa gửi lại được mã. Vui lòng thử sau.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-[#fff1f2]/30 to-amber-50/20 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-full border-2 border-[#d71920] bg-white flex items-center justify-center shadow-lg mb-4  transition-transform">
            <PtitLogo size={36} />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#172033] tracking-tight">
            {registrationStatus ? "Xác nhận email sinh viên" : "Đăng ký tài khoản Sinh viên"}
          </h1>
          <p className="mt-1 text-xs font-bold uppercase tracking-wider text-[#64748b]">
            StudyFlow · Học viện Công nghệ Bưu chính Viễn thông
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 sm:px-10 shadow-xl rounded-2xl border border-slate-200/80">
          {errorMsg && (
              <ErrorAlert
                message={errorMsg}
                onRetry={() => setErrorMsg(null)}
              />
          )}
          {notice && (
            <p role="status" className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
              {notice}
            </p>
          )}

          {registrationStatus ? (
            <form className="space-y-4" onSubmit={handleVerify}>
              <p className="text-sm text-slate-600">
                Nhập mã đã gửi tới <strong className="text-slate-900">{verificationEmail}</strong> để hoàn tất đăng ký.
              </p>
              <div>
                <label htmlFor="verificationCode" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Mã xác nhận
                </label>
                <input
                  id="verificationCode"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  required
                  autoFocus
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="Nhập 6 chữ số"
                  className="block w-full rounded-xl border border-slate-300 px-3 py-2.5 text-center text-lg tracking-[0.35em] focus:border-red-500 focus:ring-2 focus:ring-red-500"
                />
              </div>
              <p className="text-xs text-slate-500">
                {expiresSeconds > 0
                  ? `Mã còn hiệu lực khoảng ${Math.ceil(expiresSeconds / 60)} phút.`
                  : "Mã đã hết hạn. Hãy yêu cầu gửi mã mới."}
              </p>
              <button
                type="submit"
                disabled={submitting || verificationCode.length !== 6 || expiresSeconds === 0}
                className="w-full flex justify-center items-center gap-2 py-3 px-4 rounded-xl shadow-md text-sm font-bold text-white bg-[#d71920] disabled:opacity-60"
              >
                {submitting ? <LoadingSpinner size="sm" text="Đang xác minh..." /> : "Xác nhận và tạo tài khoản"}
              </button>
              <button
                type="button"
                onClick={handleResend}
                disabled={submitting || resendSeconds > 0}
                className="w-full text-sm font-semibold text-red-700 disabled:text-slate-400 disabled:cursor-not-allowed"
              >
                {resendSeconds > 0 ? `Gửi lại mã sau ${resendSeconds} giây` : "Gửi lại mã"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setRegistrationStatus(null);
                  setVerificationCode("");
                  setErrorMsg(null);
                  setNotice(null);
                }}
                className="w-full text-xs text-slate-500 underline"
              >
                Đổi email hoặc thông tin đăng ký
              </button>
            </form>
          ) : (
          <form className="space-y-4" onSubmit={handleSubmit}>

            <div>
              <label
                htmlFor="displayName"
                className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1"
              >
                Họ và tên
              </label>
              <div className="relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  id="displayName"
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Nguyễn Văn An"
                  className="block w-full pl-10 pr-3 py-2.5 sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="email"
                className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1"
              >
                Email sinh viên
              </label>
              <div className="relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="email"
                  type="email"
                  aria-describedby="student-email-help"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="an.nv@stu.ptit.edu.vn"
                  className="block w-full pl-10 pr-3 py-2.5 sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500"
                />
              </div>
              <p id="student-email-help" className="mt-1.5 text-xs text-slate-500">
                Mã OTP sẽ được gửi đến email @stu.ptit.edu.vn này. Bạn nhập mã ngay tại đây, không cần đăng nhập qua Microsoft.
              </p>
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1"
              >
                Mật khẩu
              </label>
              <div className="relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full pl-10 pr-3 py-2.5 sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1"
              >
                Xác nhận mật khẩu
              </label>
              <div className="relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="confirmPassword"
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full pl-10 pr-3 py-2.5 sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full flex justify-center items-center gap-2 py-3 px-4 mt-2 border border-transparent rounded-xl shadow-md text-sm font-bold text-white bg-[#d71920]  disabled:opacity-60 transition"
            >
              {submitting ? (
                <LoadingSpinner size="sm" text="Đang gửi mã..." />
              ) : (
                <>
                  <span>Gửi mã xác nhận</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
          )}

          <div className="mt-6 text-center">
            <p className="text-xs text-slate-500">
              Đã có tài khoản?{" "}
              <Link
                href="/login"
                className="font-semibold text-red-600  underline"
              >
                Đăng nhập ngay
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
