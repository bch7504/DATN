"use client";

import React, { ReactNode } from "react";
import { RoleGuard } from "@/components/auth/role-guard";
import { AppShell } from "@/components/layout/app-shell";

export default function StudentLayout({ children }: { children: ReactNode }) {
  return (
    <RoleGuard allowedRoles={["STUDENT"]}>
      <AppShell>{children}</AppShell>
    </RoleGuard>
  );
}
