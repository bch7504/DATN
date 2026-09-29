"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { LoadingSpinner } from "@/components/ui/loading-states";

export default function HomePage() {
  const { user, role, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated || !user) {
      router.replace("/login");
      return;
    }

    if (role === "TEACHER") {
      router.replace("/teacher/dashboard");
    } else if (role === "ADMIN") {
      router.replace("/admin/dashboard");
    } else {
      router.replace("/dashboard");
    }
  }, [isLoading, isAuthenticated, role, user, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f6f7f9]">
      <LoadingSpinner size="lg" text="Đang chuyển hướng đến cổng làm việc..." />
    </div>
  );
}
