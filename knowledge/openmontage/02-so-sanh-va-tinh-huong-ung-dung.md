# OpenMontage — So sánh với stack Sena và bài học áp dụng ngay

Mục tiêu: đặt OpenMontage cạnh **HyperFrames**, **Remotion** và **EditAtlas** để biết rõ phần nào trùng, phần nào bổ sung thực sự, và trích lọc các kinh nghiệm kỹ thuật hữu ích có thể dùng ngay mà chưa cần cài cả repo.

## 1. So sánh 4 công cụ trong bức tranh tổng thể

| Tiêu chí | HyperFrames *(chính)* | Remotion *(khi yêu cầu)* | EditAtlas *(bổ trợ)* | OpenMontage *(chưa cài)* |
| --- | --- | --- | --- | --- |
| **Bản chất** | Engine dựng video HTML/CSS/GSAP | Engine dựng video React | Kho tri thức MCP + 7 skill cục bộ + Web Studio | Studio sản xuất video đầu–cuối (monorepo độc lập) |
| **Điểm mạnh cốt lõi** | Motion graphics, poster động, kinetic type, registry ~450 block, kho HeyGen miễn phí | Video theo dữ liệu, component tái dùng, Studio interactivity, batch/app | Phân tích reference (`video-breakdown`), QA định lượng (`video-check`), tìm B-roll/SFX/nhạc, cắt talking-head | Điều phối 12 pipeline từ research → script → tạo ảnh/video/voice/nhạc đa provider AI → render + storyboard **Backlot** |
| **Hình thức tích hợp với Sena** | Plugin project scope + skill `hyperframes-sena` | Plugin project scope + skill `remotion-sena` | MCP `.omp/mcp.json` + 7 plugin project scope | **Không tích hợp vào repo Sena** — phải mở như workspace riêng |
| **Chi phí để phát huy hết sức mạnh** | $0 (kho HeyGen miễn phí) | $0 (Free License tổ chức ≤ 3 người) | $0 (lưu ý rủi ro bản quyền SFX) | **Tốn API trả phí** (~$0,15–$5+/video qua fal.ai, Kling, Veo, Runway, ElevenLabs, Suno…) mới khác biệt rõ |
| **Độ nặng ổ đĩa** | Nhẹ (CLI global + cache plugin) | ~1 GB mỗi project video | Rất nhẹ (vài MB script Python) | Nặng (~171 MB repo + ~1,5–2 GB venv & `remotion-composer`) |
| **Bản quyền** | Theo HeyGen/HyperFrames | Remotion License (Free ≤ 3 người) | Skills Apache-2.0; SFX không bảo đảm | **AGPL-3.0** |

## 2. Ma trận tình huống: khi nào dùng stack Sena vs khi nào mới cần OpenMontage?

| Tình huống công việc | Nên dùng gì? | Lý do |
| --- | --- | --- |
| **Motion poster, promo sản phẩm dùng ảnh thật, SaaS demo, video dọc social theo Figma/reference** | **Stack Sena (HyperFrames + EditAtlas)** | Kiểm soát từng pixel theo thiết kế, không tốn API gen, nhẹ, nhanh, duyệt preview và render cục bộ. |
| **Phân tích video mẫu, kiểm duyệt bản xuất, chọn B-roll/nhạc miễn phí, cắt talking-head** | **Stack Sena (EditAtlas + HyperFrames)** | Tích hợp gọn nhẹ cùng stack Sena, hỗ trợ tiếng Việt tốt. |
| **Phim AI nhiều cảnh (trailer, product film image-to-video, world showcase) dùng Kling / Veo 3.1 / Runway / Seedance / FLUX + giọng đọc + nhạc AI** | **OpenMontage (đáng cài khi bạn sẵn sàng dùng API trả phí)** | Tự động chọn provider theo điểm, lưu `resume_job` tránh gọi lặp mất tiền, khóa trần ngân sách (`cost_tracker`), và hiển thị ảnh/take từng cảnh trên **Backlot** để duyệt trước khi render. |
| **Video tài liệu / video essay từ footage thật miễn phí (Archive.org, NASA, Wikimedia, Pexels) cần tìm cảnh theo ngữ nghĩa (CLIP)** | **OpenMontage (`documentary-montage`)** | Pipeline tìm kiếm ngữ nghĩa theo corpus footage thật mà stack hiện tại của Sena chưa có sẵn. |
| **Cắt 1 video/podcast dài 1–2 giờ thành nhiều short xếp hạng theo độ hấp dẫn, hoặc dịch + lồng tiếng nhiều ngôn ngữ hàng loạt** | **OpenMontage (`clip-factory`, `podcast-repurpose`, `localization-dub`)** | Có sẵn pipeline chia lô, xếp hạng hook và xuất hàng loạt (dùng `remotion-composer` burn caption). |
| **Explainer hoạt hình vẽ tay nét mực trắng-đen có nhân vật que diễn hoạt (đi, nhảy, vẫy tay)** | **Tham khảo `ink-theater/` của OpenMontage chạy ngay trên HyperFrames** | Chạy hoàn toàn bằng HTML/SVG + GSAP + CMU mocap miễn phí, không cần video AI. *(Lưu ý kiểm license AGPL-3.0 trước khi chép mã nguồn sang dự án ngoài.)* |

## 3. Kinh nghiệm kỹ thuật HyperFrames rút ra từ OpenMontage (dùng được ngay)

Các điểm sau rút từ `skills/core/hyperframes.md` và `ink-theater/README.md` của OpenMontage (chưa chạy kiểm chứng đầy đủ mọi ca — coi là checklist phòng lỗi khi gặp tình huống tương ứng):

1. **Bẫy video nền nhỏ nằm giữa khung đen (Pexels/Pixabay):** nhiều clip stock miễn phí thực tế là 640×360 hoặc 960×540; nếu pre-process kiểu `force_original_aspect_ratio=decrease` + `pad` sẽ biến thành viền đen mà lỗi không nằm ở CSS. Dùng `ffprobe` kiểm nguồn trước, và scale-to-cover + crop:
   ```bash
   -vf "scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,unsharp=3:3:0.6"
   ```
2. **Video stock keyframe thưa (>5 s) gây lỗi `video_heavy_parallel_timeout` hoặc đóng băng frame khi render HyperFrames:** re-encode keyframe dày trước khi đưa vào project:
   ```bash
   ffmpeg -i input.mp4 -c:v libx264 -r 30 -g 30 -keyint_min 30 -sc_threshold 0 -movflags +faststart output.mp4
   ```
3. **Composition có >5 video nền chạy song song:** truyền `--workers 1` khi chạy `hyperframes render` để tránh quá tải Headless Chrome.
4. **Giữ chữ đọc rõ trên B-roll mà không làm đục video:** thay vì hạ `opacity` của video, giữ `filter: brightness(0.55) saturate(0.85)` trên video + thêm lớp gradient cục bộ (`scrim`) phía sau khối chữ + `text-shadow`.
5. **Bẫy subset font Google Fonts:** lấy 1 link `woff2` đầu tiên từ CSS2 API đôi khi chỉ trúng 1 `unicode-range` (thiếu latin/tiếng Việt) khiến chữ âm thầm rơi về font serif dù log vẫn báo đã load font → luôn nhúng file `.ttf`/`.woff2` đầy đủ bảng mã (đặc biệt quan trọng với dấu tiếng Việt).
6. **Chống "video trông như PowerPoint động" (Slideshow Risk — 6 chiều kiểm của OpenMontage):** tự rà 6 dấu hiệu trước khi giao: bố cục lặp lại, hình chỉ mang tính trang trí không mang nghĩa, chuyển động yếu, cảnh không có chủ đích quay/cắt, lạm dụng chữ thay hình, và hứa hiệu ứng điện ảnh nhưng nguồn chỉ là ảnh tĩnh.
