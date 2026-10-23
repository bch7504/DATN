"use client";

import React, { useEffect, useState } from "react";
import { AdminDataPage, type AdminDataRow } from "@/components/admin/admin-data-page";
import { ErrorAlert } from "@/components/ui/error-states";
import { LoadingSpinner } from "@/components/ui/loading-states";
import { catalogApi } from "@/lib/api-client";

/**
 * Displays the shared Subject and Semester catalog returned by Java Backend.
 *
 * @returns The real catalog table, loading state, empty state or API error state.
 */
export default function AdminCatalogPage(): React.JSX.Element {
  const [rows, setRows] = useState<AdminDataRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect((): (() => void) => {
    let cancelled = false;

    /**
     * Loads catalog metadata from the public Java API.
     *
     * @returns Nothing; updates local loading, row and error state.
     * @throws Errors are converted into the visible error state.
     */
    async function loadCatalog(): Promise<void> {
      setIsLoading(true);
      setError(null);
      try {
        const [subjects, semesters] = await Promise.all([
          catalogApi.getSubjects(),
          catalogApi.getSemesters(),
        ]);
        if (cancelled) return;
        setRows([
          ...subjects.map((subject): AdminDataRow => ({
            id: `subject-${subject.id}`,
            cells: [subject.code, subject.name, "Môn học"],
            status: subject.status,
          })),
          ...semesters.map((semester): AdminDataRow => ({
            id: `semester-${semester.id}`,
            cells: [semester.code, semester.name, "Học kỳ"],
            status: semester.status,
          })),
        ]);
      } catch (cause: unknown) {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : "Không thể tải danh mục từ Backend.");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void loadCatalog();
    return (): void => {
      cancelled = true;
    };
  }, [reloadKey]);

  if (isLoading) {
    return <div className="py-12"><LoadingSpinner size="lg" text="Đang tải danh mục..." /></div>;
  }

  if (error) {
    return <ErrorAlert message={error} onRetry={() => setReloadKey((value) => value + 1)} />;
  }

  return <AdminDataPage title="Môn học và học kỳ" description="Danh mục thật từ Java Backend để Teacher tạo Course Offering trong học kỳ được phép." columns={["Mã", "Tên", "Loại", "Trạng thái"]} rows={rows} emptyTitle="Danh mục đang trống" emptyDescription="Chưa có Môn học hoặc Học kỳ nào trong Java Backend." />;
}
