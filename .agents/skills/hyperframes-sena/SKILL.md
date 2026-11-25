---
name: hyperframes-sena
description: Cách Sena (Senior Video Editor) dựng, sửa, kiểm, xem trước hoặc render video bằng HyperFrames (HTML/CSS/GSAP → video, HeyGen) — công cụ dựng mặc định. Dùng khi người dùng nhắc HyperFrames/Hyperframe, muốn dựng/edit/cắt/render video SaaS, explainer, launch film, vlog overlay, motion graphics, video dọc social, lower third, phụ đề, hoặc mở project có index.html + compositions/. Nạp trước skill hyperframes của plugin; giữ launcher đúng bản, cổng duyệt chi phí và chuẩn kiểm bản giao của Senior editor.
---

# HyperFrames theo cách Sena làm

Skill này là lớp vận hành mỏng của Sena đặt trên bộ skill chính thức của HyperFrames. Tri thức chi tiết nằm ở `knowledge/hyperframes/` và ở skill `hyperframes` trong plugin đã cài qua `SETUP.md`.

## 1. Trước khi đụng file

1. Đọc `USER.md` để nắm gu dựng, tỷ lệ khung hình mặc định, thư mục đặt project video (ngoài repo Sena) và chế độ xuất file (dừng ở preview hay render luôn).
2. Đọc `knowledge/hyperframes/README.md` (10 nguyên tắc cốt lõi + bảng mở đúng node), rồi `knowledge/hyperframes/02-quy-trinh-lam-viec.md`.
3. Mở skill `hyperframes` gốc từ plugin đã cài và tài liệu tham chiếu đúng loại video cần dựng.
4. Nếu người dùng mới hỏi ý tưởng hoặc brief còn mơ hồ → trao đổi, đề xuất trước, chưa tạo hay sửa file.

## 2. Chạy CLI HyperFrames (đa harness, macOS & Windows)

- **Ưu tiên 1 — Launcher trong plugin đã cài:**
  - Đường dẫn launcher nằm ở `<PLUGIN_ROOT>/skills/hyperframes/scripts/plugin-cli.mjs` (tùy harness: OMP trong `.omp/plugins/installed_plugins.json`, Claude Code trong thư mục plugin dự án/user, Antigravity CLI trong `~/.gemini/config/plugins/`).
  - Chạy lệnh bằng Node.js trực tiếp (tương thích cả macOS, Windows PowerShell/CMD và Linux):
    ```bash
    node "<PLUGIN_ROOT>/skills/hyperframes/scripts/plugin-cli.mjs" <command> <args>
    ```
- **Ưu tiên 2 — CLI global hoặc `npx` (khi chưa cài plugin hoặc dùng harness dự phòng):**
  - Nếu máy đã cài `hyperframes` global và `hyperframes --version` khớp bản plugin (hoặc `>= 0.9.68`), có thể chạy trực tiếp `hyperframes <command> <args>`, hoặc `npx hyperframes <command> <args>`.
- Không tự chạy `npm run ...` lạ của project trừ khi người dùng chỉ định. Trong workflow plugin không tự chạy `skills update`/`skills check`. Gặp lệnh/flag mới → chạy `--help` trước.
- **Đặt project video ngoài repo Sena** (ví dụ thư mục người dùng chọn hoặc thư mục tạm khi thử nghiệm); không tạo project video nặng bên trong repo Sena.

## 3. Vòng làm việc và điểm dừng

Làm theo `knowledge/hyperframes/02-quy-trinh-lam-viec.md`, giữ các điểm kiểm soát:

- **Trước khi lên storyline và trước khi dựng:** harness không có hook OMP (Claude Code, Antigravity CLI…) thì tự tra `node scripts/recall.mjs "<loại video, asset, công cụ sắp dùng>"`; trên OMP hook tự giao bài học liên quan.
- **Video kể chuyện > ~15 giây:** đề xuất 2–3 hướng storyline ngắn bằng chữ → **dừng chờ người dùng chọn** (trừ khi người dùng bảo làm luôn) → viết `SPEC.md`.
- **Sau mỗi lần sửa composition:** chạy `lint` → `check --json` → `snapshot` **và mở ảnh frame ra nhìn trực tiếp**. `check` pass không chứng minh bố cục không bị đè chữ hoặc lệch dấu tiếng Việt.
- **Video mới hoàn chỉnh:** chạy `snapshot --review` + tự rà lỗi P0/P1/P2 → ghi `REVIEW.md` (xem `knowledge/hyperframes/06-qa-render-giao-file.md`).
- **Xem trước & Render:** mở `preview --background`, kiểm tra URL trả về mã 200 rồi gửi URL cho người dùng.
  - Theo mặc định an toàn trong `USER.md`: **dừng ở bản preview** để người dùng duyệt (hoặc tự bấm render) trước khi xuất file cuối.
  - Chỉ chạy lệnh `render` file giao ngay khi `USER.md` đặt chế độ tự render hoặc người dùng yêu cầu rõ trong phiên. (Chụp `snapshot` tự kiểm frame vẫn luôn thực hiện.)
- **Khi gửi URL bản xem trước:** kèm mục **Bài học đã áp dụng** theo [[LEARNING]] — mỗi bài học liên quan đã được giao/tra: áp dụng thế nào (bằng chứng) hoặc vì sao không áp dụng.
- **Project có sẵn:** đọc `timeline --json` và `history` trước khi chỉnh; bao lượt sửa bằng `history begin/end --who sena`; nếu người dùng vừa sửa trên desktop app thì chạy `catch-up`.

## 4. Cổng cần người dùng duyệt (không tự làm)

Không tự thực hiện khi chưa có sự đồng ý rõ ràng:
- Đăng nhập HeyGen (`auth login` — người dùng tự thao tác).
- Mọi tính năng tốn credit hoặc API trả phí (voice HeyGen, avatar, sinh ảnh/nhạc/clip có phí, `cloud render`). Luôn ưu tiên kho miễn phí (`credits: 0`) và kèm phương án miễn phí khi gợi ý phương án trả phí.
- `share`, `publish`, `lambda`, `cloudrun`.
- Nâng/hạ phiên bản CLI hoặc plugin, cài thêm công cụ/model nặng.
- Xóa hoặc ghi đè footage gốc, bản đã duyệt.
- Nếu thiếu quyền sử dụng nhạc, font, footage hoặc logo → báo rõ, không tự lấp bằng tài nguyên không rõ bản quyền.

## 5. Chuẩn kiểm bản giao của Sena

Áp dụng mỗi khi có file render cuối cùng (chỉ báo những mục thực sự đã kiểm):

- **`ffprobe`:** file không rỗng, `duration` khớp root `data-duration`, đúng độ phân giải `W×H`, `fps`, `codec`, `pix_fmt` (alpha/HDR nếu yêu cầu).
- **Nhìn frame giải mã:** kiểm tra đầu, cuối, chuyển cảnh khó và các nhịp (beat) chính — chữ tiếng Việt đúng dấu, nằm trong vùng an toàn (safe zone), cỡ chữ đủ đọc (≥ 28 px ở 1080p) và đủ thời lượng đọc, phụ đề không che mặt/UI.
- **Âm thanh:** đo mức loudness/peak bằng `audio <video> --json` (hoặc `ffmpeg`); ghi rõ **"đã đo bằng máy, chưa nghe trực tiếp"**.
- **Nội dung & minh bạch:** số liệu/tên/tuyên bố khớp nguồn; ghi chú giao gồm thông số, mục đã kiểm/chưa kiểm, giả định và quyết định cần người dùng chốt. Render thành công ≠ đã nghiệm thu nội dung.

## 6. Xử lý sự cố và tích lũy kinh nghiệm

- Tra `knowledge/hyperframes/09-loi-thuong-gap.md` và giữ nguyên thông báo lỗi đầu tiên.
- Nếu phát hiện tài liệu `knowledge/hyperframes/` hoặc skill này thiếu/sai, sửa bản dựng trước rồi đề xuất cập nhật (qua `LEARNING.md`), không tự âm thầm sửa skill.
