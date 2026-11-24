# HyperFrames — Tổng quan, setup môi trường và chi phí

Nguồn: tài liệu chính thức `hyperframes.heygen.com` (`introduction`, `quickstart`, `faq`, `guides/plugins`, `guides/skills`, `guides/mcp`, `studio-app/*`), mã nguồn `heygen-com/hyperframes` và kiểm thử smoke cục bộ.

## HyperFrames là gì

- Framework mã nguồn mở (Apache-2.0) của HeyGen: **viết HTML/CSS/JS → render ra video**. Renderer mở Chrome headless, **seek** (tua chính xác) timeline đang pause tới từng frame rồi chụp, FFmpeg encode → cùng input luôn ra cùng frame (deterministic — tất định), máy chậm không rớt frame.
- Một video = **một project folder** (đặt ngoài repo Sena): `index.html` (root composition — bố cục gốc), `compositions/` (mỗi scene một file), `assets/` (media, font). Agent, browser editor và Studio app cùng làm việc trên các file này.
- Animation chính bằng **GSAP**; hỗ trợ CSS, Lottie, Three.js, Anime.js, WAAPI, canvas/WebGL qua adapter.
- So với Remotion (React): HyperFrames không cần build step, tận dụng trực tiếp HTML/CSS/web có sẵn, agent viết + người dùng chỉnh được ngay trên browser; Remotion hợp khi cần React và hệ sinh thái component/dữ liệu động. Chuyển project Remotion → HyperFrames: skill `remotion-to-hyperframes`.

## Bốn bề mặt làm việc

| Bề mặt | Là gì | Cách Sena dùng |
| --- | --- | --- |
| **CLI** `hyperframes` | Tạo, kiểm, chụp frame, sửa timeline, preview, render, share | Mặc định cho mọi job (qua launcher plugin hoặc CLI khớp bản) |
| **Browser editor** (`preview`) | Studio chạy trên trình duyệt: canvas, timeline, keyframe, audio mix, captions, export | Kiểm URL trả 200 OK rồi gửi người dùng xem/sửa tay |
| **Studio desktop app** | App macOS/Windows/Linux kèm agent "Framey", preview, Script panel, brand kit | Người dùng tự chọn cài nếu thích; không bắt buộc |
| **Hosted MCP connector** (beta) | `https://mcp.heygen.com/mcp/hyperframes/` cho Claude.ai/ChatGPT web | Không dùng trong workflow cục bộ (chỉ MP4 mặc định, không có project folder) |

## Setup plugin và cách chạy CLI (đa harness, macOS & Windows)

- Plugin `heygen-com/hyperframes` được cài qua [[SETUP]] theo đúng harness (OMP, Claude Code, Antigravity CLI, hoặc `npx skills add -g` cho nhánh dự phòng). Không nhúng cứng vendor vào repo Sena.
- Plugin bundle 9 skill: `hyperframes`, `hyperframes-cli`, `hyperframes-registry`, `media-use`, `reverse-any-video` (Pro), `style-sampling` (Pro), `figma`, `slideshow`, `remotion-to-hyperframes`.
- **Cách chạy CLI qua launcher plugin:**
  ```bash
  node "<PLUGIN_ROOT>/skills/hyperframes/scripts/plugin-cli.mjs" <command> <args>
  ```
  Launcher (`plugin-cli.mjs`) hỗ trợ cả macOS, Windows (`win32`, `windows-exe-search.mjs`) và Linux; nó chạy đúng phiên bản manifest plugin, tắt auto-install skill và chặn chạy CLI cũ hơn mức sàn bảo mật (`CLI_FLOOR >= 0.9.68`).
- Khi plugin vừa ra phiên bản mới trên GitHub trước khi kịp phát hành lên npm vài giờ, có thể dùng CLI global `hyperframes` dự phòng nếu `hyperframes --version` khớp (hoặc release notes không đổi lệnh/flag đang dùng) và báo rõ cho người dùng.
- **Không** chạy `npm run render`/script lạ của project trừ khi người dùng gọi tên lệnh đó. Trong workflow plugin không chạy `hyperframes skills update`/`skills check`; cập nhật qua trình quản lý plugin khi người dùng đồng ý.

## Yêu cầu môi trường tối thiểu

Kiểm tra nhanh bằng `node scripts/doctor.mjs`:

| Mục | Yêu cầu | Ghi chú |
| --- | --- | --- |
| **Node.js** | **≥ 22** (bắt buộc) | `hyperframes` khai báo `engines.node >= 22` |
| **FFmpeg / FFprobe** | Bắt buộc trong `PATH` | Dùng để encode và kiểm tra file render |
| **Chrome headless-shell** | HyperFrames tự tải vào cache lần đầu | Không gắn vào Chrome cá nhân của người dùng |
| **Dung lượng ổ đĩa** | Nên dư ≥ 10 GB cho cache Chrome + media/render 1080p/4K | Đặt project video ở ổ rộng ngoài repo Sena |
| **Kokoro TTS (tùy chọn)** | Không cài mặc định (`pip install kokoro-onnx soundfile`) | **Chưa hỗ trợ tiếng Việt**; chỉ cài khi làm tiếng Anh/ngôn ngữ hỗ trợ và người dùng duyệt |
| **HeyGen CLI** (`≥ v0.3.0`, tùy chọn) | Chỉ cần nếu muốn dùng kho tài nguyên HeyGen miễn phí | Cài và đăng nhập miễn phí theo lựa chọn của người dùng |

## Chi phí: miễn phí vs trả tiền

| Miễn phí, local, không cần tài khoản | Cần đăng nhập HeyGen (gói Free miễn phí) | Tốn credit / gói trả phí |
| --- | --- | --- |
| Render local không giới hạn, preview, browser editor | Kho nhạc 10k+ track, ảnh/icon 75k+, SFX HeyGen (`credits: 0`) | Voice HeyGen ngoài quota, clone giọng, avatar presenter |
| `tts` Kokoro (nếu cài), `transcribe` cục bộ | Voice Turbo 3 phút/tháng (Free plan) | Ảnh/nhạc/clip AI generate (Video 1, H3 Max, Seedance) |
| `remove-background` (chỉ người), `media-treatment` | `cloud render` (theo credit), `share` link review (5 project miễn phí/workspace) | Studio Pro; `reverse-any-video`, `style-sampling` (HyperFrames Pro) |
| SFX bundled + Openverse (CC BY — ghi credit) | Studio desktop app (đăng nhập free) | Reference video trong Studio (Pro hoặc API key) |
| `publish` link công khai | | |

**Quy tắc an toàn của Sena:**
- Không tự đăng nhập (`auth login` do người dùng tự chạy), không chi credit, không publish/share khi chưa có xác nhận.
- Mặc định an toàn cho mỗi project mới: đặt `.hyperframes/credit-limit.json` = `{"credits": 0}` để mọi lệnh tốn credit bị chặn tự động (chỉ nâng giới hạn khi người dùng duyệt riêng từng lần). Khi đề xuất hạng mục trả phí, luôn kèm một phương án miễn phí.
- **Lưu ý khi dùng kho miễn phí HeyGen (`media-use resolve` với `credit-limit: 0`):**
  - Tài nguyên tải về nằm trong `.media/<loại>/` + `.media/manifest.jsonl` (kèm cache `~/.media/`).
  - Luôn mở ảnh/icon tải về ra xem trước khi dùng (kết quả tìm có thể lệch góc chụp); có thể thêm `--candidates` để chọn.
  - Nhạc từ kho thường đã master to (mean −14 dB, peak 0 dB) → luôn giảm/carve âm lượng dưới giọng nói.
  - Manifest không ghi chi tiết license thương mại từng file → cần kiểm điều khoản HeyGen trước các chiến dịch quảng cáo thương mại lớn.

## Telemetry

- Skill HyperFrames có thể ghi nhận usage beacon (`events --skill=<name>`). Nếu người dùng muốn tắt toàn bộ telemetry, có thể chạy `hyperframes telemetry disable` (chỉ chạy khi người dùng yêu cầu).

## Giới hạn đã biết

- Docs và CLI HyperFrames phát hành rất nhanh; luôn chạy `--help` trước khi dùng flag mới.
- Giá gói Studio Pro, quota Free và chính sách credit có thể đổi theo thời điểm — kiểm lại trên trang chính thức trước khi chi tiền.
