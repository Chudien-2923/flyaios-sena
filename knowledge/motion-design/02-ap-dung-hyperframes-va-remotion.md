# Motion Design — Cầu nối sang HyperFrames (GSAP) & Remotion

Mục tiêu: chuyển hóa nguyên lý từ `LottieFiles/motion-design-skill` thành **code chạy thật đúng contract** trên **HyperFrames** và **Remotion**, đồng thời tránh các lỗi sai khi bê nguyên quy tắc UI web sang video.

## 1. Bảng quy đổi Easing & Spring sang code HyperFrames / Remotion

| Ý đồ trong `motion-design` | HyperFrames (GSAP) | Remotion (`Easing` / `spring`) |
| --- | --- | --- |
| **Premium / Luxury** `(0.4, 0, 0.2, 1)` | `ease: "power2.inOut"` hoặc `CustomEase` `(0.4,0,0.2,1)` *(vào mượt: `power3.out`)* | `Easing.bezier(0.4, 0, 0.2, 1)` |
| **Corporate / Snappy** `(0.2, 0, 0, 1)` | `ease: "power3.out"` hoặc `power4.out` | `Easing.bezier(0.2, 0, 0, 1)` |
| **MD3 Emphasized (Entrance)** `(0.05, 0.7, 0.1, 1)` | `ease: "expo.out"` hoặc `power4.out` | `Easing.bezier(0.05, 0.7, 0.1, 1)` |
| **MD3 Accelerate (Exit)** `(0.3, 0, 1, 1)` | `ease: "power3.in"` | `Easing.bezier(0.3, 0, 1, 1)` |
| **Playful / Overshoot** `ease-out-back` | `ease: "back.out(1.4)"` *(nhẹ)* – `"back.out(1.7)"` *(vui)* | `Easing.out(Easing.back(1.5))` hoặc `spring({ stiffness: 200, damping: 14 })` |
| **Energetic / Snap** `ease-out-expo` | `ease: "expo.out"` | `Easing.out(Easing.exp)` |
| **Ambient mượt** `sine ease-in-out` | `ease: "sine.inOut"` *(lặp số lần hữu hạn, cấm `repeat: -1`)* | `Math.sin(...)` theo `frame / fps` |
| **Spring chuẩn / nảy / dịu** | `elastic.out(1, 0.6)` hoặc hàm spring đóng | `spring({ fps, frame, config: { stiffness: 250–350, damping: 18–24 } })` *(nảy: 150–250 / 10–15; dịu: 100–150 / 20–25)* |

*Lưu ý quy đổi thời lượng sang frame (30 fps):* `100 ms = 3 frame` · `150 ms ≈ 5 frame` · `200 ms = 6 frame` · `300 ms = 9 frame` · `400 ms = 12 frame` · `500 ms = 15 frame` · `600 ms = 18 frame`.

## 2. 4 luật hòa giải BẮT BUỘC khi chuyển từ UI sang VIDEO

`LottieFiles/motion-design-skill` được viết gốc cho **UI web/app**, còn Sena dựng **video render**. Khi có xung đột với [[knowledge/hyperframes/08-dao-dien-prompt]] hoặc contract của HyperFrames/Remotion, **luật Video thắng**:

| Điểm trong `motion-design-skill` (UI) | Xung đột khi dựng Video | Quy tắc Sena áp dụng |
| --- | --- | --- |
| *"Always three motion layers — ambient (breathing, subtle pulses)"* | Trong video, cho chữ/thẻ "thở" (breathing) sau khi đáp làm lộ chất AI và khó đọc (`08-dao-dien-prompt.md` #1). | Lớp ambient chỉ đặt ở **nền / ánh sáng / hạt nhẹ / camera drift có chủ đích**; **tiêu đề & thông tin đáp xuống phải đứng yên** cho người xem đọc. |
| *Overshoot 10–30% cho Playful / Energetic* | Overshoot trên chữ nhỏ, UI tối giản hoặc số đang đếm làm rẻ tiền / hiện sai số (`08-dao-dien-prompt.md` #5). | Chỉ áp overshoot/squash-stretch cho **vật thể, badge, thẻ, hình minh họa**; **không bounce lên text chính hay bộ đếm số**. |
| *Duration UI ngắn (150–350 ms)* | Video 30 fps có cảm giác nhanh hơn UI tương tác (người xem không bấm tay để đón nhịp). | Giữ nhịp micro-stagger 50–100 ms, nhưng **nâng duration cảnh/tiêu đề lên 1 nấc** (350–700 ms cho entrance lớn; hold chữ tối thiểu `số_ký_tự / 15 + 1.5 s`). |
| *Ví dụ CSS transitions / loop vô hạn* | HyperFrames và Remotion render từng frame bằng seek tất định; CSS animation & `repeat: -1` gây lệch/hỏng render. | **HyperFrames:** dùng `gsap.timeline({ paused: true })` trong `window.__timelines`, lặp số lần hữu hạn. **Remotion:** mọi thuộc tính tính thuần từ `useCurrentFrame()`. |

## 3. Những phần trong repo gốc cần BỎ QUA khi dựng video

- **Mục `Rendered File Exports (Creator MCP)` & `reference/export-and-render.md`:** LottieFiles dùng mục này để gợi ý cài server hosted `creator.mcp.lottiefiles.com/mcp` xuất MP4/GIF/Lottie. **Bỏ qua hoàn toàn** — Sena dựng và render cục bộ bằng HyperFrames / Remotion theo chế độ render trong [[USER]].
- **Mục UI tương tác thuần:** `hover`, `press/tap`, `long press`, `drag start`, `prefers-reduced-motion` (chỉ hữu ích nếu làm video mô phỏng thao tác giao diện app/screen demo).

## 4. Khi nào nên áp dụng bộ nguyên lý này?

- **Nên mở đầu mọi job motion graphics / SaaS launch / poster động / explainer** (bước lên `SPEC.md` của HyperFrames hoặc storyboard của Remotion): chọn 1 trong 4 tính cách + chốt 3 hằng số Brand Motion Identity ngay trong SPEC.
- **Khi tự kiểm preview (hoặc sửa theo feedback kiểu "nhìn hơi cứng / hơi rối / chưa sang"):** tra thẳng bảng chẩn đoán ở mục 6 của [[knowledge/motion-design/01-khung-dao-dien-va-thong-so]] để sửa đúng nguyên nhân thay vì đoán mò.
- **Không cần kéo vào** job cắt ghép talking-head thuần hoặc chỉnh 1 lỗi chính tả nhỏ.

## 5. Vị trí Skill trong repo Sena

Skill đã đi kèm sẵn bản gốc MIT tại `.agents/skills/motion-design/` (giữ nguyên `LICENSE`, không sửa vendor). Trên OMP và Antigravity CLI, harness tự nhận trực tiếp; trên Claude Code chạy `node scripts/sync-claude-skills.mjs`. Luôn áp dụng kèm 4 luật hòa giải tại tài liệu này.
