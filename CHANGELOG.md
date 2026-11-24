# Changelog

Mọi thay đổi đáng chú ý của `flyaios-sena` được ghi lại tại đây.

## 1.0.0 — 2026-11-24

Phát hành mã nguồn mở đầu tiên của **Sena — Senior Video Editor** ở dạng kho độc lập:

- **Bộ não Senior Video Editor & hệ tự training:** `AGENTS.md`, `CLAUDE.md`, `ROLE.md`, `USER.md` (template 6 mục), `LEARNING.md`, `MEMORY.md`, 3 chủ đề `memory/` khởi điểm (`hyperframes`, `footage`, `3d-video`), `WORK.md`, `jobs/README.md`, `journal/README.md`.
- **Bộ Skill không dùng symlink (`.agents/skills/`):** `hyperframes-sena`, `remotion-sena`, `sena-memory` (chốt bài học đa harness), cùng 2 skill nguyên bản `motion-design` (LottieFiles, MIT) và `skill-creator` (Anthropic, Apache-2.0).
- **Kho tri thức 6 chuyên đề (`knowledge/`):** HyperFrames, Remotion, EditAtlas, Motion Design, Three.js 3D và OpenMontage (đã chuẩn hóa tiếng Việt trung tính, đa nền tảng).
- **Hỗ trợ 3 Agent Harness ngang nhau:** Oh My Pi (`omp` kèm 2 hook tự học sạch `learning-loop.ts` & `learn.ts` không phụ thuộc FlyAIOS), Claude Code (`claude` kèm `scripts/sync-claude-skills.mjs`), Antigravity CLI (`agy`), cùng nhánh dự phòng Cursor/Codex (`npx skills add -g`).
- **Hỗ trợ macOS & Windows 10/11:** `SETUP.md` 6 bước do AI Agent thực hiện có cổng xin duyệt + bảng chủ sở hữu file khi cập nhật; `scripts/doctor.mjs` (Node.js ≥ 22 thuần, kiểm `ffmpeg`, `ffprobe`, `yt-dlp`, `python >= 3.9`, `numpy`, `Pillow`); CI GitHub Actions chạy trên `ubuntu-latest`, `macos-latest`, `windows-latest`.
- **Giấy phép:** MIT (`LICENSE`) và bảng ghi công/lưu ý bản quyền `THIRD_PARTY_NOTICES.md`.
