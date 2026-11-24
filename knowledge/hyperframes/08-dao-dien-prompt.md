# HyperFrames — Từ vựng đạo diễn: brief, motion, transition, sửa video

Nguồn: docs `prompting/overview`, `motion`, `captions-catalog`, `examples`, `editing-existing-videos`, `recreating-references`, `capstone`, `design-systems`; skill `references/motion.md`, `spec.md`. Dùng khi Sena tự viết brief cho mình (`SPEC.md`), khi dịch feedback của người dùng thành thay đổi cụ thể, hoặc khi phối hợp dựng.

## Khung brief 6 phần

```
[route]      /hyperframes (trong plugin Claude: /hyperframes:hyperframes)
[spec]       8-second 1920x1080 video.
[beats]      Beat 1 (0–4s): … Beat 2 (4–5s): …  (mốc thời gian + chỗ giữ)
[copy]       chữ trên màn hình trong ngoặc kép, "/" = xuống dòng
[technique]  Adapt the `code-typing` and `vfx-shatter` registry blocks.
[negatives]  No narration, no image or media files.
```

- Mỗi element trong beat có 5 ô: **element · motion · layout · style · timing** ("số lớn đếm lên $4.2M kiểu odometer, ease-out khi chạm, ở giữa, xanh lá trên navy"). Element không mô tả = agent tự thiết kế (dễ trôi).
- Negatives chính xác: "no narration" vẫn còn nhạc/SFX → muốn im hẳn nói **"no audio at all"**. Đừng nói "no external assets" (CDN runtime là bình thường) → "no image or media files".
- Thời lượng có narration/script: ghi "**~60-second**" (giọng đọc quyết độ dài; ~130 từ/phút → 30 s ≈ 65–70 từ tiếng Anh). Muốn giữ nguyên chữ: "use it verbatim".
- Màu/logo/font: hex + đường dẫn (`#5E6AD2 on off-black; logo at assets/logo.svg`), không nói "brand colors". Brand truth: `frame.md`/site/Figma/brand kit; khóa màu, font, quan hệ weight; **phóng to** cỡ chữ, opacity trang trí, border cho video (shadow 1px/0.06 chết khi nén H.264).
- Sequencing viết rõ không chồng: "fades out fully by 4.2s; at 4.2s READY stamps in".
- 3D: luôn "Three.js via the adapter". Random: "seeded" (cùng seed mọi lần render).
- Hai chế độ: *describe* (độ dài, khung, mood, phần tử chính) hoặc *đưa tư liệu* (URL, doc, CSV, transcript, PR) → giàu và đúng chữ hơn.

## Sửa vòng lặp (nói như editor)

- Một biến mỗi lần render; mục tiêu tuyệt đối (`dot radius = 25% row spacing`), không tương đối.
- **Freeze clause**: "framing and motion are right — don't touch them; only change X."
- Xây từng lớp: chủ thể + motion → camera → nền chuyển động → style. Một scene hỏng mãi → gỡ hết rồi xếp lại.

### NLE verb → câu lệnh → attribute bị sửa

| Ý người dùng | Verb | Sửa gì |
| --- | --- | --- |
| "Lower third bắt đầu ở 0:06" | Move | `data-start` |
| "Captions nằm trên video" | Restack | `z-index` (+ `data-track-index` chỉ là lane hiển thị) |
| "Logo kết thúc sớm hơn" | Trim right | `data-duration` |
| "Bỏ giây đầu của clip" | Trim front (chỉ media) | `data-media-start` |
| "Scene 2 dài 2 giây" | Retime | `data-duration` + timing tween (scene cuối → tăng root `data-duration`) |
| "Nhạc nền to quá" | Level | `data-volume` / carve |
| "Cắt scene 2 ở 0:04" | Split | 1 clip → 2 clip |
| "Scene 2 nhanh gọn hơn" | Retime feel | ease (`power4.out`) + duration |
| "Entrance đi 40px, không phải 200" | Keyframe | giá trị/ease/path tween |
| "Thay nhạc bằng assets/track.mp3" | Swap | `src` (kiểm lại crop/độ dài/cut) |
| `Đổi headline thành "Ship faster." — giữ style` | Copy | text |

- "Kéo dài scene 2" mơ hồ → "scene 2 = 4s, cùng motion, phần thêm là hold ở cuối".
- Độ dài render = root `data-duration`, **không** theo độ dài GSAP; không độn bằng `tl.set({}, {}, t)`.
- Browser editor có move/trim/split/ripple-delete; **chưa có slip/slide/roll**.

## Sửa motion theo cái thấy

| Thấy | Nói | Agent đổi |
| --- | --- | --- |
| Quá nhanh | "Slow the zooms and pans." | camera ~0.7×, phần khác giữ |
| Lê thê | "Speed this up." | rút beat + nội dung, kéo beat sau lên |
| Title trôi/phình sau khi chạm | "Land the titles, then hold them still." | đến → đứng yên → rời cùng scene |
| Như slide | "Carry one thing across each cut." | vào scene sau qua một element; cut giữa chuyển động |
| Mọi thứ hiện cùng lúc | "Bring things in one after another, on the voice." | stagger chồng lấn |
| Nảy/rẻ tiền | "No bounce on text or UI." | giảm tốc dài; overshoot chỉ cho vật thể |
| Giật ở cut | "There's a jump at 4.2 s." | khớp vị trí/tốc độ qua cut |
| Scene chết | "Scene 3 is dead. Give it something to do." | hành động thật (UI chạy, footage, camera đi) |

### 8 ý motion đáng gọi tên

1. **Chỉ cái đang sống mới chuyển động** — sau khi chạm, chỉ dữ liệu thay đổi mới động; không "breathing" (lộ chất AI).
2. **Camera đi để tới đâu đó** — dàn element rộng hơn khung rồi dolly qua; không push-in vô cớ.
3. **Chồng lấn, đừng xếp hàng** — stagger ngắn hơn độ dài animation.
4. **Một ý một chuyển động** — chỉ gộp thuộc tính cùng nghĩa (rise + fade = đến).
5. **Trọng lượng chỉ cho vật thể** — overshoot cho thẻ/nhân vật; không cho chữ/UI/số (counter overshoot = hiện số sai).
6. **Gần đi nhanh hơn** — lớp xa 1/5, giữa 1×, một lớp tiền cảnh mờ ~6×; một lớp tiền cảnh là đủ.
7. **Nhịp theo format** — showreel 1–4 s/ý; product demo giữ khung 7–10 s.
8. **Thủ công nhưng tất định** — stop-motion: seed random mỗi element, giữ đúng **2 frame**, lượng tử theo frame index (nói frame, không nói giây).

### Cảm giác → ease GSAP

| Nói | Ease | Cảm giác |
| --- | --- | --- |
| smooth | `power2.out` | giảm tốc tự nhiên |
| snappy | `power4.out` | nhanh, dứt khoát |
| bouncy | `back.out` | vượt rồi về |
| springy | `elastic.out` | dao động vào |
| dramatic | `expo.out` | bật nhanh, lướt dài |
| dreamy | `sine.inOut` | chậm, đối xứng |

Thời lượng: 0.2 s năng lượng · 0.4 s chuyên nghiệp · 0.6 s sang · 1–2 s điện ảnh.

## Transition

- Transition tốt do nội dung gây ra (zoom xuyên nút, card phình thành scene sau, nền tràn khi chủ thể đứng yên). 3–5 loại/phim; không dissolve giữa scene không liên quan. Không yêu cầu "fade out rồi fade in" (ra jump cut có dip) → gọi tên block.

| Năng lượng | Shader block | CSS block | Độ dài |
| --- | --- | --- | --- |
| Êm (wellness, brand story) | `cross-warp-morph`, `light-leak` | `transitions-blur` | 0.5–0.8 s |
| Vừa (SaaS, explainer) | `whip-pan`, `cinematic-zoom` | `transitions-push`, `transitions-cover` | 0.3–0.5 s |
| Cao (promo, nhạc, launch) | `ridged-burn`, `glitch`, `chromatic-radial-split` | `transitions-scale`, `transitions-light` | 0.15–0.3 s |

Ví dụ ghim: "Use `whip-pan` between related points, and one `cinematic-zoom` into the final pricing reveal. About 0.4 s each." Cut: hard cut, match cut (chuyển động mang qua), zoom cut.

## Spec và mặc định bị cấm

- Composition: hero chiếm ≥40% chiều cao/rộng; một hero move/shot, chuyển động phụ đi 50–70% quãng, trễ 100–200 ms; thứ mới mỗi 2–4 s (có nhạc: đổi layout mỗi bar). Chữ cần đọc ≥28 px ở 1080 (2.6% cạnh ngắn), giữ 0.5 s + 0.3 s/từ — nhiều chữ thì cắt chữ, không thu nhỏ.
- Card thông tin (B-roll trên talking head, data beat): thông tin lên đủ trong ~2.5 s rồi giữ — pause bất kỳ cũng là poster hoàn chỉnh.
- **BANNED mặc định** (trừ khi brand/reference dùng): nền đen/navy trống với element nhỏ lơ lửng; glow/bloom/neon/lens flare/hạt trang trí; gradient tím-xanh, mesh gradient, glass card; nền kem + serif + chữ nghiêng + nhãn "01/02" + mono caps + pill; mọi thứ căn giữa, fade-in cùng lúc, fade+slide-up; chữ chuyển động khi đang đọc; nhãn góc/khung/HUD trang trí; 3 card hàng ngang, lưới KPI, title trên screenshot tối; logo nằm góc. Sau render đầu, ghi mọi default lọt vào BANNED và sửa.
- Look xây từ một **chất liệu** (riso: giấy, ink A, ink B, overprint lệch 3 px, halftone) và motion cũng theo chất liệu đó.

## Preamble dùng chung cho brief động (diễn giải từ docs examples)

> Density: one focal element at display scale, supporting elements on their own cues, permanent chrome. Three depth layers with parallax under one continuous camera that never fully settles. Entrances staggered at offsets shorter than the animations they offset. Overshoot on transforms only, never on text values. End on an ambient idle, never a frozen frame.

Mỗi brief thêm **Spectacle beat**: đúng một khoảnh khắc phóng đại, viết rõ (không viết là bị bỏ). Docs chỉ mô tả preamble, không in nguyên văn — bản trên là diễn giải.

## Làm lại theo reference

1. Chép motion từng frame: độ dài, đường camera, hành động từng element có timestamp, chồng lấn, lớp mờ, màu lấy mẫu (~75% lần đầu).
2. Lặp với mục tiêu tuyệt đối, một trục mỗi lần, đóng băng phần đã khớp.
3. Đưa hằng số đã hội tụ ngược vào prompt (build mới ~80–90%). Thông số rời (timing, số đếm, hex, tỉ lệ) chuyển nguyên vẹn; cảm giác liên tục (glow, framing) dao động.
4. Cần khớp pixel → giữ file composition đã hội tụ. Phân tích reference phải lưu cả **nhịp chuyển động**, không chỉ hình/mốc cắt.

## Capstone: khi phim pass check mà vẫn như slideshow

"Linter kiểm timeline hợp lệ; chỉ prompt đòi được cinematography." Hợp đồng quay phim: một camera **dwell & sweep** (lướt giữa vùng, dừng thật 1.5–2.5 s khi điểm chính chạm, tăng tốc rời đi); **đến chứ không cắt** (vùng sau hiện ở mép trước khi tới); không dấu hiệu slideshow (không fade-in giữa rồi đứng rồi fade-out); có element xuyên suốt (một đường dây trở thành baseline chart, cung bản đồ, waveform).
