"use client";

import React, { ReactNode } from "react";
import { RoleGuard } from "@/components/auth/role-guard";
import { AppShell } from "@/components/layout/app-shell";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <RoleGuard allowedRoles={["ADMIN"]}>
      <AppShell>{children}</AppShell>
    </RoleGuard>
  );
}
