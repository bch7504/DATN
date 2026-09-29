"use client";

import React, { useState, useEffect } from "react";
import { teacherApi } from "@/lib/api-client";
import { CourseEnrollment, CourseOffering } from "@/types/course-offering";
import { StatusBadge } from "@/components/ui/status-badge";
import { ErrorAlert } from "@/components/ui/error-states";
import { LoadingSpinner } from "@/components/ui/loading-states";
import { EmptyState } from "@/components/ui/empty-state";
import {
  UserCheck,
  UserX,
  Clock,
  CheckCircle2,
  Users,
  Search,
  Filter,
} from "lucide-react";

export default function TeacherEnrollmentsPage() {
  const [offerings, setOfferings] = useState<CourseOffering[]>([]);
  const [enrollments, setEnrollments] = useState<CourseEnrollment[]>([]);
  const [selectedOfferingId, setSelectedOfferingId] = useState<string>("ALL");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"PENDING" | "APPROVED">("PENDING");

  const loadData = async () => {
    try {
      const [offeringsData, enrollmentsData] = await Promise.all([
        teacherApi.getOfferings(),
        teacherApi.getEnrollments(),
      ]);
      setOfferings(offeringsData);
      setEnrollments(enrollmentsData);
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error ? err.message : "Không thể tải danh sách sinh viên."
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleApprove = async (enrollmentId: string) => {
    setProcessingId(enrollmentId);
    try {
      await teacherApi.approveEnrollment(enrollmentId);
      await loadData();
    } catch (err: unknown) {
      alert("Lỗi khi duyệt: " + (err instanceof Error ? err.message : ""));
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (enrollmentId: string) => {
    const reason = prompt("Nhập lý do từ chối (tùy chọn):", "Không thuộc danh sách lớp");
    if (reason === null) return;

    setProcessingId(enrollmentId);
    try {
      await teacherApi.rejectEnrollment(enrollmentId, reason);
      await loadData();
    } catch (err: unknown) {
      alert("Lỗi khi từ chối: " + (err instanceof Error ? err.message : ""));
    } finally {
      setProcessingId(null);
    }
  };

  const filteredEnrollments = enrollments.filter((e) => {
    if (selectedOfferingId !== "ALL" && e.offeringId !== selectedOfferingId) {
      return false;
    }
    return true;
  });

  const pendingList = filteredEnrollments.filter((e) => e.status === "PENDING");
  const approvedList = filteredEnrollments.filter((e) => e.status === "APPROVED");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Phê duyệt Yêu cầu Tham gia Lớp
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Xét duyệt sinh viên nhập mã Join Code vào các lớp học phần bạn sở hữu
          </p>
        </div>

        {/* Offering Selector Filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={selectedOfferingId}
            onChange={(e) => setSelectedOfferingId(e.target.value)}
            className="p-2 text-xs border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-red-500"
          >
            <option value="ALL">Tất cả lớp học phần phụ trách</option>
            {offerings.map((o) => (
              <option key={o.id} value={o.id}>
                {o.code} - {o.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {errorMsg && (
        <ErrorAlert message={errorMsg} onRetry={() => setErrorMsg(null)} />
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          type="button"
          onClick={() => setActiveTab("PENDING")}
          className={`pb-3 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${
            activeTab === "PENDING"
              ? "border-red-600 text-red-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Yêu cầu chờ duyệt ({pendingList.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("APPROVED")}
          className={`pb-3 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${
            activeTab === "APPROVED"
              ? "border-red-600 text-red-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>Sinh viên chính thức ({approvedList.length})</span>
        </button>
      </div>

      {isLoading ? (
        <div className="py-12 flex justify-center">
          <LoadingSpinner size="lg" text="Đang tải danh sách phê duyệt..." />
        </div>
      ) : (
        <div>
          {/* PENDING TAB */}
          {activeTab === "PENDING" && (
            <div>
              {pendingList.length === 0 ? (
                <EmptyState
                  title="Không có yêu cầu chờ duyệt"
                  description="Hiện tại không có sinh viên nào đang đợi phê duyệt vào lớp của bạn."
                />
              ) : (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden divide-y divide-slate-100">
                  {pendingList.map((enr) => (
                    <div
                      key={enr.id}
                      className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/60 transition"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-800 text-sm">
                            {enr.studentName}
                          </span>
                          <span className="text-xs text-slate-500 font-mono">
                            ({enr.studentEmail})
                          </span>
                          <StatusBadge status="PENDING" size="sm" />
                        </div>
                        <div className="text-xs text-slate-500 flex items-center gap-2">
                          <span>
                            Lớp: <b>{enr.offeringCode} - {enr.offeringName}</b>
                          </span>
                          <span>·</span>
                          <span>
                            Yêu cầu lúc: {new Date(enr.requestedAt).toLocaleString("vi-VN")}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={processingId === enr.id}
                          onClick={() => handleReject(enr.id)}
                          className="px-3 py-1.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition flex items-center gap-1"
                        >
                          <UserX className="w-3.5 h-3.5" /> Từ chối
                        </button>
                        <button
                          type="button"
                          disabled={processingId === enr.id}
                          onClick={() => handleApprove(enr.id)}
                          className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center gap-1 shadow-sm"
                        >
                          {processingId === enr.id ? (
                            <LoadingSpinner size="sm" />
                          ) : (
                            <>
                              <UserCheck className="w-3.5 h-3.5" /> Phê duyệt
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* APPROVED TAB (READ-ONLY) */}
          {activeTab === "APPROVED" && (
            <div>
              {approvedList.length === 0 ? (
                <EmptyState
                  title="Chưa có sinh viên chính thức"
                  description="Danh sách sinh viên đã được phê duyệt sẽ hiển thị tại đây (chỉ xem thông tin định danh tối thiểu)."
                />
              ) : (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="p-3 bg-slate-50 border-b border-slate-200 text-xs text-slate-500">
                    * Bảng danh sách sinh viên chính thức (Read-only). Giảng viên không xem các tài liệu cá nhân, ghi chú hay kết quả quiz riêng tư của sinh viên theo quy định bảo mật.
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50/80 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
                        <tr>
                          <th className="py-3 px-4">Họ và tên</th>
                          <th className="py-3 px-4">Email</th>
                          <th className="py-3 px-4">Lớp học phần</th>
                          <th className="py-3 px-4">Thời điểm duyệt</th>
                          <th className="py-3 px-4">Trạng thái</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {approvedList.map((enr) => (
                          <tr key={enr.id} className="hover:bg-slate-50/50">
                            <td className="py-3 px-4 font-bold text-slate-800">
                              {enr.studentName}
                            </td>
                            <td className="py-3 px-4 font-mono text-slate-600">
                              {enr.studentEmail}
                            </td>
                            <td className="py-3 px-4">
                              <span className="px-2 py-0.5 rounded bg-slate-100 font-mono font-semibold">
                                {enr.offeringCode}
                              </span>{" "}
                              {enr.offeringName}
                            </td>
                            <td className="py-3 px-4 text-slate-500">
                              {enr.approvedAt
                                ? new Date(enr.approvedAt).toLocaleDateString("vi-VN")
                                : "N/A"}
                            </td>
                            <td className="py-3 px-4">
                              <StatusBadge status="APPROVED" size="sm" />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
