"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { studentApi, materialApi } from "@/lib/api-client";
import { CourseOffering, CourseEnrollment } from "@/types/course-offering";
import { TeacherDocument } from "@/types/material";
import { StatusBadge } from "@/components/ui/status-badge";
import { ErrorAlert } from "@/components/ui/error-states";
import { LoadingSpinner } from "@/components/ui/loading-states";
import { EmptyState } from "@/components/ui/empty-state";
import {
  GraduationCap,
  PlusCircle,
  Clock,
  CheckCircle2,
  Archive,
  BookOpen,
  ChevronRight,
  ShieldAlert,
  ArrowRight,
  FileText,
  Sparkles,
  ArrowLeft,
  Info,
} from "lucide-react";
import Link from "next/link";

function CourseOfferingsContent() {
  const searchParams = useSearchParams();
  const initialOfferingId = searchParams.get("offeringId");

  const [offerings, setOfferings] = useState<CourseOffering[]>([]);
  const [enrollments, setEnrollments] = useState<CourseEnrollment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [joinCode, setJoinCode] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"APPROVED" | "PENDING" | "ARCHIVED">("APPROVED");

  // In-course Course Material PDF state
  const [selectedOfferingId, setSelectedOfferingId] = useState<string | null>(
    initialOfferingId
  );
  const [materials, setMaterials] = useState<TeacherDocument[]>([]);
  const [isLoadingMaterials, setIsLoadingMaterials] = useState(false);

  const loadData = async () => {
    try {
      const [offeringsData, enrollmentsData] = await Promise.all([
        studentApi.getOfferings(),
        studentApi.getEnrollments(),
      ]);
      setOfferings(offeringsData);
      setEnrollments(enrollmentsData);
    } catch (err: unknown) {
      console.error("Failed to load courses:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // When selectedOfferingId changes, load its materials
  useEffect(() => {
    if (!selectedOfferingId) {
      setMaterials([]);
      return;
    }

    let mounted = true;
    async function fetchMaterials() {
      setIsLoadingMaterials(true);
      try {
        const docs = await materialApi.getMaterials(selectedOfferingId || undefined);
        if (mounted) {
          setMaterials(docs);
        }
      } catch (err: unknown) {
        console.error("Failed to load materials for course:", err);
      } finally {
        if (mounted) setIsLoadingMaterials(false);
      }
    }

    fetchMaterials();
    return () => {
      mounted = false;
    };
  }, [selectedOfferingId]);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;

    setIsJoining(true);
    setJoinError(null);

    try {
      await studentApi.joinCourse(joinCode.trim());
      setJoinCode("");
      await loadData();
      setActiveTab("PENDING");
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Không thể tham gia lớp với mã này.";
      setJoinError(msg);
    } finally {
      setIsJoining(false);
    }
  };

  const pendingEnrollments = enrollments.filter((e) => e.status === "PENDING");
  const approvedOfferings = offerings.filter((o) => o.status === "ACTIVE");
  const archivedOfferings = offerings.filter((o) => o.status === "ARCHIVED");

  const currentSelectedOffering = approvedOfferings.find(
    (o) => o.id === selectedOfferingId
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight font-display">
            Lớp học phần của bạn
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Quản lý các lớp học phần đã tham gia và theo dõi học liệu PDF trực tiếp trong từng lớp.
          </p>
        </div>

        {/* Join Code Input Form */}
        <form onSubmit={handleJoin} className="flex items-center gap-2 max-w-md w-full md:w-auto">
          <div className="relative flex-1">
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="Nhập mã tham gia (VD: AI2026PTIT)"
              className="w-full pl-3 pr-3 py-2 text-xs font-mono font-bold tracking-wider uppercase border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white"
            />
          </div>
          <button
            type="submit"
            disabled={isJoining || !joinCode.trim()}
            className="px-4 py-2 bg-ptit-red  disabled:opacity-60 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm flex-shrink-0 cursor-pointer"
          >
            {isJoining ? (
              <LoadingSpinner size="sm" />
            ) : (
              <>
                <PlusCircle className="w-4 h-4" /> Tham gia
              </>
            )}
          </button>
        </form>
      </div>

      {joinError && (
        <ErrorAlert message={joinError} onRetry={() => setJoinError(null)} />
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          type="button"
          onClick={() => {
            setActiveTab("APPROVED");
            setSelectedOfferingId(null);
          }}
          className={`pb-3 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
            activeTab === "APPROVED"
              ? "border-ptit-red text-ptit-red"
              : "border-transparent text-slate-500 "
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>Đã được duyệt ({approvedOfferings.length})</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab("PENDING");
            setSelectedOfferingId(null);
          }}
          className={`pb-3 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
            activeTab === "PENDING"
              ? "border-ptit-red text-ptit-red"
              : "border-transparent text-slate-500 "
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Đang chờ duyệt ({pendingEnrollments.length})</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab("ARCHIVED");
            setSelectedOfferingId(null);
          }}
          className={`pb-3 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
            activeTab === "ARCHIVED"
              ? "border-ptit-red text-ptit-red"
              : "border-transparent text-slate-500 "
          }`}
        >
          <Archive className="w-4 h-4" />
          <span>Lưu trữ ({archivedOfferings.length})</span>
        </button>
      </div>

      {/* Tab Content */}
      {isLoading ? (
        <div className="py-12 flex justify-center">
          <LoadingSpinner size="lg" text="Đang tải danh sách Lớp học phần..." />
        </div>
      ) : (
        <div>
          {/* APPROVED TAB */}
          {activeTab === "APPROVED" && (
            <div>
              {approvedOfferings.length === 0 ? (
                <EmptyState
                  title="Chưa có Lớp học phần được duyệt"
                  description="Bạn chưa được duyệt vào lớp học phần nào. Hãy nhập mã tham gia lớp từ Giảng viên ở ô phía trên."
                />
              ) : selectedOfferingId && currentSelectedOffering ? (
                /* IN-COURSE MATERIALS & SLIDE VIEW (Directly inside Course Offering) */
                <div className="space-y-4 animate-in fade-in duration-200">
                  {/* Top Bar for Selected Course */}
                  <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setSelectedOfferingId(null)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100  text-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" /> Quay lại danh sách lớp
                      </button>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-red-100 text-ptit-red font-mono font-bold text-xs">
                            {currentSelectedOffering.code}
                          </span>
                          <h2 className="text-base font-bold text-slate-900">
                            {currentSelectedOffering.name}
                          </h2>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Giảng viên: <span className="font-medium text-slate-700">{currentSelectedOffering.teacherName}</span> • Học kỳ: {currentSelectedOffering.semesterName}
                        </p>
                      </div>
                    </div>

                    <Link
                      href={`/review/${currentSelectedOffering.id}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50  text-ptit-red rounded-xl text-xs font-bold transition flex-shrink-0"
                    >
                      <Sparkles className="w-3.5 h-3.5" /> Xem nội dung cần ôn tập lớp này
                    </Link>
                  </div>

                  {/* Policy Info Box */}
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-600 flex items-start gap-2.5">
                    <Info className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-slate-800">Quy định truy cập học liệu trong lớp:</span> toàn bộ Course Material dùng PDF có lớp văn bản. Student được đọc trực tuyến, ghi chú theo trang và dùng AI Tutor khi enrollment ở trạng thái APPROVED.
                    </div>
                  </div>

                  {/* Materials List */}
                  {isLoadingMaterials ? (
                    <div className="py-12 flex justify-center">
                      <LoadingSpinner size="md" text="Đang tải học liệu của lớp học phần..." />
                    </div>
                  ) : materials.length === 0 ? (
                    <div className="p-8 text-center bg-white rounded-2xl border border-slate-200">
                      <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                      <h4 className="text-sm font-bold text-slate-800">Chưa có học liệu nào được công bố</h4>
                      <p className="text-xs text-slate-500 mt-1">Giảng viên phụ trách chưa tải lên bài giảng hoặc tài liệu cho lớp học phần này.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {materials.map((doc) => (
                          <div
                            key={doc.id}
                            className="p-5 rounded-2xl border border-slate-200 bg-white   transition flex flex-col justify-between"
                          >
                            <div>
                              <div className="flex items-center justify-between gap-2 mb-2">
                                <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold flex items-center gap-1 bg-red-100 text-ptit-red border border-red-200">
                                  <FileText className="w-3.5 h-3.5" /> PDF Học liệu
                                </span>
                                <span className="text-[11px] text-slate-400">
                                  {(doc.fileSize / (1024 * 1024)).toFixed(1)} MB
                                </span>
                              </div>

                              <h3 className="font-bold text-slate-900 text-sm mb-1 line-clamp-2">
                                {doc.title}
                              </h3>
                              <p className="text-xs text-slate-400 mb-3 truncate">
                                Tên tệp: {doc.fileName}
                              </p>

                              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-red-50 text-red-800 text-[11px] font-semibold rounded-lg mb-4">
                                <Sparkles className="w-3 h-3 text-red-600" />
                                <span>PDF Viewer · Ghi chú theo trang · AI Tutor</span>
                              </div>
                            </div>

                            <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                              <span className="text-xs text-slate-500">{doc.totalPages} trang</span>
                              <Link
                                href={`/materials/${doc.id}/viewer`}
                                className="inline-flex items-center gap-1.5 px-4 py-2 bg-ptit-red text-white rounded-xl text-xs font-bold shadow-sm transition"
                              >
                                <BookOpen className="w-4 h-4" /> Xem PDF & Hỏi AI
                              </Link>
                            </div>
                          </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                /* DEFAULT APPROVED OFFERINGS LIST */
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {approvedOfferings.map((offering) => (
                    <div
                      key={offering.id}
                      className="p-5 rounded-2xl border border-slate-200 bg-white   transition"
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-lg bg-red-100 text-ptit-red font-mono font-bold text-xs">
                            {offering.code}
                          </span>
                          <StatusBadge status="APPROVED" size="sm" />
                        </div>
                        <span className="text-xs text-slate-500">
                          {offering.semesterName}
                        </span>
                      </div>

                      <h3 className="font-bold text-slate-800 text-base mb-1">
                        {offering.name}
                      </h3>
                      <p className="text-xs text-slate-500 mb-4">
                        Giảng viên: <span className="font-medium text-slate-700">{offering.teacherName}</span>
                      </p>

                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-xs text-slate-500">
                          Học liệu lớp: <b>{offering.materialsCount || 4} tài liệu</b>
                        </span>
                        <button
                          onClick={() => setSelectedOfferingId(offering.id)}
                          className="inline-flex items-center gap-1 text-xs font-bold text-ptit-red  bg-red-50  px-3.5 py-2 rounded-xl transition cursor-pointer"
                        >
                          <BookOpen className="w-3.5 h-3.5" /> Xem học liệu PDF
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* PENDING TAB */}
          {activeTab === "PENDING" && (
            <div>
              {pendingEnrollments.length === 0 ? (
                <EmptyState
                  title="Không có yêu cầu chờ duyệt"
                  description="Bạn không có yêu cầu tham gia lớp nào đang chờ Giảng viên phê duyệt."
                />
              ) : (
                <div className="space-y-3">
                  <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-amber-600 flex-shrink-0" />
                    <span>
                      Theo chính sách hệ thống: Sinh viên chưa được xem học liệu PDF khi yêu cầu chưa được Giảng viên phê duyệt.
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {pendingEnrollments.map((enr) => (
                      <div
                        key={enr.id}
                        className="p-5 rounded-2xl border border-amber-200 bg-white shadow-2xs"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-700 font-mono font-bold text-xs">
                            {enr.offeringCode}
                          </span>
                          <StatusBadge status="PENDING" size="sm" />
                        </div>
                        <h3 className="font-bold text-slate-800 text-base mb-1">
                          {enr.offeringName}
                        </h3>
                        <p className="text-xs text-slate-500 mb-3">
                          Giảng viên: <span className="font-medium text-slate-700">{enr.teacherName}</span>
                        </p>
                        <div className="pt-3 border-t border-slate-100 text-xs text-slate-400">
                          Yêu cầu gửi lúc: {new Date(enr.requestedAt).toLocaleString("vi-VN")}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ARCHIVED TAB */}
          {activeTab === "ARCHIVED" && (
            <div>
              {archivedOfferings.length === 0 ? (
                <EmptyState
                  title="Không có Lớp học phần lưu trữ"
                  description="Không có lớp học phần nào đã kết thúc hoặc lưu trữ."
                />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {archivedOfferings.map((offering) => (
                    <div
                      key={offering.id}
                      className="p-5 rounded-2xl border border-slate-200 bg-slate-50 opacity-80"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="px-2.5 py-0.5 rounded-lg bg-slate-200 text-slate-700 font-mono font-bold text-xs">
                          {offering.code}
                        </span>
                        <StatusBadge status="ARCHIVED" size="sm" />
                      </div>
                      <h3 className="font-bold text-slate-800 text-base mb-1">
                        {offering.name}
                      </h3>
                      <p className="text-xs text-slate-500">
                        Giảng viên: {offering.teacherName} • {offering.semesterName}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function StudentCourseOfferingsPage() {
  return (
    <Suspense fallback={<div className="py-12 flex justify-center"><LoadingSpinner size="lg" /></div>}>
      <CourseOfferingsContent />
    </Suspense>
  );
}
