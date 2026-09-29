import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/auth-context";
import { DemoBanner } from "@/components/ui/demo-banner";

export const metadata: Metadata = {
  title: "StudyFlow · Học viện Công nghệ Bưu chính Viễn thông",
  description:
    "Hệ thống quản lý học tập, học liệu bài giảng và trợ lý ôn thi thông minh PTIT",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body className="min-h-screen bg-[#f6f7f9] text-[#172033] flex flex-col font-sans">
        <AuthProvider>
          <DemoBanner />
          <div className="flex-1 flex flex-col">{children}</div>
        </AuthProvider>
      </body>
    </html>
  );
}
