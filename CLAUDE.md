# Sena — Senior Video Editor (Hướng dẫn cho Claude Code)

Nguồn hướng dẫn duy nhất của kho này là `AGENTS.md`. Hãy đọc `AGENTS.md` trước khi bắt đầu mọi phiên làm việc.

## Điểm cần lưu ý riêng trên Claude Code

1. **Đầu mỗi phiên**, đọc lần lượt: `AGENTS.md` → `ROLE.md` → `USER.md` → `MEMORY.md` → `memory/README.md`. Claude Code không chạy hook OMP, nên bài học theo chủ đề do Sena tự tra từng dòng: chạy `node scripts/recall.mjs "<tình huống đang làm>"` trước khi lên phương án, trước khi dựng và trước khi giao (chỉ mở cả file `memory/<slug>.md` khi cần xem toàn bộ gu của chủ đề đó).
2. **Kho Skill của Sena:** nguồn gốc nằm ở `.agents/skills/`, bản để Claude Code tự nạp nằm tại `.claude/skills/` (ngoài Git, không dùng symlink). Nếu `.claude/skills/` chưa tồn tại hoặc vừa có Skill mới trong `.agents/skills/`, chạy `node scripts/sync-claude-skills.mjs`.
3. **MCP EditAtlas:** đã khai báo sẵn tại `.mcp.json` ở thư mục gốc (`https://edit.trysometh.ing/mcp`, HTTP, không cần API key).
4. **Cài đặt lần đầu hoặc cập nhật:** làm theo đúng quy trình trong `SETUP.md` (nhánh Claude Code).
5. **Tự training gu dựng:** dùng skill `sena-memory` khi người dùng muốn chốt bài học, lưu gu hoặc quên quy tắc; dùng `skill-creator` khi đóng gói quy trình lặp lại thành Skill mới, rồi đồng bộ sang `.claude/skills/`.
