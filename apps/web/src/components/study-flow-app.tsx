"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import {
  Activity,
  BarChart3,
  Bell,
  BookOpen,
  Bot,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  Download,
  FileDown,
  FileText,
  GraduationCap,
  LayoutDashboard,
  Library,
  ListChecks,
  LogOut,
  Menu,
  MessageSquareText,
  NotebookPen,
  PanelLeftClose,
  Play,
  Plus,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Sparkles,
  Upload,
  UserCog,
  Users,
  type LucideIcon,
} from "lucide-react";
import { isDemoMode, logout } from "@/lib/api-client";
import { materials, personalDocuments, quizzes, weeklyTasks } from "@/lib/demo-data";
import type { ProcessingStatus, QuizStatus } from "@/types/api";
import { useSession } from "@/components/auth-context";

type Role = "student" | "teacher" | "admin";

interface StudyFlowAppProps {
  role: Role;
  section: string;
}

interface NavItem {
  key: string;
  label: string;
  icon: LucideIcon;
}

const navByRole: Record<Role, NavItem[]> = {
  student: [
    { key: "dashboard", label: "Tổng quan", icon: LayoutDashboard },
    { key: "classes", label: "Lớp & Môn học", icon: GraduationCap },
    { key: "materials", label: "Học liệu", icon: Library },
    { key: "personal-documents", label: "Tài liệu cá nhân", icon: FileText },
    { key: "review", label: "Ôn tập & Quiz", icon: ClipboardCheck },
    { key: "progress", label: "Tiến độ", icon: BarChart3 },
    { key: "plan", label: "Kế hoạch & Lịch", icon: CalendarDays },
  ],
  teacher: [
    { key: "dashboard", label: "Tổng quan", icon: LayoutDashboard },
    { key: "assignments", label: "Lớp phụ trách", icon: Users },
    { key: "documents", label: "Kho tài liệu", icon: Library },
    { key: "publications", label: "Đã công bố", icon: FileDown },
  ],
  admin: [
    { key: "dashboard", label: "Tổng quan", icon: LayoutDashboard },
    { key: "users", label: "Người dùng", icon: UserCog },
    { key: "academics", label: "Lớp & Môn học", icon: GraduationCap },
    { key: "feedback", label: "Phản hồi", icon: MessageSquareText },
    { key: "logs", label: "Nhật ký hệ thống", icon: Activity },
    { key: "settings", label: "Cài đặt", icon: Settings },
  ],
};

const roleMeta: Record<Role, { label: string; user: string; id: string }> = {
  student: { label: "Sinh viên", user: "Nguyễn Minh Khang", id: "B21DCCN001" },
  teacher: { label: "Giảng viên", user: "TS. Nguyễn Minh Anh", id: "Khoa CNTT" },
  admin: { label: "Quản trị viên", user: "Trần Hoài Nam", id: "System Admin" },
};

/**
 * Renders the role workspace against Java-facing UI contracts.
 * @param role Active authenticated role represented by the route.
 * @param section Active navigation section; unknown values fall back to the dashboard.
 * @returns Responsive StudyFlow application shell and selected workspace.
 */
export function StudyFlowApp({ role, section }: StudyFlowAppProps) {
  const router = useRouter();
  const session = useSession();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const demoMode = isDemoMode();
  const navItems = navByRole[role];
  const active = navItems.some((item) => item.key === section) || section === "viewer" ? section : "dashboard";
  const title = navItems.find((item) => item.key === active)?.label ?? (active === "viewer" ? "Slide Viewer" : "Tổng quan");

  const notify = (message: string): void => {
    setToast(message);
    window.setTimeout(() => setToast(null), 2600);
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
          <Image src="/branding/ptit-logo.svg" width={33} height={40} alt="PTIT" className="brand-logo" priority />
          <button className="icon-button sidebar-close" onClick={() => setMobileNavOpen(false)} aria-label="Đóng menu">
            <PanelLeftClose size={20} />
          </button>
        </div>
        <div className="product-lockup">
          <span className="product-mark">SF</span>
          <div><strong>StudyFlow</strong><small>Không gian học tập số</small></div>
        </div>
        <span className="nav-caption">Không gian làm việc</span>
        <nav className="main-nav" aria-label={`Điều hướng ${roleMeta[role].label}`}>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.key} href={`/${role}/${item.key}`} className={active === item.key ? "active" : ""} onClick={() => setMobileNavOpen(false)}>
                <Icon size={19} /><span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="sidebar-bottom">
          <div className="ai-status"><span className="pulse-dot" /><div><strong>AI Service</strong><small>Contract sẵn sàng</small></div></div>
          <div className="profile-mini">
            <span className="avatar">{session.user.displayName.slice(0, 1)}</span>
            <span><strong>{session.user.displayName}</strong><small>{demoMode ? roleMeta[role].id : session.user.email}</small></span>
            <button className="profile-logout" type="button" onClick={endSession} disabled={loggingOut} aria-label="Đăng xuất">
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </aside>

      {mobileNavOpen && <button className="nav-backdrop" aria-label="Đóng menu" onClick={() => setMobileNavOpen(false)} />}

      <div className="app-main">
        <header className="topbar">
          <div className="topbar-title">
            <button className="icon-button mobile-menu" onClick={() => setMobileNavOpen(true)} aria-label="Mở menu"><Menu size={21} /></button>
            <div><span>StudyFlow / {roleMeta[role].label}</span><strong>{title}</strong></div>
          </div>
          <div className="top-actions">
            {demoMode && <span className="demo-badge"><Sparkles size={14} /> Dữ liệu demo</span>}
            {demoMode && <label className="role-switcher">
              <span className="sr-only">Chuyển vai trò demo</span>
              <select value={role} onChange={(event) => { router.push(`/${event.target.value}/dashboard`); }}>
                <option value="student">Sinh viên</option><option value="teacher">Giảng viên</option><option value="admin">Admin</option>
              </select>
            </label>}
            <button className="icon-button" aria-label="Thông báo"><Bell size={20} /><i /></button>
          </div>
        </header>

        <main className="workspace">
          {!demoMode ? <BackendRequired /> : <Workspace role={role} section={active} notify={notify} />}
        </main>
      </div>
      {toast && <div className="toast"><CheckCircle2 size={18} />{toast}</div>}
    </div>
  );
}

function Workspace({ role, section, notify }: { role: Role; section: string; notify: (message: string) => void }) {
  if (role === "student") {
    if (section === "classes") return <ClassesPage />;
    if (section === "materials") return <MaterialsPage notify={notify} />;
    if (section === "viewer") return <ViewerPage notify={notify} />;
    if (section === "personal-documents") return <PersonalDocumentsPage notify={notify} />;
    if (section === "review") return <ReviewPage notify={notify} />;
    if (section === "progress") return <ProgressPage />;
    if (section === "plan") return <PlanPage notify={notify} />;
    return <StudentDashboard />;
  }
  if (role === "teacher") return <TeacherPage section={section} notify={notify} />;
  return <AdminPage section={section} notify={notify} />;
}

function PageHeader({ eyebrow, title, description, actions }: { eyebrow: string; title: string; description: string; actions?: React.ReactNode }) {
  return <div className="page-header"><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{description}</p></div>{actions && <div className="page-actions">{actions}</div>}</div>;
}

function StudentDashboard() {
  return <div className="page-stack">
    <PageHeader eyebrow="Học kỳ 1 · 2026–2027" title="Chào buổi sáng, Minh Khang" description="Tiếp tục đúng nơi bạn dừng lại và hoàn thành mục tiêu tuần này." actions={<><Link className="button secondary" href="/student/plan"><CalendarDays size={17} /> Xem lịch</Link><Link className="button primary" href="/student/classes"><Play size={17} /> Tiếp tục học</Link></>} />
    <section className="hero-card">
      <div className="hero-copy"><span className="hero-kicker"><Sparkles size={15} /> Luồng học chính</span><h2>Từ slide bài giảng đến câu trả lời có nguồn</h2><p>Chọn môn, mở PPTX, ghi chú và hỏi AI Tutor ngay tại slide đang xem.</p><Link href="/student/materials" className="button light">Mở học liệu <ChevronRight size={17} /></Link></div>
      <div className="flow-steps">{["Chọn môn học", "Mở slide", "Ghi chú", "Hỏi AI"].map((label, index) => <div key={label}><b>0{index + 1}</b><span>{label}</span></div>)}</div>
    </section>
    <section className="stats-grid">
      <Metric icon={BookOpen} label="Slide đã xem" value="38 / 62" trend="+8 tuần này" />
      <Metric icon={Clock3} label="Thời gian học" value="6h 40m" trend="Mục tiêu 8h" />
      <Metric icon={ClipboardCheck} label="Quiz hoàn thành" value="7" trend="Điểm TB 84%" />
      <Metric icon={ListChecks} label="Task tuần" value="9 / 12" trend="75% hoàn thành" />
    </section>
    <section className="dashboard-grid">
      <div className="card panel-span-2"><CardHeading title="Tiếp tục học" action={<Link href="/student/materials">Xem tất cả</Link>} /><div className="course-card"><div className="course-icon"><BookOpen /></div><div className="course-main"><span>Cơ sở dữ liệu</span><h3>Thiết kế cơ sở dữ liệu quan hệ</h3><div className="progress-line"><i style={{ width: "64%" }} /></div><small>Slide 18/28 · cập nhật 2 giờ trước</small></div><Link className="round-action" href="/student/viewer" aria-label="Mở slide"><ChevronRight /></Link></div></div>
      <div className="card"><CardHeading title="Lịch hôm nay" action={<Link href="/student/plan">Chi tiết</Link>} /><div className="timeline"><div><time>08:00</time><span><b>Xem slide Chuẩn hóa</b><small>Cơ sở dữ liệu · 45 phút</small></span></div><div><time>19:00</time><span><b>Làm Quiz SQL</b><small>12 câu · 25 phút</small></span></div></div></div>
      <div className="card panel-span-2"><CardHeading title="Môn học của bạn" /><div className="subject-grid"><SubjectCard code="INT2211" name="Cơ sở dữ liệu" progress={64} color="red" /><SubjectCard code="INT3401" name="Trí tuệ nhân tạo" progress={42} color="gold" /><SubjectCard code="INT3306" name="Lập trình Web" progress={78} color="blue" /></div></div>
      <div className="card ai-card"><Bot size={24} /><span className="eyebrow light">AI Tutor</span><h3>Cần giải thích nhanh?</h3><p>Hỏi trên tài liệu cá nhân hoặc ngay trong Slide Viewer.</p><Link href="/student/personal-documents" className="button light wide">Mở chatbot</Link></div>
    </section>
  </div>;
}

function ClassesPage() {
  return <div className="page-stack"><PageHeader eyebrow="Không gian học tập" title="Lớp học & Môn học" description="Chỉ hiển thị lớp và học liệu đang được công bố cho tài khoản của bạn." /><div className="filter-row"><div className="search-box"><Search size={17} /><input placeholder="Tìm lớp hoặc môn học" /></div><button className="chip active">Tất cả</button><button className="chip">Học kỳ 1</button></div><div className="class-grid">{["Cơ sở dữ liệu", "Trí tuệ nhân tạo", "Lập trình Web"].map((name, index) => <article className="class-card" key={name}><div className={`class-cover cover-${index + 1}`}><span>INT{2211 + index * 95}</span><GraduationCap /></div><div className="class-body"><span className="status ready">Đang học</span><h2>{name}</h2><p>KTPM-K21 · TS. Nguyễn Minh Anh</p><div className="meta-split"><span><Library size={15} /> {5 + index} học liệu</span><span>{64 - index * 11}%</span></div><div className="progress-line"><i style={{ width: `${64 - index * 11}%` }} /></div><Link className="button secondary wide" href="/student/materials">Mở môn học <ChevronRight size={16} /></Link></div></article>)}</div></div>;
}

function MaterialsPage({ notify }: { notify: (message: string) => void }) {
  return <div className="page-stack"><PageHeader eyebrow="KTPM-K21 · Cơ sở dữ liệu" title="Học liệu môn học" description="PPTX học trực tiếp trên web; PDF của giảng viên chỉ được tải xuống sau khi kiểm quyền." actions={<button className="button secondary" onClick={() => notify("Bộ lọc đã được làm mới")}><Search size={17} /> Tìm tài liệu</button>} /><div className="policy-banner"><ShieldCheck /><div><strong>Chính sách học liệu</strong><p>PPTX không cung cấp file gốc. PDF không có Viewer, Note hoặc AI Tutor.</p></div></div><div className="table-card"><div className="table-head"><span>Tài liệu</span><span>Giảng viên</span><span>Trạng thái</span><span>Tiến độ</span><span>Thao tác</span></div>{materials.map((item) => <div className="table-row" key={item.id}><div className="file-cell"><span className={`file-icon ${item.type.toLowerCase()}`}>{item.type === "PPTX" ? <BookOpen size={21} /> : <FileText size={21} />}</span><span><strong>{item.title}</strong><small>{item.type} · {item.subject}</small></span></div><span>{item.owner}</span><StatusBadge status={item.status} /><span>{item.progress ? `${item.progress}%` : "—"}</span><span>{item.type === "PPTX" ? <Link className="button primary compact" href="/student/viewer">Xem slide</Link> : <button className="button secondary compact" onClick={() => notify("Java sẽ kiểm quyền trước khi tải PDF")}><Download size={15} /> Tải PDF</button>}</span></div>)}</div></div>;
}

function ViewerPage({ notify }: { notify: (message: string) => void }) {
  const [slide, setSlide] = useState(3);
  const [note, setNote] = useState("Chuẩn hóa giúp giảm dư thừa và các bất thường khi cập nhật dữ liệu.");
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState(["Slide này giải thích ba loại bất thường: thêm, sửa và xóa dữ liệu. Nội dung được lấy từ slide 3."]);
  const ask = (event: FormEvent) => { event.preventDefault(); if (!question.trim()) return; setMessages((items) => [...items, `Demo: ${question} — câu trả lời cần Java xác minh scope trước khi gọi AI.`]); setQuestion(""); };
  return <div className="viewer-page"><div className="viewer-toolbar"><Link href="/student/materials" className="button ghost"><ChevronLeft size={17} /> Học liệu</Link><div><strong>Thiết kế cơ sở dữ liệu quan hệ</strong><small>Slide {slide}/12 · Cơ sở dữ liệu</small></div><span className="status ready">Đã xử lý</span></div><div className="viewer-layout"><aside className="slide-strip">{Array.from({ length: 8 }, (_, index) => index + 1).map((number) => <button key={number} className={slide === number ? "active" : ""} onClick={() => setSlide(number)}><span>{number}</span><div><small>PTIT · Database</small><b>{number === 3 ? "Bất thường dữ liệu" : `Nội dung slide ${number}`}</b></div></button>)}</aside><section className="slide-stage"><div className="slide-canvas"><div className="slide-brand">PTIT · CƠ SỞ DỮ LIỆU</div><span className="slide-number">0{slide}</span><h2>{slide === 3 ? "Các bất thường trong dữ liệu" : "Thiết kế cơ sở dữ liệu quan hệ"}</h2><p>Một mô hình dữ liệu tốt cần giảm dư thừa và duy trì tính nhất quán.</p><div className="slide-columns"><article><b>INSERT</b><span>Không thể thêm dữ liệu khi thiếu thông tin không liên quan.</span></article><article><b>UPDATE</b><span>Một thay đổi phải được cập nhật tại nhiều vị trí.</span></article><article><b>DELETE</b><span>Xóa một bản ghi có thể làm mất thông tin cần giữ.</span></article></div></div><div className="viewer-nav"><button className="icon-button" onClick={() => setSlide(Math.max(1, slide - 1))}><ChevronLeft /></button><div className="viewer-progress"><i style={{ width: `${(slide / 12) * 100}%` }} /></div><button className="icon-button" onClick={() => setSlide(Math.min(12, slide + 1))}><ChevronRight /></button></div><div className="note-panel"><div><NotebookPen size={18} /><strong>Ghi chú của bạn · Slide {slide}</strong></div><textarea value={note} onChange={(event) => setNote(event.target.value)} /><button className="button secondary compact" onClick={() => notify("Ghi chú demo đã được lưu")}>Lưu ghi chú</button></div></section><aside className="tutor-panel"><div className="tutor-heading"><span><Bot size={20} /></span><div><strong>AI Tutor</strong><small>Chỉ dùng slide được phép</small></div></div><div className="scope-pill"><ShieldCheck size={15} /> Slide hiện tại + nguồn liên quan</div><div className="chat-messages"><div className="chat-message assistant"><b>AI Tutor</b><p>Chào bạn! Hãy hỏi điều chưa rõ trong slide này.</p></div>{messages.map((message, index) => <div className="chat-message assistant" key={`${message}-${index}`}><b>AI Tutor</b><p>{message}</p><button className="citation-chip">Slide {slide} · Xem nguồn</button></div>)}</div><div className="suggestions"><button onClick={() => setQuestion("Cho ví dụ dễ hiểu")}>Cho ví dụ dễ hiểu</button><button onClick={() => setQuestion("Tóm tắt slide này")}>Tóm tắt slide</button></div><form className="chat-input" onSubmit={ask}><textarea value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Hỏi về slide này..." /><button type="submit" aria-label="Gửi câu hỏi"><Send size={18} /></button></form></aside></div></div>;
}

function PersonalDocumentsPage({ notify }: { notify: (message: string) => void }) {
  const [tab, setTab] = useState<"documents" | "chat">("documents");
  const [selected, setSelected] = useState(["personal-1", "personal-2"]);
  const [question, setQuestion] = useState("");
  const [conversation, setConversation] = useState<string[]>([]);
  const onFile = (event: ChangeEvent<HTMLInputElement>) => { const file = event.target.files?.[0]; if (!file) return; if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) notify("Personal Document chỉ chấp nhận PDF"); else notify(`${file.name} đã sẵn sàng gửi tới Java`); event.target.value = ""; };
  const ask = (event: FormEvent) => { event.preventDefault(); if (!question.trim()) return; setConversation((items) => [...items, question]); setQuestion(""); };
  return <div className="page-stack"><PageHeader eyebrow="Kho riêng của bạn" title="Tài liệu cá nhân & AI" description="Chọn một hoặc nhiều PDF đã READY để hỏi đáp và tạo Quiz có trích dẫn nguồn." actions={<label className="button primary"><Upload size={17} /> Tải PDF<input className="sr-only" type="file" accept="application/pdf,.pdf" onChange={onFile} /></label>} /><div className="tab-bar"><button className={tab === "documents" ? "active" : ""} onClick={() => setTab("documents")}>Tài liệu</button><button className={tab === "chat" ? "active" : ""} onClick={() => setTab("chat")}>Hỏi đáp AI <span>{selected.length}</span></button></div>{tab === "documents" ? <div className="personal-layout"><div className="document-list">{personalDocuments.map((document) => <label className={`document-card ${selected.includes(document.id) ? "selected" : ""}`} key={document.id}><input type="checkbox" disabled={document.status !== "READY"} checked={selected.includes(document.id)} onChange={() => setSelected((items) => items.includes(document.id) ? items.filter((id) => id !== document.id) : [...items, document.id])} /><span className="file-icon pdf"><FileText /></span><span className="document-main"><strong>{document.title}</strong><small>{document.subject} · Personal PDF</small></span><StatusBadge status={document.status} /></label>)}</div><aside className="selection-card"><span className="eyebrow">Phạm vi AI</span><h3>{selected.length} tài liệu đã chọn</h3><p>Java sẽ xác minh ownership và trạng thái READY trước mỗi câu hỏi.</p><button className="button primary wide" disabled={!selected.length} onClick={() => setTab("chat")}>Bắt đầu hỏi đáp <ChevronRight size={16} /></button></aside></div> : <div className="rag-layout"><aside className="rag-sources"><strong>Nguồn đang dùng</strong>{personalDocuments.filter((doc) => selected.includes(doc.id)).map((doc) => <div key={doc.id}><FileText size={17} /><span>{doc.title}</span><Check size={15} /></div>)}</aside><section className="rag-chat"><div className="rag-welcome"><span><Sparkles /></span><h2>Hỏi tài liệu của bạn</h2><p>AI chỉ trả lời từ {selected.length} PDF đã chọn và luôn đính kèm trang nguồn.</p></div>{conversation.map((message, index) => <div className="rag-turn" key={`${message}-${index}`}><div className="chat-message user"><p>{message}</p></div><div className="chat-message assistant"><b>StudyFlow AI</b><p>Đây là phản hồi fixture. Khi tích hợp, Java sẽ chuyển authorized scope sang Python và trả câu trả lời grounded.</p><button className="citation-card"><FileText size={16} /><span><b>Ghi chú chuẩn hóa dữ liệu.pdf</b><small>Trang 12 · Nguồn minh họa</small></span><ChevronRight size={16} /></button></div></div>)}<form className="rag-composer" onSubmit={ask}><textarea value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Đặt câu hỏi từ tài liệu đã chọn..." /><div><button type="button" className="button secondary compact" onClick={() => notify("Yêu cầu tạo Quiz sẽ được Java lưu ở trạng thái GENERATING")}><ClipboardCheck size={16} /> Tạo Quiz</button><button type="submit" className="send-button" aria-label="Gửi"><Send size={18} /></button></div></form></section></div>}</div>;
}

function ReviewPage({ notify }: { notify: (message: string) => void }) {
  const [states, setStates] = useState<Record<string, QuizStatus>>({});
  return <div className="page-stack"><PageHeader eyebrow="Ôn tập chủ động" title="Quiz của bạn" description="Quiz AI phải được bạn xem lại và chấp nhận trước khi bắt đầu làm bài." actions={<Link className="button primary" href="/student/personal-documents"><Plus size={17} /> Tạo từ tài liệu</Link>} /><div className="quiz-summary"><Metric icon={Sparkles} label="Chờ duyệt" value="1" trend="Cần kiểm tra nguồn" /><Metric icon={ClipboardCheck} label="Sẵn sàng" value="1" trend="Có thể làm ngay" /><Metric icon={BarChart3} label="Điểm trung bình" value="87.5%" trend="Java scoring" /></div><div className="quiz-grid">{quizzes.map((quiz) => { const status = states[quiz.id] ?? quiz.status; return <article className="quiz-card" key={quiz.id}><div><StatusBadge status={status} /><span>{quiz.questionCount} câu</span></div><h2>{quiz.title}</h2><p>Nguồn: {quiz.sourceNames.join(", ")}</p><div className="quiz-actions">{status === "REVIEW_REQUIRED" && <><button className="button secondary" onClick={() => notify("Đã mở bản nháp và citation")}>Xem bản nháp</button><button className="button primary" onClick={() => { setStates((value) => ({ ...value, [quiz.id]: "READY" })); notify("Quiz demo đã chuyển sang READY"); }}>Chấp nhận</button></>}{status === "READY" && <button className="button primary wide" onClick={() => notify("Java sẽ tạo attempt và không trả answer key")}>Bắt đầu làm bài</button>}{status === "ARCHIVED" && <button className="button secondary wide" onClick={() => notify("Đang mở kết quả đã chấm")}>Xem kết quả · {quiz.score}%</button>}</div></article>; })}</div></div>;
}

function ProgressPage() {
  return <div className="page-stack"><PageHeader eyebrow="Dữ liệu khách quan" title="Tiến độ & Thống kê" description="Theo dõi hoạt động đã hoàn thành; hệ thống không suy luận Topic Mastery." /><section className="stats-grid"><Metric icon={BookOpen} label="Slide đã xem" value="38" trend="3 môn học" /><Metric icon={Clock3} label="Thời gian 30 ngày" value="24h" trend="+12% kỳ trước" /><Metric icon={MessageSquareText} label="Câu hỏi AI" value="46" trend="8 NO_EVIDENCE" /><Metric icon={ClipboardCheck} label="Quiz đã làm" value="7" trend="Điểm TB 84%" /></section><section className="progress-layout"><div className="card panel-span-2"><CardHeading title="Hoạt động 7 ngày" /><div className="bar-chart">{[42, 66, 34, 82, 57, 91, 68].map((height, index) => <div key={index}><i style={{ height: `${height}%` }} /><span>T{index + 2 > 7 ? "CN" : index + 2}</span></div>)}</div></div><div className="card"><CardHeading title="Tiến độ slide" />{[["Cơ sở dữ liệu", 64], ["Trí tuệ nhân tạo", 42], ["Lập trình Web", 78]].map(([name, value]) => <div className="progress-item" key={name}><span><b>{name}</b><small>{value}%</small></span><div className="progress-line"><i style={{ width: `${value}%` }} /></div></div>)}</div></section></div>;
}

function PlanPage({ notify }: { notify: (message: string) => void }) {
  return <div className="page-stack"><PageHeader eyebrow="Bạn là người quyết định" title="Kế hoạch & Lịch tuần" description="Sắp xếp hoạt động học theo thời gian; AI không tự động điều phối kế hoạch." actions={<button className="button primary" onClick={() => notify("Form tạo lịch demo đã sẵn sàng")}><Plus size={17} /> Thêm lịch</button>} /><div className="week-toolbar"><button className="icon-button"><ChevronLeft /></button><div><strong>21 – 27 tháng 09, 2026</strong><small>Tuần hiện tại</small></div><button className="icon-button"><ChevronRight /></button></div><div className="calendar-board"><div className="calendar-days"><span>Giờ</span>{["T2 21/09", "T3 22/09", "T4 23/09", "T5 24/09", "T6 25/09", "T7 26/09", "CN 27/09"].map((day) => <strong key={day}>{day}</strong>)}</div>{["08:00", "10:00", "14:00", "16:00", "19:00"].map((time) => <div className="calendar-row" key={time}><time>{time}</time>{["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((day) => { const task = weeklyTasks.find((item) => item.day === day && item.time === time); return <button key={day} className={task ? `calendar-event ${task.tone}` : "calendar-slot"} onClick={() => !task && notify(`Tạo lịch lúc ${time} ${day}`)}>{task && <><b>{task.title}</b><small>{task.time}</small></>}</button>; })}</div>)}</div></div>;
}

function TeacherPage({ section, notify }: { section: string; notify: (message: string) => void }) {
  const onFile = (event: ChangeEvent<HTMLInputElement>) => { const file = event.target.files?.[0]; if (!file) return; const name = file.name.toLowerCase(); if (!(name.endsWith(".pdf") || name.endsWith(".pptx"))) notify("Giảng viên chỉ được upload PDF hoặc PPTX"); else notify(`${file.name} đã sẵn sàng gửi tới Java`); event.target.value = ""; };
  const heading = section === "assignments" ? ["Phạm vi giảng dạy", "Lớp & Môn phụ trách"] : section === "publications" ? ["Phân phối học liệu", "Tài liệu đã công bố"] : section === "documents" ? ["Thư viện của bạn", "Kho tài liệu giảng viên"] : ["Không gian giảng viên", "Tổng quan giảng dạy"];
  return <div className="page-stack"><PageHeader eyebrow={heading[0]} title={heading[1]} description="Quản lý tài liệu theo đúng ClassSubject được Admin phân công." actions={<label className="button primary"><Upload size={17} /> Upload PDF/PPTX<input className="sr-only" type="file" accept=".pdf,.pptx,application/pdf,application/vnd.openxmlformats-officedocument.presentationml.presentation" onChange={onFile} /></label>} />{section === "dashboard" && <><section className="stats-grid"><Metric icon={GraduationCap} label="Lớp phụ trách" value="3" trend="Học kỳ hiện tại" /><Metric icon={Users} label="Sinh viên" value="126" trend="Read-only" /><Metric icon={Library} label="Tài liệu" value="18" trend="12 đã công bố" /><Metric icon={Activity} label="Đang xử lý" value="1" trend="PPTX rendering" /></section><div className="card"><CardHeading title="Hoạt động gần đây" /><ActivityList /></div></>}{section === "assignments" && <div className="class-grid">{["KTPM-K21 · Cơ sở dữ liệu", "D21CQCN01 · Cơ sở dữ liệu", "KTPM-K22 · Lập trình Web"].map((name, index) => <article className="class-card compact-card" key={name}><div className={`class-cover cover-${index + 1}`}><span>Học kỳ 1</span><Users /></div><div className="class-body"><h2>{name}</h2><p>{38 + index * 4} sinh viên · Assignment active</p><button className="button secondary wide" onClick={() => notify("Danh sách Student chỉ hiển thị metadata read-only")}>Xem sinh viên</button></div></article>)}</div>}{(section === "documents" || section === "publications") && <div className="table-card"><div className="table-head teacher-table"><span>Tài liệu</span><span>Loại</span><span>Trạng thái</span><span>Phạm vi</span><span>Thao tác</span></div>{materials.map((item) => <div className="table-row teacher-table" key={item.id}><div className="file-cell"><span className={`file-icon ${item.type.toLowerCase()}`}><FileText /></span><span><strong>{item.title}</strong><small>Cập nhật hôm nay</small></span></div><span>{item.type}</span><StatusBadge status={item.status} /><span>{section === "publications" ? "KTPM-K21" : item.type === "PPTX" ? "Chưa công bố" : "2 lớp"}</span><button className="button secondary compact" onClick={() => notify(section === "publications" ? "Publication demo đã được thu hồi" : "Java sẽ kiểm assignment trước khi public")}>{section === "publications" ? "Thu hồi" : "Công bố"}</button></div>)}</div>}</div>;
}

function AdminPage({ section, notify }: { section: string; notify: (message: string) => void }) {
  const titles: Record<string, [string, string]> = { dashboard: ["Vận hành an toàn", "Tổng quan hệ thống"], users: ["Identity & Access", "Người dùng và vai trò"], academics: ["Cấu trúc học vụ", "Lớp, môn và phân công"], feedback: ["Hỗ trợ người dùng", "Phản hồi & Báo cáo"], logs: ["Quan sát hệ thống", "Nhật ký an toàn"], settings: ["Cấu hình allowlist", "Cài đặt hệ thống"] };
  const [eyebrow, title] = titles[section] ?? titles.dashboard;
  return <div className="page-stack"><PageHeader eyebrow={eyebrow} title={title} description="Admin quản trị metadata và vận hành; không mặc định truy cập dữ liệu học tập cá nhân." actions={<button className="button primary" onClick={() => notify("Thao tác demo đã mở")}>{section === "users" ? <><Plus size={17} /> Thêm người dùng</> : <><ShieldCheck size={17} /> Kiểm tra quyền</>}</button>} />{section === "dashboard" ? <><section className="stats-grid"><Metric icon={Users} label="Người dùng" value="1,248" trend="1,216 active" /><Metric icon={GraduationCap} label="Lớp học" value="28" trend="12 môn học" /><Metric icon={Library} label="Tài liệu" value="386" trend="4 processing failed" /><Metric icon={MessageSquareText} label="Phản hồi mở" value="7" trend="2 cần xử lý" /></section><section className="dashboard-grid"><div className="card panel-span-2"><CardHeading title="Hoạt động hệ thống" /><div className="admin-chart"><div><span>Hoạt động hợp lệ</span><strong>98.7%</strong><div className="progress-line"><i style={{ width: "98.7%" }} /></div></div><div><span>AI job thành công</span><strong>96.2%</strong><div className="progress-line"><i style={{ width: "96.2%" }} /></div></div></div></div><div className="card privacy-card"><ShieldCheck /><h3>Privacy boundary</h3><p>Admin không xem Personal Document, chat, Note, kế hoạch hoặc Quiz result cá nhân.</p></div></section></> : <AdminTable section={section} notify={notify} />}</div>;
}

function AdminTable({ section, notify }: { section: string; notify: (message: string) => void }) {
  const rows = useMemo(() => section === "users" ? [["Nguyễn Minh Khang", "STUDENT", "ACTIVE"], ["Nguyễn Minh Anh", "TEACHER", "ACTIVE"], ["Trần Hoài Nam", "ADMIN", "ACTIVE"]] : section === "academics" ? [["KTPM-K21", "Cơ sở dữ liệu", "TS. Nguyễn Minh Anh"], ["D21CQCN01", "Trí tuệ nhân tạo", "ThS. Lê Hoàng"], ["KTPM-K22", "Lập trình Web", "Chưa phân công"]] : section === "feedback" ? [["Không mở được slide", "TECHNICAL", "OPEN"], ["Cần hỗ trợ tài khoản", "ACCOUNT", "IN_PROGRESS"], ["Góp ý giao diện", "FEEDBACK", "RESOLVED"]] : section === "logs" ? [["USER_LOGIN", "user_104", "SUCCESS"], ["DOCUMENT_PUBLISHED", "doc_24", "SUCCESS"], ["INDEX_JOB_FAILED", "job_91", "FAILED"]] : [["chat.retention_days", "90", "Cho phép"], ["upload.personal.max_mb", "20", "Cho phép"], ["provider.api_key", "••••", "Bị chặn"]], [section]);
  return <div className="table-card"><div className="table-head admin-table"><span>Đối tượng</span><span>Phân loại</span><span>Trạng thái / Giá trị</span><span>Thao tác</span></div>{rows.map((row) => <div className="table-row admin-table" key={row.join("-")}><strong>{row[0]}</strong><span>{row[1]}</span><span className="status ready">{row[2]}</span><button className="button ghost compact" onClick={() => notify("Đã mở chi tiết metadata an toàn")}>Chi tiết</button></div>)}</div>;
}

function Metric({ icon: Icon, label, value, trend }: { icon: LucideIcon; label: string; value: string; trend: string }) {
  return <article className="metric-card"><span><Icon size={20} /></span><div><small>{label}</small><strong>{value}</strong><p>{trend}</p></div></article>;
}

function CardHeading({ title, action }: { title: string; action?: React.ReactNode }) {
  return <div className="card-heading"><h2>{title}</h2>{action}</div>;
}

function SubjectCard({ code, name, progress, color }: { code: string; name: string; progress: number; color: string }) {
  return <article className="subject-card"><span className={`subject-dot ${color}`} /><div><small>{code}</small><strong>{name}</strong><div className="progress-line"><i style={{ width: `${progress}%` }} /></div><p>{progress}% nội dung đã xem</p></div></article>;
}

function StatusBadge({ status }: { status: ProcessingStatus | QuizStatus }) {
  const labels: Record<string, string> = { READY: "Sẵn sàng", PROCESSING: "Đang xử lý", PENDING_PROCESSING: "Đang chờ", FAILED: "Thất bại", DELETING: "Đang xóa", GENERATING: "Đang sinh", REVIEW_REQUIRED: "Chờ duyệt", REJECTED: "Đã từ chối", GENERATION_FAILED: "Sinh lỗi", ARCHIVED: "Đã hoàn thành" };
  const tone = ["READY"].includes(status) ? "ready" : ["PROCESSING", "PENDING_PROCESSING", "GENERATING"].includes(status) ? "processing" : ["FAILED", "GENERATION_FAILED", "REJECTED"].includes(status) ? "failed" : "review";
  return <span className={`status ${tone}`}>{labels[status] ?? status}</span>;
}

function ActivityList() {
  return <div className="activity-list">{[["PPTX Thiết kế ERD đã xử lý xong", "10 phút trước"], ["Đã công bố Đề cương học phần", "2 giờ trước"], ["Student list được xem", "Hôm qua"]].map(([title, time]) => <div key={title}><span><CheckCircle2 size={17} /></span><p><b>{title}</b><small>{time}</small></p></div>)}</div>;
}

function BackendRequired() {
  return <div className="empty-state"><span><ShieldCheck /></span><h1>Đang chờ Java Backend</h1><p>Production không sử dụng fixture. Thiết lập Java API và bật phiên đăng nhập để tải dữ liệu thật.</p><Link className="button secondary" href="/login">Về đăng nhập</Link></div>;
}
