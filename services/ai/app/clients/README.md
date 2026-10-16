# Provider clients

`openrouter.py` dùng OpenAI-compatible SDK qua base URL được cấu hình trong Python. Hỗ trợ intent routing, hỏi đáp/tóm tắt, Quiz và embedding 1024 chiều. `structured_schema.py` đóng JSON Schema và chuẩn hóa mảng 4 options; kết quả vẫn được Pydantic và service kiểm tra lại.

`http_document_download.py` chỉ tải HTTPS từ origin của `STORAGE_ENDPOINT`, không theo redirect, có giới hạn dung lượng thực nhận. Signed URL không xuất hiện trong response polling.

`httpx` là dependency production trực tiếp vì downloader dùng HTTP streaming; trước đó chỉ nằm trong nhóm test. Việc này không thêm key phía FE/Java. Unit test dùng `httpx.MockTransport`, không gọi API thật.

Adapter chưa được smoke-test với model/tài khoản OpenRouter thật. Không tự thay model hoặc coi cấu hình mặc định là đã xác minh khả dụng.
