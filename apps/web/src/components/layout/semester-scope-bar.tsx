"use client";

import { useEffect, useState } from "react";
import { BookOpen, ChevronDown, ChevronUp, CalendarDays } from "lucide-react";
import { catalogApi } from "@/lib/api-client";
import type { Semester, Subject } from "@/types/course-offering";

type LoadState = "loading" | "ready" | "error";

/**
 * Shows the real active-semester catalog returned by Java on every authenticated page.
 *
 * Args: none.
 * Input: public Java catalog endpoints for ACTIVE subjects and semesters.
 * Output: a collapsible semester strip; no synthetic subject is rendered on API failure.
 * Errors: catalog failures are represented by a compact unavailable state.
 */
export function SemesterScopeBar(): React.JSX.Element {
  const [semester, setSemester] = useState<Semester | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let active = true;

    /**
     * Args: none.
     * Input: current authenticated browser session.
     * Output: void; stores the active semester and active subjects.
     * Errors: marks the strip unavailable without inventing fallback catalog data.
     */
    async function loadCatalog(): Promise<void> {
      try {
        const [semesterItems, subjectItems] = await Promise.all([
          catalogApi.getSemesters(),
          catalogApi.getSubjects(),
        ]);
        if (!active) return;
        setSemester(semesterItems.find((item) => item.status === "ACTIVE") ?? null);
        setSubjects(
          subjectItems
            .filter((item) => item.status === "ACTIVE")
            .sort((left, right) => left.name.localeCompare(right.name, "vi")),
        );
        setLoadState("ready");
      } catch {
        if (active) setLoadState("error");
      }
    }

    void loadCatalog();
    return () => {
      active = false;
    };
  }, []);

  if (loadState === "loading") {
    return (
      <div className="border-b border-slate-200 bg-white px-4 py-2.5 lg:px-8" aria-label="Đang tải phạm vi học kỳ">
        <div className="mx-auto h-9 max-w-7xl animate-pulse rounded-xl bg-slate-100" />
      </div>
    );
  }

  if (loadState === "error" || !semester) {
    return (
      <div className="border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-xs font-semibold text-amber-900 lg:px-8">
        Chưa tải được học kỳ đang hoạt động từ hệ thống.
      </div>
    );
  }

  return (
    <section className="border-b border-red-100 bg-red-50/70 px-4 py-2.5 lg:px-8" aria-label="Phạm vi học kỳ MVP">
      <div className="mx-auto max-w-7xl">
        <button
          type="button"
          onClick={() => setExpanded((current) => !current)}
          aria-expanded={expanded}
          className="flex w-full items-center justify-between gap-4 rounded-xl border border-red-100 bg-white px-4 py-2.5 text-left"
        >
          <span className="flex min-w-0 items-center gap-3">
            <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-red-600 text-white">
              <CalendarDays className="h-4 w-4" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-extrabold text-slate-900">{semester.name}</span>
              <span className="block text-xs text-slate-500">Phạm vi MVP hiện tại · {subjects.length} môn học đang hoạt động</span>
            </span>
          </span>
          {expanded ? <ChevronUp className="h-4 w-4 text-red-600" /> : <ChevronDown className="h-4 w-4 text-red-600" />}
        </button>

        {expanded && (
          <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {subjects.map((subject) => (
              <div key={subject.id} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
                <BookOpen className="h-3.5 w-3.5 flex-shrink-0 text-red-600" />
                <span className="min-w-0 truncate text-xs font-semibold text-slate-700">{subject.name}</span>
                <span className="ml-auto rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-600">{subject.code}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
