"use client";

import React, { ReactNode } from "react";
import { RoleGuard } from "@/components/auth/role-guard";
import { AppShell } from "@/components/layout/app-shell";

export default function TeacherLayout({ children }: { children: ReactNode }) {
  return (
    <RoleGuard allowedRoles={["TEACHER"]}>
      <AppShell>{children}</AppShell>
    </RoleGuard>
  );
}
