# Memory theo chủ đề (`memory/`)

Thư mục này lưu các bài học và gu dựng **áp dụng riêng cho một công cụ, một thể loại video hoặc một kênh/khách hàng cụ thể** (giữ gọn dưới 200 dòng mỗi file).

## Chủ đề mặc định đi kèm

- [[memory/hyperframes]] — Quy ước tài nguyên miễn phí và giới hạn TTS khi dựng bằng HyperFrames.
- [[memory/footage]] — Nguồn API công khai miễn phí để tìm footage quay thật (B-roll, tư liệu lịch sử/khoa học/vũ trụ).
- [[memory/3d-video]] — Quy ước chủ động đề xuất cài chọn lọc Three.js skills khi có scene 3D.

## Tạo chủ đề mới (ví dụ gu theo từng kênh)

Khi bạn muốn dạy Sena gu riêng cho từng thể loại hoặc kênh (ví dụ `memory/kenh-saas.md`, `memory/vlog-ca-nhan.md`, `memory/talking-head.md`), tạo file với frontmatter ở đầu để hook OMP và Sena dễ tìm đúng ngữ cảnh:

```markdown
---
title: Kênh SaaS Demo
description: Gu dựng, nhịp cắt và bảng màu riêng cho video giới thiệu sản phẩm SaaS
aliases: [saas, demo, launch film]
---
```

- `memory/archive.md`: chỉ tạo khi chuyển bớt bài học cũ hoặc hết hạn ra khỏi file chính (không tự nạp).
- `memory/forgotten.md`: chỉ tạo khi bạn yêu cầu Sena quên một quy tắc để tránh tự đề xuất lại.
- Quy trình chốt, sửa, quên và phân scope nằm tại [[LEARNING]] và skill [[.agents/skills/sena-memory/SKILL]].
