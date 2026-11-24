# Remotion — Studio, CLI, render và preset xuất

Nguồn: docs `studio` (`studio.mdx` repo), `studio/{shortcuts,interactivity,interactivity-best-practices,quick-switcher,visual-control,deploy-static,deploy-server}`, `studio-protocol`, `visual-editing`, `props-resolution`, `render`; `cli/{studio,render,still,compositions,benchmark,browser,browser/ensure,bundle,upgrade,skills,elements,elements/use,gpu,versions,add,create-video}`; `config`; `renderer/{render-media,render-still,select-composition,get-compositions}`, `bundle`, `ssr-node`; `options/*`; `encoding`, `quality`, `prores`, `transparent-videos`, `render-as-gif`, `stills`, `performance`, `terminology/concurrency`, `parallel-encoding`, `shared-memory-capture`, `hardware-acceleration`, `gpu`, `gl-options`, `miscellaneous/{chrome-headless-shell,linux-dependencies,video-formats}`, `docker`; skill `remotion-studio`, `remotion-render` (+ `transparent-videos.md`); repo `packages/renderer/src/{options/audio-codec.tsx,get-extension-from-codec.ts,get-concurrency.ts,pixel-format.ts}`. Docs/repo 4.0.545, đọc 2026-11-18. **Chỉ đọc, chưa chạy thử.**

Đã chạy trên máy Sena (2026-11-18, M1 macOS, 4.0.545): `compositions`, `still --frame`, `render` h264, `render --frames … --image-format=png`, ProRes 4444 `yuva444p10le` (ffprobe ra `yuva444p12le`), `studio --no-open --port` — kết quả ở [[knowledge/remotion/01-setup-license-phien-ban]] §6. Phần còn lại của node là đọc từ docs, chưa chạy.

## 12 luật cứng

1. **Luôn truyền composition ID** cho `render`. Không có ID → Remotion hiện picker; trong môi trường không TTY hoặc có `CI` thì lệnh **fail** và in danh sách ID. Lấy ID bằng `npx remotion compositions` (`-q` chỉ in ID).
2. `remotion.config.ts` **chỉ áp dụng cho CLI và Studio**, **không** áp dụng cho SSR API (`renderMedia()`…). Flag CLI ghi đè config. Đổi config → khởi động lại Studio (skill).
3. Render bằng **Chrome Headless Shell do Remotion tải và pin** (vào `node_modules/.remotion/`, tải lần đầu cần browser, không trong `npm install`). Không set `--browser-executable`/`browserExecutable`/`chromeMode` trừ khi người dùng yêu cầu rõ (skill `remotion-render`). Không cài chromium bằng `apt`.
4. Input props: `--props='{"k":"v"}'` hoặc `--props=./props.json` (Windows shell làm mất `"` → dùng file). Props được **shallow-merge** lên `defaultProps`. SSR: truyền **cùng `inputProps`** cho cả `selectComposition()` lẫn `renderMedia()`.
5. Video trong suốt: **PNG frame + pixel format có alpha + codec hỗ trợ alpha**. JPEG (mặc định) không có alpha. H.264 không có alpha.
6. `crf` và `videoBitrate` **loại trừ nhau**. CRF không dùng cho ProRes (ProRes còn **bỏ qua** `videoBitrate`, chỉnh bằng profile). Có hardware acceleration thì không đặt `crf` (xem §Hiệu năng).
7. Phạm vi CRF khác nhau theo codec: `23` đẹp với H.264 nhưng xấu với WebM. Xem bảng dưới.
8. `--every-nth-frame` **chỉ dùng cho GIF**. GIF không có audio, tối đa 256 màu.
9. Đuôi file quyết định codec mặc định: `.mp4`→`h264`, `.mov`→`prores`, `.webm`→**`vp8`**, `.mkv`→`h264-mkv`, `.gif`→`gif`, `.mp3/.wav/.aac`→audio. Muốn VP9 phải ghi `--codec=vp9`.
10. `--timeout` (mặc định 30000 ms) là timeout cho `delayRender()`, **khác** `--timeout` của Lambda deploy.
11. License: công ty cần license truyền `--license-key` (key bí mật `rm_sec_…` cho SSR/CLI, `rm_pub_…` cho web-renderer; `free-license` nếu đủ điều kiện miễn phí) — **chỉ khi có key**, thêm `--is-production=false` cho render thử để không tính phí (từ v4.0.539). Chi tiết: [[knowledge/remotion/01-setup-license-phien-ban]].
12. Đừng gọi `bundle()` lúc runtime/serverless; bundle một lần lúc build rồi tham số hóa bằng input props.

## Studio

- Mở: `npm run dev` (template thường) hoặc `npx remotion studio [entry]` (alias `preview`). Port 3000 hoặc cổng trống cao hơn. Đang chạy rồi thì lệnh **in URL và thoát**; `--force-new` (v4.0.421) để mở thêm instance. Nhấn `s` trong terminal để mở lại tab (v4.0.487).
- Agent: skill `remotion-studio` — có in-app browser thì `--no-open` rồi mở đúng URL được in và kiểm preview load; không mở được thì **đừng** dùng `--no-open`.
- Flag hay dùng: `--port`, `--log=verbose`, `--props` (docs **không khuyến khích** cho Studio; nó **thắng** cả chỉnh sửa trong sidebar), `--public-dir`, `--ipv4` (VPS), `--webpack-poll=<ms>` (VM/ổ mạng), `--disable-interactivity`, `--coding-agent=claude-code` (v4.0.506), `--rspack` (v4.0.502).
- **Props editor**: sidebar phải (`Cmd/Ctrl+J`) → tab Props. Control suy ra từ `defaultProps` (v4.0.516) hoặc Zod `schema` (schema thắng). Nút 💾 ghi lại vào code **chỉ khi** `defaultProps` là object literal inline trên `<Composition>`, `id` là string literal, root là file TS. Giá trị sai → viền đỏ, không áp dụng.
- **Render button** (`R`): form input props điền sẵn từ default props + chỉnh sửa sidebar; tab Advanced có timeout, `gl`, Chrome mode, hardware acceleration. Studio deploy tĩnh không render server-side; bản read-only có nút **Copy command**.
- **Interactivity** (v4.0.475): kéo/scale/xoay outline trên canvas ghi ngược `style.translate/scale/rotate` vào code; keyframe, easing (chỉ easing inline dạng `Easing.bezier/linear/spring…` sửa được). Cách viết markup để sửa được: [[knowledge/remotion/03-markup-animation]]. `visualControl()` đã **deprecated**.
- **Studio 4.0.546**: thêm effects cho bất kỳ element nào trong Studio, và tùy chọn double-click action cho layer/effect/property ([docs `options/double-click-action`](https://remotion.dev/docs/options/double-click-action)). Mới tra release notes, chưa chạy thử trên máy Sena.
- Phím chính: Space, ←/→ 1 frame, Shift+←/→ 1 giây, `J/K/L`, `G` đến frame, `I`/`O` in/out, `R` render, `T` checkerboard (kiểm nền trong suốt), `Cmd/Ctrl+K` quick switcher (`>` menu, `?` tìm docs), `?` bảng phím. Đổi phím: `Config.setKeyboardShortcuts()` (v4.0.523).
- Deploy: tĩnh `npx remotion bundle` → thư mục `build` (Vercel/Netlify/GitHub Pages; v4.0.97+), URL deploy dùng làm **serve URL** cho `render`/Lambda. VPS: Docker + `npx remotion studio`, cần ≥2 GB RAM; DigitalOcean App Platform không chạy được render button (proxy không hỗ trợ SSE).
- `@remotion/studio-protocol` (v4.0.502): website gửi Element vào Studio — [[knowledge/remotion/07-skills-plugin-ai-elements]].

## Lệnh CLI tra nhanh

| Lệnh | Dùng khi | Ghi chú |
|---|---|---|
| `npx create-video --yes --blank my-video` | Tạo project không tương tác | `--yes` cần template flag + thư mục; fail nếu đang trong Git repo; `--tailwind` (v4.0.534), `--skills` (v4.0.541), `--tmp` |
| `remotion render <entry\|serveUrl>? <id> <out>` | Xuất video/audio/sequence | mặc định ra `out/`, ghi đè (`--overwrite=false` để chặn) |
| `remotion still <id> out.png --frame=N` | Một ảnh | format `png`(mặc định)/`jpeg`/`webp`/`pdf`; `--frame=-1` là frame cuối |
| `remotion render <id> out/frames --frames=0,30,90 --image-format=png` | Nhiều still một lần (v4.0.502) | tên `element-[frame].[ext]` đệm số 0 → **liệt kê thư mục**, đừng đoán tên; `--image-sequence-pattern` |
| `remotion compositions` | Liệt kê ID | `-q` |
| `remotion benchmark src/index.ts A,B --concurrencies=4,8 --runs=3` | Tìm concurrency tối ưu | |
| `remotion browser ensure` | Tải sẵn Chrome (Docker/server) | `--chrome-mode` |
| `remotion bundle` | Bundle/Studio tĩnh | ra `build/`; relocatable mặc định từ v4.0.497 |
| `remotion gpu --gl=angle` | Xem Chrome dùng GPU thế nào | output không ổn định để parse |
| `remotion versions` / `upgrade` / `add <pkg>` | Đồng bộ version | `upgrade` cũng cập nhật skills ở `.agents/skills` (`--skip-skills`) |
| `remotion skills add\|update` | Cài Agent Skills | `.agents/skills`, symlink `.claude/skills` |
| `remotion elements use <url> --composition X --yes` | Cài Element (v4.0.542) | `--dry-run` (v4.0.543); code chạy trong project → chỉ từ site tin cậy |
| `npx remotion whisper transcribe\|install\|ls\|rm\|rmall` | Phiên âm local ra `Caption[]` JSON; quản lý model Whisper (v4.0.546) | cần `npm i --save-exact @remotion/whisper-webgpu@<version> @huggingface/transformers` trong project; **tải model** → hỏi người dùng duyệt trước ([[.agents/skills/remotion-sena/SKILL]] §5) |

Flag render khác: `--audio-bitrate` (mặc định `320k`), `--pixel-format` (mặc định `yuv420p`), `--jpeg-quality` (mặc định 80), `--scale` (0–16), `--frames=0-99` / `100-` / `0-99,150-199` (nối range, v4.0.502), `--sequence`, `--muted`, `--enforce-audio-track` (bắt buộc với chunk sẽ nối), `--separate-audio-to`, `--x264-preset` (mặc định `medium`), `--width/--height`, `--fps/--duration` (v4.0.424), `--sample-rate` (48000), `--repro`.

## Preset xuất (lắp từ docs — docs không có preset theo nền tảng social)

Kích thước khung (1080×1920 dọc, 1920×1080 ngang…) đặt ở `<Composition>`, không phải flag render.

| Mục đích | Lệnh/option | Ghi chú docs |
|---|---|---|
| MP4 đăng web/social (mặc định) | `render Id out.mp4` (= `--codec=h264`, audio `aac`) | CRF H.264: 1–51, mặc định 18; tương thích trình duyệt "very good" |
| MP4 nét hơn trên màn hình HiDPI | thêm `--scale=2` hoặc `--crf` thấp hơn | text 1080p bị mờ trên màn 2x → scale |
| Màu chuẩn | `--color-space=bt709 --image-format=png` | `bt709` thành mặc định ở Remotion 5.0 |
| Overlay alpha cho NLE (Premiere/Resolve/FCP) | `render Id out.mov --codec=prores --prores-profile=4444 --image-format=png --pixel-format=yuva444p10le` | `4444` ~330 Mbps, `4444-xq` ~500 Mbps; chỉ 2 profile này có alpha; audio mặc định `pcm-16` |
| Master ProRes không alpha | `--codec=prores --prores-profile=hq` | mặc định `hq` ~220 Mbps; `proxy/light/standard` nhỏ hơn |
| WebM alpha cho trình duyệt | `render Id out.webm --codec=vp9 --image-format=png --pixel-format=yuva420p` (docs dùng `vp8`) | VP8/VP9 encode chậm; audio `opus`; Lambda có thể nháy alpha ở ranh giới chunk → render local một lượt |
| GIF | `render Id out.gif --codec=gif --every-nth-frame=2` | không audio, 256 màu; nền trong suốt cần `--image-format=png`; `--number-of-gif-loops`: bỏ trống = lặp vô hạn, `0` = không lặp |
| PNG sequence | `render Id out/frames --sequence --image-format=png` | mặc định sequence là JPEG |
| Thumbnail | `still Id thumb.jpg --image-format=jpeg --frame=45` hoặc `<Still>` | `--jpeg-quality` chỉ với JPEG |
| Chỉ audio | `render Id out.mp3` (hoặc `.wav`, `.aac`) | quality video bị bỏ qua |

Bảng CRF (encoding guide): H264 1–51 (18), H265 0–51 (23), VP8 4–63 (9), VP9 0–63 (28), AV1 0–63 (30). AV1 rất chậm, **không có** trên Lambda và Linux ARM64 GNU. H.265 trình duyệt hỗ trợ kém.

Tổ hợp audio codec hợp lệ (repo `supportedAudioCodecs`): `h264`: aac/pcm-16/mp3 · `h265`: aac/pcm-16 · `vp8/vp9`: opus/pcm-16 · `av1`: aac/opus/pcm-16 · `prores`: aac/pcm-16 · `gif`: không.

Cách đặt mặc định cho từng composition: trả `defaultCodec`, `defaultVideoImageFormat`, `defaultPixelFormat`, `defaultProResProfile` từ `calculateMetadata()` (xem [[knowledge/remotion/06-data-server-cloud-app]]).

## SSR (`@remotion/renderer`)

```ts
const serveUrl = await bundle({entryPoint: path.resolve('./src/index.ts')}); // 1 lần
const composition = await selectComposition({serveUrl, id: 'Main', inputProps});
await renderMedia({composition, serveUrl, codec: 'h264',
  outputLocation: 'out/main.mp4', inputProps});
```

- `bundle()` cần truyền lại `webpackOverride` nếu có override trong config (config không áp dụng cho SSR). `publicPath` mặc định `./` từ v4.0.497 (trước là `/`).
- `selectComposition()` cho một ID (chạy `calculateMetadata`); `getCompositions()` cho tất cả. `inputProps` optional ở v4, **bắt buộc từ v5.0**.
- `renderMedia()`: `outputLocation` bỏ trống → trả buffer; `concurrency` mặc định = nửa số luồng CPU, tối đa 8 (repo `resolveConcurrency`); `chromiumOptions.gl`; `timeoutInMilliseconds`; `onProgress`; `cancelSignal`. `renderStill()`: `frame`, `imageFormat` (png mặc định), `output`.
- `puppeteerInstance` chỉ tương thích `openBrowser()`, không phải puppeteer; khi truyền instance thì `chromiumOptions` của lệnh render không áp dụng.

## Hiệu năng, Chrome, GPU, Linux/Docker

- **Concurrency** = số tab Chrome song song (Lambda: số chunk). Dùng `benchmark` để chọn; quá cao → tab crash/timeout. Min 1, max = số luồng CPU, chấp nhận `50%`.
- **Parallel encoding** bật mặc định từ v4.0.534 (FFmpeg encode trong khi Chrome render; +30–80 MB với 1080p). Hết RAM → `--disallow-parallel-encoding` (từ v4.0.533 không tự tắt theo RAM nữa).
- **Shared-memory capture** (v4.0.534): Apple Silicon macOS 15+, Linux glibc ≥ 2.35; khi bật thì `--image-format`/`--jpeg-quality` **không có tác dụng**, alpha do pixel format quyết định (format không alpha → nền đen). Tắt: `--disable-shared-memory-capture`. Kiểm bằng `--log=verbose` (dòng `Remotion shared-memory capture uses`).
- **Hardware acceleration** (v4.0.228): `disable` (mặc định)/`if-possible`/`required`; macOS VideoToolbox (ProRes, H.264, H.265), Linux/Windows NVENC (H.264/H.265, v4.0.484, cần GPU NVIDIA). `crf`, `encodingMaxRate`, `encodingBufferSize` không tương thích: `required` → lỗi, `if-possible` → về software. Dùng `--video-bitrate=8M` cho Full HD H.264. Không có trên Lambda/Cloud Run.
- **GPU/`--gl`**: headless Chrome tắt GPU → `box-shadow`, `filter: blur()`, gradient, WebGL chậm trên máy cloud không GPU; thay bằng ảnh dựng sẵn. Remotion 4: mặc định `null` (local), `swangle` (Lambda/Cloud Run); WebGL/Three.js trên desktop dùng `angle`, cloud GPU `angle-egl` + `--chrome-mode=chrome-for-testing`. `angle` có memory leak → chia render dài. Remotion 5.0 sẽ mặc định `angle`.
- Chrome: từ 4.0.540 là 158.0.8127.2. Mạng bị chặn: mở `remotion.media`, `storage.googleapis.com`.
- **Linux**: glibc ≥ 2.35 (Ubuntu 22.04+/Debian 12+); Amazon Linux 2023 chỉ ARM64. Alpine, NixOS **không hỗ trợ**. Cài shared libs theo `miscellaneous/linux-dependencies`.
- **Docker**: `node:22-bookworm-slim` + lib trên + `RUN npx remotion browser ensure`; cần ít nhất một font (không có font → **chữ vô hình, không báo lỗi**), emoji `fonts-noto-color-emoji`, CJK `fonts-noto-cjk`; cho container dùng đủ CPU (`--cpus`).
- Video trong composition: dùng `<Video>` từ `@remotion/media` để nhanh nhất ([[knowledge/remotion/04-media-am-thanh-captions]]). Apple Silicon chạy Node dưới Rosetta chậm tới 2x.

Lỗi render cụ thể: [[knowledge/remotion/08-loi-thuong-gap]].
