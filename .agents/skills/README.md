# Skills của Sena (`.agents/skills/`)

Thư mục `.agents/skills/` là nguồn duy nhất cho mọi Skill đi kèm Sena và Skill do người dùng tự tạo (không dùng symlink để tương thích 100% giữa macOS, Windows và Linux).

- **Oh My Pi (`omp`):** đọc trực tiếp qua `.omp/config.yml` (`skills.customDirectories: [.agents/skills]`).
- **Antigravity CLI (`agy`):** tự nhận native từ `.agents/skills/*/SKILL.md`.
- **Claude Code (`claude`):** đồng bộ sang `.claude/skills/` (ngoài Git) bằng `node scripts/sync-claude-skills.mjs`.

## 1. Skill vận hành của Sena

- [[.agents/skills/hyperframes-sena/SKILL]] — **HyperFrames theo cách Sena làm:** lớp vận hành cho công cụ dựng chính HyperFrames (launcher đa harness, điểm dừng duyệt storyline & preview/render theo [[USER]], cổng duyệt chi phí, chuẩn kiểm bản giao).
- [[.agents/skills/remotion-sena/SKILL]] — **Remotion theo cách Sena làm:** lớp vận hành cho Remotion khi người dùng yêu cầu hoặc bài toán cần React/data động (nơi đặt project ngoài repo, Studio `--no-open`, kiểm license Free vs Company, chuẩn kiểm bản giao).
- [[.agents/skills/sena-memory/SKILL]] — **Chốt bài học & đào tạo gu dựng:** quy trình đa harness giúp bạn lưu gu dựng vào [[USER]] / [[MEMORY]] / `memory/<slug>.md`, quên quy tắc cũ hoặc chuyển lưu trữ (hoạt động trên cả Claude Code, Antigravity CLI lẫn OMP).

## 2. Skill mã nguồn mở đi kèm nguyên bản (không sửa vendor)

- [[.agents/skills/motion-design/SKILL]] — **Motion Design (`LottieFiles/motion-design-skill`, MIT):** khung đạo diễn chuyển động 8 bước, 4 tính cách Brand Motion Identity, 12 nguyên lý Disney dạng thông số và chẩn đoán lỗi motion. Đọc kèm cầu nối [[knowledge/motion-design/README]] khi áp dụng cho HyperFrames/Remotion.
- [[.agents/skills/skill-creator/SKILL]] — **Skill Creator (`anthropics/skills`, Apache-2.0):** khung thiết kế, viết và đánh giá Skill mới khi bạn muốn đóng gói một quy trình dựng video lặp lại thành Skill riêng của mình.

## 3. Plugin bên thứ ba cài đặt qua `SETUP.md`

Để repo luôn gọn nhẹ và cập nhật đúng phiên bản mới nhất (kèm đầy đủ hook theo từng harness), 5 bộ plugin ngoài không nhúng cứng vào Git mà được cài ở bước [[SETUP]]:
1. **Superpowers** (`obra/superpowers`) — brainstorming, lập kế hoạch, debug và kiểm chứng.
2. **Impeccable** (`pbakaus/impeccable`) — chuẩn thiết kế UI, layout, typography và UX copy.
3. **HyperFrames** (`heygen-com/hyperframes`) — bộ 9 skill dựng video HTML/CSS/GSAP + launcher `plugin-cli.mjs`.
4. **Remotion** (`remotion-dev/claude-code-plugin`) — bộ 13 skill `remotion-*`.
5. **EditAtlas** (`EditAtlas/skills` + MCP `https://edit.trysometh.ing/mcp`) — 7 skill cục bộ (`video-breakdown`, `video-check`, `sound-design`, `media-picker`, `transcribe`, `talking-head-cut`, `editable-export`).

## 4. Tự thêm Skill riêng của bạn

Khi đóng gói quy trình dựng video riêng (qua `/learn` hoặc trực tiếp theo [[.agents/skills/skill-creator/SKILL]]), lưu tại `.agents/skills/<ten-skill-cua-ban>/SKILL.md`. Thư mục này thuộc nhóm tài sản của bạn trong bảng chủ sở hữu file của [[SETUP]] nên không bị ghi đè khi cập nhật Sena. Nếu bạn dùng Claude Code, chạy `node scripts/sync-claude-skills.mjs` để cập nhật sang `.claude/skills/`.
