"use client";

import React from "react";
import { EmptyState } from "@/components/ui/empty-state";

export interface AdminDataRow {
  id: string;
  cells: string[];
  status?: string;
}

interface AdminDataPageProps {
  title: string;
  description: string;
  columns: string[];
  rows: AdminDataRow[];
  emptyTitle?: string;
  emptyDescription?: string;
}

/**
 * Renders a consistent Admin list screen using rows supplied by a Java API caller.
 *
 * @param props - Page title, description, table columns, API rows and optional empty-state copy.
 * @returns Admin list UI or an explicit empty state; it does not mutate server state.
 */
export function AdminDataPage({
  title,
  description,
  columns,
  rows,
  emptyTitle = "Chưa có dữ liệu",
  emptyDescription = "Dữ liệu sẽ được hiển thị khi Java Backend cung cấp API tương ứng.",
}: AdminDataPageProps): React.JSX.Element {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">{title}</h1>
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        </div>
      </div>

      {rows.length === 0 ? (
        <EmptyState title={emptyTitle} description={emptyDescription} />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
              <tr>{columns.map((column) => <th key={column} className="px-4 py-3 font-bold">{column}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => (
                <tr key={row.id} className="">
                  {row.cells.map((cell, index) => <td key={`${row.id}-${index}`} className="px-4 py-3 text-slate-700">{cell}</td>)}
                  {row.status && <td className="px-4 py-3"><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">{row.status}</span></td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </div>
      )}
    </div>
  );
}
