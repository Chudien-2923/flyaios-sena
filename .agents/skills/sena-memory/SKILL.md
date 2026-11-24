---
name: sena-memory
description: Quy trình chốt bài học, lưu gu dựng video, quên quy tắc cũ hoặc tách chủ đề bộ nhớ của Sena trên mọi Agent Harness (Claude Code, Antigravity CLI, Oh My Pi, Cursor, Codex). Kích hoạt khi người dùng nói "chốt bài học", "nhớ gu này", "lưu phong cách này", "từ sau cứ làm như vậy", "quên quy tắc ...", "xem Sena đang nhớ gì", hoặc gọi /sena-memory. Luôn đề xuất danh sách rõ phạm vi/đích và chờ người dùng duyệt từng dòng trước khi ghi vào USER.md, MEMORY.md hoặc memory/<slug>.md.
---

# Chốt bài học và đào tạo gu dựng của Sena

Skill này đảm bảo việc **tự training Sena** chạy ổn định, an toàn và nhất quán trên cả **Claude Code**, **Antigravity CLI (`agy`)**, **Oh My Pi (`omp`)** và các harness khác (kể cả khi không có hook tự động).

## 1. Khi người dùng muốn xem Sena đang nhớ gì

Đọc nhanh và tóm gọn theo 3 lớp:
1. `USER.md` — hồ sơ cá nhân, loại video, kênh đăng, chế độ render và gu tổng quát.
2. `MEMORY.md` — bài học áp dụng cho mọi buổi dựng.
3. `memory/README.md` + danh sách các file `memory/*.md` (trừ `README.md`, `archive.md`, `forgotten.md`) kèm số dòng hiện tại.

## 2. Khi người dùng muốn chốt bài học / lưu gu dựng

1. **Rà ngữ cảnh phiên hiện tại** (và file nhật ký `journal/sessions/` nếu đang dùng OMP có hook `learning-loop`): lọc ra những điểm sửa, sở thích thẩm mỹ, quy tắc kỹ thuật hoặc kết luận thật sự đáng tái sử dụng. Bỏ qua các chỉnh sửa chỉ đúng cho 1 video duy nhất.
2. **Kiểm chống trùng & chống quên nhầm:**
   - Đọc `MEMORY.md`, các file `memory/*.md` liên quan và `memory/forgotten.md` (nếu tồn tại).
   - Nếu một ý trùng với dòng người dùng từng bảo quên trong `memory/forgotten.md`, báo rõ ngày đã quên và hỏi xác nhận trước khi khôi phục.
3. **Phân đúng đích lưu:**
   - Sở thích chung về xưng hô, nền tảng chính, chế độ render, thư mục project → **`USER.md`**
   - Quy tắc đúng cho mọi buổi dựng → **`MEMORY.md`** (tối đa 200 dòng)
   - Gu riêng cho một thể loại video, công cụ hoặc một kênh/khách hàng cụ thể → **`memory/<slug>.md`** (tối đa 200 dòng; nếu chủ đề mới, đề xuất `slug`, `title`, `description`, `aliases`)
   - Quy trình lặp lại nhiều bước → **đề xuất tạo Skill mới** bằng `.agents/skills/skill-creator/SKILL.md` (chưa ghi Skill ở bước chốt memory này)
   - Chỉ đúng cho 1 video cụ thể → **không lưu**
4. **Trình MỘT danh sách đánh số và DỪNG CHỜ DUYỆT:**
   Mỗi dòng ghi rõ:
   `1. <bài học dạng quy tắc/điều kiện rõ ràng> · phạm vi: <chung | chủ đề slug | USER.md> · đích: <file> · nguồn: "<trích ngắn>"`
   - Nếu không có gì đáng lưu, nói thẳng *"Phiên này chưa có bài học mới cần lưu."*
   - Nếu ghi xong làm file vượt 200 dòng (hoặc có dòng `· đến YYYY-MM-DD` đã quá hạn), kèm ngay đề xuất chuyển bớt sang file chủ đề phù hợp hoặc `memory/archive.md` trong cùng danh sách.
5. **Chỉ ghi sau khi người dùng xác nhận** (ví dụ: *"đồng ý 1, 3; bỏ 2"*):
   - Đọc lại file đích ngay trước khi sửa.
   - Ghi theo định dạng: `- YYYY-MM-DD · <bài học> · nguồn: "<tóm tắt>"` (thêm `· đến YYYY-MM-DD` nếu bài học chỉ có hạn tạm).
   - Nếu tạo file `memory/<slug>.md` mới, ghi đủ frontmatter (`title`, `description`, `aliases`) và cập nhật mục lục `memory/README.md`.
   - Nếu đang dùng OMP có file nhật ký `journal/sessions/`, điền mục `## Kết quả chốt` và đổi `status: chốt` (hoặc `status: bỏ` nếu người dùng bỏ).
   - Báo ngắn các file đã cập nhật và gợi ý người dùng commit nếu muốn lưu mốc Git.

## 3. Khi người dùng muốn quên một quy tắc

1. Tìm đúng dòng liên quan trong `USER.md`, `MEMORY.md` hoặc `memory/<slug>.md` và xác nhận phạm vi xóa với người dùng nếu có nhiều dòng gần nghĩa.
2. Xóa dòng đó khỏi file hiện hành.
3. Ghi một dòng mô tả ngắn vào `memory/forgotten.md`:
   `- YYYY-MM-DD · đã quên: <mô tả ngắn> · từ: <file cũ>`
4. Báo rõ đã xóa ở đâu và đã ghi vào `memory/forgotten.md` để Sena không tự đề xuất lại.
