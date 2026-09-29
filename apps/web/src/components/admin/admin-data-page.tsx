"use client";

import React from "react";

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
  primaryActionLabel?: string;
}

/**
 * Renders a consistent Admin list screen backed by explicitly labelled demo data.
 *
 * @param props - Page title, description, table columns, rows and optional action label.
 * @returns Admin list UI; it does not mutate server state.
 */
export function AdminDataPage({
  title,
  description,
  columns,
  rows,
  primaryActionLabel,
}: AdminDataPageProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">{title}</h1>
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        </div>
        {primaryActionLabel && (
          <button type="button" className="rounded-xl bg-[#d71920] px-4 py-2.5 text-sm font-bold text-white ">
            {primaryActionLabel}
          </button>
        )}
      </div>

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
    </div>
  );
}
