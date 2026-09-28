# Claude — Hướng dẫn làm việc trong StudyFlow

## 1. Quy tắc bắt buộc

1. Đọc `AGENTS.md` ở root trước mọi nhiệm vụ và chọn đúng một vai trò.
2. Gọi người dùng là **sếp** và trao đổi bằng tiếng Việt.
3. Không đọc, in hoặc sửa `.env`, secret, credential, key, log, upload thật hay vùng cấm trong `AGENTS.md`.
4. Bảo toàn working tree của sếp; không reset/restore file ngoài nhiệm vụ.
5. Chỉ commit/push khi sếp yêu cầu rõ trong lượt hiện tại.
6. Phân biệt thiết kế, cấu trúc dự kiến, code đã có và kết quả đã kiểm chứng; không báo hoàn thành dựa trên mock hoặc kế hoạch.

## 2. Bàn giao và cách đọc báo cáo

Đọc [bàn giao tổng thể](ban-giao-du-an-claude.md) để nắm trạng thái dự án. Báo cáo đã tách thành từng chương tại [mục lục báo cáo](docs/bao-cao/README.md):

- Công việc Chương 1: chỉ đọc `docs/bao-cao/chuong-1-tong-quan-de-tai.md` và nguồn liên quan đến phạm vi.
- Công việc Chương 2: chỉ đọc `docs/bao-cao/chuong-2-phan-tich-va-thiet-ke-he-thong.md` cùng API/CSDL/architecture khi cần.
- Công việc Chương 3: chỉ đọc `docs/bao-cao/chuong-3-thiet-ke-chi-tiet-va-cai-dat.md`, kế hoạch AI/API/CSDL liên quan và sơ đồ Chương 3.
- Không đọc cả ba chương nếu nhiệm vụ chỉ thuộc một chương.

## 3. Kiến trúc và nghiệp vụ cốt lõi

- `Next.js → Java Spring Boot → Python FastAPI`.
- Java là system of record, sở hữu schema `app`, phân quyền, Quiz lifecycle/scoring, progress và plan.
- Python sở hữu schema `ai`/pgvector, parsing, indexing, retrieval, RAG, citation và Quiz draft.
- Frontend chỉ gọi Java. Java tạo authorized scope và revalidate output Python.
- RAG/Tutor thiếu bằng chứng trả `NO_EVIDENCE`; citation phải đúng document/version/trang hoặc slide.
- Quiz lấy Personal Documents + prompt tự do, không phụ thuộc chat; `MCQ_SINGLE` có đúng bốn lựa chọn và một đáp án.
- Student review/accept trước khi làm; mỗi lượt làm tạo attempt mới; Java chấm điểm.
- Dashboard chứa toàn bộ progress; không có route Progress độc lập.
- Teacher PDF chỉ download; Teacher PPTX có Viewer/Note/Tutor cho Student `APPROVED`; Personal Document chỉ PDF có text.
- Không triển khai Topic Mastery, Teacher Quiz, recommendation, DOCX/OCR, XP/badge/leaderboard trong MVP.

## 4. Quy tắc tài liệu và kiểm chứng

- API wire shape lấy từ `docs/api-plan.md`; dữ liệu lấy từ `docs/database-plan.md`; nghiệp vụ lấy từ `AGENTS.md` và specification hiện hành.
- Không tự đặt endpoint, bảng hoặc trạng thái mới. Thay contract phải đồng bộ tài liệu và test hai phía.
- Sơ đồ/mocks không phải ảnh chạy thật. Không ghi KPI đạt, API hoàn thành hay test pass khi chưa có log tái lập được.
- Sơ đồ báo cáo nằm trong `docs/diagrams/chuong-1/`, `chuong-2/`, `chuong-3/`; khi sửa flow phải cập nhật cả SVG và Mermaid.
- Chương 3 hiện mô tả cấu trúc triển khai mục tiêu; các mục kết quả thực tế vẫn chờ source, test và screenshot.
- Không tự chạy Docker, migration, API trả phí hoặc model thật chỉ vì tiếp nhận bàn giao.

## 5. Kết thúc một nhiệm vụ

Báo cáo: phạm vi; file thay đổi; test/validation đã chạy; contract bị ảnh hưởng; rủi ro và việc còn lại. Function/API mới phải có contract args/input/output/errors theo `AGENTS.md`.
