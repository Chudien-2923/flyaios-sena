---
name: remotion-sena
description: Cách Sena (Senior Video Editor) dựng, sửa, kiểm, xem trước hoặc render video bằng Remotion (React → video). Dùng khi người dùng nhắc Remotion/remotion.dev, yêu cầu dựng hoặc so sánh bằng Remotion, cần video gắn dữ liệu động phức tạp bằng React, hoặc mở project có package `remotion` / `@remotion/*` (`src/Root.tsx`, `remotion.config.ts`). Không tự chọn Remotion cho job video chung khi người dùng chưa chọn (mặc định dùng hyperframes-sena). Nạp trước skill `remotion-best-practices` của plugin; giữ chuẩn nơi đặt project, license và QA bản giao của Sena.
---

# Remotion theo cách Sena làm

Skill này là lớp vận hành mỏng của Sena trên bộ 13 skill chính thức của Remotion (`remotion-dev/claude-code-plugin`). Tri thức chi tiết nằm ở `knowledge/remotion/` và skill plugin.

## 1. Trước khi đụng file

1. Đọc `USER.md` để nắm gu dựng, thư mục lưu project video (ngoài repo Sena) và chế độ preview/render.
2. Đọc `knowledge/remotion/README.md` (10 nguyên tắc + bảng mở đúng node), rồi `knowledge/remotion/02-quy-trinh-lam-viec.md`.
3. Đọc skill plugin `remotion-best-practices` (router) rồi mở đúng skill con (`remotion-create`, `remotion-markup`, `remotion-interactivity`, `remotion-captions`, `remotion-render`…). Gặp API mới → tra `remotion-docs`.
4. Câu hỏi hoặc ý tưởng còn mở → trao đổi/đề xuất trước, chưa tạo hay sửa file.
5. **Ưu tiên công cụ:** HyperFrames là mặc định cho video motion/explainer chung; Remotion dùng khi người dùng yêu cầu hoặc khi bài toán cần React/dữ liệu động rõ rệt (nêu đánh đổi để người dùng chọn).

## 2. Nơi đặt project và quản lý package

- **Không tạo project video trong repo Sena.** Đặt tại thư mục dự án ngoài repo do người dùng chọn (hoặc thư mục tạm OS khi test ngắn).
- Khởi tạo project sạch: `npx create-video@latest --yes --blank --no-tailwind <dir>` (không truyền `--skills` và không chạy `npx remotion skills add` để tránh tạo bản skill trùng với plugin).
- Cài thêm gói Remotion bằng `npx remotion add <pkg>`; kiểm đồng bộ phiên bản bằng `npx remotion versions` (mọi `@remotion/*` phải cùng version).
- Không chạy `npx remotion upgrade` khi người dùng chưa duyệt.
- **Lưu ý riêng cho macOS:** nếu project đặt trong `~/Documents` và gặp lỗi treo `Waiting for root component to load`, di chuyển Chrome Headless Shell của Remotion sang ngoài `~/Documents` (vd `~/Library/Caches/remotion-chrome-headless-shell/<version>/`) rồi trỏ `Config.setBrowserExecutable(...)` trong `remotion.config.ts` (chi tiết xem `knowledge/remotion/08-loi-thuong-gap.md`).
- **Lưu ý riêng cho Windows:** nếu nhiều track audio gây lỗi `ENAMETOOLONG: ffmpeg`, tắt tiếng video không cần âm thanh bằng `muted` hoặc chia đoạn `--frames` (chi tiết xem `knowledge/remotion/08-loi-thuong-gap.md`).

## 3. Vòng làm việc và điểm dừng

- **Trước khi lên storyline và trước khi dựng:** harness không có hook OMP (Claude Code, Antigravity CLI…) thì tự tra `node scripts/recall.mjs "<loại video, asset, công cụ sắp dùng>"`; trên OMP hook tự giao bài học liên quan.
- **Video kể chuyện > ~15 giây:** đề xuất 2–3 storyline ngắn bằng chữ → **dừng chờ người dùng chọn** (trừ khi người dùng bảo làm luôn). Dựng đúng yêu cầu, không tự thêm voiceover/captions/nhạc/tỷ lệ mới.
- **Preview Studio:** chạy `npx remotion studio --no-open` (tránh tự bật trình duyệt cá nhân), kiểm URL trả 200 rồi gửi URL cho người dùng tự mở.
- **Tự kiểm sau mỗi lần sửa:** `npm run lint` (eslint + tsc) → `npx remotion compositions` → xuất vài frame tự kiểm `npx remotion render <id> out/frames --frames=<đầu,beat chính,cuối> --image-format=png` **và mở ảnh ra nhìn trực tiếp**. Lint sạch không chứng minh bố cục, font hay dấu tiếng Việt đúng.
- **Chế độ render file giao:** theo `USER.md` — mặc định dừng ở URL Studio + ảnh stills để người dùng duyệt (hoặc tự bấm Render trong Studio); chỉ chạy render file giao cuối khi `USER.md` bật tự render hoặc người dùng yêu cầu rõ (luôn truyền rõ composition ID).
- **Khi gửi URL Studio + stills:** kèm mục **Bài học đã áp dụng** theo [[LEARNING]] — mỗi bài học liên quan đã được giao/tra: áp dụng thế nào (bằng chứng) hoặc vì sao không áp dụng.
- **Project có sẵn:** đọc `src/Root.tsx`, `package.json`, `remotion.config.ts` trước khi sửa; giữ nguyên phần người dùng đã chỉnh tay hoặc hỏi trước khi thay đổi.

## 4. Giấy phép sử dụng (License)

Remotion dùng **Remotion License**:
- Miễn phí (**Free License**) cho cá nhân hoặc tổ chức có **≤ 3 người** (khi render có thể truyền `--license-key=free-license`, không truyền chuỗi rỗng).
- Với công ty/tổ chức **> 3 người** hoặc dự án làm cho khách hàng doanh nghiệp tự vận hành Remotion, cần kiểm tra **Company License** tại `remotion.dev/license`. Hỏi người dùng xác nhận nếu chưa rõ, không tự kết luận hay mua.

## 5. Cổng cần người dùng duyệt (không tự làm)

Không tự thực hiện khi chưa được đồng ý: deploy/render cloud (Lambda, Vercel, Cloud Run), tạo tài khoản cloud, gọi API trả phí (OpenAI, ElevenLabs, Mapbox, MapTiler, Google Map Tiles), tải model nặng (`whisper`, matting), nâng/hạ version project hoặc plugin, cài Element từ URL ngoài `remotion.dev`, xóa/ghi đè media gốc hoặc bản đã duyệt, publish/share. API key chỉ đặt trong `.env` ngoài Git.

## 6. Chuẩn kiểm bản giao của Sena

Áp dụng mỗi khi có file render (chỉ báo mục đã thực sự kiểm):
- **`ffprobe`:** không rỗng, `duration = durationInFrames / fps`, `W×H/fps/codec/pix_fmt` đúng brief (alpha → `pix_fmt` có kênh `a`), luồng âm thanh đúng yêu cầu.
- **Nhìn frame giải mã:** đầu, cuối, chuyển cảnh khó và nhịp chính — chữ tiếng Việt đúng dấu, nằm trong vùng an toàn, đủ thời gian đọc, phụ đề khớp lời.
- **Âm thanh:** đo loudness/peak bằng `ffmpeg`; ghi rõ **"đã đo bằng máy, chưa nghe trực tiếp"**.
- **Ghi chú bàn giao:** tên file có version, thông số, mục đã/chưa kiểm, giả định và điểm cần người dùng quyết.

## 7. Xử lý sự cố

Tra `knowledge/remotion/08-loi-thuong-gap.md`, giữ nguyên thông báo lỗi đầu tiên. Nếu phát hiện thiếu sót trong tài liệu hoặc skill, sửa bản dựng trước rồi đề xuất cập nhật theo `LEARNING.md`.
