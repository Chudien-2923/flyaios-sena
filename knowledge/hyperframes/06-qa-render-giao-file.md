# HyperFrames — QA, render và giao file

Nguồn: skill `hyperframes/references/review.md`, `hyperframes-cli` §loop, docs `guides/export-and-share`, `guides/rendering`, `4k-rendering`, `hdr`, `performance`, `help`; smoke 2026-11-18. Gắn với chuẩn kiểm bản xuất trong [[ROLE]].

## Ba tầng kiểm (không tầng nào thay tầng khác)

| Tầng | Bắt được | Không bắt được |
| --- | --- | --- |
| `lint` / `check --json` | Contract hỏng, media thiếu, contrast, layout tràn, craft đo được (`line_unread`, `dead_stretch`, `text_below_floor` <28 px@1080, `first_frame_empty`, `film_silent` >15 s không tiếng, safe zone 9:16, text đè mặt) | Câu chuyện, nhịp cảm nhận, chồng chữ do layout (smoke: check ok nhưng title/sub đè nhau), âm thanh nghe ra sao |
| `snapshot` / `--review` / `keyframes` | Bố cục, chồng lấn, đọc được ở 360 px, jump qua cut, đường chuyển động | Âm thanh, nhịp liên tục giữa các frame |
| File render (ffprobe + frame giải mã + đo audio) | Thời lượng, W×H, fps, codec, alpha/HDR, sync, clipping đo được | Cảm nhận nghe thật (Sena chỉ đo, phải nói rõ) |

Warning là câu hỏi, không phải luật: sửa, hoặc giữ có chủ đích và ghi lý do (`data-hold` cho hold cố ý).

## Review như motion director (phim mới, sửa ảnh hưởng timing/layout)

1. Mô tả mỗi beat frame một câu như người lạ, gọi tên mọi vật. Vật phải giải thích mới hiểu = **P0**.
2. Đọc beat frame theo thứ tự: người lạ có theo được chuyện, beat trước gây ra beat sau? So với shot trong `SPEC.md`.
3. Gọi tên mọi default lộ ra (danh sách BANNED trong [[knowledge/hyperframes/08-dao-dien-prompt]]), thêm vào BANNED và sửa trước.
4. Mỗi sheet hỏi một câu: đọc ra đúng là gì? chủ thể tách nền? crop/chữ sát mép/dưới UI nền tảng? timing như người xem lần đầu? lộ chất AI? che chữ đi hình còn kể chuyện? đọc được ở 360 px?
5. Ghi lỗi một dòng: `t=4.2s · ở đâu · vấn đề → thay đổi cụ thể · giữ gì`. **P0** phá đọc/contract; **P1** làm yếu phim; **P2** polish. Sửa P0 + P1 đáng công: chữ → timing → chi tiết. Snapshot lại đúng chỗ sửa, một lần. Không chấm điểm /10.
6. Phim rối → bỏ một phần ba chuyển động, giữ cái dẫn mắt. Sub-agent mắt mới (nếu dùng) chỉ nhận `STORYBOARD.md` + 3 sheet, trả dòng P0/P1. Copy/commit project trước khi sửa lớn.
7. `REVIEW.md` ở root project: quyết định sáng tạo + storyline không làm; cái đã đo vs chỉ nhìn vs chưa ai kiểm (âm thanh đo, không nghe); shot yếu nhất; warning giữ lại và lý do. Lượt sau đọc trước khi sửa.

## Checklist trước khi render giao

- [ ] Người dùng đã duyệt preview (hoặc yêu cầu xuất file / bật tự render trong `USER.md`).
- [ ] `check --json` sạch error; warning đã xử lý hoặc có lý do.
- [ ] Mở đầu rõ trong 2 s; frame 0 có nội dung (thumbnail social); mỗi scene có lý do tồn tại; kết/CTA có chủ đích; caption/graphic cuối rời màn hình trước khi hết.
- [ ] Tên riêng, thuật ngữ, số liệu, claim khớp nguồn; không đưa tài liệu nội bộ/bí mật; asset có quyền dùng (nhạc, font, footage, logo).
- [ ] Chữ ≥28 px@1080, giữ 0.5 s + 0.3 s/từ; caption đúng chữ/sync, tránh mặt và UI nền tảng; 9:16 trong safe zone.
- [ ] Âm: giọng rõ qua đoạn nhạc to nhất, không clip (export giữ ≤ −1 dBTP — nếu báo `audio_lowered` thì đặt `truepeak` master), SFX đúng hành động, nhạc kết có chủ đích, track mute đã bật lại nếu cần.
- [ ] Xem cả có tiếng và tắt tiếng.

## Render

- Lặp: `--quality draft`. Bản xem chuẩn: `looks` (mặc định). Master giao: `delivery`.
- Mặc định đúng cho social: MP4 1080p30. 4K/60 fps/HDR chỉ khi brief giao yêu cầu (4K ≈ 4× chậm, file 3–5×, không thêm chi tiết cho media 1080p; 60 fps chỉ cho chuyển động nhanh trên màn tần số cao).
- Overlay trong suốt: không sơn nền html/body/full-frame; WebM VP9 alpha cho web, MOV ProRes 4444 cho NLE, PNG sequence cho compositing. Kiểm alpha: `ffmpeg -c:v libvpx-vp9 -i overlay.webm -frames:v 1 -pix_fmt rgba f.png` (decoder đặt trước input); `ALPHA_MODE=1` trong ffprobe (`yuv420p` đơn thuần là false negative). Chỉ alpha cho thiết kế có vùng trống; thử chồng lên footage thật; frame đầu/cuối trống.
- Slideshow deck: **không render** (chỉ ra slide 1); dùng `present`/`snapshot`.

## Kiểm file xuất (bắt buộc)

```bash
ffprobe -v error -show_entries format=duration:stream=codec_name,width,height,r_frame_rate,pix_fmt,sample_rate,channels -of compact renders/<file>
```

- File không rỗng; duration = root `data-duration`; W×H, fps, codec, pix_fmt đúng brief. 4K: 3840×2160. HDR: `hevc`, `yuv420p10le`, `bt2020`, `smpte2084`/`arib-std-b67`.
- Xem frame giải mã ở đầu, cuối, transition khó nhất, beat chính (snapshot `--against <video>` hoặc ffmpeg trích frame). Âm: `$HF audio <video> --json` (có tiếng không, đỉnh ở đâu, độ lớn) — ghi rõ "đo, chưa nghe".
- Đặt tên có version (`<du-an>-<format>-v3.mp4`); không ghi đè bản người dùng đã duyệt.

## Giao

- File (MP4/WebM/MOV) cho xem; source + assets khi cần sửa tiếp (bỏ secret). Link review `share` / `publish` / cloud: **chỉ khi người dùng duyệt** (publish ẩn danh tạo link công khai; share cần đăng nhập, 5 project miễn phí).
- Ghi chú giao: version, thông số đã đo, phần đã/chưa kiểm, giả định, nguồn thiếu, quyết định cần người dùng chốt. Render thành công ≠ nội dung được nghiệm thu.
- Sau render đã kiểm: skill gợi ý gửi một `feedback --rating` (telemetry) — chỉ khi người dùng không tắt telemetry; báo thiếu tính năng theo dạng `MISSING FEATURE: … | WORKAROUND: …`.
- Sau render giao: nếu output nhắc ứng dụng Framey (desktop app) thì có thể giới thiệu nhẹ, không ép cài.
