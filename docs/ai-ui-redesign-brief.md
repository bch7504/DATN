# StudyFlow — Design Brief giao diện AI mới

**Mục đích:** Làm tài liệu đầu vào để thiết kế lại mock/Figma và sau đó cập nhật Frontend thật.  
**Trạng thái:** Ý tưởng UX/UI đã bám theo `ai-implementation-plan.md`; chưa phải API contract và chưa triển khai code.

## 1. Mục tiêu trải nghiệm

Giao diện AI cần giúp người dùng hiểu ngay ba điều:

1. AI đang sử dụng tài liệu nào.
2. AI đang thực hiện hành động nào.
3. Kết quả dựa trên trang nào và cần người dùng xác nhận gì tiếp theo.

Không đưa thuật ngữ kỹ thuật như LangChain, LangGraph, embedding, agent trace hoặc model provider ra giao diện người dùng.

## 2. Bản đồ chức năng theo vai trò

### Student

```text
Tài liệu cá nhân
├→ Upload/quản lý Personal PDF
└→ Trợ lý tài liệu cá nhân
     ├→ Hỏi đáp
     ├→ Tóm tắt
     └→ Tạo Quiz

Lớp học phần
└→ Học liệu PDF
     ├→ PDF Viewer
     ├→ Ghi chú theo trang
     └→ AI Tutor theo trang

Ôn tập
└→ Review/accept/làm Quiz/xem câu sai
```

### Teacher

```text
Lớp học phần của tôi
├→ Tải và public Course Material PDF
└→ AI Quiz Studio
     ├→ Chọn PDF/phạm vi trang
     ├→ Cấu hình số câu/chủ đề/độ khó
     ├→ Sinh bản nháp
     ├→ Review/chỉnh sửa
     └→ Publish
```

Teacher không có Personal Chatbot và không có AI Tutor.

## 3. Điều hướng đề xuất

### Student

| Menu | Route đề xuất | Nội dung |
|---|---|---|
| Tổng quan | `/dashboard` | Progress, Streak, Daily Goal, Quiz và task |
| Lớp học phần | `/course-offerings` | Lớp, học liệu PDF và AI Tutor |
| Tài liệu cá nhân | `/personal-documents` | Upload/quản lý PDF |
| Trợ lý tài liệu | `/assistant` | Single Agent: hỏi đáp, tóm tắt, tạo Quiz |
| Ôn tập | `/review` | Quiz, attempt, câu sai và nguồn |
| Kế hoạch & Lịch | `/plan` | Task và lịch tuần |

`/assistant` có thể mở từ nút **Hỏi AI** trên `/personal-documents`, nhưng nên có menu riêng vì đây là workspace sử dụng thường xuyên.

### Teacher

| Menu | Route đề xuất | Nội dung |
|---|---|---|
| Tổng quan | `/teacher/dashboard` | Lớp, enrollment, tài liệu, Quiz gần đây |
| Lớp học phần của tôi | `/teacher/course-offerings` | Tạo và quản lý lớp |
| Yêu cầu tham gia | `/teacher/enrollments` | Approve/reject Student |
| Học liệu PDF | `/teacher/documents` | Upload, processing, public/revoke |
| AI Quiz Studio | `/teacher/quizzes/create` | Sinh Quiz từ Course Material PDF |
| Quiz đã tạo | `/teacher/quizzes` | Draft, published, closed và kết quả tổng quan |

## 4. Màn Student — Personal Documents

### Mục tiêu

Quản lý PDF cá nhân và mở nhanh Trợ lý tài liệu.

### Bố cục

```text
┌──────────────────────────────────────────────────────────────┐
│ Tài liệu cá nhân                  [Tải PDF lên] [Hỏi AI →]   │
│ PDF của bạn chỉ được dùng trong phạm vi tài khoản hiện tại. │
├──────────────────────────────────────────────────────────────┤
│ [Tìm tài liệu...] [Tất cả] [Ready] [Processing] [Failed]    │
├──────────────────────────────────────────────────────────────┤
│ □ Cơ sở dữ liệu.pdf       READY       82 trang    [⋯]       │
│ □ Trí tuệ nhân tạo.pdf    PROCESSING   --          [⋯]       │
│ □ Thuật toán.pdf          FAILED       --          [Thử lại] │
└──────────────────────────────────────────────────────────────┘
```

### Tương tác

- Checkbox chọn nhiều PDF `READY`.
- Nút **Hỏi AI** hiển thị số tài liệu đã chọn.
- Nếu chưa chọn tài liệu, mở Assistant với Source Panel để chọn.
- File `PROCESSING` không được chọn.
- File `FAILED` hiển thị safe error và hướng xử lý.
- Upload modal ghi rõ: chỉ PDF có lớp văn bản, không nhận file mã hóa/OCR trong MVP.

## 5. Màn Student — Personal Document Assistant

### 5.1. Ý tưởng chính

Một giao diện chat duy nhất. Người dùng không bắt buộc chọn Hỏi đáp/Tóm tắt/Tạo Quiz; Single Agent tự chọn tool. UI luôn công khai tool đã được chọn để tránh cảm giác AI hành động bí mật.

### 5.2. Desktop layout

```text
┌──────────────────────────────────────────────────────────────────────────┐
│ Trợ lý tài liệu cá nhân           [Phiên hiện tại ▾] [+ Phiên mới]      │
├───────────────────────────────────────────────────┬──────────────────────┤
│                                                   │ Nguồn đang sử dụng   │
│  AI  Tôi có thể hỏi đáp, tóm tắt hoặc tạo Quiz.  │ [Tìm PDF...]         │
│                                                   │ ☑ Cơ sở dữ liệu.pdf  │
│  Bạn  Tóm tắt trang 10–25 thành các ý chính.     │ ☑ Bài tập CSDL.pdf   │
│                                                   │ ☐ Thuật toán.pdf     │
│  AI  [Đang tóm tắt]                              │                      │
│      • Ý chính thứ nhất... [Trang 12]             │ 2 tài liệu đã chọn  │
│      • Ý chính thứ hai... [Trang 18]              │ [Chọn tất cả]        │
│                                                   │                      │
│  ┌─────────────────────────────────────────────┐  │                      │
│  │ Hỏi, yêu cầu tóm tắt hoặc tạo Quiz...       │  │                      │
│  │                                [Gửi ➜]      │  │                      │
│  └─────────────────────────────────────────────┘  │                      │
└───────────────────────────────────────────────────┴──────────────────────┘
```

Tỷ lệ desktop đề xuất: vùng chat `minmax(0, 1fr)`, Source Panel `300–320px`.

### 5.3. Empty state

Hiển thị ba nhóm prompt gợi ý, nhưng không biến thành ba chế độ bắt buộc:

```text
[Giải thích một khái niệm]
[Tóm tắt tài liệu]
[Tạo bộ câu hỏi ôn tập]
```

Ví dụ:

- “Giải thích ACID dựa trên tài liệu đã chọn.”
- “Tóm tắt trang 10–25 thành 7 ý chính.”
- “Tạo 15 câu trắc nghiệm khó về Transaction.”

### 5.4. Trạng thái tool minh bạch

Mỗi phản hồi có status chip nhỏ:

```text
[Hỏi đáp tài liệu]
[Đang tóm tắt]
[Đã tạo Quiz]
[Cần thêm thông tin]
[Không đủ bằng chứng]
```

Không hiển thị “Agent”, “tool call” hoặc tên node kỹ thuật.

### 5.5. Clarification card

Khi yêu cầu mơ hồ:

```text
┌───────────────────────────────────────────────┐
│ Tôi cần thêm thông tin để tạo Quiz            │
│                                               │
│ Số câu: [ 15 ]                                │
│ Phạm vi: (•) Toàn bộ  ( ) Chọn trang          │
│ Độ khó: [Trung bình ▾]                        │
│                              [Tiếp tục]        │
└───────────────────────────────────────────────┘
```

Không bắt người dùng viết lại toàn bộ prompt.

### 5.6. Kết quả tóm tắt

- Tiêu đề và phạm vi được tóm tắt.
- Nội dung theo bullet/section.
- Citation chip đặt ngay sau ý tương ứng.
- Nút **Sao chép**, **Tóm tắt ngắn hơn**, **Tạo Quiz từ cùng phạm vi**.
- Nút “Tạo Quiz từ cùng phạm vi” tạo một yêu cầu mới với source/page range hiện tại; không lấy văn bản summary làm evidence.

### 5.7. Kết quả tạo Quiz

Không hiển thị toàn bộ 15–30 câu trong bubble chat. Hiển thị Result Card:

```text
┌───────────────────────────────────────────────┐
│ ✓ Đã tạo bản nháp Quiz                        │
│ 15 câu · Khó · Trang 10–25                    │
│ Nguồn: 2 Personal PDF                         │
│ Trạng thái: Cần xem lại                       │
│                                               │
│ [Xem và duyệt Quiz]          [Tạo lại]        │
└───────────────────────────────────────────────┘
```

Nút **Xem và duyệt Quiz** mở route Review do Java quản lý.

### 5.8. Citation Drawer

Click citation chip mở drawer trong workspace:

```text
Nguồn trích dẫn
Tên tài liệu
Trang 12
Đoạn trích được sử dụng
[Mở tài liệu tại trang 12]
```

Không hiển thị embedding score, prompt nội bộ hoặc provider payload.

### 5.9. Mobile

- Source Panel chuyển thành bottom sheet.
- Header chỉ giữ tên phiên và nút nguồn có badge số lượng.
- Composer sticky ở đáy.
- Citation mở full-height bottom sheet.
- Result Card dùng nút full width.

## 6. Màn Student — Course Material PDF Viewer + AI Tutor

### Bố cục desktop

```text
┌──────────────────────────────────────────────────────────────────────────┐
│ ‹ Cơ sở dữ liệu / Bài 4     Trang 12/42       [Tải xuống nếu được phép] │
├──────────────┬──────────────────────────────────┬─────────────────────────┤
│ Thumbnail    │                                  │ [Ghi chú] [AI Tutor]   │
│ Trang 1      │          PDF PAGE               │                         │
│ Trang 2      │                                  │ Hỏi về trang hiện tại  │
│ Trang 3      │                                  │ hoặc tài liệu này...    │
│ ...          │                                  │                         │
├──────────────┴──────────────────────────────────┴─────────────────────────┤
│ [‹ Trang trước]                       [Trang sau ›]                      │
└──────────────────────────────────────────────────────────────────────────┘
```

### Quy tắc UX

- Tutor mặc định ưu tiên trang hiện tại nhưng có thể retrieval trong phạm vi Course Material được Java cấp.
- Citation dùng `Trang n`, không dùng `Slide n`.
- Tab Note và AI Tutor tách nhau để tránh chen chúc.
- `NO_EVIDENCE` có action **Thử hỏi theo cách khác**.
- Teacher không nhìn thấy panel AI Tutor trên viewer của Teacher.

## 7. Màn Teacher — Học liệu PDF

```text
┌──────────────────────────────────────────────────────────────┐
│ Học liệu PDF                          [Tải PDF lên]          │
├──────────────────────────────────────────────────────────────┤
│ Bài 4 - Transaction.pdf   READY   42 trang                  │
│ Public: CSDL 2026         [Xem] [Tạo Quiz] [Public ▾] [⋯]   │
└──────────────────────────────────────────────────────────────┘
```

- Chỉ nhận PDF.
- Nút **Tạo Quiz** mở AI Quiz Studio với document đã chọn.
- Không có nút Hỏi AI hoặc AI Tutor.
- Trạng thái indexing: `UPLOADING`, `PROCESSING`, `READY`, `FAILED`.

## 8. Màn Teacher — AI Quiz Studio

Thiết kế dạng stepper bốn bước để giảm lỗi:

```text
1. Chọn nguồn → 2. Cấu hình → 3. Xem lại → 4. Xuất bản
```

### Bước 1 — Chọn nguồn

- Chọn Course Offering.
- Chọn một hoặc nhiều Course Material PDF `READY`.
- Chọn toàn bộ tài liệu hoặc phạm vi trang.
- Hiển thị rõ document/version/page count.

### Bước 2 — Cấu hình

```text
Số câu                 [15]
Độ khó                 [Hỗn hợp ▾]
Chủ đề trọng tâm       [ACID và Isolation Level]
Yêu cầu bổ sung        [................................]

[Quay lại]                              [Sinh bản nháp]
```

- `questionCount` là trường bắt buộc và Teacher tự chọn.
- UI hiển thị min/max sau khi contract chốt.
- Không để prompt thay đổi loại `MCQ_SINGLE`, citation hoặc source scope.

### Bước 3 — Processing

```text
Đang tạo bộ câu hỏi
✓ Đã kiểm tra tài liệu
✓ Đã truy xuất nội dung
● Đang tạo và đối chiếu câu hỏi
○ Hoàn tất bản nháp
```

Nếu dùng async job, trang polling bằng `jobId`; reload không làm mất trạng thái.

### Bước 4 — Review

Mỗi Question Card gồm:

- Số thứ tự và trạng thái hợp lệ.
- Nội dung câu hỏi.
- Bốn lựa chọn.
- Đáp án đúng.
- Giải thích.
- Citation chip mở Evidence Drawer.
- Action **Sửa**, **Loại câu**, **Tạo lại câu** nếu contract hỗ trợ.

Thanh cuối trang:

```text
15 câu hợp lệ · 0 lỗi · 15 câu được chọn
[Lưu nháp] [Tạo lại toàn bộ] [Tiếp tục xuất bản]
```

### Publish modal

- Tên Quiz.
- Course Offering đích cố định theo ownership.
- Thời điểm mở/đóng nếu thuộc phạm vi backend.
- Xác nhận số câu được publish.
- Java thực hiện publish; AI không tự publish.

## 9. Component cần thiết kế

### Dùng chung

- `PageHeader`
- `PrimaryActionButton`
- `StatusBadge`
- `DocumentCard` / `DocumentRow`
- `SourceSelector`
- `PageRangePicker`
- `CitationChip`
- `EvidenceDrawer`
- `ProcessingSteps`
- `EmptyState`
- `ErrorState`
- `ForbiddenState`
- `Skeleton`
- `Toast`

### Personal Assistant

- `ConversationSwitcher`
- `ChatMessage`
- `AssistantCapabilityHint`
- `ToolStatusChip`
- `ClarificationCard`
- `SummaryResult`
- `QuizDraftResultCard`
- `ChatComposer`

### Teacher Quiz

- `QuizCreationStepper`
- `QuizConfigurationForm`
- `QuestionReviewCard`
- `QuizValidationSummary`
- `PublishQuizModal`

## 10. Hệ thống màu PTIT

- Đỏ PTIT `#D71920`: primary action, active navigation, focus accent.
- Đỏ đậm `#A80F18`: pressed state; không dùng hover làm phần tử dịch chuyển.
- Đỏ nhạt `#FFF1F2`: selected/important surface.
- Vàng `#F4C300`: cảnh báo nhẹ hoặc điểm nhấn có kiểm soát.
- Xanh lá nhạt: success/READY.
- Xanh dương nhạt: AI processing/information.
- Slate: nội dung, border và secondary action.

Chỉ nút hành động chính ở góc/header hoặc CTA kết thúc luồng dùng nền đỏ. Không biến mọi button thành màu đỏ; secondary và tertiary dùng outline/text để giữ hierarchy.

## 11. Trạng thái bắt buộc

| Màn hình | Trạng thái cần có |
|---|---|
| Personal Documents | empty, uploading, processing, ready, failed, delete confirmation |
| Personal Assistant | no source, empty conversation, routing, retrieving, summarizing, generating quiz, clarification, no evidence, error |
| PDF Viewer | loading page, missing artifact, forbidden, note saving, Tutor processing, no evidence |
| Teacher Quiz Studio | no document, invalid range, generating, retrying, insufficient evidence, review required, publish success/failure |

Mọi lỗi AI hiển thị `requestId` để hỗ trợ nhưng không hiển thị stack trace hoặc provider response.

## 12. Accessibility và responsive

- Thiết kế từ 360px.
- Focus visible cho mọi button, tab, citation và document selector.
- Status không chỉ phân biệt bằng màu; luôn có icon/text.
- Drawer/modal giữ focus trap và đóng bằng Escape.
- Chat message và processing status có `aria-live` phù hợp.
- PDF Viewer có điều khiển trang bằng bàn phím.
- Touch target tối thiểu khoảng 44px.
- Không dùng hover là cách duy nhất để lộ action.

## 13. Thứ tự thiết kế mock/Figma

1. Personal Document Assistant desktop.
2. Personal Document Assistant mobile.
3. Citation Drawer và Clarification Card.
4. Personal Documents list/upload states.
5. Course Material PDF Viewer + Note + Student AI Tutor.
6. Teacher Documents PDF-only.
7. Teacher AI Quiz Studio bốn bước.
8. Student Quiz Review sau khi tạo từ chatbot.
9. Loading/empty/error/forbidden/no-evidence states.
10. Prototype hai demo flow end-to-end.

## 14. Hai prototype flow cần dựng

### Flow A — Student Personal Assistant

```text
Chọn hai Personal PDF
→ mở Assistant
→ hỏi một câu
→ mở citation
→ yêu cầu tóm tắt trang 10–25
→ yêu cầu tạo 15 câu Quiz
→ bổ sung tham số trong Clarification Card
→ mở Quiz Review
→ accept vào Quiz cá nhân
```

### Flow B — Teacher Quiz

```text
Upload Course Material PDF
→ document READY
→ chọn Tạo Quiz
→ chọn trang/số câu/độ khó
→ theo dõi processing
→ review citation và chỉnh câu
→ publish vào Course Offering
```

## 15. Những phần không đưa vào giao diện

- Model/provider selector.
- API key.
- Agent trace kỹ thuật.
- Embedding/vector score.
- Multi-agent hoặc tên sub-agent.
- Teacher chatbot/Tutor.
- PPTX upload hoặc slide citation.
- AI chấm điểm hoặc tự publish Quiz.
- Nút cho phép AI tự lập kế hoạch học tập.

## 16. Điều kiện hoàn thành thiết kế

- Nhìn vào UI biết rõ source PDF nào đang được dùng.
- Student dùng một composer cho hỏi đáp, tóm tắt và tạo Quiz.
- UI luôn hiển thị hành động AI đã nhận diện.
- Quiz tạo trong chat chuyển sang Review, không làm trực tiếp trong bubble.
- Student Tutor và Teacher Quiz không bị trộn chức năng.
- Teacher không nhìn thấy chatbot hoặc AI Tutor.
- Citation mở được đúng tài liệu/trang.
- Desktop/mobile và toàn bộ trạng thái bất thường đều có thiết kế.
- Thiết kế giữ hệ PTIT đỏ–trắng nhưng có hierarchy, không tô đỏ tất cả control.
