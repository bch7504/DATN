"use client";

import type { ReactElement, ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

/** Args: children (required route content). Input: current catalog pathname. Output: catalog navigation and the selected route. Errors: handled by child pages. */
export default function CatalogLayout({ children }: { children: ReactNode }): ReactElement {
  const pathname = usePathname();
  return <div className="space-y-5">
    <nav aria-label="Danh mục đào tạo" className="flex gap-2 border-b border-slate-200">
      {[{ href: "/admin/catalog/subjects", title: "Môn học" }, { href: "/admin/catalog/semesters", title: "Học kỳ" }].map((item) => <Link key={item.href} href={item.href} aria-current={pathname.startsWith(item.href) ? "page" : undefined} className={`border-b-2 px-4 py-3 text-sm font-semibold ${pathname.startsWith(item.href) ? "border-red-600 text-red-600" : "border-transparent text-slate-500"}`}>{item.title}</Link>)}
    </nav>
    {children}
  </div>;
}
