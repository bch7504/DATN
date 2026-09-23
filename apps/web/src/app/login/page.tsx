import Image from "next/image";
import { BookOpenCheck, Bot, ShieldCheck } from "lucide-react";
import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
  return (
    <main className="login-page">
      <section className="login-story" aria-label="Giới thiệu StudyFlow">
        <Image
          src="/branding/ptit-logo.svg"
          width={99}
          height={120}
          alt="Logo PTIT"
          priority
          className="institution-logo"
        />
        <div className="login-copy">
          <span className="eyebrow light">StudyFlow · Đồ án tốt nghiệp</span>
          <h1>Hiểu bài sâu hơn.<br />Ôn tập chủ động hơn.</h1>
          <p>
            Một không gian học tập thống nhất cho tài liệu, ghi chú, AI Tutor,
            Quiz và kế hoạch cá nhân.
          </p>
        </div>
        <div className="login-features">
          <span><BookOpenCheck size={18} /> Học trực tiếp trên slide</span>
          <span><Bot size={18} /> Hỏi đáp có trích dẫn nguồn</span>
          <span><ShieldCheck size={18} /> Dữ liệu tách biệt theo quyền</span>
        </div>
      </section>

      <section className="login-panel">
        <LoginForm />
      </section>
    </main>
  );
}
