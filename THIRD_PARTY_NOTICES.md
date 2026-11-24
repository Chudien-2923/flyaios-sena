# Thông báo bản quyền bên thứ ba (Third-Party Notices)

Kho `flyaios-sena` phát hành phần nội dung do FlyAIOS biên soạn dưới giấy phép **MIT** (xem [LICENSE](LICENSE)). Các thành phần mã nguồn mở đi kèm sẵn trong kho và các công cụ/plugin bên thứ ba được cài qua `SETUP.md` giữ nguyên bản quyền và điều khoản gốc của tác giả:

## 1. Thành phần đi kèm trực tiếp trong repo

| Thành phần | Vị trí trong repo | Nguồn gốc | Giấy phép |
| :--- | :--- | :--- | :--- |
| **Motion Design Skill** | `.agents/skills/motion-design/` | `LottieFiles/motion-design-skill` (`HEAD d77a9fc`) | **MIT** — giữ nguyên `.agents/skills/motion-design/LICENSE` |
| **Skill Creator** | `.agents/skills/skill-creator/` | `anthropics/skills` (`skills/skill-creator`) | **Apache-2.0** — giữ nguyên `.agents/skills/skill-creator/LICENSE.txt`, hash lock tại `skills-lock.json` |

## 2. Plugin, MCP và công cụ ngoài cài đặt qua `SETUP.md`

Các công cụ sau **không** được nhúng trong kho Git này mà được người dùng tự cài từ kho gốc khi chạy `SETUP.md`:

- **HyperFrames** (`heygen-com/hyperframes`): tuân theo giấy phép của HeyGen. Kho tài nguyên miễn phí (`credits: 0`) khác với tính năng trả phí/credit; luôn kiểm tra quyền sử dụng nhạc/ảnh/footage trước khi phát hành thương mại.
- **Remotion** (`remotion-dev/remotion`, plugin `remotion-dev/claude-code-plugin`): plugin phát hành dưới giấy phép MIT; thư viện Remotion dùng **Remotion License** (miễn phí cho cá nhân hoặc tổ chức ≤ 3 người; công ty > 3 người cần kiểm tra Company License tại `remotion.dev/license`).
- **EditAtlas** (`EditAtlas/skills` & MCP `https://edit.trysometh.ing/mcp`):
  - 7 skill mã nguồn mở theo giấy phép **Apache-2.0**.
  - **Lưu ý quan trọng về SFX:** Kho hiệu ứng âm thanh (SFX) của EditAtlas được cung cấp không kèm bảo đảm bản quyền (*no licence, no warranty*). Với dự án thương mại/quảng cáo/client, ưu tiên nguồn có giấy phép rõ ràng.
  - **Nhạc, stock video, stock photo** qua EditAtlas lấy từ **Pixabay** và **Pexels**, chịu điều khoản sử dụng gốc của hai nền tảng (giữ `author`, `credit_url` và kiểm `has_youtube_content_id` khi đăng YouTube).
- **Superpowers** (`obra/superpowers`): tuân theo giấy phép tại kho gốc.
- **Impeccable** (`pbakaus/impeccable`): tuân theo giấy phép tại kho gốc.
- **Công cụ hệ thống:** Node.js, FFmpeg/FFprobe, Python, yt-dlp, NumPy, Pillow (và các gói tùy chọn như `faster-whisper`, Playwright) tuân theo giấy phép gốc của từng dự án.
