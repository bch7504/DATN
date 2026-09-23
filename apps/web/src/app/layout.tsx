import type { Metadata } from "next";
import { Be_Vietnam_Pro, Manrope } from "next/font/google";
import "./globals.css";

const bodyFont = Be_Vietnam_Pro({
  variable: "--font-body",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
});

const displayFont = Manrope({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

export const metadata: Metadata = {
  title: "StudyFlow · Không gian học tập PTIT",
  description: "Nền tảng hỗ trợ học tập và ôn luyện ứng dụng AI.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi">
      <body className={`${bodyFont.variable} ${displayFont.variable}`}>
        {children}
      </body>
    </html>
  );
}
