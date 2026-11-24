# EditAtlas — Cài đặt, bản quyền, riêng tư và giới hạn

Nguồn: `edit.trysometh.ing/{docs/mcp,terms,privacy,animation-styles}`, `EditAtlas/skills` (`README.md`, `.claude-plugin/marketplace.json`, `skills/index.json`).

## 1. Cấu hình MCP và 7 skill

Quy trình cài đặt đầy đủ cho từng Agent Harness (OMP, Claude Code, Antigravity CLI, Cursor/Codex) nằm tại [[SETUP]]:

- **MCP server `editatlas`:** kiểu Streamable HTTP, URL `https://edit.trysometh.ing/mcp`, không cần API key hay OAuth.
  - OMP: khai báo sẵn trong `.omp/mcp.json` (đặt `"instructions": false` để tránh nạp chuỗi hướng dẫn dài ~3 KB vào mọi lượt không dùng EditAtlas và tránh gợi ý tự gọi `send_feedback`).
  - Claude Code: khai báo sẵn trong `.mcp.json`.
  - Antigravity CLI: cấu hình theo [[SETUP]] bước 4 (`.agents/mcp_config.json` hoặc `agy mcp add`).
- **7 skill từ `EditAtlas/skills` (Apache-2.0, release `v0.27.0`):**
  - `editable-export` (`0.6.0`)
  - `media-picker` (`0.3.2`)
  - `sound-design` (`0.4.4`)
  - `talking-head-cut` (`0.3.2`)
  - `transcribe` (`0.3.2`)
  - `video-breakdown` (`0.5.2`)
  - `video-check` (`0.3.2`)
  - Lưu ý: một số trình quản lý plugin hiển thị `"version": "0.0.0"` do `marketplace.json` upstream không khai báo trường `version` từng plugin. Phiên bản thật đọc ở đầu từng `SKILL.md` (`This is <name> <version>`).

## 2. Yêu cầu môi trường (macOS, Windows, Linux)

Kiểm tra nhanh bằng `node scripts/doctor.mjs`:

| Thành phần | Mức độ | Skill cần | Ghi chú |
| :--- | :--- | :--- | :--- |
| **Python ≥ 3.9** | Bắt buộc | Cả 7 skill | macOS: `python3`; Windows: `py -3` hoặc `python` |
| **FFmpeg / FFprobe** (trong `PATH`) | Bắt buộc | Cả 7 skill | macOS `brew install ffmpeg`; Windows `winget install Gyan.FFmpeg` |
| **`numpy` và `Pillow`** | Bắt buộc (nhẹ) | 4 skill mặc định: `video-breakdown`, `video-check`, `sound-design`, `media-picker` | Đối chiếu trực tiếp từ `SKILL.md` của 4 skill; không cần cài thêm `opencv`/`scipy`/`librosa` |
| **`faster-whisper`** (~300 MB + model HF 0,5–1,6 GB) | **Tùy chọn** (chỉ cài khi cần) | `transcribe`, `talking-head-cut` | Hỏi xác nhận người dùng trước khi cài |
| **`playwright` + `cryptography`** | **Tùy chọn** (chỉ cài khi cần) | Chỉ `editable-export/scripts/render.py` và `share.py` | `package.py` đóng gói không cần 2 gói này |

## 3. Bản quyền & rủi ro pháp lý

| Tài nguyên | Quyền sử dụng | Rủi ro / bắt buộc tuân thủ |
| --- | --- | --- |
| Techniques, prompts, templates, styles | Miễn phí cho mọi mục đích, kể cả thương mại/client | Không bảo đảm không lỗi (`as is`). |
| 7 EditAtlas Skills (`EditAtlas/skills`) | Mã nguồn mở **Apache-2.0** | Dùng tự do, giữ thông báo bản quyền theo Apache-2.0. |
| **SFX library (2.278 file)** | Được tải về ghép vào video của bạn | **EditAtlas KHÔNG sở hữu toàn bộ SFX, KHÔNG cấp license và KHÔNG bảo đảm bản quyền** (*no licence, no warranty*). Cấm bán/chia sẻ lại dạng gói âm thanh. Với dự án thương mại/ads/client: cần báo rõ rủi ro hoặc dùng nguồn có quyền rõ (kho HeyGen miễn phí, asset riêng). |
| **Music, stock video, stock photo** | Lấy từ **Pixabay** hoặc **Pexels** theo điều khoản gốc của hai trang | Luôn ghi lại `author` và `credit_url`. Với nhạc YouTube: cảnh báo nếu `has_youtube_content_id: true`; ngay cả khi `false` vẫn giữ tên bài + tác giả + `mp3_url` để khiếu nại nếu bị dính claim. Link ảnh Pixabay hết hạn trong ~1 ngày. |
| **Animation styles packs** (7 gói: Text mode, 16-bit pixel, 90s low poly, Old reel, Ink silhouette, Cardboard craft, Plasticine) | Miễn phí khi đăng nhập Google (tạo tài khoản EditAtlas), được dùng cho việc thương mại/client | **Không phải open source**; cấm chia sẻ/publish lại gói hoặc link tải (link tải chỉ sống 15 phút / 3 lượt). Người dùng tự đăng nhập nếu muốn tải (Sena không tự đăng nhập). |

## 4. Quyền riêng tư, dữ liệu và telemetry

- **Footage & media:** không bao giờ upload lên server EditAtlas; agent xử lý cục bộ trên máy người dùng, Studio chạy cục bộ trong trình duyệt.
- **Lịch sử tìm kiếm MCP:** EditAtlas lưu từ khóa tìm kiếm, filter, ID kết quả và mục được mở trong **60 ngày** (dưới hashed session ID + tên client). **Quy tắc:** chỉ viết từ khóa mô tả hiệu ứng/âm thanh/cảnh chung, **tuyệt đối không gõ tên người, tên khách hàng, số liệu nội bộ hay PII vào query**.
- **`send_feedback`:** mọi feedback gửi qua tool `send_feedback` (kể cả ghi chú agent viết kèm) **có thể được EditAtlas dùng để huấn luyện/kiểm thử AI model**. **Quy tắc Sena:** mặc định **KHÔNG gọi `send_feedback`**; chỉ gọi khi người dùng yêu cầu rõ ràng và chỉ truyền đánh giá chung, không kèm dữ liệu khách hàng.
- **Telemetry của script skill:** khi script chính kết thúc (`analyze.py`, `check.py`, `mix.py`, `measure.py`, `transcribe.py`, `render.py`, `package.py build`), nó gửi 4 trường: `{"skill", "version", "result", "seconds"}` (lưu tổng theo ngày 180 ngày, không gửi tên file/đường dẫn/media). Tắt hoàn toàn bằng biến môi trường **`EDITATLAS_TELEMETRY=0`**.
- **EditAtlas Studio & Google Drive:** nếu người dùng tự chọn lưu lên Google Drive từ Studio, file đi thẳng từ trình duyệt sang Drive (khóa mã hóa nằm ở trình duyệt + Drive). **Lưu ý:** link chia sẻ Studio mở được cho bất kỳ ai có link, không thu hồi được nếu người khác đã copy.

## 5. Mức độ kiểm chứng thực tế

- **Theo EditAtlas công bố (`docs/mcp`):**
  - 321 lệnh FFmpeg chạy thử trên video/tone sinh tự động; 226 công thức hình ảnh kiểm 1 frame; 133 demo render trên phim mẫu.
  - **Chưa chạy thử:** các hướng dẫn Remotion, Three.js, shader và Blender.
  - **Chưa có editor chuyên nghiệp thẩm định** toàn bộ prompt trên job thực tế.
  - **SFX mới đo tự động bằng máy** (LUFS, peak, attack, tail), chưa có người nghe duyệt toàn bộ.
- **Mức kiểm chứng của Sena:**
  - Đã probe MCP server `https://edit.trysometh.ing/mcp` (15 tool: `get_workflow`, `get_skill`, `search_techniques`, `search_sfx` tiếng Việt, `search_templates` trả JSON hợp lệ).
  - Đã chạy smoke `video-check/scripts/check.py` và `video-breakdown/scripts/analyze.py` với `EDITATLAS_TELEMETRY=0` trên clip mẫu 1080×1920 3 giây.
  - Chưa chạy thử đầy đủ trên job dài: `sound-design`, `media-picker`, `transcribe`, `talking-head-cut`, `editable-export` và EditAtlas Studio.
