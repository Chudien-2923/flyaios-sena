# Motion Design — Khung đạo diễn, tính cách brand và bảng thông số

Nguồn: trích lọc thực chiến từ `LottieFiles/motion-design-skill` (`SKILL.md`, `director/*`, `patterns/*`, `reference/*`, MIT, bản đọc 2026-11-24). Đã lược bỏ phần tương tác UI thuần (hover, click, toggle, `prefers-reduced-motion`).

## 1. Checklist 8 bước trước khi viết animation cho một cảnh

1. **Mục tiêu cảm xúc?** (Vui tươi / Điềm tĩnh / Khẩn trương / Sang trọng / Bùng nổ)
2. **Tính cách chuyển động (Motion Personality)?** (chọn 1 cho cả video: Playful / Premium / Corporate / Energetic)
3. **Thuộc tính chính?** (`position`, `scale`, `rotation`, `opacity`, `clip-path`)
4. **Thời lượng?** (tỉ lệ với trọng lượng đối tượng & quãng đường di chuyển)
5. **Họ easing?** (vào = decelerate/`ease-out`, ra = accelerate/`ease-in`, trong khung = `ease-in-out`)
6. **Đối tượng Hero (Staging)?** (Hero vào nổi bật nhất; nền/phụ dịu hơn 40–60% hoặc mờ nhẹ 2–4 px)
7. **Lớp Secondary & môi trường?** (bóng đổ, đường kẻ, nền dịch nhẹ sau primary 50–100 ms — lưu ý luật Video không lạm dụng "breathing")
8. **Kiểm quy tắc 1/3 & khoảng thở?** (tối đa 1/3 phần tử động cùng lúc; giữ khoảng nghỉ 100–200 ms sau khi đáp xong trước nhịp mới)

## 2. Cấu trúc 3 trụ cột & 4 hồi cho một nhịp chuyển động (Micro-story)

- **3 trụ cột:** (1) *Emotional Intent* (người xem phải cảm thấy gì → quyết định easing/timing/biên độ) → (2) *Visual Narrative* (Setup 20–30% → Action 30–40% → Resolution 30–40%) → (3) *Motion Craft* (vật lý, secondary motion, đường cong).
- **4 hồi cho nhịp lớn (400–800 ms+):**
  1. **Anticipation (10–20%):** lấy đà ngược nhẹ 10–20% quãng đường (vd: lùi 5–10 px hoặc nén scale 0.97 trong 100–200 ms). *Bỏ qua ở phong cách Premium tối giản hoặc động tác <150 ms.*
  2. **Action (30–50%):** chuyển động chính mang thông điệp.
  3. **Reaction (10–20%):** bóng đổ phản ứng (trễ 50–100 ms), phần tử kế cận nhích nhẹ (50–150 ms), hoặc **Counter-motion** (Hero đi trái → nền dịch ngược phải ở tốc độ 20–30%; Hero phóng to → bóng thu/mềm ra 10–20%).
  4. **Resolution (20–30%):** đáp êm / hồi về vị trí cuối + **khoảng tĩnh 100–200 ms** (với chữ/tiêu đề trong video phải giữ đứng yên tối thiểu `số_ký_tự / 15 + 1.5 s`).

## 3. 4 tính cách Brand Motion Identity (chọn 1 làm chủ đạo 90% video)

| Tính cách | Thời lượng (Quick / Std / Slow) | Signature Easing (80% cảnh) | Overshoot | Squash-Stretch | Hợp với loại video / brand |
| --- | --- | --- | --- | --- | --- |
| **Playful** | 150 / 250 / 400 ms | `ease-out-back` / spring nảy | 10–20% | Có (khi chạm) | Social vui tươi, đồ họa minh họa, ăn mừng |
| **Premium / Luxury** | 350 / 500 / 800 ms | `cubic-bezier(0.4, 0, 0.2, 1)` | **0%** | **Không bao giờ** | Thời trang cao cấp, editorial, portfolio, SaaS flagship |
| **Corporate** | 200 / 300 / 450 ms | `cubic-bezier(0.2, 0, 0, 1)` | 0–3% | Không | Explainer chuyên nghiệp, SaaS, báo cáo số liệu, dashboard |
| **Energetic / Dynamic** | 100 / 180 / 300 ms | `ease-out-expo` / elastic | 15–30% | Có (mạnh) | Thể thao, khuyến mãi/flash sale, teaser, nhạc, short-form |

## 4. 12 nguyên lý Disney quy đổi thành thông số thực chiến

| Nguyên lý | Con số áp dụng nhanh | Lưu ý |
| --- | --- | --- |
| **Squash & Stretch** | Nén `[1.2, 0.8]`, kéo `[0.85, 1.15]` (giữ nguyên diện tích); 2–4 frame chạm, 4–8 frame hồi | Bỏ qua cho brand Premium/Luxury và chữ. |
| **Anticipation** | 100–200 ms, biên độ 10–20% hướng ngược lại | Bỏ qua cho nhịp <150 ms. |
| **Staging** | Giảm phần tử phụ còn 40–60% opacity (hoặc blur 2–4 px); 1 hành động chính mỗi beat | Không để 2 Hero tranh mắt cùng lúc. |
| **Follow-Through & Overlap** | Phần tử con trễ **50–150 ms** sau phần tử cha; điểm dừng lệch 100–200 ms | Dùng spring mềm hơn cho phần tử kéo đuôi. |
| **Slow In / Slow Out** | Vào `ease-out`; ra `ease-in`; di chuyển trong khung `ease-in-out` | Cấm `linear` cho chuyển động vị trí. |
| **Arcs** | Lệch vuông góc 10–20 px ở trung điểm (5 px cho Corporate, 20 px+ cho Playful) | Đường thẳng chỉ dùng khi cố ý tạo cảm giác cơ khí/khẩn cấp. |
| **Secondary Action** | Biên độ 30–50% của primary, trễ 50–100 ms, **khác easing** với primary | Ví dụ: card vào → bóng bung ra; chữ vào → vạch gạch chân chạy theo. |
| **Timing & Trọng lượng** | Nặng (overlay/cảnh lớn): 400–800 ms, 0% overshoot · Vừa (card): 200–350 ms, 3–5% · Nhẹ (badge/icon): 80–200 ms, 5–15% | Quãng đường tỉ lệ thời lượng: 100 px = 1× · 200 px = 1,3× · 400 px = 1,6× · toàn khung = 1,8–2×. |
| **Chất liệu (Material)** | Kim loại/đá: 1,2× (0% overshoot) · Cao su: 0,8× (15–25%) · Giấy/thẻ: 1× (3–5%) · Nước: 1,5× (5%) · Khói/khí: 2× (0%) | Gắn chất liệu cho vật thể để chuyển động có "sức nặng" thật. |

## 5. Bản đồ Cảm xúc → Đường đi & Chuyển động

| Cảm xúc | Đường đi (Path) | Easing | Nhịp tham khảo |
| --- | --- | --- | --- |
| Vui / Hứng khởi | Cong hướng lên | `ease-out-back` | 200–400 ms |
| Điềm tĩnh / Sang trọng | Cung dài mượt | `(0.4, 0, 0.2, 1)` hoặc `sine.inOut` | 400–1000 ms |
| Khẩn trương / Cảnh báo | Thẳng, dứt khoát | `ease-out` / `power4.out` | 100–200 ms |
| Bất ngờ / Cú đánh | Bung tỏa từ tâm (radial) | `ease-out-expo` | 150–300 ms |
| Chắc chắn / Tiến bước | Thẳng ngang / chéo | `ease-out` | 200–400 ms |

## 6. Bảng chẩn đoán nhanh khi xem preview thấy "chưa đã"

| Triệu chứng khi xem preview | Nguyên nhân hay gặp | Cách sửa ngay |
| --- | --- | --- |
| **Cứng, giống robot** | Dùng `linear`, đi đường thẳng, mọi thứ bắt đầu & dừng cùng frame | Đổi sang `ease-out`, thêm stagger 50–100 ms, lệch điểm dừng 50–150 ms, thêm đường cong nhẹ |
| **Phẳng, rẻ tiền** | Chỉ có 1 lớp primary hoặc chỉ fade `opacity` | Kết hợp `position`/`scale` + thêm lớp secondary (bóng, vạch nhấn, nền counter-motion 20%) |
| **Rối mắt, loạn nhịp** | Quá nhiều thứ cùng chạy, biên độ quá lớn, không có khoảng tĩnh | Áp quy tắc 1/3, khóa 1 Hero mỗi beat, chừa 100–200 ms nghỉ giữa các beat |
| **Chậm, lê thê** | Duration vượt khung hoặc dùng `ease-in-out` cho lúc vào | Rút duration, đổi Entrance sang `ease-out`, giữ tổng stagger cụm <500 ms |
| **Giật, cụt lủn** | Quá nhanh không có đoạn đáp (resolution) hoặc cú lớn thiếu đà | Thêm 50–100 ms đoạn đáp cuối hoặc 100–200 ms lấy đà trước chuyển động lớn |
