"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/auth-context";
import { PtitLogo } from "@/components/ui/ptit-logo";
import { ErrorAlert } from "@/components/ui/error-states";
import { LoadingSpinner } from "@/components/ui/loading-states";
import { ArrowLeft, ArrowRight, Lock, Mail, ShieldCheck, User } from "lucide-react";

export default function RegisterPage(): React.JSX.Element {
  const { register, verifyRegistration, resendVerification } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState<"ACCOUNT" | "VERIFY">("ACCOUNT");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [resendAvailableAt, setResendAvailableAt] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const validateAccount = (): string | null => {
    if (!displayName.trim() || !email.trim() || !password) {
      return "Vui lòng điền đầy đủ các thông tin bắt buộc.";
    }
    if (!email.trim().toLowerCase().endsWith("@ptit.edu.vn")) {
      return "Đăng ký chỉ chấp nhận email có miền @ptit.edu.vn.";
    }
    if (password !== confirmPassword) return "Mật khẩu xác nhận không khớp.";
    if (
      password.length < 8 ||
      !/[a-z]/.test(password) ||
      !/[A-Z]/.test(password) ||
      !/\d/.test(password)
    ) {
      return "Mật khẩu phải có ít nhất 8 ký tự, gồm chữ hoa, chữ thường và chữ số.";
    }
    return null;
  };

  const handleRegister = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    const validationError = validateAccount();
    if (validationError) {
      setErrorMsg(validationError);
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);
    setNotice(null);
    try {
      const status = await register({
        displayName: displayName.trim(),
        email: email.trim().toLowerCase(),
        password,
      });
      setResendAvailableAt(status.resendAvailableAt);
      setStep("VERIFY");
      setNotice("Mã xác minh 6 chữ số đã được gửi tới email của bạn.");
    } catch (error: unknown) {
      setErrorMsg(
        error instanceof Error ? error.message : "Đăng ký không thành công."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerify = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    if (!/^\d{6}$/.test(verificationCode)) {
      setErrorMsg("Mã xác minh phải gồm đúng 6 chữ số.");
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);
    try {
      await verifyRegistration({
        email: email.trim().toLowerCase(),
        verificationCode,
      });
      router.push("/login?registered=true");
    } catch (error: unknown) {
      setErrorMsg(
        error instanceof Error ? error.message : "Xác minh không thành công."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async (): Promise<void> => {
    setSubmitting(true);
    setErrorMsg(null);
    setNotice(null);
    try {
      const status = await resendVerification(email.trim().toLowerCase());
      setResendAvailableAt(status.resendAvailableAt);
      setNotice("Đã gửi một mã xác minh mới.");
    } catch (error: unknown) {
      setErrorMsg(
        error instanceof Error ? error.message : "Chưa thể gửi lại mã."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-[#fff1f2]/30 to-amber-50/20 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="w-16 h-16 rounded-full border-2 border-[#d71920] bg-white flex items-center justify-center shadow-lg mb-4 mx-auto">
          <PtitLogo size={36} />
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#172033] tracking-tight">
          {step === "ACCOUNT" ? "Đăng ký tài khoản Sinh viên" : "Xác minh email"}
        </h1>
        <p className="mt-1 text-xs font-bold uppercase tracking-wider text-[#64748b]">
          StudyFlow · Học viện Công nghệ Bưu chính Viễn thông
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 sm:px-10 shadow-xl rounded-2xl border border-slate-200/80">
          {errorMsg && (
            <ErrorAlert message={errorMsg} onRetry={() => setErrorMsg(null)} />
          )}
          {notice && (
            <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-800">
              {notice}
            </div>
          )}

          {step === "ACCOUNT" ? (
            <form className="space-y-4" onSubmit={handleRegister}>
              <Field label="Họ và tên" icon={<User className="w-4 h-4" />}>
                <input
                  id="displayName"
                  required
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  placeholder="Nguyễn Văn An"
                  className="block w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </Field>
              <Field label="Email PTIT" icon={<Mail className="w-4 h-4" />}>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="student@ptit.edu.vn"
                  className="block w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </Field>
              <Field label="Mật khẩu" icon={<Lock className="w-4 h-4" />}>
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Ít nhất 8 ký tự"
                  className="block w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </Field>
              <Field
                label="Xác nhận mật khẩu"
                icon={<Lock className="w-4 h-4" />}
              >
                <input
                  id="confirmPassword"
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="Nhập lại mật khẩu"
                  className="block w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </Field>
              <PrimaryButton
                submitting={submitting}
                loadingText="Đang gửi mã..."
                text="Gửi mã xác minh"
              />
            </form>
          ) : (
            <form className="space-y-5" onSubmit={handleVerify}>
              <div className="rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-slate-700">
                Nhập mã đã gửi tới <strong>{email}</strong>. Tài khoản chỉ được
                tạo sau khi mã hợp lệ.
              </div>
              <Field
                label="Mã xác minh 6 chữ số"
                icon={<ShieldCheck className="w-4 h-4" />}
              >
                <input
                  id="verificationCode"
                  inputMode="numeric"
                  maxLength={6}
                  required
                  value={verificationCode}
                  onChange={(event) =>
                    setVerificationCode(event.target.value.replace(/\D/g, ""))
                  }
                  placeholder="000000"
                  className="block w-full rounded-xl border border-slate-300 px-3 py-2.5 text-center font-mono text-sm tracking-[0.45em] focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </Field>
              <PrimaryButton
                submitting={submitting}
                loadingText="Đang xác minh..."
                text="Xác minh và tạo tài khoản"
              />
              <div className="flex items-center justify-between gap-3 text-xs">
                <button
                  type="button"
                  onClick={() => setStep("ACCOUNT")}
                  className="inline-flex items-center gap-1 font-semibold text-slate-600"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Sửa thông tin
                </button>
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={submitting}
                  className="font-bold text-red-600 disabled:opacity-50"
                  title={
                    resendAvailableAt
                      ? `Có thể gửi lại từ ${new Date(
                          resendAvailableAt
                        ).toLocaleTimeString("vi-VN")}`
                      : undefined
                  }
                >
                  Gửi lại mã
                </button>
              </div>
            </form>
          )}

          <p className="mt-6 text-center text-xs text-slate-500">
            Đã có tài khoản?{" "}
            <Link href="/login" className="font-semibold text-red-600 underline">
              Đăng nhập ngay
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  icon,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <div>
      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
        {label}
      </label>
      <div className="relative rounded-xl shadow-sm">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
          {icon}
        </div>
        {children}
      </div>
    </div>
  );
}

function PrimaryButton({
  submitting,
  loadingText,
  text,
}: {
  submitting: boolean;
  loadingText: string;
  text: string;
}): React.JSX.Element {
  return (
    <button
      type="submit"
      disabled={submitting}
      className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-xl shadow-md text-sm font-bold text-white bg-[#d71920] disabled:opacity-60"
    >
      {submitting ? (
        <LoadingSpinner size="sm" text={loadingText} />
      ) : (
        <>
          <span>{text}</span>
          <ArrowRight className="w-4 h-4" />
        </>
      )}
    </button>
  );
}
