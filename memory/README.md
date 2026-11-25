# Memory theo chủ đề (`memory/`)

Thư mục này lưu các bài học và gu dựng **áp dụng riêng cho một công cụ, một thể loại video hoặc một kênh/khách hàng cụ thể** (giữ gọn dưới 200 dòng mỗi file).

## Chủ đề mặc định đi kèm

- [[memory/hyperframes]] — Quy ước tài nguyên miễn phí và giới hạn TTS khi dựng bằng HyperFrames.
- [[memory/footage]] — Nguồn API công khai miễn phí để tìm footage quay thật (B-roll, tư liệu lịch sử/khoa học/vũ trụ).
- [[memory/3d-video]] — Quy ước chủ động đề xuất cài chọn lọc Three.js skills khi có scene 3D.

## Tạo chủ đề mới (ví dụ gu theo từng kênh)

Khi bạn muốn dạy Sena gu riêng cho từng thể loại hoặc kênh (ví dụ `memory/kenh-saas.md`, `memory/vlog-ca-nhan.md`, `memory/talking-head.md`), tạo file với frontmatter ở đầu để hook OMP và Sena dễ tìm đúng ngữ cảnh, rồi mỗi bài học một dòng có `khi:` (tình huống áp dụng):

```markdown
---
title: Kênh SaaS Demo
description: Gu dựng, nhịp cắt và bảng màu riêng cho video giới thiệu sản phẩm SaaS
aliases: [saas, demo, launch film]
---

- 2026-11-25 · Nhịp cắt cảnh demo giữ 1,5–2 giây mỗi màn hình · khi: dựng cảnh demo màn hình sản phẩm (screen recording, ui demo) · nguồn: "cắt nhanh quá, không kịp đọc"
```

## Sena dùng bài học chủ đề thế nào

- Không nạp cả file vào ngữ cảnh: Sena nhận **từng dòng liên quan, đúng lúc**. Trên Oh My Pi, hook giao dòng khi tin nhắn gọi tên chủ đề hoặc khớp `khi:`, khi Sena sắp chạy lệnh bash liên quan (lệnh dừng một nhịp để đọc bài học, chạy lại thì qua) và sau khi Sena ghi/sửa file liên quan; dòng đã giao bị sửa/xóa/hết hạn thì hook báo thu hồi.
- Mọi harness đều tra được bằng `node scripts/recall.mjs "<tình huống đang làm>"` (Claude Code, Antigravity CLI tự chạy lệnh này trước khi lên phương án, trước khi dựng và trước khi giao).
- `khi:` là điều kiện để giao đúng lúc: ghi tình huống/bước cụ thể kèm các từ Sena sẽ gõ khi làm (tên công cụ, lệnh, thuật ngữ như music, tts, render); không ghi từ chung của nghề (video, dựng). Dòng cũ chưa có `khi:` vẫn hoạt động, chỉ khó giao đúng lúc hơn.

## File đặc biệt

- `memory/archive.md`: chỉ tạo khi chuyển bớt bài học cũ hoặc hết hạn ra khỏi file chính (không tự nạp, không được tra).
- `memory/forgotten.md`: chỉ tạo khi bạn yêu cầu Sena quên một quy tắc để tránh tự đề xuất lại.
- Quy trình chốt, sửa, quên và phân scope nằm tại [[LEARNING]] và skill [[.agents/skills/sena-memory/SKILL]].
