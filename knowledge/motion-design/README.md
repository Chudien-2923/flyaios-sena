---
title: Motion Design (LottieFiles) — bộ Instruction ứng dụng vào HyperFrames & Remotion
description: Hướng dẫn dùng bộ nguyên lý motion design từ LottieFiles/motion-design-skill (timing, easing, choreography, 12 nguyên lý Disney, 4 tính cách brand) và quy đổi thực chiến sang GSAP (HyperFrames) và spring/interpolate (Remotion) kèm 4 quy tắc hòa giải UI vs Video.
aliases: [motion-design, motion design, lottiefiles, disney principles, choreography, easing, timing, animation principles]
---

# Motion Design (`LottieFiles/motion-design-skill`) — bộ Instruction tra cứu

Nguồn: repo `LottieFiles/motion-design-skill` (HEAD `d77a9fc`, license **MIT**, ~256 KB, 18 file Markdown / 1.770 dòng), đối chiếu với [[knowledge/hyperframes/08-dao-dien-prompt]].

Trạng thái: **đã đi kèm nguyên bản MIT tại [[.agents/skills/motion-design/SKILL]]** (giữ nguyên `LICENSE`, không sửa vendor; chưa kiểm chứng qua job sản xuất lớn). **HyperFrames** là công cụ dựng mặc định; **Remotion** dùng khi yêu cầu.

## Kết luận nhanh

1. **Tồn tại dưới dạng gì?** **Thuần 1 Agent Skill (18 file Markdown, ~256 KB, giấy phép MIT)** — không có CLI, không có script Python/Node, không có dependency. *(Lưu ý: bản gốc có đoạn gợi ý **LottieFiles Creator MCP** hosted để xuất MP4/GIF/Lottie — **Sena KHÔNG cần Creator MCP này** vì dựng và xuất cục bộ bằng HyperFrames & Remotion.)*
2. **Giá trị cho HyperFrames & Remotion:** bổ sung phần tư duy "đạo diễn chuyển động trước khi code" (khung 8 bước trước khi tạo tween, 4 tính cách Brand Motion Identity để chốt 1 bộ easing/duration nhất quán, 12 nguyên lý Disney quy thành con số cụ thể, quy tắc 1/3 chống rối khung hình, counter-motion, bảng chẩn đoán "Looks Robotic / Feels Flat / Too Distracting").
3. **Cách dùng đúng:** luôn đọc kèm bộ Instruction cầu nối này để bỏ qua phần gợi ý Creator MCP / tương tác UI thuần và áp **4 luật hòa giải UI vs Video**.

## Đọc gì khi nào

| Tình huống | Mở |
| --- | --- |
| Khung đạo diễn 8 bước, 4 tính cách Brand Motion Identity, 12 nguyên lý Disney dạng con số, quy tắc 1/3, bảng cảm xúc & chẩn đoán lỗi motion | [[knowledge/motion-design/01-khung-dao-dien-va-thong-so]] |
| Quy đổi easing/spring sang GSAP (HyperFrames) & Remotion, **4 luật hòa giải UI vs Video** và những phần cần bỏ qua | [[knowledge/motion-design/02-ap-dung-hyperframes-va-remotion]] |

## 8 điều không được quên

1. **Luôn nghĩ cảm xúc & tính cách trước khi viết tween:** chốt 1 trong 4 tính cách cho cả video (**Playful / Premium / Corporate / Energetic**) và giữ 3 hằng số: *Signature Easing* (dùng cho 80% cảnh) + *3 nấc thời lượng* (Quick/Standard/Slow) + *1 kiểu Entrance nhất quán*.
2. **Không bao giờ dùng `linear` cho chuyển động vị trí:** `linear` chỉ dùng cho xoay liên tục, progress bar, đồng hồ đếm. Vào = `ease-out` (giảm tốc), ra = `ease-in` (tăng tốc), di chuyển trên màn hình = `ease-in-out`.
3. **Không dùng chỉ mỗi `opacity` cho thay đổi quan trọng:** luôn kết hợp ít nhất 2 thuộc tính cùng nghĩa (vd: `y + opacity` hoặc `scale + opacity`); tối đa 2–3 thuộc tính để không rối.
4. **Quy tắc 1/3:** với ≥ 3 đối tượng, không quá 1/3 số đối tượng đang chuyển động mạnh cùng một thời điểm; tổng thời gian stagger nên giữ gọn (< 500 ms cho một cụm UI/card).
5. **Bất đối xứng Vào > Ra:** phần tử rời đi nhanh hơn lúc vào (Exit ≈ 65–75% thời lượng Entrance).
6. **Luật Video thắng luật UI khi mâu thuẫn (đối chiếu [[knowledge/hyperframes/08-dao-dien-prompt]]):**
   - **Không thêm hiệu ứng "breathing" / phập phồng vô cớ** lên chữ hoặc hình đã đáp xuống (trong video sẽ lộ chất AI; tiêu đề đáp xuống phải **đứng yên** đủ lâu để đọc).
   - **Không áp overshoot/bounce lên chữ, số đang đếm hoặc UI tối giản** (counter overshoot làm hiện sai số; overshoot chỉ dành cho vật thể/card/nhân vật ở phong cách Playful/Energetic).
7. **Mọi chuyển động phải tất định theo thời gian:** cấm CSS `transition`/`@keyframes` và cấm GSAP `repeat: -1` (HyperFrames) hoặc `Math.random` (Remotion); mọi lớp secondary/ambient phải gắn vào timeline chính hoặc `useCurrentFrame()`.
8. **Bỏ qua hoàn toàn chỉ dẫn "Suggest Creator MCP" của repo gốc:** Sena dùng HyperFrames / Remotion cục bộ, không gợi ý cài thêm LottieFiles Creator MCP.
