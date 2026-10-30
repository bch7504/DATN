"use client";

import React, { useState, useEffect } from "react";
import { teacherApi } from "@/lib/api-client";
import {
  CourseEnrollment,
  CourseOffering,
} from "@/types/course-offering";
import { StatusBadge } from "@/components/ui/status-badge";
import { ErrorAlert } from "@/components/ui/error-states";
import { LoadingSpinner } from "@/components/ui/loading-states";
import { EmptyState } from "@/components/ui/empty-state";
import {
  GraduationCap,
  Copy,
  RefreshCw,
  Power,
  Archive,
  Users,
  FolderKanban,
  Check,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function TeacherCourseOfferingsPage() {
  const router = useRouter();
  const [offerings, setOfferings] = useState<CourseOffering[]>([]);
  const [enrollmentCounts, setEnrollmentCounts] = useState<
    Record<string, { approved: number; pending: number }>
  >({});
  const [enrollmentCountsStatus, setEnrollmentCountsStatus] = useState<
    "loading" | "ready" | "error"
  >("loading");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Success reveal modal for Join Code (only exposed once upon create / regen)
  const [revealedJoinCode, setRevealedJoinCode] = useState<{
    offeringName: string;
    offeringCode: string;
    joinCode: string;
    actionType: "CREATE" | "REGENERATE";
  } | null>(null);

  /**
   * Args: none. Input: Teacher-owned offerings and enrollment records from Java APIs.
   * Output: Promise<void>; refreshes class list and enrollment counts.
   * Errors: offering failures are shown in errorMsg; enrollment failures mark counts unavailable.
   */
  const loadData = async (): Promise<void> => {
    try {
      const offeringsData = await teacherApi.getOfferings();
      setOfferings(offeringsData);

      setEnrollmentCountsStatus("loading");
      try {
        const enrollments: CourseEnrollment[] = await teacherApi.getEnrollments();
        const counts: Record<string, { approved: number; pending: number }> = {};
        for (const enrollment of enrollments) {
          const count = counts[enrollment.offeringId] ?? { approved: 0, pending: 0 };
          if (enrollment.status === "APPROVED") count.approved += 1;
          if (enrollment.status === "PENDING") count.pending += 1;
          counts[enrollment.offeringId] = count;
        }
        setEnrollmentCounts(counts);
        setEnrollmentCountsStatus("ready");
      } catch (enrollmentError: unknown) {
        console.error("Failed to load teacher enrollment counts:", enrollmentError);
        setEnrollmentCountsStatus("error");
      }
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : "Không thể tải danh sách Lớp học phần."
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleRegenerateCode = async (offering: CourseOffering) => {
    if (!confirm(`Bạn có chắc chắn muốn sinh lại mã tham gia cho lớp "${offering.name}"? Mã cũ sẽ bị vô hiệu.`)) {
      return;
    }
    try {
      const newCode = await teacherApi.regenerateJoinCode(offering.id);
      if (newCode) {
        setRevealedJoinCode({
          offeringName: offering.name,
          offeringCode: offering.code,
          joinCode: newCode,
          actionType: "REGENERATE",
        });
      }
      await loadData();
    } catch (err: unknown) {
      alert("Không thể sinh lại mã tham gia: " + (err instanceof Error ? err.message : ""));
    }
  };

  const handleToggleJoin = async (offeringId: string, currentEnabled: boolean) => {
    try {
      await teacherApi.toggleJoinCode(offeringId, !currentEnabled);
      await loadData();
    } catch (err: unknown) {
      alert("Không thể thay đổi trạng thái mã: " + (err instanceof Error ? err.message : ""));
    }
  };

  const handleArchive = async (offeringId: string) => {
    if (!confirm("Bạn có chắc muốn lưu trữ lớp học phần này?")) return;
    try {
      await teacherApi.archiveOffering(offeringId);
      await loadData();
    } catch (err: unknown) {
      alert("Không thể lưu trữ lớp: " + (err instanceof Error ? err.message : ""));
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Quản lý Lớp học phần
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Mở lớp mới theo Môn học và Học kỳ, quản lý mã tham gia và sinh viên
          </p>
        </div>

        <Link
          href="/teacher/course-offerings/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-red-600  text-white rounded-xl text-xs font-bold shadow-md transition flex-shrink-0"
        >
          Mở Lớp học phần mới
        </Link>
      </div>

      {errorMsg && (
        <ErrorAlert message={errorMsg} onRetry={() => setErrorMsg(null)} />
      )}

      {isLoading ? (
        <div className="py-12 flex justify-center">
          <LoadingSpinner size="lg" text="Đang tải danh sách lớp học phần..." />
        </div>
      ) : offerings.length === 0 ? (
        <EmptyState
          title="Chưa có Lớp học phần nào"
          description="Hãy bấm vào nút 'Mở Lớp học phần mới' để bắt đầu giảng dạy học kỳ này."
          actionLabel="Mở lớp mới"
          onAction={() => router.push("/teacher/course-offerings/new")}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {offerings.map((offering) => (
            <div
              key={offering.id}
              className="p-5 rounded-2xl border border-slate-200 bg-white shadow-sm  transition space-y-4"
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-lg bg-amber-100 text-amber-900 font-mono font-bold text-xs">
                      {offering.code}
                    </span>
                    <StatusBadge status={offering.status} size="sm" />
                  </div>
                  <h3 className="font-bold text-slate-900 text-base">
                    {offering.name}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {offering.semesterName}
                  </p>
                </div>

                {offering.status === "ACTIVE" && (
                  <button
                    type="button"
                    onClick={() => handleArchive(offering.id)}
                    className="p-1.5 text-slate-400  rounded-lg  text-xs"
                    title="Lưu trữ lớp"
                  >
                    <Archive className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Join Code Box */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-600">
                    Mã tham gia lớp (Join Code):
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      handleToggleJoin(offering.id, offering.joinCodeEnabled)
                    }
                    className={`text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 transition ${
                      offering.joinCodeEnabled
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    <Power className="w-3 h-3" />
                    {offering.joinCodeEnabled ? "Đang bật" : "Đã tắt"}
                  </button>
                </div>

                <div className="flex items-center justify-between gap-2 pt-1">
                  <span className="font-mono text-base font-extrabold tracking-wider text-slate-900 bg-white px-3 py-1.5 rounded-lg border border-slate-200 select-all">
                    {offering.joinCode || (offering.joinCodeHint ? `••••-${offering.joinCodeHint}` : "CHƯA CÓ")}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        if (offering.joinCode) {
                          handleCopyCode(offering.joinCode);
                        } else {
                          alert("Mã tham gia đầy đủ đã được ẩn vì bảo mật. Vui lòng bấm vào nút Sinh lại mã bên cạnh (biểu tượng xoay vòng) để nhận mã mới.");
                        }
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200  text-xs font-semibold text-slate-700 flex items-center gap-1 shadow-sm transition"
                      title={offering.joinCode ? "Sao chép mã" : "Mã đã ẩn, bấm sinh lại để lấy mã mới"}
                    >
                      {copiedCode === offering.joinCode ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-700">Đã chép</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Sao chép</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRegenerateCode(offering)}
                      className="p-2 rounded-lg bg-white border border-slate-200  text-slate-500  shadow-sm transition"
                      title="Tạo lại mã tham gia mới"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Footer Stats & Actions */}
              <div className="pt-2 flex items-center justify-between text-xs">
                <div className="flex items-center gap-4 text-slate-600">
                  <span>
                    Sinh viên: <b>
                      {enrollmentCountsStatus === "loading"
                        ? "…"
                        : enrollmentCountsStatus === "error"
                          ? "—"
                          : enrollmentCounts[offering.id]?.approved ?? 0}
                    </b>
                  </span>
                  {enrollmentCountsStatus === "ready" &&
                    (enrollmentCounts[offering.id]?.pending ?? 0) > 0 && (
                      <span className="font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-md">
                        {enrollmentCounts[offering.id]?.pending ?? 0} chờ duyệt
                      </span>
                    )}
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    href={`/teacher/enrollments?offeringId=${offering.id}`}
                    className="inline-flex items-center gap-1 font-bold text-red-600 "
                  >
                    <Users className="w-3.5 h-3.5" /> Duyệt sinh viên
                  </Link>
                  <span>·</span>
                  <Link
                    href={`/teacher/documents/${encodeURIComponent(offering.id)}`}
                    className="inline-flex items-center gap-1 font-semibold text-slate-600 "
                  >
                    <FolderKanban className="w-3.5 h-3.5" /> Học liệu
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Join Code Success Modal */}
      {revealedJoinCode && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl border border-slate-100 space-y-5">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-xs">
                <Check className="w-6 h-6 stroke-[3]" />
              </div>
              <h3 className="font-extrabold text-slate-900 text-lg">
                {revealedJoinCode.actionType === "CREATE"
                  ? "Mở Lớp học phần thành công!"
                  : "Đã sinh lại Mã tham gia mới!"}
              </h3>
              <p className="text-xs text-slate-500">
                Lớp: <span className="font-semibold text-slate-700">{revealedJoinCode.offeringCode} - {revealedJoinCode.offeringName}</span>
              </p>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2 text-center">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Mã tham gia lớp (Join Code)
              </span>
              <div className="font-mono text-2xl font-black tracking-widest text-red-600 bg-white py-2.5 px-4 rounded-xl border border-slate-200 shadow-xs select-all">
                {revealedJoinCode.joinCode}
              </div>
              <p className="text-[11px] text-amber-700 bg-amber-50 rounded-lg p-2 leading-relaxed">
                ⚠️ <b>Lưu ý quan trọng:</b> Theo chính sách bảo mật của hệ thống, mã tham gia đầy đủ chỉ hiển thị một lần. Hãy sao chép ngay để gửi cho sinh viên.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => handleCopyCode(revealedJoinCode.joinCode)}
                className="flex-1 py-2.5 bg-red-600  text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm"
              >
                {copiedCode === revealedJoinCode.joinCode ? (
                  <>
                    <Check className="w-4 h-4" /> Đã sao chép!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" /> Sao chép mã
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => setRevealedJoinCode(null)}
                className="px-4 py-2.5 bg-slate-100  text-slate-700 rounded-xl text-xs font-bold transition"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
