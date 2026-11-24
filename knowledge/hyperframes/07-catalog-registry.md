# HyperFrames — Catalog (registry) đáng dùng

Nguồn: repo `registry/registry.json` HEAD v0.9.65 (210 block, 238 component, 8 example), `/_llms/catalog/catalog.txt` (449 trang), docs `prompting/captions-catalog`, `motion`, `data-and-maps`, `examples`. Tên = tên dùng với `add`. Chưa xem demo từng item; mô tả lấy từ docs/registry.

- **Block** = scene cài như sub-composition; **component** = effect/snippet trộn vào composition; **example** = project mẫu cho `init --example`.
- Tìm: `$HF catalog --query "<ý>"` (tìm theo nghĩa, model on-device) → `$HF add <name>`. Item là điểm xuất phát: nội dung demo phải viết lại; gọi đúng tên để ghim *kỹ thuật*. Tên không tồn tại (`page-curl`, `typewriter-bounce`) → agent đoán.
- Re-skin theo brand: theme 18 token (`--bg --fg --muted --surface --border --brand --accent --accent-2`, `--font-display/body/mono`, `--radius`, `--space-1..3`, `--dur-beat --ease-standard --ease-emphasis`).

## Example khởi đầu (`init --example`)

`warm-grain` (branding/lifestyle/editorial) · `play-mode` (social năng lượng, launch) · `swiss-grid` (kỹ thuật/corporate) · `kinetic-type` (promo chữ) · `decision-tree` (sơ đồ/tutorial) · `product-promo` (sản phẩm nhiều scene) · `nyt-graph` (chart editorial) · `vignelli` (thông báo dọc đậm) · `blank`.

## Theo nhu cầu dựng

| Nhu cầu | Item |
| --- | --- |
| Transition shader | `flash-through-white`, `whip-pan`, `cinematic-zoom`, `light-leak`, `glitch`, `chromatic-radial-split`, `cross-warp-morph`, `domain-warp-dissolve`, `ridged-burn`, `ripple-waves`, `sdf-iris`, `swirl-vortex`, `thermal-distortion`, `gravitational-lens` |
| Transition CSS / cut | `transitions-{blur,push,cover,scale,light,…}`, `whip-pan-cut`, `match-cut`, `text-match-cut`, `iris-reveal`, `directional-wipe`, `fade-through`, `grid-pixelate-wipe`, `zoom-through-transition`, `torn-paper-rip`, `curtain-reveal`, `beat-freeze-cut` (speed ramp + freeze + hard cut cho promo nhạc) |
| Lower third | `lt-clean-bar`, `lt-soft-pill` (tối giản) · `lt-bold-block`, `lt-color-block` (podcast) · `lt-accent-underline`, `lt-kicker-name`, `lt-mask-reveal`, `lt-side-rule` (không card) · `lt-dark-card` (footage sáng) · `lower-third-bild`, `news-ticker` (news) · `lt-stack-bars` (tên + chức danh) |
| Title / chữ động | `headline-slam`, `titlecard-calm`, `titlecard-lockup`, `kinetic-center-build`, `kinetic-type-swap`, `per-word-rise`, `focus-blur-resolve`, `marker-highlight`, `scramble-reveal`, `typewriter`, `split-flap-board`, `logo-outro`, `logo-brand-close`, `yt-logo-intro` |
| Chart / số / bản đồ | `data-chart` (bar+line kiểu NYT), `bar-chart-race`, `mk-line-graph`, `animated-bar-chart`, `mk-progress-stat`, `number-wheel`, `apple-money-count`, `conic-progress-ring`, `flowchart`, `us-map`, `us-map-bubble`, `us-map-flow`, `us-map-hex`, `world-map`, `spain-map`, `nyc-paris-flight` (không có map "mọi quốc gia") |
| Cursor / UI demo | `cursor-zoom-follow`, `agent-cursor`, `press-ripple`, `cursor-drag-drop`, `cursor-text-select`, `touch-indicator`; `app-showcase`, `device-frame-stage`, `vfx-iphone-device`, `ui-focus-zoom`, `signup-flow`, `terminal-simulator` |
| Code trên màn hình | `code-typing` (5 s), `code-diff` (6 s), `code-highlight` (5 s), `code-scroll` (6 s), `code-morph` (7 s); trình diễn: `code-3d-extrude`, `code-shader-dissolve`, `code-particle-assemble` |
| Social overlay | `x-post`, `reddit-post`, `instagram-follow`, `tiktok-follow`, `yt-comment-card`, `spotify-card`, `macos-notification`, `testimonial-card`, `logo-wall` (chữ gõ tay, không scrape tài khoản thật) |
| Camera / xử lý footage | `push-in`, `pull-back-reveal`, `camera-shake`, `focus-rack`, `camera-dolly-zoom`, `yt-vertical-fill`, `before-after-wipe`, `comparison-split`, `camcorder-hud`, `cinemagraph` |
| Texture / nền | `grain-overlay`, `vignette`, `shimmer-sweep`, `parallax-zoom`, `organic-light-leak-overlay`, `confetti`; shader nền WebGPU (`aurora`, `plasma`…) cần WebGPU |
| Vẽ tay | `hw-arrow`, `hw-underline`, `hw-callout-circle`, `hw-box-label`, `hw-scribble-transition` |

## Caption component theo tone (cho video *dựng*, không phải talking-head thô)

| Tone | Component |
| --- | --- |
| Hype / social | `caption-kinetic-slam`, `caption-highlight` (TikTok, một từ sáng), `caption-particle-burst`, `caption-emoji-pop` |
| Clean / corporate | `caption-clip-wipe`, `caption-weight-shift` |
| Editorial / sang | `caption-editorial-emphasis`, `caption-gradient-fill`, `caption-weight-shift` |
| Neon / nhạc | `caption-neon-glow`, `caption-neon-accent` |
| Tech / glitch | `caption-glitch-rgb`, `caption-matrix-decode` |
| Karaoke / lyric | `caption-pill-karaoke`, `caption-highlight` |
| Điện ảnh, texture | `caption-texture`, `texture-mask-text` |
| Chiều sâu, chữ sau chủ thể | `caption-parallax-layers` |
| Trên footage rối | `caption-blend-difference` (tự đảo màu) |

Tone knob: hype đậm 72–96 px scale-pop … storytelling serif 44–56 px fade chậm. Lỗi hay gặp: effect trên mọi từ (→ chỉ keyword), trộn style trong một đoạn, style hype cho nội dung êm.

## Bẫy

- `liquid-glass-notification` cần **WebGPU** → render headless ra trống mà không báo lỗi; muốn kính mờ thì xin hiệu ứng ("real translucency" → CSS `backdrop-filter`).
- Block map fetch dữ liệu địa lý từ CDN → agent phải bake geometry vào project (tất định).
- Block lower third cần thời lượng ≥ độ dài của block (~5 s gồm exit), ngắn hơn sẽ hard-cut.
- Shader transition chỉ cho 2–3 đường nối quan trọng; còn lại dùng CSS/cut.
