# Sena — Senior Video Editor (`flyaios-sena`)

Một **nhân sự AI dựng video mã nguồn mở độc lập** (thuộc hệ sinh thái [FlyAIOS](https://github.com/Chudien-2923/flyaios)), sẵn sàng hỗ trợ bạn dựng **video giới thiệu SaaS, vlog, talking head, explainer, motion graphics và video ngắn social** — đồng thời cho phép bạn **tự training (đào tạo) Sena dựng ngày càng đúng gu của riêng mình**.

Clone repo về, `cd` vào thư mục và nói đúng một câu để Sena tự cài đặt toàn bộ bộ công cụ cần thiết cho máy của bạn.

---

## Cài đặt nhanh (2 bước)

### Bước 1: Clone kho về máy
```bash
git clone https://github.com/Chudien-2923/flyaios-sena.git
cd flyaios-sena
```

### Bước 2: Mở AI Agent và để Sena tự thiết lập môi trường
Mở **Oh My Pi (`omp`)**, **Claude Code (`claude`)** hoặc **Antigravity CLI (`agy`)** ngay trong thư mục `flyaios-sena`, rồi gửi câu sau:

> `Đọc SETUP.md và cài đặt đầy đủ môi trường cho Sena.`

Sena sẽ tự chạy `node scripts/doctor.mjs` để kiểm tra máy của bạn, liệt kê các phần mềm nền & plugin còn thiếu để bạn đồng ý, tự cài đặt theo đúng công cụ bạn đang dùng, rồi hỏi nhanh 3 câu (tùy chọn) để khởi tạo gu dựng trong `USER.md`. Từ các phiên sau, bạn chỉ cần `cd flyaios-sena` và làm việc luôn.

---

## Hỗ trợ đa công cụ AI và đa hệ điều hành

Kho này được thiết kế **không dùng symlink (đường dẫn tắt)** và viết toàn bộ script bằng **Node.js ≥ 22 thuần** để chạy ổn định trên cả **macOS** lẫn **Windows 10/11** (và Linux):

| Công cụ AI (`Agent Harness`) | Hướng dẫn vào việc | Kho Skill của Sena | MCP EditAtlas | Tự training gu dựng |
| :--- | :--- | :--- | :--- | :--- |
| **Oh My Pi (`omp`)** | `AGENTS.md` | `.agents/skills/` (qua `.omp/config.yml`) | `.omp/mcp.json` (có sẵn) | Luật Markdown + `sena-memory` + **2 hook tự động** (`/chot`, `/nap`, `/learn`; tự giao từng dòng bài học đúng lúc) |
| **Claude Code (`claude`)** | `CLAUDE.md` → `AGENTS.md` | `.claude/skills/` (đồng bộ bằng `scripts/sync-claude-skills.mjs`, ngoài Git) | `.mcp.json` (có sẵn) | Luật đọc đầu phiên + tra bài học `scripts/recall.mjs` + skill `sena-memory` + `skill-creator` |
| **Antigravity CLI (`agy`)** | `AGENTS.md` | `.agents/skills/` (tự nhận native) | `.agents/mcp_config.json` (hướng dẫn trong `SETUP.md`) | Luật đọc đầu phiên + tra bài học `scripts/recall.mjs` + skill `sena-memory` + `skill-creator` |
| **Cursor / Codex / khác** | `AGENTS.md` | `.agents/skills/` + nhánh dự phòng `npx skills add -g` | Copy cấu hình HTTP từ `SETUP.md` | Luật đọc đầu phiên + tra bài học `scripts/recall.mjs` + skill `sena-memory` |

---

## Sena có sẵn những gì?

1. **Tư duy & tác phong Senior Video Editor (`ROLE.md`):** hiểu mục tiêu trước khi dựng, đề xuất storyline cho video dài, ưu tiên rõ thông điệp và nhịp dẫn dắt trước hiệu ứng, luôn kiểm file xuất bằng `ffprobe` + mở ảnh frame nhìn trực tiếp + đo mức âm thanh, tuyệt đối không bịa dữ kiện hay tự ý publish/chi tiền.
2. **Kho tri thức chuyên sâu 6 mảng (`knowledge/`):**
   - **HyperFrames** *(công cụ dựng mặc định)* — HTML/CSS/GSAP → video tất định, xem trước và chỉnh trực tiếp trên trình duyệt.
   - **Remotion** *(dùng khi yêu cầu hoặc cần React/dữ liệu động)* — dựng video theo component React, kiểm rõ Free vs Company License.
   - **EditAtlas** *(MCP + 7 skill bổ trợ)* — phân tích ngược video tham chiếu (`video-breakdown`), QA bản xuất (`video-check`), lọc B-roll/nhạc (`media-picker`), thiết kế SFX (`sound-design`), phiên âm & cắt talking head (`transcribe`, `talking-head-cut`), xuất chỉnh nhẹ Studio (`editable-export`).
   - **Motion Design** *(LottieFiles MIT đi kèm sẵn)* — khung đạo diễn chuyển động 8 bước, 4 tính cách Brand Motion Identity, 12 nguyên lý Disney quy đổi sang GSAP/Remotion kèm 4 luật hòa giải UI vs Video.
   - **Three.js 3D & OpenMontage** — tài liệu cầu nối khi dự án mở rộng sang cảnh 3D hoặc đa provider AI.
3. **Bộ Skill vận hành đi kèm (`.agents/skills/`):**
   - `hyperframes-sena`, `remotion-sena`, `sena-memory`, `motion-design` (MIT), `skill-creator` (Apache-2.0).
4. **Kinh nghiệm thực tế khởi điểm (`MEMORY.md`, `memory/`):** tải video mẫu bằng `yt-dlp`, ưu tiên kho miễn phí `credits: 0`, API footage công khai miễn phí (Archive.org, NASA, Wikimedia Commons), và kích hoạt cài chọn lọc Three.js khi có cảnh 3D.

---

## Cách tự training Sena dựng đúng gu của bạn

Bạn có 3 lớp để dạy Sena theo đúng phong cách của mình:

1. **Chỉnh hồ sơ tổng quát (`USER.md`):** điền loại video bạn hay làm, kênh phát hành (16:9 / 9:16), cách xưng hô, chế độ render (dừng ở preview hay render luôn) và thư mục lưu project video ngoài repo.
2. **Chốt bài học sau mỗi buổi dựng:** nói *"chốt bài học"* hoặc *"nhớ gu này nhé"* (hoặc `/sena-memory`; trên OMP có `/chot`). Sena sẽ liệt kê danh sách rõ ràng để bạn duyệt từng dòng trước khi lưu vào `MEMORY.md` (chung mọi buổi) hoặc `memory/<ten-kenh>.md` (riêng cho từng kênh/thể loại).
3. **Đóng gói quy trình lặp lại thành Skill riêng:** khi đã có công thức dựng ưng ý (ví dụ format talking head hoặc intro SaaS của kênh bạn), nhờ Sena dùng `skill-creator` (trên OMP gõ `/learn`) để đóng gói thành Skill mới tại `.agents/skills/<ten-skill-cua-ban>/SKILL.md`.

---

## Cập nhật phiên bản mới mà không mất dữ liệu đã train

Khi `flyaios-sena` có bản phát hành mới, mở AI Agent trong repo và nhắn:

> `Cập nhật Sena theo SETUP.md`

Agent sẽ tự tạo nhánh sao lưu (`backup/<ngày>`) và tuân theo **Bảng chủ sở hữu file** trong [SETUP.md](SETUP.md#bảng-chủ-sở-hữu-file): chỉ cập nhật file hệ thống, **không ghi đè** `USER.md`, `MEMORY.md`, `memory/` mới, `jobs/` và các Skill bạn tự tạo.

---

## Mức độ kiểm chứng minh bạch

- **Đã kiểm chứng thực tế trên macOS:** toàn bộ unit test (`scripts/doctor.mjs`, `scripts/sync-claude-skills.mjs`, `scripts/verify-repo.mjs`, 2 hook OMP), quét 0 symlink & 0 rò rỉ dữ liệu riêng, và kiểm thử phiên mới trên bản clone sạch với cả 3 harness (**Oh My Pi**, **Claude Code**, **Antigravity CLI**).
- **Trên Windows:** thiết kế đa nền tảng không symlink, script Node.js thuần + nhánh `winget`, kiểm thử tự động trên GitHub Actions runner `windows-latest` (chưa chạy thử thủ công trên máy Windows vật lý — rất hoan nghênh góp ý/PR từ cộng đồng Windows).
- **Kho tri thức `knowledge/`:** tổng hợp có nguồn từ tài liệu chính thức kèm kiểm thử smoke cơ bản; một số tính năng nâng cao (talking-head dài bằng `faster-whisper`, cảnh 3D Three.js, cloud render) cần tự kiểm chứng theo từng dự án thực tế.

---

## Giấy phép & Ghi công

- Mã nguồn và tài liệu do FlyAIOS biên soạn trong kho này phát hành dưới giấy phép **[MIT](LICENSE)**.
- Các thành phần bên thứ ba đi kèm (`motion-design` MIT, `skill-creator` Apache-2.0) và điều khoản của các plugin cài thêm (HyperFrames, Remotion, EditAtlas, Superpowers, Impeccable) được liệt kê đầy đủ trong **[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)**.
