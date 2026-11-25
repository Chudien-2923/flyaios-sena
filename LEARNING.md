# Vòng tự học và đào tạo gu dựng của Sena (`LEARNING.md`)

Tài liệu này mô tả cách bạn **train (đào tạo) Sena** dựng video ngày càng đúng gu của mình mà không bị loãng bộ nhớ hay lẫn lộn giữa các thể loại/kênh video.

## 1. Phân loại nơi lưu đúng chỗ

Không phải tin nhắn hay chỉnh sửa nào cũng nên biến thành luật cố định. Khi bạn góp ý, yêu cầu ghi nhớ hoặc vừa hoàn tất một bản dựng thành công, Sena sửa bản dựng trước rồi phân loại đúng phạm vi:

| Loại thông tin | Nơi lưu đích | Ví dụ |
| :--- | :--- | :--- |
| Sở thích cá nhân chung, xưng hô, kênh mặc định, chế độ render | [[USER]] | "Tự render MP4 luôn sau khi kiểm frame", "Kênh chính là TikTok 9:16" |
| Bài học nghề áp dụng cho **mọi buổi làm việc** | [[MEMORY]] | "Khi gửi link video mẫu, dùng `yt-dlp` tải về phân tích trước khi dựng" |
| Gu dựng riêng cho **một thể loại video, công cụ hoặc một kênh/khách hàng** | `memory/<slug>.md` (xem [[memory/README]]) | `memory/kenh-saas.md`, `memory/vlog-du-lich.md`, `memory/hyperframes.md` |
| Kiến thức kỹ thuật chuyên sâu có nguồn tra cứu | [[knowledge/README]] | Tài liệu công cụ mới, bảng lỗi thường gặp |
| Quy trình nhiều bước lặp đi lặp lại | Skill mới tại `.agents/skills/<ten-skill>/SKILL.md` | Quy trình dựng mẫu video talking head chuẩn kênh của bạn |
| Chỉnh sửa chỉ đúng cho **1 video cụ thể** | File job trong `jobs/` (hoặc không cần lưu) | "Đổi dòng chữ cảnh 2 thành Giảm 30%" |

## 2. Cách hoạt động trên cả 3 Agent Harness

- **Trên mọi harness (Claude Code, Antigravity CLI, Oh My Pi, Cursor, Codex):**
  - Đầu phiên, Sena luôn đọc [[USER]], [[MEMORY]] và mục lục [[memory/README]]. Bài học theo chủ đề được tra **từng dòng** đúng tình huống bằng `node scripts/recall.mjs "<tình huống đang làm>"` (trước khi lên phương án, trước khi dựng và trước khi giao), thay vì nạp cả file `memory/<slug>.md` vào ngữ cảnh.
  - Khi bạn muốn lưu gu hoặc chốt bài học sau buổi dựng, chỉ cần nói **"chốt bài học"**, **"nhớ gu này"** hoặc gọi skill [[.agents/skills/sena-memory/SKILL]] (`/sena-memory`).
- **Tăng cường tự động khi dùng Oh My Pi (`omp`):**
  - Hai hook `.omp/hooks/pre/learning-loop.ts` và `.omp/hooks/pre/learn.ts` tự động ghi nhật ký lời người dùng vào `journal/sessions/` (ngoài Git), tự chèn `MEMORY.md` và mở sẵn các lệnh `/chot`, `/nap` (xem gì đã nạp) và `/learn`.
  - Bài học chủ đề được giao **từng dòng, đúng lúc**: khi tin nhắn gọi tên chủ đề hoặc khớp tình huống `khi:` (tối đa 8 dòng khi gọi tên chủ đề, 3 dòng theo tình huống, 30 dòng mỗi phiên); khi Sena sắp chạy lệnh bash liên quan (lệnh dừng một nhịp để Sena đọc bài học, chạy lại thì qua); sau khi Sena ghi/sửa file liên quan (bài học vào lượt kế, không chặn). Dòng đã giao mà bị sửa, xóa, hết hạn hoặc chuyển archive thì hook báo thu hồi; sau compaction hook giao lại các dòng đã giao.

**Bài học đã áp dụng:** khi giao bản xem trước hoặc kết quả, Sena kèm mục này — mỗi bài học liên quan đã được giao/tra trong việc ghi đã áp dụng thế nào (bằng chứng: file, thông số, lựa chọn) hoặc vì sao không áp dụng. Được giao không có nghĩa là đã áp dụng; không đánh dấu đã áp dụng khi chưa có bằng chứng.

## 3. Quy tắc chốt bài học (Cổng xác nhận bắt buộc)

1. **Không tự ý ghi đè bộ nhớ:** Sena không tự ghi vào [[MEMORY]] hay `memory/<slug>.md` khi chưa hỏi bạn.
2. **Đề xuất dạng danh sách đánh số:** mỗi dòng nêu rõ **bài học (dạng quy tắc/điều kiện rõ ràng) · phạm vi · file đích · nguồn trích ngắn**.
3. **Chỉ ghi những dòng bạn đồng ý** (ví dụ bạn trả lời: *"đồng ý 1, 3; bỏ 2"*).
4. **Định dạng chuẩn mỗi dòng:** `- YYYY-MM-DD · <bài học> · nguồn: "<tóm tắt ngữ cảnh>"`. Dòng trong `memory/<slug>.md` thêm điều kiện áp dụng: `- YYYY-MM-DD · <bài học> · khi: <tình huống áp dụng> · nguồn: "<tóm tắt>"`. `khi:` ghi tình huống/bước cụ thể kèm các từ Sena sẽ gõ khi làm (tên công cụ, lệnh, thuật ngữ như music, tts, render); không ghi từ chung của nghề (video, dựng) vì sẽ kéo bài học vào mọi việc. Nếu bài học chỉ có hiệu lực tạm (ví dụ cho một chiến dịch), thêm `· đến YYYY-MM-DD` ở cuối dòng.
5. **Giới hạn gọn nhẹ (tối đa 200 dòng/file):** khi một file sắp vượt 200 dòng, Sena đề xuất tách bớt sang file chủ đề phù hợp hoặc chuyển bài học cũ sang `memory/archive.md` (giữ nguyên văn kèm `· chuyển YYYY-MM-DD từ <file>`).

## 4. Sửa, quên và tránh mâu thuẫn

- **Sửa bài học sai:** sửa trực tiếp dòng cũ tại nguồn hiện hành thay vì viết thêm một dòng mâu thuẫn bên dưới.
- **Yêu cầu quên:** khi bạn bảo quên một quy tắc, Sena xóa dòng đó khỏi `MEMORY.md` / `memory/<slug>.md` và ghi một dòng ngắn vào `memory/forgotten.md` để không tự đề xuất lại nếu chưa hỏi xác nhận.
- **Đọc lại trước khi ghi:** nếu mở nhiều phiên song song, luôn đọc lại file mới nhất trước khi cập nhật để tránh ghi đè.

## 5. Đóng gói quy trình thành Skill riêng (`/learn`)

Khi bạn và Sena tìm ra một công thức dựng video hiệu quả và lặp lại nhiều lần (ví dụ: mẫu intro SaaS, quy trình cắt talking head kèm B-roll theo gu kênh của bạn):
1. Đọc [[.agents/skills/skill-creator/SKILL]] và kiểm [[.agents/skills/README]] để tránh trùng với Skill có sẵn.
2. Trình bản đề xuất (tên skill, khi nào kích hoạt, các bước làm, giới hạn) để bạn duyệt trước khi ghi vào `.agents/skills/<ten-skill>/SKILL.md`.
3. Không sửa trực tiếp các skill vendor gốc (`motion-design`, `skill-creator`); nếu cần tùy biến, tạo lớp cầu nối hoặc skill riêng.
4. Nếu bạn dùng **Claude Code**, chạy `node scripts/sync-claude-skills.mjs` sau khi lưu Skill mới để Claude Code nhận ngay bản mới mà không cần symlink.
