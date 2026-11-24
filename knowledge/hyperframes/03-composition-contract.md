# HyperFrames — Composition contract (luật viết HTML để render đúng)

Nguồn: skill `hyperframes` SKILL.md §Contract + `references/format.md`; docs `concepts/compositions`, `data-attributes`, `variables`, `determinism`, `guides/gsap-animation`, `reference/html-schema`, `reference/lint-rules`, `reference/speed-ramps`; smoke 2026-11-18. Vi phạm phần lớn được `check --json` báo kèm dòng `Fix:`.

## 12 luật cứng

1. Mọi element có thời gian: `class="clip"` + `id` ổn định + `data-start` + `data-duration` (giây); hiện trong `[start, start+duration)` — trạng thái kết đặt ngay trước điểm cuối. `data-track-index` **chỉ là lane trong Studio**; thứ tự vẽ = `z-index`. Clip không bao giờ chồng nhau có thể chung một track.
2. Độ dài video = root `data-duration` (đọc **trước** script → biến/script không đổi được). Quá thì bị cắt, thiếu thì giữ frame cuối. Không độn bằng tween rỗng.
3. Mỗi composition một timeline **paused**, đăng ký **sau khi** đã thêm tween: `window.__timelines["<data-composition-id>"] = tl` (key phải khớp id). Scene timeline lồng vào root thì **không** paused. Composition tĩnh: `data-no-timeline` (không thì mỗi render chờ 45 s).
4. Tất định: không `Date.now()`, `requestAnimationFrame`, timer, `Math.random()`/`gsap.utils.random` không seed, fetch mạng, `repeat: -1`, CSS `transition`. Mọi thứ thấy được là hàm của thời gian timeline. Ưu tiên `fromTo()` + giá trị tuyệt đối (an toàn khi seek ngược/nhảy).
5. Không tween `display`/`visibility`/`autoAlpha`/opacity trên chính `.clip` → animate element con.
6. Không CSS `transform` trên element GSAP đang transform; animate `x/y/scale/rotation/opacity`, không `left/top/width/height/fontSize`.
7. Không `play()/pause()/currentTime` media. `<video>` có tiếng: `data-has-audio="true"`; không thì `muted` (khai báo đúng một). Nhạc, voice, tiếng thay thế, J/L cut = `<audio>` riêng.
8. Mọi `<audio>` có `id` (không thì bị loại khỏi mix). Không `crossorigin`. Time chính `<video>`, không time wrapper của nó. Không tự đóng `<video/>`, `<audio/>`.
9. Font: chỉ font bundled resolve theo tên; font khác cần `@font-face` trỏ file trong `assets/fonts/` (woff2). Smoke: khai "Inter" → compiler tự tải Google Fonts về cache và inject `@font-face` (đã thấy log), nhưng với font brand phải tự bundle.
10. Đường dẫn asset `assets/...` (không `/` đầu, không `../` vượt project), kể cả trong sub-composition.
11. Grade/grain/blur/vignette trên footage qua `media-treatment`, không CSS filter.
12. File scene: style + markup + script nằm **trong `<template>`**; style root bằng `#root` (không bằng class). Cố ý tràn/chồng: `data-layout-allow-overflow`, `data-layout-allow-overlap`.

## Cấu trúc project editable

```
my-video/
  index.html            # root: khai variables, chỉ chứa scene host + media + audio
  compositions/         # một scene một file (<template> …)
  assets/  assets/fonts/
  hyperframes.json  meta.json  package.json (pin version)
  SPEC.md  STORYLINES.md  REVIEW.md   # tài liệu đạo diễn (phim kể chuyện)
  .hyperframes/         # history, artifacts (snapshot, check report) — không xóa
  renders/
```

- Root chỉ giữ scene host, media, audio; mỗi scene một sub-composition, id ngắn dễ đọc. Element có thời gian viết trong HTML (không tạo bằng script).
- Một loại mỗi track: `data-track-kind="graphics"` cho scene/overlay host, `captions` cho host chứa mọi nhóm caption.
- Nội dung trong khung action-safe 90%, caption và chữ chính trong title-safe 80% (Studio tự vẽ guide, không tự vẽ).
- Lint thực tế (smoke): wrapper `.clip` chứa phần tử con ở root → `nested_structure_needs_subcomposition` (đưa vào sub-composition); hơn 3 element có thời gian trong một file → `timeline_track_too_dense`.

## Mẫu root + scene

```html
<!-- index.html -->
<div id="root" data-composition-id="main" data-start="0" data-duration="12"
     data-width="1920" data-height="1080" data-fps="30"
     data-composition-variables='[{"id":"headline","type":"string","label":"Headline","default":"Ship faster"}]'>
  <div id="intro" class="clip" data-composition-id="intro" data-composition-src="compositions/intro.html"
       data-start="0" data-duration="4" data-track-index="0" data-track-kind="graphics"></div>
  <div id="demo" class="clip" data-composition-id="demo" data-composition-src="compositions/demo.html"
       data-start="intro" data-duration="8" data-track-index="0" data-track-kind="graphics"></div>
  <audio id="music" src="assets/music.mp3" data-start="0" data-duration="12" data-volume="0.5"></audio>
</div>
```

```html
<!-- compositions/intro.html -->
<template id="intro-template">
  <div id="root" data-composition-id="intro" data-width="1920" data-height="1080">
    <style>#root .title { font-size: 120px; }</style>
    <h1 class="title" data-var-text="headline">Ship faster</h1>
    <script>
      const tl = gsap.timeline({ paused: true });
      tl.fromTo("#root .title", { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.6, ease: "power3.out" }, 0.2);
      window.__timelines = window.__timelines || {};
      window.__timelines["intro"] = tl;
    </script>
  </div>
</template>
```

- Host id = id trong file = key timeline. Thời gian con là **local** (host start 10 + video con start 2 = 12 toàn cục). Host ngắn hơn → cắt; timeline con ngắn hơn → giữ trạng thái cuối.
- `data-start="intro"` / `"intro + 0.5"` = bắt đầu khi clip `intro` kết thúc (cùng composition).
- Trim media `<video>/<audio>`: **`data-media-start`**; host composition lồng: `data-playback-start`. Dùng nhầm playback-start trên video → hình bị trim nhưng **tiếng không trim**.

## Variables (template, phiên bản hàng loạt)

- Khai trên root: `data-composition-variables='[{"id":"title","type":"string","label":"Title","default":"Pro"}]'` (JSON trong nháy đơn). 7 loại: `string, number, color, boolean, enum, font, image` (video/audio = string + `data-var-src`).
- Bind không cần script: `data-var-text`, `data-var-src` (luôn có `src` fallback), biến vô hướng thành CSS `var(--id)`. Đọc trong script: `window.__hyperframes.getVariables()`. Per-instance: `data-variable-values` trên host.
- Không làm biến được: kích thước, tổng thời lượng root, fps, format/codec/quality.
- Render: `--variables '{…}'`, `--variables-file`, `--strict-variables`; hàng loạt `--batch rows.json -o "renders/{name}.mp4"`. Chứng minh re-skin: render mặc định và render có `--variables`; hai file giống hệt = binding hỏng.
- Smoke: `data-var-text` không khai biến → lint `unknown_variable_binding` (giữ chữ fallback im lặng).

## Âm thanh trong HTML

- `data-volume` (1 = 0 dB, tối đa 3.98 = +12 dB), `data-fade-in`/`data-fade-out` (giây), `loop` native.
- `data-fx-chain`, `data-automation`, `data-fx-carve`, `data-audio-group` — JSON viết trong **nháy kép với `&quot;`** (script carve không đọc nháy đơn). Chain lỗi: preview chạy khô nhưng **render fail cả mix**. Chi tiết: [[knowledge/hyperframes/05-am-thanh-media-mau]].
- Speed ramp: `data-automation='{"version":1,"lanes":[{"target":"rate","points":[{"t":0,"v":1},{"t":2,"v":4}]}]}'` chỉ trên `<video>/<audio>` (0.1–10×, giữ pitch xấp xỉ); đặt `data-duration` để khóa độ dài.

## Runtime khác GSAP

- 3D: Three.js qua adapter (`window.__hfThreeTime`, `hf-seek`). Lottie: giữ file `.json/.lottie`, không vẽ lại. CSS keyframes/WAAPI chỉ khi giữ code có sẵn. Code tự viết theo thời gian: `registerFrameSource` + `data-no-timeline`.
- Motion blur: `data-motion-blur="on"` trên root (shutter 240° mặc định) — tốn 1.6–2.9× CPU, chỉ bật khi cần.
- WebGPU/HTML-in-Canvas: preview cần Chrome flag; luôn kiểm trên file render.

## Lint code hay gặp → cách sửa

| Code | Mức | Sửa |
| --- | --- | --- |
| `gsap_timeline_not_registered` / `timeline_id_mismatch` | E | đăng ký đúng key = composition id |
| `missing_data_no_timeline` | W | đăng ký timeline hoặc `data-no-timeline` (tránh chờ 45 s) |
| `gsap_animates_clip_element` | E | animate div con, không animate `.clip` |
| `gsap_non_transform_motion` | E | dùng x/y/scale thay left/top/width |
| `gsap_css_transform_conflict` | E | bỏ CSS transform, biểu diễn trong GSAP |
| `gsap_infinite_repeat` | E | repeat hữu hạn `Math.max(0, Math.floor(total/cycle)-1)` |
| `non_deterministic_code` | E | hằng số hoặc random có seed |
| `video_missing_muted` | E/W | `muted` hoặc `data-has-audio="true"` |
| `video_audio_double_source` | E | không để `<audio>` và `<video>` có tiếng cùng nguồn (vang) |
| `imperative_media_control` | E | bỏ play/pause/currentTime |
| `self_closing_media_tag` | E | `<video></video>` |
| `font_family_without_font_face` | E | `@font-face` file woff2 trong project |
| `missing_local_asset` / `audio_src_not_found` | E | sửa đường dẫn/thêm file |
| `color_grading_non_media` / `color_grading_invalid_structure` | E | grade chỉ trên img/video/canvas, đúng section |
| `subcomposition_style_outside_template` | W | đưa `<style>` vào trong `<template>` |
| `subcomposition_root_styled_by_class` | E | `id="root"` + `#root` |
| `caption_track_kind_missing` | W | `data-track-kind="captions"` |
| `caption_exit_missing_hard_kill` | E | `tl.set(group, {opacity:0, visibility:"hidden"}, end)` |
| `clip_ends_past_root_duration` | W | tăng root hoặc rút clip |
| `nested_structure_needs_subcomposition` | W | tách sang sub-composition |
| `unknown_variable_binding` | W | khai biến trên root |
| `negative_z_index` | W | `isolation: isolate` ở cha |

Danh sách đủ ~140 code: docs `reference/lint-rules.md`.
