# Changelog

Mọi thay đổi đáng chú ý của `flyaios-sena` được ghi lại tại đây.

## 1.1.0 — 2026-11-25

Sena nhớ bài học đúng lúc hơn mà không nạp ngày càng nhiều ngữ cảnh khi bộ nhớ lớn dần:

- **Bộ tra bài học `scripts/recall.mjs`** (Node.js thuần, không dependency): xếp hạng **từng dòng** bài học trong `memory/<slug>.md` theo tình huống đang làm; chạy được ở mọi harness bằng `node scripts/recall.mjs "<tình huống>"`. So khớp giữ dấu tiếng Việt (dựng ≠ dừng ≠ dùng) và vẫn tìm được khi gõ không dấu.
- **Trường `khi:` trong dòng bài học chủ đề** (`- YYYY-MM-DD · <bài học> · khi: <tình huống áp dụng> · nguồn: "…"`): điều kiện để giao đúng lúc. Dòng cũ chưa có `khi:` vẫn hoạt động; 3 chủ đề khởi điểm đã có `khi:`.
- **Hook OMP `learning-loop.ts` v1.1.0:** không chèn cả file chủ đề nữa mà giao từng dòng liên quan — khi người dùng nhắn (tối đa 8 dòng khi gọi tên chủ đề, 3 dòng theo tình huống, 30 dòng mỗi phiên), khi Sena sắp chạy lệnh bash liên quan (lệnh dừng một nhịp để đọc bài học, chạy lại thì qua) và sau khi Sena ghi/sửa file liên quan (bài học vào lượt kế, không chặn). Dòng đã giao bị sửa, xóa, hết hạn hoặc chuyển archive thì hook báo thu hồi; sau compaction hook giao lại các dòng đã giao.
- **Claude Code, Antigravity CLI và harness khác:** `AGENTS.md`, `CLAUDE.md`, `LEARNING.md` và 2 skill dựng (`hyperframes-sena`, `remotion-sena`) hướng dẫn Sena tự tra `scripts/recall.mjs` trước khi lên phương án, trước khi dựng và trước khi giao.
- **Mục "Bài học đã áp dụng"** khi giao bản xem trước hoặc kết quả: mỗi bài học liên quan ghi đã áp dụng thế nào (bằng chứng) hoặc vì sao không áp dụng.
- **Kiểm thử:** thêm `tests/recall.test.mjs` và `tests/learning-loop.test.mjs` (giao theo dòng, thu hồi, compaction, dừng lệnh bash, ghi/sửa file trên repo tạm).

Cập nhật từ 1.0.0: `scripts/recall.mjs` và `.omp/hooks/` là file hệ thống; các file `memory/*.md` của bạn giữ nguyên. Muốn bài học cũ được giao đúng lúc hơn, nhờ Sena đề xuất thêm `khi:` cho từng dòng rồi duyệt.

## 1.0.0 — 2026-11-24

Phát hành mã nguồn mở đầu tiên của **Sena — Senior Video Editor** ở dạng kho độc lập:

- **Bộ não Senior Video Editor & hệ tự training:** `AGENTS.md`, `CLAUDE.md`, `ROLE.md`, `USER.md` (template 6 mục), `LEARNING.md`, `MEMORY.md`, 3 chủ đề `memory/` khởi điểm (`hyperframes`, `footage`, `3d-video`), `WORK.md`, `jobs/README.md`, `journal/README.md`.
- **Bộ Skill không dùng symlink (`.agents/skills/`):** `hyperframes-sena`, `remotion-sena`, `sena-memory` (chốt bài học đa harness), cùng 2 skill nguyên bản `motion-design` (LottieFiles, MIT) và `skill-creator` (Anthropic, Apache-2.0).
- **Kho tri thức 6 chuyên đề (`knowledge/`):** HyperFrames, Remotion, EditAtlas, Motion Design, Three.js 3D và OpenMontage (đã chuẩn hóa tiếng Việt trung tính, đa nền tảng).
- **Hỗ trợ 3 Agent Harness ngang nhau:** Oh My Pi (`omp` kèm 2 hook tự học sạch `learning-loop.ts` & `learn.ts` không phụ thuộc FlyAIOS), Claude Code (`claude` kèm `scripts/sync-claude-skills.mjs`), Antigravity CLI (`agy`), cùng nhánh dự phòng Cursor/Codex (`npx skills add -g`).
- **Hỗ trợ macOS & Windows 10/11:** `SETUP.md` 6 bước do AI Agent thực hiện có cổng xin duyệt + bảng chủ sở hữu file khi cập nhật; `scripts/doctor.mjs` (Node.js ≥ 22 thuần, kiểm `ffmpeg`, `ffprobe`, `yt-dlp`, `python >= 3.9`, `numpy`, `Pillow`); CI GitHub Actions chạy trên `ubuntu-latest`, `macos-latest`, `windows-latest`.
- **Giấy phép:** MIT (`LICENSE`) và bảng ghi công/lưu ý bản quyền `THIRD_PARTY_NOTICES.md`.
