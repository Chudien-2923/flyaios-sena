# EditAtlas — 15 Tool MCP và REST API

Endpoint MCP: `https://edit.trysometh.ing/mcp` (Streamable HTTP, không cần API key).
Endpoint REST API: `https://edit.trysometh.ing/api/v1/*` (GET, không cần API key — dùng khi cần tra trực tiếp bằng `curl`/script ngoài MCP).

## 1. Bản đồ 15 tool MCP (`*` = tham số bắt buộc)

| Nhóm | Tool | Tham số chính | Ghi chú sử dụng |
| --- | --- | --- | --- |
| **Quy trình & Skill** | `get_workflow` | `video_type`, `include_workflow` | Gọi đầu tiên trước khi lên kế hoạch edit. Nếu video lai 2 loại, gọi lần 2 với `include_workflow: false`. |
| | `get_skill` | `name`, `library`, `include_instructions` | Liệt kê 7 skill hoặc xem bản mới nhất + hướng dẫn cập nhật. |
| **Kỹ thuật dựng** | `search_techniques` | `query*`, `category`, `limit`, `offset` | 2.013 kỹ thuật. `category`: `audio`, `broll`, `captions`, `color`, `delivery`, `editing`, `footage`, `motion`, `story`, `transition`, `vfx`. Trả về `variants` và `pick_when` khi dễ nhầm. |
| | `get_technique` | `slug*` | Lấy prompt đầy đủ + thông số. Kiểm tra `has_tested_ffmpeg` (chỉ `true` khi EditAtlas đã chạy thử lệnh FFmpeg đó) và `often_confused_with`. |
| **Templates & Styles** | `search_templates` | `query*`, `category`, `tag`, `technique`, `template_type`, `aspect_ratio`, `duration_s`, `difficulty`, `limit`, `offset` | 22 template cấu trúc video có version cố định + `verification` (`editorially_reviewed`, `externally_tested`, `schema_validated`). |
| | `get_template` | `id*`, `version` | Đọc inputs bắt buộc/tùy chọn, fallback khi thiếu input, beat có điều kiện và tiêu chí kiểm tra. |
| | `get_template_bundle` | `id*`, `version`, `style_id`, `style_version`, `detail` | Gộp template + style tương thích + danh sách kỹ thuật/SFX công khai. Giới hạn tối đa **40 bản ghi / 96 KiB**; báo lỗi rõ nếu style không tương thích. |
| | `list_styles` | `query`, `limit`, `offset` | 56 visual style (typography, màu, nhịp, motion, âm thanh) kèm `preview_url`. |
| | `get_style` | `id*`, `version` | Đọc ràng buộc sáng tạo và điều kiện tương thích của một style. |
| **Âm thanh (SFX)** | `search_sfx` | `query*`, `category`, `duration`, `limit`, `offset` | **Hỗ trợ cả tiếng Việt và tiếng Anh.** `category`: `ambience`, `bell`, `cartoon`, `foley`, `glitch`, `impact`, `magic`, `music`, `nature`, `riser`, `scifi`, `ui`, `voice`, `whoosh`. `duration`: `tick` (<0,5 s), `short` (0,5–2 s), `medium` (2–5 s), `long` (≥5 s). Dưới lời nói ưu tiên `tick`/`short`. |
| | `get_sfx` | `id*` | Lấy `sha256`, `download_url`, `github_download_url` (`EditAtlas/sfx`) và `guide` (đặt tại frame nào, mức âm bao nhiêu dựa trên waveform/LUFS). |
| **Nhạc & Stock** | `search_music` | `query`, `genre`, `duration`, `page` | **Bắt buộc tiếng Anh, 2–4 từ** (dài >50 ký tự bị nguồn cắt/trả sai). `duration`: `0-30`, `30-120`, `120-240`, `240-480`. Kiểm tra `has_youtube_content_id`, `is_ai_generated`; không có BPM sẵn → dùng `sound-design/scripts/beat_grid.py`. |
| | `search_photos` | `query*`, `source`, `orientation`, `page`, `per_page` | **Tiếng Anh.** Nguồn `pexels` (mặc định) hoặc `pixabay` (Pixabay không lọc được `square`, link ảnh hết hạn ~1 ngày). Luôn giữ `author` + `credit_url`. |
| | `search_videos` | `query*`, `source`, `orientation`, `page`, `per_page` | **Tiếng Anh.** `orientation`: `all`, `landscape`, `portrait` (cho 9:16), `square` (Pixabay không lọc được hướng). Chọn size trong `video_files` khớp độ phân giải video đang dựng. |
| **Ghi dữ liệu** | `send_feedback` | `kind*`, `id*`, `result*`, `about`, `issue`, `note`, `agent_note` | **DUY NHẤT không read-only.** **Sena KHÔNG tự gọi** khi người dùng chưa yêu cầu vì dữ liệu có thể dùng để train AI model (xem `01-setup-quyen-va-gioi-han.md`). |

## 2. 11 `video_type` của `get_workflow`

`talking_head` · `short_vertical` · `product_ad` · `product_review` · `food_review` · `explainer` · `tutorial` · `vlog_travel` · `podcast_clip` · `story_short_film` · `event_recap`.

Các số liệu nền đáng lưu ý từ `get_workflow` chung (tham khảo, không ép cứng cho mọi brand):
- Đường cong easing khởi điểm: xuất hiện/wipe `cubic-bezier(0.16, 1, 0.3, 1)`; trượt tăng tốc rồi lướt `cubic-bezier(0.7, 0, 0.2, 1)`; whip `cubic-bezier(0.85, 0, 0.15, 1)`.
- Thời gian giữ title sau khi vào xong: tối thiểu `số_ký_tự / 15 + 1.5 s`.
- Cú đánh (hit): lùi đà ~1/4 quãng đường, đổi hình dứt khoát đúng frame đánh, dừng nhẹ 0,03–0,2 s rồi xả đà, đỉnh âm thanh khớp đúng frame đó.

## 3. Quy tắc tải file an toàn & dự phòng

- **SFX:** thử `download_url` → nếu lỗi (403/timeout) dùng `github_download_url` → nếu vẫn lỗi, sparse-checkout từ `https://github.com/EditAtlas/sfx.git` (`--depth 1 --filter=blob:none --sparse`). Luôn đối chiếu `sha256` từ `get_sfx`.
- **Template + Style:** tuân thứ tự ưu tiên: (1) Brief & dữ kiện người dùng xác nhận → (2) Ràng buộc cứng của Template → (3) Gợi ý thẩm mỹ của Style tương thích. Nếu Style xung đột với Template thì báo người dùng, không âm thầm ghi đè.

## 4. REST API (dự phòng khi cần tra nhanh bằng `curl`)

- `GET /api/v1/techniques?q=&category=&family=&limit=&offset=` và `/api/v1/techniques/:slug`
- `GET /api/v1/sfx?q=&category=&duration=&limit=&offset=` và `/api/v1/sfx/:id`
- `GET /api/v1/templates?...`, `/api/v1/templates/:id?version=`, `/api/v1/templates/:id/bundle?version=&style_id=&style_version=&detail=`
- `GET /api/v1/styles?q=&limit=&offset=` và `/api/v1/styles/:id?version=`
- `GET /api/v1/demos` và `GET /api/v1/stats`
