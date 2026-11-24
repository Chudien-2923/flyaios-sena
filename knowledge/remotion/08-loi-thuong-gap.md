# Remotion — Lỗi thường gặp (triệu chứng → sửa)

Nguồn: docs `troubleshooting/*` (23 trang), `timeout`, `delay-render`, `flickering`, `cors-issues`, `media-playback-error`, `non-seekable-media`, `target-closed`, `enametoolong`, `version-mismatch`, `wrong-composition-mount`, `fonts`, `docker`, `miscellaneous/{chrome-headless-shell,linux-dependencies,emojis}`, `parallel-encoding`, `gl-options`, `html5-audio`, `media/audio`. Docs/repo 4.0.545, đọc 2026-11-18. **Chỉ đọc, chưa chạy thử.** Đường dẫn trong cột Nguồn tương đối với `md/docs/`.

## Quy trình debug chung (`troubleshooting/debug-failed-render`)

1. Render lại với `--log=verbose` (SSR: `logLevel: "verbose"`) → hiện `console.log` trong code, frame chậm nhất, encoder, browser đang dùng.
2. Log lặp nhiều lần là do nhiều tab → tạm `--concurrency=1`.
3. Gỡ từng component đến khi hết lỗi; tìm GitHub issues; `--repro` tạo ZIP tái hiện.

## Bảng tra

| Triệu chứng / thông báo | Nguyên nhân | Cách sửa | Nguồn |
|---|---|---|---|
| `A delayRender() was called but not cleared after 28000ms` | `continueRender()` không được gọi; mạng/firewall chặn asset; tải video lớn; quá tải RAM | Gọi `continueRender`/`cancelRender` ở mọi nhánh; gắn label `delayRender('Fetching…')`; dùng `useDelayRender()`; tăng `--timeout` / `timeoutInMilliseconds` / Studio Advanced; giảm concurrency | `timeout`, `delay-render` |
| Timeout `Loading root component` | Entry point không gọi `registerRoot()` (truyền nhầm `Root.tsx` hoặc file component) | Truyền file gọi `registerRoot()` (thường `src/index.ts`) | `troubleshooting/loading-root-component` |
| Timeout `Waiting for root component to load` ở mọi lệnh (`compositions`/`still`/`render`), kể cả composition rỗng; log thấy font đã tải xong | **Lưu ý riêng cho macOS:** Chrome Headless Shell của Remotion đôi khi treo khi chạy từ project nằm trong `~/Documents` (cùng project đặt ở thư mục khác chạy bình thường) | Đặt project ngoài `~/Documents`, hoặc đặt bản Chrome Headless Shell ngoài `~/Documents` (vd thư mục cache hệ thống) và trỏ `Config.setBrowserExecutable(...)` trong `remotion.config.ts` (nút Render trong Studio cũng đọc tùy chọn này) | Quan sát thực tế trên macOS |
| Timeout `Fetching Inter font {...}` (Google Fonts) | `loadFont()` không tham số tải mọi weight/subset | `loadFont('normal', {weights: ['400','700'], subsets: ['latin']})`; từ v5.0 bắt buộc truyền | `troubleshooting/font-loading-errors` |
| Timeout `Loading <Img> with src http://localhost:3000/proxy…` | `<OffthreadVideo>` phải tải **cả file** trước khi trích frame | Dùng `<Video>` từ `@remotion/media`; tăng `delayRenderTimeoutInMilliseconds`; chia video thành `<Series>` nhiều đoạn; CDN nhanh hơn | `troubleshooting/delay-render-proxy` |
| `Timed out evaluating page function` | Browser treo do CPU/RAM quá tải (không phải lỗi delayRender) | Giảm `--concurrency`, thêm tài nguyên, tăng `--timeout`, tìm vòng lặp vô hạn | `troubleshooting/timed-out-page-function` |
| Render đứng im, không lỗi | delayRender timeout quá dài (Lambda timeout trước); Chrome không phải Headless Shell | Hạ timeout để lỗi hiện ra, luôn `cancelRender()` khi lỗi; `npx remotion browser ensure`, không set `--browser-executable`; Lambda: đọc field `errors` | `troubleshooting/stuck-render` |
| Video nhấp nháy/giật khi render | Animation không thuần theo `useCurrentFrame()` (CSS `animation`/`transition`/`@keyframes`, `setTimeout`, `Math.random()`); asset chưa load đã chụp | Mọi animation = hàm của frame (`interpolate`, `spring`); `random(seed)`; dùng `<Img>/<Video>/<Audio>/<IFrame>/<Gif>`; `delayRender` khi fetch. `--concurrency=1` chỉ là băng keo, chậm và chặn Lambda | `flickering`, `troubleshooting/css-animations` |
| Nhấp nháy ảnh nền | `background-image`/`mask-image` CSS hoặc Next.js `<Image>` — Remotion không biết khi nào ảnh load xong | Dùng `<Img>` trong `<AbsoluteFill>`; cần mask thì đặt thêm `<Img>` cùng src ngoài viewport | `troubleshooting/background-image`, `troubleshooting/nextjs-image` |
| Khung trống trong Studio/Player khi chuyển clip | Video sau chỉ bắt đầu tải lúc xuất hiện | Bỏ qua (không ảnh hưởng file render); premount `<Sequence>`; `@remotion/media` tự pause khi buffering | `troubleshooting/player-flicker` |
| Chữ chuyển động rung theo pixel | Chrome làm tròn text về pixel gần nhất | Thêm `transform: 'perspective(100px)'` + `willChange: 'transform'` | `troubleshooting/subpixel-rendering` |
| Chữ vô hình khi render Docker/Linux | Không có font hệ thống | Cài ít nhất 1 font (`fonts-dejavu-core`); emoji `fonts-noto-color-emoji`; CJK `fonts-noto-cjk` | `docker`, `miscellaneous/emojis` |
| `could not be parsed as a value list` (FontFace) | `src: url(font.woff2) format(woff2)` không có nháy | Viết `url('font.woff2') format('woff2')` hoặc dùng `@remotion/fonts` | `troubleshooting/could-not-be-parsed-as-a-value-list` |
| `fitText`/`measureText` sai kích thước | Đo trước khi font load | Chỉ đo sau khi font đã load | `flickering` |
| CORS: `blocked by CORS policy` | Server thiếu `Access-Control-Allow-Origin` / không trả header cho preflight `OPTIONS` / thiếu `Allow-Methods` | Đọc kỹ message; thêm header ở server (kể cả response `OPTIONS`); bất đắc dĩ `--disable-web-security` | `cors-issues`, `cli/render` |
| `Could not play video/audio with src` | Codec Chrome không đọc (HEVC trên Linux, `.avi`, `.flv`); 404 do dùng `"/file.mp4"` thay vì `staticFile()`; header sai; quá nhiều thẻ video (`key` đổi mỗi frame) | Convert sang codec hỗ trợ; `staticFile('file.mp4')`; trả 200 + `Content-Type` + `Content-Range`; tắt Internet Download Manager | `media-playback-error` |
| `The media … cannot be seeked` | Server không gửi `Content-Range`/`Content-Length`, file không faststart, header `X-Frame-Options`/CORP chặn | `<Video>` của `@remotion/media`; host hỗ trợ Range; tải về `public/` | `non-seekable-media` |
| `No frame found at position …` | Cache OffthreadVideo quá nhỏ hoặc video có khoảng trống frame (screen recording) | Tăng `--offthreadvideo-cache-size-in-bytes` / RAM; chuyển `<Video>` `@remotion/media` | `troubleshooting/no-frame-found-at-position` |
| `Compositor/FFmpeg quit with signal SIGKILL` | OS kill vì hết RAM | Giảm concurrency, giảm cache OffthreadVideo, `--disallow-parallel-encoding`, nâng version, thêm RAM | `troubleshooting/sigkill`, `parallel-encoding` |
| `Target closed` | Tab Chrome crash: thiếu lib Linux, hết RAM/CPU, binary hỏng | Cài lib Linux; giảm concurrency (Lambda: tăng memory); `--log=verbose` xem binary | `target-closed` |
| `Failed to launch the browser process!` | Thiếu shared libs; binary sai OS/kiến trúc | Cài `miscellaneous/linux-dependencies` (glibc ≥ 2.35; Alpine/NixOS không hỗ trợ); `--log=verbose` | `troubleshooting/browser-launch` |
| `Failed to acquire WebGL2 context` | Backend GL không tạo được context | `--gl=angle` (SSR `chromiumOptions.gl`, Studio Advanced); máy không GPU dùng `swangle`. `angle` có memory leak → chia render dài | `troubleshooting/webgl2-context`, `gl-options` |
| Render chậm gấp 2 trên Mac M-series | Node chạy dưới Rosetta | `node -p process.arch` phải là `arm64`; cài Node native | `troubleshooting/rosetta` |
| File xuất "không có tiếng" | Player VS Code/Cursor luôn mute; hoặc không có nguồn audio, `volume=0`, audio nằm ngoài range `<Sequence>` | Mở bằng QuickTime/VLC; kiểm tra `<Audio>`/`<Video>` mount đúng khoảng | `troubleshooting/video-has-no-sound` |
| Audio lệch hình trong Studio/Player | Thẻ HTML5 tự seek khi lệch > 0.45 s (preview chậm) | Chỉ ảnh hưởng preview; `acceptableTimeShiftInSeconds`; khi render `<Audio>` `@remotion/media` trích audio chính xác bằng Mediabunny | `html5-audio`, `media/audio` |
| Nối chunk bị hở/lệch audio | Chunk thiếu track audio hoặc AAC không cắt theo frame | `--enforce-audio-track`, `--for-seamless-aac-concatenation`, ghép bằng `combineChunks()` | `cli/render` |
| `ENAMETOOLONG: ffmpeg …` (Windows) | Quá nhiều layer audio → lệnh FFmpeg > 8192 ký tự | `muted` cho video không tiếng; render trên macOS/Linux/WSL; render từng đoạn `--frames` | `enametoolong` |
| `defaultProps too big - could not serialize` | `defaultProps` (hoặc cả danh sách composition) quá lớn để Chrome stringify | Truyền URL thay vì data URL/Buffer; fetch dữ liệu nặng trong component | `troubleshooting/defaultprops-too-big` |
| `Can't save default props` (Props editor) | `defaultProps` không inline object literal, `id` không phải string literal, root không phải TS | Viết `defaultProps={{…}}` inline trong `<Composition id="…">` ở root `.tsx` | `troubleshooting/cannot-save-default-props` |
| Studio không cập nhật khi sửa file | Server Studio đã tắt; sai hoa/thường trong đường dẫn import (bug Webpack) | Chạy lại `npx remotion studio`; sửa casing import | `troubleshooting/broken-fast-refresh` |
| `Module not found: Can't resolve 'module'` khi build Next.js | `bundle()`/`deploySite()` bị bundle trong serverless | Bundle lúc build, tham số hóa bằng input props; Lambda: `deploySiteFromBundle()` | `troubleshooting/bundling-bundle` |
| `npm ERR! could not determine executable to run` | Chưa cài `@remotion/cli`; Corepack đặt `packageManager` khác npm | Cài `@remotion/cli`; dùng `pnpm exec` / `yarn` / `bunx` | `troubleshooting/could-not-find-executable-to-run` |
| Lỗi lạ giữa các package | Version Remotion lệch (do `^`) | Pin version chính xác, `npx remotion versions`, `npx remotion upgrade` | `version-mismatch` |
| `<Composition> mounted inside another composition` | Đặt `<Composition>` trong component của composition khác/Player | Chỉ khai `<Composition>` trong Root | `wrong-composition-mount` |
| `render` fail trong CI, in danh sách ID | Không truyền composition ID ở môi trường không TTY | Truyền ID | `cli/render` |

## Ghi nhớ

- Thông báo timeout ghi `28000ms` dù mặc định là 30000 ms (docs in đúng như vậy; [INFERENCE] Remotion báo trước khi hết hạn thật).
- Option `timeout` có hai mô tả: trang `options/timeout` nói "render may take to resolve all delayRender() calls", còn `renderer/*` nói timeout **áp dụng cho từng call riêng**, không phải cả render.
- Phần lớn lỗi media biến mất khi chuyển từ `<OffthreadVideo>`/`<Html5Video>` sang `<Video>`/`<Audio>` của `@remotion/media` — xem [[knowledge/remotion/04-media-am-thanh-captions]]. Flag/Chrome/Docker: [[knowledge/remotion/05-studio-cli-render]]. Luật animation tất định: [[knowledge/remotion/03-markup-animation]].
