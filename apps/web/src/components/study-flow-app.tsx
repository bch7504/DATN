"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useState,
  type ChangeEvent,
  type FormEvent,
  type KeyboardEvent,
  type ReactElement,
  type ReactNode,
} from "react";
import {
  Activity,
  Archive,
  BarChart3,
  Bell,
  BookOpen,
  Bot,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Copy,
  Download,
  FileDown,
  FileText,
  Flame,
  GraduationCap,
  History,
  LayoutDashboard,
  Library,
  Link2,
  ListChecks,
  LoaderCircle,
  LockKeyhole,
  LogOut,
  Menu,
  MessageSquareText,
  NotebookPen,
  PanelLeftClose,
  Play,
  Plus,
  RefreshCw,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Sparkles,
  Target,
  Upload,
  UserCheck,
  UserCog,
  UserPlus,
  Users,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { isDemoMode, logout } from "@/lib/api-client";
import { materials, personalDocuments, quizzes, studentDashboard, weeklyTasks } from "@/lib/demo-data";
import type { DailyGoalMetric, ProcessingStatus, QuizStatus } from "@/types/api";
import { useSession } from "@/components/auth-context";

type Role = "student" | "teacher" | "admin";
type ChatStatus = "ANSWERED" | "NO_EVIDENCE";

interface StudyFlowAppProps {
  role: Role;
  section: string;
}

interface NavItem {
  key: string;
  label: string;
  icon: LucideIcon;
}

interface ChatTurn {
  id: string;
  role: "user" | "assistant";
  text: string;
  status?: ChatStatus;
  citation?: {
    documentName: string;
    location: string;
    excerpt: string;
  };
}

interface PageHeaderProps {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
}

const navByRole: Record<Role, NavItem[]> = {
  student: [
    { key: "dashboard", label: "Tổng quan", icon: LayoutDashboard },
    { key: "course-offerings", label: "Lớp học phần", icon: GraduationCap },
    { key: "materials", label: "Học liệu", icon: Library },
    { key: "personal-documents", label: "Tài liệu & Chatbot", icon: MessageSquareText },
    { key: "review", label: "Ôn tập & Quiz", icon: ClipboardCheck },
    { key: "plan", label: "Kế hoạch & Lịch", icon: CalendarDays },
  ],
  teacher: [
    { key: "dashboard", label: "Tổng quan", icon: LayoutDashboard },
    { key: "course-offerings", label: "Lớp học phần của tôi", icon: GraduationCap },
    { key: "enrollments", label: "Yêu cầu tham gia", icon: UserCheck },
    { key: "documents", label: "Kho tài liệu", icon: Library },
    { key: "publications", label: "Đã công bố", icon: FileDown },
  ],
  admin: [
    { key: "dashboard", label: "Tổng quan", icon: LayoutDashboard },
    { key: "users", label: "Người dùng", icon: UserCog },
    { key: "catalog", label: "Môn học & Học kỳ", icon: BookOpen },
    { key: "course-offerings", label: "Giám sát lớp học phần", icon: GraduationCap },
    { key: "feedback", label: "Phản hồi", icon: MessageSquareText },
    { key: "logs", label: "Nhật ký hệ thống", icon: Activity },
    { key: "settings", label: "Cài đặt", icon: Settings },
  ],
};

const roleMeta: Record<Role, { label: string; fallbackId: string }> = {
  student: { label: "Sinh viên", fallbackId: "B21DCCN001" },
  teacher: { label: "Giảng viên", fallbackId: "Khoa CNTT" },
  admin: { label: "Quản trị viên", fallbackId: "System Admin" },
};

/**
 * Render the authenticated StudyFlow shell for one role.
 * @param props.role Route role already validated by AuthGuard.
 * @param props.section Requested workspace section; unknown sections fall back to dashboard.
 * @returns Responsive role workspace. In production mode it waits for Java-backed data.
 */
export function StudyFlowApp({ role, section }: StudyFlowAppProps): ReactElement {
  const router = useRouter();
  const session = useSession();
  const [mobileNavOpen, setMobileNavOpen] = useState<boolean>(false);
  const [toast, setToast] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState<boolean>(false);
  const demoMode = isDemoMode();
  const navItems = navByRole[role];
  const active = navItems.some((item: NavItem): boolean => item.key === section) || section === "viewer" ? section : "dashboard";
  const title = navItems.find((item: NavItem): boolean => item.key === active)?.label ?? (active === "viewer" ? "Slide Viewer" : "Tổng quan");

  const notify = (message: string): void => {
    setToast(message);
    window.setTimeout((): void => setToast(null), 2600);
  };

  const endSession = async (): Promise<void> => {
    setLoggingOut(true);
    try {
      if (!demoMode) await logout();
      router.replace("/login");
    } catch {
      setLoggingOut(false);
      notify("Không thể đăng xuất. Vui lòng thử lại.");
    }
  };

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNavOpen ? "open" : ""}`}>
        <div className="brand-row">
          <Image src="/branding/ptit-logo.svg" width={48} height={48} alt="Biểu trưng PTIT" className="brand-logo" priority />
          <button className="icon-button sidebar-close" type="button" onClick={(): void => setMobileNavOpen(false)} aria-label="Đóng menu"><PanelLeftClose size={20} /></button>
        </div>
        <div className="product-lockup"><span className="product-mark">SF</span><div><strong>StudyFlow</strong><small>Không gian học tập số</small></div></div>
        <span className="nav-caption">Không gian làm việc</span>
        <nav className="main-nav" aria-label={`Điều hướng ${roleMeta[role].label}`}>
          {navItems.map((item: NavItem): ReactElement => {
            const Icon = item.icon;
            return <Link key={item.key} href={`/${role}/${item.key}`} className={active === item.key ? "active" : ""} onClick={(): void => setMobileNavOpen(false)}><Icon size={19} /><span>{item.label}</span></Link>;
          })}
        </nav>
        <div className="sidebar-bottom">
          <div className="ai-status"><span className="pulse-dot" /><div><strong>AI Service</strong><small>Java kiểm soát phạm vi</small></div></div>
          <div className="profile-mini">
            <span className="avatar">{session.user.displayName.slice(0, 1)}</span>
            <span><strong>{session.user.displayName}</strong><small>{demoMode ? roleMeta[role].fallbackId : session.user.email}</small></span>
            <button className="profile-logout" type="button" onClick={endSession} disabled={loggingOut} aria-label="Đăng xuất"><LogOut size={17} /></button>
          </div>
        </div>
      </aside>

      {mobileNavOpen && <button className="nav-backdrop" type="button" aria-label="Đóng menu" onClick={(): void => setMobileNavOpen(false)} />}

      <div className="app-main">
        <header className="topbar">
          <div className="topbar-title">
            <button className="icon-button mobile-menu" type="button" onClick={(): void => setMobileNavOpen(true)} aria-label="Mở menu"><Menu size={21} /></button>
            <div><span>StudyFlow / {roleMeta[role].label}</span><strong>{title}</strong></div>
          </div>
          <div className="top-actions">
            {demoMode && <span className="demo-badge"><Sparkles size={14} /> Dữ liệu demo</span>}
            {demoMode && <label className="role-switcher"><span className="sr-only">Chuyển vai trò demo</span><select value={role} onChange={(event: ChangeEvent<HTMLSelectElement>): void => router.push(`/${event.target.value}/dashboard`)}><option value="student">Sinh viên</option><option value="teacher">Giảng viên</option><option value="admin">Admin</option></select></label>}
            <button className="icon-button" type="button" aria-label="Thông báo"><Bell size={20} /><i /></button>
          </div>
        </header>
        <main className="workspace">{demoMode ? <Workspace role={role} section={active} notify={notify} /> : <BackendRequired />}</main>
      </div>
      {toast && <div className="toast" role="status"><CheckCircle2 size={18} />{toast}</div>}
    </div>
  );
}

/** Route the selected role section to its workspace. */
function Workspace({ role, section, notify }: { role: Role; section: string; notify: (message: string) => void }): ReactElement {
  if (role === "student") {
    if (section === "course-offerings") return <CourseOfferingsPage notify={notify} />;
    if (section === "materials") return <MaterialsPage notify={notify} />;
    if (section === "viewer") return <ViewerPage notify={notify} />;
    if (section === "personal-documents") return <PersonalDocumentsPage notify={notify} />;
    if (section === "review") return <ReviewPage notify={notify} />;
    if (section === "plan") return <PlanPage notify={notify} />;
    return <StudentDashboard notify={notify} />;
  }
  if (role === "teacher") return <TeacherPage section={section} notify={notify} />;
  return <AdminPage section={section} notify={notify} />;
}

/** Render a consistent page title block. */
function PageHeader({ eyebrow, title, description, actions }: PageHeaderProps): ReactElement {
  return <div className="page-header"><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{description}</p></div>{actions && <div className="page-actions">{actions}</div>}</div>;
}

/** Render the Student dashboard fixture. */
function StudentDashboard({ notify }: { notify: (message: string) => void }): ReactElement {
  const [editingGoal, setEditingGoal] = useState<boolean>(false);

  const saveTargets = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    setEditingGoal(false);
    notify("Đã lưu target Daily Goal demo; actual luôn do Java tính từ Learning Event");
  };

  return <div className="page-stack">
    <PageHeader eyebrow="Học kỳ 1 · 2026–2027" title="Chào buổi sáng, Minh Khang" description="Theo dõi nhịp học hôm nay và tiếp tục lớp học phần đã được duyệt." actions={<><Link className="button secondary" href="/student/plan"><CalendarDays size={17} /> Xem lịch</Link><Link className="button primary" href="/student/course-offerings"><Play size={17} /> Vào lớp học phần</Link></>} />
    <section className="hero-card"><div className="hero-copy"><span className="hero-kicker"><Sparkles size={15} /> Luồng học chính</span><h2>Từ slide bài giảng đến câu trả lời có nguồn</h2><p>Mở Course Offering, xem PPTX, ghi chú và hỏi AI Tutor ngay tại slide.</p><Link href="/student/materials" className="button light">Mở học liệu <ChevronRight size={17} /></Link></div><div className="flow-steps">{["Vào lớp", "Mở slide", "Ghi chú", "Hỏi AI"].map((label: string, index: number): ReactElement => <div key={label}><b>0{index + 1}</b><span>{label}</span></div>)}</div></section>
    <section className="stats-grid"><Metric icon={Flame} label="Study Streak" value={`${studentDashboard.studyStreak.currentStreak} ngày`} trend={`Dài nhất ${studentDashboard.studyStreak.longestStreak} ngày`} /><Metric icon={BookOpen} label="Tiến độ tổng quan" value={`${studentDashboard.aggregateProgress.viewedSlides} / ${studentDashboard.aggregateProgress.totalSlides}`} trend={`${studentDashboard.aggregateProgress.percent}% slide đã xem`} /><Metric icon={ClipboardCheck} label="Quiz hoàn thành" value="7" trend="Java chấm điểm" /><Metric icon={ListChecks} label="Task tuần" value="9 / 12" trend="Bạn chủ động lập" /></section>
    <section className="dashboard-grid"><div className="card panel-span-2"><CardHeading title="Mục tiêu hôm nay" action={<button className="text-action" type="button" onClick={(): void => setEditingGoal((value: boolean): boolean => !value)}>{editingGoal ? "Đóng" : "Chỉnh mục tiêu"}</button>} /><p className="card-note">Target do bạn chọn; actual và phần trăm do Java trả về.</p>{editingGoal ? <form className="daily-goal-form" onSubmit={saveTargets}>{studentDashboard.dailyGoal.map((goal: DailyGoalMetric): ReactElement => <label key={goal.key}>{goal.label}<input name={goal.key} type="number" min="0" defaultValue={goal.target} /></label>)}<button className="button primary" type="submit"><Target size={16} /> Lưu mục tiêu</button></form> : <div className="daily-goal-list">{studentDashboard.dailyGoal.map((goal: DailyGoalMetric): ReactElement => <DailyGoalRow key={goal.key} goal={goal} />)}</div>}</div><div className="card streak-card"><div className="streak-icon"><Flame /></div><span className="eyebrow">Study Streak</span><strong>{studentDashboard.studyStreak.currentStreak} ngày liên tiếp</strong><p>Dài nhất {studentDashboard.studyStreak.longestStreak} ngày. Chỉ slide, Study Task hoặc Quiz hợp lệ mới được tính.</p><div className="streak-week">{["T5", "T6", "T7", "CN", "T2", "T3", "T4"].map((day: string, index: number): ReactElement => <span className={index === 0 ? "muted" : "active"} key={day}>{day}</span>)}</div></div><div className="card panel-span-2"><CardHeading title="Tiếp tục học" action={<Link href="/student/materials">Xem tất cả</Link>} /><div className="course-card"><div className="course-icon"><BookOpen /></div><div className="course-main"><span>INT2211 · Cơ sở dữ liệu</span><h3>Thiết kế cơ sở dữ liệu quan hệ</h3><div className="progress-line"><i style={{ width: "64%" }} /></div><small>Slide 18/28 · enrollment APPROVED</small></div><Link className="round-action" href="/student/viewer" aria-label="Mở slide"><ChevronRight /></Link></div></div><div className="card"><CardHeading title="Lịch hôm nay" action={<Link href="/student/plan">Chi tiết</Link>} /><div className="timeline"><div><time>08:00</time><span><b>Xem slide Chuẩn hóa</b><small>Cơ sở dữ liệu · 45 phút</small></span></div><div><time>19:00</time><span><b>Làm Quiz SQL</b><small>12 câu · 25 phút</small></span></div></div></div><div className="card panel-span-2"><CardHeading title="Lớp học phần của bạn" /><div className="subject-grid"><SubjectCard code="DBI-01" name="Cơ sở dữ liệu" progress={64} color="red" /><SubjectCard code="AI-02" name="Trí tuệ nhân tạo" progress={42} color="gold" /><SubjectCard code="WEB-03" name="Lập trình Web" progress={78} color="blue" /></div></div><div className="card ai-card"><Bot size={24} /><span className="eyebrow light">AI theo nguồn</span><h3>Cần giải thích tài liệu?</h3><p>Chọn Personal PDF hoặc hỏi ngay trong Slide Viewer.</p><Link href="/student/personal-documents" className="button light wide">Mở chatbot</Link></div></section>
  </div>;
}

/** Render Student Course Offering discovery and enrollment states. */
function CourseOfferingsPage({ notify }: { notify: (message: string) => void }): ReactElement {
  const [joinCode, setJoinCode] = useState<string>("");
  const submitJoin = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    if (!joinCode.trim()) return;
    notify(`Đã gửi yêu cầu tham gia bằng mã ${joinCode.toUpperCase()}; đang chờ Teacher duyệt`);
    setJoinCode("");
  };
  const offerings = [
    { code: "DBI-01", name: "Cơ sở dữ liệu", teacher: "TS. Nguyễn Minh Anh", status: "APPROVED", tone: "ready", count: 7, progress: 64, viewed: "18/28 slide" },
    { code: "AI-02", name: "Trí tuệ nhân tạo", teacher: "ThS. Lê Hoàng", status: "PENDING", tone: "processing", count: 0, progress: 0, viewed: "Chưa được truy cập" },
    { code: "WEB-23", name: "Lập trình Web", teacher: "ThS. Phạm Huy", status: "ARCHIVED", tone: "review", count: 5, progress: 78, viewed: "25/32 slide" },
  ];
  return <div className="page-stack"><PageHeader eyebrow="Semester → Course Offering" title="Lớp học phần" description="Nhập mã tham gia, theo dõi yêu cầu và chỉ mở học liệu khi Teacher đã duyệt." />
    <section className="join-card"><div><span className="eyebrow light">Tham gia lớp mới</span><h2>Nhập join code do giảng viên cung cấp</h2><p>Yêu cầu sẽ ở trạng thái PENDING cho đến khi Teacher của lớp phê duyệt.</p></div><form onSubmit={submitJoin}><label htmlFor="join-code">Mã lớp học phần</label><div><input id="join-code" value={joinCode} maxLength={12} onChange={(event: ChangeEvent<HTMLInputElement>): void => setJoinCode(event.target.value.replace(/\s/g, ""))} placeholder="Ví dụ: AI7X92" /><button className="button light" type="submit"><UserPlus size={17} /> Gửi yêu cầu</button></div></form></section>
    <div className="filter-row"><div className="search-box"><Search size={17} /><input aria-label="Tìm lớp học phần" placeholder="Tìm tên lớp hoặc môn học" /></div><button className="chip active" type="button">Tất cả</button><button className="chip" type="button">Học kỳ 1</button></div>
    <div className="class-grid">{offerings.map((offering: typeof offerings[number], index: number): ReactElement => <article className="class-card" key={offering.code}><div className={`class-cover cover-${index + 1}`}><span>HK1 · 2026–2027</span><GraduationCap /></div><div className="class-body"><span className={`status ${offering.tone}`}>{offering.status === "APPROVED" ? "Đã duyệt" : offering.status === "PENDING" ? "Chờ duyệt" : "Đã kết thúc"}</span><h2>{offering.name}</h2><p>{offering.code} · {offering.teacher}</p><div className="meta-split"><span><Library size={15} /> {offering.count} học liệu</span><span>{offering.status}</span></div>{offering.status !== "PENDING" && <div className="offering-progress"><span><b>Tiến độ xem</b><small>{offering.viewed}</small></span><div className="progress-line"><i style={{ width: `${offering.progress}%` }} /></div></div>}{offering.status === "APPROVED" ? <Link className="button primary wide" href="/student/materials">Mở chi tiết lớp <ChevronRight size={16} /></Link> : <button className="button secondary wide" type="button" disabled>{offering.status === "PENDING" ? "Đang chờ Teacher duyệt" : "Xem lịch sử lớp"}</button>}</div></article>)}</div>
  </div>;
}

/** Render authorized Teacher publications for one approved offering. */
function MaterialsPage({ notify }: { notify: (message: string) => void }): ReactElement {
  return <div className="page-stack"><PageHeader eyebrow="DBI-01 · Enrollment APPROVED" title="Học liệu Cơ sở dữ liệu" description="PPTX học trên web; PDF giảng viên chỉ được tải xuống sau khi Java kiểm quyền." actions={<Link className="button secondary" href="/student/course-offerings"><ChevronLeft size={17} /> Đổi lớp</Link>} /><div className="policy-banner"><ShieldCheck /><div><strong>Chính sách học liệu</strong><p>PPTX không cung cấp file gốc. Teacher PDF không có Viewer, Note, Tutor hoặc AI indexing.</p></div></div><div className="table-card"><div className="table-head"><span>Tài liệu</span><span>Giảng viên</span><span>Trạng thái</span><span>Tiến độ</span><span>Thao tác</span></div>{materials.map((item: typeof materials[number]): ReactElement => <div className="table-row" key={item.id}><div className="file-cell"><span className={`file-icon ${item.type.toLowerCase()}`}>{item.type === "PPTX" ? <BookOpen size={21} /> : <FileText size={21} />}</span><span><strong>{item.title}</strong><small>{item.type} · {item.subject}</small></span></div><span>{item.owner}</span><StatusBadge status={item.status} /><span>{item.progress ? `${item.progress}%` : "—"}</span><span>{item.type === "PPTX" ? <Link className="button primary compact" href="/student/viewer">Xem slide</Link> : <button className="button secondary compact" type="button" onClick={(): void => notify("Java kiểm Enrollment và publication trước khi cấp signed URL")}><Download size={15} /> Tải PDF</button>}</span></div>)}</div></div>;
}

/** Render Slide Viewer, personal note and scoped Slide Tutor. */
function ViewerPage({ notify }: { notify: (message: string) => void }): ReactElement {
  const [slide, setSlide] = useState<number>(3);
  const [note, setNote] = useState<string>("Chuẩn hóa giúp giảm dư thừa và các bất thường khi cập nhật dữ liệu.");
  const [question, setQuestion] = useState<string>("");
  const [retrieving, setRetrieving] = useState<boolean>(false);
  const [turns, setTurns] = useState<ChatTurn[]>([]);

  const ask = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const normalized = question.trim();
    if (!normalized || retrieving) return;
    const userTurn: ChatTurn = { id: `slide-u-${Date.now()}`, role: "user", text: normalized };
    setTurns((items: ChatTurn[]): ChatTurn[] => [...items, userTurn]);
    setQuestion("");
    setRetrieving(true);
    window.setTimeout((): void => {
      const noEvidence = /ngoài|điểm thi|học phí/i.test(normalized);
      const reply: ChatTurn = noEvidence
        ? { id: `slide-a-${Date.now()}`, role: "assistant", status: "NO_EVIDENCE", text: "Không tìm thấy đủ bằng chứng trong slide được phép để trả lời câu hỏi này." }
        : { id: `slide-a-${Date.now()}`, role: "assistant", status: "ANSWERED", text: "Bất thường cập nhật xảy ra khi cùng một thông tin lặp ở nhiều dòng, khiến dữ liệu có thể không nhất quán nếu chỉ sửa một vị trí.", citation: { documentName: "Thiết kế cơ sở dữ liệu quan hệ.pptx", location: `Slide ${slide}`, excerpt: "Một thay đổi phải được cập nhật tại nhiều vị trí lưu trữ." } };
      setTurns((items: ChatTurn[]): ChatTurn[] => [...items, reply]);
      setRetrieving(false);
    }, 650);
  };

  return <div className="viewer-page"><div className="viewer-toolbar"><Link href="/student/materials" className="button ghost"><ChevronLeft size={17} /> Học liệu</Link><div><strong>Thiết kế cơ sở dữ liệu quan hệ</strong><small>DBI-01 · Slide {slide}/12</small></div><span className="status ready">Đã xử lý</span></div><div className="viewer-layout"><aside className="slide-strip">{Array.from({ length: 8 }, (_value: unknown, index: number): number => index + 1).map((number: number): ReactElement => <button type="button" key={number} className={slide === number ? "active" : ""} onClick={(): void => setSlide(number)}><span>{number}</span><div><small>PTIT · DATABASE</small><b>{number === 3 ? "Bất thường dữ liệu" : `Nội dung slide ${number}`}</b></div></button>)}</aside><section className="slide-stage"><div className="slide-canvas"><div className="slide-brand">PTIT · CƠ SỞ DỮ LIỆU</div><span className="slide-number">0{slide}</span><h2>{slide === 3 ? "Các bất thường trong dữ liệu" : "Thiết kế cơ sở dữ liệu quan hệ"}</h2><p>Một mô hình dữ liệu tốt cần giảm dư thừa và duy trì tính nhất quán.</p><div className="slide-columns"><article><b>INSERT</b><span>Không thể thêm dữ liệu khi thiếu thông tin không liên quan.</span></article><article><b>UPDATE</b><span>Một thay đổi phải cập nhật tại nhiều vị trí.</span></article><article><b>DELETE</b><span>Xóa một bản ghi có thể làm mất thông tin cần giữ.</span></article></div></div><div className="viewer-nav"><button className="icon-button" type="button" onClick={(): void => setSlide(Math.max(1, slide - 1))} aria-label="Slide trước"><ChevronLeft /></button><div className="viewer-progress"><i style={{ width: `${(slide / 12) * 100}%` }} /></div><button className="icon-button" type="button" onClick={(): void => setSlide(Math.min(12, slide + 1))} aria-label="Slide sau"><ChevronRight /></button></div><div className="note-panel"><div><NotebookPen size={18} /><strong>Ghi chú của bạn · Slide {slide}</strong></div><textarea aria-label="Ghi chú slide" value={note} onChange={(event: ChangeEvent<HTMLTextAreaElement>): void => setNote(event.target.value)} /><button className="button secondary compact" type="button" onClick={(): void => notify("Ghi chú demo đã được lưu theo Student + Slide")}>Lưu ghi chú</button></div></section><aside className="tutor-panel"><div className="tutor-heading"><span><Bot size={20} /></span><div><strong>Slide AI Tutor</strong><small>Hỏi đáp có nguồn, không đoán</small></div></div><div className="scope-pill"><ShieldCheck size={15} /> DBI-01 · PPTX này · Slide {slide}</div><div className="chat-messages"><div className="chat-message assistant"><b>AI Tutor</b><p>Hãy hỏi nội dung chưa rõ. Tôi chỉ trả lời từ slide được Java cho phép.</p></div>{turns.map((turn: ChatTurn): ReactElement => <ChatBubble key={turn.id} turn={turn} />)}{retrieving && <div className="chat-message assistant processing-message"><LoaderCircle className="spin" size={16} /><p>Đang truy xuất và đối chiếu nguồn…</p></div>}</div><div className="suggestions"><button type="button" onClick={(): void => setQuestion("Cho ví dụ dễ hiểu về bất thường cập nhật")}>Cho ví dụ</button><button type="button" onClick={(): void => setQuestion("Tóm tắt slide này")}>Tóm tắt slide</button></div><form className="chat-input" onSubmit={ask}><textarea value={question} onChange={(event: ChangeEvent<HTMLTextAreaElement>): void => setQuestion(event.target.value)} placeholder="Hỏi về slide này…" /><button type="submit" aria-label="Gửi câu hỏi" disabled={retrieving}><Send size={18} /></button></form></aside></div></div>;
}

/** Render the Personal PDF library and evidence-scoped chatbot workspace. */
function PersonalDocumentsPage({ notify }: { notify: (message: string) => void }): ReactElement {
  const [tab, setTab] = useState<"documents" | "chat">("documents");
  const [selected, setSelected] = useState<string[]>(["personal-1", "personal-2"]);
  const [question, setQuestion] = useState<string>("");
  const [retrieving, setRetrieving] = useState<boolean>(false);
  const [conversation, setConversation] = useState<ChatTurn[]>([]);

  const toggleDocument = (documentId: string): void => {
    setSelected((current: string[]): string[] => current.includes(documentId) ? current.filter((id: string): boolean => id !== documentId) : [...current, documentId]);
  };
  const onFile = (event: ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) notify("Personal Document chỉ chấp nhận PDF có text layer");
    else notify(`${file.name} sẵn sàng gửi tới Java để kiểm tra và index`);
    event.target.value = "";
  };
  const ask = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const normalized = question.trim();
    if (!normalized || selected.length === 0 || retrieving) return;
    setConversation((items: ChatTurn[]): ChatTurn[] => [...items, { id: `rag-u-${Date.now()}`, role: "user", text: normalized }]);
    setQuestion("");
    setRetrieving(true);
    window.setTimeout((): void => {
      const noEvidence = /học phí|điểm thi|thời tiết|ngoài tài liệu/i.test(normalized);
      const response: ChatTurn = noEvidence
        ? { id: `rag-a-${Date.now()}`, role: "assistant", status: "NO_EVIDENCE", text: "Không tìm thấy đủ bằng chứng trong 2 tài liệu đã chọn. Hãy đổi nguồn hoặc đặt câu hỏi cụ thể hơn." }
        : { id: `rag-a-${Date.now()}`, role: "assistant", status: "ANSWERED", text: "Chuẩn hóa giúp giảm dữ liệu lặp và hạn chế bất thường khi thêm, sửa hoặc xóa. 3NF yêu cầu thuộc tính không khóa không phụ thuộc bắc cầu vào khóa.", citation: { documentName: "Ghi chú chuẩn hóa dữ liệu.pdf", location: "Trang 12", excerpt: "Dạng chuẩn ba loại bỏ phụ thuộc bắc cầu của thuộc tính không khóa vào khóa." } };
      setConversation((items: ChatTurn[]): ChatTurn[] => [...items, response]);
      setRetrieving(false);
    }, 700);
  };
  const composerKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>): void => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  };
  const startNewConversation = (): void => {
    setConversation([]);
    notify("Đã tạo cuộc trò chuyện demo mới với cùng phạm vi nguồn");
  };

  return <div className="page-stack"><PageHeader eyebrow="Kho riêng của bạn" title="Tài liệu cá nhân & Chatbot" description="Chọn Personal PDF đã READY để hỏi đáp theo nguồn. Chatbot không truy xuất học liệu Teacher." actions={<label className="button primary"><Upload size={17} /> Upload PDF<input className="sr-only" type="file" accept=".pdf,application/pdf" onChange={onFile} /></label>} /><div className="tab-bar"><button type="button" className={tab === "documents" ? "active" : ""} onClick={(): void => setTab("documents")}>Tài liệu <span>{personalDocuments.length}</span></button><button type="button" className={tab === "chat" ? "active" : ""} onClick={(): void => setTab("chat")}>Hỏi đáp theo nguồn</button></div>
    {tab === "documents" ? <div className="personal-layout"><section className="document-list">{personalDocuments.map((document: typeof personalDocuments[number]): ReactElement => { const canSelect = document.status === "READY"; const isSelected = selected.includes(document.id); return <article className={`document-card ${isSelected ? "selected" : ""}`} key={document.id}><input type="checkbox" aria-label={`Chọn ${document.title}`} checked={isSelected} disabled={!canSelect} onChange={(): void => toggleDocument(document.id)} /><span className="file-icon pdf"><FileText size={21} /></span><div className="document-main"><strong>{document.title}</strong><small>PDF cá nhân · chỉ owner được dùng</small></div><StatusBadge status={document.status} /></article>; })}</section><aside className="selection-card"><ShieldCheck size={25} /><h3>{selected.length} nguồn đã chọn</h3><p>Java xác minh ownership/version trước mỗi câu hỏi. Chỉ tài liệu READY được đưa vào conversation.</p><button className="button light wide" type="button" disabled={selected.length === 0} onClick={(): void => setTab("chat")}>Bắt đầu hỏi đáp <ChevronRight size={16} /></button></aside></div> : <div className="rag-workspace"><aside className="rag-sources"><div className="source-title"><div><span className="eyebrow">Evidence scope</span><strong>{selected.length} tài liệu đang dùng</strong></div><button type="button" className="icon-button" onClick={(): void => setTab("documents")} aria-label="Đổi nguồn"><RefreshCw size={16} /></button></div><div className="scope-security"><LockKeyhole size={15} /><span>Chỉ tài liệu của bạn; khóa theo version</span></div>{personalDocuments.filter((document: typeof personalDocuments[number]): boolean => selected.includes(document.id)).map((document: typeof personalDocuments[number]): ReactElement => <div className="source-row" key={document.id}><FileText size={17} /><span><b>{document.title}</b><small>READY · PDF</small></span><CheckCircle2 size={15} /></div>)}<button type="button" className="button ghost wide" onClick={(): void => setTab("documents")}><Link2 size={16} /> Thay đổi nguồn</button><div className="history-block"><span className="eyebrow">Hội thoại</span><button type="button" className="history-item active"><MessageSquareText size={15} /> Chuẩn hóa dữ liệu</button><button type="button" className="history-item"><History size={15} /> SQL nâng cao</button></div></aside><section className="rag-chat"><div className="rag-chat-header"><div><span className="eyebrow">Personal RAG</span><h2>Hỏi đáp theo nguồn</h2></div><button className="button secondary compact" type="button" onClick={startNewConversation}><Plus size={16} /> Cuộc trò chuyện mới</button></div><div className="chat-privacy"><ShieldCheck size={15} /> Java xác minh 2 nguồn · không dùng Teacher Documents · trace: demo-rag-018</div><div className="rag-thread">{conversation.length === 0 && <div className="rag-welcome"><span><Bot /></span><h2>Bạn muốn tìm hiểu điều gì?</h2><p>Câu trả lời chỉ sử dụng tài liệu đã chọn và luôn chỉ ra trang nguồn.</p><div className="prompt-grid"><button type="button" onClick={(): void => setQuestion("Tóm tắt các dạng chuẩn chính")}>Tóm tắt các dạng chuẩn</button><button type="button" onClick={(): void => setQuestion("So sánh 2NF và 3NF")}>So sánh 2NF và 3NF</button><button type="button" onClick={(): void => setQuestion("Cho ví dụ về phụ thuộc bắc cầu")}>Ví dụ phụ thuộc bắc cầu</button></div></div>}{conversation.map((turn: ChatTurn): ReactElement => <ChatBubble key={turn.id} turn={turn} expanded />)}{retrieving && <div className="retrieval-state"><LoaderCircle className="spin" size={19} /><span><b>Đang truy xuất bằng chứng</b><small>Đối chiếu claim với các trang được phép…</small></span></div>}</div><form className="rag-composer" onSubmit={ask}><textarea value={question} onKeyDown={composerKeyDown} onChange={(event: ChangeEvent<HTMLTextAreaElement>): void => setQuestion(event.target.value)} placeholder="Hỏi nội dung trong các tài liệu đã chọn…" aria-label="Câu hỏi cho chatbot" /><div><span>Enter để gửi · Shift + Enter xuống dòng</span><button className="send-button" type="submit" disabled={selected.length === 0 || retrieving} aria-label="Gửi câu hỏi"><Send size={18} /></button></div></form><div className="rag-footer-actions"><span>AI có thể trả `NO_EVIDENCE` khi nguồn không đủ.</span><button type="button" className="button secondary compact" onClick={(): void => notify("Java tạo Quiz GENERATING; AI draft phải qua REVIEW_REQUIRED")}><Sparkles size={16} /> Tạo Quiz từ nguồn này</button></div></section></div>}
  </div>;
}

/** Render a user or assistant message with claim-level citation details. */
function ChatBubble({ turn, expanded = false }: { turn: ChatTurn; expanded?: boolean }): ReactElement {
  return <div className={`chat-message ${turn.role} ${expanded ? "expanded-bubble" : ""} ${turn.status === "NO_EVIDENCE" ? "no-evidence" : ""}`}><b>{turn.role === "user" ? "Bạn" : turn.status === "NO_EVIDENCE" ? "Không đủ bằng chứng" : "AI Tutor"}</b><p>{turn.text}</p>{turn.citation && <details className="citation-detail"><summary><FileText size={14} /> {turn.citation.documentName} · {turn.citation.location}<ChevronDown size={14} /></summary><blockquote>{turn.citation.excerpt}</blockquote><small>Citation này được gắn với claim phía trên.</small></details>}</div>;
}

/** Render Quiz review fixtures. */
function ReviewPage({ notify }: { notify: (message: string) => void }): ReactElement {
  return <div className="page-stack"><PageHeader eyebrow="Java sở hữu Quiz lifecycle" title="Ôn tập & Quiz" description="AI chỉ sinh bản nháp MCQ_SINGLE có nguồn; bạn phải duyệt trước khi làm." actions={<button className="button primary" type="button" onClick={(): void => notify("Hãy tạo Quiz từ conversation Personal RAG")}><Plus size={17} /> Tạo Quiz</button>} /><div className="quiz-summary"><Metric icon={ClipboardCheck} label="Chờ duyệt" value="1" trend="Kiểm tra nguồn" /><Metric icon={CheckCircle2} label="Sẵn sàng" value="1" trend="Có thể bắt đầu" /><Metric icon={BarChart3} label="Điểm gần nhất" value="87,5" trend="Java đã chấm" /></div><div className="quiz-grid">{quizzes.map((quiz: typeof quizzes[number]): ReactElement => <article className="quiz-card" key={quiz.id}><div><span className="file-icon pdf"><ClipboardCheck size={20} /></span><StatusBadge status={quiz.status} /></div><h2>{quiz.title}</h2><p>{quiz.questionCount} câu · {quiz.sourceNames.join(", ")}</p><div className="quiz-actions">{quiz.status === "REVIEW_REQUIRED" ? <><button className="button secondary" type="button" onClick={(): void => notify("Đã mở citation để duyệt")}>Xem nguồn</button><button className="button primary" type="button" onClick={(): void => notify("Java chuyển Quiz sang READY")}>Chấp nhận</button></> : <button className="button primary wide" type="button" onClick={(): void => notify("Đáp án sẽ được gửi về Java để chấm")}>{quiz.status === "READY" ? "Bắt đầu" : "Xem kết quả"}</button>}</div></article>)}</div></div>;
}

/** Render Student-owned weekly plan. */
function PlanPage({ notify }: { notify: (message: string) => void }): ReactElement {
  return <div className="page-stack"><PageHeader eyebrow="Bạn chủ động quyết định" title="Kế hoạch học & Lịch tuần" description="AI không tự điều phối kế hoạch. Các task có thể liên kết một Course Offering bạn được phép truy cập." actions={<button className="button primary" type="button" onClick={(): void => notify("Đã mở form thêm lịch demo")}><Plus size={17} /> Thêm lịch</button>} /><div className="week-toolbar"><button className="icon-button" type="button" aria-label="Tuần trước"><ChevronLeft /></button><div><strong>21 – 27 tháng 9</strong><small>4 hoạt động đã lên kế hoạch</small></div><button className="icon-button" type="button" aria-label="Tuần sau"><ChevronRight /></button></div><div className="calendar-board"><div className="calendar-days"><span>Giờ</span>{["T2 21", "T3 22", "T4 23", "T5 24", "T6 25", "T7 26", "CN 27"].map((day: string): ReactElement => <strong key={day}>{day}</strong>)}</div>{["08:00", "14:00", "19:00"].map((time: string): ReactElement => <div className="calendar-row" key={time}><time>{time}</time>{Array.from({ length: 7 }, (_value: unknown, index: number): ReactElement => { const task = weeklyTasks.find((item: typeof weeklyTasks[number]): boolean => item.time === time && item.day === `T${index + 2}`); return task ? <button className={`calendar-event ${task.tone}`} type="button" key={index}><b>{task.title}</b><small>{task.time}</small></button> : <button className="calendar-slot" type="button" key={index} aria-label={`Thêm lịch ${time}`} />; })}</div>)}</div></div>;
}

/** Render Teacher self-service Course Offering, enrollment and publication screens. */
function TeacherPage({ section, notify }: { section: string; notify: (message: string) => void }): ReactElement {
  const [showCreate, setShowCreate] = useState<boolean>(false);
  const onFile = (event: ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0];
    if (!file) return;
    const allowed = file.name.toLowerCase().endsWith(".pdf") || file.name.toLowerCase().endsWith(".pptx");
    notify(allowed ? `${file.name} sẵn sàng gửi tới Java` : "Teacher chỉ upload PDF hoặc PPTX");
    event.target.value = "";
  };
  const headings: Record<string, [string, string, string]> = {
    dashboard: ["Không gian giảng viên", "Tổng quan giảng dạy", "Tự quản lý lớp học phần và học liệu của bạn."],
    "course-offerings": ["Semester → Course Offering", "Lớp học phần của tôi", "Tạo lớp từ Môn học + Học kỳ và quản lý join code."],
    enrollments: ["Course Enrollment", "Yêu cầu tham gia", "Teacher của lớp duyệt hoặc từ chối yêu cầu PENDING."],
    documents: ["Teacher Library", "Kho tài liệu giảng viên", "Upload PDF/PPTX một lần và công bố tới lớp của bạn."],
    publications: ["Phân phối học liệu", "Tài liệu đã công bố", "Theo dõi và thu hồi publication theo Course Offering."],
  };
  const heading = headings[section] ?? headings.dashboard;
  const action = section === "course-offerings" ? <button className="button primary" type="button" onClick={(): void => setShowCreate((value: boolean): boolean => !value)}><Plus size={17} /> Tạo lớp học phần</button> : (section === "documents" || section === "publications") ? <label className="button primary"><Upload size={17} /> Upload PDF/PPTX<input className="sr-only" type="file" accept=".pdf,.pptx,application/pdf,application/vnd.openxmlformats-officedocument.presentationml.presentation" onChange={onFile} /></label> : undefined;
  return <div className="page-stack"><PageHeader eyebrow={heading[0]} title={heading[1]} description={heading[2]} actions={action} />
    {section === "dashboard" && <><section className="stats-grid"><Metric icon={GraduationCap} label="Lớp đang mở" value="3" trend="Teacher sở hữu" /><Metric icon={UserCheck} label="Chờ duyệt" value="8" trend="Enrollment PENDING" /><Metric icon={Library} label="Tài liệu" value="18" trend="12 đã công bố" /><Metric icon={Activity} label="Đang xử lý" value="1" trend="PPTX rendering" /></section><div className="card"><CardHeading title="Hoạt động gần đây" /><ActivityList /></div></>}
    {section === "course-offerings" && <><div className="ownership-banner"><ShieldCheck /><div><strong>Teacher tự tạo và sở hữu lớp học phần</strong><p>Admin quản lý Subject/Semester và giám sát; không phân công từng lớp.</p></div></div>{showCreate && <form className="create-offering-card" onSubmit={(event: FormEvent<HTMLFormElement>): void => { event.preventDefault(); notify("Đã tạo Course Offering demo và sinh join code DB7K2A"); setShowCreate(false); }}><label>Môn học<select><option>Cơ sở dữ liệu</option><option>Trí tuệ nhân tạo</option></select></label><label>Học kỳ<select><option>HK1 · 2026–2027</option></select></label><label>Tên lớp<input defaultValue="CSDL · Nhóm 01" /></label><button className="button primary" type="submit">Tạo lớp & sinh mã</button></form>}<div className="class-grid">{["DBI-01 · Cơ sở dữ liệu", "AI-02 · Trí tuệ nhân tạo", "WEB-03 · Lập trình Web"].map((name: string, index: number): ReactElement => <article className="class-card compact-card" key={name}><div className={`class-cover cover-${index + 1}`}><span>HK1 · 2026–2027</span><GraduationCap /></div><div className="class-body"><span className="status ready">OPEN</span><h2>{name}</h2><p>{38 + index * 4} Student approved · {index + 1} pending</p><div className="join-code-row"><span><small>Join code</small><b>{["DB7K2A", "AI7X92", "WEB6Q1"][index]}</b></span><button className="icon-button" type="button" onClick={(): void => notify("Đã sao chép join code demo")} aria-label="Sao chép mã"><Copy size={16} /></button><button className="icon-button" type="button" onClick={(): void => notify("Java sẽ vô hiệu mã cũ trước khi sinh mã mới")} aria-label="Tạo lại mã"><RefreshCw size={16} /></button></div><button className="button secondary wide" type="button" onClick={(): void => notify("Đã mở cấu hình lớp owner-only")}>Quản lý lớp</button></div></article>)}</div></>}
    {section === "enrollments" && <EnrollmentRequests notify={notify} />}
    {(section === "documents" || section === "publications") && <TeacherDocuments section={section} notify={notify} />}
  </div>;
}

/** Render pending Course Enrollment requests for Teacher-owned offerings. */
function EnrollmentRequests({ notify }: { notify: (message: string) => void }): ReactElement {
  const requests = [["Nguyễn Thu Hà", "B21DCCN024", "DBI-01", "12 phút trước"], ["Trần Đức Long", "B21DCCN081", "AI-02", "1 giờ trước"], ["Lê Minh Tú", "B22DCCN011", "DBI-01", "Hôm qua"]];
  return <div className="table-card"><div className="table-head enrollment-table"><span>Student</span><span>Lớp học phần</span><span>Trạng thái</span><span>Thời gian</span><span>Quyết định</span></div>{requests.map((request: string[]): ReactElement => <div className="table-row enrollment-table" key={request[1]}><div className="file-cell"><span className="avatar small-avatar">{request[0].slice(0, 1)}</span><span><strong>{request[0]}</strong><small>{request[1]}</small></span></div><span>{request[2]}</span><span className="status processing">PENDING</span><span>{request[3]}</span><div className="row-actions"><button className="button secondary compact" type="button" onClick={(): void => notify(`Đã từ chối ${request[0]} trong fixture`)}><XCircle size={15} /> Từ chối</button><button className="button primary compact" type="button" onClick={(): void => notify(`Đã duyệt ${request[0]} trong fixture`)}><UserCheck size={15} /> Duyệt</button></div></div>)}</div>;
}

/** Render Teacher Library or publication table. */
function TeacherDocuments({ section, notify }: { section: string; notify: (message: string) => void }): ReactElement {
  return <><div className="policy-banner"><ShieldCheck /><div><strong>Phạm vi owner-only</strong><p>Chỉ public vào Course Offering do bạn sở hữu. PDF không gửi sang AI; PPTX được render/index theo slide.</p></div></div><div className="table-card"><div className="table-head teacher-table"><span>Tài liệu</span><span>Loại</span><span>Trạng thái</span><span>Course Offering</span><span>Thao tác</span></div>{materials.map((item: typeof materials[number]): ReactElement => <div className="table-row teacher-table" key={item.id}><div className="file-cell"><span className={`file-icon ${item.type.toLowerCase()}`}><FileText /></span><span><strong>{item.title}</strong><small>Teacher Library · hôm nay</small></span></div><span>{item.type}</span><StatusBadge status={item.status} /><span>{section === "publications" ? "DBI-01" : item.id === "doc-slide-2" ? "Chưa công bố" : "DBI-01, AI-02"}</span><button className="button secondary compact" type="button" onClick={(): void => notify(section === "publications" ? "Publication demo đã được thu hồi" : "Java kiểm document owner + offering owner trước khi public")}>{section === "publications" ? "Thu hồi" : "Công bố"}</button></div>)}</div></>;
}

/** Render Admin catalog and Course Offering monitoring without assignment workflows. */
function AdminPage({ section, notify }: { section: string; notify: (message: string) => void }): ReactElement {
  const headings: Record<string, [string, string, string]> = {
    dashboard: ["Vận hành nền tảng", "Tổng quan quản trị", "Giám sát danh mục, tài khoản và Course Offering mà không xem nội dung riêng tư."],
    users: ["Identity & RBAC", "Người dùng & Vai trò", "Quản lý trạng thái và role; đăng ký công khai chỉ tạo Student."],
    catalog: ["Danh mục đào tạo", "Môn học & Học kỳ", "Admin duy trì Subject/Semester để Teacher tự tạo lớp."],
    "course-offerings": ["Operational monitoring", "Giám sát lớp học phần", "Lọc theo Teacher, Subject, Semester và khóa/archive khi cần."],
    feedback: ["Chất lượng", "Phản hồi người dùng", "Theo dõi feedback mà không đọc chat hoặc tài liệu cá nhân."],
    logs: ["Traceability", "Nhật ký hệ thống", "Audit metadata an toàn theo actor, action và target."],
    settings: ["Runtime policy", "Cài đặt hệ thống", "Cấu hình an toàn; secret không được trả về UI."],
  };
  const heading = headings[section] ?? headings.dashboard;
  return <div className="page-stack"><PageHeader eyebrow={heading[0]} title={heading[1]} description={heading[2]} actions={(section === "users" || section === "catalog") ? <button className="button primary" type="button" onClick={(): void => notify("Đã mở form quản trị demo")}><Plus size={17} /> Thêm mới</button> : undefined} />
    {section === "dashboard" && <><section className="stats-grid"><Metric icon={Users} label="Người dùng active" value="1.284" trend="Student/Teacher/Admin" /><Metric icon={BookOpen} label="Môn học" value="18" trend="12 đang active" /><Metric icon={GraduationCap} label="Lớp học phần" value="31" trend="Teacher tự tạo" /><Metric icon={Activity} label="Sự kiện 24h" value="2.941" trend="Metadata only" /></section><section className="dashboard-grid"><div className="card panel-span-2"><CardHeading title="Course Offering theo trạng thái" /><div className="admin-chart"><ProgressItem label="OPEN" value={68} /><ProgressItem label="LOCKED" value={8} /><ProgressItem label="ARCHIVED" value={24} /></div></div><div className="card privacy-card"><ShieldCheck /><h3>Privacy boundary</h3><p>Admin không mặc định đọc Personal Document, chat, Note hoặc đáp án Quiz cá nhân.</p></div></section></>}
    {section === "users" && <AdminTable rows={[["Nguyễn Minh Khang", "STUDENT", "ACTIVE"], ["Nguyễn Minh Anh", "TEACHER", "ACTIVE"], ["Trần Hoài Nam", "ADMIN", "ACTIVE"]]} notify={notify} />}
    {section === "catalog" && <div className="catalog-grid"><section className="card"><CardHeading title="Môn học" action={<button className="button secondary compact" type="button" onClick={(): void => notify("Thêm Subject demo")}>Thêm môn</button>} />{[["INT2211", "Cơ sở dữ liệu"], ["INT3401", "Trí tuệ nhân tạo"], ["INT3306", "Lập trình Web"]].map((row: string[]): ReactElement => <div className="catalog-row" key={row[0]}><span><b>{row[1]}</b><small>{row[0]}</small></span><span className="status ready">ACTIVE</span></div>)}</section><section className="card"><CardHeading title="Học kỳ" action={<button className="button secondary compact" type="button" onClick={(): void => notify("Thêm Semester demo")}>Thêm kỳ</button>} />{[["HK1 · 2026–2027", "OPEN"], ["HK2 · 2025–2026", "ARCHIVED"]].map((row: string[]): ReactElement => <div className="catalog-row" key={row[0]}><span><b>{row[0]}</b><small>Quản lý thời gian mở lớp</small></span><span className={`status ${row[1] === "OPEN" ? "ready" : "review"}`}>{row[1]}</span></div>)}</section></div>}
    {section === "course-offerings" && <OfferingMonitor notify={notify} />}
    {section === "feedback" && <SimpleState icon={MessageSquareText} title="12 phản hồi đang mở" text="Feedback chỉ chứa nội dung người dùng chủ động gửi, không tự đính kèm chat hay tài liệu." />}
    {section === "logs" && <AdminTable rows={[["COURSE_OFFERING_CREATED", "teacher-02", "SUCCESS"], ["ENROLLMENT_APPROVED", "teacher-02", "SUCCESS"], ["PUBLICATION_REVOKED", "teacher-08", "SUCCESS"]]} notify={notify} />}
    {section === "settings" && <SimpleState icon={Settings} title="Cấu hình runtime" text="Chỉ hiển thị tên cấu hình và trạng thái. API key/service credential là write-only và không xuất hiện ở client." />}
  </div>;
}

/** Render Admin Course Offering monitoring table. */
function OfferingMonitor({ notify }: { notify: (message: string) => void }): ReactElement {
  const rows = [["DBI-01", "Cơ sở dữ liệu", "Nguyễn Minh Anh", "HK1 · 2026–2027", "OPEN"], ["AI-02", "Trí tuệ nhân tạo", "Lê Hoàng", "HK1 · 2026–2027", "OPEN"], ["WEB-23", "Lập trình Web", "Phạm Huy", "HK2 · 2025–2026", "ARCHIVED"]];
  return <><div className="ownership-banner admin-boundary"><ShieldCheck /><div><strong>Admin giám sát, không phân công</strong><p>Teacher hợp lệ tự tạo Course Offering và tự duyệt Enrollment.</p></div></div><div className="table-card"><div className="table-head offering-table"><span>Lớp học phần</span><span>Teacher</span><span>Học kỳ</span><span>Trạng thái</span><span>Vận hành</span></div>{rows.map((row: string[]): ReactElement => <div className="table-row offering-table" key={row[0]}><span><strong>{row[0]} · {row[1]}</strong></span><span>{row[2]}</span><span>{row[3]}</span><span className={`status ${row[4] === "OPEN" ? "ready" : "review"}`}>{row[4]}</span><div className="row-actions"><button className="button secondary compact" type="button" onClick={(): void => notify(`Yêu cầu reason trước khi khóa ${row[0]}`)}><LockKeyhole size={14} /> Khóa</button><button className="button ghost compact" type="button" onClick={(): void => notify(`Archive ${row[0]} không xóa lịch sử`)}><Archive size={14} /> Archive</button></div></div>)}</div></>;
}

/** Render a generic four-column Admin table. */
function AdminTable({ rows, notify }: { rows: string[][]; notify: (message: string) => void }): ReactElement {
  return <div className="table-card"><div className="table-head admin-table"><span>Đối tượng / Sự kiện</span><span>Vai trò / Actor</span><span>Trạng thái</span><span>Thao tác</span></div>{rows.map((row: string[]): ReactElement => <div className="table-row admin-table" key={`${row[0]}-${row[1]}`}><strong>{row[0]}</strong><span>{row[1]}</span><span className="status ready">{row[2]}</span><button className="button ghost compact" type="button" onClick={(): void => notify("Đã mở metadata an toàn")}>Chi tiết</button></div>)}</div>;
}

/** Render a simple empty/informational state. */
function SimpleState({ icon: Icon, title, text }: { icon: LucideIcon; title: string; text: string }): ReactElement {
  return <div className="empty-state card"><span><Icon /></span><h1>{title}</h1><p>{text}</p></div>;
}

/** Render a dashboard metric card. */
function Metric({ icon: Icon, label, value, trend }: { icon: LucideIcon; label: string; value: string; trend: string }): ReactElement {
  return <article className="metric-card"><span><Icon size={20} /></span><div><small>{label}</small><strong>{value}</strong><p>{trend}</p></div></article>;
}

/** Render a card heading with an optional action. */
function CardHeading({ title, action }: { title: string; action?: ReactNode }): ReactElement {
  return <div className="card-heading"><h2>{title}</h2>{action}</div>;
}

/** Render a Student Course Offering progress summary. */
function SubjectCard({ code, name, progress, color }: { code: string; name: string; progress: number; color: string }): ReactElement {
  return <article className="subject-card"><span className={`subject-dot ${color}`} /><div><small>{code}</small><strong>{name}</strong><div className="progress-line"><i style={{ width: `${progress}%` }} /></div><p>{progress}% nội dung đã xem</p></div></article>;
}

/** Render a normalized processing or Quiz state. */
function StatusBadge({ status }: { status: ProcessingStatus | QuizStatus }): ReactElement {
  const labels: Record<string, string> = { READY: "Sẵn sàng", PROCESSING: "Đang xử lý", PENDING_PROCESSING: "Đang chờ", FAILED: "Thất bại", DELETING: "Đang xóa", GENERATING: "Đang sinh", REVIEW_REQUIRED: "Chờ duyệt", REJECTED: "Đã từ chối", GENERATION_FAILED: "Sinh lỗi", ARCHIVED: "Đã hoàn thành" };
  const tone = status === "READY" ? "ready" : ["PROCESSING", "PENDING_PROCESSING", "GENERATING"].includes(status) ? "processing" : ["FAILED", "GENERATION_FAILED", "REJECTED"].includes(status) ? "failed" : "review";
  return <span className={`status ${tone}`}>{labels[status] ?? status}</span>;
}

/** Render recent Teacher activity fixtures. */
function ActivityList(): ReactElement {
  const items = [["Đã duyệt Enrollment B21DCCN024", "10 phút trước"], ["PPTX Thiết kế ERD đã xử lý xong", "2 giờ trước"], ["Đã công bố tài liệu vào DBI-01", "Hôm qua"]];
  return <div className="activity-list">{items.map((item: string[]): ReactElement => <div key={item[0]}><span><CheckCircle2 size={17} /></span><p><b>{item[0]}</b><small>{item[1]}</small></p></div>)}</div>;
}

/** Render a labeled progress bar. */
function ProgressItem({ label, value }: { label: string; value: number }): ReactElement {
  return <div className="progress-item"><span><b>{label}</b><small>{value}%</small></span><div className="progress-line"><i style={{ width: `${value}%` }} /></div></div>;
}

/** Render one server-computed Daily Goal metric. */
function DailyGoalRow({ goal }: { goal: DailyGoalMetric }): ReactElement {
  return <div className="daily-goal-row"><span><b>{goal.label}</b><small>{goal.actual} / {goal.target}</small></span><div className="progress-line"><i style={{ width: `${goal.percent}%` }} /></div></div>;
}

/** Render the production placeholder when demo fixtures are disabled. */
function BackendRequired(): ReactElement {
  return <div className="empty-state"><span><ShieldCheck /></span><h1>Đang chờ Java Backend</h1><p>Production không dùng fixture. Thiết lập Java API và phiên đăng nhập để tải dữ liệu thật.</p><Link className="button secondary" href="/login">Về đăng nhập</Link></div>;
}
