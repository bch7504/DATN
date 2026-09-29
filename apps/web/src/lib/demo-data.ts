import { User, UserRole } from "@/types/auth";
import {
  Subject,
  Semester,
  CourseOffering,
  CourseEnrollment,
} from "@/types/course-offering";
import {
  TeacherDocument,
  Slide,
  SlideNote,
  PersonalDocument,
} from "@/types/material";
import { ChatConversation } from "@/types/chat";
import { Quiz, QuizDraft, QuizAttempt } from "@/types/quiz";
import {
  ReviewItem,
  CourseReviewSummary,
  DailyGoalProgress,
  DailyGoalConfig,
  StudyStreak,
} from "@/types/review";

export const DEMO_USERS: Record<UserRole, User> = {
  STUDENT: {
    id: "usr_student_01",
    displayName: "Nguyễn Văn An",
    email: "student@ptit.edu.vn",
    role: "STUDENT",
    avatarUrl: undefined,
  },
  TEACHER: {
    id: "usr_teacher_01",
    displayName: "TS. Trần Thị Giảng Viên",
    email: "teacher@ptit.edu.vn",
    role: "TEACHER",
    avatarUrl: undefined,
  },
  ADMIN: {
    id: "usr_admin_01",
    displayName: "Quản trị viên Hệ thống PTIT",
    email: "admin@ptit.edu.vn",
    role: "ADMIN",
    avatarUrl: undefined,
  },
};

export const DEMO_STUDENT_2: User = {
  id: "usr_student_02",
  displayName: "Lê Minh Tuấn",
  email: "tuan.lm@ptit.edu.vn",
  role: "STUDENT",
};

export const DEMO_SUBJECTS: Subject[] = [
  {
    id: "subj_dbi",
    code: "INT1340",
    name: "Cơ sở dữ liệu",
    credits: 3,
    status: "ACTIVE",
  },
  {
    id: "subj_ai",
    code: "INT1415",
    name: "Trí tuệ nhân tạo",
    credits: 3,
    status: "ACTIVE",
  },
  {
    id: "subj_dsa",
    code: "INT1339",
    name: "Cấu trúc dữ liệu & Giải thuật",
    credits: 3,
    status: "ACTIVE",
  },
];

export const DEMO_SEMESTERS: Semester[] = [
  {
    id: "sem_2026_1",
    code: "2026_1",
    name: "Học kỳ 1 · Năm học 2026 - 2027",
    status: "ACTIVE",
    offeringCreationEnabled: true,
  },
  {
    id: "sem_2026_2",
    code: "2026_2",
    name: "Học kỳ 2 · Năm học 2026 - 2027",
    status: "UPCOMING",
    offeringCreationEnabled: false,
  },
];

export let demoOfferings: CourseOffering[] = [
  {
    id: "offering_dbi_01",
    code: "DBI-01",
    name: "Cơ sở dữ liệu",
    subjectId: "subj_dbi",
    subjectCode: "INT1340",
    subjectName: "Cơ sở dữ liệu",
    semesterId: "sem_2026_1",
    semesterName: "Học kỳ 1 · 2026-2027",
    teacherId: "usr_teacher_01",
    teacherName: "TS. Trần Thị Giảng Viên",
    joinCode: "DBI2026PTIT",
    joinCodeEnabled: true,
    status: "ACTIVE",
    enrolledCount: 42,
    pendingCount: 0,
    materialsCount: 4,
    createdAt: "2026-09-01T08:00:00Z",
  },
  {
    id: "offering_ai_02",
    code: "AI-02",
    name: "Trí tuệ nhân tạo",
    subjectId: "subj_ai",
    subjectCode: "INT1415",
    subjectName: "Trí tuệ nhân tạo",
    semesterId: "sem_2026_1",
    semesterName: "Học kỳ 1 · 2026-2027",
    teacherId: "usr_teacher_01",
    teacherName: "TS. Trần Thị Giảng Viên",
    joinCode: "AI2026PTIT",
    joinCodeEnabled: true,
    status: "ACTIVE",
    enrolledCount: 38,
    pendingCount: 1,
    materialsCount: 6,
    createdAt: "2026-09-02T09:00:00Z",
  },
];

export let demoEnrollments: CourseEnrollment[] = [
  {
    id: "enr_01",
    offeringId: "offering_dbi_01",
    offeringCode: "DBI-01",
    offeringName: "Cơ sở dữ liệu",
    subjectName: "Cơ sở dữ liệu",
    semesterName: "Học kỳ 1 · 2026-2027",
    teacherName: "TS. Trần Thị Giảng Viên",
    studentId: "usr_student_01",
    studentName: "Nguyễn Văn An",
    studentEmail: "student@ptit.edu.vn",
    status: "APPROVED",
    requestedAt: "2026-09-05T10:00:00Z",
    approvedAt: "2026-09-05T14:00:00Z",
  },
  {
    id: "enr_02",
    offeringId: "offering_ai_02",
    offeringCode: "AI-02",
    offeringName: "Trí tuệ nhân tạo",
    subjectName: "Trí tuệ nhân tạo",
    semesterName: "Học kỳ 1 · 2026-2027",
    teacherName: "TS. Trần Thị Giảng Viên",
    studentId: "usr_student_01",
    studentName: "Nguyễn Văn An",
    studentEmail: "student@ptit.edu.vn",
    status: "PENDING",
    requestedAt: "2026-09-24T11:00:00Z",
  },
];

// Teacher Documents and Publications (FE-M3)
export let demoTeacherDocs: TeacherDocument[] = [
  {
    id: "doc_pptx_01",
    title: "Bài giảng Chương 1: Giới thiệu Trí tuệ nhân tạo & Tác tử thông minh",
    fileName: "AI_Chuong1_TacTuThongMinh.pptx",
    fileType: "PPTX",
    fileSize: 4820000,
    status: "READY",
    totalSlides: 8,
    publishedOfferings: [
      {
        offeringId: "offering_ai_02",
        offeringCode: "AI-02",
        offeringName: "Trí tuệ nhân tạo",
        publishedAt: "2026-09-03T10:00:00Z",
      },
      {
        offeringId: "offering_dbi_01",
        offeringCode: "DBI-01",
        offeringName: "Cơ sở dữ liệu",
        publishedAt: "2026-09-03T10:00:00Z",
      },
    ],
    createdAt: "2026-09-03T09:30:00Z",
  },
  {
    id: "doc_pdf_01",
    title: "Đề cương chi tiết học phần Trí tuệ nhân tạo (Hệ chính quy PTIT)",
    fileName: "DeCuong_ChiTiet_INT1415.pdf",
    fileType: "PDF",
    fileSize: 1250000,
    status: "READY",
    totalPages: 12,
    downloadUrl: "/api/v1/student/materials/doc_pdf_01/download",
    publishedOfferings: [
      {
        offeringId: "offering_ai_02",
        offeringCode: "AI-02",
        offeringName: "Trí tuệ nhân tạo",
        publishedAt: "2026-09-03T10:00:00Z",
      },
      {
        offeringId: "offering_dbi_01",
        offeringCode: "DBI-01",
        offeringName: "Cơ sở dữ liệu",
        publishedAt: "2026-09-03T10:00:00Z",
      },
    ],
    createdAt: "2026-09-03T09:40:00Z",
  },
];

// Slides for doc_pptx_01
export const DEMO_SLIDES_AI: Slide[] = [
  {
    slideNumber: 1,
    title: "Chương 1: Tổng quan về Trí tuệ Nhân tạo",
    bullets: [
      "Định nghĩa AI: Khoa học và kỹ thuật tạo ra các cỗ máy thông minh.",
      "Lịch sử phát triển: Từ phép thử Turing (1950) đến Deep Learning.",
      "Bốn hướng tiếp cận chính: Suy nghĩ như con người, Hành động như con người, Suy nghĩ hợp lý, Hành động hợp lý.",
      "Mục tiêu môn học: Nắm vững các thuật toán tìm kiếm, biểu diễn tri thức và tác tử thông minh.",
    ],
  },
  {
    slideNumber: 2,
    title: "Khái niệm Tác tử (Agent) và Môi trường",
    bullets: [
      "Tác tử (Agent) là bất kỳ thực thể nào cảm nhận môi trường thông qua các bộ cảm biến (Sensors) và tác động lên môi trường đó thông qua các bộ phận chấp hành (Actuators).",
      "Hàm tác tử (Agent function): Ánh xạ từ chuỗi nhận thức (Percept sequence) đến hành động (Action). f: P* -> A.",
      "Chương trình tác tử (Agent program): Việc cài đặt thực tế của hàm tác tử trên một kiến trúc vật lý.",
    ],
  },
  {
    slideNumber: 3,
    title: "Tính Hợp lý (Rationality)",
    bullets: [
      "Tác tử hợp lý (Rational Agent): Là tác tử mà với mỗi chuỗi nhận thức có thể có, nó sẽ chọn một hành động giúp tối đa hóa thước đo hiệu quả (Performance measure).",
      "Cần phân biệt giữa tính hợp lý (Rationality) và tính toàn tri (Omniscience). Tính toàn tri biết trước kết quả thực tế của hành động; còn tính hợp lý chỉ tối đa hóa kết quả mong đợi dựa trên tri thức hiện có.",
      "Bốn yếu tố cấu thành tính hợp lý: Thước đo hiệu quả, Tri thức tiên nghiệm về môi trường, Các hành động có thể thực hiện, Chuỗi nhận thức cho đến thời điểm hiện tại.",
    ],
  },
  {
    slideNumber: 4,
    title: "Cấu trúc PEAS mô tả môi trường nhiệm vụ",
    bullets: [
      "P (Performance): Thước đo hiệu quả - Tiêu chí đánh giá mức độ thành công của tác tử.",
      "E (Environment): Môi trường xung quanh mà tác tử hoạt động.",
      "A (Actuators): Bộ chấp hành - Công cụ tác tử dùng để tạo ra hành động.",
      "S (Sensors): Cảm biến - Công cụ tác tử dùng để thu thập thông tin nhận thức từ môi trường.",
      "Ví dụ Tác tử Lái xe tự hành: P (An toàn, tốc độ, đúng luật), E (Đường phố, xe cộ, người đi bộ), A (Vô lăng, phanh, ga), S (Camera, Lidar, GPS).",
    ],
  },
  {
    slideNumber: 5,
    title: "Các đặc tính của Môi trường",
    bullets: [
      "Quan sát được toàn phần vs. Quan sát được một phần (Fully observable vs. Partially observable).",
      "Đơn tác tử vs. Đa tác tử (Single agent vs. Multiagent).",
      "Tất định vs. Bất định/Xác suất (Deterministic vs. Stochastic).",
      "Theo tập lệnh vs. Tuần tự (Episodic vs. Sequential).",
      "Tĩnh vs. Động (Static vs. Dynamic).",
      "Rời rạc vs. Liên tục (Discrete vs. Continuous).",
    ],
  },
  {
    slideNumber: 6,
    title: "Các loại Cấu trúc Tác tử cơ bản",
    bullets: [
      "1. Tác tử phản xạ đơn giản (Simple reflex agent): Chỉ dựa vào nhận thức hiện tại (Luật Condition-Action).",
      "2. Tác tử phản xạ dựa trên mô hình (Model-based reflex agent): Duy trì trạng thái bên trong để theo dõi phần thế giới không quan sát được.",
      "3. Tác tử dựa trên mục tiêu (Goal-based agent): Kết hợp mục tiêu để lựa chọn hành động dẫn đến đích.",
      "4. Tác tử dựa trên độ thỏa dụng (Utility-based agent): Sử dụng hàm thỏa dụng để đánh giá mức độ hạnh phúc/tối ưu giữa các trạng thái.",
      "5. Tác tử có khả năng học (Learning agent): Tự cải thiện hiệu quả qua kinh nghiệm.",
    ],
  },
  {
    slideNumber: 7,
    title: "Tác tử dựa trên Mục tiêu (Goal-based Agents)",
    bullets: [
      "Kiến thức về trạng thái hiện tại là chưa đủ; tác tử cần biết mục tiêu (Goal) cần đạt được.",
      "Kết hợp giữa thông tin môi trường và mục tiêu để lập kế hoạch chuỗi hành động.",
      "Linh hoạt hơn tác tử phản xạ: Khi mục tiêu thay đổi, hành vi của tác tử dễ dàng điều chỉnh mà không phải viết lại quy tắc.",
      "Là nền tảng của các thuật toán Tìm kiếm (Search) và Lập kế hoạch (Planning).",
    ],
  },
  {
    slideNumber: 8,
    title: "Tổng kết & Bài tập Chương 1",
    bullets: [
      "Trọng tâm: Nắm vững mô hình PEAS và phân loại đặc tính môi trường cho các bài toán thực tế.",
      "Hiểu rõ sự khác biệt giữa 4 loại tác tử: Phản xạ, Dựa trên mô hình, Dựa trên mục tiêu, Dựa trên độ thỏa dụng.",
      "Bài tập về nhà: Phân tích mô hình PEAS cho Tác tử Chẩn đoán y khoa tự động và Tác tử Hút bụi thông minh.",
      "Chuẩn bị bài học tiếp theo: Không gian trạng thái và Các giải thuật tìm kiếm mù (BFS, DFS, UCS).",
    ],
  },
];

// In-memory notes storage: key = `${documentId}:${slideNumber}`
export const demoSlideNotes: Record<string, string> = {
  "doc_pptx_01:4": "Chú ý ghi nhớ PEAS cho kỳ thi trắc nghiệm! Thầy hay ra ví dụ về xe tự hành và chẩn đoán y khoa.",
  "doc_pptx_01:2": "Hàm tác tử f: P* -> A nhận chuỗi nhận thức làm đầu vào.",
};

// Personal Documents (FE-M3)
export let demoPersonalDocs: PersonalDocument[] = [
  {
    id: "pdoc_01",
    title: "Ghi chú ôn tập Cơ sở dữ liệu.pdf",
    fileName: "Ghi_chu_on_tap_CSDL.pdf",
    fileSize: 2450000,
    pageCount: 14,
    status: "READY",
    sha256: "a3b91c89f4e2d8109867cbaef19034871239abcef19034871239abcef1903487",
    uploadedAt: "2026-09-20T14:30:00Z",
  },
  {
    id: "pdoc_02",
    title: "Tài liệu thực hành Truy vấn SQL nâng cao.pdf",
    fileName: "Thuc_hanh_SQL_nang_cao.pdf",
    fileSize: 1820000,
    pageCount: 10,
    status: "READY",
    sha256: "9871239abcef19034871239abcef1903487a3b91c89f4e2d8109867cbaef19034",
    uploadedAt: "2026-09-22T16:00:00Z",
  },
];

// Personal RAG Conversations (FE-M4)
export let demoConversations: ChatConversation[] = [
  {
    id: "conv_01",
    title: "Chuẩn hóa CSDL & Dạng chuẩn 3NF",
    selectedDocumentIds: ["pdoc_01"],
    createdAt: "2026-09-25T14:00:00Z",
    updatedAt: "2026-09-25T14:15:00Z",
    messages: [
      {
        id: "msg_01",
        role: "user",
        content: "Điều kiện để một lược đồ quan hệ đạt dạng chuẩn 3NF là gì?",
        createdAt: "2026-09-25T14:01:00Z",
      },
      {
        id: "msg_02",
        role: "assistant",
        content:
          "Theo tài liệu 'Ghi chú ôn tập Cơ sở dữ liệu.pdf', một lược đồ quan hệ R đạt dạng chuẩn 3 (3NF) nếu thỏa mãn 2 điều kiện:\n1. R đã đạt dạng chuẩn 2 (2NF).\n2. Không có thuộc tính không khóa nào phụ thuộc bắc cầu vào khóa chính (mọi phụ thuộc hàm X -> A, thì X là siêu khóa hoặc A là thuộc tính khóa nguyên tố).",
        status: "ANSWERED",
        citations: [
          {
            documentId: "pdoc_01",
            documentName: "Ghi chú ôn tập Cơ sở dữ liệu.pdf",
            pageNumber: 8,
            excerpt:
              "Dạng chuẩn 3 (3NF): Lược đồ đạt 2NF và không tồn tại phụ thuộc bắc cầu giữa các thuộc tính không khóa với khóa chính.",
            sha256: "a3b91c89f4e2d8109867cbaef19034871239abcef19034871239abcef1903487",
          },
        ],
        createdAt: "2026-09-25T14:01:05Z",
      },
    ],
  },
  {
    id: "conv_02",
    title: "Tối ưu hóa Truy vấn lồng trong SQL",
    selectedDocumentIds: ["pdoc_02"],
    createdAt: "2026-09-26T09:00:00Z",
    updatedAt: "2026-09-26T09:10:00Z",
    messages: [
      {
        id: "msg_03",
        role: "user",
        content: "Khi nào nên dùng EXISTS thay cho IN trong truy vấn con?",
        createdAt: "2026-09-26T09:01:00Z",
      },
      {
        id: "msg_04",
        role: "assistant",
        content:
          "Dựa trên tài liệu 'Tài liệu thực hành Truy vấn SQL nâng cao.pdf' (Trang 5):\n- Nên sử dụng `EXISTS` khi tập dữ liệu của bảng trong truy vấn con rất lớn, vì `EXISTS` sẽ dừng quét ngay khi tìm thấy bản ghi đầu tiên thỏa mãn điều kiện (short-circuit evaluation).\n- Sử dụng `IN` khi tập kết quả của truy vấn con tương đối nhỏ.",
        status: "ANSWERED",
        citations: [
          {
            documentId: "pdoc_02",
            documentName: "Tài liệu thực hành Truy vấn SQL nâng cao.pdf",
            pageNumber: 5,
            excerpt:
              "Toán tử EXISTS áp dụng cơ chế short-circuiting: dừng kiểm tra ngay khi gặp điều kiện TRUE, tối ưu hơn IN khi bảng con có số dòng lớn.",
            sha256: "9871239abcef19034871239abcef1903487a3b91c89f4e2d8109867cbaef19034",
          },
        ],
        createdAt: "2026-09-26T09:01:06Z",
      },
    ],
  },
];

export function findDemoUser(identifier: string): User | undefined {
  const cleanId = identifier.trim().toLowerCase();
  if (cleanId.includes("teacher") || cleanId.includes("giangvien")) {
    return DEMO_USERS.TEACHER;
  }
  if (cleanId.includes("admin") || cleanId.includes("quantri")) {
    return DEMO_USERS.ADMIN;
  }
  if (cleanId.includes("tuan") || cleanId.includes("student2")) {
    return DEMO_STUDENT_2;
  }
  return DEMO_USERS.STUDENT;
}

// ==========================================
// FE-M5: Quiz, Review Hub, Daily Goal & Streak
// ==========================================

export let demoQuizzes: Quiz[] = [
  {
    id: "quiz_01",
    title: "Kiến trúc Tác tử AI & Mô hình PEAS (Chương 1)",
    courseOfferingId: "offering_01", // INT1340 - Trí tuệ nhân tạo
    courseOfferingCode: "INT1340_01",
    isPersonal: false,
    questionCount: 3,
    questions: [
      {
        id: "q_01",
        type: "MCQ_SINGLE",
        questionText: "Trong mô hình PEAS của tác tử thông minh, chữ 'E' đại diện cho thành phần nào sau đây?",
        options: [
          { id: "A", text: "Evaluation (Đánh giá hiệu suất)" },
          { id: "B", text: "Environment (Môi trường hoạt động)" },
          { id: "C", text: "Effectors (Bộ phận truyền động)" },
          { id: "D", text: "Execution (Quy trình thực thi)" },
        ],
        correctOptionId: "B",
        explanation: "Mô hình PEAS gồm Performance measure, Environment, Actuators, Sensors. Chữ E là Environment (Môi trường).",
        citation: {
          documentId: "doc_pptx_01",
          documentName: "Chuong_1_Tong_quan_Tri_tue_Nhan_tao.pptx",
          slideNumber: 4,
          excerpt: "PEAS: P (Performance), E (Environment), A (Actuators), S (Sensors).",
        },
      },
      {
        id: "q_02",
        type: "MCQ_SINGLE",
        questionText: "Tác tử nào sau đây duy trì trạng thái bên trong để theo dõi phần môi trường không quan sát được?",
        options: [
          { id: "A", text: "Simple reflex agent (Tác tử phản xạ đơn giản)" },
          { id: "B", text: "Model-based reflex agent (Tác tử phản xạ dựa trên mô hình)" },
          { id: "C", text: "Goal-based agent (Tác tử dựa trên mục tiêu)" },
          { id: "D", text: "Utility-based agent (Tác tử dựa trên độ thỏa dụng)" },
        ],
        correctOptionId: "B",
        explanation: "Tác tử phản xạ dựa trên mô hình (Model-based reflex agent) lưu giữ trạng thái bên trong để bù đắp cho môi trường quan sát một phần.",
        citation: {
          documentId: "doc_pptx_01",
          documentName: "Chuong_1_Tong_quan_Tri_tue_Nhan_tao.pptx",
          slideNumber: 6,
          excerpt: "2. Tác tử phản xạ dựa trên mô hình: Duy trì trạng thái bên trong để theo dõi thế giới không quan sát được.",
        },
      },
      {
        id: "q_03",
        type: "MCQ_SINGLE",
        questionText: "Hàm tác tử (Agent function) ánh xạ chuỗi nhận thức (Percept sequence) thành thành phần nào?",
        options: [
          { id: "A", text: "Sensor input (Dữ liệu cảm biến mới)" },
          { id: "B", text: "Internal state (Trạng thái nội vi)" },
          { id: "C", text: "Action (Hành động của tác tử)" },
          { id: "D", text: "Performance score (Điểm số hiệu năng)" },
        ],
        correctOptionId: "C",
        explanation: "Hàm tác tử f: P* -> A ánh xạ mọi chuỗi nhận thức P* thành một hành động A cụ thể.",
        citation: {
          documentId: "doc_pptx_01",
          documentName: "Chuong_1_Tong_quan_Tri_tue_Nhan_tao.pptx",
          slideNumber: 2,
          excerpt: "Hàm tác tử: f: P* -> A (từ chuỗi nhận thức sang hành động).",
        },
      },
    ],
    createdAt: "2026-09-24T08:00:00Z",
    acceptedAt: "2026-09-24T08:05:00Z",
  },
  {
    id: "quiz_02",
    title: "Chuẩn hóa Cơ sở Dữ liệu & Dạng chuẩn 3NF",
    courseOfferingId: "offering_02", // DBI202_K21 - Cơ sở dữ liệu
    courseOfferingCode: "DBI202_K21",
    isPersonal: false,
    questionCount: 2,
    questions: [
      {
        id: "q_04",
        type: "MCQ_SINGLE",
        questionText: "Một lược đồ quan hệ đạt dạng chuẩn 3 (3NF) khi nào?",
        options: [
          { id: "A", text: "Đạt 1NF và mọi thuộc tính đều phụ thuộc hàm đầy đủ vào khóa chính" },
          { id: "B", text: "Đạt 2NF và không có thuộc tính không khóa nào phụ thuộc bắc cầu vào khóa chính" },
          { id: "C", text: "Chỉ chứa các giá trị nguyên tố trong mọi trường" },
          { id: "D", text: "Không tồn tại bất kỳ phụ thuộc hàm đa trị nào" },
        ],
        correctOptionId: "B",
        explanation: "Theo định nghĩa chuẩn 3NF: Lược đồ phải đạt 2NF và loại bỏ hoàn toàn phụ thuộc bắc cầu của thuộc tính không khóa.",
        citation: {
          documentId: "pdoc_01",
          documentName: "Ghi chú ôn tập Cơ sở dữ liệu.pdf",
          pageNumber: 8,
          excerpt: "Dạng chuẩn 3 (3NF): Lược đồ đạt 2NF và không có phụ thuộc bắc cầu.",
        },
      },
      {
        id: "q_05",
        type: "MCQ_SINGLE",
        questionText: "Nếu X -> A là một phụ thuộc hàm không tầm thường và X không phải siêu khóa, thì lược đồ vi phạm dạng chuẩn nào?",
        options: [
          { id: "A", text: "1NF" },
          { id: "B", text: "2NF" },
          { id: "C", text: "BCNF (Boyce-Codd Normal Form)" },
          { id: "D", text: "4NF" },
        ],
        correctOptionId: "C",
        explanation: "BCNF yêu cầu mọi phụ thuộc hàm không tầm thường X -> A thì X bắt buộc phải là một siêu khóa (Superkey).",
        citation: {
          documentId: "pdoc_01",
          documentName: "Ghi chú ôn tập Cơ sở dữ liệu.pdf",
          pageNumber: 10,
          excerpt: "BCNF đòi hỏi với mọi X -> A, X phải là siêu khóa.",
        },
      },
    ],
    createdAt: "2026-09-26T10:00:00Z",
    acceptedAt: "2026-09-26T10:02:00Z",
  },
  {
    id: "quiz_03",
    title: "Thực hành Truy vấn SQL: Phép nối & Subquery",
    isPersonal: true,
    questionCount: 2,
    questions: [
      {
        id: "q_06",
        type: "MCQ_SINGLE",
        questionText: "Khi truy vấn lồng kiểm tra sự tồn tại trên tập dữ liệu rất lớn, mệnh đề nào sau đây tối ưu hơn nhờ cơ chế short-circuiting?",
        options: [
          { id: "A", text: "WHERE column IN (...)" },
          { id: "B", text: "WHERE EXISTS (...)" },
          { id: "C", text: "WHERE column = ANY (...)" },
          { id: "D", text: "WHERE column NOT IN (...)" },
        ],
        correctOptionId: "B",
        explanation: "EXISTS kiểm tra sự tồn tại và dừng lại ngay khi tìm thấy dòng đầu tiên thỏa mãn điều kiện.",
        citation: {
          documentId: "pdoc_02",
          documentName: "Tài liệu thực hành Truy vấn SQL nâng cao.pdf",
          pageNumber: 5,
          excerpt: "Toán tử EXISTS áp dụng cơ chế short-circuiting tối ưu hơn IN.",
        },
      },
      {
        id: "q_07",
        type: "MCQ_SINGLE",
        questionText: "Phép nối nào trả về toàn bộ các dòng của bảng bên trái cùng các dòng khớp của bảng bên phải, các trường không khớp nhận NULL?",
        options: [
          { id: "A", text: "INNER JOIN" },
          { id: "B", text: "LEFT OUTER JOIN" },
          { id: "C", text: "RIGHT OUTER JOIN" },
          { id: "D", text: "FULL OUTER JOIN" },
        ],
        correctOptionId: "B",
        explanation: "LEFT JOIN (hoặc LEFT OUTER JOIN) giữ lại mọi bản ghi từ bảng bên trái.",
        citation: {
          documentId: "pdoc_02",
          documentName: "Tài liệu thực hành Truy vấn SQL nâng cao.pdf",
          pageNumber: 2,
          excerpt: "LEFT JOIN bảo toàn toàn bộ dòng của bảng bên trái.",
        },
      },
    ],
    createdAt: "2026-09-27T15:00:00Z",
    acceptedAt: "2026-09-27T15:05:00Z",
  },
];

export let demoQuizAttempts: QuizAttempt[] = [
  {
    id: "att_01",
    quizId: "quiz_01",
    quizTitle: "Kiến trúc Tác tử AI & Mô hình PEAS (Chương 1)",
    attemptNumber: 1,
    score: 1,
    maxScore: 3,
    percentage: 33,
    completedAt: "2026-09-24T09:00:00Z",
    answers: [
      { questionId: "q_01", selectedOptionId: "A", isCorrect: false },
      { questionId: "q_02", selectedOptionId: "B", isCorrect: true },
      { questionId: "q_03", selectedOptionId: "B", isCorrect: false },
    ],
  },
  {
    id: "att_02",
    quizId: "quiz_01",
    quizTitle: "Kiến trúc Tác tử AI & Mô hình PEAS (Chương 1)",
    attemptNumber: 2,
    score: 3,
    maxScore: 3,
    percentage: 100,
    completedAt: "2026-09-25T16:30:00Z",
    answers: [
      { questionId: "q_01", selectedOptionId: "B", isCorrect: true },
      { questionId: "q_02", selectedOptionId: "B", isCorrect: true },
      { questionId: "q_03", selectedOptionId: "C", isCorrect: true },
    ],
  },
  {
    id: "att_03",
    quizId: "quiz_02",
    quizTitle: "Chuẩn hóa Cơ sở Dữ liệu & Dạng chuẩn 3NF",
    attemptNumber: 1,
    score: 1,
    maxScore: 2,
    percentage: 50,
    completedAt: "2026-09-26T14:00:00Z",
    answers: [
      { questionId: "q_04", selectedOptionId: "A", isCorrect: false },
      { questionId: "q_05", selectedOptionId: "C", isCorrect: true },
    ],
  },
];

// Review Items aggregated strictly from wrong quiz answers (NO AI guessing)
export let demoReviewItems: ReviewItem[] = [
  {
    id: "rev_01",
    quizId: "quiz_01",
    quizTitle: "Kiến trúc Tác tử AI & Mô hình PEAS (Chương 1)",
    questionId: "q_01",
    questionText: "Trong mô hình PEAS của tác tử thông minh, chữ 'E' đại diện cho thành phần nào sau đây?",
    wrongOptionText: "A: Evaluation (Đánh giá hiệu suất)",
    correctOptionText: "B: Environment (Môi trường hoạt động)",
    explanation: "Mô hình PEAS: P (Performance), E (Environment), A (Actuators), S (Sensors). Chữ E là Environment.",
    citation: {
      documentId: "doc_pptx_01",
      documentName: "Chuong_1_Tong_quan_Tri_tue_Nhan_tao.pptx",
      slideNumber: 4,
      excerpt: "PEAS: P (Performance), E (Environment), A (Actuators), S (Sensors).",
    },
    lastAttemptAt: "2026-09-24T09:00:00Z",
    timesWrong: 1,
  },
  {
    id: "rev_02",
    quizId: "quiz_01",
    quizTitle: "Kiến trúc Tác tử AI & Mô hình PEAS (Chương 1)",
    questionId: "q_03",
    questionText: "Hàm tác tử (Agent function) ánh xạ chuỗi nhận thức (Percept sequence) thành thành phần nào?",
    wrongOptionText: "B: Internal state (Trạng thái nội vi)",
    correctOptionText: "C: Action (Hành động của tác tử)",
    explanation: "Hàm tác tử f: P* -> A ánh xạ chuỗi nhận thức P* thành một hành động A cụ thể.",
    citation: {
      documentId: "doc_pptx_01",
      documentName: "Chuong_1_Tong_quan_Tri_tue_Nhan_tao.pptx",
      slideNumber: 2,
      excerpt: "Hàm tác tử: f: P* -> A (từ chuỗi nhận thức sang hành động).",
    },
    lastAttemptAt: "2026-09-24T09:00:00Z",
    timesWrong: 1,
  },
  {
    id: "rev_03",
    quizId: "quiz_02",
    quizTitle: "Chuẩn hóa Cơ sở Dữ liệu & Dạng chuẩn 3NF",
    questionId: "q_04",
    questionText: "Một lược đồ quan hệ đạt dạng chuẩn 3 (3NF) khi nào?",
    wrongOptionText: "A: Đạt 1NF và mọi thuộc tính đều phụ thuộc hàm đầy đủ vào khóa chính",
    correctOptionText: "B: Đạt 2NF và không có thuộc tính không khóa nào phụ thuộc bắc cầu vào khóa chính",
    explanation: "Định nghĩa chuẩn 3NF: Lược đồ phải đạt 2NF và loại bỏ hoàn toàn phụ thuộc bắc cầu.",
    citation: {
      documentId: "pdoc_01",
      documentName: "Ghi chú ôn tập Cơ sở dữ liệu.pdf",
      pageNumber: 8,
      excerpt: "Dạng chuẩn 3 (3NF): Lược đồ đạt 2NF và không có phụ thuộc bắc cầu.",
    },
    lastAttemptAt: "2026-09-26T14:00:00Z",
    timesWrong: 1,
  },
];

// Daily Goal Configuration (Student configures target only)
export let demoDailyGoalConfig: DailyGoalConfig = {
  targetSlides: 8,
  targetQuizQuestions: 10,
  targetTasks: 2,
};

// Daily Goal Progress computed by Java backend
export let demoDailyGoalProgress: DailyGoalProgress = {
  date: "2026-09-29",
  targetSlides: 8,
  actualSlides: 6,
  slidesPercentage: 75,
  targetQuizQuestions: 10,
  actualQuizQuestions: 8,
  quizPercentage: 80,
  targetTasks: 2,
  actualTasks: 2,
  tasksPercentage: 100,
  isCompleted: false, // overall completed only when all targets reached
};

// Study Streak computed by Java backend (Streak is based on VIEW_SLIDE, STUDY_TASK_COMPLETED, QUIZ_COMPLETED)
export let demoStudyStreak: StudyStreak = {
  currentStreak: 5,
  longestStreak: 12,
  lastActiveDate: "2026-09-29",
  weeklyActivity: [
    { day: "T4", date: "2026-09-23", active: true, count: 4 },
    { day: "T5", date: "2026-09-24", active: true, count: 7 },
    { day: "T6", date: "2026-09-25", active: true, count: 6 },
    { day: "T7", date: "2026-09-26", active: true, count: 5 },
    { day: "CN", date: "2026-09-27", active: false, count: 0 },
    { day: "T2", date: "2026-09-28", active: true, count: 3 },
    { day: "T3", date: "2026-09-29", active: true, count: 8 },
  ],
};

