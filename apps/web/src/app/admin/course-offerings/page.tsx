"use client";

import React, { useState, useEffect } from "react";
import { adminApi, catalogApi } from "@/lib/api-client";
import { CourseOffering, Subject, Semester } from "@/types/course-offering";
import { StatusBadge } from "@/components/ui/status-badge";
import { ErrorAlert } from "@/components/ui/error-states";
import { LoadingSpinner } from "@/components/ui/loading-states";
import { EmptyState } from "@/components/ui/empty-state";
import {
  GraduationCap,
  Lock,
  Archive,
  Filter,
  Search,
  ShieldAlert,
  Info,
} from "lucide-react";

export default function AdminCourseOfferingsPage() {
  const [offerings, setOfferings] = useState<CourseOffering[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState("ALL");
  const [selectedSemesterId, setSelectedSemesterId] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const [offeringsData, subjectsData, semestersData] = await Promise.all([
        adminApi.getCourseOfferings(),
        catalogApi.getSubjects(),
        catalogApi.getSemesters(),
      ]);
      setOfferings(offeringsData);
      setSubjects(subjectsData);
      setSemesters(semestersData);
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : "Không thể tải danh sách Lớp học phần giám sát."
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleLock = async (offeringId: string) => {
    if (!confirm("Khóa Lớp học phần này? Sinh viên sẽ không thể tham gia mới.")) return;
    try {
      await adminApi.lockOffering(offeringId);
      await loadData();
    } catch (err: unknown) {
      alert("Lỗi khi khóa lớp: " + (err instanceof Error ? err.message : ""));
    }
  };

  const handleArchive = async (offeringId: string) => {
    if (!confirm("Lưu trữ Lớp học phần này?")) return;
    try {
      await adminApi.archiveOffering(offeringId);
      await loadData();
    } catch (err: unknown) {
      alert("Lỗi khi lưu trữ lớp: " + (err instanceof Error ? err.message : ""));
    }
  };

  const filteredOfferings = offerings.filter((o) => {
    if (selectedSubjectId !== "ALL" && o.subjectId !== selectedSubjectId) return false;
    if (selectedSemesterId !== "ALL" && o.semesterId !== selectedSemesterId) return false;
    if (selectedStatus !== "ALL" && o.status !== selectedStatus) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          Giám sát Lớp học phần toàn hệ thống
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Theo dõi trạng thái mở lớp của Giảng viên, thực thi khóa hoặc lưu trữ theo quy chế đào tạo
        </p>
      </div>

      {/* Admin Boundary Notice */}
      <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 text-blue-900 flex items-start gap-3 text-xs leading-relaxed">
        <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div>
          <span className="font-bold">Quy chế phân quyền (MVP Baseline):</span> Giảng viên chủ động tạo Lớp học phần theo Môn học và Học kỳ, tự quản lý Join Code và duyệt sinh viên. Quản trị viên thực hiện giám sát chung, khóa (Lock) hoặc lưu trữ (Archive) khi có vi phạm; không can thiệp phân công từng lớp trong MVP.
        </div>
      </div>

      {errorMsg && (
        <ErrorAlert message={errorMsg} onRetry={() => setErrorMsg(null)} />
      )}

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
          <Filter className="w-4 h-4" /> Bộ lọc:
        </div>

        <select
          value={selectedSubjectId}
          onChange={(e) => setSelectedSubjectId(e.target.value)}
          className="p-2 text-xs border border-slate-300 rounded-xl bg-white"
        >
          <option value="ALL">Tất cả môn học</option>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.code} - {s.name}
            </option>
          ))}
        </select>

        <select
          value={selectedSemesterId}
          onChange={(e) => setSelectedSemesterId(e.target.value)}
          className="p-2 text-xs border border-slate-300 rounded-xl bg-white"
        >
          <option value="ALL">Tất cả học kỳ</option>
          {semesters.map((sem) => (
            <option key={sem.id} value={sem.id}>
              {sem.name}
            </option>
          ))}
        </select>

        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="p-2 text-xs border border-slate-300 rounded-xl bg-white"
        >
          <option value="ALL">Tất cả trạng thái</option>
          <option value="ACTIVE">Đang mở (ACTIVE)</option>
          <option value="LOCKED">Đã khóa (LOCKED)</option>
          <option value="ARCHIVED">Lưu trữ (ARCHIVED)</option>
        </select>
      </div>

      {/* Offerings Table */}
      {isLoading ? (
        <div className="py-12 flex justify-center">
          <LoadingSpinner size="lg" text="Đang tải dữ liệu giám sát..." />
        </div>
      ) : filteredOfferings.length === 0 ? (
        <EmptyState
          title="Không tìm thấy Lớp học phần phù hợp"
          description="Thử thay đổi tiêu chí bộ lọc phía trên để tìm kiếm."
        />
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Mã lớp</th>
                  <th className="py-3 px-4">Tên lớp học phần</th>
                  <th className="py-3 px-4">Học kỳ</th>
                  <th className="py-3 px-4">Giảng viên phụ trách</th>
                  <th className="py-3 px-4">Sinh viên</th>
                  <th className="py-3 px-4">Trạng thái</th>
                  <th className="py-3 px-4 text-right">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredOfferings.map((offering) => (
                  <tr key={offering.id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 font-mono font-bold text-slate-800">
                      {offering.code}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      {offering.name}
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      {offering.semesterName}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-700">
                      {offering.teacherName}
                    </td>
                    <td className="py-3 px-4">
                      <b>{offering.enrolledCount}</b> SV
                      {offering.pendingCount > 0 && (
                        <span className="ml-1 text-red-600 font-bold">
                          ({offering.pendingCount} chờ)
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={offering.status} size="sm" />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        {offering.status === "ACTIVE" && (
                          <button
                            type="button"
                            onClick={() => handleLock(offering.id)}
                            className="p-1.5 rounded-lg border border-rose-200 text-rose-700 hover:bg-rose-50"
                            title="Khóa lớp học phần"
                          >
                            <Lock className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {offering.status !== "ARCHIVED" && (
                          <button
                            type="button"
                            onClick={() => handleArchive(offering.id)}
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100"
                            title="Lưu trữ lớp"
                          >
                            <Archive className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
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
