"use client";

import React, { useState } from "react";
import { AdminHeader } from "@/components/admin/admin-ui";
import { SubjectPanel } from "@/components/admin/subject-panel";
import { SemesterPanel } from "@/components/admin/semester-panel";

/** Args: none. Input: Admin catalog navigation. Output: Subject or Semester CRUD workspace. Errors: handled by each panel. */
export default function AdminCatalogPage(): React.JSX.Element {
  const [tab, setTab] = useState<"subjects" | "semesters">("subjects");
  return <div className="space-y-5">
    <AdminHeader title="Môn học & Học kỳ" description="Quản lý danh mục dùng khi giảng viên mở lớp học phần." />
    <div role="tablist" aria-label="Danh mục" className="flex gap-2 border-b border-slate-200">
      <button type="button" role="tab" aria-selected={tab === "subjects"} onClick={() => setTab("subjects")} className={`border-b-2 px-4 py-3 text-sm font-semibold ${tab === "subjects" ? "border-red-600 text-red-600" : "border-transparent text-slate-500"}`}>Môn học</button>
      <button type="button" role="tab" aria-selected={tab === "semesters"} onClick={() => setTab("semesters")} className={`border-b-2 px-4 py-3 text-sm font-semibold ${tab === "semesters" ? "border-red-600 text-red-600" : "border-transparent text-slate-500"}`}>Học kỳ</button>
    </div>
    {tab === "subjects" ? <SubjectPanel /> : <SemesterPanel />}
  </div>;
}
