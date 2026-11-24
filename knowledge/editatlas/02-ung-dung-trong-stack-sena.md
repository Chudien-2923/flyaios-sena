# EditAtlas — Ứng dụng hợp lý trong stack của Sena

Mục tiêu: biết **lúc nào dùng EditAtlas thì hiệu quả rõ rệt**, **phối hợp thế nào với HyperFrames (công cụ mặc định) và Remotion (khi yêu cầu)**, và **lúc nào KHÔNG nên kéo EditAtlas vào** để tránh rườm rà hoặc dính rủi ro bản quyền.

## 1. Vai trò của 3 công cụ trong stack Sena

| Công cụ | Vai trò chính | Điểm mạnh nhất | Không dùng để |
| --- | --- | --- | --- |
| **HyperFrames** | **Engine dựng chính** | Motion graphics HTML/CSS/GSAP, SaaS demo, poster động, explainer, video dọc social, preview trình duyệt, kho media miễn phí HeyGen | Cắt thô talking-head dài nhiều take bằng speech-to-text, hoặc phân tích ngược video mẫu phức tạp |
| **Remotion** | **Engine dựng phụ** (dùng khi yêu cầu hoặc cần React/data động) | Video điều khiển bằng data/React, tái dùng component, Studio interactivity, batch/app | Tự chọn cho job chung khi HyperFrames đã đáp ứng gọn hơn |
| **EditAtlas** | **Kho tri thức + bộ 7 công cụ xử lý/QA bổ trợ** | Phân tích video mẫu (nhịp, shot, transition, beat), tra 2.013 kỹ thuật/công thức dựng & FFmpeg, QA định lượng + phone sheet, thiết kế âm thanh SFX theo frame, lọc B-roll/nhạc có đo đạc, cắt talking-head + transcribe cục bộ | Thay thế HyperFrames làm engine dựng motion graphics phức tạp từ đầu |

## 2. Ma trận tình huống: khi nào dùng phần nào của EditAtlas?

| Tình huống công việc | Nên dùng EditAtlas? | Cách dùng đúng trong luồng Sena |
| --- | --- | --- |
| **Người dùng gửi video mẫu** bảo *"phân tích / clone / làm giống video này"* | **Rất nên** (`video-breakdown` + MCP `search_techniques`) | Tải video bằng `yt-dlp` → chạy `video-breakdown/scripts/analyze.py` (đo nhịp chuyển động, shot, transition, timing chữ, beat) → mở ảnh frame nhìn trực tiếp → tra tên kỹ thuật chuẩn qua MCP → chuyển thành `SPEC.md` rồi dựng bằng **HyperFrames** (hoặc Remotion). Khi dựng xong, dùng `compare.py` của `video-breakdown` đối chiếu bản làm lại với bản mẫu. |
| **Cần tìm ý tưởng hiệu ứng / công thức chuyển cảnh / cách dựng một loại video** | **Nên** (MCP `get_workflow`, `search_techniques`, `search_templates`, `list_styles`) | Gọi `get_workflow(video_type=...)` để kiểm cấu trúc/nhịp chuẩn và danh sách điều cần tránh; dùng `search_techniques` để tìm đúng tên kỹ thuật + thông số tham khảo (timing, easing, FFmpeg filter). Coi là tài liệu tham khảo, không máy móc áp 100%. |
| **Kiểm tra chất lượng bản xuất trước khi giao** | **Rất nên** (`video-check`) | Chạy `video-check/scripts/check.py --type <loại>` để đo thông số file, khung đen/đóng băng/lệch cắt 1 frame, độ lớn chữ cho màn điện thoại, LUFS/peak/đứt âm đột ngột và tạo phone-size frame sheet. Kết hợp chuẩn kiểm bản giao của Sena (`ffprobe` + tự mở ảnh nhìn + báo rõ "đã đo, chưa nghe"). |
| **Video đã dựng xong hình nhưng bị "trống tiếng", cần đặt SFX đúng điểm đánh (hit/whoosh/UI)** | **Nên cân nhắc** (`sound-design` + MCP `search_sfx`) | `sound-design` đo các điểm chuyển cảnh/chuyển động (`moments.py`), tính nhịp nhạc (`beat_grid.py`), đặt SFX chuẩn tới từng frame (`mix.py`) và kiểm sync/LUFS (`check.py`). **Lưu ý bản quyền:** nếu là dự án thương mại/quảng cáo cần bản quyền sạch, chỉ dùng script `moments.py` / `beat_grid.py` / `mix.py` với **file SFX từ kho HeyGen miễn phí hoặc kho riêng**, thay vì tải SFX không bảo đảm bản quyền của EditAtlas. |
| **Cần tìm nhanh B-roll (Pexels/Pixabay) hoặc nhạc nền cho voiceover** | **Nên** (`media-picker` + MCP `search_videos`/`search_music`/`search_photos`) | Dùng `media-picker` để đo rung máy, độ mất khung khi crop 9:16, nhịp nhạc và xem contact sheet trước khi chèn; luôn kèm `author` + `credit_url` và cảnh báo YouTube Content ID. So sánh với kho HeyGen miễn phí để chọn phương án ít rủi ro nhất. |
| **Clip quay mặt nói (talking-head / vlog / bài giảng / voiceover thô) cần cắt lỗi nói lặp, khoảng lặng, "ờ ừm", làm phụ đề** | **Rất nên** (`transcribe` + `talking-head-cut`) | Cần người dùng duyệt cài `faster-whisper` lần đầu (tải ~300 MB + model 0,5–1,6 GB). Sau đó xử lý hoàn toàn offline trên máy: trích lời từng từ → đánh dấu take hỏng/lặp/khoảng lặng → cắt sạch đúng điểm im lặng → phiên âm lại để kiểm tra không mất chữ. *(Nếu video dài và bạn đã có sẵn file SRT nguồn, ưu tiên dùng SRT đó thay vì chờ Whisper chạy lâu.)* |
| **Bàn giao bản ghép clip + chữ + âm thanh đơn giản để người dùng tự đẩy nhẹ text/SFX trên trình duyệt** | **Tùy chọn** (`editable-export` + `edit.trysometh.ing/studio`) | Chỉ đề nghị khi video được lắp ghép từ clip/text/caption/SFX rời (kiểu FFmpeg/talking-head). **Không cần** cho project HyperFrames hoặc Remotion vì đã có sẵn Preview / Remotion Studio cục bộ (và hiệu ứng HTML/CSS/GSAP/React render cứng vào clip thì EditAtlas Studio cũng không chỉnh được). |

## 3. Khi nào KHÔNG nên dùng EditAtlas?

1. **Dựng motion graphics HTML/CSS/GSAP giàu hiệu ứng (poster động, SaaS UI animation, typography phức tạp):** dùng thẳng **HyperFrames** (hoặc **Remotion** khi yêu cầu). Chỉ lấy EditAtlas làm nơi tra từ vựng kỹ thuật, `video-breakdown` lúc phân tích mẫu, và `video-check` lúc kiểm file xuất.
2. **Sửa nhỏ 1 dòng chữ, đổi màu, đổi ảnh trong project đã có:** sửa trực tiếp trong project; không cần gọi `get_workflow` hay chạy cả vòng EditAtlas gây chậm.
3. **Cần SFX có bảo chứng pháp lý rõ ràng cho chiến dịch thương mại lớn:** không lấy file từ `EditAtlas/sfx` mà chưa có xác nhận chấp nhận rủi ro từ người dùng.
4. **Cần dựng theo gu riêng đã chốt:** luôn ưu tiên quy ước trong [[USER]], [[MEMORY]] và `memory/<ten-kenh>.md`; template/style của EditAtlas không được đè quy chuẩn riêng của người dùng.
5. **Tải video từ TikTok/YouTube/Pinterest:** các skill của EditAtlas không tự tải video từ nền tảng — bước tải dùng `yt-dlp` cục bộ (hoặc file video người dùng đưa trực tiếp) theo [[MEMORY]].

## 4. Phối hợp thực chiến đề xuất

### Luồng A — Học theo video tham chiếu → Dựng bằng HyperFrames
1. Tải video mẫu bằng `yt-dlp`.
2. Chạy `video-breakdown/scripts/analyze.py` (với `EDITATLAS_TELEMETRY=0`) → mở `overview.png` và `shots_*.png` nhìn thật.
3. Gọi MCP `search_techniques` nếu cần gọi đúng tên hiệu ứng/chuyển cảnh và lấy công thức easing/timing.
4. Chốt hướng & `SPEC.md` với người dùng → dựng trên **HyperFrames** (mở preview và xuất file theo chế độ render trong [[USER]]).
5. Khi có file render: chạy `video-check/scripts/check.py` + `video-breakdown/scripts/compare.py` để so trực tiếp với video mẫu.

### Luồng B — Biên tập clip talking-head / vlog quay thật
1. `transcribe` → trích lời word-level + danh sách khoảng lặng/nói lặp (sau khi người dùng duyệt cài `faster-whisper`).
2. `talking-head-cut` → người dùng chọn đoạn giữ/bỏ → cắt sạch và xác minh lại lời.
3. `media-picker` → chọn B-roll/nhạc nền đã kiểm chất lượng + ghi nguồn credit.
4. `sound-design` → thêm điểm nhấn SFX đúng frame (kiểm rõ bản quyền nguồn SFX).
5. `video-check` → kiểm lỗi hình/tiếng/chữ trên khung điện thoại trước khi giao.
6. Nếu người dùng muốn tự kéo nhẹ caption/SFX: đóng gói `editable-export` mở tại EditAtlas Studio.
